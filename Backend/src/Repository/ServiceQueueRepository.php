<?php

namespace App\Repository;

use App\Entity\ServiceQueue;
use App\Enum\QueueType;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ServiceQueue>
 */
class ServiceQueueRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ServiceQueue::class);
    }

    public function getQueueById(int $queueId): ?ServiceQueue
    {
        return $this->find($queueId);
    }

    public function getRelevantQueues(QueueType $queueType): array
    {
        return $this->findBy(['queueType' => $queueType, 'queueStatus' => 'OPEN']);
    }
}
