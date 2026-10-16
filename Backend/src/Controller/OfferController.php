<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Category;
use App\Entity\Service;
use App\Entity\User;
use App\Repository\ChainRepository;
use App\Repository\ServiceRepository;
use App\Service\ChainError;
use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;
use Doctrine\DBAL\Exception\RetryableException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/** Lets a user manage only their own published offers. */
#[Route('/api/offers')]
final class OfferController extends AbstractController
{
    #[Route('/mine', name: 'api_offers_mine', methods: ['GET'])]
    public function mine(ServiceRepository $services): JsonResponse
    {
        $user = $this->activeUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        return $this->json(['offers' => array_map(
            static fn (Service $service) => $service->toOwnedServiceApiArray(),
            $services->findOwnedOffers($user),
        )]);
    }

    #[Route('/{id}', name: 'api_offers_update', requirements: ['id' => '\\d+'], methods: ['PATCH'])]
    public function update(int $id, Request $request, EntityManagerInterface $entityManager, ServiceRepository $services, ChainRepository $chains): JsonResponse
    {
        $user = $this->activeUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $offer = $services->findOneBy(['id' => $id, 'user' => $user, 'type' => Service::TYPE_OFFER, 'deletedAt' => null]);
        if ($offer === null) {
            return $this->error('The offer does not exist.', 404);
        }

        try {
            $data = $request->toArray();
        } catch (\JsonException|\Symfony\Component\HttpKernel\Exception\BadRequestHttpException) {
            return $this->error('The request body must contain valid JSON.', 400);
        }
        if ($data === [] || array_diff(array_keys($data), ['description', 'categoryIds', 'isRemote', 'isSuspended', 'location']) !== []) {
            return $this->error('Provide a description, category IDs, isRemote, isSuspended, or location.', 400);
        }

        if (array_key_exists('isRemote', $data) && !is_bool($data['isRemote'])) {
            return $this->error('isRemote must be a boolean.', 400);
        }
        // Null means omitted here; an explicit false must still be saved.
        $isRemote = $data['isRemote'] ?? null;

        if (array_key_exists('isSuspended', $data) && !is_bool($data['isSuspended'])) {
            return $this->error('isSuspended must be a boolean.', 400);
        }
        $isSuspended = $data['isSuspended'] ?? null;

        // Keep presence separate from value: null explicitly clears the location.
        $hasLocation = array_key_exists('location', $data);
        $location = $data['location'] ?? null;
        if ($location !== null && (!is_string($location) || mb_strlen(trim($location)) > 255)) {
            return $this->error('Location must be text of at most 255 characters or null.', 400);
        }

        $description = null;
        if (array_key_exists('description', $data)) {
            if (!is_string($data['description'])) {
                return $this->error('Description must be text.', 400);
            }
            $description = trim($data['description']);
            if ($description === '' || mb_strlen($description) > 255) {
                return $this->error('Description must contain between 1 and 255 characters.', 400);
            }
        }

        $categories = null;
        if (array_key_exists('categoryIds', $data)) {
            $categoryIds = $data['categoryIds'];
            if (!is_array($categoryIds) || !array_is_list($categoryIds) || $categoryIds === []) {
                return $this->error('Category IDs must be a non-empty list of unique positive integers.', 400);
            }
            foreach ($categoryIds as $categoryId) {
                if ((!is_int($categoryId) && !(is_string($categoryId) && ctype_digit($categoryId))) || (int) $categoryId < 1) {
                    return $this->error('Category IDs must be a non-empty list of unique positive integers.', 400);
                }
            }
            $categoryIds = array_map('intval', $categoryIds);
            if (count(array_unique($categoryIds)) !== count($categoryIds)) {
                return $this->error('Category IDs must be unique.', 400);
            }
            $categories = $entityManager->getRepository(Category::class)->findBy(['id' => $categoryIds]);
            if (count($categories) !== count($categoryIds)) {
                return $this->error('One or more categories do not exist.', 404);
            }
        }

        try {
            $entityManager->getConnection()->transactional(function () use ($id, $offer, $description, $categories, $isRemote, $isSuspended, $hasLocation, $location, $entityManager, $services, $chains): void {
                // The same row lock is used by proposal and chain creation, so they cannot race this edit.
                $chains->lockServices([$id]);
                // Another request may have deleted this row while we waited for the lock.
                if (!$chains->serviceNotDeleted($id, true)) {
                    throw new ChainError('The offer does not exist.', 404);
                }
                if ($services->isInUse($id)) {
                    throw new OfferInUseException();
                }
                // Reload after the lock so concurrent changes are reflected in this partial update.
                $entityManager->refresh($offer);
                if ($hasLocation) {
                    $offer->setLocation($location);
                }
                if ($description !== null) {
                    $offer->setDescription($description);
                }
                if ($isRemote !== null) {
                    $offer->setIsRemote($isRemote);
                }
                if ($isSuspended !== null) {
                    $offer->setIsSuspended($isSuspended);
                }
                if ($categories !== null) {
                    $offer->clearCategories();
                    foreach ($categories as $category) {
                        $offer->addCategory($category);
                    }
                }
                $entityManager->flush();
            });
        } catch (ChainError $error) {
            return $this->error($error->getMessage(), $error->status);
        } catch (OfferInUseException) {
            return $this->error('This offer is already connected to a proposal or exchange.', 409);
        } catch (RetryableException|ForeignKeyConstraintViolationException) {
            return $this->error('The offer changed during this request. Please try again.', 409);
        }

        return $this->json(['offer' => $offer->toOwnedServiceApiArray()]);
    }

    #[Route('/{id}', name: 'api_offers_delete', requirements: ['id' => '\\d+'], methods: ['DELETE'])]
    public function delete(int $id, EntityManagerInterface $entityManager, ServiceRepository $services, ChainRepository $chains): JsonResponse
    {
        $user = $this->activeUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }
        $offer = $services->findOneBy(['id' => $id, 'user' => $user, 'type' => Service::TYPE_OFFER, 'deletedAt' => null]);
        if ($offer === null) {
            return $this->error('The offer does not exist.', 404);
        }

        try {
            $entityManager->getConnection()->transactional(function () use ($id, $offer, $entityManager, $services, $chains): void {
                // Lock the service before checking references or removing it.
                $chains->lockServices([$id]);
                // Another request may have deleted this row while we waited for the lock.
                if (!$chains->serviceNotDeleted($id, true)) {
                    throw new ChainError('The offer does not exist.', 404);
                }
                if ($services->isInUse($id)) {
                    throw new OfferInUseException();
                }
                // Save a deletion date instead of removing the row and its related data.
                $offer->markDeleted();
                $entityManager->flush();
            });
        } catch (ChainError $error) {
            return $this->error($error->getMessage(), $error->status);
        } catch (OfferInUseException) {
            return $this->error('This offer is already connected to a proposal or exchange.', 409);
        } catch (RetryableException|ForeignKeyConstraintViolationException) {
            return $this->error('The offer changed during this request. Please try again.', 409);
        }

        return new JsonResponse(null, 204);
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

    private function error(string $message, int $status): JsonResponse
    {
        return $this->json(['error' => $message], $status);
    }
}

/** Signals that an offer has a proposal or exchange reference. */
final class OfferInUseException extends \RuntimeException {}
