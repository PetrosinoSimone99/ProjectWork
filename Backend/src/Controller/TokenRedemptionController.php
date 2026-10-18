<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Service\ChainError;
use App\Service\TokenRedemptionService;
use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;
use Doctrine\DBAL\Exception\RetryableException;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/** Validate HTTP input here; keep the lifecycle in the application service. */
final class TokenRedemptionController extends AbstractController
{
    public function __construct(private TokenRedemptionService $redemptions) {}

    #[Route('/api/tokens/{id}/reserve', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function reserve(int $id, Request $request): JsonResponse
    {
        return $this->respond(function (User $user) use ($id, $request): array {
            $data = $this->body($request, ['serviceId']);
            if (!is_int($data['serviceId'] ?? null) || $data['serviceId'] < 1) {
                throw new ChainError('serviceId must be a positive integer.', 400);
            }
            return $this->redemptions->reserve($user, $id, $data['serviceId']);
        }, 201);
    }

    #[Route('/api/token-redemptions', methods: ['GET'])]
    public function list(): JsonResponse
    {
        return $this->respond(fn (User $user) => ['redemptions' => $this->redemptions->list($user)]);
    }

    #[Route('/api/token-redemptions/{id}', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function detail(int $id): JsonResponse
    {
        return $this->respond(fn (User $user) => ['redemption' => $this->redemptions->detail($user, $id)]);
    }

    #[Route('/api/token-redemptions/{id}/decision', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function decision(int $id, Request $request): JsonResponse
    {
        return $this->respond(function (User $user) use ($id, $request): array {
            $data = $this->body($request, ['decision']);
            if (!in_array($data['decision'] ?? null, ['ACCEPT', 'REJECT'], true)) {
                throw new ChainError('decision must be ACCEPT or REJECT.', 400);
            }
            return $this->redemptions->change($user, $id, $data['decision']);
        });
    }

    #[Route('/api/token-redemptions/{id}/receipt', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function receipt(int $id, Request $request): JsonResponse
    {
        return $this->respond(function (User $user) use ($id, $request): array {
            $this->body($request, []);
            return $this->redemptions->change($user, $id, 'RECEIPT');
        });
    }

    #[Route('/api/token-redemptions/{id}/cancel', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function cancel(int $id, Request $request): JsonResponse
    {
        return $this->respond(function (User $user) use ($id, $request): array {
            $this->body($request, []);
            return $this->redemptions->change($user, $id, 'CANCEL');
        });
    }

    private function body(Request $request, array $fields): array
    {
        if ($request->getContent() === '' && $fields === []) { return []; }
        try { $data = json_decode($request->getContent(), false, 512, JSON_THROW_ON_ERROR); }
        catch (\JsonException) { throw new ChainError('A JSON object is required.', 400); }
        if (!$data instanceof \stdClass || array_diff(array_keys((array) $data), $fields) !== []) {
            throw new ChainError('Provide a JSON object with only the supported fields.', 400);
        }
        return (array) $data;
    }

    private function respond(callable $operation, int $status = 200): JsonResponse
    {
        try {
            $user = $this->getUser();
            if (!$user instanceof User) { throw new ChainError('Authentication is required.', 401); }
            if (!$user->isActive()) { throw new ChainError('This account is inactive.', 403); }
            return $this->json($operation($user), $status);
        } catch (ChainError $error) {
            return $this->json(['error' => $error->getMessage()], $error->status);
        } catch (UniqueConstraintViolationException|RetryableException|ForeignKeyConstraintViolationException) {
            return $this->json(['error' => 'A concurrent operation changed this request. Please try again.'], 409);
        }
    }
}
