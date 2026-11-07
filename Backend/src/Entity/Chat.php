<?php
declare(strict_types=1);

namespace App\Entity;

use App\Entity\ChatParticipant;
use App\Repository\ChatRepository;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity(repositoryClass: ChatRepository::class)]
#[ORM\Table(name: "chat")]
class Chat
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: "id")]
    private ?int $id = null;
    
    #[ORM\Column(name: "agreement_id")]
    private ?int $agreementId = null;

    /** @var Collection<int, ChatParticipant> */
    #[ORM\OneToMany(
        targetEntity: ChatParticipant::class,
        mappedBy: 'chat',
        cascade: ['persist'],
        orphanRemoval: true,
    )]
    private Collection $chatParticipants;

    public function __construct(int $agreementId)
    {
        $this->agreementId = $agreementId;
        $this->chatParticipants = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function setId(?int $id): self
    {
        $this->id = $id;

        return $this;
    }

    public function getAgreementId(): ?int
    {
        return $this->agreementId;
    }
    
    public function setAgreementId(?int $agreementId): self
    {
        $this->agreementId = $agreementId;

        return $this;
    }

    public function getChatParticipants(): Collection
    {
        return $this->chatParticipants;
    }

    public function addChatParticipant(ChatParticipant $chatParticipant): self
    {
        if (!$this->chatParticipants->contains($chatParticipant)) {
            $this->chatParticipants[] = $chatParticipant;
            $chatParticipant->setChat($this);
        }

        return $this;
    }
}
