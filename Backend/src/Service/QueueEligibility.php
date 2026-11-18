<?php
declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use Doctrine\DBAL\Connection;

final class QueueEligibility
{
    public function __construct(private Connection $db) {}

    public function canRequest(User $user): bool
    {
        return (bool) $this->db->fetchOne("SELECT 1 FROM service_queues q JOIN agreements a ON a.id = q.agreement_created WHERE q.user_id = ? AND q.type = 'OFFER' AND a.status = 'COMPLETED' LIMIT 1", [$user->getId()]);
    }
}
