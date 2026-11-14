<?php

namespace App\DTO;

use App\Enum\QueueType;
use App\Enum\QueueStatus;

class ServiceQueueDTO
{
    private readonly int $id;
    private readonly QueueType $queueType;
    private readonly QueueStatus $queueStatus;
    private readonly string $location;
    private readonly string $serviceDescription;
    private readonly string $serviceCategory;
    private readonly bool $serviceIsRemote;
    private readonly ?int $agreementId;

    public function __construct(int $id, QueueType $queueType, QueueStatus $queueStatus, string $location, string $serviceDescription, string $serviceCategory, bool $serviceIsRemote, ?int $agreementId)
    {
        $this->id = $id;
        $this->queueType = $queueType;
        $this->queueStatus = $queueStatus;
        $this->location = $location;
        $this->serviceDescription = $serviceDescription;
        $this->serviceCategory = $serviceCategory;
        $this->serviceIsRemote = $serviceIsRemote;
        $this->agreementId = $agreementId;
    }

    public function getId(): int
    {
        return $this->id;
    }

    public function getQueueType(): QueueType
    {
        return $this->queueType;
    }

    public function getQueueStatus(): QueueStatus
    {
        return $this->queueStatus;
    }

    public function getServiceDescription(): string
    {
        return $this->serviceDescription;
    }

    public function getServiceCategory(): string
    {
        return $this->serviceCategory;
    }

    public function isServiceRemote(): bool
    {
        return $this->serviceIsRemote;
    }

    public function getAgreementId(): ?int
    {
        return $this->agreementId;
    }
}