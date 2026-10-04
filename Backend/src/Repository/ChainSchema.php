<?php

declare(strict_types=1);

namespace App\Repository;

use Doctrine\DBAL\Connection;

/** Explicit, additive DDL: unrelated tables (especially chat) are never touched. */
final class ChainSchema
{
    /** @return list<string> */
    public static function statements(Connection $db): array
    {
        $sql = [];
        $manager = $db->createSchemaManager();
        $tables = $manager->listTableNames();
        $definitions = [
            'proposal_groups' => 'id INT AUTO_INCREMENT PRIMARY KEY, current_offered_service INT NULL, last_requested_service INT NULL, creation_date DATETIME NOT NULL, status VARCHAR(20) NULL, location VARCHAR(255) NULL',
            'group_participants' => 'group_id INT NOT NULL, user_id INT NOT NULL, received_service INT NOT NULL, PRIMARY KEY(group_id, user_id)',
            'service_provision' => 'id INT AUTO_INCREMENT PRIMARY KEY, exchange_group_id INT NULL, service_id INT NULL, location VARCHAR(255) NULL, start_date DATETIME NOT NULL, end_date DATETIME NULL',
            'service_participants' => 'service_provision_id INT NOT NULL, user_id INT NOT NULL, role VARCHAR(20) NOT NULL, PRIMARY KEY(service_provision_id, user_id)',
            'tokens' => 'id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NULL, expiration_date DATETIME NOT NULL',
            'chain_agreements' => 'id INT AUTO_INCREMENT PRIMARY KEY, group_id INT NOT NULL, provider_id INT NOT NULL, recipient_id INT NOT NULL, service_id INT NOT NULL, location VARCHAR(255) NOT NULL, start_at DATETIME NOT NULL, status VARCHAR(10) NOT NULL, created_at DATETIME NOT NULL, decided_at DATETIME NULL, pending_key VARCHAR(80) NULL, UNIQUE KEY chain_pending_agreement_unique(pending_key), INDEX chain_agreement_group_index(group_id), FOREIGN KEY(group_id) REFERENCES proposal_groups(id)',
            'chain_service_reservations' => 'service_id INT PRIMARY KEY, group_id INT NOT NULL, INDEX chain_reservation_group_index(group_id), FOREIGN KEY(service_id) REFERENCES services(id), FOREIGN KEY(group_id) REFERENCES proposal_groups(id)',
        ];
        foreach ($definitions as $table => $definition) {
            if (!in_array($table, $tables, true)) {
                $sql[] = "CREATE TABLE $table ($definition) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
            }
        }
        $columns = [
            'proposal_groups' => [
                'initiator_id' => 'INT NULL', 'offered_service_id' => 'INT NULL', 'requested_service_id' => 'INT NULL',
                'application_status' => 'VARCHAR(24) NULL', 'search_deadline' => 'DATETIME NULL',
                'confirmation_deadline' => 'DATETIME NULL', 'proposed_at' => 'DATETIME NULL',
                'next_search_at' => 'DATETIME NULL', 'cancelled_by_id' => 'INT NULL',
                'cancellation_reason' => 'VARCHAR(255) NULL', 'cancelled_at' => 'DATETIME NULL',
                'completed_at' => 'DATETIME NULL', 'active_search_key' => 'VARCHAR(80) NULL',
            ],
            'group_participants' => [
                'position' => 'INT NULL', 'offered_service_id' => 'INT NULL', 'requested_service_id' => 'INT NULL',
                'decision' => 'VARCHAR(10) NULL', 'confirmed_at' => 'DATETIME NULL',
            ],
            'service_provision' => [
                'agreement_id' => 'INT NULL', 'provider_id' => 'INT NULL', 'recipient_id' => 'INT NULL',
                'received_at' => 'DATETIME NULL', 'received_by_id' => 'INT NULL',
            ],
            'tokens' => ['group_id' => 'INT NULL', 'issued_at' => 'DATETIME NULL'],
        ];
        foreach ($columns as $table => $fields) {
            $existing = in_array($table, $tables, true) ? $manager->listTableColumns($table) : [];
            foreach ($fields as $column => $definition) {
                if (!isset($existing[$column])) {
                    $sql[] = "ALTER TABLE $table ADD $column $definition";
                }
            }
        }
        // A NULL key is not unique in MySQL: historical and finished rows remain valid.
        $indexes = [
            'proposal_groups' => ['chain_active_search_unique' => 'UNIQUE (active_search_key)', 'chain_due_index' => '(application_status, next_search_at)'],
            'group_participants' => ['chain_user_unique' => 'UNIQUE (group_id, user_id)', 'chain_position_unique' => 'UNIQUE (group_id, position)'],
            'service_provision' => ['chain_provision_agreement_unique' => 'UNIQUE (agreement_id)', 'chain_provision_edge_unique' => 'UNIQUE (exchange_group_id, provider_id)'],
            'tokens' => ['chain_token_unique' => 'UNIQUE (group_id, user_id)'],
        ];
        foreach ($indexes as $table => $keys) {
            $existing = in_array($table, $tables, true) ? $manager->listTableIndexes($table) : [];
            foreach ($keys as $name => $definition) {
                if (!isset($existing[$name])) {
                    $unique = str_starts_with($definition, 'UNIQUE ');
                    $fields = $unique ? substr($definition, 7) : $definition;
                    $sql[] = 'CREATE '.($unique ? 'UNIQUE ' : '')."INDEX $name ON $table $fields";
                }
            }
        }
        $relations = [
            'proposal_groups' => ['initiator_id' => 'users', 'offered_service_id' => 'services', 'requested_service_id' => 'services', 'cancelled_by_id' => 'users'],
            'group_participants' => ['group_id' => 'proposal_groups', 'user_id' => 'users', 'received_service' => 'services', 'offered_service_id' => 'services', 'requested_service_id' => 'services'],
            'service_provision' => ['exchange_group_id' => 'proposal_groups', 'service_id' => 'services', 'agreement_id' => 'chain_agreements', 'provider_id' => 'users', 'recipient_id' => 'users', 'received_by_id' => 'users'],
            'service_participants' => ['service_provision_id' => 'service_provision', 'user_id' => 'users'],
            'tokens' => ['user_id' => 'users', 'group_id' => 'proposal_groups'],
            'chain_agreements' => ['provider_id' => 'users', 'recipient_id' => 'users', 'service_id' => 'services'],
        ];
        foreach ($relations as $table => $fields) {
            $existing = in_array($table, $tables, true) ? $manager->listTableForeignKeys($table) : [];
            foreach ($fields as $column => $target) {
                $found = false;
                foreach ($existing as $foreignKey) {
                    $names = array_map(static fn ($name) => $name->toString(), $foreignKey->getReferencingColumnNames());
                    if ($names === [$column]) { $found = true; }
                }
                if (!$found) {
                    $sql[] = "ALTER TABLE $table ADD CONSTRAINT fk_chain_{$table}_{$column} FOREIGN KEY ($column) REFERENCES $target(id)";
                }
            }
        }
        // The dump contains zero dates. They describe unfinished work, not a receipt.
        $sql[] = 'ALTER TABLE service_provision MODIFY end_date DATETIME NULL DEFAULT NULL, MODIFY start_date DATETIME NOT NULL';
        $sql[] = "UPDATE service_provision SET end_date = NULL WHERE CAST(end_date AS CHAR) = '0000-00-00 00:00:00'";
        $sql[] = 'ALTER TABLE tokens MODIFY expiration_date DATETIME NOT NULL';
        $sql[] = 'ALTER TABLE proposal_groups MODIFY creation_date DATETIME NOT NULL';
        return $sql;
    }
}
