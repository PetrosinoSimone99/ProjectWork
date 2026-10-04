<?php

declare(strict_types=1);

namespace App\Repository;

use App\Service\ChainError;
use Doctrine\DBAL\Connection;

/** All chain SQL lives here; the application service works with ordinary arrays. */
final class ChainRepository
{
    public function __construct(private Connection $db) {}

    public function transaction(callable $operation): mixed
    {
        for ($attempt = 0; ; ++$attempt) {
            try {
                return $this->db->transactional($operation);
            } catch (\Doctrine\DBAL\Exception\RetryableException $error) {
                if ($attempt >= 2) {
                    throw $error;
                }
            }
        }
    }
    public function add(string $table, array $values): int
    {
        $this->db->insert($table, $values);
        if (in_array($table, ['group_participants', 'service_participants'], true)) {
            return 0;
        }
        return (int) $this->db->lastInsertId();
    }
    public function update(string $table, array $values, array $where): void { $this->db->update($table, $values, $where); }

    public function chain(int $id, bool $lock = false): array
    {
        $row = $this->db->fetchAssociative('SELECT * FROM proposal_groups WHERE id = ? AND application_status IS NOT NULL'.($lock ? ' FOR UPDATE' : ''), [$id]);
        if ($row === false) {
            throw new ChainError('The chain does not exist.', 404);
        }
        return $row;
    }
    public function participants(int $id): array
    {
        return $this->db->fetchAllAssociative('SELECT * FROM group_participants WHERE group_id = ? ORDER BY position', [$id]);
    }
    public function agreements(int $id): array
    {
        return $this->db->fetchAllAssociative('SELECT * FROM chain_agreements WHERE group_id = ? ORDER BY id', [$id]);
    }
    public function provisions(int $id): array
    {
        return $this->db->fetchAllAssociative('SELECT * FROM service_provision WHERE exchange_group_id = ? AND agreement_id IS NOT NULL ORDER BY id', [$id]);
    }
    public function agreement(int $chainId, int $id): array
    {
        $row = $this->db->fetchAssociative('SELECT * FROM chain_agreements WHERE group_id = ? AND id = ?', [$chainId, $id]);
        if ($row === false) {
            throw new ChainError('The agreement does not exist in this chain.', 404);
        }
        return $row;
    }
    public function provision(int $chainId, int $id): array
    {
        $row = $this->db->fetchAssociative('SELECT * FROM service_provision WHERE exchange_group_id = ? AND id = ? AND agreement_id IS NOT NULL', [$chainId, $id]);
        if ($row === false) {
            throw new ChainError('The provision does not exist in this chain.', 404);
        }
        return $row;
    }
    public function activeSearch(string $key): ?int
    {
        $id = $this->db->fetchOne('SELECT id FROM proposal_groups WHERE active_search_key = ?', [$key]);
        return $id === false ? null : (int) $id;
    }
    public function userChains(int $userId): array
    {
        return array_map('intval', $this->db->fetchFirstColumn('SELECT DISTINCT g.id FROM proposal_groups g LEFT JOIN group_participants p ON p.group_id = g.id WHERE g.application_status IS NOT NULL AND (g.initiator_id = ? OR p.user_id = ?) ORDER BY g.id DESC', [$userId, $userId]));
    }
    public function dueChains(string $now): array
    {
        return array_map('intval', $this->db->fetchFirstColumn("SELECT id FROM proposal_groups WHERE (application_status = 'SEARCHING' AND (next_search_at <= ? OR search_deadline <= ?)) OR (application_status = 'AWAITING_CONFIRMATIONS' AND confirmation_deadline <= ?) ORDER BY id", [$now, $now, $now]));
    }
    public function lockServices(array $ids): void
    {
        // Lock each row in the same order in both APIs to prevent circular waits.
        $ids = array_values(array_unique($ids));
        sort($ids, SORT_NUMERIC);
        foreach ($ids as $id) {
            $suffix = $this->db->getDatabasePlatform() instanceof \Doctrine\DBAL\Platforms\SQLitePlatform ? '' : ' FOR UPDATE';
            $this->db->fetchOne('SELECT id FROM services WHERE id = ?'.$suffix, [$id]);
        }
    }
    public function reserved(int $serviceId, bool $currentRead = false): bool
    {
        // Old installations can still serve direct APIs before the chain migration is applied.
        if (!$this->db->createSchemaManager()->tablesExist(['chain_service_reservations'])) {
            return false;
        }
        return $this->db->fetchOne('SELECT service_id FROM chain_service_reservations WHERE service_id = ?'.($currentRead ? ' FOR UPDATE' : ''), [$serviceId]) !== false;
    }
    public function reserve(int $chainId, array $serviceIds): void
    {
        foreach (array_unique($serviceIds) as $serviceId) {
            $this->db->insert('chain_service_reservations', ['service_id' => $serviceId, 'group_id' => $chainId]);
        }
    }
    public function release(int $chainId): void { $this->db->delete('chain_service_reservations', ['group_id' => $chainId]); }
    public function serviceAvailable(int $serviceId, bool $currentRead = false): bool
    {
        return !$this->reserved($serviceId, $currentRead) && !$this->hasDirectProposal($serviceId, $currentRead);
    }
    public function hasDirectProposal(int $serviceId, bool $currentRead = false): bool
    {
        // Old proposals store offers only. New swipe rows also identify the selected requests.
        $suffix = $currentRead ? ' FOR UPDATE' : '';
        if ($this->db->fetchOne("SELECT pp.proposal_id FROM proposal_participants pp JOIN proposals p ON p.id = pp.proposal_id WHERE pp.service_id = ? AND p.status IN ('PENDING','ACCEPTED') LIMIT 1".$suffix, [$serviceId]) !== false) {
            return true;
        }
        return $this->db->fetchOne("SELECT d.proposal_id FROM swipe_decisions d JOIN proposals p ON p.id = d.proposal_id WHERE p.status IN ('PENDING','ACCEPTED') AND (d.actor_offer_id = ? OR d.actor_request_id = ? OR d.candidate_offer_id = ? OR d.candidate_request_id = ?) LIMIT 1".$suffix, array_fill(0, 4, $serviceId)) !== false;
    }
    public function directPairExists(int $firstOffer, int $secondOffer): bool
    {
        $ids = [$firstOffer, $secondOffer];
        sort($ids, SORT_NUMERIC);
        return $this->db->fetchOne('SELECT id FROM proposals WHERE offer_pair_key = ?', [implode(':', $ids)]) !== false;
    }
    public function swipeExists(int $actor, int $candidate, int $actorOffer, int $actorRequest, int $candidateOffer, int $candidateRequest): bool
    {
        return $this->db->fetchOne('SELECT id FROM swipe_decisions WHERE actor_id = ? AND candidate_id = ? AND actor_offer_id = ? AND actor_request_id = ? AND candidate_offer_id = ? AND candidate_request_id = ?', [$actor, $candidate, $actorOffer, $actorRequest, $candidateOffer, $candidateRequest]) !== false;
    }
    public function activeUser(int $userId, bool $currentRead = false): bool
    {
        return $this->db->fetchOne("SELECT id FROM users WHERE id = ? AND account_status = 'ACTIVE'".($currentRead ? ' FOR UPDATE' : ''), [$userId]) !== false;
    }
    public function tokens(int $userId): array
    {
        return $this->db->fetchAllAssociative('SELECT * FROM tokens WHERE user_id = ? ORDER BY id DESC', [$userId]);
    }
}
