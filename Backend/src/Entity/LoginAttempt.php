<?php
declare(strict_types=1);
namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/** Counters are updated atomically by LoginThrottle, never through the ORM. */
#[ORM\Entity]
#[ORM\Table(name: 'login_attempts')]
class LoginAttempt
{
    #[ORM\Id]
    #[ORM\Column(name: 'attempt_key', length: 64)]
    private string $attemptKey;
    #[ORM\Column]
    private int $failures = 0;
    #[ORM\Column(name: 'expires_at', type: 'bigint')]
    private int $expiresAt;
}
