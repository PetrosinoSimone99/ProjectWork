<?php

declare(strict_types=1);

namespace App\Manager;

use App\Enum\ExchangeMutualStatus;

use App\Entity\User;
use App\Entity\Service;
use App\Entity\ExchangeMutual;
use App\Entity\ProposalParticipant;

use App\Manager\ProposalManager;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;


class ExchangeMutualManager
{
    private ExchangeMutualRepository $exchangeMutualRepository;
    private ProposalManager $proposalManager;
    private EntityManagerInterface $entityManager;
    private ValidatorInterface $validator;

    public function __construct(ExchangeMutualRepository $exchangeMutualRepository, ProposalManager $proposalManager, EntityManagerInterface $entityManager, ValidatorInterface $validator) {
        $this->exchangeMutualRepository = $exchangeMutualRepository;
        $this->proposalManager = $proposalManager;
        $this->entityManager = $entityManager;
        $this->validator = $validator;
    }

    public function createExchangeMutualService(int $proposalId, User $user, array $data): void
    {//location is missing.
        $exchangeMutual = $this->getExchangeMutualByProposalId($proposalId);

        if($exchangeMutual == null) {
            $exchangeMutual = $this->createExchangeMutual($proposalId);
            
        }
        
    }

    //internal only
    private function createExchangeMutual(int $proposalId, array $data): ExchangeMutual
    {//Review logic for this part
        $exchangeMutual = new ExchangeMutual($proposalId, ExchangeMutualStatus::IN_ATTESA,
            new \DateTime()
        );

        $errors = $this->validator->validate($exchangeMutual);
        if (count($errors) > 0) {
            throw new \InvalidArgumentException((string) $errors);
        }

        $this->entityManager->persist($exchangeMutual);
        $this->entityManager->flush();

        return $exchangeMutual;
    }

    private function addExchangeParticipants(ExchangeMutual $exchangeMutual, ProposalParticipant $proposalParticipant): void
    {//Most likely insert one member at a time with their respective response
        $exchangeParticipant = new ExchangeParticipant(
            $exchangeMutual,
            $proposalParticipant->getUser()->getId(),
            $proposalParticipant->getService()->getId(),
            new \DateTime(),
            new \DateTime(),
            true
        );

        $this->entityManager->persist($exchangeParticipant);
        $this->entityManager->flush();
    }
}