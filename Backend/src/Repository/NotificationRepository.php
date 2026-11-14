<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Notification;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\Tools\Pagination\Paginator;
use Doctrine\Persistence\ManagerRegistry;

final class NotificationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Notification::class);
    }

    public function paginate(User $recipient, int $page, int $limit, bool $unreadOnly): Paginator
    {
        $query = $this->createQueryBuilder('notification')
            ->where('notification.recipient = :recipient')->setParameter('recipient', $recipient)
            ->orderBy('notification.createdAt', 'DESC')->addOrderBy('notification.id', 'DESC')
            ->setFirstResult(($page - 1) * $limit)->setMaxResults($limit);
        if ($unreadOnly) {
            $query->andWhere('notification.readAt IS NULL');
        }
        return new Paginator($query, false);
    }

    public function findOwned(int $id, User $recipient): ?Notification
    {
        return $this->findOneBy(['id' => $id, 'recipient' => $recipient]);
    }

    public function countUnread(User $recipient): int
    {
        return $this->count(['recipient' => $recipient, 'readAt' => null]);
    }

    public function markRead(Notification $notification, \DateTimeImmutable $now): void
    {
        // The condition preserves the first timestamp even if two requests overlap.
        $this->getEntityManager()->createQueryBuilder()
            ->update(Notification::class, 'notification')
            ->set('notification.readAt', ':now')
            ->where('notification.id = :id')->andWhere('notification.readAt IS NULL')
            ->setParameter('now', $now, 'datetime_immutable')->setParameter('id', $notification->getId())
            ->getQuery()->execute();
        // Bulk updates bypass managed objects, so reload before returning JSON.
        $this->getEntityManager()->refresh($notification);
    }
}
