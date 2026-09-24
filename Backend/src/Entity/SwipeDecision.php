<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/** Stores a decision for one exact reciprocal four-service combination. */
#[ORM\Entity]
#[ORM\Table(name: 'swipe_decisions')]
#[ORM\UniqueConstraint(name: 'swipe_decision_combination_unique', columns: ['actor_id', 'candidate_id', 'actor_offer_id', 'actor_request_id', 'candidate_offer_id', 'candidate_request_id'])]
#[ORM\Index(name: 'swipe_decisions_actor_index', columns: ['actor_id'])]
class SwipeDecision
{
    public const DIRECTION_LEFT = 'LEFT';
    public const DIRECTION_RIGHT = 'RIGHT';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'actor_id', nullable: false, onDelete: 'CASCADE')]
    private User $actor;
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'candidate_id', nullable: false, onDelete: 'CASCADE')]
    private User $candidate;
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'actor_offer_id', nullable: false, onDelete: 'CASCADE')]
    private Service $actorOffer;
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'actor_request_id', nullable: false, onDelete: 'CASCADE')]
    private Service $actorRequest;
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'candidate_offer_id', nullable: false, onDelete: 'CASCADE')]
    private Service $candidateOffer;
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'candidate_request_id', nullable: false, onDelete: 'CASCADE')]
    private Service $candidateRequest;
    #[ORM\Column(length: 5)]
    private string $direction;
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'proposal_id', nullable: true, onDelete: 'SET NULL')]
    private ?Proposal $proposal = null;
    #[ORM\Column(name: 'creation_date')]
    private \DateTimeImmutable $createdAt;

    public function __construct(User $actor, User $candidate, Service $actorOffer, Service $actorRequest, Service $candidateOffer, Service $candidateRequest, string $direction)
    {
        $this->actor = $actor;
        $this->candidate = $candidate;
        $this->actorOffer = $actorOffer;
        $this->actorRequest = $actorRequest;
        $this->candidateOffer = $candidateOffer;
        $this->candidateRequest = $candidateRequest;
        $this->direction = $direction;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getDirection(): string { return $this->direction; }
    public function getProposal(): ?Proposal { return $this->proposal; }
    public function setProposal(Proposal $proposal): void { $this->proposal = $proposal; }
}
