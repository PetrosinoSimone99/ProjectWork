<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Proposal;
use App\Entity\ProposalParticipant;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** Contains database queries for proposals. */
final class ProposalRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Proposal::class);
    }

    /**
     * Returns the users linked to a proposal through its participant records.
     * DISTINCT avoids returning the same user twice if they have multiple services.
     *
     * @return list<User>
     */
    public function findMembersByProposalId(int $proposalId): array
    {
        return $this->getEntityManager()->createQueryBuilder()
            ->select('DISTINCT proposalUser')
            ->from(User::class, 'proposalUser')
            ->innerJoin(ProposalParticipant::class, 'participant', 'WITH', 'participant.user = proposalUser')
            ->innerJoin('participant.proposal', 'proposal')
            ->andWhere('proposal.id = :proposalId')
            ->setParameter('proposalId', $proposalId)
            ->orderBy('proposalUser.id', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
