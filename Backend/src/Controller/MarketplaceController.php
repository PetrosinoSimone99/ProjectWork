<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Category;
use App\Entity\Service;
use App\Entity\User;
use App\Repository\ServiceRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\Pagination\Paginator;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/** Endpoints for categories, the catalog and service publishing. */
#[Route('/api')]
class MarketplaceController extends AbstractController
{
    #[Route('/categories', name: 'api_categories_list', methods: ['GET'])]
    public function listCategories(EntityManagerInterface $entityManager): JsonResponse
    {
        return $this->json(['categories' => array_map(
            static fn (Category $category) => $category->toApiArray(),
            $entityManager->getRepository(Category::class)->findBy([], ['description' => 'ASC']),
        )]);
    }

    #[Route('/services', name: 'api_services_list', methods: ['GET'])]
    public function listServices(Request $request, ServiceRepository $serviceRepository): JsonResponse
    {
        $viewer = $this->activeUser();
        if ($viewer instanceof JsonResponse) {
            return $viewer;
        }

        $filters = $this->readHomepageFilters($request);
        if ($filters instanceof JsonResponse) {
            return $filters;
        }

        $offers = $serviceRepository->paginateHomepageOffers(
            $viewer,
            $filters['searchText'],
            $filters['categoryIds'],
            $filters['location'],
            $filters['sort'],
            $filters['page'],
            $filters['limit'],
        );

        return $this->homepageResponse($offers, $filters['page'], $filters['limit']);
    }

    #[Route('/services', name: 'api_services_create', methods: ['POST'])]
    public function createService(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $user = $this->activeUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }
        $data = $this->readJsonBody($request);
        $type = is_array($data) ? $data['type'] ?? null : null;
        $description = is_array($data) ? $data['description'] ?? null : null;
        $categoryIds = is_array($data) ? $data['categoryIds'] ?? null : null;

        if (!is_string($type) || !in_array($type, [Service::TYPE_OFFER, Service::TYPE_REQUEST], true)
            || !is_string($description) || ($description = trim($description)) === '' || mb_strlen($description) > 255
            || !is_array($categoryIds) || $categoryIds === [] || count($categoryIds) !== count(array_unique($categoryIds, SORT_REGULAR))) {
            return $this->error('Type, description, and one or more unique category IDs are required.', 400);
        }

        if (array_key_exists('isRemote', $data) && !is_bool($data['isRemote'])) {
            return $this->error('isRemote must be a boolean.', 400);
        }
        if (array_key_exists('isSuspended', $data) && !is_bool($data['isSuspended'])) {
            return $this->error('isSuspended must be a boolean.', 400);
        }

        $location = $data['location'] ?? null;
        if ($location !== null && (!is_string($location) || mb_strlen(trim($location)) > 255)) {
            return $this->error('Location must be text of at most 255 characters or null.', 400);
        }

        $categories = [];
        foreach ($categoryIds as $categoryId) {
            if (!is_int($categoryId) && !ctype_digit((string) $categoryId)) {
                return $this->error('Every category ID must be an integer.', 400);
            }
            $category = $entityManager->find(Category::class, (int) $categoryId);
            if ($category === null) {
                return $this->error('One or more categories do not exist.', 404);
            }
            $categories[] = $category;
        }

        $service = new Service($user, $type, $description);
        $service->setLocation($location);
        $service->setIsRemote($data['isRemote'] ?? false);
        $service->setIsSuspended($data['isSuspended'] ?? false);
        foreach ($categories as $category) {
            $service->addCategory($category);
        }
        $entityManager->persist($service);
        $entityManager->flush();

        return $this->json(['service' => $service->toApiArray()], 201);
    }

    private function activeUser(): User|JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->error('Authentication is required.', 401);
        }
        if (!$user->isActive()) {
            return $this->error('This account is inactive.', 403);
        }
        return $user;
    }

    private function readJsonBody(Request $request): ?array
    {
        try { return $request->toArray(); } catch (\JsonException) { return null; }
    }

    /**
     * Reads and validates the query string before it reaches the repository.
     *
     * Query parameters arrive as strings, so validating them here prevents an
     * invalid value from silently changing the meaning of a catalog request.
     *
     * @return array{searchText: string|null, categoryIds: list<int>, location: string|null, sort: 'newest'|'oldest', page: int, limit: int}|JsonResponse
     */
    private function readHomepageFilters(Request $request): array|JsonResponse
    {
        $parameters = $request->query->all();
        $searchText = $this->readOptionalTextFilter($parameters, 'q');
        if ($searchText instanceof JsonResponse) {
            return $searchText;
        }
        $location = $this->readOptionalTextFilter($parameters, 'location');
        if ($location instanceof JsonResponse) {
            return $location;
        }

        $sort = $parameters['sort'] ?? 'newest';
        if (!is_string($sort) || !in_array($sort, ['newest', 'oldest'], true)) {
            return $this->error('Sort must be either newest or oldest.', 400);
        }

        $page = $this->readPositiveInteger($parameters, 'page', 1, PHP_INT_MAX);
        if ($page instanceof JsonResponse) {
            return $page;
        }
        $limit = $this->readPositiveInteger($parameters, 'limit', 20, 50);
        if ($limit instanceof JsonResponse) {
            return $limit;
        }
        $categoryIds = $this->readCategoryIds($parameters);
        if ($categoryIds instanceof JsonResponse) {
            return $categoryIds;
        }

        return [
            'searchText' => $searchText,
            'categoryIds' => $categoryIds,
            'location' => $location,
            'sort' => $sort,
            'page' => $page,
            'limit' => $limit,
        ];
    }

    /** @param array<string, mixed> $parameters */
    private function readOptionalTextFilter(array $parameters, string $name): string|JsonResponse|null
    {
        if (!array_key_exists($name, $parameters)) {
            return null;
        }
        if (!is_string($parameters[$name])) {
            return $this->error(ucfirst($name).' must be a text value.', 400);
        }
        $value = trim($parameters[$name]);
        if (mb_strlen($value) > 255) {
            return $this->error(ucfirst($name).' must not be longer than 255 characters.', 400);
        }
        return $value === '' ? null : $value;
    }

    /** @param array<string, mixed> $parameters */
    private function readPositiveInteger(array $parameters, string $name, int $default, int $maximum): int|JsonResponse
    {
        if (!array_key_exists($name, $parameters)) {
            return $default;
        }
        $value = $parameters[$name];
        if (!is_string($value) || !ctype_digit($value) || (int) $value < 1 || (int) $value > $maximum) {
            return $this->error(ucfirst($name).' must be an integer between 1 and '.$maximum.'.', 400);
        }
        return (int) $value;
    }

    /** @param array<string, mixed> $parameters */
    private function readCategoryIds(array $parameters): array|JsonResponse
    {
        if (!array_key_exists('categoryIds', $parameters)) {
            return [];
        }
        $value = $parameters['categoryIds'];
        if (!is_string($value) || $value === '') {
            return $this->error('Category IDs must be a comma-separated list of positive integers.', 400);
        }

        $ids = [];
        foreach (explode(',', $value) as $id) {
            if (!ctype_digit($id) || (int) $id < 1) {
                return $this->error('Category IDs must be a comma-separated list of positive integers.', 400);
            }
            $ids[] = (int) $id;
        }

        return array_values(array_unique($ids));
    }

    /** @param Paginator<Service> $offers */
    private function homepageResponse(Paginator $offers, int $page, int $limit): JsonResponse
    {
        $totalItems = count($offers);
        return $this->json([
            'offers' => array_map(
                static fn (Service $service) => $service->toHomepageOfferApiArray(),
                iterator_to_array($offers),
            ),
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'totalItems' => $totalItems,
                'totalPages' => $totalItems === 0 ? 0 : (int) ceil($totalItems / $limit),
            ],
        ]);
    }

    private function error(string $message, int $status): JsonResponse { return $this->json(['error' => $message], $status); }
}
