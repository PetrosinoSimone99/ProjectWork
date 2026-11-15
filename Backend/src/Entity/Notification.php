<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\NotificationRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: NotificationRepository::class)]
#[ORM\Table(name: 'notifications')]
#[ORM\Index(name: 'notifications_user_date_index', columns: ['user_id', 'created_at', 'id'])]
#[ORM\Index(name: 'notifications_user_read_index', columns: ['user_id', 'read_at'])]
class Notification
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'user_id', nullable: false, onDelete: 'CASCADE')]
    private User $recipient;

    #[ORM\Column(length: 100)]
    private string $type;

    #[ORM\Column(type: 'text')]
    private string $message;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $data;

    #[ORM\Column(name: 'created_at', type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'read_at', type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $readAt = null;

    public function __construct(User $recipient, string $type, string $message, ?array $data, \DateTimeImmutable $createdAt)
    {
        $type = trim($type);
        $message = trim($message);
        if ($type === '' || mb_strlen($type) > 100 || $message === '') {
            throw new \InvalidArgumentException('A type of 1 to 100 characters and a non-empty message are required.');
        }
        $this->recipient = $recipient;
        $this->type = $type;
        $this->message = $message;
        $this->data = $data;
        $this->createdAt = $createdAt->setTimezone(new \DateTimeZone('UTC'));
    }

    public function getId(): ?int { return $this->id; }

    public function toApiArray(): array
    {
        // SQL DATETIME values have no timezone; our service always writes UTC.
        return [
            'id' => $this->id,
            'type' => $this->type,
            'message' => $this->message,
            'data' => $this->data,
            'createdAt' => $this->createdAt->format('Y-m-d\TH:i:s').'+00:00',
            'readAt' => $this->readAt === null ? null : $this->readAt->format('Y-m-d\TH:i:s').'+00:00',
        ];
    }
}
