<?php
declare(strict_types=1);

namespace App\DTO;

class GroupParticipantDTO
{
    private readonly ?int $beneficiaryId;
    private readonly ?int $providerId;

    public function __construct(?int $beneficiaryId, ?int $providerId)
    {
        $this->beneficiaryId = $beneficiaryId;
        $this->providerId = $providerId;
    }

    public function getBeneficiaryId(): ?int
    {
        return $this->beneficiaryId;
    }

    public function getProviderId(): ?int
    {
        return $this->providerId;
    }
}