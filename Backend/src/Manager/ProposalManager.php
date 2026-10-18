<?php
declare(strict_types=1);

namespace App\Manager;

use App\Repository\ProposalRepository;

class ProposalManager
{
    private ProposalRepository $proposalRepository;

    public function __construct(ProposalRepository $proposalRepository)
    {
        $this->proposalRepository = $proposalRepository;
    }

    public function getProposalParticipants(int $proposalId): array
    {
        return $this->proposalRepository->findMembersByProposalId($proposalId);
    }

    public function getProposalParticipantsDetails(int $proposalId): array
    {
        return $this->proposalRepository->getProposalParticipants($proposalId);
    }
}