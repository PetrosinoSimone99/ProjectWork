<?php
declare(strict_types=1);

namespace App\Manager;

use App\Entity\User;
use App\Entity\Service;
use App\Entity\Agreement;
use App\Entity\AgreementProposal;
use App\Entity\AgreementDetails;

use App\Enum\AgreementStatus;
use App\Enum\AgreementParticipantRole;
use App\Enum\AgreementDetailsStatus;

use App\Manager\UserManager;
use App\Manager\ServiceManager;
use App\Manager\UseCase\CloseQueueUseCase;
use App\Service\NotificationService;

use App\Repository\AgreementRepository;
use App\Repository\AgreementProposalRepository;
use App\Repository\AgreementDetailsRepository;

use App\DTO\AgreementDTO;
use App\DTO\AgreementProposalDTO;
use App\DTO\AgreementDetailsDTO;

use App\Exception\ResourceNotFound;
use Doctrine\ORM\EntityManagerInterface;
use DateTimeImmutable;

class AgreementManager{
    private EntityManagerInterface $entityManager;
    private UserManager $userManager;
    private ServiceManager $serviceManager;
    private CloseQueueUseCase $closeQueueUseCase;
    private AgreementRepository $agreementRepository;
    private AgreementProposalRepository $agreementProposalRepository;
    private AgreementDetailsRepository $agreementDetailsRepository;
    private NotificationService $notificationService;

    public function __construct(EntityManagerInterface $entityManager,UserManager $userManager, 
    ServiceManager $serviceManager,CloseQueueUseCase $closeQueueUseCase, 
    AgreementRepository $agreementRepository, AgreementProposalRepository $agreementProposalRepository,
    AgreementDetailsRepository $agreementDetailsRepository, NotificationService $notificationService){
        $this->entityManager = $entityManager;
        $this->userManager = $userManager;
        $this->serviceManager = $serviceManager;
        $this->closeQueueUseCase = $closeQueueUseCase;
        $this->agreementRepository = $agreementRepository;
        $this->agreementProposalRepository = $agreementProposalRepository;
        $this->agreementDetailsRepository = $agreementDetailsRepository;
        $this->notificationService = $notificationService;
    }

    public function getAgreementById(int $agreementId): ?Agreement{
        return $this->agreementRepository->findAgreement($agreementId);
    }
    public function getAgreements(User $user): array{
        $dtos = [];
        $agreements = $this->agreementRepository->findAgreementsByUser($user);
        foreach($agreements as $agreement){
            $agreementProposals = $agreement->getAgreementProposals();
            $agreementDetails = $agreement->getAgreementDetails();
            $agreementProposalsDTO = [];
            $agreementDetailsDTO = [];

            if(!empty($agreementProposals)){
                foreach($agreementProposals as $proposal){
                $agreementProposalsDTO[] = new AgreementProposalDTO($proposal->getUser()->getUsername(), $proposal->getRole(), $proposal->getResponse(), $proposal->getResponseDate());
                }
            }
            if(!empty($agreementDetails)){
                foreach($agreementDetails as $details){
                    $agreementDetailsDTO[] = new AgreementDetailsDTO($details->getUser()->getUsername(), $details->getService()->getDescription(), $details->getBeneficiary()->getUsername(), $details->getFromRemote(), $details->getStartDate(), $details->getEndDate(), $details->getBeneficiaryAccepted(), $details->getStatus());
                }
            }
            $dtos[] = new AgreementDTO($agreement->getId(), $agreement->getAgreementStatus(), $agreement->getCreationDate(), $agreementProposalsDTO, $agreementDetailsDTO);
        }
        return $dtos;
    }
    public function createExchangeAgreement(User $user, int $otherParticipantId){
        if($user->getId() === $otherParticipantId){
            throw new \InvalidArgumentException('An exchange needs another participant');
        }
        $otherParticipant = $this->userManager->getUserById($otherParticipantId);
        if($otherParticipant === null){
            throw new ResourceNotFound('Participant not found');
        }
        $this->entityManager->wrapInTransaction(
            function ($entityManager) use ($user, $otherParticipant) {
                $agreement = new Agreement(AgreementStatus::PENDING, new DateTimeImmutable(), false);
                $entityManager->persist($agreement);
                $entityManager->flush();
                $this->addAgreementParticipants($agreement, [$user, $otherParticipant], 'exchange');
                $this->notificationService->notify($otherParticipant, 'AGREEMENT_PROPOSAL', 'Ricevuto proposta di scambio da: '.$user->getUsername(),
                ['agreementId' => $agreement->getId()]);
            }
        );
    }
    public function createProvisionAgreement(User $provider, User $beneficiary): Agreement
    {
        return $this->entityManager->wrapInTransaction(
            function ($entityManager) use ($provider, $beneficiary): Agreement {
                $agreement = new Agreement(AgreementStatus::ACCEPTED, new DateTimeImmutable(), true);
                $entityManager->persist($agreement);
                $entityManager->flush();
                $this->addAgreementParticipants($agreement, [$provider, $beneficiary], 'provision');
                $this->notificationService->notify($beneficiary, 'AGREEMENT_PROPOSAL', 'Ricevuto proposta di fornitura da: '.$provider->getUsername(),
                ['agreementId' => $agreement->getId()]);
                return $agreement;
            }
        );
    }

    public function sendResponse(User $user, int $agreementId, bool $response){
        
        $agreementProposal = $this->agreementProposalRepository->findProposalAgreementByIdAndUser($user, $agreementId);
        if(!$agreementProposal){
            throw new ResourceNotFound('Agreement proposal not found');
        }
        $agreement = $agreementProposal->getAgreement();
        if($agreement === null){
            throw new ResourceNotFound('Agreement not found');
        }
        // A response is final: only a pending agreement, and only once per participant.
        if($agreement->getAgreementStatus() !== AgreementStatus::PENDING){
            throw new \DomainException('The agreement is no longer pending');
        }
        if($agreementProposal->getResponse() !== null){
            throw new \DomainException('This participant already answered');
        }
        $agreementProposal->setResponse($response);
        $agreementProposal->setResponseDate(new DateTimeImmutable());
        $this->entityManager->persist($agreementProposal);
        $agreement->setAgreementStatus($response ? AgreementStatus::ACCEPTED : AgreementStatus::REFUSED);
        $this->entityManager->persist($agreement);
        $this->entityManager->flush();
        $otherParticipant = $this->agreementProposalRepository->findOtherParticipant($agreementId, $user);
        if($response){
            $this->createBlankDetails($agreement, $user,$this->serviceManager->getUserOfferedService($user), $otherParticipant);
            $this->createBlankDetails($agreement, $otherParticipant, $this->serviceManager->getUserOfferedService($otherParticipant), $user);
        }
        $this->notificationService->notify($otherParticipant, 'AGREEMENT_RESPONSE', 'Ricevuta risposta da: '.$user->getUsername().' - '.($response ? 'Accettata' : 'Rifiutata'),
        ['agreementId' => $agreementId, 'response' => $response]);
    }

    public function sendAgreementDetails(User $user, array $payload){
        $agreement = $this->agreementRepository->findAgreement((int) ($payload['agreementId'] ?? 0));
        if($agreement === null || $agreement->getAgreementStatus() !== AgreementStatus::ACCEPTED){
            throw new ResourceNotFound('Agreement not found');
        }
        try{
            $startDate = new DateTimeImmutable((string) $payload['startDate']);
            $endDate = new DateTimeImmutable((string) $payload['endDate']);
        }catch(\Exception){
            throw new \InvalidArgumentException('Dates must be valid date-times');
        }
        if($endDate <= $startDate){
            throw new \InvalidArgumentException('The end date must come after the start date');
        }
        $agreementDetails = $this->agreementDetailsRepository->getAgreementDetailsByUser($agreement->getId(), $user);
        $agreementDetails->setFromRemote((bool) ($payload['fromRemote'] ?? false));
        $agreementDetails->setStartDate($startDate);
        $agreementDetails->setEndDate($endDate);
        $agreementDetails->setStatus(AgreementDetailsStatus::COMPILED);
        $this->entityManager->persist($agreementDetails);
        $this->entityManager->flush();

        $this->notificationService->notify($agreementDetails->getBeneficiary(), 'AGREEMENT_DETAILS', 'Ricevuti dettagli da: '.$user->getUsername(),
        ['agreementId' => $agreement->getId(), 'fromRemote' => $agreementDetails->getFromRemote(), 'startDate' => $agreementDetails->getStartDate()->format('Y-m-d'), 'endDate' => $agreementDetails->getEndDate()->format('Y-m-d')]);
    }

    public function cancelAgreement(User $user, int $agreementId){
        $agreement = $this->agreementRepository->findAgreement($agreementId);

        if(!$agreement){
            throw new ResourceNotFound('Agreement not found');
        }
        if(!$this->isParticipant($agreement, $user)){
            throw new ResourceNotFound('Agreement not found');
        }
        if($agreement->getAgreementStatus() === AgreementStatus::ACCEPTED){
            $agreement->setAgreementStatus(AgreementStatus::CANCELLED);
            $this->entityManager->persist($agreement);
            $this->entityManager->flush();

            if($agreement->getFromQueue()){
                $agreementProposal = $this->agreementProposalRepository->findProposalAgreementBeneficiary($agreementId);
                $this->userManager->IncreaseOrRefundCredit($agreementProposal->getUser());
                $this->closeQueueUseCase->execute($user, $agreement);
            }
            $otherParticipant = $this->agreementProposalRepository->findOtherParticipant($agreementId, $user);
            $this->notificationService->notify($otherParticipant, 'AGREEMENT_CANCELLED', 'Accordo annullato da: '.$user->getUsername(),
            ['agreementId' => $agreementId]);
        }

        
    }

    public function acceptAgreementDetails(User $user, int $agreementId){
        $agreement = $this->agreementRepository->findAgreement($agreementId);
        if(!$agreement){
            throw new ResourceNotFound('Agreement not found');
        }
        if(!$this->isParticipant($agreement, $user)){
            throw new ResourceNotFound('Agreement not found');
        }
        $details = $this->agreementDetailsRepository->getAgreementDetailsByBeneficiary($agreementId, $user);
        if(!$details){
            throw new ResourceNotFound('Agreement details not found');
        }
        if($details->getBeneficiary() !== $user){
            throw new \DomainException('Only the beneficiary can accept the agreement details');
        }
        if($details->getBeneficiaryAccepted() === true){
            throw new \DomainException('The agreement details have already been accepted');
        }
        $details->setBeneficiaryAccepted(true);
        $this->entityManager->persist($details);
        $this->entityManager->flush();
        
        $this->notificationService->notify($details->getUser(), 'AGREEMENT_DETAILS_ACCEPTED', 'Dettagli accettati da: '.$user->getUsername()
        , ['agreementId' => $agreementId]);
    }
    //Internal only
    private function isParticipant(Agreement $agreement, User $user): bool{
        foreach($agreement->getAgreementProposals() as $proposal){
            if($proposal->getUser() === $user){
                return true;
            }
        }
        return false;
    }
    private function addAgreementParticipants(Agreement $agreement, array $participants, string $type){
        if($type === 'exchange'){
            $agreementProposalUser = new AgreementProposal($agreement, $participants[0], AgreementParticipantRole::PROVIDER, true, new DateTimeImmutable());
            // null means "has not answered yet": false would read as a refusal.
            $agreementProposalOther = new AgreementProposal($agreement, $participants[1], AgreementParticipantRole::BENEFICIARY, null, new DateTimeImmutable());
            $this->entityManager->persist($agreementProposalUser);
            $this->entityManager->persist($agreementProposalOther);
            $agreement->addAgreementProposal($agreementProposalUser);
            $agreement->addAgreementProposal($agreementProposalOther);

            $this->entityManager->flush();
        }
        if($type === 'provision'){
            $agreementProposalProvider = new AgreementProposal($agreement, $participants[0], AgreementParticipantRole::PROVIDER, true, new DateTimeImmutable());
            $agreementProposalBeneficiary = new AgreementProposal($agreement, $participants[1], AgreementParticipantRole::BENEFICIARY, true, new DateTimeImmutable());
            $this->entityManager->persist($agreementProposalProvider);
            $this->entityManager->persist($agreementProposalBeneficiary);
            $agreement->addAgreementProposal($agreementProposalProvider);
            $agreement->addAgreementProposal($agreementProposalBeneficiary);

            $this->entityManager->flush();
        }

    }

    private function createBlankDetails(Agreement $agreement, User $user, Service $service, User $beneficiary,): void
    {
        $details = new AgreementDetails($agreement, $user, $service, $beneficiary);
        $this->entityManager->persist($details);
        $agreement->addAgreementDetails($details);
        $this->entityManager->persist($agreement);
        $this->entityManager->flush();
    }
}



