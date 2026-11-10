<?php

namespace App\Manager;

use App\Entity\User;
use App\Entity\ServiceQueue;
use App\Manager\ServiceManager;
use App\Repository\ServiceQueueRepository;
use App\Enum\QueueType;
use App\Enum\QueueStatus;
use App\Message\QueueId;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Messenger\MessageBusInterface;
class ServiceQueueManager
{
    private ServiceManager $serviceManager;
    private ServiceQueueRepository $serviceQueueRepository;
    private EntityManagerInterface $entityManager;
    private MessageBusInterface $messageBus;

    public function __construct(ServiceManager $serviceManager, ServiceQueueRepository $serviceQueueRepository, EntityManagerInterface $entityManager, MessageBusInterface $messageBus)
    {
        $this->serviceManager = $serviceManager;
        $this->serviceQueueRepository = $serviceQueueRepository;
        $this->entityManager = $entityManager;
        $this->messageBus = $messageBus;
    }

    public function getQueueById(int $queueId): ?ServiceQueue
    {
        return $this->serviceQueueRepository->getQueueById($queueId);
    }
    public function createServiceQueue(User $user, string $queueType): void
    {
        $type = null;
        if($queueType === 'OFFER'){
            $type = QueueType::OFFER;
        }else{
            $type = QueueType::REQUEST;
        }
        $userService = $this->serviceManager->getUserServiceByType($user, $queueType);
        $serviceQueue = new ServiceQueue($user, $type, $userService, $user->getLocation(), QueueStatus::OPEN);
        $this->entityManager->persist($serviceQueue);
        $this->entityManager->flush();

        $this->messageBus->dispatch(new QueueId($serviceQueue->getId()));
    }

    public function getRelevantQueues(QueueType $queueType): array
    {
        return $this->serviceQueueRepository->getRelevantQueues($queueType);
    }
}