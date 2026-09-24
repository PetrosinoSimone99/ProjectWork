<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

/** A pending direct exchange that becomes a match when its recipient accepts. */
#[ORM\Entity]
#[ORM\Table(name: 'proposals')]
#[ORM\UniqueConstraint(name: 'proposal_offer_pair_unique', columns: ['offer_pair_key'])]
#[ORM\Index(name: 'proposals_status_created_index', columns: ['status', 'creation_date'])]
class Proposal
{
    public const STATUS_PENDING = 'PENDING';
    public const STATUS_ACCEPTED = 'ACCEPTED';
    public const STATUS_REJECTED = 'REJECTED';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 10)]
    private string $status = self::STATUS_PENDING;

    // A canonical pair of offered-service IDs prevents a reversed simultaneous swipe from creating a second proposal.
    #[ORM\Column(name: 'offer_pair_key', length: 50, unique: true)]
    private string $offerPairKey;

    #[ORM\Column(name: 'creation_date')]
    private \DateTimeImmutable $createdAt;

    /** @var Collection<int, ProposalParticipant> */
    #[ORM\OneToMany(mappedBy: 'proposal', targetEntity: ProposalParticipant::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $participants;

    public function __construct(string $offerPairKey)
    {
        $this->offerPairKey = $offerPairKey;
        $this->createdAt = new \DateTimeImmutable();
        $this->participants = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }
    public function getStatus(): string { return $this->status; }
    public function getOfferPairKey(): string { return $this->offerPairKey; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function setStatus(string $status): void { $this->status = $status; }
    /** @return Collection<int, ProposalParticipant> */
    public function getParticipants(): Collection { return $this->participants; }
    public function addParticipant(ProposalParticipant $participant): void { $this->participants->add($participant); }
}
