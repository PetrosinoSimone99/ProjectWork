<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Service\ChainError;
use App\Service\ChainService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/** HTTP validation stays here; state transitions belong to ChainService. */
final class ChainController extends AbstractController
{
    public function __construct(private ChainService $chains) {}

    #[Route('/api/chains', methods: ['POST'])]
    public function start(Request $request): JsonResponse
    {
        return $this->respond(function (User $user) use ($request): array {
            $data = $this->body($request);
            return ['chain' => $this->chains->start($user, $this->id($data, 'offeredServiceId'), $this->id($data, 'requestedServiceId'))];
        }, 201);
    }
    #[Route('/api/chains', methods: ['GET'])]
    public function list(): JsonResponse { return $this->respond(fn (User $u) => ['chains' => $this->chains->list($u)]); }

    #[Route('/api/chains/{id}', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function detail(int $id): JsonResponse { return $this->respond(fn (User $u) => ['chain' => $this->chains->detail($u, $id)]); }

    #[Route('/api/chains/{id}/decision', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function decide(int $id, Request $request): JsonResponse
    {
        return $this->respond(fn (User $u) => ['chain' => $this->chains->decide($u, $id, $this->decision($this->body($request)))]);
    }
    #[Route('/api/chains/{id}/agreements', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function agree(int $id, Request $request): JsonResponse
    {
        return $this->respond(function (User $u) use ($id, $request): array {
            $data = $this->body($request);
            $startAt = $data['startAt'] ?? null;
            if (!is_string($startAt) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/D', $startAt)) {
                throw new ChainError('Start time must be an ISO 8601 date with a timezone.', 400);
            }
            try {
                $date = new \DateTimeImmutable($startAt);
                $errors = \DateTimeImmutable::getLastErrors();
            } catch (\Exception) {
                throw new ChainError('Start time is invalid.', 400);
            }
            if ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0)) {
                throw new ChainError('Start time is invalid.', 400);
            }
            return ['agreement' => $this->chains->proposeAgreement($u, $id, $this->id($data, 'recipientUserId'), $this->text($data, 'location'), $date)];
        }, 201);
    }
    #[Route('/api/chains/{id}/agreements/{agreementId}/decision', requirements: ['id' => '\d+', 'agreementId' => '\d+'], methods: ['POST'])]
    public function decideAgreement(int $id, int $agreementId, Request $request): JsonResponse
    {
        return $this->respond(fn (User $u) => ['agreement' => $this->chains->decideAgreement($u, $id, $agreementId, $this->decision($this->body($request)))]);
    }
    #[Route('/api/chains/{id}/provisions/{provisionId}/receipt', requirements: ['id' => '\d+', 'provisionId' => '\d+'], methods: ['POST'])]
    public function receipt(int $id, int $provisionId): JsonResponse
    {
        return $this->respond(fn (User $u) => ['chain' => $this->chains->receive($u, $id, $provisionId)]);
    }
    #[Route('/api/chains/{id}/cancel', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function cancel(int $id, Request $request): JsonResponse
    {
        return $this->respond(fn (User $u) => ['chain' => $this->chains->cancel($u, $id, $this->text($this->body($request), 'reason'))]);
    }
    #[Route('/api/tokens', methods: ['GET'])]
    public function tokens(): JsonResponse { return $this->respond(fn (User $u) => ['tokens' => $this->chains->tokens($u)]); }

    private function respond(callable $operation, int $status = 200): JsonResponse
    {
        try {
            $user = $this->getUser();
            if (!$user instanceof User) {
                throw new ChainError('Authentication is required.', 401);
            }
            if (!$user->isActive()) {
                throw new ChainError('This account is inactive.', 403);
            }
            return $this->json($operation($user), $status);
        } catch (ChainError $error) {
            return $this->json(['error' => $error->getMessage()], $error->status);
        } catch (\Doctrine\DBAL\Exception\UniqueConstraintViolationException|\Doctrine\DBAL\Exception\RetryableException) {
            return $this->json(['error' => 'A concurrent operation changed these services. Retry the request.'], 409);
        }
    }
    private function body(Request $request): array
    {
        try { return $request->toArray(); } catch (\Symfony\Component\HttpFoundation\Exception\JsonException|\JsonException) {
            throw new ChainError('A JSON object is required.', 400);
        }
    }
    private function id(array $data, string $name): int
    {
        $value = $data[$name] ?? null;
        if (!is_int($value) || $value <= 0) {
            throw new ChainError($name.' must be a positive integer.', 400);
        }
        return $value;
    }
    private function text(array $data, string $name): string
    {
        $value = $data[$name] ?? null;
        if (!is_string($value) || trim($value) === '' || mb_strlen(trim($value)) > 255) {
            throw new ChainError($name.' must contain between 1 and 255 characters.', 400);
        }
        return trim($value);
    }
    private function decision(array $data): string
    {
        if (!in_array($data['decision'] ?? null, ['ACCEPT', 'REJECT'], true)) {
            throw new ChainError('A decision of ACCEPT or REJECT is required.', 400);
        }
        return $data['decision'];
    }
}
