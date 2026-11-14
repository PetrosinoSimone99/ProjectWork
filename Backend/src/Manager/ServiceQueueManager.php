<?php

namespace App\Manager;

use App\Entity\User;
use App\Entity\ServiceQueue;
use App\Manager\ServiceManager;
use App\Manager\UserManager;
use App\Manager\AgreementManager;
use App\DTO\ServiceQueueDTO;
use App\Repository\ServiceQueueRepository;
use App\Enum\QueueType;
use App\Enum\QueueStatus;
use App\Message\QueueId;
use App\Exception\NotEnoughCreditsException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Messenger\MessageBusInterface;
class ServiceQueueManager
{
    private ServiceManager $serviceManager;
    private UserManager $userManager;
    private AgreementManager $agreementManager;
    private ServiceQueueRepository $serviceQueueRepository;
    private EntityManagerInterface $entityManager;
    private MessageBusInterface $messageBus;

    public function __construct(ServiceManager $serviceManager, ServiceQueueRepository $serviceQueueRepository,
     UserManager $userManager, AgreementManager $agreementManager, EntityManagerInterface $entityManager, MessageBusInterface $messageBus)
    {
        $this->serviceManager = $serviceManager;
        $this->serviceQueueRepository = $serviceQueueRepository;
        $this->userManager = $userManager;
        $this->agreementManager = $agreementManager;
        $this->entityManager = $entityManager;
        $this->messageBus = $messageBus;
    }

    public function getQueueById(int $queueId): ?ServiceQueue
    {
        return $this->serviceQueueRepository->getQueueById($queueId);
    }

    public function getServiceQueuesByUser(User $user): ?array
    {
        $dtos = [];
        $queues = $this->serviceQueueRepository->getServiceQueuesByUser($user);
        foreach ($queues as $queue) {
            $dtos[] = new ServiceQueueDTO(
                $queue->getId(),
                $queue->getQueueType(),
                $queue->getQueueStatus(),
                $queue->getLocation(),
                $queue->getService()->getDescription(),
                $queue->getService()->getCategories()->first()->getDescription(),
                $queue->getService()->isRemote(),
                $queue->getAgreement() ? $queue->getAgreement()->getId() : null
            );
        }
        return $dtos;
    }
    public function createServiceQueue(User $user, string $queueType): void
    {
        $type = null;
        if($queueType === 'OFFER'){
            $type = QueueType::OFFER;
        }else{
            $type = QueueType::REQUEST;
        }
        if($type === QueueType::REQUEST){
            if($user->getCredits() > 0){
                $this->userManager->deductCreditForQueue($user);
            }
            else{
                throw new NotEnoughCreditsException("User does not have enough credits to create an request queue.");
            }
        }
        $userService = $this->serviceManager->getUserServiceByType($user, $queueType);
        $serviceQueue = new ServiceQueue($user, $type, $userService, $user->getLocation(), QueueStatus::OPEN);
        $this->entityManager->persist($user);
        $this->entityManager->persist($serviceQueue);
        $this->entityManager->flush();

        $this->messageBus->dispatch(new QueueId($serviceQueue->getId()));
    }

    public function getRelevantQueues(QueueType $queueType, string $location): array
    {
        return $this->serviceQueueRepository->getRelevantQueues($queueType, $location);
    }

    public function cancelServiceQueue(User $user, int $queueId): void
    {
        $queue = $this->getQueueById($queueId);
        if ($queue && $queue->getUser() === $user && $queue->getQueueStatus() !== QueueStatus::CLOSED) {
            $queue->setQueueStatus(QueueStatus::CLOSED);
            $agreement = $queue->getAgreement();
            if ($agreement !== null) {
                $this->agreementManager->cancelAgreement($user, $agreement->getId());
            }
            $this->entityManager->persist($queue);
            $this->entityManager->flush();
        }
    }
}