<?php

namespace App\Entity;

use App\Enum\ExchangeMutualStatus;
use App\Repository\MutualExchangeRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: MutualExchangeRepository::class)]
#[ORM\Table(name: 'exchange_mutual')]
class ExchangeMutual
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: 'id')]
    private ?int $id = null;

    #[ORM\Column(name: 'proposal_id')]
    private ?int $proposalId = null;

    #[ORM\Column(name: 'status', type: 'string', enumType: ExchangeMutualStatus::class)]
    private ?ExchangeMutualStatus $status = null;

    #[ORM\Column(name:'creation_date', type: 'datetime')]
    private ?\DateTimeInterface $creationDate = null;

    //This probably isn't needed. A separate entity is enough for a simple implementation.
    /** @var Collection<int, ExchangeParticipant> */
    #[ORM\OneToMany(
    targetEntity: ExchangeParticipant::class,
    mappedBy: 'exchange',
    cascade: ['persist'],
    orphanRemoval: true,
    )]
    private Collection $exchangeParticipants;

    public function __construct(?int $proposalId, ?ExchangeMutualStatus $status, ?\DateTimeInterface $creationDate)
    {
        $this->proposalId = $proposalId;
        $this->status = $status;
        $this->creationDate = $creationDate;
        $this->exchangeParticipants = new ArrayCollection();
    }
    
    public function getId(): ?int
    {
        return $this->id;
    }

    public function getProposalId(): ?int
    {
        return $this->proposalId;
    }
    public function setProposalId(?int $proposalId): self
    {
        $this->proposalId = $proposalId;

        return $this;
    }

    public function getStatus(): ?ExchangeMutualStatus
    {
        return $this->status;
    }

    public function setStatus(?ExchangeMutualStatus $status): self
    {
        $this->status = $status;

        return $this;
    }

    public function getCreationDate(): ?\DateTimeInterface
    {
        return $this->creationDate;
    }

    public function setCreationDate(?\DateTimeInterface $creationDate): self
    {
        $this->creationDate = $creationDate;

        return $this;
    }
}
