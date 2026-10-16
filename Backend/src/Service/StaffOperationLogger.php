<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use Doctrine\DBAL\Connection;

/** Call inside the operation's transaction: both changes must succeed together. */
final class StaffOperationLogger
{
    public function __construct(private Connection $db, private ChainClock $clock) {}

    public function record(User $staff, string $action, string $targetType, int $targetId, ?array $before, array $after): void
    {
        if (!$this->db->isTransactionActive()) {
            throw new \LogicException('Staff history must be written inside a transaction.');
        }
        if ($before === $after) { return; }

        // Write directly rather than leaving pending ORM entities across transaction retries.
        $this->db->insert('staff_operation_logs', [
            'staff_id' => $staff->getId(),
            'staff_username' => $staff->getUsername(),
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'before_values' => $before === null ? null : json_encode($before, JSON_THROW_ON_ERROR),
            'after_values' => json_encode($after, JSON_THROW_ON_ERROR),
            'created_at' => $this->clock->now()->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
        ]);
    }
}
