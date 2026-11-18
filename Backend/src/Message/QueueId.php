<?php

namespace App\Message;

class QueueId
{
    private string $id;

    public function __construct(int|string $id)
    {
        $this->id = (string) $id;
    }

    public function getId(): string
    {
        return $this->id;
    }
}