<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;

/** Lets an authenticated user view and update their own profile. */
#[Route('/api/profile')]
class ProfileController extends AbstractController
{
    private const EDITABLE_FIELDS = ['name', 'surname', 'location', 'bio', 'profileImageUrl'];

    #[Route('', name: 'api_profile_read', methods: ['GET'])]
    public function read(): JsonResponse
    {
        $user = $this->activeUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        return $this->json(['profile' => $user->toProfileApiArray()]);
    }

    #[Route('', name: 'api_profile_update', methods: ['PATCH'])]
    public function update(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $user = $this->activeUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        try {
            $data = $request->toArray();
        } catch (\JsonException|BadRequestHttpException) {
            return $this->error('The request body must contain valid JSON.', 400);
        }

        if ($data === []) {
            return $this->error('At least one profile field must be provided.', 400);
        }

        foreach (array_keys($data) as $field) {
            if (!in_array($field, self::EDITABLE_FIELDS, true)) {
                return $this->error('The request contains an unknown or non-editable profile field.', 400);
            }
        }

        // Validate every supplied value first, so invalid input never leaves a partly updated profile.
        $validated = [];
        foreach ($data as $field => $value) {
            $result = $this->validateField($field, $value);
            if ($result instanceof JsonResponse) {
                return $result;
            }
            $validated[$field] = $result;
        }

        foreach ($validated as $field => $value) {
            switch ($field) {
                case 'name':
                    $user->setName($value);
                    break;
                case 'surname':
                    $user->setSurname($value);
                    break;
                case 'location':
                    $user->setLocation($value);
                    break;
                case 'bio':
                    $user->setBio($value);
                    break;
                case 'profileImageUrl':
                    $user->setProfileImageUrl($value);
                    break;
            }
        }

        $entityManager->flush();

        return $this->json(['profile' => $user->toProfileApiArray()]);
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

    private function validateField(string $field, mixed $value): string|null|JsonResponse
    {
        if ($field === 'location' || $field === 'bio' || $field === 'profileImageUrl') {
            if ($value === null) {
                return null;
            }
            if (!is_string($value)) {
                return $this->error(ucfirst($field).' must be a string or null.', 400);
            }
        } elseif (!is_string($value)) {
            return $this->error(ucfirst($field).' must be a string.', 400);
        }

        if ($field === 'name' || $field === 'surname') {
            $value = trim($value);
            if ($value === '' || mb_strlen($value) > 50) {
                return $this->error(ucfirst($field).' must contain between 1 and 50 characters.', 400);
            }
        } elseif ($field === 'location') {
            $value = trim($value);
            if ($value === '' || mb_strlen($value) > 255) {
                return $this->error('Location must contain between 1 and 255 characters, or be null.', 400);
            }
        } elseif ($field === 'bio') {
            if (mb_strlen($value) > 1000) {
                return $this->error('Bio must not be longer than 1000 characters.', 400);
            }
        } elseif ($field === 'profileImageUrl') {
            if (mb_strlen($value) > 2048 || filter_var($value, FILTER_VALIDATE_URL) === false
                || strtolower((string) parse_url($value, PHP_URL_SCHEME)) !== 'https') {
                return $this->error('Profile image URL must be a valid HTTPS URL no longer than 2048 characters.', 400);
            }
        }

        return $value;
    }

    private function error(string $message, int $status): JsonResponse
    {
        return $this->json(['error' => $message], $status);
    }
}
