<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Repository\ChainRepository;
use App\Repository\TokenRedemptionRepository;

/** A token pays for one service. It is spent only after the recipient confirms receipt. */
final class TokenRedemptionService
{
    public function __construct(private ChainRepository $chains, private TokenRedemptionRepository $redemptions, private ChainClock $clock) {}

    public function reserve(User $actor, int $tokenId, int $serviceId): array
    {
        return $this->chains->transaction(function () use ($actor, $tokenId, $serviceId): array {
            // All redemption writes lock service, then token, then redemption, in this order.
            $this->chains->lockServices([$serviceId]);
            $token = $this->chains->token($tokenId, true);
            if ((int) $token['user_id'] !== $actor->getId()) {
                throw new ChainError('Only the owner may reserve this token.', 403);
            }
            if ($token['status'] !== 'AVAILABLE' || $token['expiration_date'] <= $this->now()) {
                throw new ChainError('This token is reserved, spent or expired.');
            }
            $offer = $this->redemptions->offer($serviceId);
            if ($offer['type'] !== 'OFFER' || (int) $offer['user_id'] === $actor->getId()) {
                throw new ChainError('Select an offer published by another user.', 400);
            }
            if (!$this->chains->serviceAvailable($serviceId, true)
                || !$this->chains->activeUser((int) $offer['user_id'], true)
                || !$this->chains->activeUser($actor->getId(), true)) {
                throw new ChainError('This offer or one of the participants is unavailable.');
            }
            $id = $this->chains->add('token_redemptions', [
                'token_id' => $tokenId, 'service_id' => $serviceId,
                'recipient_id' => $actor->getId(), 'provider_id' => $offer['user_id'],
                'status' => 'PENDING', 'reserved_service_id' => $serviceId, 'created_at' => $this->now(),
            ]);
            $this->chains->update('tokens', ['status' => 'RESERVED'], ['id' => $tokenId]);
            return $this->result($tokenId, $id);
        });
    }

    public function list(User $actor): array
    {
        return array_map($this->serializeRedemption(...), $this->redemptions->forUser($actor->getId()));
    }

    public function detail(User $actor, int $id): array
    {
        $row = $this->redemptions->find($id);
        $this->authorize($actor, $row);
        return $this->serializeRedemption($row);
    }

    public function change(User $actor, int $id, string $action): array
    {
        return $this->chains->transaction(function () use ($actor, $id, $action): array {
            $row = $this->redemptions->find($id);
            $this->authorize($actor, $row);
            $this->chains->lockServices([(int) $row['service_id']]);
            $token = $this->chains->token((int) $row['token_id'], true);
            $row = $this->redemptions->find($id, true);
            if (in_array($action, ['ACCEPT', 'REJECT'], true) && (int) $row['provider_id'] !== $actor->getId()) {
                throw new ChainError('Only the provider may decide on this request.', 403);
            }
            if ($action === 'RECEIPT' && (int) $row['recipient_id'] !== $actor->getId()) {
                throw new ChainError('Only the recipient may confirm receipt.', 403);
            }
            $target = match ($action) {
                'ACCEPT' => 'ACCEPTED', 'REJECT' => 'REJECTED',
                'RECEIPT' => 'COMPLETED', 'CANCEL' => 'CANCELLED',
            };
            // A retry must not consume twice or change a token that has since been reused.
            if ($row['status'] === $target) { return $this->result((int) $token['id'], $id); }
            $allowed = match ($action) {
                'ACCEPT', 'REJECT' => ['PENDING'], 'RECEIPT' => ['ACCEPTED'], 'CANCEL' => ['PENDING', 'ACCEPTED'],
            };
            if (!in_array($row['status'], $allowed, true) || $token['status'] !== 'RESERVED') {
                throw new ChainError('This redemption cannot make the requested transition.');
            }
            if ($action === 'ACCEPT' && (!$this->chains->activeUser((int) $row['recipient_id'], true)
                || !$this->chains->activeUser((int) $row['provider_id'], true))) {
                throw new ChainError('Both participants must be active to accept the request.');
            }
            $values = ['status' => $target];
            if ($action === 'ACCEPT') {
                $values['accepted_at'] = $this->now();
            } else {
                // Closing a request always releases the offer; it does not suspend it.
                $values['closed_at'] = $this->now();
                $values['reserved_service_id'] = null;
                $this->chains->update('tokens', ['status' => $action === 'RECEIPT' ? 'SPENT' : 'AVAILABLE'], ['id' => $token['id']]);
            }
            $this->chains->update('token_redemptions', $values, ['id' => $id]);
            return $this->result((int) $token['id'], $id);
        });
    }

    public function serializeToken(array $token, bool $lock = false): array
    {
        $current = $this->redemptions->currentForToken((int) $token['id'], $lock);
        $expired = $token['expiration_date'] <= $this->now();
        return [
            'id' => (int) $token['id'],
            'chainId' => $token['group_id'] === null ? null : (int) $token['group_id'],
            'issuedAt' => $this->apiDate($token['issued_at']),
            'expiresAt' => $this->apiDate($token['expiration_date']),
            // Keep the existing date flag. Only AVAILABLE tokens become EXPIRED in the UI.
            'expired' => $expired,
            'status' => $token['status'] === 'AVAILABLE' && $expired ? 'EXPIRED' : $token['status'],
            'serviceId' => $current === null ? null : (int) $current['service_id'],
            'redemptionId' => $current === null ? null : (int) $current['id'],
            'spentAt' => $current !== null && $current['status'] === 'COMPLETED' ? $this->apiDate($current['closed_at']) : null,
        ];
    }

    private function result(int $tokenId, int $id): array
    {
        // Locking reads see changes committed while this transaction was waiting.
        return ['token' => $this->serializeToken($this->chains->token($tokenId, true), true), 'redemption' => $this->serializeRedemption($this->redemptions->find($id, true))];
    }

    private function authorize(User $actor, array $row): void
    {
        if (!in_array($actor->getId(), [(int) $row['recipient_id'], (int) $row['provider_id']], true)) {
            throw new ChainError('Only participants may access this redemption.', 403);
        }
    }

    private function serializeRedemption(array $row): array
    {
        return [
            'id' => (int) $row['id'], 'tokenId' => (int) $row['token_id'],
            'serviceId' => (int) $row['service_id'], 'recipientId' => (int) $row['recipient_id'],
            'providerId' => (int) $row['provider_id'], 'status' => $row['status'],
            'createdAt' => $this->apiDate($row['created_at']),
            'acceptedAt' => $this->apiDate($row['accepted_at']), 'closedAt' => $this->apiDate($row['closed_at']),
        ];
    }

    private function now(): string { return $this->clock->now()->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s'); }

    private function apiDate(?string $value): ?string
    {
        return $value === null ? null : (new \DateTimeImmutable($value, new \DateTimeZone('UTC')))->format(DATE_ATOM);
    }
}
