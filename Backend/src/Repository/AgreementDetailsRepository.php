<?php

namespace App\Repository;

use App\Entity\AgreementDetails;
use App\Entity\User;
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

    public function getAgreementDetailsByBeneficiary(int $agreementId, User $beneficiary): ?AgreementDetails
    {
        return $this->createQueryBuilder('ad')
            ->where('ad.agreement = :agreementId')
            ->andWhere('ad.beneficiary = :beneficiary')
            ->setParameter('agreementId', $agreementId)
            ->setParameter('beneficiary', $beneficiary)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function getAgreementDetailsByUser(int $agreementId, User $user): ?AgreementDetails
    {
        return $this->createQueryBuilder('ad')
            ->where('ad.agreement = :agreementId')
            ->andWhere('ad.user = :user')
            ->setParameter('agreementId', $agreementId)
            ->setParameter('user', $user)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
