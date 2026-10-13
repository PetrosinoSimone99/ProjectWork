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
        return $this->createQueryBuilder('service')
            ->select('service, category')
            ->leftJoin('service.categories', 'category')
            ->andWhere('service.user = :owner')
            ->andWhere('service.type = :offerType')
            ->setParameter('owner', $owner)
            ->setParameter('offerType', Service::TYPE_OFFER)
            ->orderBy('service.createdAt', 'DESC')
            ->addOrderBy('service.id', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /** Checks every table that can keep an offer tied to a proposal or exchange. */
    public function isInUse(int $serviceId): bool
    {
        $tables = $this->db->createSchemaManager()->listTableNames();
        $suffix = $this->db->getDatabasePlatform() instanceof \Doctrine\DBAL\Platforms\SQLitePlatform ? '' : ' FOR UPDATE';
        $references = [
            'proposal_participants' => ['service_id'],
            'exchange_participants' => ['service_id'],
            'proposal_groups' => ['current_offered_service', 'last_requested_service', 'offered_service_id', 'requested_service_id'],
            'group_participants' => ['received_service', 'offered_service_id', 'requested_service_id'],
            'service_provision' => ['service_id'],
            'chain_agreements' => ['service_id'],
            'chain_service_reservations' => ['service_id'],
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
    ): Paginator {
        $queryBuilder = $this->createQueryBuilder('service')
            ->select('DISTINCT service, owner, category')
            ->innerJoin('service.user', 'owner')
            ->leftJoin('service.categories', 'category')
            ->andWhere('service.type = :offerType')
            ->andWhere('owner.accountStatus = :activeStatus')
            ->andWhere('owner != :viewer')
            ->setParameter('offerType', Service::TYPE_OFFER)
            ->setParameter('activeStatus', User::STATUS_ACTIVE)
            ->setParameter('viewer', $viewer);

        if ($searchText !== null) {
            $queryBuilder
                ->andWhere('LOWER(service.description) LIKE :searchText')
                ->setParameter('searchText', '%'.mb_strtolower($searchText).'%');
        }

        if ($location !== null) {
            $queryBuilder
                ->andWhere('LOWER(owner.location) LIKE :location')
                ->setParameter('location', '%'.mb_strtolower($location).'%');
        }

        if ($categoryIds !== []) {
            $queryBuilder
                ->innerJoin('service.categories', 'matchingCategory')
                ->andWhere('matchingCategory.id IN (:categoryIds)')
                ->setParameter('categoryIds', $categoryIds);
        }

        $queryBuilder
            ->orderBy('service.createdAt', $sort === 'oldest' ? 'ASC' : 'DESC')
            // The ID makes pagination stable when two services share the same timestamp.
            ->addOrderBy('service.id', $sort === 'oldest' ? 'ASC' : 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit);

        return new Paginator($queryBuilder, true);
    }
}
