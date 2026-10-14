<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Doctrine\ORM\Tools\Pagination\Paginator;

/** Queries used by authentication and the staff user list. */
class UserRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    public function findOneByUsernameOrEmail(string $username, string $email): ?User
    {
        return $this->createQueryBuilder('user')
            ->where('user.username = :username OR user.email = :email')
            ->setParameter('username', $username)
            ->setParameter('email', $email)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function paginateForStaff(int $page, int $limit, ?string $search, ?string $status): Paginator
    {
        $query = $this->createQueryBuilder('user')->orderBy('user.id', 'ASC');
        if ($search !== null && $search !== '') {
            $query->andWhere('LOWER(user.name) LIKE :search OR LOWER(user.surname) LIKE :search OR LOWER(user.username) LIKE :search OR LOWER(user.email) LIKE :search')
                ->setParameter('search', '%'.mb_strtolower($search).'%');
        }
        if ($status !== null) {
            $query->andWhere('user.accountStatus = :status')->setParameter('status', $status);
        }
        $query->setFirstResult(($page - 1) * $limit)->setMaxResults($limit);
        return new Paginator($query, false);
    }
}
