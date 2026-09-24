<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Category;
use App\Entity\Proposal;
use App\Entity\ProposalParticipant;
use App\Entity\Service;
use App\Entity\SwipeDecision;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/** Endpoints for publishing services and completing the direct swipe flow. */
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
        foreach ($categories as $category) {
            $service->addCategory($category);
        }
        $entityManager->persist($service);
        $entityManager->flush();

        return $this->json(['service' => $service->toApiArray()], 201);
    }

    #[Route('/swipes', name: 'api_swipes_feed', methods: ['GET'])]
    public function swipeFeed(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $user = $this->activeUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }
        $limit = filter_var($request->query->get('limit', 20), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 50]]) ?: 20;

        $pending = [];
        foreach ($entityManager->getRepository(ProposalParticipant::class)->findBy(['user' => $user]) as $participant) {
            $proposal = $participant->getProposal();
            if ($proposal->getStatus() === Proposal::STATUS_PENDING && !$participant->isConfirmed()) {
                $pending[] = $this->proposalToApiArray($proposal);
            }
        }
        usort($pending, static fn (array $left, array $right) => $left['createdAt'] <=> $right['createdAt']);

        $candidates = [];
        $ownServices = $entityManager->getRepository(Service::class)->findBy(['user' => $user]);
        $otherServices = $entityManager->getRepository(Service::class)->findBy([], ['id' => 'ASC']);
        foreach ($ownServices as $ownOffer) {
            if ($ownOffer->getType() !== Service::TYPE_OFFER) {
                continue;
            }
            foreach ($ownServices as $ownRequest) {
                if ($ownRequest->getType() !== Service::TYPE_REQUEST) {
                    continue;
                }
                foreach ($otherServices as $candidateOffer) {
                    $candidate = $candidateOffer->getUser();
                    if ($candidate === $user || !$candidate->isActive() || $candidateOffer->getType() !== Service::TYPE_OFFER) {
                        continue;
                    }
                    foreach ($otherServices as $candidateRequest) {
                        if ($candidateRequest->getUser() !== $candidate || $candidateRequest->getType() !== Service::TYPE_REQUEST
                            || !$this->sharesCategory($ownOffer, $candidateRequest) || !$this->sharesCategory($candidateOffer, $ownRequest)
                            || $this->decisionExists($entityManager, $user, $candidate, $ownOffer, $ownRequest, $candidateOffer, $candidateRequest)
                            || $this->proposalExistsForOfferPair($entityManager, $ownOffer, $candidateOffer)) {
                            continue;
                        }
                        $candidates[] = $this->candidateToApiArray($candidate, $ownOffer, $ownRequest, $candidateOffer, $candidateRequest);
                        if (count($candidates) >= $limit) {
                            break 4;
                        }
                    }
                }
            }
        }

        return $this->json(['pendingProposals' => $pending, 'candidates' => $candidates]);
    }

    #[Route('/swipes', name: 'api_swipes_decide', methods: ['POST'])]
    public function decideSwipe(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $actor = $this->activeUser();
        if ($actor instanceof JsonResponse) {
            return $actor;
        }
        $data = $this->readJsonBody($request);
        if (!is_array($data) || !in_array($data['direction'] ?? null, [SwipeDecision::DIRECTION_LEFT, SwipeDecision::DIRECTION_RIGHT], true)) {
            return $this->error('A swipe direction of LEFT or RIGHT is required.', 400);
        }
        $ids = ['actorOfferServiceId', 'actorRequestServiceId', 'candidateOfferServiceId', 'candidateRequestServiceId'];
        foreach ($ids as $id) {
            if (!isset($data[$id]) || (!is_int($data[$id]) && !ctype_digit((string) $data[$id]))) {
                return $this->error('All four service IDs are required.', 400);
            }
        }
        $actorOffer = $entityManager->find(Service::class, (int) $data['actorOfferServiceId']);
        $actorRequest = $entityManager->find(Service::class, (int) $data['actorRequestServiceId']);
        $candidateOffer = $entityManager->find(Service::class, (int) $data['candidateOfferServiceId']);
        $candidateRequest = $entityManager->find(Service::class, (int) $data['candidateRequestServiceId']);
        if (!$actorOffer || !$actorRequest || !$candidateOffer || !$candidateRequest) {
            return $this->error('One or more services do not exist.', 404);
        }
        $candidate = $candidateOffer->getUser();
        if ($actorOffer->getUser() !== $actor || $actorRequest->getUser() !== $actor || $candidateRequest->getUser() !== $candidate
            || $candidate === $actor || !$candidate->isActive() || $actorOffer->getType() !== Service::TYPE_OFFER
            || $actorRequest->getType() !== Service::TYPE_REQUEST || $candidateOffer->getType() !== Service::TYPE_OFFER
            || $candidateRequest->getType() !== Service::TYPE_REQUEST || !$this->sharesCategory($actorOffer, $candidateRequest)
            || !$this->sharesCategory($candidateOffer, $actorRequest)) {
            return $this->error('The services do not form a valid reciprocal candidate.', 400);
        }

        $existing = $entityManager->getRepository(SwipeDecision::class)->findOneBy([
            'actor' => $actor, 'candidate' => $candidate, 'actorOffer' => $actorOffer, 'actorRequest' => $actorRequest,
            'candidateOffer' => $candidateOffer, 'candidateRequest' => $candidateRequest,
        ]);
        if ($existing !== null) {
            if ($existing->getDirection() !== $data['direction']) {
                return $this->error('This candidate combination already has a different decision.', 409);
            }
            return $this->swipeResponse($existing, 200);
        }
        if ($data['direction'] === SwipeDecision::DIRECTION_RIGHT && $entityManager->getRepository(Proposal::class)->findOneBy(['offerPairKey' => $this->offerPairKey($actorOffer, $candidateOffer)]) !== null) {
            return $this->error('A proposal already exists for these offered services.', 409);
        }

        // The decision and proposal are written together so a failed request cannot leave a partial match behind.
        $decision = new SwipeDecision($actor, $candidate, $actorOffer, $actorRequest, $candidateOffer, $candidateRequest, $data['direction']);
        $entityManager->wrapInTransaction(function () use ($entityManager, $decision, $data, $actor, $candidate, $actorOffer, $candidateOffer): void {
            if ($data['direction'] === SwipeDecision::DIRECTION_RIGHT) {
                $proposal = new Proposal($this->offerPairKey($actorOffer, $candidateOffer));
                $proposal->addParticipant(new ProposalParticipant($proposal, $actor, $actorOffer, true));
                $proposal->addParticipant(new ProposalParticipant($proposal, $candidate, $candidateOffer));
                $decision->setProposal($proposal);
                $entityManager->persist($proposal);
            }
            $entityManager->persist($decision);
            $entityManager->flush();
        });

        return $this->swipeResponse($decision, 201);
    }

    #[Route('/proposals/{id}/decision', name: 'api_proposals_decide', methods: ['POST'])]
    public function decideProposal(int $id, Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $user = $this->activeUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }
        $proposal = $entityManager->find(Proposal::class, $id);
        if ($proposal === null) {
            return $this->error('The proposal does not exist.', 404);
        }
        $data = $this->readJsonBody($request);
        if (!is_array($data) || !in_array($data['decision'] ?? null, ['ACCEPT', 'REJECT'], true)) {
            return $this->error('A decision of ACCEPT or REJECT is required.', 400);
        }
        if ($proposal->getStatus() !== Proposal::STATUS_PENDING) {
            return $this->error('This proposal already has a final decision.', 409);
        }
        $participant = null;
        foreach ($proposal->getParticipants() as $item) {
            if ($item->getUser() === $user) {
                $participant = $item;
                break;
            }
        }
        if ($participant === null || $participant->isConfirmed()) {
            return $this->error('Only the participant awaiting confirmation may decide.', 403);
        }

        if ($data['decision'] === 'ACCEPT') {
            $participant->confirm();
            $proposal->setStatus(Proposal::STATUS_ACCEPTED);
        } else {
            $proposal->setStatus(Proposal::STATUS_REJECTED);
        }
        $entityManager->flush();

        return $this->json(['proposal' => $this->proposalToApiArray($proposal), 'matched' => $proposal->getStatus() === Proposal::STATUS_ACCEPTED]);
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

    private function sharesCategory(Service $first, Service $second): bool
    {
        $firstIds = array_map(static fn (Category $category) => $category->getId(), $first->getCategories()->toArray());
        foreach ($second->getCategories() as $category) {
            if (in_array($category->getId(), $firstIds, true)) {
                return true;
            }
        }
        return false;
    }

    private function decisionExists(EntityManagerInterface $entityManager, User $actor, User $candidate, Service $actorOffer, Service $actorRequest, Service $candidateOffer, Service $candidateRequest): bool
    {
        return $entityManager->getRepository(SwipeDecision::class)->findOneBy([
            'actor' => $actor, 'candidate' => $candidate, 'actorOffer' => $actorOffer, 'actorRequest' => $actorRequest,
            'candidateOffer' => $candidateOffer, 'candidateRequest' => $candidateRequest,
        ]) !== null;
    }

    private function proposalExistsForOfferPair(EntityManagerInterface $entityManager, Service $first, Service $second): bool
    {
        return $entityManager->getRepository(Proposal::class)->findOneBy(['offerPairKey' => $this->offerPairKey($first, $second)]) !== null;
    }

    private function offerPairKey(Service $first, Service $second): string
    {
        $ids = [$first->getId(), $second->getId()];
        sort($ids, SORT_NUMERIC);
        return $ids[0].':'.$ids[1];
    }

    /** @return array<string, mixed> */
    private function candidateToApiArray(User $candidate, Service $actorOffer, Service $actorRequest, Service $candidateOffer, Service $candidateRequest): array
    {
        return ['candidate' => $candidate->toApiArray(), 'actorOfferService' => $actorOffer->toApiArray(), 'actorRequestService' => $actorRequest->toApiArray(), 'candidateOfferService' => $candidateOffer->toApiArray(), 'candidateRequestService' => $candidateRequest->toApiArray()];
    }

    /** @return array<string, mixed> */
    private function proposalToApiArray(Proposal $proposal): array
    {
        $participants = [];
        foreach ($proposal->getParticipants() as $participant) {
            $participants[] = ['user' => $participant->getUser()->toApiArray(), 'service' => $participant->getService()->toApiArray(), 'confirmed' => $participant->isConfirmed()];
        }
        return ['id' => $proposal->getId(), 'status' => $proposal->getStatus(), 'createdAt' => $proposal->getCreatedAt()->format(DATE_ATOM), 'participants' => $participants];
    }

    private function swipeResponse(SwipeDecision $decision, int $status): JsonResponse
    {
        return $this->json(['direction' => $decision->getDirection(), 'proposalId' => $decision->getProposal()?->getId()], $status);
    }

    private function error(string $message, int $status): JsonResponse { return $this->json(['error' => $message], $status); }
}
