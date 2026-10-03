<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use App\Repository\ChainSchema;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Reconciles the September dump without dropping data or changing chat. */
final class Version20261003000100 extends AbstractMigration
{
    public function getDescription(): string { return 'Reconcile imported direct swaps and add service chains, agreements, reservations and compensation.'; }
    public function isTransactional(): bool { return false; }

    public function up(Schema $schema): void
    {
        $this->abortIf(!($this->connection->getDatabasePlatform() instanceof \Doctrine\DBAL\Platforms\AbstractMySQLPlatform), 'This migration requires MySQL or MariaDB.');
        // The dump has zero-date defaults. Temporarily permit them while converting them to NULL.
        $originalMode = (string) $this->connection->fetchOne('SELECT @@SESSION.sql_mode');
        $mode = implode(',', array_diff(explode(',', $originalMode), ['NO_ZERO_DATE', 'NO_ZERO_IN_DATE']));
        $this->addSql('SET SESSION sql_mode = '.$this->connection->quote($mode));
        $manager = $this->connection->createSchemaManager();
        $columns = $manager->listTableColumns('proposals');
        if (!isset($columns['offer_pair_key'])) {
            $this->addSql('ALTER TABLE proposals ADD offer_pair_key VARCHAR(50) NULL');
            // Recover the same canonical offer pair used by the API. Never invent services.
            $this->addSql("UPDATE proposals p JOIN (SELECT proposal_id, CONCAT(MIN(service_id), ':', MAX(service_id)) pair_key FROM proposal_participants GROUP BY proposal_id HAVING COUNT(*) = 2 AND COUNT(DISTINCT user_id) = 2) pairs ON pairs.proposal_id = p.id SET p.offer_pair_key = pairs.pair_key, p.creation_date = p.creation_date");
            $this->addSql('CREATE UNIQUE INDEX proposal_offer_pair_unique ON proposals(offer_pair_key)');
        }
        $columns = $manager->listTableColumns('proposal_participants');
        if (!isset($columns['id'])) {
            // Other tables reference proposals, not this composite participant key.
            $this->addSql('ALTER TABLE proposal_participants ADD id INT NOT NULL AUTO_INCREMENT UNIQUE');
            $this->addSql('ALTER TABLE proposal_participants DROP PRIMARY KEY, ADD PRIMARY KEY(id), ADD UNIQUE INDEX proposal_participant_unique(proposal_id, user_id, service_id)');
        }
        $this->addSql('ALTER TABLE services MODIFY type VARCHAR(10) NULL');
        $this->addSql("UPDATE services SET type = CASE type WHEN 'OFFERTA' THEN 'OFFER' WHEN 'RICHIESTA' THEN 'REQUEST' ELSE type END, creation_date = creation_date");
        $this->addSql('ALTER TABLE proposals MODIFY status VARCHAR(10) NULL');
        $this->addSql("UPDATE proposals SET status = CASE status WHEN 'IN_ATTESA' THEN 'PENDING' WHEN 'ACCETTATO' THEN 'ACCEPTED' WHEN 'RIFIUTATO' THEN 'REJECTED' ELSE status END, creation_date = creation_date");
        $this->addSql('ALTER TABLE proposal_participants MODIFY confirmation_date DATETIME NULL DEFAULT NULL');
        foreach (ChainSchema::statements($this->connection) as $sql) {
            $this->addSql($sql);
        }
        $this->addSql('SET SESSION sql_mode = '.$this->connection->quote($originalMode));
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('Restoring the verified backup preserves chain history and compensation.');
    }
}
