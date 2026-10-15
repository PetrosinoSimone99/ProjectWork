<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Entity\UserReport;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Exception\JsonException;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/** Lets an active user report another user once. */
final class ReportController extends AbstractController
{
    #[Route('/api/reports', name: 'api_reports_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $reporter = $this->getUser();
        if (!$reporter instanceof User) {
            return $this->error('Authentication is required.', 401);
        }
        if (!$reporter->isActive()) {
            return $this->error('This account is inactive.', 403);
        }

        try {
            $data = $request->toArray();
        } catch (JsonException) {
            return $this->error('The request body must contain valid JSON.', 400);
        }
        foreach (array_keys($data) as $field) {
            if (!in_array($field, ['reportedUserId', 'reason'], true)) {
                return $this->error('The request contains an unknown field.', 400);
            }
        }
        $reportedUserId = $data['reportedUserId'] ?? null;
        if (!is_int($reportedUserId) || $reportedUserId < 1) {
            return $this->error('Reported user ID must be a positive integer.', 400);
        }
        if (!is_string($data['reason'] ?? null)) {
            return $this->error('Reason must be text.', 400);
        }
        $reason = trim($data['reason']);
        if ($reason === '' || mb_strlen($reason) > 2000) {
            return $this->error('Reason must contain between 1 and 2000 characters.', 400);
        }
        if ($reportedUserId === $reporter->getId()) {
            return $this->error('You cannot report yourself.', 400);
        }
        $reportedUser = $entityManager->find(User::class, $reportedUserId);
        if ($reportedUser === null) {
            return $this->error('The reported user does not exist.', 404);
        }

        // The author always comes from the JWT, never from a client-supplied ID.
        $reports = $entityManager->getRepository(UserReport::class);
        if ($reports->findOneBy(['reporter' => $reporter, 'reportedUser' => $reportedUser]) !== null) {
            return $this->error('You have already reported this user.', 409);
        }
        $report = new UserReport($reporter, $reportedUser, $reason);
        try {
            $entityManager->persist($report);
            $entityManager->flush();
        } catch (UniqueConstraintViolationException) {
            // Two simultaneous requests may both pass the check above. The database prevents duplicates.
            return $this->error('You have already reported this user.', 409);
        }

        return $this->json(['report' => $report->toApiArray()], 201);
    }

    private function error(string $message, int $status): JsonResponse
    {
        return $this->json(['error' => $message], $status);
    }
}
