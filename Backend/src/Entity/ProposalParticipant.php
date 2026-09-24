<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/** Links a proposal participant to the service that participant offers. */
#[ORM\Entity]
#[ORM\Table(name: 'proposal_participants')]
#[ORM\UniqueConstraint(name: 'proposal_participant_unique', columns: ['proposal_id', 'user_id', 'service_id'])]
#[ORM\Index(name: 'proposal_participants_user_index', columns: ['user_id'])]
class ProposalParticipant
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'participants')]
    #[ORM\JoinColumn(name: 'proposal_id', nullable: false, onDelete: 'CASCADE')]
    private Proposal $proposal;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'user_id', nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'service_id', nullable: false, onDelete: 'CASCADE')]
    private Service $service;

    #[ORM\Column(name: 'confirmation_date', nullable: true)]
    private ?\DateTimeImmutable $confirmedAt = null;

    public function __construct(Proposal $proposal, User $user, Service $service, bool $confirmed = false)
    {
        $this->proposal = $proposal;
        $this->user = $user;
        $this->service = $service;
        if ($confirmed) {
            $this->confirmedAt = new \DateTimeImmutable();
        }
    }

    public function getUser(): User { return $this->user; }
    public function getService(): Service { return $this->service; }
    public function getProposal(): Proposal { return $this->proposal; }
    public function isConfirmed(): bool { return $this->confirmedAt !== null; }
    public function confirm(): void { $this->confirmedAt ??= new \DateTimeImmutable(); }
}
