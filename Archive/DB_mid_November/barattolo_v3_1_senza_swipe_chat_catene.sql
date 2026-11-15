-- Barattolo v3.1 - API essenziali, senza swipe, chat e catene.
-- Importare in un database MySQL/MariaDB VUOTO gia selezionato.
-- Schema autonomo: non e' una migrazione per il database esistente.
-- Nessun dato iniziale e nessuna istruzione DROP.
-- Include utenti/profili, categorie multiple, servizi/offerte/richieste,
-- segnalazioni, moderazione, storico staff, token e relativo utilizzo.
-- Accordi e code della v3.1 sono conservati senza cambiarne il modello.
-- credits e is_used sono conservati ma non sono gestiti dalle API attuali.
--
-- PREREQUISITO TOKEN: adeguare la logica di disponibilita' dell'offerta,
-- rimuovendo le query a proposals, proposal_participants e swipe_decisions
-- in ChainRepository::hasDirectProposal(), richiamato da serviceAvailable().
-- Fino a tale modifica, la prenotazione tramite token NON e' compatibile.
-- Conservare controlli su utenti attivi, servizio non cancellato/sospeso,
-- proprieta'/stato/scadenza del token, prenotazioni in token_redemptions,
-- transazioni e blocchi per impedire prenotazioni concorrenti.
--
-- tokens.group_id resta nullable per il formato atteso dal backend,
-- senza FK alle catene: omettere chainId e usare NULL per token manuali.
-- Nessuna tabella chat, catene, swipe o proposte dirette viene creata.
-- Il SQL non disabilita le route: gli endpoint esclusi sono fuori perimetro.
-- Nessun account o categoria precaricati: la registrazione puo' creare
-- categorie per nome; categoryIds richiede categorie gia' presenti.
-- Creare lo staff con il comando applicativo esistente.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';

-- users
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `surname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `roles` json NOT NULL,
  `account_status` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `credits` int NOT NULL DEFAULT 0,
  `creation_date` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `bio` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `profile_image_url` varchar(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_users_username` (`username`),
  UNIQUE KEY `unique_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- categories
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_3AF346687E3C61F9` (`description`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- services
CREATE TABLE `services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_used` bool DEFAULT 1,
  `creation_date` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `is_remote` tinyint(1) NOT NULL DEFAULT '0',
  `is_suspended` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `services_user_type_index` (`user_id`,`type`),
  CONSTRAINT `FK_SERVICES_USER` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- service_categories
CREATE TABLE `service_categories` (
  `service_id` int NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`service_id`,`category_id`),
  KEY `IDX_46551F71ED5CA9E6` (`service_id`),
  KEY `IDX_46551F7112469DE2` (`category_id`),
  CONSTRAINT `FK_SERVICE_CATEGORIES_CATEGORY` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_SERVICE_CATEGORIES_SERVICE` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- user_reports
CREATE TABLE `user_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reporter_id` int NOT NULL,
  `reported_user_id` int NOT NULL,
  `reason` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `creation_date` datetime NOT NULL,
  `status` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `review_note` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by_id` int DEFAULT NULL,
  `assigned_to_id` int DEFAULT NULL,
  `assigned_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_report_pair_unique` (`reporter_id`,`reported_user_id`),
  KEY `user_report_target_index` (`reported_user_id`),
  KEY `user_report_reviewer_index` (`reviewed_by_id`),
  KEY `user_report_status_index` (`status`),
  KEY `user_report_assignee_index` (`assigned_to_id`),
  CONSTRAINT `user_report_assignee_fk` FOREIGN KEY (`assigned_to_id`) REFERENCES `users` (`id`),
  CONSTRAINT `user_report_author_fk` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`),
  CONSTRAINT `user_report_reviewer_fk` FOREIGN KEY (`reviewed_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `user_report_target_fk` FOREIGN KEY (`reported_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- staff_operation_logs
CREATE TABLE `staff_operation_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `staff_id` int NOT NULL,
  `staff_username` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_id` int NOT NULL,
  `before_values` json DEFAULT NULL,
  `after_values` json NOT NULL,
  `created_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  PRIMARY KEY (`id`),
  KEY `staff_log_date_index` (`created_at`,`id`),
  KEY `staff_log_actor_index` (`staff_id`),
  KEY `staff_log_action_index` (`action`),
  KEY `staff_log_target_index` (`target_type`,`target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- tokens
CREATE TABLE `tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `expiration_date` datetime NOT NULL,
  `group_id` int DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `status` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AVAILABLE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `chain_token_unique` (`group_id`,`user_id`),
  KEY `fk_chain_tokens_user_id` (`user_id`),
  CONSTRAINT `fk_chain_tokens_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- token_redemptions
CREATE TABLE `token_redemptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `token_id` int NOT NULL,
  `service_id` int NOT NULL,
  `recipient_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `status` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reserved_service_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `accepted_at` datetime DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_reserved_service_unique` (`reserved_service_id`),
  KEY `token_redemption_token_index` (`token_id`,`id`),
  KEY `token_redemption_recipient_index` (`recipient_id`),
  KEY `token_redemption_provider_index` (`provider_id`),
  KEY `FK_TOKEN_REDEMPTION_SERVICE` (`service_id`),
  CONSTRAINT `FK_TOKEN_REDEMPTION_PROVIDER` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_TOKEN_REDEMPTION_RECIPIENT` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_TOKEN_REDEMPTION_RESERVED_SERVICE` FOREIGN KEY (`reserved_service_id`) REFERENCES `services` (`id`),
  CONSTRAINT `FK_TOKEN_REDEMPTION_SERVICE` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`),
  CONSTRAINT `FK_TOKEN_REDEMPTION_TOKEN` FOREIGN KEY (`token_id`) REFERENCES `tokens` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Struttura v3.1 conservata: agreements
CREATE TABLE `agreements` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `status` ENUM ('PENDING', 'ACCEPTED', 'REFUSED', 'CONTESTED', 'VOID') NOT NULL DEFAULT 'PENDING',
  `creation_date` timestamp NOT NULL DEFAULT (now()),
  `from_queue` bool NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Struttura v3.1 conservata: agreement_proposal
CREATE TABLE `agreement_proposal` (
  `agreement_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` ENUM ('Provider', 'Beneficiary'),
  `response` bool,
  `response_date` timestamp,
  PRIMARY KEY (`agreement_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Struttura v3.1 conservata: agreement_details
CREATE TABLE `agreement_details` (
  `agreement_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `service_provided` int NOT NULL,
  `beneficiary_id` int NOT NULL,
  `from_remote` bool NOT NULL DEFAULT 0,
  `start_date` timestamp,
  `end_date` timestamp,
  `beneficiary_accepted` bool,
  `status` ENUM ('COMPILED', 'UNCOMPILED') DEFAULT 'UNCOMPILED',
  PRIMARY KEY (`agreement_id`, `provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Struttura v3.1 conservata: service_queues
CREATE TABLE `service_queues` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` ENUM ('OFFER', 'REQUEST') NOT NULL,
  `service_id` int NOT NULL,
  `location` varchar(100),
  `agreement_created` int,
  `status` ENUM ('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Struttura v3.1 conservata: match_candidates
CREATE TABLE `match_candidates` (
  `offer_queue_id` int NOT NULL,
  `request_queue_id` int NOT NULL,
  PRIMARY KEY (`offer_queue_id`, `request_queue_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Struttura v3.1 conservata: queue_associated_agreements
CREATE TABLE `queue_associated_agreements` (
  `queue_id` int NOT NULL,
  `agreement_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `agreement_details` ADD FOREIGN KEY (`agreement_id`) REFERENCES `agreements` (`id`);

ALTER TABLE `agreement_details` ADD FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`);

ALTER TABLE `agreement_details` ADD FOREIGN KEY (`beneficiary_id`) REFERENCES `users` (`id`);

ALTER TABLE `agreement_details` ADD FOREIGN KEY (`service_provided`) REFERENCES `services` (`id`);

ALTER TABLE `service_queues` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `service_queues` ADD FOREIGN KEY (`service_id`) REFERENCES `services` (`id`);

ALTER TABLE `match_candidates` ADD FOREIGN KEY (`offer_queue_id`) REFERENCES `service_queues` (`id`);

ALTER TABLE `match_candidates` ADD FOREIGN KEY (`request_queue_id`) REFERENCES `service_queues` (`id`);

ALTER TABLE `queue_associated_agreements` ADD FOREIGN KEY (`queue_id`) REFERENCES `service_queues` (`id`);

ALTER TABLE `service_queues` ADD FOREIGN KEY (`agreement_created`) REFERENCES `agreements` (`id`);

ALTER TABLE `agreement_proposal` ADD FOREIGN KEY (`agreement_id`) REFERENCES `agreements` (`id`);

ALTER TABLE `agreement_proposal` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `queue_associated_agreements` ADD FOREIGN KEY (`agreement_id`) REFERENCES `agreements` (`id`);
