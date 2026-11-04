<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Entity\UserReport;
use App\Repository\UserRepository;
use App\Repository\UserReportRepository;
use App\Service\StaffOperationLogger;
use Doctrine\DBAL\Exception\RetryableException;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\Pagination\Paginator;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Exception\JsonException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/** Staff administration is deliberately separate from public profile APIs. */
#[Route('/api/staff')]
final class StaffController extends AbstractController
{
    public function __construct(private StaffOperationLogger $history) {}

    #[Route('/users', name: 'api_staff_users_list', methods: ['GET'])]
    public function users(Request $request, UserRepository $users): JsonResponse
    {
        $filters = $this->filters($request, ['page', 'limit', 'q', 'accountStatus']);
        if ($filters instanceof JsonResponse) { return $filters; }
        if (isset($filters['q']) && (!is_string($filters['q']) || mb_strlen($filters['q']) > 255)) {
            return $this->error('Search text must contain at most 255 characters.', 400);
        }
        if (isset($filters['accountStatus']) && !in_array($filters['accountStatus'], [User::STATUS_ACTIVE, User::STATUS_INACTIVE], true)) {
            return $this->error('Account status must be ACTIVE or INACTIVE.', 400);
        }
        $items = $users->paginateForStaff($filters['page'], $filters['limit'], isset($filters['q']) ? trim($filters['q']) : null, $filters['accountStatus'] ?? null);
        return $this->pageResponse('users', $items, $filters, static fn (User $user) => $user->toApiArray());
    }

    #[Route('/users/{id}', name: 'api_staff_users_read', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function user(int $id, UserRepository $users): JsonResponse
    {
        $user = $users->find($id);
        return $user === null ? $this->error('The user does not exist.', 404) : $this->json(['user' => $user->toApiArray()]);
    }

    #[Route('/users/{id}/promote', name: 'api_staff_users_promote', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function promote(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        // Promotion has no editable fields: the client cannot choose arbitrary roles.
        if ($request->getContent() !== '') {
            $data = $this->body($request, []);
            if ($data instanceof JsonResponse) { return $data; }
        }
        return $this->changeUser($id, $em, null);
    }

    #[Route('/users/{id}/status', name: 'api_staff_users_status', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function status(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = $this->body($request, ['accountStatus']);
        if ($data instanceof JsonResponse) { return $data; }
        if (!in_array($data['accountStatus'] ?? null, [User::STATUS_ACTIVE, User::STATUS_INACTIVE], true)) {
            return $this->error('Account status must be ACTIVE or INACTIVE.', 400);
        }
        return $this->changeUser($id, $em, $data['accountStatus']);
    }

    #[Route('/reports', name: 'api_staff_reports_list', methods: ['GET'])]
    public function reports(Request $request, UserReportRepository $reports): JsonResponse
    {
        $filters = $this->filters($request, ['page', 'limit', 'status', 'reporterId', 'reportedUserId']);
        if ($filters instanceof JsonResponse) { return $filters; }
        if (isset($filters['status']) && !in_array($filters['status'], [UserReport::STATUS_PENDING, UserReport::STATUS_IN_REVIEW, UserReport::STATUS_CONFIRMED, UserReport::STATUS_REJECTED], true)) {
            return $this->error('Report status must be PENDING, IN_REVIEW, CONFIRMED or REJECTED.', 400);
        }
        foreach (['reporterId', 'reportedUserId'] as $field) {
            if (array_key_exists($field, $filters)) {
                $value = $this->positiveInteger($filters[$field]);
                if ($value === null) { return $this->error('User filters must be positive integer IDs.', 400); }
                $filters[$field] = $value;
            }
        }
        $items = $reports->paginateForStaff($filters['page'], $filters['limit'], $filters['status'] ?? null, $filters['reporterId'] ?? null, $filters['reportedUserId'] ?? null);
        return $this->pageResponse('reports', $items, $filters, static fn (UserReport $report) => $report->toStaffApiArray());
    }

    #[Route('/reports/{id}', name: 'api_staff_reports_read', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function report(int $id, UserReportRepository $reports): JsonResponse
    {
        $report = $reports->find($id);
        return $report === null ? $this->error('The report does not exist.', 404) : $this->json(['report' => $report->toStaffApiArray()]);
    }

    #[Route('/reports/{id}/claim', name: 'api_staff_reports_claim', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function claim(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        if ($request->getContent() !== '') {
            $data = $this->body($request, []);
            if ($data instanceof JsonResponse) { return $data; }
        }
        $staff = $this->getUser();
        try {
            return $em->wrapInTransaction(function () use ($em, $id, $staff): JsonResponse {
                $report = $em->find(UserReport::class, $id, LockMode::PESSIMISTIC_WRITE);
                if ($report === null) { return $this->error('The report does not exist.', 404); }
                // Check the current state after waiting for any other staff operation.
                $em->refresh($report);
                if (!$report->isPending()) { return $this->error('This report has already been claimed or reviewed.', 409); }
                $before = $this->reviewValues($report);
                $report->claim($staff);
                $this->history->record($staff, 'REPORT_CLAIMED', 'REPORT', $id, $before, $this->reviewValues($report));
                return $this->json(['report' => $report->toStaffApiArray()]);
            });
        } catch (RetryableException) {
            return $this->error('The report changed during this request. Please try again.', 409);
        }
    }

    #[Route('/reports/{id}/review', name: 'api_staff_reports_review', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function review(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = $this->body($request, ['status', 'reviewNote']);
        if ($data instanceof JsonResponse) { return $data; }
        if (!in_array($data['status'] ?? null, [UserReport::STATUS_CONFIRMED, UserReport::STATUS_REJECTED], true)) {
            return $this->error('Review status must be CONFIRMED or REJECTED.', 400);
        }
        if (!is_string($data['reviewNote'] ?? null)) {
            return $this->error('Review note must be text.', 400);
        }
        $note = trim($data['reviewNote']);
        if ($note === '' || mb_strlen($note) > 2000) {
            return $this->error('Review note must contain between 1 and 2000 characters.', 400);
        }
        $staff = $this->getUser();
        try {
            return $em->wrapInTransaction(function () use ($em, $id, $data, $note, $staff): JsonResponse {
                $report = $em->find(UserReport::class, $id, LockMode::PESSIMISTIC_WRITE);
                if ($report === null) { return $this->error('The report does not exist.', 404); }
                // Reload after obtaining the lock in case another request just closed this report.
                $em->refresh($report);
                if ($report->isClosed()) { return $this->error('This report has already been reviewed.', 409); }
                if (!$report->canBeReviewedBy($staff)) { return $this->error('Only the assigned staff member can review this report.', 403); }
                $before = $this->reviewValues($report);
                $report->review($data['status'], $note, $staff);
                $this->history->record($staff, 'REPORT_REVIEWED', 'REPORT', $id, $before, $this->reviewValues($report));
                return $this->json(['report' => $report->toStaffApiArray()]);
            });
        } catch (RetryableException) {
            return $this->error('The report changed during this request. Please try again.', 409);
        }
    }

    /** Both operations lock the same user row, so promotion cannot race deactivation. */
    private function changeUser(int $id, EntityManagerInterface $em, ?string $status): JsonResponse
    {
        try {
            return $em->wrapInTransaction(function () use ($em, $id, $status): JsonResponse {
                $user = $em->find(User::class, $id, LockMode::PESSIMISTIC_WRITE);
                if ($user === null) { return $this->error('The user does not exist.', 404); }
                $em->refresh($user);
                $isStaff = in_array(User::ROLE_STAFF, $user->getRoles(), true);
                if ($status !== null) {
                    if ($isStaff) { return $this->error('Staff account status cannot be changed through this API.', 403); }
                    $before = ['accountStatus' => $user->getAccountStatus()];
                    $user->setAccountStatus($status);
                    $this->history->record($this->getUser(), 'USER_STATUS_CHANGED', 'USER', $id, $before, ['accountStatus' => $user->getAccountStatus()]);
                } else {
                    if (!$user->isActive()) { return $this->error('Activate the user before promoting them to staff.', 409); }
                    if (!$isStaff) {
                        $before = ['roles' => $user->getRoles()];
                        $user->setRoles(array_values(array_unique([...$user->getRoles(), User::ROLE_STAFF])));
                        $this->history->record($this->getUser(), 'USER_PROMOTED', 'USER', $id, $before, ['roles' => $user->getRoles()]);
                    }
                }
                return $this->json(['user' => $user->toApiArray()]);
            });
        } catch (RetryableException) {
            return $this->error('The user changed during this request. Please try again.', 409);
        }
    }

    /** Keep only review fields, not the reporter's original reason or profile. */
    private function reviewValues(UserReport $report): array
    {
        $values = $report->toStaffApiArray();
        return [
            'status' => $values['status'],
            'assignedToId' => $values['assignedTo']['id'] ?? null,
            'assignedAt' => $values['assignedAt'] === null ? null : (new \DateTimeImmutable($values['assignedAt']))->setTimezone(new \DateTimeZone('UTC'))->format(DATE_ATOM),
            'reviewNote' => $values['reviewNote'],
            'reviewedById' => $values['reviewedBy']['id'] ?? null,
            'reviewedAt' => $values['reviewedAt'] === null ? null : (new \DateTimeImmutable($values['reviewedAt']))->setTimezone(new \DateTimeZone('UTC'))->format(DATE_ATOM),
        ];
    }

    private function body(Request $request, array $allowedFields): array|JsonResponse
    {
        try { $data = $request->toArray(); }
        catch (JsonException) { return $this->error('The request body must contain valid JSON.', 400); }
        foreach (array_keys($data) as $field) {
            if (!in_array($field, $allowedFields, true)) { return $this->error('The request contains an unknown field.', 400); }
        }
        return $data;
    }

    private function filters(Request $request, array $allowedFields): array|JsonResponse
    {
        $filters = $request->query->all();
        foreach (array_keys($filters) as $field) {
            if (!in_array($field, $allowedFields, true)) { return $this->error('The request contains an unknown query parameter.', 400); }
        }
        $page = $this->positiveInteger($filters['page'] ?? '1');
        $limit = $this->positiveInteger($filters['limit'] ?? '20');
        if ($page === null || $limit === null || $limit > 50 || $page > intdiv(PHP_INT_MAX, 50)) {
            return $this->error('Page must be a positive integer and limit must be between 1 and 50.', 400);
        }
        return array_replace($filters, ['page' => $page, 'limit' => $limit]);
    }

    private function positiveInteger(mixed $value): ?int
    {
        if ((!is_string($value) && !is_int($value)) || !ctype_digit((string) $value)) { return null; }
        $integer = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        return $integer === false ? null : $integer;
    }

    private function pageResponse(string $key, Paginator $items, array $filters, callable $serialize): JsonResponse
    {
        $total = count($items);
        return $this->json([
            $key => array_map($serialize, iterator_to_array($items->getIterator(), false)),
            'pagination' => ['page' => $filters['page'], 'limit' => $filters['limit'], 'totalItems' => $total, 'totalPages' => (int) ceil($total / $filters['limit'])],
        ]);
    }

    private function error(string $message, int $status): JsonResponse
    {
        return $this->json(['error' => $message], $status);
    }
}
