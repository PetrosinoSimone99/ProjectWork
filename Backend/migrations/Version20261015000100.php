<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261015000100 extends AbstractMigration
{
    public function getDescription(): string { return 'Add optional remote availability to offers and requests.'; }

    public function up(Schema $schema): void
    {
        // The default also gives existing services a value without changing their other data.
        $this->addSql('ALTER TABLE services ADD is_remote BOOLEAN NOT NULL DEFAULT FALSE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE services DROP COLUMN is_remote');
    }
}
