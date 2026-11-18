<?php


namespace App\Schedule;

use App\Entity\Agreement;
use App\Entity\AgreementDetails;
use App\Entity\Service;
use App\Manager\UserManager;
use App\Manager\UseCase\CloseQueueUseCase;
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
    private CloseQueueUseCase $closeQueueUseCase;
    private EntityManagerInterface $entityManager;
    private UserManager $userManager;

    public function __construct(AgreementRepository $agreementRepository, CloseQueueUseCase $closeQueueUseCase, NotificationService $notificationService,
    EntityManagerInterface $entityManager, UserManager $userManager)
    {
        $this->agreementRepository = $agreementRepository;
        $this->closeQueueUseCase = $closeQueueUseCase;
        $this->notificationService = $notificationService;
        $this->entityManager = $entityManager;
        $this->userManager = $userManager;
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
                    $this->entityManager->persist($agreement);

                    if($agreement->getFromQueue()){
                        $user = $details->getUser();
                        $this->userManager->IncreaseOrRefundCredit($user);
                        $this->closeQueueUseCase->execute($agreement);
                    }
                }
            }
            $this->entityManager->flush();
        }
    }
}