<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\UserReport;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\Tools\Pagination\Paginator;
use Doctrine\Persistence\ManagerRegistry;

/** Loads report authors, targets and reviewers together for the staff list. */
class UserReportRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserReport::class);
    }

    public function paginateForStaff(int $page, int $limit, ?string $status, ?int $reporterId, ?int $reportedUserId): Paginator
    {
        $query = $this->createQueryBuilder('report')
            ->join('report.reporter', 'reporter')->addSelect('reporter')
            ->join('report.reportedUser', 'target')->addSelect('target')
            ->leftJoin('report.reviewedBy', 'reviewer')->addSelect('reviewer')
            ->orderBy('report.createdAt', 'DESC')->addOrderBy('report.id', 'DESC');
        if ($status !== null) {
            $query->andWhere('report.status = :status')->setParameter('status', $status);
        }
        if ($reporterId !== null) {
            $query->andWhere('reporter.id = :reporterId')->setParameter('reporterId', $reporterId);
        }
        if ($reportedUserId !== null) {
            $query->andWhere('target.id = :targetId')->setParameter('targetId', $reportedUserId);
        }
        $query->setFirstResult(($page - 1) * $limit)->setMaxResults($limit);
        return new Paginator($query, false);
    }
}
