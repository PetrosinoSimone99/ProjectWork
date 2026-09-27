<?php
declare(strict_types=1);

namespace App\Entity;
use App\Entity\Proposal;

use App\Repository\ChatRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ChatRepository::class)]
#[ORM\Table(name: "chat")]
class Chat
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: "id")]
    private ?int $id = null;
    
    #[ORM\Column(name: "proposal_mutual_id")]
    private ?int $proposalMutualId = null;

    #[ORM\Column(name: "proposal_group_id")]
    private ?int $proposalGroupId = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function setId(?int $id): self
    {
        $this->id = $id;

        return $this;
    }

    public function getProposalMutualId(): ?int
    {
        return $this->proposalMutualId;
    }
    public function setProposalMutualId(?int $proposalMutualId): self
    {
        $this->proposalMutualId = $proposalMutualId;

        return $this;
    }

    public function getProposalGroupId(): ?int
    {
        return $this->proposalGroupId;
    }
    public function setProposalGroupId(?int $proposalGroupId): self
    {
        $this->proposalGroupId = $proposalGroupId;

        return $this;
    }

}
