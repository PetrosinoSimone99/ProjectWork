<?php

declare(strict_types=1);

namespace App\Controller;

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
            return $this->error('Name, surname, username, email, and a password of at least 8 characters are required.', 400);
        }

        if ($users->findOneByUsernameOrEmail($fields['username'], $fields['email']) !== null) {
            return $this->error('The username or email address is already in use.', 409);
        }

        // Public registration always creates an active regular user. Clients cannot choose roles.
        $user = new User($fields['name'], $fields['surname'], $fields['username'], $fields['email']);
        $user->setPassword($passwordHasher->hashPassword($user, $fields['password']));
        $entityManager->persist($user);
        $entityManager->flush();

        return $this->json(['token' => $jwtManager->create($user), 'user' => $user->toApiArray()], 201);
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

    /** @return array{name: string, surname: string, username: string, email: string, password: string}|null */
    private function validateRegistration(array $data): ?array
    {
        $name = trim((string) ($data['name'] ?? ''));
        $surname = trim((string) ($data['surname'] ?? ''));
        $username = trim((string) ($data['username'] ?? ''));
        $email = trim((string) ($data['email'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if ($name === '' || $surname === '' || $username === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8 || mb_strlen($name) > 50 || mb_strlen($surname) > 50 || mb_strlen($username) > 30 || mb_strlen($email) > 180) {
            return null;
        }

        return compact('name', 'surname', 'username', 'email', 'password');
    }

    private function error(string $message, int $status): JsonResponse
    {
        return $this->json(['error' => $message], $status);
    }
}
