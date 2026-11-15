<?php

namespace App\Manager\UseCase;

use App\Entity\User;
use App\Entity\Agreement;
use App\Entity\ServiceQueue;
use App\Enum\QueueStatus;
use App\Repository\ServiceQueueRepository;
use Doctrine\ORM\EntityManagerInterface;

class CloseQueueUseCase
{
    private ServiceQueueRepository $serviceQueueRepository;
    private EntityManagerInterface $entityManager;

    public function __construct(ServiceQueueRepository $serviceQueueRepository, EntityManagerInterface $entityManager)
    {
        $this->serviceQueueRepository = $serviceQueueRepository;
        $this->entityManager = $entityManager;
    }

    public function execute(User $user,Agreement $agreement): void
    {
        $queues = $this->serviceQueueRepository->getQueuesByAgreement($agreement);
        foreach ($queues as $queue) {
            if ($queue->getQueueStatus() !== QueueStatus::CLOSED) {
                $queue->setQueueStatus(QueueStatus::CLOSED);
                $this->entityManager->persist($queue);
            }
        }
        $this->entityManager->flush();
    }
}