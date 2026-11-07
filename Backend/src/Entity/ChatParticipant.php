<?php

namespace App\Entity;

use App\Entity\Chat;
use App\Entity\User;
use App\Repository\ChatParticipantRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ChatParticipantRepository::class)]
#[ORM\Table(name: "chat_participants")]
class ChatParticipant
{
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Chat::class, inversedBy: 'chatParticipants')]
    #[ORM\JoinColumn(name: "chat_id", referencedColumnName: "id")]
    private ?Chat $chat = null;

    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: "user_id", referencedColumnName: "id")]
    private ?User $user = null;

    #[ORM\Column(name: "last_message_read")]
    private ?int $lastMessageRead = null;

    public function __construct(Chat $chat, User $user)
    {
        $this->chat = $chat;
        $this->user = $user;
        $this->lastMessageRead = 0; // Initialize to 0 or any other default value
    }
    public function getChat(): ?Chat
    {
        return $this->chat;
    }
    public function setChat(Chat $chat): self
    {
        $this->chat = $chat;

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

    public function getLastMessageRead(): ?int
    {
        return $this->lastMessageRead;
    }
    
    public function setLastMessageRead(int $lastMessageRead): self
    {
        $this->lastMessageRead = $lastMessageRead;

        return $this;
    }
}
