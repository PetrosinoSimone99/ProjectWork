<?php
declare(strict_types=1);
namespace App\Manager;

use App\Entity\{User, Service, Agreement, AgreementProposal, AgreementDetails};
use App\Enum\{AgreementStatus, AgreementParticipantRole, AgreementDetailsStatus, QueueStatus};
use App\Exception\ResourceNotFound;
use App\Repository\{AgreementRepository, ServiceRepository};
use App\Service\{WorkflowTransaction, NotificationService};
use Doctrine\ORM\EntityManagerInterface;

final class AgreementManager
{
    public function __construct(
        private EntityManagerInterface $em,
        private AgreementRepository $agreements,
        private ServiceRepository $services,
        private WorkflowTransaction $transaction,
        private NotificationService $notifications,
    ) {}

    public function getAgreementById(int $id): ?Agreement { return $this->agreements->find($id); }

    public function getAgreements(User $user): array
    {
        return array_map(function (Agreement $agreement) use ($user): array {
            $proposals = [];
            foreach ($agreement->getAgreementProposals() as $proposal) {
                $service = $proposal->getService();
                $proposals[] = [
                    'userId' => $proposal->getUser()->getId(), 'username' => $proposal->getUser()->getUsername(),
                    'role' => $proposal->getRole()->value, 'response' => $proposal->getResponse(),
                    'responseDate' => $proposal->getResponseDate()?->format(DATE_ATOM),
                    'serviceId' => $service?->getId(), 'serviceDescription' => $service?->getDescription(),
                ];
            }
            $details = [];
            foreach ($agreement->getAgreementDetails() as $detail) {
                $details[] = [
                    'providerId' => $detail->getUser()->getId(), 'providerUsername' => $detail->getUser()->getUsername(),
                    'beneficiaryId' => $detail->getBeneficiary()->getId(), 'beneficiaryUsername' => $detail->getBeneficiary()->getUsername(),
                    'serviceId' => $detail->getService()->getId(), 'serviceDescription' => $detail->getService()->getDescription(),
                    'serviceType' => $detail->getService()->getType(),
                    'fromRemote' => $detail->getFromRemote(), 'startDate' => $detail->getStartDate()?->format(DATE_ATOM),
                    'endDate' => $detail->getEndDate()?->format(DATE_ATOM), 'beneficiaryAccepted' => $detail->getBeneficiaryAccepted(),
                    'status' => $detail->getStatus()->value, 'notes' => $detail->getNotes(), 'sentAt' => $detail->getSentAt()?->format(DATE_ATOM),
                ];
            }
            $sender = array_find($proposals, fn (array $p) => $p['role'] === AgreementParticipantRole::PROVIDER->value);
            return ['id' => $agreement->getId(), 'agreementStatus' => $agreement->getAgreementStatus()->value,
                'creationDate' => $agreement->getCreationDate()->format(DATE_ATOM), 'fromQueue' => $agreement->getFromQueue(),
                'direction' => $sender['userId'] === $user->getId() ? 'sent' : 'received',
                'agreementProposal' => $proposals, 'agreementDetails' => $details];
        }, $this->agreements->findAgreementsByUser($user));
    }

    public function createExchangeAgreement(User $user, int $otherId, int $serviceId): bool
    {
        if ($user->getId() === $otherId) { throw new \InvalidArgumentException('An exchange needs another participant.'); }
        $other = $this->em->find(User::class, $otherId);
        if (!$other || !$other->isActive()) { throw new ResourceNotFound('Participant not found.'); }
        return $this->transaction->run(function () use ($user, $other, $serviceId): bool {
            $this->transaction->lock('users', [$user->getId(), $other->getId()]);
            $own = $this->services->getUserServiceByType($user, Service::TYPE_OFFER);
            $requested = $this->services->find($serviceId);
            if (!$requested || $requested->getUser()->getId() !== $other->getId() || $requested->getType() !== Service::TYPE_OFFER) {
                throw new \InvalidArgumentException('The selected service must belong to the other participant.');
            }
            if (!$own) { throw new \DomainException('Publish an offer before proposing an exchange.'); }
            $ids = [$own->getId(), $requested->getId()]; sort($ids);
            // The counterpart already proposed this exchange the other way round:
            // the answer is the acceptance. It runs before the service locks
            // because it locks `agreements` first, the order every other path
            // uses (`sendResponse`, `acceptAgreementDetails`); the other way round
            // would deadlock on a crossing pair.
            if ($this->acceptReciprocalProposal($user, $other, $own, $requested)) { return true; }
            $this->transaction->lock('services', $ids);
            foreach ([$own, $requested] as $service) { $this->em->refresh($service); $this->assertAvailable($service); }
            $duplicate = $this->em->getConnection()->fetchOne("SELECT 1 FROM agreements a JOIN agreement_proposal p ON p.agreement_id = a.id JOIN agreement_proposal q ON q.agreement_id = a.id WHERE a.status IN ('PENDING', 'ACCEPTED') AND p.service_id = ? AND q.service_id = ? LIMIT 1", $ids);
            if ($duplicate !== false) { throw new \DomainException('An exchange for these services is already pending.'); }
            $agreement = new Agreement(AgreementStatus::PENDING, new \DateTimeImmutable(), false);
            $agreement->setPendingPairKey(implode(':', $ids));
            $this->em->persist($agreement);
            $this->participant($agreement, $user, AgreementParticipantRole::PROVIDER, true, $own);
            $this->participant($agreement, $other, AgreementParticipantRole::BENEFICIARY, null, $requested);
            $this->em->flush();
            $this->notifications->notify($other, 'AGREEMENT_PROPOSAL', 'Proposta di scambio da: '.$user->getUsername(), ['agreementId' => $agreement->getId(), 'serviceId' => $serviceId]);
            return false;
        });
    }

    public function createProvisionAgreement(User $provider, User $beneficiary, Service $service): Agreement
    {
        $agreement = new Agreement(AgreementStatus::ACCEPTED, new \DateTimeImmutable(), true);
        $this->em->persist($agreement);
        $this->participant($agreement, $provider, AgreementParticipantRole::PROVIDER, true, $service);
        $this->participant($agreement, $beneficiary, AgreementParticipantRole::BENEFICIARY, true, null);
        $this->blankDetails($agreement, $provider, $service, $beneficiary);
        $this->em->flush();
        return $agreement;
    }

    public function sendResponse(User $user, int $id, bool $response): void
    {
        $this->transaction->run(function () use ($user, $id, $response): void {
            $agreement = $this->lockedAgreement($id, $user);
            $proposal = $this->proposalFor($agreement, $user);
            if ($agreement->getAgreementStatus() !== AgreementStatus::PENDING || $proposal->getResponse() !== null) {
                throw new \DomainException('The agreement already has a response.');
            }
            $other = $this->other($agreement, $user);
            // The acceptance moment is what the sheet prints as `inizio`: it is
            // written before the rows exist, so the timestamp is the answer's
            // own and not the proposal's creation.
            $proposal->setResponse($response); $proposal->setResponseDate(new \DateTimeImmutable());
            if ($response) {
                $rows = $agreement->getAgreementProposals()->toArray();
                $this->transaction->lock('services', array_values(array_filter(array_map(fn ($row) => $row->getService()?->getId(), $rows))));
                foreach ($rows as $row) {
                    $service = $row->getService();
                    if (!$service) { throw new \DomainException('The proposal has no unambiguous service.'); }
                    $this->em->refresh($service);
                    $this->assertAvailable($service);
                }
                foreach ($rows as $row) {
                    $this->blankDetails($agreement, $row->getUser(), $row->getService(), $this->other($agreement, $row->getUser()));
                }
            }
            $agreement->setAgreementStatus($response ? AgreementStatus::ACCEPTED : AgreementStatus::REFUSED);
            $this->notifications->notify($other, 'AGREEMENT_RESPONSE', 'Risposta da: '.$user->getUsername().' - '.($response ? 'Accettata' : 'Rifiutata'), ['agreementId' => $id, 'response' => $response]);
        });
    }

    public function sendAgreementDetails(User $user, int $agreementId, string $notes): void
    {
        $this->transaction->run(function () use ($user, $agreementId, $notes): void {
            $agreement = $this->lockedAgreement($agreementId, $user);
            if ($agreement->getAgreementStatus() !== AgreementStatus::ACCEPTED) { throw new \DomainException('Agreement is not accepted.'); }
            $detail = array_find($agreement->getAgreementDetails()->toArray(), fn ($d) => $d->getUser()->getId() === $user->getId());
            if (!$detail) { throw new ResourceNotFound('Agreement details not found.'); }
            if ($detail->getBeneficiaryAccepted()) { throw new \DomainException('Confirmed details cannot be changed.'); }
            // The first sender locks the round: the counterpart can only confirm or refuse this sheet.
            if (array_any($agreement->getAgreementDetails()->toArray(), fn ($d) => $d !== $detail && $d->getStatus() === AgreementDetailsStatus::COMPILED)) {
                throw new \DomainException('The other participant already sent the sheet.');
            }
            $service = $detail->getService();
            if (!$service) { throw new \DomainException('The sheet has no service.'); }
            $detail->setFromRemote($service->isRemote())->setStartDate($this->acceptanceMoment($agreement))
                ->setEndDate(null)->setNotes($notes)->setSentAt(new \DateTimeImmutable())->setStatus(AgreementDetailsStatus::COMPILED);
            $this->notifications->notify($detail->getBeneficiary(), 'AGREEMENT_DETAILS', 'Scheda compilata da: '.$user->getUsername(), ['agreementId' => $agreement->getId()]);
        });
    }

    public function acceptAgreementDetails(User $user, int $id): void
    {
        $this->transaction->run(function () use ($user, $id): void {
            $agreement = $this->lockedAgreement($id, $user);
            if ($agreement->getAgreementStatus() !== AgreementStatus::ACCEPTED) { throw new \DomainException('Agreement is not accepted.'); }
            $detail = array_find($agreement->getAgreementDetails()->toArray(), fn ($d) => $d->getBeneficiary()->getId() === $user->getId());
            if (!$detail) { throw new ResourceNotFound('Agreement details not found.'); }
            if ($detail->getStatus() !== AgreementDetailsStatus::COMPILED || $detail->getBeneficiaryAccepted()) { throw new \DomainException('Details must be compiled and not already confirmed.'); }
            $detail->setBeneficiaryAccepted(true)->setEndDate(new \DateTimeImmutable())->setIsCompleted(true);
            // The confirmed sheet is the delivery: it completes the exchange here, so the schedule never revisits it.
            $agreement->setAgreementStatus(AgreementStatus::COMPLETED);
            if ($agreement->getFromQueue()) {
                $provider = $detail->getUser();
                $this->transaction->lock('users', [$provider->getId()]); $this->em->refresh($provider);
                $provider->setCredits($provider->getCredits() + 1);
                $this->closeQueues($agreement);
            }
            foreach ([[$detail->getUser(), $detail->getBeneficiary()], [$detail->getBeneficiary(), $detail->getUser()]] as [$recipient, $counterpart]) {
                $this->notifications->notify($recipient, 'AGREEMENT_COMPLETED', 'Scambio completato con: '.$counterpart->getUsername(), [
                    'agreementId' => $agreement->getId(), 'serviceDescription' => $detail->getService()->getDescription(),
                    'startDate' => $detail->getStartDate()?->format(DATE_ATOM), 'endDate' => $detail->getEndDate()?->format(DATE_ATOM),
                    'otherUsername' => $counterpart->getUsername(),
                ]);
            }
        });
    }

    public function cancelAgreement(User $user, int $id): void
    {
        $this->transaction->run(function () use ($user, $id): void {
            $agreement = $this->lockedAgreement($id, $user);
            if ($agreement->getAgreementStatus() === AgreementStatus::CANCELLED) { return; }
            if ($agreement->getAgreementStatus() !== AgreementStatus::ACCEPTED) { throw new \DomainException('Only accepted agreements may be cancelled.'); }
            $agreement->setAgreementStatus(AgreementStatus::CANCELLED);
            if ($agreement->getFromQueue()) {
                $beneficiary = array_find($agreement->getAgreementProposals()->toArray(), fn ($p) => $p->getRole() === AgreementParticipantRole::BENEFICIARY)->getUser();
                $this->transaction->lock('users', [$beneficiary->getId()]); $this->em->refresh($beneficiary);
                $beneficiary->setCredits($beneficiary->getCredits() + 1);
                $this->closeQueues($agreement);
            }
            $this->notifications->notify($this->other($agreement, $user), 'AGREEMENT_CANCELLED', 'Accordo annullato da: '.$user->getUsername(), ['agreementId' => $id]);
        });
    }

    public function closeQueues(Agreement $agreement): void
    {
        foreach ($this->em->getRepository(\App\Entity\ServiceQueue::class)->findBy(['agreement' => $agreement]) as $queue) { $queue->setQueueStatus(QueueStatus::CLOSED); }
    }

    public function lockedAgreement(int $id, User $user): Agreement
    {
        $this->transaction->lock('agreements', [$id]);
        $agreement = $this->agreements->find($id);
        if (!$agreement || !array_any($agreement->getAgreementProposals()->toArray(), fn ($p) => $p->getUser()->getId() === $user->getId())) { throw new ResourceNotFound('Agreement not found.'); }
        $this->em->refresh($agreement);
        foreach ($agreement->getAgreementProposals() as $p) { $this->em->refresh($p); }
        foreach ($agreement->getAgreementDetails() as $d) { $this->em->refresh($d); }
        return $agreement;
    }

    private function assertAvailable(Service $service): void
    {
        if ($service->isDeleted() || $service->isSuspended() || !$service->getUser()->isActive()) { throw new \DomainException('The service is unavailable.'); }
    }

    /** Accepts the counterpart's pending proposal for the same two services when it is the mirror of this one. */
    private function acceptReciprocalProposal(User $user, User $other, Service $own, Service $requested): bool
    {
        $id = $this->em->getConnection()->fetchOne(
            "SELECT a.id FROM agreements a JOIN agreement_proposal answer ON answer.agreement_id = a.id AND answer.user_id = ? AND answer.service_id = ? AND answer.role = 'Beneficiary' JOIN agreement_proposal ask ON ask.agreement_id = a.id AND ask.user_id = ? AND ask.service_id = ? AND ask.role = 'Provider' WHERE a.status = 'PENDING' LIMIT 1",
            [$user->getId(), $own->getId(), $other->getId(), $requested->getId()],
        );
        if ($id === false) { return false; }
        $agreement = $this->lockedAgreement((int) $id, $user);
        // Same order as the rest of the manager: `agreements` first, then the
        // services the acceptance is about.
        $this->transaction->lock('services', [$own->getId(), $requested->getId()]);
        foreach ([$own, $requested] as $service) { $this->em->refresh($service); $this->assertAvailable($service); }
        $now = new \DateTimeImmutable();
        foreach ($agreement->getAgreementProposals()->toArray() as $row) {
            $row->setResponse(true); $row->setResponseDate($now);
            $this->blankDetails($agreement, $row->getUser(), $row->getService(), $this->other($agreement, $row->getUser()));
        }
        $agreement->setAgreementStatus(AgreementStatus::ACCEPTED);
        $this->notifications->notify($other, 'AGREEMENT_RESPONSE', 'Risposta da: '.$user->getUsername().' - Accettata', ['agreementId' => $agreement->getId(), 'response' => true]);
        return true;
    }

    /** The moment the agreement was accepted: the beneficiary's answer, or the creation when it carries none. */
    private function acceptanceMoment(Agreement $agreement): \DateTimeImmutable
    {
        $beneficiary = array_find($agreement->getAgreementProposals()->toArray(), fn ($p) => $p->getRole() === AgreementParticipantRole::BENEFICIARY);
        return $beneficiary?->getResponseDate() ?? $agreement->getCreationDate();
    }
    private function proposalFor(Agreement $agreement, User $user): AgreementProposal
    {
        return array_find($agreement->getAgreementProposals()->toArray(), fn ($p) => $p->getUser()->getId() === $user->getId());
    }
    private function other(Agreement $agreement, User $user): User
    {
        return array_find($agreement->getAgreementProposals()->toArray(), fn ($p) => $p->getUser()->getId() !== $user->getId())->getUser();
    }
    private function participant(Agreement $agreement, User $user, AgreementParticipantRole $role, ?bool $response, ?Service $service): void
    {
        $p = new AgreementProposal($agreement, $user, $role, $response, $response === null ? null : new \DateTimeImmutable());
        if ($service) { $p->setService($service); }
        $this->em->persist($p); $agreement->addAgreementProposal($p);
    }
    private function blankDetails(Agreement $agreement, User $user, Service $service, User $beneficiary): void
    {
        $detail = new AgreementDetails($agreement, $user, $service, $beneficiary);
        // `inizio` is a fact from the first moment the sheet exists: the moment
        // the exchange was accepted. Only `fine` waits for the confirmation.
        $detail->setStartDate($this->acceptanceMoment($agreement));
        $this->em->persist($detail); $agreement->addAgreementDetails($detail);
    }
}
