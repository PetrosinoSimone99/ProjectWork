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
    
    public function getChatByMutualProposalId(int $proposalId): ?Chat
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.proposalMutualId = :proposalId')
            ->setParameter('proposalId', $proposalId)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function getChatByGroupProposalId(int $proposalId): ?Chat
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.proposalGroupId = :proposalId')
            ->setParameter('proposalId', $proposalId)
            ->getQuery()
            ->getOneOrNullResult();
    }
    //May need to add a condition where a chat is open
    public function getChatByParticipants(int $participant1, int $participant2, int $proposalGroupId): ?Chat
    {
        return $this->createQueryBuilder('c')
            ->join('c.chatParticipants', 'cp')
            ->where('cp.userId IN (:participant1, :participant2) AND c.proposalGroupId = :proposalGroupId')
            ->setParameter('participant1', $participant1)
            ->setParameter('participant2', $participant2)
            ->setParameter('proposalGroupId', $proposalGroupId)
            ->groupBy('c.id')
            ->having('COUNT(DISTINCT cp.userId) = 2')
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
