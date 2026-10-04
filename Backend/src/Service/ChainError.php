<?php

declare(strict_types=1);

namespace App\Service;

final class ChainError extends \RuntimeException
{
    public function __construct(string $message, public readonly int $status = 409)
    {
        parent::__construct($message);
    }
}
