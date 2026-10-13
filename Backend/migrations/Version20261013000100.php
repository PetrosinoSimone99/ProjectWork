<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Adds reports without changing existing users or their data. */
final class Version20261013000100 extends AbstractMigration
{
    public function getDescription(): string { return 'Create user reports with one report per author and target.'; }

    public function up(Schema $schema): void
    {
        // An imported updated dump already contains this table.
        if ($this->connection->createSchemaManager()->tablesExist(['user_reports'])) {
            return;
        }
        $this->addSql('CREATE TABLE user_reports (id INT AUTO_INCREMENT NOT NULL, reporter_id INT NOT NULL, reported_user_id INT NOT NULL, reason VARCHAR(2000) NOT NULL, creation_date DATETIME NOT NULL, UNIQUE INDEX user_report_pair_unique (reporter_id, reported_user_id), INDEX user_report_target_index (reported_user_id), PRIMARY KEY(id), CONSTRAINT user_report_author_fk FOREIGN KEY (reporter_id) REFERENCES users (id), CONSTRAINT user_report_target_fk FOREIGN KEY (reported_user_id) REFERENCES users (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE user_reports');
    }
}
