<?php

declare(strict_types=1);

namespace App\Repository;

use App\Service\ChainError;
use Doctrine\DBAL\Connection;

/** SQL for token history. State changes belong to TokenRedemptionService. */
final class TokenRedemptionRepository
{
    public function __construct(private Connection $db) {}

    public function find(int $id, bool $lock = false): array
    {
        $row = $this->db->fetchAssociative('SELECT * FROM token_redemptions WHERE id = ?'.($lock ? ' FOR UPDATE' : ''), [$id]);
        if ($row === false) { throw new ChainError('The redemption does not exist.', 404); }
        return $row;
    }

    public function forUser(int $userId): array
    {
        return $this->db->fetchAllAssociative('SELECT * FROM token_redemptions WHERE recipient_id = ? OR provider_id = ? ORDER BY id DESC', [$userId, $userId]);
    }

    public function currentForToken(int $tokenId, bool $lock = false): ?array
    {
        $row = $this->db->fetchAssociative("SELECT * FROM token_redemptions WHERE token_id = ? AND status IN ('PENDING', 'ACCEPTED', 'COMPLETED') ORDER BY id DESC LIMIT 1".($lock ? ' FOR UPDATE' : ''), [$tokenId]);
        return $row === false ? null : $row;
    }

    public function offer(int $id): array
    {
        // The caller already holds the service row lock. Read fresh values, not ORM cache.
        $row = $this->db->fetchAssociative('SELECT * FROM services WHERE id = ? AND deleted_at IS NULL FOR UPDATE', [$id]);
        if ($row === false) { throw new ChainError('The service does not exist.', 404); }
        return $row;
    }
}
