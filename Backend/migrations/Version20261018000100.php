<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261018000100 extends AbstractMigration
{
    public function getDescription(): string { return 'Reserve compensation tokens for services and keep their redemption history.'; }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE tokens ADD status VARCHAR(10) NOT NULL DEFAULT 'AVAILABLE'");
        // The nullable unique key reserves an offer only while its redemption is active.
        $this->addSql("CREATE TABLE token_redemptions (
            id INT AUTO_INCREMENT NOT NULL,
            token_id INT NOT NULL,
            service_id INT NOT NULL,
            recipient_id INT NOT NULL,
            provider_id INT NOT NULL,
            status VARCHAR(10) NOT NULL,
            reserved_service_id INT DEFAULT NULL,
            created_at DATETIME NOT NULL,
            accepted_at DATETIME DEFAULT NULL,
            closed_at DATETIME DEFAULT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY token_reserved_service_unique (reserved_service_id),
            INDEX token_redemption_token_index (token_id, id),
            INDEX token_redemption_recipient_index (recipient_id),
            INDEX token_redemption_provider_index (provider_id),
            FOREIGN KEY (token_id) REFERENCES tokens (id),
            FOREIGN KEY (service_id) REFERENCES services (id),
            FOREIGN KEY (reserved_service_id) REFERENCES services (id),
            FOREIGN KEY (recipient_id) REFERENCES users (id),
            FOREIGN KEY (provider_id) REFERENCES users (id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB");
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('Removing redemption history would allow spent tokens to be used again.');
    }
}
