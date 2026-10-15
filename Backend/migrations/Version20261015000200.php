<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261015000200 extends AbstractMigration
{
    public function getDescription(): string { return 'Add manual suspension to offers and requests.'; }

    public function up(Schema $schema): void
    {
        // Existing services remain available until their owner suspends them.
        $this->addSql('ALTER TABLE services ADD is_suspended BOOLEAN NOT NULL DEFAULT FALSE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE services DROP COLUMN is_suspended');
    }
}
