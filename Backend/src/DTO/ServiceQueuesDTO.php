<?php

namespace App\DTO;


class ServiceQueuesDTO
{
    private readonly int $id;
    private readonly string $queueType;
    private readonly string $queueStatus;
    private readonly string $location;
    private readonly string $serviceDescription;
    private readonly string $serviceCategory;
    private readonly bool $serviceIsRemote;
    private readonly ?int $agreementId;

    public function __construct(int $id, string $queueType, string $queueStatus, string $location, string $serviceDescription, string $serviceCategory, bool $serviceIsRemote, ?int $agreementId)
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

    public function getQueueType(): string
    {
        return $this->queueType;
    }

    public function getQueueStatus(): string
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