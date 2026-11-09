<?php

namespace App\Entity;

use App\Enum\AgreementStatus;
use App\Repository\AgreementRepository;
use Doctrine\ORM\Mapping as ORM;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

use DateTimeImmutable;

#[ORM\Entity(repositoryClass: AgreementRepository::class)]
#[ORM\Table(name: 'agreements')]
class Agreement
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: 'id')]
    private ?int $id = null;

    #[ORM\Column(name: 'status')]
    private ?AgreementStatus $agreementStatus = null;

    #[ORM\Column(name: 'creation_date', type: 'datetime_immutable')]
    private ?DateTimeImmutable $creationDate = null;
    
    #[ORM\Column(name: 'from_queue')]
    private ?bool $fromQueue = null;

    #[ORM\OneToMany(mappedBy: 'agreement', targetEntity: AgreementProposal::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private collection $agreementProposals;

    #[ORM\OneToMany(mappedBy: 'agreement', targetEntity: AgreementDetails::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private collection $agreementDetails;

    public function __construct(AgreementStatus $agreementStatus, DateTimeImmutable $creationDate, bool $fromQueue){
        $this->agreementStatus = $agreementStatus;
        $this->creationDate = $creationDate;
        $this->fromQueue = $fromQueue;
        $this->agreementProposals = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getAgreementStatus(){
        return $this->agreementStatus;
    }

    public function setAgreementStatus(AgreementStatus $agreementStatus){
        $this->agreementStatus = $agreementStatus;

        return $this;
    }

    public function getCreationDate(){
        return $this->creationDate;
    }

    public function getFromQueue(){
        return $this->fromQueue;
    }

    public function setFromQueue(bool $fromQueue){
        $this->fromQueue = $fromQueue;

        return $this;
    }
    public function getAgreementProposals(): Collection
    {
        return $this->agreementProposals;
    }

    public function addAgreementProposal(AgreementProposal $agreementProposal){
        if(!$this->agreementProposals->contains($agreementProposal)){
            $this->agreementProposals[] = $agreementProposal;
            $agreementProposal->setAgreement($this);
        }
        return $this;
    }
    public function getAgreementDetails(): Collection
    {
        return $this->agreementDetails;
    }
    public function addAgreementDetails(AgreementDetails $agreementDetails){
        if(!$this->agreementDetails->contains($agreementDetails)){
            $this->agreementDetails[] = $agreementDetails;
            $agreementDetails->setAgreement($this);
        }
        return $this;
    }

}
