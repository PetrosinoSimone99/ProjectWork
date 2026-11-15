<?php


namespace App\Schedule;

use App\Entity\Agreement;
use App\Entity\AgreementDetails;
use App\Entity\Service;
use App\Service\NotificationService;
use App\Repository\AgreementRepository;
use App\Enum\AgreementStatus;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Scheduler\Attribute\AsPeriodicTask;

#[AsPeriodicTask(frequency: '30 minutes')]
class AgreementEndDateChecker
{
    private NotificationService $notificationService;
    private AgreementRepository $agreementRepository;
    private EntityManagerInterface $entityManager;
    public function __construct(AgreementRepository $agreementRepository, NotificationService $notificationService,
    EntityManagerInterface $entityManager)
    {
        $this->agreementRepository = $agreementRepository;
        $this->notificationService = $notificationService;
        $this->entityManager = $entityManager;
    }

    public function __invoke(): void
    {
        $agreements = $this->agreementRepository->findAllAgreements();

        foreach ($agreements as $agreement) {
            $completedAgreement = 0;
            $agreementDetails = $agreement->getAgreementDetails();
            foreach($agreementDetails as $details){
                if($details->getEndDate() !== null && $details->getEndDate() < new \DateTimeImmutable()){
                    if($details->getIsCompleted() === false){
                        $details->setIsCompleted(true);
                        $this->entityManager->persist($details);
                        $this->notificationService->notify($details->getBeneficiary(), 'agreement_completed', 'Il servizio di ' . $details->getUser()->getUsername() . ' è stato completato.',
                        ['agreementId' => $agreement->getId(),
                        'username' => $details->getUser()->getUsername(),
                        'serviceDescription' => $details->getService()->getDescription(),
                        'startDate' => $details->getStartDate()->format('Y-m-d H:i:s'),
                        'endDate' => $details->getEndDate()->format('Y-m-d H:i:s')
                        ]);
                    }
                    $completedAgreement++;
                }

                if($completedAgreement === count($agreementDetails) && $agreement->getAgreementStatus() === AgreementStatus::ACCEPTED){
                    $agreement->setAgreementStatus(AgreementStatus::COMPLETED);
                    echo "Agreement with ID " . $agreement->getId() . " has been marked as completed.\n";
                    $this->entityManager->persist($agreement);
                }
            }
            $this->entityManager->flush();
        }
    }
}