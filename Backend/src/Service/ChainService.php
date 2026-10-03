<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Service;
use App\Entity\User;
use App\Repository\ChainRepository;
use Doctrine\ORM\EntityManagerInterface;

/** Coordinates state transitions. Every write is protected by the locked chain row. */
final class ChainService
{
    public function __construct(private ChainRepository $repository, private ChainMatcher $matcher, private EntityManagerInterface $em, private ChainClock $clock) {}

    public function start(User $actor, int $offerId, int $requestId): array
    {
        $offer = $this->ownedService($actor, $offerId, Service::TYPE_OFFER);
        $request = $this->ownedService($actor, $requestId, Service::TYPE_REQUEST);
        $key = $actor->getId().':'.$offerId.':'.$requestId;
        $id = $this->repository->transaction(function () use ($actor, $offer, $request, $key): int {
            $this->repository->lockServices([$offer->getId(), $request->getId()]);
            $existing = $this->repository->activeSearch($key);
            if ($existing !== null) {
                return $existing;
            }
            if ($this->repository->reserved($offer->getId(), true) || $this->repository->reserved($request->getId(), true)) {
                throw new ChainError('The selected services are reserved by another chain.');
            }
            if ($this->matcher->directAvailable($offer, $request, true)) {
                throw new ChainError('A direct candidate or active direct proposal is available.');
            }
            $now = $this->clock->now();
            return $this->repository->add('proposal_groups', [
                'initiator_id' => $actor->getId(), 'offered_service_id' => $offer->getId(), 'requested_service_id' => $request->getId(),
                'current_offered_service' => $offer->getId(), 'last_requested_service' => $request->getId(),
                'application_status' => 'SEARCHING', 'status' => 'IN_ATTESA', 'creation_date' => $this->date($now),
                'search_deadline' => $this->date($now->modify('+3 hours')), 'next_search_at' => $this->date($now), 'active_search_key' => $key,
            ]);
        });
        $this->process($id);
        return $this->detail($actor, $id);
    }

    public function process(int $id): void
    {
        $this->repository->transaction(function () use ($id): void {
            $chain = $this->repository->chain($id, true);
            if ($this->expire($chain) || $chain['application_status'] !== 'SEARCHING' || $chain['next_search_at'] > $this->date($this->clock->now())) {
                return;
            }
            $offer = $this->em->find(Service::class, (int) $chain['offered_service_id']);
            $request = $this->em->find(Service::class, (int) $chain['requested_service_id']);
            if (!$offer || !$request || !$this->repository->activeUser((int) $chain['initiator_id'])) {
                $this->cancelRow($chain, null, 'INITIAL_SERVICES_UNAVAILABLE');
                return;
            }
            // Search without holding service locks. Lock the complete chosen cycle in one sorted pass below.
            if ($this->repository->reserved($offer->getId()) || $this->repository->reserved($request->getId())) {
                $this->schedule($id);
                return;
            }
            if ($this->matcher->directAvailable($offer, $request)) {
                $this->cancelRow($chain, null, 'DIRECT_PATH_AVAILABLE');
                return;
            }
            $cycle = $this->matcher->find($offer, $request);
            if ($cycle === []) {
                $this->schedule($id);
                return;
            }
            $serviceIds = [];
            foreach ($cycle as $member) {
                $serviceIds[] = $member['offer']->getId();
                $serviceIds[] = $member['request']->getId();
            }
            $this->repository->lockServices($serviceIds);
            if ($this->matcher->directAvailable($offer, $request, true)) {
                $this->cancelRow($chain, null, 'DIRECT_PATH_AVAILABLE');
                return;
            }
            // A candidate can change while we wait for its row lock. Check again before reserving.
            foreach ($cycle as $member) {
                if (!$this->repository->activeUser($member['userId'], true) || !$this->repository->serviceAvailable($member['offer']->getId(), true) || !$this->repository->serviceAvailable($member['request']->getId(), true)) {
                    $this->schedule($id);
                    return;
                }
            }
            if ($this->expire($chain)) {
                return;
            }
            $this->repository->reserve($id, $serviceIds);
            foreach ($cycle as $position => $member) {
                $previous = $cycle[($position + count($cycle) - 1) % count($cycle)];
                $this->repository->add('group_participants', [
                    'group_id' => $id, 'user_id' => $member['userId'], 'position' => $position,
                    'offered_service_id' => $member['offer']->getId(), 'requested_service_id' => $member['request']->getId(),
                    'received_service' => $previous['offer']->getId(),
                ]);
            }
            $now = $this->clock->now();
            $this->repository->update('proposal_groups', ['application_status' => 'AWAITING_CONFIRMATIONS', 'proposed_at' => $this->date($now), 'confirmation_deadline' => $this->date($now->modify('+24 hours')), 'next_search_at' => null], ['id' => $id]);
        });
    }

    public function processDue(): int
    {
        $ids = $this->repository->dueChains($this->date($this->clock->now()));
        foreach ($ids as $id) {
            $this->process($id);
        }
        return count($ids);
    }

    public function list(User $actor): array
    {
        return array_map(fn (int $id) => $this->detail($actor, $id), $this->repository->userChains($actor->getId()));
    }

    public function detail(User $actor, int $id): array
    {
        return $this->repository->transaction(function () use ($actor, $id): array {
            $chain = $this->repository->chain($id, true);
            $this->authorize($actor, $chain);
            $this->expire($chain);
            return $this->serialize($id);
        });
    }

    public function decide(User $actor, int $id, string $decision): array
    {
        $this->change($actor, $id, function (array $chain) use ($actor, $decision): void {
            $member = $this->member($chain['id'], $actor->getId());
            if ($member['decision'] === $decision) {
                return;
            }
            if ($member['decision'] !== null) {
                throw new ChainError('A different chain decision has already been recorded.');
            }
            $this->requireStatus($chain, 'AWAITING_CONFIRMATIONS');
            $this->repository->update('group_participants', ['decision' => $decision, 'confirmed_at' => $decision === 'ACCEPT' ? $this->date($this->clock->now()) : null], ['group_id' => $chain['id'], 'user_id' => $actor->getId()]);
            if ($decision === 'REJECT') {
                $this->cancelRow($chain, $actor->getId(), 'PARTICIPANT_REJECTED');
                return;
            }
            foreach ($this->repository->participants($chain['id']) as $participant) {
                if ($participant['decision'] !== 'ACCEPT') {
                    return;
                }
            }
            $this->repository->update('proposal_groups', ['application_status' => 'CONFIRMED', 'status' => 'CONFERMATO'], ['id' => $chain['id']]);
        });
        return $this->detail($actor, $id);
    }

    public function proposeAgreement(User $actor, int $id, int $recipientId, string $location, \DateTimeImmutable $startAt): array
    {
        $agreementId = $this->change($actor, $id, function (array $chain) use ($actor, $recipientId, $location, $startAt): int {
            $this->requireStatus($chain, 'CONFIRMED');
            $members = $this->repository->participants($chain['id']);
            $provider = $this->member($chain['id'], $actor->getId());
            $recipient = $members[((int) $provider['position'] + 1) % count($members)];
            if ((int) $recipient['user_id'] !== $recipientId) {
                throw new ChainError('Only the next participant may receive this offered service.', 400);
            }
            foreach ($this->repository->agreements($chain['id']) as $agreement) {
                if ((int) $agreement['provider_id'] !== $actor->getId()) {
                    continue;
                }
                if ($agreement['location'] === $location && $agreement['start_at'] === $this->date($startAt)) {
                    return (int) $agreement['id'];
                }
                if ($agreement['status'] !== 'REJECTED') {
                    throw new ChainError('This edge already has a pending or accepted agreement.');
                }
            }
            return $this->repository->add('chain_agreements', [
                'group_id' => $chain['id'], 'provider_id' => $actor->getId(), 'recipient_id' => $recipientId,
                'service_id' => $provider['offered_service_id'], 'location' => $location, 'start_at' => $this->date($startAt),
                'status' => 'PENDING', 'created_at' => $this->date($this->clock->now()), 'pending_key' => $chain['id'].':'.$actor->getId(),
            ]);
        });
        return $this->serializeAgreement($this->repository->agreement($id, $agreementId));
    }

    public function decideAgreement(User $actor, int $id, int $agreementId, string $decision): array
    {
        $this->change($actor, $id, function (array $chain) use ($actor, $agreementId, $decision): void {
            $agreement = $this->repository->agreement($chain['id'], $agreementId);
            if ((int) $agreement['recipient_id'] !== $actor->getId()) {
                throw new ChainError('Only the recipient may decide on these terms.', 403);
            }
            $status = $decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
            if ($agreement['status'] === $status && in_array($chain['application_status'], ['CONFIRMED', 'COMPLETED'], true)) {
                return;
            }
            $this->requireStatus($chain, 'CONFIRMED');
            if ($agreement['status'] !== 'PENDING') {
                throw new ChainError('This agreement already has a different decision.');
            }
            $this->repository->update('chain_agreements', ['status' => $status, 'decided_at' => $this->date($this->clock->now()), 'pending_key' => null], ['id' => $agreementId]);
            if ($decision === 'ACCEPT') {
                $provisionId = $this->repository->add('service_provision', [
                    'exchange_group_id' => $chain['id'], 'agreement_id' => $agreementId,
                    'service_id' => $agreement['service_id'], 'provider_id' => $agreement['provider_id'], 'recipient_id' => $agreement['recipient_id'],
                    'location' => $agreement['location'], 'start_date' => $agreement['start_at'], 'end_date' => null,
                ]);
                foreach (['EROGATORE' => $agreement['provider_id'], 'BENEFICIARIO' => $agreement['recipient_id']] as $role => $userId) {
                    $this->repository->add('service_participants', ['service_provision_id' => $provisionId, 'user_id' => $userId, 'role' => $role]);
                }
            }
        });
        return $this->serializeAgreement($this->repository->agreement($id, $agreementId));
    }

    public function receive(User $actor, int $id, int $provisionId): array
    {
        $this->change($actor, $id, function (array $chain) use ($actor, $provisionId): void {
            $provision = $this->repository->provision($chain['id'], $provisionId);
            if ((int) $provision['recipient_id'] !== $actor->getId()) {
                throw new ChainError('Only the recipient may confirm receipt.', 403);
            }
            if ($chain['application_status'] === 'CANCELLED') {
                throw new ChainError('A cancelled chain cannot receive services.');
            }
            if ($provision['received_at'] !== null) {
                return;
            }
            $this->requireStatus($chain, 'CONFIRMED');
            $now = $this->date($this->clock->now());
            $this->repository->update('service_provision', ['received_at' => $now, 'received_by_id' => $actor->getId(), 'end_date' => $now], ['id' => $provisionId]);
            $provisions = $this->repository->provisions($chain['id']);
            if (count($provisions) === count($this->repository->participants($chain['id'])) && count(array_filter($provisions, static fn (array $p) => $p['received_at'] !== null)) === count($provisions)) {
                $this->repository->update('proposal_groups', ['application_status' => 'COMPLETED', 'completed_at' => $now, 'active_search_key' => null], ['id' => $chain['id']]);
                $this->repository->release($chain['id']);
            }
        });
        return $this->detail($actor, $id);
    }

    public function cancel(User $actor, int $id, string $reason): array
    {
        $this->change($actor, $id, function (array $chain) use ($actor, $reason): void {
            if ($chain['application_status'] === 'CANCELLED') {
                if ((int) $chain['cancelled_by_id'] === $actor->getId() && $chain['cancellation_reason'] === $reason) {
                    return;
                }
                throw new ChainError('The chain already has a different cancellation.');
            }
            if ($chain['application_status'] === 'COMPLETED') {
                throw new ChainError('A completed chain cannot be cancelled.');
            }
            if ($chain['application_status'] === 'SEARCHING' && (int) $chain['initiator_id'] !== $actor->getId()) {
                throw new ChainError('Only the initiator may cancel a search.', 403);
            }
            if ($chain['application_status'] === 'CONFIRMED') {
                $received = [];
                foreach ($this->repository->provisions($chain['id']) as $provision) {
                    if ($provision['received_at'] !== null) {
                        $received[] = (int) $provision['recipient_id'];
                    }
                }
                $now = $this->clock->now();
                foreach ($this->repository->participants($chain['id']) as $member) {
                    $userId = (int) $member['user_id'];
                    // The interrupter is excluded even when that person has not received anything.
                    if ($userId !== $actor->getId() && !in_array($userId, $received, true)) {
                        $this->repository->add('tokens', ['user_id' => $userId, 'group_id' => $chain['id'], 'issued_at' => $this->date($now), 'expiration_date' => $this->date($now->modify('+30 days'))]);
                    }
                }
            }
            $this->cancelRow($chain, $actor->getId(), $reason);
        });
        return $this->detail($actor, $id);
    }

    public function tokens(User $actor): array
    {
        return array_map(fn (array $token) => [
            'id' => (int) $token['id'],
            'chainId' => $token['group_id'] === null ? null : (int) $token['group_id'],
            'issuedAt' => $this->apiDate($token['issued_at']),
            'expiresAt' => $this->apiDate($token['expiration_date']),
            'expired' => $token['expiration_date'] <= $this->date($this->clock->now()),
        ], $this->repository->tokens($actor->getId()));
    }

    private function ownedService(User $actor, int $id, string $type): Service
    {
        $service = $this->em->find(Service::class, $id);
        if (!$service) {
            throw new ChainError('The selected service does not exist.', 404);
        }
        if ($service->getUser()->getId() !== $actor->getId() || $service->getType() !== $type) {
            throw new ChainError('Select your own offer and request.', 400);
        }
        return $service;
    }

    private function change(User $actor, int $id, callable $operation): mixed
    {
        $result = $this->repository->transaction(function () use ($actor, $id, $operation): mixed {
            $chain = $this->repository->chain($id, true);
            $this->authorize($actor, $chain);
            if ($this->expire($chain)) {
                // Return the error instead of throwing here: the expiration must be committed.
                return new ChainError('The chain deadline has expired.');
            }
            return $operation($chain);
        });
        if ($result instanceof ChainError) {
            throw $result;
        }
        return $result;
    }

    private function expire(array $chain): bool
    {
        $now = $this->date($this->clock->now());
        $reason = null;
        if ($chain['application_status'] === 'SEARCHING' && $chain['search_deadline'] <= $now) {
            $reason = 'SEARCH_EXPIRED';
        } elseif ($chain['application_status'] === 'AWAITING_CONFIRMATIONS' && $chain['confirmation_deadline'] <= $now) {
            $reason = 'CONFIRMATION_EXPIRED';
        }
        if ($reason === null) {
            return false;
        }
        $this->cancelRow($chain, null, $reason);
        return true;
    }
    private function cancelRow(array $chain, ?int $actorId, string $reason): void
    {
        $this->repository->update('proposal_groups', ['application_status' => 'CANCELLED', 'status' => 'ANNULLATO', 'cancelled_by_id' => $actorId, 'cancellation_reason' => $reason, 'cancelled_at' => $this->date($this->clock->now()), 'active_search_key' => null, 'next_search_at' => null], ['id' => $chain['id']]);
        $this->repository->release($chain['id']);
    }
    private function schedule(int $id): void
    {
        $this->repository->update('proposal_groups', ['next_search_at' => $this->date($this->clock->now()->modify('+1 minute'))], ['id' => $id]);
    }
    private function authorize(User $actor, array $chain): void
    {
        if ((int) $chain['initiator_id'] === $actor->getId()) {
            return;
        }
        $this->member($chain['id'], $actor->getId());
    }
    private function member(int $chainId, int $userId): array
    {
        foreach ($this->repository->participants($chainId) as $member) {
            if ((int) $member['user_id'] === $userId) {
                return $member;
            }
        }
        throw new ChainError('Only a chain participant may perform this operation.', 403);
    }
    private function requireStatus(array $chain, string $status): void
    {
        if ($chain['application_status'] !== $status) {
            throw new ChainError('This operation requires a '.$status.' chain.');
        }
    }
    private function date(\DateTimeImmutable $date): string { return $date->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s'); }
    private function apiDate(?string $date): ?string { return $date === null ? null : (new \DateTimeImmutable($date, new \DateTimeZone('UTC')))->format(DATE_ATOM); }

    private function serialize(int $id): array
    {
        $chain = $this->repository->chain($id);
        $members = $this->repository->participants($id);
        $participants = [];
        $links = [];
        foreach ($members as $position => $member) {
            $user = $this->em->find(User::class, (int) $member['user_id']);
            $participants[] = [
                'user' => $user->toPublicApiArray(),
                'position' => (int) $member['position'],
                'offeredServiceId' => (int) $member['offered_service_id'],
                'requestedServiceId' => (int) $member['requested_service_id'],
                'expectedIncomingServiceId' => (int) $member['received_service'],
                'decision' => $member['decision'],
                'confirmedAt' => $this->apiDate($member['confirmed_at']),
            ];
            $recipient = $members[($position + 1) % count($members)];
            $links[] = [
                'providerUserId' => (int) $member['user_id'],
                'recipientUserId' => (int) $recipient['user_id'],
                'serviceId' => (int) $member['offered_service_id'],
            ];
        }
        return [
            'id' => $id,
            'status' => $chain['application_status'],
            'initiatorUserId' => (int) $chain['initiator_id'],
            'offeredServiceId' => (int) $chain['offered_service_id'],
            'requestedServiceId' => (int) $chain['requested_service_id'],
            'createdAt' => $this->apiDate($chain['creation_date']),
            'searchDeadline' => $this->apiDate($chain['search_deadline']),
            'proposedAt' => $this->apiDate($chain['proposed_at']),
            'confirmationDeadline' => $this->apiDate($chain['confirmation_deadline']),
            'cancelledByUserId' => $chain['cancelled_by_id'] === null ? null : (int) $chain['cancelled_by_id'],
            'cancellationReason' => $chain['cancellation_reason'],
            'cancelledAt' => $this->apiDate($chain['cancelled_at']),
            'completedAt' => $this->apiDate($chain['completed_at']),
            'participants' => $participants,
            'links' => $links,
            'agreements' => array_map($this->serializeAgreement(...), $this->repository->agreements($id)),
            'provisions' => array_map($this->serializeProvision(...), $this->repository->provisions($id)),
        ];
    }

    private function serializeAgreement(array $agreement): array
    {
        return [
            'id' => (int) $agreement['id'],
            'chainId' => (int) $agreement['group_id'],
            'providerUserId' => (int) $agreement['provider_id'],
            'recipientUserId' => (int) $agreement['recipient_id'],
            'serviceId' => (int) $agreement['service_id'],
            'status' => $agreement['status'],
            'location' => $agreement['location'],
            'startAt' => $this->apiDate($agreement['start_at']),
            'createdAt' => $this->apiDate($agreement['created_at']),
            'decidedAt' => $this->apiDate($agreement['decided_at']),
        ];
    }

    private function serializeProvision(array $provision): array
    {
        return [
            'id' => (int) $provision['id'],
            'agreementId' => (int) $provision['agreement_id'],
            'providerUserId' => (int) $provision['provider_id'],
            'recipientUserId' => (int) $provision['recipient_id'],
            'serviceId' => (int) $provision['service_id'],
            'location' => $provision['location'],
            'startAt' => $this->apiDate($provision['start_date']),
            'receivedAt' => $this->apiDate($provision['received_at']),
            'receivedByUserId' => $provision['received_by_id'] === null ? null : (int) $provision['received_by_id'],
        ];
    }
}
