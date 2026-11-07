<?php

namespace App\Repository;

use App\Entity\ChatMessage;
use App\Entity\Chat;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ChatMessage>
 */
class ChatMessageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ChatMessage::class);
    }

    public function getChatHistory(Chat $chat): array
    {
        return $this->createQueryBuilder('cm')
            ->where('cm.chat = :chat')
            ->setParameter('chat', $chat)
            ->orderBy('cm.creationDate', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function getUserMostRecentReceivedMessage(User $user, array $userChats): ?ChatMessage
    {
        return $this->createQueryBuilder('cm')
            ->where('cm.chat IN (:userChats)')
            ->andWhere('cm.user != :user')
            ->setParameter('user', $user)
            ->setParameter('userChats', $userChats)
            ->orderBy('cm.id', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function getNewMessagesForUser(User $user, array $chats, int $recentMessageId): ?array
    {
        return $this->createQueryBuilder('cm')
            ->where('cm.chat IN (:chats)')
            ->andWhere('cm.user != :user')
            ->andWhere('cm.id > :recentMessageId')
            ->setParameter('recentMessageId', $recentMessageId)
            ->setParameter('user', $user)
            ->setParameter('chats', $chats)
            ->orderBy('cm.creationDate', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
