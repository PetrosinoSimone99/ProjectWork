<?php


namespace App\DTO;

use App\Enum\AgreementDetailsStatus;

class AgreementDetailsDTO
{
    private readonly ?string $providerUsername;
    private readonly ?string $serviceDescription;
    private readonly ?string $beneficiaryUsername;
    private readonly ?bool $fromRemote;
    private readonly ?\DateTimeImmutable $startDate;
    private readonly ?\DateTimeImmutable $endDate;
    private readonly ?bool $beneficiaryAccepted;
    private readonly ?AgreementDetailsStatus $status;

    public function __construct(?string $providerUsername, ?string $serviceDescription, ?string $beneficiaryUsername, ?bool $fromRemote, ?\DateTimeImmutable $startDate, ?\DateTimeImmutable $endDate, ?bool $beneficiaryAccepted, ?AgreementDetailsStatus $status = null)
    {
        $this->providerUsername = $providerUsername;
        $this->serviceDescription = $serviceDescription;
        $this->beneficiaryUsername = $beneficiaryUsername;
        $this->fromRemote = $fromRemote;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->beneficiaryAccepted = $beneficiaryAccepted;
        $this->status = $status;
    }

    public function getProviderUsername(): ?string { return $this->providerUsername; }
    public function getServiceDescription(): ?string { return $this->serviceDescription; }
    public function getBeneficiaryUsername(): ?string { return $this->beneficiaryUsername; }
    public function getFromRemote(): ?bool { return $this->fromRemote; }
    public function getStartDate(): ?\DateTimeImmutable { return $this->startDate; }
    public function getEndDate(): ?\DateTimeImmutable { return $this->endDate; }
    public function getBeneficiaryAccepted(): ?bool { return $this->beneficiaryAccepted; }
    public function getStatus(): ?AgreementDetailsStatus { return $this->status; }
}