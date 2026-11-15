<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Notification;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

/** Creates notifications; callers decide which business events need one. */
final class NotificationService
{
    public function __construct(private EntityManagerInterface $em, private Clock $clock) {}

    public function notify(User $recipient, string $type, string $message, ?array $data = null): Notification
    {
        $notification = new Notification($recipient, $type, $message, $data, $this->clock->now());
        $this->em->persist($notification);
        // This also flushes other pending changes. Use a caller transaction for atomic work.
        $this->em->flush();
        return $notification;
    }
}
