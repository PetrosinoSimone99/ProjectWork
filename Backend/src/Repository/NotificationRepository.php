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
    /** Rows per stream tick: a batch larger than this arrives in two ticks. */
    private const STREAM_PAGE = 50;

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

    /**
     * The live stream's page: rows newer than the client's cursor, oldest first.
     *
     * Ordered by id and never by date: the cursor is an id, so ordering by date
     * could hand the client a row behind the cursor and drop it silently.
     *
     * @return list<Notification>
     */
    public function findNewerThan(User $recipient, int $afterId): array
    {
        return $this->createQueryBuilder('notification')
            ->where('notification.recipient = :recipient')->setParameter('recipient', $recipient)
            ->andWhere('notification.id > :afterId')->setParameter('afterId', $afterId)
            ->orderBy('notification.id', 'ASC')
            ->setMaxResults(self::STREAM_PAGE)
            ->getQuery()
            ->getResult();
    }

    /** Highest notification id of one recipient, `0` when the inbox is empty. */
    public function newestIdFor(User $recipient): int
    {
        $newest = $this->createQueryBuilder('notification')
            ->select('MAX(notification.id)')
            ->where('notification.recipient = :recipient')->setParameter('recipient', $recipient)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $newest;
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
