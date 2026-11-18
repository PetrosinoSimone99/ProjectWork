<?php
declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261118000100 extends AbstractMigration
{
    public function getDescription(): string { return 'Enforce service/queue slots and persist proposal services and queue dates.'; }

    public function up(Schema $schema): void
    {
        $duplicates = $this->connection->fetchAllAssociative('SELECT user_id, type, COUNT(*) AS total FROM services WHERE deleted_at IS NULL GROUP BY user_id, type HAVING COUNT(*) > 1');
        $queues = $this->connection->fetchAllAssociative("SELECT user_id, COUNT(*) AS total FROM service_queues WHERE status IN ('OPEN','IN_PROGRESS') GROUP BY user_id HAVING COUNT(*) > 1");
        $this->abortIf($duplicates !== [] || $queues !== [], 'Resolve duplicate service/queue slots before migrating: '.json_encode(['services' => $duplicates, 'queues' => $queues]));
        $this->addSql("ALTER TABLE services ADD active_type VARCHAR(10) GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN type ELSE NULL END) VIRTUAL, ADD UNIQUE INDEX service_active_slot_unique (user_id, active_type)");
        $this->addSql("ALTER TABLE service_queues MODIFY location VARCHAR(255) DEFAULT NULL, ADD created_at DATETIME DEFAULT NULL, ADD active_marker INT GENERATED ALWAYS AS (CASE WHEN status IN ('OPEN','IN_PROGRESS') THEN 1 ELSE NULL END) VIRTUAL, ADD UNIQUE INDEX queue_active_user_unique (user_id, active_marker)");
        // Existing queue creation times are unknown: retain NULL rather than invent history.
        $this->addSql('ALTER TABLE agreement_proposal ADD service_id INT DEFAULT NULL, ADD INDEX proposal_service_index (service_id), ADD CONSTRAINT proposal_service_fk FOREIGN KEY (service_id) REFERENCES services (id)');
        $this->addSql('UPDATE agreement_proposal p JOIN agreement_details d ON d.agreement_id = p.agreement_id AND d.provider_id = p.user_id SET p.service_id = d.service_provided');
        $this->addSql("UPDATE agreement_proposal p JOIN agreements a ON a.id = p.agreement_id JOIN services s ON s.user_id = p.user_id AND s.type = 'OFFER' AND s.deleted_at IS NULL SET p.service_id = s.id WHERE a.status = 'PENDING' AND p.service_id IS NULL");
        $this->addSql('ALTER TABLE agreements ADD pending_pair_key VARCHAR(80) DEFAULT NULL');
        // Retain historical duplicate proposals; the application rejects further duplicates.
        $this->addSql('CREATE UNIQUE INDEX agreement_pending_pair_unique ON agreements (pending_pair_key)');
        $this->addSql('ALTER TABLE agreement_details MODIFY start_date DATETIME DEFAULT NULL, MODIFY end_date DATETIME DEFAULT NULL');
        $this->addSql('ALTER TABLE agreement_proposal MODIFY response_date DATETIME DEFAULT NULL');
        foreach (['users', 'services', 'service_queues'] as $table) {
            foreach ($this->connection->fetchAllAssociative("SELECT id, location FROM $table WHERE location IS NOT NULL") as $row) {
                $location = \App\Service\LocationNormalizer::normalize($row['location']);
                if ($location !== $row['location']) { $this->addSql("UPDATE $table SET location = ? WHERE id = ?", [$location, $row['id']]); }
            }
        }
        $this->addSql('CREATE TABLE login_attempts (attempt_key VARCHAR(64) PRIMARY KEY, failures INT NOT NULL, expires_at BIGINT NOT NULL)');
    }

    public function isTransactional(): bool { return false; }
    public function down(Schema $schema): void { $this->throwIrreversibleMigrationException('Workflow history must be preserved.'); }
}
