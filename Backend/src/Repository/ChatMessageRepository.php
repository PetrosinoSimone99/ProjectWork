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
            ->leftJoin('cm.chat', 'c')->addSelect('c')
            ->andWhere('cm.chat = :chatId')
            ->setParameter('chatId', $chatId)
            ->orderBy('cm.id', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
