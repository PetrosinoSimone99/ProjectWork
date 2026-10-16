<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\StaffOperationLog;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\Tools\Pagination\Paginator;
use Doctrine\Persistence\ManagerRegistry;

final class StaffOperationLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, StaffOperationLog::class);
    }

    public function paginate(array $filters): Paginator
    {
        $query = $this->createQueryBuilder('operation')
            ->orderBy('operation.createdAt', 'DESC')->addOrderBy('operation.id', 'DESC');
        foreach (['staffId', 'action', 'targetType', 'targetId'] as $field) {
            if (isset($filters[$field])) {
                $query->andWhere('operation.'.$field.' = :'.$field)->setParameter($field, $filters[$field]);
            }
        }
        $query->setFirstResult(($filters['page'] - 1) * $filters['limit'])->setMaxResults($filters['limit']);
        return new Paginator($query, false);
    }
}
