<?php

namespace App\Repository;

use App\Entity\ChatMessage;
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

    public function getChatHistory(int $chatId): array
    {
        return $this->createQueryBuilder('cm')
            ->where('cm.chatId = :chatId')
            ->setParameter('chatId', $chatId)
            ->orderBy('cm.creationDate', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function getUserMostRecentReceivedMessage(int $userId, array $userChatIds): ?ChatMessage
    {
        return $this->createQueryBuilder('cm')
            ->where('cm.chatId IN (:userChatIds)')
            ->andWhere('cm.userId != :userId')
            ->setParameter('userId', $userId)
            ->setParameter('userChatIds', $userChatIds)
            ->orderBy('cm.id', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function getNewMessagesForUser(int $userId, array $chatIds, int $recentMessageId): ?array
    {
        return $this->createQueryBuilder('cm')
            ->where('cm.chatId IN (:chatIds)')
            ->andWhere('cm.userId != :userId')
            ->andWhere('cm.id > :recentMessageId')
            ->setParameter('recentMessageId', $recentMessageId)
            ->setParameter('userId', $userId)
            ->setParameter('chatIds', $chatIds)
            ->orderBy('cm.creationDate', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
