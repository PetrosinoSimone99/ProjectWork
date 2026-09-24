<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Adds the catalog, service publishing, and direct swipe-match database model. */
final class Version20260924000200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create service catalog, direct proposals, and persistent swipe decisions.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE categories (id INT AUTO_INCREMENT NOT NULL, description VARCHAR(255) NOT NULL, UNIQUE INDEX UNIQ_3AF346687E3C61F9 (description), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE services (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, type VARCHAR(10) NOT NULL, description VARCHAR(255) NOT NULL, creation_date DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX services_user_type_index (user_id, type), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE service_categories (service_id INT NOT NULL, category_id INT NOT NULL, INDEX IDX_46551F71ED5CA9E6 (service_id), INDEX IDX_46551F7112469DE2 (category_id), PRIMARY KEY(service_id, category_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE proposals (id INT AUTO_INCREMENT NOT NULL, status VARCHAR(10) NOT NULL, offer_pair_key VARCHAR(50) NOT NULL, creation_date DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX proposals_status_created_index (status, creation_date), UNIQUE INDEX proposal_offer_pair_unique (offer_pair_key), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE proposal_participants (id INT AUTO_INCREMENT NOT NULL, proposal_id INT NOT NULL, user_id INT NOT NULL, service_id INT NOT NULL, confirmation_date DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_6D6F2FBC19928CCA (proposal_id), INDEX proposal_participants_user_index (user_id), INDEX IDX_6D6F2FBCED5CA9E6 (service_id), UNIQUE INDEX proposal_participant_unique (proposal_id, user_id, service_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE swipe_decisions (id INT AUTO_INCREMENT NOT NULL, actor_id INT NOT NULL, candidate_id INT NOT NULL, actor_offer_id INT NOT NULL, actor_request_id INT NOT NULL, candidate_offer_id INT NOT NULL, candidate_request_id INT NOT NULL, proposal_id INT DEFAULT NULL, direction VARCHAR(5) NOT NULL, creation_date DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX swipe_decisions_actor_index (actor_id), INDEX IDX_8736033578313EC9 (candidate_id), INDEX IDX_8736033537596D22 (actor_offer_id), INDEX IDX_873603353C9869EA (actor_request_id), INDEX IDX_87360335451C29A4 (candidate_offer_id), INDEX IDX_873603355B7BBAFA (candidate_request_id), INDEX IDX_8736033519928CCA (proposal_id), UNIQUE INDEX swipe_decision_combination_unique (actor_id, candidate_id, actor_offer_id, actor_request_id, candidate_offer_id, candidate_request_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE services ADD CONSTRAINT FK_SERVICES_USER FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE service_categories ADD CONSTRAINT FK_SERVICE_CATEGORIES_SERVICE FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE service_categories ADD CONSTRAINT FK_SERVICE_CATEGORIES_CATEGORY FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE proposal_participants ADD CONSTRAINT FK_PROPOSAL_PARTICIPANTS_PROPOSAL FOREIGN KEY (proposal_id) REFERENCES proposals (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE proposal_participants ADD CONSTRAINT FK_PROPOSAL_PARTICIPANTS_USER FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE proposal_participants ADD CONSTRAINT FK_PROPOSAL_PARTICIPANTS_SERVICE FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE swipe_decisions ADD CONSTRAINT FK_SWIPE_DECISIONS_ACTOR FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE swipe_decisions ADD CONSTRAINT FK_SWIPE_DECISIONS_CANDIDATE FOREIGN KEY (candidate_id) REFERENCES users (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE swipe_decisions ADD CONSTRAINT FK_SWIPE_DECISIONS_ACTOR_OFFER FOREIGN KEY (actor_offer_id) REFERENCES services (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE swipe_decisions ADD CONSTRAINT FK_SWIPE_DECISIONS_ACTOR_REQUEST FOREIGN KEY (actor_request_id) REFERENCES services (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE swipe_decisions ADD CONSTRAINT FK_SWIPE_DECISIONS_CANDIDATE_OFFER FOREIGN KEY (candidate_offer_id) REFERENCES services (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE swipe_decisions ADD CONSTRAINT FK_SWIPE_DECISIONS_CANDIDATE_REQUEST FOREIGN KEY (candidate_request_id) REFERENCES services (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE swipe_decisions ADD CONSTRAINT FK_SWIPE_DECISIONS_PROPOSAL FOREIGN KEY (proposal_id) REFERENCES proposals (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE swipe_decisions');
        $this->addSql('DROP TABLE proposal_participants');
        $this->addSql('DROP TABLE proposals');
        $this->addSql('DROP TABLE service_categories');
        $this->addSql('DROP TABLE services');
        $this->addSql('DROP TABLE categories');
    }
}
