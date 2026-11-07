<?php

namespace App\Entity;

use App\Enum\AgreementDetailsStatus;
use App\Repository\AgreementDetailsRepository;
use Doctrine\ORM\Mapping as ORM;
use DateTimeImmutable;
#[ORM\Entity(repositoryClass: AgreementDetailsRepository::class)]
class AgreementDetails
{
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Agreement::class, inversedBy: 'agreementDetails')]
    #[ORM\JoinColumn(name: 'agreement_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Agreement $agreement = null;

    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'provider_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\ManyToOne(targetEntity: Service::class)]
    #[ORM\JoinColumn(name: 'service_provided', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Service $service = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'beneficiary_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?User $beneficiary = null;

    #[ORM\Column(name: 'from_remote', type: 'boolean')]
    private ?bool $fromRemote = null;

    #[ORM\Column(name: 'start_date', type: 'datetime_immutable')]
    private ?\DateTimeImmutable $startDate = null;

    #[ORM\Column(name: 'end_date', type: 'datetime_immutable')]
    private ?\DateTimeImmutable $endDate = null;

    #[ORM\Column(name: 'beneficiary_accepted', type: 'boolean', nullable: true)]
    private ?bool $beneficiaryAccepted = null;

    #[ORM\Column(name: 'status', enumType: AgreementDetailsStatus::class)]
    private ?AgreementDetailsStatus $status = null;


    public function __construct(Agreement $agreement, User $user, Service $service, User $beneficiary, bool $fromRemote,
    DateTimeImmutable $startDate, DateTimeImmutable $endDate, ?bool $beneficiaryAccepted,
    AgreementDetailsStatus $status)
    {
        $this->agreement = $agreement;
        $this->user = $user;
        $this->service = $service;
        $this->beneficiary = $beneficiary;
        $this->fromRemote = $fromRemote;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->beneficiaryAccepted = $beneficiaryAccepted;
        $this->status = $status;
    }


    public function getAgreement(): ?Agreement
    {
        return $this->agreement;
    }
    public function setAgreement(Agreement $agreement): self
    {
        $this->agreement = $agreement;
        return $this;
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

    public function getService(): ?Service
    {
        return $this->service;
    }
    public function setService(Service $service): self
    {
        $this->service = $service;
        return $this;
    }

    public function getBeneficiary(): ?User
    {
        return $this->beneficiary;
    }
    public function setBeneficiary(User $beneficiary): self
    {
        $this->beneficiary = $beneficiary;
        return $this;
    }

    public function getFromRemote(): ?bool
    {
        return $this->fromRemote;
    }
    public function setFromRemote(bool $fromRemote): self
    {
        $this->fromRemote = $fromRemote;
        return $this;
    }

    public function getStartDate(): ?\DateTimeImmutable
    {
        return $this->startDate;
    }
    public function setStartDate(\DateTimeImmutable $startDate): self
    {
        $this->startDate = $startDate;
        return $this;
    }

    public function getEndDate(): ?\DateTimeImmutable
    {
        return $this->endDate;
    }
    public function setEndDate(\DateTimeImmutable $endDate): self
    {
        $this->endDate = $endDate;
        return $this;
    }
    public function getBeneficiaryAccepted(): ?bool
    {
        return $this->beneficiaryAccepted;
    }
    public function setBeneficiaryAccepted(bool $beneficiaryAccepted): self
    {
        $this->beneficiaryAccepted = $beneficiaryAccepted;
        return $this;
    }

    public function getStatus(): ?AgreementDetailsStatus
    {
        return $this->status;
    }
    public function setStatus(AgreementDetailsStatus $status): self
    {
        $this->status = $status;
        return $this;
    }
}
