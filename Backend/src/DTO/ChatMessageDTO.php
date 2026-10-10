<?php

declare(strict_types=1);

namespace App\DTO;

use App\Entity\ChatMessage;
use App\Entity\User;

class ChatMessageDTO
{   
    private readonly ?int $id;
    private readonly ?string $username;
    private readonly ?string $message;
    private readonly ?\DateTimeInterface $creationDate;

    public function __construct(?int $id, ?string $username, ?string $message, ?\DateTimeInterface $creationDate)
    {
        $this->id = $id;
        $this->username = $username;
        $this->message = $message;
        $this->creationDate = $creationDate;
    }
    public function getId(): ?int
    {
        return $this->id;
    }
    public function getUsername(): ?string
    {
        return $this->username;
    }
    public function getMessage(): ?string
    {
        return $this->message;
    }
    public function getCreationDate(): ?\DateTimeInterface
    {
        return $this->creationDate;
    }
}