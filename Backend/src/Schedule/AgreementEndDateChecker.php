<?php
declare(strict_types=1);
namespace App\Schedule;

use App\Entity\Agreement;
use App\Enum\{AgreementStatus, AgreementDetailsStatus, AgreementParticipantRole};
use App\Repository\AgreementRepository;
use App\Manager\AgreementManager;
use App\Service\{WorkflowTransaction, NotificationService, Clock};
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Scheduler\Attribute\AsPeriodicTask;

#[AsPeriodicTask(frequency: '30 minutes')]
final class AgreementEndDateChecker
{
    public function __construct(private AgreementRepository $agreements, private AgreementManager $manager,
        private WorkflowTransaction $transaction, private NotificationService $notifications,
        private EntityManagerInterface $em, private Clock $clock) {}

    public function __invoke(): void
    {
        foreach ($this->agreements->findAllAgreements() as $agreement) {
            $this->transaction->run(function () use ($agreement): void {
                $this->transaction->lock('agreements', [$agreement->getId()]); $this->em->refresh($agreement);
                if ($agreement->getAgreementStatus() !== AgreementStatus::ACCEPTED) { return; }
                $details = $agreement->getAgreementDetails();
                if (count($details) !== ($agreement->getFromQueue() ? 1 : 2)) { return; }
                foreach ($details as $detail) {
                    $this->em->refresh($detail);
                    if ($detail->getStatus() !== AgreementDetailsStatus::COMPILED || !$detail->getBeneficiaryAccepted()
                        || $detail->getStartDate() === null || $detail->getEndDate() === null || $detail->getEndDate() > $this->clock->now()) { return; }
                }
                $agreement->setAgreementStatus(AgreementStatus::COMPLETED);
                if ($agreement->getFromQueue()) {
                    $provider = $details->first()->getUser();
                    $this->transaction->lock('users', [$provider->getId()]); $this->em->refresh($provider);
                    $provider->setCredits($provider->getCredits() + 1);
                    $this->manager->closeQueues($agreement);
                }
                foreach ($details as $detail) {
                    $detail->setIsCompleted(true);
                    $this->notifications->notify($detail->getBeneficiary(), 'AGREEMENT_COMPLETED', 'Il servizio di '.$detail->getUser()->getUsername().' è stato completato.', ['agreementId' => $agreement->getId(), 'serviceDescription' => $detail->getService()->getDescription()]);
                }
            });
        }
    }
}
