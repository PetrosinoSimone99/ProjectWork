<?php
declare(strict_types=1);
namespace App\Controller;

use App\Entity\User;
use App\Manager\ServiceQueueManager;
use App\Exception\{ResourceNotFound, NotEnoughCreditsException};
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\{Request, JsonResponse};
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
final class QueueController extends AbstractController
{
    public function __construct(private ServiceQueueManager $queues, private LoggerInterface $logger) {}

    #[Route('/create-service-queue', name: 'create_queue', methods: ['POST'])]
    public function createQueue(Request $request): JsonResponse
    {
        return $this->respond(function (User $user) use ($request): JsonResponse {
            $data = $request->toArray();
            if (!is_string($data['queueType'] ?? null)) { throw new \InvalidArgumentException('queueType is required.'); }
            $this->queues->createServiceQueue($user, $data['queueType']);
            return $this->json(['message' => 'Service queue created successfully'], 201);
        });
    }
    #[Route('/cancel-queue/{queueId}', name: 'cancel_queue', methods: ['POST'])]
    public function cancelQueue(int $queueId): JsonResponse
    {
        return $this->respond(function (User $user) use ($queueId): JsonResponse {
            $this->queues->cancelServiceQueue($user, $queueId);
            return $this->json(['message' => 'Service queue cancelled successfully']);
        });
    }
    #[Route('/get-queues', name: 'get_queues', methods: ['GET'])]
    public function getQueues(): JsonResponse
    {
        return $this->respond(fn (User $user) => $this->json(['queues' => $this->queues->getServiceQueuesByUser($user)]));
    }
    private function respond(callable $work): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) { return $this->json(['error' => 'Authentication required.'], 401); }
        if (!$user->isActive()) { return $this->json(['error' => 'Account is inactive.'], 403); }
        try { return $work($user); }
        catch (ResourceNotFound) { return $this->json(['error' => 'Queue not found.'], 404); }
        catch (\InvalidArgumentException|\Symfony\Component\HttpKernel\Exception\BadRequestHttpException|\JsonException $e) { return $this->json(['error' => 'Invalid queue request.'], 400); }
        catch (NotEnoughCreditsException) { return $this->json(['error' => 'Not enough credits.'], 400); }
        catch (\DomainException|\Doctrine\DBAL\Exception\UniqueConstraintViolationException|\Doctrine\DBAL\Exception\RetryableException $e) { return $this->json(['error' => 'Queue conflicts with current account or service state.'], 409); }
        catch (\Throwable $e) { $this->logger->error('Queue request failed', ['exception' => $e]); return $this->json(['error' => 'Internal server error'], 500); }
    }
}
