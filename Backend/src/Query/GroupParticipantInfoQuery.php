<?php
declare(strict_types=1);

namespace App\Query;

use Doctrine\DBAL\Connection;

use App\DTO\GroupParticipantDTO;

class GroupParticipantInfoQuery
{
    private Connection $connection;

    public function __construct(Connection $connection){
        $this->connection = $connection;
    }

    public function getServiceProviderForUser(int $groupProposalId, int $userId): ?GroupParticipantDTO
    {
        $query ='SELECT gp.user_id as "beneficiary", s.user_id as "provider"
                FROM group_participants gp JOIN services s ON gp.received_service = s.id
                WHERE gp.group_id = :groupProposalId AND gp.user_id = :userId';
        $result = $this->connection->executeQuery($query, [
            'groupProposalId' => $groupProposalId,
            'userId' => $userId])
            ->fetchAssociative();
        
        if (!$result) {
            return null;
        }

        return new GroupParticipantDTO((int) $result['beneficiary'], (int) $result['provider']);
    }

    public function getBeneficiaryForUserService(int $groupProposalId, int $userId): ?GroupParticipantDTO
    {
        $query = 'SELECT gp.user_id as "beneficiary", s.user_id as "provider"
                FROM group_participants gp JOIN services s ON gp.received_service = s.id
                WHERE gp.group_id = :groupProposalId AND s.user_id = :userId';
        
        $result = $this->connection->executeQuery($query, [
            'groupProposalId' => $groupProposalId,
            'userId' => $userId])
            ->fetchAssociative();

        if (!$result) {
            return null;
        }

        return new GroupParticipantDTO((int) $result['beneficiary'], (int) $result['provider']);
    }
}