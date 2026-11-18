<?php
declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** The sheet keeps the free text its sender writes and the moment it was sent. */
final class Version20261119000100 extends AbstractMigration
{
    public function getDescription(): string { return 'Store the sheet notes and the moment a sheet was sent.'; }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE agreement_details ADD notes TEXT DEFAULT NULL, ADD sent_at DATETIME DEFAULT NULL');
    }

    public function isTransactional(): bool { return false; }
    public function down(Schema $schema): void { $this->throwIrreversibleMigrationException('Workflow history must be preserved.'); }
}
