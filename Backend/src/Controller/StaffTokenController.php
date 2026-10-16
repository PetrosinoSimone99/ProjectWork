<?php

declare(strict_types=1);

namespace App\Controller;

use App\Repository\ChainRepository;
use App\Service\ChainClock;
use App\Service\ChainError;
use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;
use Doctrine\DBAL\Exception\RetryableException;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

// The /api/staff firewall rule requires ROLE_STAFF; inactive accounts are also blocked.
#[Route('/api/staff/tokens')]
final class StaffTokenController extends AbstractController
{
    public function __construct(private ChainRepository $repository, private ChainClock $clock) {}

    #[Route('', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        return $this->respond(function () use ($request): array {
            $data = $this->body($request, ['userId', 'chainId']);
            $userId = $this->positiveId($data['userId'] ?? null, 'userId');
            $chainId = isset($data['chainId']) ? $this->positiveId($data['chainId'], 'chainId') : null;
            if (!$this->repository->tokenUserExists($userId)) {
                throw new ChainError('The user does not exist.', 404);
            }
            if ($chainId !== null && !$this->repository->tokenChainExists($chainId)) {
                throw new ChainError('The chain does not exist.', 404);
            }
            // Staff may assign tokens manually, independently of automatic chain compensation.
            $now = $this->clock->now()->setTimezone(new \DateTimeZone('UTC'));
            $id = $this->repository->add('tokens', [
                'user_id' => $userId,
                'group_id' => $chainId,
                'issued_at' => $now->format('Y-m-d H:i:s'),
                // New tokens always start with a lifetime of exactly 30 days.
                'expiration_date' => $now->modify('+30 days')->format('Y-m-d H:i:s'),
            ]);
            return $this->repository->token($id);
        }, 201);
    }

    #[Route('/{id}', requirements: ['id' => '\d+'], methods: ['PUT', 'PATCH'])]
    public function update(int $id, Request $request): JsonResponse
    {
        return $this->respond(function () use ($id, $request): array {
            $data = $this->body($request, ['expiresAt']);
            $expiration = $this->expiration($data['expiresAt'] ?? null);
            $this->repository->token($id, true);
            // Expiration is the only editable field, so PUT and PATCH share this operation.
            $this->repository->updateTokenExpiration($id, $expiration);
            return $this->repository->token($id);
        });
    }

    #[Route('/{id}', requirements: ['id' => '\d+'], methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        return $this->respond(function () use ($id): null {
            $this->repository->token($id, true);
            $this->repository->deleteToken($id, $this->clock->now());
            return null;
        }, 204);
    }

    private function respond(callable $operation, int $status = 200): JsonResponse
    {
        try {
            $token = $this->repository->transaction($operation);
            return $status === 204 ? new JsonResponse(null, 204) : $this->json(['token' => $this->toApiArray($token)], $status);
        } catch (ChainError $error) {
            return $this->json(['error' => $error->getMessage()], $error->status);
        } catch (UniqueConstraintViolationException) {
            return $this->json(['error' => 'This user already has a token for this chain.'], 409);
        } catch (ForeignKeyConstraintViolationException) {
            return $this->json(['error' => 'The user or chain no longer exists.'], 404);
        } catch (RetryableException) {
            return $this->json(['error' => 'The token changed during this request. Please try again.'], 409);
        }
    }

    private function body(Request $request, array $allowedFields): array
    {
        try {
            $data = json_decode($request->getContent(), false, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new ChainError('A JSON object is required.', 400);
        }
        if (!$data instanceof \stdClass) {
            throw new ChainError('A JSON object is required.', 400);
        }
        $data = (array) $data;
        if (array_diff(array_keys($data), $allowedFields) !== []) {
            throw new ChainError('The request contains unknown fields.', 400);
        }
        return $data;
    }

    private function positiveId(mixed $value, string $field): int
    {
        if (!is_int($value) || $value <= 0) {
            throw new ChainError($field.' must be a positive integer.', 400);
        }
        return $value;
    }

    private function expiration(mixed $value): string
    {
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/D', $value)) {
            throw new ChainError('expiresAt must be an ISO 8601 date with a timezone.', 400);
        }
        try {
            $date = new \DateTimeImmutable($value);
            $errors = \DateTimeImmutable::getLastErrors();
        } catch (\Exception) {
            throw new ChainError('expiresAt is invalid.', 400);
        }
        if ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0)) {
            throw new ChainError('expiresAt is invalid.', 400);
        }
        $date = $date->setTimezone(new \DateTimeZone('UTC'));
        // MySQL DATETIME cannot store years outside this range, even after timezone conversion.
        if ((int) $date->format('Y') < 1000 || (int) $date->format('Y') > 9999) {
            throw new ChainError('expiresAt must have a UTC year between 1000 and 9999.', 400);
        }
        return $date->format('Y-m-d H:i:s');
    }

    private function toApiArray(array $token): array
    {
        $utc = new \DateTimeZone('UTC');
        $expiration = new \DateTimeImmutable($token['expiration_date'], $utc);
        return [
            'id' => (int) $token['id'],
            'userId' => $token['user_id'] === null ? null : (int) $token['user_id'],
            'chainId' => $token['group_id'] === null ? null : (int) $token['group_id'],
            'issuedAt' => $token['issued_at'] === null ? null : (new \DateTimeImmutable($token['issued_at'], $utc))->format(DATE_ATOM),
            'expiresAt' => $expiration->format(DATE_ATOM),
            'expired' => $expiration <= $this->clock->now(),
        ];
    }
}
