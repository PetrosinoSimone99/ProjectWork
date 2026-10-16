<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\StaffOperationLogRepository;
use Doctrine\ORM\Mapping as ORM;

/** Historical snapshots use plain IDs, so deleting a target cannot erase history. */
#[ORM\Entity(repositoryClass: StaffOperationLogRepository::class, readOnly: true)]
#[ORM\Table(name: 'staff_operation_logs')]
#[ORM\Index(name: 'staff_log_date_index', columns: ['created_at', 'id'])]
#[ORM\Index(name: 'staff_log_actor_index', columns: ['staff_id'])]
#[ORM\Index(name: 'staff_log_action_index', columns: ['action'])]
#[ORM\Index(name: 'staff_log_target_index', columns: ['target_type', 'target_id'])]
class StaffOperationLog
{
    public const ACTIONS = ['USER_STATUS_CHANGED', 'USER_PROMOTED', 'REPORT_REVIEWED', 'TOKEN_CREATED', 'TOKEN_EXPIRATION_CHANGED', 'TOKEN_DELETED'];
    public const TARGET_TYPES = ['USER', 'REPORT', 'TOKEN'];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(name: 'staff_id')]
    private int $staffId;

    #[ORM\Column(name: 'staff_username', length: 30)]
    private string $staffUsername;

    #[ORM\Column(length: 32)]
    private string $action;

    #[ORM\Column(name: 'target_type', length: 10)]
    private string $targetType;

    #[ORM\Column(name: 'target_id')]
    private int $targetId;

    #[ORM\Column(name: 'before_values', type: 'json', nullable: true)]
    private ?array $beforeValues;

    #[ORM\Column(name: 'after_values', type: 'json')]
    private array $afterValues;

    #[ORM\Column(name: 'created_at', type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'actor' => ['id' => $this->staffId, 'username' => $this->staffUsername],
            'action' => $this->action,
            'target' => ['type' => $this->targetType, 'id' => $this->targetId],
            'before' => $this->beforeValues,
            'after' => $this->afterValues,
            // Database timestamps are written in UTC and have no timezone suffix.
            'createdAt' => $this->createdAt->format('Y-m-d\TH:i:s').'+00:00',
        ];
    }
}
