<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261016000200 extends AbstractMigration
{
    public function getDescription(): string { return 'Add an optional location to offers and requests.'; }

    public function up(Schema $schema): void
    {
        // Existing services have no location until their owner adds one.
        $this->addSql('ALTER TABLE services ADD location VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE services DROP COLUMN location');
    }
}
