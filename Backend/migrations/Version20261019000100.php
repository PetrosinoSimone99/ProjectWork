<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Existing reports keep their status and have no assigned staff member. */
final class Version20261019000100 extends AbstractMigration
{
    public function getDescription(): string { return 'Add staff assignment and claim date to user reports.'; }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user_reports ADD assigned_to_id INT DEFAULT NULL, ADD assigned_at DATETIME DEFAULT NULL, ADD INDEX user_report_assignee_index (assigned_to_id), ADD CONSTRAINT user_report_assignee_fk FOREIGN KEY (assigned_to_id) REFERENCES users (id)');
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('Removing assignments would leave reports in review without an assigned staff member.');
    }
}
