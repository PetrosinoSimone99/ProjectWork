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
    #[ORM\ManyToOne(targetEntity: Chat::class)]
    #[ORM\JoinColumn(name: "chat_id", referencedColumnName: "id")]
    private ?Chat $chat = null;

    /*#[ORM\Id]
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: "user_id", referencedColumnName: "id")]
    private ?User $user = null;*/

    #[ORM\Id]
    #[ORM\Column(name: "user_id")]
    private ?int $userId = null;

    #[ORM\Column(name: "last_message_read")]
    private ?int $lastMessageRead = null;

    public function getId(): ?int
    {
        return $this->id;
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

    public function getUserId(): ?int
    {
        return $this->userId;
    }
    public function setUserId(int $userId): self
    {
        $this->userId = $userId;

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
