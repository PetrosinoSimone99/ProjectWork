<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Category;
use App\Entity\Service;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/auth')]
class AuthController extends AbstractController
{
    #[Route('/register', name: 'api_auth_register', methods: ['POST'])]
    public function register(Request $request, UserRepository $users, EntityManagerInterface $entityManager, UserPasswordHasherInterface $passwordHasher, JWTTokenManagerInterface $jwtManager): JsonResponse
    {
        $data = $this->readJsonBody($request);
        if ($data === null) {
            return $this->error('The request body must contain valid JSON.', 400);
        }

        $fields = $this->validateRegistration($data);
        if ($fields === null) {
            return $this->error('Required user and service fields are missing or invalid.', 400);
        }

        if ($users->findOneByUsernameOrEmail($fields['username'], $fields['email']) !== null) {
            return $this->error('The username or email address is already in use.', 409);
        }

        $categoriesById = [];
        $categoriesByName = [];
        foreach ($entityManager->getRepository(Category::class)->findAll() as $category) {
            $categoriesById[$category->getId()] = $category;
            $categoriesByName[mb_strtolower($category->getDescription())] = $category;
        }

        $newCategories = [];
        $offersData = $this->resolveServices($fields['offers'], $categoriesById, $categoriesByName, $newCategories);
        $requestsData = $this->resolveServices($fields['requests'], $categoriesById, $categoriesByName, $newCategories);
        if ($offersData === null || $requestsData === null) {
            return $this->error('One or more category IDs do not exist.', 404);
        }
        if ($offersData === false || $requestsData === false) {
            return $this->error('A service cannot contain the same category more than once.', 400);
        }

        // Public registration always creates an active regular user. Clients cannot choose roles.
        $user = new User($fields['name'], $fields['surname'], $fields['username'], $fields['email']);
        $user->setLocation($fields['location']);
        $user->setPassword($passwordHasher->hashPassword($user, $fields['password']));

        $offers = $this->createServices($user, $offersData, Service::TYPE_OFFER);
        $requests = $this->createServices($user, $requestsData, Service::TYPE_REQUEST);

        // Save the user and all of their services together, so they are all created or none are.
        $entityManager->wrapInTransaction(static function (EntityManagerInterface $entityManager) use ($user, $offers, $requests, $newCategories): void {
            $entityManager->persist($user);
            foreach ($newCategories as $category) {
                $entityManager->persist($category);
            }
            foreach ([...$offers, ...$requests] as $service) {
                $entityManager->persist($service);
            }
        });

        return $this->json([
            'token' => $jwtManager->create($user),
            'user' => $user->toApiArray(),
            'offers' => array_map(static fn (Service $service) => $service->toApiArray(), $offers),
            'requests' => array_map(static fn (Service $service) => $service->toApiArray(), $requests),
        ], 201);
    }

    #[Route('/login', name: 'api_auth_login', methods: ['POST'])]
    public function login(Request $request, UserRepository $users, UserPasswordHasherInterface $passwordHasher, JWTTokenManagerInterface $jwtManager): JsonResponse
    {
        $data = $this->readJsonBody($request);
        if ($data === null || !is_string($data['username'] ?? null) || !is_string($data['password'] ?? null)) {
            return $this->error('Username and password are required.', 400);
        }

        $user = $users->findOneBy(['username' => trim($data['username'])]);
        if ($user === null || !$passwordHasher->isPasswordValid($user, $data['password'])) {
            // A generic response avoids revealing whether a username exists.
            return $this->error('Invalid username or password.', 401);
        }

        if (!$user->isActive()) {
            return $this->error('This account is inactive.', 403);
        }

        return $this->json(['token' => $jwtManager->create($user), 'user' => $user->toApiArray()]);
    }

    private function readJsonBody(Request $request): ?array
    {
        try {
            return $request->toArray();
        } catch (\JsonException) {
            return null;
        }
    }

    /** @return array{name: string, surname: string, username: string, email: string, password: string, location: string, offers: list<array{description: string, categoryIds: list<int>, categories: list<string>}>, requests: list<array{description: string, categoryIds: list<int>, categories: list<string>}>}|null */
    private function validateRegistration(array $data): ?array
    {
        $name = trim((string) ($data['name'] ?? ''));
        $surname = trim((string) ($data['surname'] ?? ''));
        $username = trim((string) ($data['username'] ?? ''));
        $email = trim((string) ($data['email'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        $location = is_string($data['location'] ?? null) ? trim($data['location']) : '';
        $offers = $this->validateServices($data['offers'] ?? null);
        $requests = $this->validateServices($data['requests'] ?? null);

        if ($name === '' || $surname === '' || $username === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)
            || strlen($password) < 8 || mb_strlen($name) > 50 || mb_strlen($surname) > 50
            || mb_strlen($username) > 30 || mb_strlen($email) > 180 || $location === ''
            || mb_strlen($location) > 255 || $offers === null || $requests === null) {
            return null;
        }

        return compact('name', 'surname', 'username', 'email', 'password', 'location', 'offers', 'requests');
    }

    /** @return list<array{description: string, categoryIds: list<int>, categories: list<string>}>|null */
    private function validateServices(mixed $services): ?array
    {
        if (!is_array($services) || !array_is_list($services) || $services === []) {
            return null;
        }

        $validatedServices = [];
        foreach ($services as $service) {
            if (!is_array($service) || !is_string($service['description'] ?? null)
                || (array_key_exists('categoryIds', $service) && (!is_array($service['categoryIds']) || !array_is_list($service['categoryIds'])))
                || (array_key_exists('categories', $service) && (!is_array($service['categories']) || !array_is_list($service['categories'])))) {
                return null;
            }

            $description = trim($service['description']);
            if ($description === '' || mb_strlen($description) > 255) {
                return null;
            }

            $categoryIds = [];
            foreach ($service['categoryIds'] ?? [] as $categoryId) {
                if ((!is_int($categoryId) && (!is_string($categoryId) || !ctype_digit($categoryId))) || (int) $categoryId < 1) {
                    return null;
                }
                $categoryIds[] = (int) $categoryId;
            }

            if (count($categoryIds) !== count(array_unique($categoryIds))) {
                return null;
            }

            $categoryNames = [];
            $normalizedNames = [];
            foreach ($service['categories'] ?? [] as $categoryName) {
                if (!is_string($categoryName)) {
                    return null;
                }
                $categoryName = trim($categoryName);
                if ($categoryName === '' || mb_strlen($categoryName) > 255) {
                    return null;
                }
                $normalizedName = mb_strtolower($categoryName);
                if (isset($normalizedNames[$normalizedName])) {
                    return null;
                }
                $normalizedNames[$normalizedName] = true;
                $categoryNames[] = $categoryName;
            }

            if ($categoryIds === [] && $categoryNames === []) {
                return null;
            }

            $validatedServices[] = ['description' => $description, 'categoryIds' => $categoryIds, 'categories' => $categoryNames];
        }

        return $validatedServices;
    }

    /**
     * Finds existing categories by ID or name and creates missing names in memory.
     *
     * @param list<array{description: string, categoryIds: list<int>, categories: list<string>}> $serviceData
     * @param array<int, Category> $categoriesById
     * @param array<string, Category> $categoriesByName
     * @param array<string, Category> $newCategories
     * @return list<array{description: string, categories: list<Category>}>|false|null
     */
    private function resolveServices(array $serviceData, array &$categoriesById, array &$categoriesByName, array &$newCategories): array|false|null
    {
        $resolvedServices = [];
        foreach ($serviceData as $item) {
            $categories = [];
            $seenCategoryKeys = [];

            foreach ($item['categoryIds'] as $categoryId) {
                $category = $categoriesById[$categoryId] ?? null;
                if ($category === null) {
                    return null;
                }
                $key = 'id:'.$category->getId();
                if (isset($seenCategoryKeys[$key])) {
                    return false;
                }
                $seenCategoryKeys[$key] = true;
                $categories[] = $category;
            }

            foreach ($item['categories'] as $categoryName) {
                $normalizedName = mb_strtolower($categoryName);
                $category = $categoriesByName[$normalizedName] ?? null;
                if ($category === null) {
                    $category = new Category($categoryName);
                    $categoriesByName[$normalizedName] = $category;
                    $newCategories[$normalizedName] = $category;
                }

                $key = $category->getId() === null
                    ? 'name:'.$normalizedName
                    : 'id:'.$category->getId();
                if (isset($seenCategoryKeys[$key])) {
                    return false;
                }
                $seenCategoryKeys[$key] = true;
                $categories[] = $category;
            }

            $resolvedServices[] = ['description' => $item['description'], 'categories' => $categories];
        }

        return $resolvedServices;
    }

    /** @param list<array{description: string, categories: list<Category>}> $serviceData @return list<Service> */
    private function createServices(User $user, array $serviceData, string $type): array
    {
        $services = [];
        foreach ($serviceData as $item) {
            $service = new Service($user, $type, $item['description']);
            foreach ($item['categories'] as $category) {
                $service->addCategory($category);
            }
            $services[] = $service;
        }

        return $services;
    }

    private function error(string $message, int $status): JsonResponse
    {
        return $this->json(['error' => $message], $status);
    }
}
