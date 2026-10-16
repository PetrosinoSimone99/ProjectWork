<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\StaffOperationLog;
use App\Repository\StaffOperationLogRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/** The existing /api/staff security rule also protects this read-only history. */
#[Route('/api/staff/operations')]
final class StaffOperationController extends AbstractController
{
    #[Route('', name: 'api_staff_operations_list', methods: ['GET'])]
    public function index(Request $request, StaffOperationLogRepository $logs): JsonResponse
    {
        $filters = $request->query->all();
        if (array_diff(array_keys($filters), ['page', 'limit', 'staffId', 'action', 'targetType', 'targetId']) !== []) {
            return $this->error('The request contains an unknown query parameter.', 400);
        }
        $filters += ['page' => '1', 'limit' => '20'];
        foreach (['page', 'limit', 'staffId', 'targetId'] as $field) {
            if (!array_key_exists($field, $filters)) { continue; }
            $value = $filters[$field];
            if (!is_string($value) || !ctype_digit($value)
                || ($integer = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])) === false) {
                return $this->error('Page, limit and IDs must be positive integers.', 400);
            }
            $filters[$field] = $integer;
        }
        if ($filters['limit'] > 50 || $filters['page'] > intdiv(PHP_INT_MAX, 50)) {
            return $this->error('Page is too large or limit is greater than 50.', 400);
        }
        if (isset($filters['action']) && !in_array($filters['action'], StaffOperationLog::ACTIONS, true)) {
            return $this->error('Unknown operation action.', 400);
        }
        if (isset($filters['targetType']) && !in_array($filters['targetType'], StaffOperationLog::TARGET_TYPES, true)) {
            return $this->error('Target type must be USER, REPORT or TOKEN.', 400);
        }
        if (isset($filters['targetId']) && !isset($filters['targetType'])) {
            return $this->error('targetType is required when filtering by targetId.', 400);
        }
        $items = $logs->paginate($filters);
        $total = count($items);
        return $this->json([
            'operations' => array_map(static fn (StaffOperationLog $log) => $log->toApiArray(), iterator_to_array($items->getIterator(), false)),
            'pagination' => ['page' => $filters['page'], 'limit' => $filters['limit'], 'totalItems' => $total, 'totalPages' => (int) ceil($total / $filters['limit'])],
        ]);
    }

    #[Route('/{id}', name: 'api_staff_operations_read', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function show(int $id, StaffOperationLogRepository $logs): JsonResponse
    {
        $log = $logs->find($id);
        return $log === null ? $this->error('The operation does not exist.', 404) : $this->json(['operation' => $log->toApiArray()]);
    }

    private function error(string $message, int $status): JsonResponse
    {
        return $this->json(['error' => $message], $status);
    }
}
