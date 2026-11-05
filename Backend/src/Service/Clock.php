<?php

declare(strict_types=1);

namespace App\Service;

/** Supplies UTC timestamps for staff history. */
class Clock
{
    public function now(): \DateTimeImmutable
    {
        return new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
    }
}
