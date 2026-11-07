<?php
declare(strict_types=1);

namespace App\Repository;

use App\Entity\Chat;
use App\Entity\User;
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
    
    public function getChatByAgreementId(int $agreementId): ?Chat
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.agreementId = :agreementId')
            ->setParameter('agreementId', $agreementId)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function getUserChats(User $user): ?array
    {
        return $this->createQueryBuilder('c')
            ->join('c.chatParticipants', 'cp')
            ->where('cp.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }
}
