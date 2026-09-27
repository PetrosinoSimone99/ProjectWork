<?php
declare(strict_types=1);

namespace App\Repository;

use App\Entity\Chat;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Chat>
 */
class ChatRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Chat::class);
    }

    public function getChatById(int $chatId): ?Chat
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.id = :chatId')
            ->setParameter('chatId', $chatId)
            ->getQuery()
            ->getOneOrNullResult();
    }
    
    public function getChatByProposalId(int $proposalId): ?Chat
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.proposalMutualId = :proposalId')
            ->setParameter('proposalId', $proposalId)
            ->getQuery()
            ->getOneOrNullResult();
    }

//    /**
//     * @return Chat[] Returns an array of Chat objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('c')
//            ->andWhere('c.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('c.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?Chat
//    {
//        return $this->createQueryBuilder('c')
//            ->andWhere('c.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
