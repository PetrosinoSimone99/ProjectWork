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
    private ProposalManager $proposalManager;
    private EntityManagerInterface $entityManager;
    private ValidatorInterface $validator;

    public function __construct(ProposalManager $proposalManager, EntityManagerInterface $entityManager, ValidatorInterface $validator) {
        $this->proposalManager = $proposalManager;
        $this->entityManager = $entityManager;
        $this->validator = $validator;
    }

    public function createExchangeMutualService(int $proposalId, array $data): void
    {
        $exchangeMutual = createExchangeMutual($proposalId, $data);

        $participants = $this->proposalManager->getProposalParticipantsDetails($proposalId);
        $this->addExchangeParticipants($exchangeMutual, $participants);
    }

    //internal only
    private function createExchangeMutual(int $proposalId, array $data): ExchangeMutual
    {
        $exchangeMutual = new ExchangeMutual($proposalId, $data['location'], ExchangeMutualStatus::PENDING, new \DateTime());

        $errors = $this->validator->validate($exchangeMutual);
        if (count($errors) > 0) {
            throw new \InvalidArgumentException((string) $errors);
        }

        $this->entityManager->persist($exchangeMutual);
        $this->entityManager->flush();

        return $exchangeMutual;
    }

    private function addExchangeParticipants(ExchangeMutual $exchangeMutual, array $participants): void
    {
        foreach ($participants as $participant) {
            $exchangeParticipant = new ExchangeParticipant(
                $exchangeMutual->getId(),
                $participant->getUser()->getId(),
                $participant->getService()->getId(),
                new \DateTime(),
                new \DateTime(),
                false
            );

            $this->entityManager->persist($exchangeParticipant);
        }

        $this->entityManager->flush();
    }
}