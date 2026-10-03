<?php

declare(strict_types=1);

namespace App\Service;

/** Injecting a clock makes deadline tests independent of the computer's clock. */
class ChainClock
{
    public function now(): \DateTimeImmutable
    {
        return new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
    }
}
