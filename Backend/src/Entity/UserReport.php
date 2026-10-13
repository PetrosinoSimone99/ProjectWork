<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use App\Repository\UserReportRepository;

/** Stores one user's reason for reporting another user. */
#[ORM\Entity(repositoryClass: UserReportRepository::class)]
#[ORM\Table(name: 'user_reports')]
#[ORM\UniqueConstraint(name: 'user_report_pair_unique', columns: ['reporter_id', 'reported_user_id'])]
#[ORM\Index(name: 'user_report_target_index', columns: ['reported_user_id'])]
#[ORM\Index(name: 'user_report_status_index', columns: ['status'])]
#[ORM\Index(name: 'user_report_reviewer_index', columns: ['reviewed_by_id'])]
class UserReport
{
    public const STATUS_PENDING = 'PENDING';
    public const STATUS_CONFIRMED = 'CONFIRMED';
    public const STATUS_REJECTED = 'REJECTED';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'reporter_id', nullable: false)]
    private User $reporter;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'reported_user_id', nullable: false)]
    private User $reportedUser;

    #[ORM\Column(length: 2000)]
    private string $reason;

    #[ORM\Column(name: 'creation_date', type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(length: 10, options: ['default' => 'PENDING'])]
    private string $status = self::STATUS_PENDING;

    #[ORM\Column(name: 'review_note', length: 2000, nullable: true)]
    private ?string $reviewNote = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'reviewed_by_id', nullable: true)]
    private ?User $reviewedBy = null;

    #[ORM\Column(name: 'reviewed_at', type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $reviewedAt = null;

    public function __construct(User $reporter, User $reportedUser, string $reason)
    {
        $this->reporter = $reporter;
        $this->reportedUser = $reportedUser;
        $this->reason = $reason;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getReporter(): User { return $this->reporter; }
    public function isPending(): bool { return $this->status === self::STATUS_PENDING; }

    /** The controller locks this report before checking and closing it. */
    public function review(string $status, string $note, User $staff): void
    {
        if (!$this->isPending()) {
            throw new \LogicException('This report has already been reviewed.');
        }
        if (!in_array($status, [self::STATUS_CONFIRMED, self::STATUS_REJECTED], true)) {
            throw new \InvalidArgumentException('Invalid review outcome.');
        }
        $this->status = $status;
        $this->reviewNote = $note;
        $this->reviewedBy = $staff;
        $this->reviewedAt = new \DateTimeImmutable();
    }

    /** Staff see identities and review information, but never password hashes. */
    public function toStaffApiArray(): array
    {
        return $this->toApiArray() + [
            'reporter' => self::userSummary($this->reporter),
            'reportedUser' => self::userSummary($this->reportedUser),
            'status' => $this->status,
            'reviewNote' => $this->reviewNote,
            'reviewedBy' => $this->reviewedBy === null ? null : self::userSummary($this->reviewedBy),
            'reviewedAt' => $this->reviewedAt?->format(DATE_ATOM),
        ];
    }

    private static function userSummary(User $user): array
    {
        return ['id' => $user->getId(), 'username' => $user->getUsername(), 'name' => $user->getName(), 'surname' => $user->getSurname()];
    }

    /** Return IDs only, rather than exposing either user's private profile. */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'reportedUserId' => $this->reportedUser->getId(),
            'reason' => $this->reason,
            'createdAt' => $this->createdAt->format(DATE_ATOM),
        ];
    }
}
