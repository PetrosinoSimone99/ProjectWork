<?php
declare(strict_types=1);
namespace App\Manager;

use App\Entity\{User, Service, ServiceQueue};
use App\Enum\{QueueType, QueueStatus};
use App\Exception\{ResourceNotFound, NotEnoughCreditsException};
use App\Message\QueueId;
use App\Repository\{ServiceRepository, ServiceQueueRepository};
use App\Service\{WorkflowTransaction, LocationNormalizer};
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Messenger\MessageBusInterface;

final class ServiceQueueManager
{
    public function __construct(private EntityManagerInterface $em, private ServiceRepository $services,
        private ServiceQueueRepository $queues, private AgreementManager $agreements,
        private WorkflowTransaction $transaction, private MessageBusInterface $bus) {}

    public function getQueueById(int $id): ?ServiceQueue { return $this->queues->find($id); }
    public function getRelevantQueues(QueueType $type, string $location): array
    {
        return array_values(array_filter($this->queues->findBy(['queueType' => $type, 'queueStatus' => QueueStatus::OPEN, 'agreement' => null]), fn ($q) => LocationNormalizer::normalize($q->getLocation()) === LocationNormalizer::normalize($location)));
    }
    public function getServiceQueuesByUser(User $user): array
    {
        return array_map(fn (ServiceQueue $q) => [
            'id' => $q->getId(), 'queueType' => $q->getQueueType()->value, 'queueStatus' => $q->getQueueStatus()->value,
            'location' => $q->getLocation(), 'createdAt' => $q->getCreatedAt()?->format(DATE_ATOM),
            'serviceDescription' => $q->getService()?->getDescription(),
            'serviceCategory' => $q->getService()?->getCategories()->first() ? $q->getService()->getCategories()->first()->getDescription() : null,
            'serviceRemote' => $q->getService()?->isRemote(), 'agreementId' => $q->getAgreement()?->getId(),
        ], $this->queues->getServiceQueuesByUser($user));
    }

    public function createServiceQueue(User $user, string $queueType): void
    {
        $type = QueueType::tryFrom($queueType);
        if (!$type) { throw new \InvalidArgumentException('Invalid queue type.'); }
        $this->transaction->run(function () use ($user, $type): void {
            $this->transaction->lock('users', [$user->getId()]); $this->em->refresh($user);
            if (!$user->isActive()) { throw new \DomainException('Account is inactive.'); }
            if ($this->queues->getActiveQueueByUser($user)) { throw new \DomainException('User already has an active queue.'); }
            $service = $this->services->getUserServiceByType($user, $type->value);
            if (!$service) { throw new \DomainException('Publish a service of this type first.'); }
            $this->transaction->lock('services', [$service->getId()]); $this->em->refresh($service);
            if ($service->isDeleted() || $service->isSuspended() || $service->getCategories()->isEmpty()) { throw new \DomainException('The service is unavailable or has no category.'); }
            $location = LocationNormalizer::normalize($service->getLocation() ?? $user->getLocation());
            if ($location === null) { throw new \DomainException('A location is required.'); }
            // A request queue costs the single credit; an offer queue is free.
            if ($type === QueueType::REQUEST) {
                if ($user->getCredits() < 1) { throw new NotEnoughCreditsException('Not enough credits.'); }
                $user->setCredits($user->getCredits() - 1);
            }
            $queue = new ServiceQueue($user, $type, $service, $location, QueueStatus::OPEN);
            $this->em->persist($queue); $this->em->flush();
            // Doctrine Messenger uses this same DB connection, so dispatch rolls back too.
            $this->bus->dispatch(new QueueId($queue->getId()));
        });
    }

    public function cancelServiceQueue(User $user, int $id): void
    {
        $this->transaction->run(function () use ($user, $id): void {
            $this->transaction->lock('users', [$user->getId()]); $this->em->refresh($user);
            $queue = $this->queues->find($id);
            if (!$queue || $queue->getUser()->getId() !== $user->getId()) { throw new ResourceNotFound('Queue not found.'); }
            if ($queue->getQueueStatus() === QueueStatus::CLOSED) { return; }
            // Lock agreements before their queues, consistently with cancellation/completion.
            if ($queue->getAgreement()) { $this->agreements->cancelAgreement($user, $queue->getAgreement()->getId()); return; }
            $this->transaction->lock('service_queues', [$id]); $this->em->refresh($queue);
            if ($queue->getQueueStatus() === QueueStatus::CLOSED) { return; }
            if ($queue->getAgreement()) { throw new \DomainException('Queue was matched; reload before cancelling.'); }
            $queue->setQueueStatus(QueueStatus::CLOSED);
            if ($queue->getQueueType() === QueueType::REQUEST) { $user->setCredits($user->getCredits() + 1); }
        });
    }
}
