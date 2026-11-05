<?php

namespace App\Repository;

use App\Entity\User;
use App\Entity\AgreementProposal;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AgreementProposal>
 */
class AgreementProposalRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AgreementProposal::class);
    }

    public function findProposalAgreementByIdAndUser(User $user, int $agreementId): ?AgreementProposal
    {
        return $this->createQueryBuilder('ap')
            ->where('ap.agreement = :agreementId')
            ->andWhere('ap.user = :user')
            ->setParameter('agreementId', $agreementId)
            ->setParameter('user', $user)
            ->getQuery()
            ->getOneOrNullResult();
    }

}