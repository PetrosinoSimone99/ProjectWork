<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Adds optional biography and profile image URL fields to user profiles. */
final class Version20260925000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add biography and profile image URL fields to users.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE users ADD bio LONGTEXT DEFAULT NULL, ADD profile_image_url VARCHAR(2048) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE users DROP bio, DROP profile_image_url');
    }
}
