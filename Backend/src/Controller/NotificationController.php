<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Notification;
use App\Entity\User;
use App\Repository\NotificationRepository;
use App\Service\Clock;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/** JWT and active-account checks are shared with the other protected APIs. */
#[Route('/api/notifications')]
final class NotificationController extends AbstractController
{
    #[Route('', name: 'api_notifications_list', methods: ['GET'])]
    public function index(Request $request, NotificationRepository $notifications): JsonResponse
    {
        $filters = $request->query->all();
        if (array_diff(array_keys($filters), ['page', 'limit', 'unreadOnly']) !== []) {
            return $this->error('The request contains an unknown query parameter.', 400);
        }
        $page = $this->positiveInteger($filters['page'] ?? '1');
        $limit = $this->positiveInteger($filters['limit'] ?? '20');
        $unreadOnly = $filters['unreadOnly'] ?? 'false';
        if ($page === null || $limit === null || $limit > 50 || $page > intdiv(PHP_INT_MAX, 50)
            || !in_array($unreadOnly, ['true', 'false'], true)) {
            return $this->error('Page and limit must be positive integers, limit at most 50, and unreadOnly true or false.', 400);
        }
        /** @var User $user */
        $user = $this->getUser();
        $items = $notifications->paginate($user, $page, $limit, $unreadOnly === 'true');
        $total = count($items);
        return $this->json([
            'notifications' => array_map(static fn (Notification $notification) => $notification->toApiArray(), iterator_to_array($items->getIterator(), false)),
            'pagination' => ['page' => $page, 'limit' => $limit, 'totalItems' => $total, 'totalPages' => (int) ceil($total / $limit)],
            'unreadCount' => $notifications->countUnread($user),
        ]);
    }

    #[Route('/{id}/read', name: 'api_notifications_read', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function markRead(int $id, NotificationRepository $notifications, Clock $clock): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $notification = $notifications->findOwned($id, $user);
        if ($notification === null) {
            return $this->error('Notification not found.', 404);
        }
        $notifications->markRead($notification, $clock->now());
        return $this->json(['notification' => $notification->toApiArray()]);
    }

    #[Route('/{id}', name: 'api_notifications_delete', requirements: ['id' => '\d+'], methods: ['DELETE'])]
    public function delete(int $id, NotificationRepository $notifications, EntityManagerInterface $em): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        // Use the same response for missing IDs and someone else's notification.
        $notification = $notifications->findOwned($id, $user);
        if ($notification === null) {
            return $this->error('Notification not found.', 404);
        }
        $em->remove($notification);
        $em->flush();
        return new JsonResponse(null, 204);
    }

    private function positiveInteger(mixed $value): ?int
    {
        if (!is_string($value) || !ctype_digit($value)) { return null; }
        $integer = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        return $integer === false ? null : $integer;
    }

    private function error(string $message, int $status): JsonResponse
    {
        return $this->json(['error' => $message], $status);
    }
}
