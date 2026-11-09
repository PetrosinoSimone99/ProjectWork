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
    private AgreementRepository $agreementRepository;
    private AgreementProposalRepository $agreementProposalRepository;
    private AgreementDetailsRepository $agreementDetailsRepository;

    public function __construct(EntityManagerInterface $entityManager,UserManager $userManager, 
    AgreementRepository $agreementRepository, AgreementProposalRepository $agreementProposalRepository, AgreementDetailsRepository $agreementDetailsRepository){
        $this->entityManager = $entityManager;
        $this->userManager = $userManager;
        $this->agreementRepository = $agreementRepository;
        $this->agreementProposalRepository = $agreementProposalRepository;
        $this->agreementDetailsRepository = $agreementDetailsRepository;
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
    }

    public function sendAgreementDetails(User $user, array $payload){
        $agreement = $this->agreementRepository->findAgreement((int) ($payload['agreementId'] ?? 0));
        if($agreement === null || $agreement->getAgreementStatus() !== AgreementStatus::ACCEPTED){
            throw new ResourceNotFound('Agreement not found');
        }
        // The sheet names the service being exchanged: it cannot be guessed from the provider.
        $service = $this->entityManager->find(Service::class, (int) ($payload['serviceId'] ?? 0));
        if($service === null || $service->getUser() !== $user){
            throw new ResourceNotFound('Service not found');
        }
        $beneficiary = $this->userManager->getUserById((int) ($payload['beneficiaryId'] ?? 0));
        if($beneficiary === null){
            throw new ResourceNotFound('Beneficiary not found');
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
        $details = new AgreementDetails($agreement, $user, $service, $beneficiary, (bool) $payload['fromRemote'],
                            $startDate, $endDate, null, AgreementDetailsStatus::UNCOMPILED);
        $agreement->addAgreementDetails($details);
        $this->entityManager->persist($agreement);
        $this->entityManager->persist($details);
        $this->entityManager->flush();
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
            // The reference schema has no CANCELLED value: VOID is the state for an
            // exchange that was called off before it was delivered.
            $agreement->setAgreementStatus(AgreementStatus::VOID);
            $this->entityManager->persist($agreement);
            $this->entityManager->flush();
        }
        
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

    }
}



