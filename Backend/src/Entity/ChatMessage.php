<?php

namespace App\Entity;

use App\Entity\Chat;
use App\Entity\User;
use App\Repository\ChatMessageRepository;
use Doctrine\ORM\Mapping as ORM;
use DateTimeImmutable;

#[ORM\Entity(repositoryClass: ChatMessageRepository::class)]
#[ORM\Table(name: "chat_messages")]
class ChatMessage
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: "id")]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Chat::class)]
    #[ORM\JoinColumn(name: "chat_id", referencedColumnName: "id", nullable: false, onDelete: "CASCADE")]
    private ?Chat $chat = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: "user_id", referencedColumnName: "id", nullable: false, onDelete: "CASCADE")]
    private ?User $user = null;

    #[ORM\Column(name: "message")]
    private ?string $message = null;

    #[ORM\Column(name: "creation_date", type: "datetime_immutable")]
    private ?\DateTimeImmutable $creationDate = null;

    public function __construct(Chat $chat, User $user, string $message)
    {
        $this->chat = $chat;
        $this->user = $user;
        $this->message = $message;
        $this->creationDate = new DateTimeImmutable();
    }
    
    public function getId(): ?int
    {
        return $this->id;
    }

    public function getChat(): ?Chat
    {
        return $this->chat;
    }

    public function setChat(?Chat $chat): self
    {
        $this->chat = $chat;

        return $this;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): self
    {
        $this->user = $user;

        return $this;
    }

    public function getMessage(): ?string
    {
        return $this->message;
    
    }
        public function setMessage(?string $message): self
    {
        $this->message = $message;

        return $this;
    }

    public function getCreationDate(): ?\DateTimeImmutable
    {
        return $this->creationDate;
    }

}
