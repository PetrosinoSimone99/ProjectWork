<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Service;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\Tools\Pagination\Paginator;
use Doctrine\Persistence\ManagerRegistry;

/**
 * Contains database queries specific to marketplace services.
 *
 * Keeping this query outside the controller makes it easier to test and keeps
 * HTTP validation separate from the database rules used to build the catalog.
 *
 * @extends ServiceEntityRepository<Service>
 */
final class ServiceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry, private Connection $db)
    {
        parent::__construct($registry, Service::class);
    }

    /** @return list<Service> */
    public function findOwnedOffers(User $owner): array
    {
        return $this->findOwnedServices($owner, Service::TYPE_OFFER);
    }

    /** @return list<Service> */
    public function findOwnedRequests(User $owner): array
    {
        return $this->findOwnedServices($owner, Service::TYPE_REQUEST);
    }

    /** @return list<Service> */
    private function findOwnedServices(User $owner, string $type): array
    {
        return $this->createQueryBuilder('service')
            ->select('service, category')
            ->leftJoin('service.categories', 'category')
            ->andWhere('service.user = :owner')
            ->andWhere('service.type = :type')
            ->andWhere('service.deletedAt IS NULL')
            ->setParameter('owner', $owner)
            ->setParameter('type', $type)
            ->orderBy('service.createdAt', 'DESC')
            ->addOrderBy('service.id', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /** Returns only deleted services, optionally limited to one owner or type. */
    public function paginateDeleted(int $page, int $limit, ?int $ownerId, ?string $type): Paginator
    {
        $query = $this->createQueryBuilder('service')
            ->select('service, owner, category')
            ->innerJoin('service.user', 'owner')
            ->leftJoin('service.categories', 'category')
            ->andWhere('service.deletedAt IS NOT NULL')
            ->orderBy('service.deletedAt', 'DESC')
            ->addOrderBy('service.id', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit);
        if ($ownerId !== null) {
            $query->andWhere('owner.id = :ownerId')->setParameter('ownerId', $ownerId);
        }
        if ($type !== null) {
            $query->andWhere('service.type = :type')->setParameter('type', $type);
        }
        return new Paginator($query, true);
    }

    /** Must be called inside the transaction that edits, deletes or restores this service. */
    public function lockForUpdate(int $id): void
    {
        $suffix = $this->db->getDatabasePlatform() instanceof \Doctrine\DBAL\Platforms\SQLitePlatform ? '' : ' FOR UPDATE';
        $this->db->fetchOne('SELECT id FROM services WHERE id = ?'.$suffix, [$id]);
    }

    public function existsNotDeleted(int $id): bool
    {
        $suffix = $this->db->getDatabasePlatform() instanceof \Doctrine\DBAL\Platforms\SQLitePlatform ? '' : ' FOR UPDATE';
        return $this->db->fetchOne('SELECT id FROM services WHERE id = ? AND deleted_at IS NULL'.$suffix, [$id]) !== false;
    }

    /** Protect agreement history and queues from service mutations. */
    public function isInUse(int $serviceId): bool
    {
        $tables = $this->db->createSchemaManager()->listTableNames();
        $suffix = $this->db->getDatabasePlatform() instanceof \Doctrine\DBAL\Platforms\SQLitePlatform ? '' : ' FOR UPDATE';
        // These are the service references in the dump selected by LAST_DB_TO_USE.txt.
        $references = [
            'agreement_details' => ['service_provided'],
            'service_queues' => ['service_id'],
        ];

        foreach ($references as $table => $columns) {
            if (!in_array($table, $tables, true)) {
                continue;
            }
            $existingColumns = $this->db->createSchemaManager()->listTableColumns($table);
            foreach ($columns as $column) {
                if (isset($existingColumns[$column])
                    && $this->db->fetchOne("SELECT 1 FROM $table WHERE $column = ? LIMIT 1$suffix", [$serviceId]) !== false) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Returns one page of offers visible on the homepage.
     *
     * The joins fetch the owner and every category in the same database query.
     * A second category join is used only when filtering: it selects matching
     * offers without hiding their other categories from the API response.
     *
     * @param list<int> $categoryIds
     */
    public function paginateHomepageOffers(
        User $viewer,
        ?string $searchText,
        array $categoryIds,
        ?string $location,
        string $sort,
        int $page,
        int $limit,
        ?bool $isRemote = null,
    ): Paginator {
        $queryBuilder = $this->createQueryBuilder('service')
            ->select('DISTINCT service, owner, category')
            ->innerJoin('service.user', 'owner')
            ->leftJoin('service.categories', 'category')
            ->andWhere('service.type = :offerType')
            ->andWhere('service.deletedAt IS NULL')
            ->andWhere('service.isSuspended = false')
            ->andWhere('owner.accountStatus = :activeStatus')
            ->andWhere('owner != :viewer')
            ->setParameter('offerType', Service::TYPE_OFFER)
            ->setParameter('activeStatus', User::STATUS_ACTIVE)
            ->setParameter('viewer', $viewer);

        if ($isRemote !== null) {
            $queryBuilder
                ->andWhere('service.isRemote = :isRemote')
                ->setParameter('isRemote', $isRemote);
        }

        if ($searchText !== null) {
            $queryBuilder
                ->andWhere('LOWER(service.description) LIKE :searchText')
                ->setParameter('searchText', '%'.mb_strtolower($searchText).'%');
        }

        if ($location !== null) {
            $queryBuilder
                ->andWhere('LOWER(service.location) LIKE :location')
                ->setParameter('location', '%'.mb_strtolower($location).'%');
        }

        if ($categoryIds !== []) {
            $queryBuilder
                ->innerJoin('service.categories', 'matchingCategory')
                ->andWhere('matchingCategory.id IN (:categoryIds)')
                ->setParameter('categoryIds', $categoryIds);
        }

        $preferredCategoryIds = $this->findDesiredCategoryIds($viewer);
        if ($preferredCategoryIds !== []) {
            // A subquery checks membership without duplicating offers with several categories.
            $matchingOffers = $this->createQueryBuilder('preferredService')
                ->select('preferredService.id')
                ->innerJoin('preferredService.categories', 'preferredCategory')
                ->where('preferredCategory.id IN (:preferredCategoryIds)');

            // Sort the whole catalog before pagination, so all preferred offers come first.
            // HIDDEN keeps this internal priority out of the API response.
            $queryBuilder
                ->addSelect('CASE WHEN service.id IN ('.$matchingOffers->getDQL().') THEN 0 ELSE 1 END AS HIDDEN preferencePriority')
                ->setParameter('preferredCategoryIds', $preferredCategoryIds)
                ->orderBy('preferencePriority', 'ASC');
        }

        $queryBuilder
            ->addOrderBy('service.createdAt', $sort === 'oldest' ? 'ASC' : 'DESC')
            // The ID makes pagination stable when two services share the same timestamp.
            ->addOrderBy('service.id', $sort === 'oldest' ? 'ASC' : 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit);

        return new Paginator($queryBuilder, true);
    }

    /** @return list<int> Categories the viewer currently wants, as defined by their requests. */
    private function findDesiredCategoryIds(User $viewer): array
    {
        $rows = $this->createQueryBuilder('request')
            ->select('DISTINCT desiredCategory.id AS id')
            ->innerJoin('request.categories', 'desiredCategory')
            ->where('request.user = :viewer')
            ->andWhere('request.type = :requestType')
            ->andWhere('request.deletedAt IS NULL')
            ->andWhere('request.isSuspended = false')
            ->setParameter('viewer', $viewer)
            ->setParameter('requestType', Service::TYPE_REQUEST)
            ->getQuery()
            ->getScalarResult();

        return array_map(static fn (array $row): int => (int) $row['id'], $rows);
    }

    public function findUserOfferedService(User $user): ?Service
    {
        return $this->createQueryBuilder('service')
            ->andWhere('service.user = :user')
            ->andWhere('service.type = :offerType')
            ->andWhere('service.deletedAt IS NULL')
            ->setParameter('user', $user)
            ->setParameter('offerType', Service::TYPE_OFFER)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
