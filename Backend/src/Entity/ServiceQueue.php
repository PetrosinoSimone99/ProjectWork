<?php

namespace App\Entity;

use App\Enum\QueueType;
use App\Enum\QueueStatus;
use App\Repository\ServiceQueueRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ServiceQueueRepository::class)]
#[ORM\Table(name: 'service_queues')]
class ServiceQueue
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id')]
    private ?User $user = null;

    #[ORM\Column(name: 'type', type: 'string', enumType: QueueType::class)]
    private QueueType $queueType;

    #[ORM\ManyToOne(targetEntity: Service::class)]
    #[ORM\JoinColumn(name: 'service_id')]
    private ?Service $service = null;

    #[ORM\Column(name: 'location', type: 'string', nullable: true)]
    private ?string $location = null;

    #[ORM\OneToOne(targetEntity: Agreement::class)]
    #[ORM\JoinColumn(name: 'agreement_created', referencedColumnName: 'id', nullable: true)]
    private ?Agreement $agreement = null;

    #[ORM\Column(name: 'status', type: 'string', enumType: QueueStatus::class)]
    private QueueStatus $queueStatus;

    public function __construct(User $user, QueueType $queueType, Service $service, ?string $location, QueueStatus $queueStatus)
    {
        $this->user = $user;
        $this->queueType = $queueType;
        $this->service = $service;
        $this->location = $location;
        $this->queueStatus = $queueStatus;
        $this->agreement = null;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }
    public function setUser(User $user): self
    {
        $this->user = $user;

        return $this;
    }

    public function getQueueType(): QueueType
    {
        return $this->queueType;
    }
    public function setQueueType(QueueType $queueType): self
    {
        $this->queueType = $queueType;
        return $this;
    }

    public function getService(): ?Service
    {
        return $this->service;
    }

    public function setService(Service $service): self
    {
        $this->service = $service;

        return $this;
    }

    public function getLocation(): ?string
    {
        return $this->location;
    }
    public function setLocation(?string $location): self
    {
        $this->location = $location;
        return $this;
    }
    public function getAgreement(): ?Agreement
    {
        return $this->agreement;
    }
    public function setAgreement(?Agreement $agreement): self
    {
        $this->agreement = $agreement;
        return $this;
    }

    public function getQueueStatus(): QueueStatus
    {
        return $this->queueStatus;
    }
    public function setQueueStatus(QueueStatus $queueStatus): self
    {
        $this->queueStatus = $queueStatus;
        return $this;
    }
}
