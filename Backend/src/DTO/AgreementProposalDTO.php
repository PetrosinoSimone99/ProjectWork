<?php

namespace App\DTO;

use App\Enum\AgreementParticipantRole;

class AgreementProposalDTO
{
    private readonly string $username;
    private readonly ?AgreementParticipantRole $role;
    private readonly ?bool $response;
    private readonly ?\DateTimeImmutable $responseDate;

    public function __construct(string $username, ?AgreementParticipantRole $role, ?bool $response, ?\DateTimeImmutable $responseDate)
    {
        $this->username = $username;
        $this->role = $role;
        $this->response = $response;
        $this->responseDate = $responseDate;
    }

    public function getUsername(): string { return $this->username; }
    public function getRole(): ?AgreementParticipantRole { return $this->role; }
    public function getResponse(): ?bool { return $this->response; }
    public function getResponseDate(): ?\DateTimeImmutable { return $this->responseDate; }
}