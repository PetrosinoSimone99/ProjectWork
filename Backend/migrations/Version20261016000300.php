<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261016000300 extends AbstractMigration
{
    public function getDescription(): string { return 'Keep a read-only history of staff changes.'; }

    public function up(Schema $schema): void
    {
        // No foreign keys: historical identities and targets must survive deletion.
        $this->addSql('CREATE TABLE staff_operation_logs (id INT AUTO_INCREMENT NOT NULL, staff_id INT NOT NULL, staff_username VARCHAR(30) NOT NULL, action VARCHAR(32) NOT NULL, target_type VARCHAR(10) NOT NULL, target_id INT NOT NULL, before_values JSON DEFAULT NULL, after_values JSON NOT NULL, created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX staff_log_date_index (created_at, id), INDEX staff_log_actor_index (staff_id), INDEX staff_log_action_index (action), INDEX staff_log_target_index (target_type, target_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('Staff operation history must be preserved.');
    }
}
