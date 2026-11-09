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
    private AgreementRepository $agreementRepository;
    private AgreementProposalRepository $agreementProposalRepository;
    private AgreementDetailsRepository $agreementDetailsRepository;

    public function __construct(EntityManagerInterface $entityManager,UserManager $userManager, 
    ServiceManager $serviceManager, AgreementRepository $agreementRepository, AgreementProposalRepository $agreementProposalRepository, AgreementDetailsRepository $agreementDetailsRepository){
        $this->entityManager = $entityManager;
        $this->userManager = $userManager;
        $this->serviceManager = $serviceManager;
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
        $this->entityManager->wrapInTransaction(
            function ($entityManager) use ($user, $otherParticipantId) {
                $agreement = new Agreement(AgreementStatus::PENDING, new DateTimeImmutable(), false);
                $entityManager->persist($agreement);
                $entityManager->flush();
                $otherParticipant = $this->userManager->getUserById($otherParticipantId);
                $this->addAgreementParticipants($agreement, [$user, $otherParticipant], 'exchange');
            }
        );
    }

    public function sendResponse(User $user, int $agreementId, bool $response){
        
        $agreementProposal = $this->agreementProposalRepository->findProposalAgreementByIdAndUser($user, $agreementId);
        if(!$agreementProposal){
            throw new ResourceNotFound('Agreement proposal not found');
        }
        $agreementProposal->setResponse($response);
        $agreementProposal->setResponseDate(new DateTimeImmutable());
        $this->entityManager->persist($agreementProposal);
        if($response){
            $agreement = $agreementProposal->getAgreement();
            $agreement->setAgreementStatus(AgreementStatus::ACCEPTED);
            $this->entityManager->persist($agreement);
        }else{
            $agreement = $agreementProposal->getAgreement();
            $agreement->setAgreementStatus(AgreementStatus::REFUSED);
            $this->entityManager->persist($agreement);
        }
        $this->entityManager->flush();
    }

    public function sendAgreementDetails(User $user, array $agreementDetails){
        $agreement = $this->agreementRepository->findAgreement($agreementDetails['agreementId']);
        $service = $this->serviceManager->getUserOfferedService($user);
        $beneficiary = $this->userManager->getUserById($agreementDetails['beneficiaryId']);
        $startDate = new DateTimeImmutable($agreementDetails['startDate']);
        $endDate = new DateTimeImmutable($agreementDetails['endDate']);
        $agreementDetails = new AgreementDetails($agreement, $user, $service, $beneficiary, $agreementDetails['fromRemote'],
                            $startDate, $endDate, null, AgreementDetailsStatus::COMPILED);
        $agreement->addAgreementDetails($agreementDetails);
        $this->entityManager->persist($agreement);
        $this->entityManager->persist($agreementDetails);
        $this->entityManager->flush();
    }

    public function cancelAgreement(User $user, int $agreementId){
        $agreement = $this->agreementRepository->findAgreement($agreementId);

        if(!$agreement){
            throw new ResourceNotFound('Agreement not found');
        }
        if($agreement->getAgreementStatus() === AgreementStatus::ACCEPTED){
            $agreement->setAgreementStatus(AgreementStatus::CANCELLED);
            $this->entityManager->persist($agreement);
            $this->entityManager->flush();
        }
        
    }
    //Internal only
    private function addAgreementParticipants(Agreement $agreement, array $participants, string $type){
        if($type === 'exchange'){
            $agreementProposalUser = new AgreementProposal($agreement, $participants[0], AgreementParticipantRole::PROVIDER, true, new DateTimeImmutable());
            $agreementProposalOther = new AgreementProposal($agreement, $participants[1], AgreementParticipantRole::PROVIDER, false, new DateTimeImmutable());
            $this->entityManager->persist($agreementProposalUser);
            $this->entityManager->persist($agreementProposalOther);
            $agreement->addAgreementProposal($agreementProposalUser);
            $agreement->addAgreementProposal($agreementProposalOther);

            $this->entityManager->flush();
        }

    }
}



