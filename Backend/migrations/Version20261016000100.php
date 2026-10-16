<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261016000100 extends AbstractMigration
{
    public function getDescription(): string { return 'Keep deleted services and tokens using a deletion date.'; }

    public function isTransactional(): bool { return false; }

    public function up(Schema $schema): void
    {
        // Existing rows stay visible because NULL means not deleted.
        $this->addSql('ALTER TABLE services ADD deleted_at DATETIME DEFAULT NULL');
        $this->addSql('ALTER TABLE tokens ADD deleted_at DATETIME DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // Dropping these markers would make deleted records visible again.
        $this->throwIrreversibleMigrationException('Soft deletion markers must be kept to preserve deletion history.');
    }
}
