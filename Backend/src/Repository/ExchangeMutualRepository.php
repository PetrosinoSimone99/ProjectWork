<?php

namespace App\Repository;

use App\Entity\ExchangeMutual;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ExchangeMutual>
 */
class ExchangeMutualRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ExchangeMutual::class);
    }
    public function getExchangeMutualByProposalId(int $proposalId): ?ExchangeMutual
    {
        return $this->createQueryBuilder('em')
            ->andWhere('em.proposal = :proposalId')
            ->setParameter('proposalId', $proposalId)
            ->getQuery()
            ->getOneOrNullResult();
    }
//    /**
//     * @return MutualExchange[] Returns an array of MutualExchange objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('m')
//            ->andWhere('m.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('m.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?MutualExchange
//    {
//        return $this->createQueryBuilder('m')
//            ->andWhere('m.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
