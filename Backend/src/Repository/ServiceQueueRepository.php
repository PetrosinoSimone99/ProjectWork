<?php

namespace App\Repository;

use App\Entity\ServiceQueue;
use App\Entity\User;
use App\Entity\Agreement;
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

    public function getRelevantQueues(QueueType $queueType, string $location): array
    {
        return $this->findBy(['queueType' => $queueType, 'queueStatus' => 'OPEN', 'location' => $location, 'agreement' => null]);
    }

    public function getQueuesByAgreement(Agreement $agreement): ?array
    {
        return $this->findBy(['agreement' => $agreement]);
    }

    public function getServiceQueuesByUser(User $user): ?array
    {
        return $this->createQueryBuilder('sq')
            ->where('sq.user = :user')
            ->andWhere('sq.queueStatus != :status')
            ->setParameter('status', 'CLOSED')
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }
}
