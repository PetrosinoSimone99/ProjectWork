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
                    'fromRemote' => $detail->getFromRemote(), 'startDate' => $detail->getStartDate()?->format(DATE_ATOM),
                    'endDate' => $detail->getEndDate()?->format(DATE_ATOM), 'beneficiaryAccepted' => $detail->getBeneficiaryAccepted(),
                    'status' => $detail->getStatus()->value,
                ];
            }
            $sender = array_find($proposals, fn (array $p) => $p['role'] === AgreementParticipantRole::PROVIDER->value);
            return ['id' => $agreement->getId(), 'agreementStatus' => $agreement->getAgreementStatus()->value,
                'creationDate' => $agreement->getCreationDate()->format(DATE_ATOM), 'fromQueue' => $agreement->getFromQueue(),
                'direction' => $sender['userId'] === $user->getId() ? 'sent' : 'received',
                'agreementProposal' => $proposals, 'agreementDetails' => $details];
        }, $this->agreements->findAgreementsByUser($user));
    }

    public function createExchangeAgreement(User $user, int $otherId, int $serviceId): void
    {
        if ($user->getId() === $otherId) { throw new \InvalidArgumentException('An exchange needs another participant.'); }
        $other = $this->em->find(User::class, $otherId);
        if (!$other || !$other->isActive()) { throw new ResourceNotFound('Participant not found.'); }
        $this->transaction->run(function () use ($user, $other, $serviceId): void {
            $this->transaction->lock('users', [$user->getId(), $other->getId()]);
            $own = $this->services->getUserServiceByType($user, Service::TYPE_OFFER);
            $requested = $this->services->find($serviceId);
            if (!$requested || $requested->getUser()->getId() !== $other->getId() || $requested->getType() !== Service::TYPE_OFFER) {
                throw new \InvalidArgumentException('The selected service must belong to the other participant.');
            }
            if (!$own) { throw new \DomainException('Publish an offer before proposing an exchange.'); }
            $this->transaction->lock('services', [$own->getId(), $requested->getId()]);
            foreach ([$own, $requested] as $service) { $this->em->refresh($service); $this->assertAvailable($service); }
            $ids = [$own->getId(), $requested->getId()]; sort($ids);
            $key = implode(':', $ids);
            $duplicate = $this->em->getConnection()->fetchOne("SELECT 1 FROM agreements a JOIN agreement_proposal p ON p.agreement_id = a.id JOIN agreement_proposal q ON q.agreement_id = a.id WHERE a.status = 'PENDING' AND p.service_id = ? AND q.service_id = ? LIMIT 1", $ids);
            if ($duplicate !== false) { throw new \DomainException('An exchange for these services is already pending.'); }
            $agreement = new Agreement(AgreementStatus::PENDING, new \DateTimeImmutable(), false);
            $agreement->setPendingPairKey($key);
            $this->em->persist($agreement);
            $this->participant($agreement, $user, AgreementParticipantRole::PROVIDER, true, $own);
            $this->participant($agreement, $other, AgreementParticipantRole::BENEFICIARY, null, $requested);
            $this->em->flush();
            $this->notifications->notify($other, 'AGREEMENT_PROPOSAL', 'Proposta di scambio da: '.$user->getUsername(), ['agreementId' => $agreement->getId(), 'serviceId' => $serviceId]);
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
            $proposal->setResponse($response); $proposal->setResponseDate(new \DateTimeImmutable());
            $agreement->setAgreementStatus($response ? AgreementStatus::ACCEPTED : AgreementStatus::REFUSED);
            $this->notifications->notify($other, 'AGREEMENT_RESPONSE', 'Risposta da: '.$user->getUsername().' - '.($response ? 'Accettata' : 'Rifiutata'), ['agreementId' => $id, 'response' => $response]);
        });
    }

    public function sendAgreementDetails(User $user, array $payload): void
    {
        $this->transaction->run(function () use ($user, $payload): void {
            $agreement = $this->lockedAgreement((int) $payload['agreementId'], $user);
            if ($agreement->getAgreementStatus() !== AgreementStatus::ACCEPTED) { throw new \DomainException('Agreement is not accepted.'); }
            $detail = array_find($agreement->getAgreementDetails()->toArray(), fn ($d) => $d->getUser()->getId() === $user->getId());
            if (!$detail) { throw new ResourceNotFound('Agreement details not found.'); }
            if ($detail->getBeneficiaryAccepted()) { throw new \DomainException('Confirmed details cannot be changed.'); }
            if (!is_bool($payload['fromRemote']) || !is_string($payload['startDate']) || !is_string($payload['endDate']) || trim($payload['startDate']) === '' || trim($payload['endDate']) === '') { throw new \InvalidArgumentException('Invalid details.'); }
            try { $start = new \DateTimeImmutable($payload['startDate']); $end = new \DateTimeImmutable($payload['endDate']); }
            catch (\Exception) { throw new \InvalidArgumentException('Invalid dates.'); }
            if ($end <= $start) { throw new \InvalidArgumentException('End must be after start.'); }
            $detail->setFromRemote($payload['fromRemote'])->setStartDate($start)->setEndDate($end)->setStatus(AgreementDetailsStatus::COMPILED);
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
            $detail->setBeneficiaryAccepted(true);
            $this->notifications->notify($detail->getUser(), 'AGREEMENT_DETAILS_ACCEPTED', 'Scheda confermata da: '.$user->getUsername(), ['agreementId' => $id]);
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
        $this->em->persist($detail); $agreement->addAgreementDetails($detail);
    }
}
