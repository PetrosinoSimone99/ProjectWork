<?php

namespace App\Repository;

use App\Entity\AgreementDetails;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AgreementDetails>
 */
class AgreementDetailsRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AgreementDetails::class);
    }
    public function getAgreementDetails(int $agreementId): array
    {
        return $this->createQueryBuilder('ad')
            ->where('ad.agreement = :agreementId')
            ->setParameter('agreementId', $agreementId)
            ->getQuery()
            ->getResult();
    }
}
