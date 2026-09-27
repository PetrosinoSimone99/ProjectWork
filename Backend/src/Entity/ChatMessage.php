<?php

namespace App\Entity;

use App\Entity\Chat;
use App\Entity\User;
use App\Repository\ChatMessageRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ChatMessageRepository::class)]
#[ORM\Table(name: "chat_messages")]
class ChatMessage
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: "id")]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Chat::class)]
    #[ORM\JoinColumn(name: "chat_id", referencedColumnName: "id")]
    private ?Chat $chat = null;

    #[ORM\Column(name: "user_id")]
    private ?int $userId = null;

    #[ORM\Column(name: "message")]
    private ?string $message = null;

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

    public function getUserId(): ?int
    {
        return $this->userId;
    }

    public function setUserId(?int $userId): self
    {
        $this->userId = $userId;

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

}
