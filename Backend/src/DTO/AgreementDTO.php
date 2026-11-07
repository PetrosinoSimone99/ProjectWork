<?php

namespace App\DTO;

use App\Enum\AgreementStatus;

class AgreementDTO
{
    private readonly ?int $id;
    private readonly ?AgreementStatus $agreementStatus;
    private readonly ?\DateTimeImmutable $creationDate;
    private readonly ?array $agreementProposal;
    private readonly ?array $agreementDetails;

    public function __construct(?int $id, ?AgreementStatus $agreementStatus, ?\DateTimeImmutable $creationDate, ?array $agreementProposal, ?array $agreementDetails)
    {
        $this->id = $id;
        $this->agreementStatus = $agreementStatus;
        $this->creationDate = $creationDate;
        $this->agreementProposal = $agreementProposal;
        $this->agreementDetails = $agreementDetails;
    }

    public function getId(): ?int { return $this->id; }
    public function getAgreementStatus(): ?AgreementStatus { return $this->agreementStatus; }
    public function getCreationDate(): ?\DateTimeImmutable { return $this->creationDate; }
    public function getAgreementProposal(): ?array { return $this->agreementProposal; }
    public function getAgreementDetails(): ?array { return $this->agreementDetails; }
}