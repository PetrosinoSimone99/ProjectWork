<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Service;
use App\Exception\ServiceNotFoundException;
use App\Repository\ServiceRepository;
use App\Service\ServiceRestorer;
use Doctrine\DBAL\Exception\RetryableException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/** Authentication, staff roles and active accounts are checked by the existing security rules. */
final class DeletedServiceController extends AbstractController
{
    public function __construct(private ServiceRepository $services, private ServiceRestorer $restorer) {}

    #[Route('/api/offers/deleted', name: 'api_offers_deleted', methods: ['GET'])]
    public function offers(Request $request): JsonResponse
    {
        return $this->deleted($request, 'offers', Service::TYPE_OFFER, false);
    }

    #[Route('/api/requests/deleted', name: 'api_requests_deleted', methods: ['GET'])]
    public function requests(Request $request): JsonResponse
    {
        return $this->deleted($request, 'requests', Service::TYPE_REQUEST, false);
    }

    #[Route('/api/staff/services/deleted', name: 'api_staff_services_deleted', methods: ['GET'])]
    public function staffServices(Request $request): JsonResponse
    {
        return $this->deleted($request, 'services', null, true);
    }

    #[Route('/api/offers/{id}/restore', name: 'api_offers_restore', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function restoreOffer(int $id, Request $request): JsonResponse
    {
        return $this->restore($id, $request, 'offer', Service::TYPE_OFFER, false);
    }

    #[Route('/api/requests/{id}/restore', name: 'api_requests_restore', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function restoreRequest(int $id, Request $request): JsonResponse
    {
        return $this->restore($id, $request, 'request', Service::TYPE_REQUEST, false);
    }

    #[Route('/api/staff/services/{id}/restore', name: 'api_staff_services_restore', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function restoreStaffService(int $id, Request $request): JsonResponse
    {
        return $this->restore($id, $request, 'service', null, true);
    }

    private function deleted(Request $request, string $key, ?string $type, bool $asStaff): JsonResponse
    {
        $filters = $request->query->all();
        $allowed = $asStaff ? ['page', 'limit', 'userId', 'type'] : ['page', 'limit'];
        if (array_diff(array_keys($filters), $allowed) !== []) {
            return $this->error('The request contains an unknown query parameter.', 400);
        }
        $page = $this->positiveInteger($filters['page'] ?? '1');
        $limit = $this->positiveInteger($filters['limit'] ?? '20');
        if ($page === null || $limit === null || $limit > 50 || $page > intdiv(PHP_INT_MAX, 50)) {
            return $this->error('Page must be a positive integer and limit must be between 1 and 50.', 400);
        }
        $ownerId = $asStaff ? null : $this->getUser()->getId();
        if (array_key_exists('userId', $filters)) {
            $ownerId = $this->positiveInteger($filters['userId']);
            if ($ownerId === null) { return $this->error('userId must be a positive integer.', 400); }
        }
        if (array_key_exists('type', $filters)) {
            if (!in_array($filters['type'], [Service::TYPE_OFFER, Service::TYPE_REQUEST], true)) {
                return $this->error('Type must be OFFER or REQUEST.', 400);
            }
            $type = $filters['type'];
        }
        $items = $this->services->paginateDeleted($page, $limit, $ownerId, $type);
        $total = count($items);
        $data = [];
        foreach ($items as $service) {
            $values = $this->serviceValues($service, $asStaff);
            $values['deletedAt'] = $service->getDeletedAt()->setTimezone(new \DateTimeZone('UTC'))->format(DATE_ATOM);
            $data[] = $values;
        }
        return $this->json([
            $key => $data,
            'pagination' => ['page' => $page, 'limit' => $limit, 'totalItems' => $total, 'totalPages' => (int) ceil($total / $limit)],
        ]);
    }

    private function restore(int $id, Request $request, string $key, ?string $type, bool $asStaff): JsonResponse
    {
        // Decode as an object so [] and null are not mistaken for an empty object.
        if ($request->getContent() !== '') {
            try { $body = json_decode($request->getContent(), false, 512, JSON_THROW_ON_ERROR); }
            catch (\JsonException) { return $this->error('The request body must be an empty JSON object.', 400); }
            if (!$body instanceof \stdClass || get_object_vars($body) !== []) {
                return $this->error('The request body must be an empty JSON object.', 400);
            }
        }
        try {
            $service = $this->restorer->restore($id, $this->getUser(), $type, $asStaff);
        } catch (ServiceNotFoundException $error) {
            return $this->error($error->getMessage(), 404);
        } catch (RetryableException) {
            return $this->error('The service changed during this request. Please try again.', 409);
        }
        return $this->json([$key => $this->serviceValues($service, $asStaff)]);
    }

    private function serviceValues(Service $service, bool $asStaff): array
    {
        $values = $service->toOwnedServiceApiArray();
        if ($asStaff) { $values['owner'] = $service->getUser()->toPublicApiArray(); }
        return $values;
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
