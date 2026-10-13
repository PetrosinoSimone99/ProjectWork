<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Existing reports start as pending; their authors and reasons stay unchanged. */
final class Version20261013000200 extends AbstractMigration
{
    public function getDescription(): string { return 'Add staff review outcome, note, reviewer and date to user reports.'; }

    public function up(Schema $schema): void
    {
        $columns = $this->connection->createSchemaManager()->listTableColumns('user_reports');
        if (!isset($columns['status'])) {
            $this->addSql("ALTER TABLE user_reports ADD status VARCHAR(10) NOT NULL DEFAULT 'PENDING'");
        }
        if (!isset($columns['review_note'])) {
            $this->addSql('ALTER TABLE user_reports ADD review_note VARCHAR(2000) DEFAULT NULL');
        }
        if (!isset($columns['reviewed_at'])) {
            $this->addSql('ALTER TABLE user_reports ADD reviewed_at DATETIME DEFAULT NULL');
        }
        if (!isset($columns['reviewed_by_id'])) {
            $this->addSql('ALTER TABLE user_reports ADD reviewed_by_id INT DEFAULT NULL, ADD INDEX user_report_reviewer_index (reviewed_by_id), ADD CONSTRAINT user_report_reviewer_fk FOREIGN KEY (reviewed_by_id) REFERENCES users (id)');
        }
        $indexes = $this->connection->createSchemaManager()->listTableIndexes('user_reports');
        if (!isset($indexes['user_report_status_index'])) {
            $this->addSql('CREATE INDEX user_report_status_index ON user_reports (status)');
        }
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user_reports DROP FOREIGN KEY user_report_reviewer_fk, DROP INDEX user_report_reviewer_index, DROP INDEX user_report_status_index, DROP status, DROP review_note, DROP reviewed_by_id, DROP reviewed_at');
    }
}
