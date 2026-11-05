-- Baratto-lo: integrated V2 dump, prepared on 2026-10-19.
-- Base: barattolo_v2_18102026_token_redemptions.sql.
-- Data and five additional tables: barattolo_db.sql (2026-10-18 export).
-- Includes application users, stored password values, services, proposals and chat history.
-- Retains the two V2 public categories and the source's twelve migration records.
-- Adds proposals.location; preserves all source values and IDs.
-- Compatibility exception: offer_pair_key has a non-unique index because source proposals 1 and 2 both use 1:2.
-- Import into an empty database. Table replacement statements are included.

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_3AF346687E3C61F9` (`description`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `chain_agreements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chain_agreements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `recipient_id` int NOT NULL,
  `service_id` int NOT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_at` datetime NOT NULL,
  `status` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `decided_at` datetime DEFAULT NULL,
  `pending_key` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chain_pending_agreement_unique` (`pending_key`),
  KEY `chain_agreement_group_index` (`group_id`),
  KEY `fk_chain_chain_agreements_provider_id` (`provider_id`),
  KEY `fk_chain_chain_agreements_recipient_id` (`recipient_id`),
  KEY `fk_chain_chain_agreements_service_id` (`service_id`),
  CONSTRAINT `chain_agreements_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `proposal_groups` (`id`),
  CONSTRAINT `fk_chain_chain_agreements_provider_id` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_chain_chain_agreements_recipient_id` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_chain_chain_agreements_service_id` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `chain_service_reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chain_service_reservations` (
  `service_id` int NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`service_id`),
  KEY `chain_reservation_group_index` (`group_id`),
  CONSTRAINT `chain_service_reservations_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`),
  CONSTRAINT `chain_service_reservations_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `proposal_groups` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `doctrine_migration_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctrine_migration_versions` (
  `version` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `executed_at` datetime DEFAULT NULL,
  `execution_time` int DEFAULT NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `group_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_participants` (
  `group_id` int NOT NULL,
  `user_id` int NOT NULL,
  `received_service` int NOT NULL,
  `position` int DEFAULT NULL,
  `offered_service_id` int DEFAULT NULL,
  `requested_service_id` int DEFAULT NULL,
  `decision` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`group_id`,`user_id`),
  UNIQUE KEY `chain_user_unique` (`group_id`,`user_id`),
  UNIQUE KEY `chain_position_unique` (`group_id`,`position`),
  KEY `fk_chain_group_participants_user_id` (`user_id`),
  KEY `fk_chain_group_participants_received_service` (`received_service`),
  KEY `fk_chain_group_participants_offered_service_id` (`offered_service_id`),
  KEY `fk_chain_group_participants_requested_service_id` (`requested_service_id`),
  CONSTRAINT `fk_chain_group_participants_group_id` FOREIGN KEY (`group_id`) REFERENCES `proposal_groups` (`id`),
  CONSTRAINT `fk_chain_group_participants_offered_service_id` FOREIGN KEY (`offered_service_id`) REFERENCES `services` (`id`),
  CONSTRAINT `fk_chain_group_participants_received_service` FOREIGN KEY (`received_service`) REFERENCES `services` (`id`),
  CONSTRAINT `fk_chain_group_participants_requested_service_id` FOREIGN KEY (`requested_service_id`) REFERENCES `services` (`id`),
  CONSTRAINT `fk_chain_group_participants_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `proposal_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proposal_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `current_offered_service` int DEFAULT NULL,
  `last_requested_service` int DEFAULT NULL,
  `creation_date` datetime NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `initiator_id` int DEFAULT NULL,
  `offered_service_id` int DEFAULT NULL,
  `requested_service_id` int DEFAULT NULL,
  `application_status` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `search_deadline` datetime DEFAULT NULL,
  `confirmation_deadline` datetime DEFAULT NULL,
  `proposed_at` datetime DEFAULT NULL,
  `next_search_at` datetime DEFAULT NULL,
  `cancelled_by_id` int DEFAULT NULL,
  `cancellation_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `active_search_key` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chain_active_search_unique` (`active_search_key`),
  KEY `chain_due_index` (`application_status`,`next_search_at`),
  KEY `fk_chain_proposal_groups_initiator_id` (`initiator_id`),
  KEY `fk_chain_proposal_groups_offered_service_id` (`offered_service_id`),
  KEY `fk_chain_proposal_groups_requested_service_id` (`requested_service_id`),
  KEY `fk_chain_proposal_groups_cancelled_by_id` (`cancelled_by_id`),
  CONSTRAINT `fk_chain_proposal_groups_cancelled_by_id` FOREIGN KEY (`cancelled_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_chain_proposal_groups_initiator_id` FOREIGN KEY (`initiator_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_chain_proposal_groups_offered_service_id` FOREIGN KEY (`offered_service_id`) REFERENCES `services` (`id`),
  CONSTRAINT `fk_chain_proposal_groups_requested_service_id` FOREIGN KEY (`requested_service_id`) REFERENCES `services` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `proposal_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proposal_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proposal_id` int NOT NULL,
  `user_id` int NOT NULL,
  `service_id` int NOT NULL,
  `confirmation_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `proposal_participant_unique` (`proposal_id`,`user_id`,`service_id`),
  KEY `IDX_6D6F2FBC19928CCA` (`proposal_id`),
  KEY `proposal_participants_user_index` (`user_id`),
  KEY `IDX_6D6F2FBCED5CA9E6` (`service_id`),
  CONSTRAINT `FK_PROPOSAL_PARTICIPANTS_PROPOSAL` FOREIGN KEY (`proposal_id`) REFERENCES `proposals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_PROPOSAL_PARTICIPANTS_SERVICE` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_PROPOSAL_PARTICIPANTS_USER` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `proposals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proposals` (
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `status` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `offer_pair_key` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `creation_date` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  PRIMARY KEY (`id`),
  -- Source proposals 1 and 2 both have offer_pair_key = 1:2.
  -- Keep both unchanged; this compatibility dump uses a non-unique index.
  KEY `proposal_offer_pair_index` (`offer_pair_key`),
  KEY `proposals_status_created_index` (`status`,`creation_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `service_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_categories` (
  `service_id` int NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`service_id`,`category_id`),
  KEY `IDX_46551F71ED5CA9E6` (`service_id`),
  KEY `IDX_46551F7112469DE2` (`category_id`),
  CONSTRAINT `FK_SERVICE_CATEGORIES_CATEGORY` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_SERVICE_CATEGORIES_SERVICE` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `service_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_participants` (
  `service_provision_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`service_provision_id`,`user_id`),
  KEY `fk_chain_service_participants_user_id` (`user_id`),
  CONSTRAINT `fk_chain_service_participants_service_provision_id` FOREIGN KEY (`service_provision_id`) REFERENCES `service_provision` (`id`),
  CONSTRAINT `fk_chain_service_participants_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `service_provision`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_provision` (
  `id` int NOT NULL AUTO_INCREMENT,
  `exchange_group_id` int DEFAULT NULL,
  `service_id` int DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime DEFAULT NULL,
  `agreement_id` int DEFAULT NULL,
  `provider_id` int DEFAULT NULL,
  `recipient_id` int DEFAULT NULL,
  `received_at` datetime DEFAULT NULL,
  `received_by_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chain_provision_agreement_unique` (`agreement_id`),
  UNIQUE KEY `chain_provision_edge_unique` (`exchange_group_id`,`provider_id`),
  KEY `fk_chain_service_provision_service_id` (`service_id`),
  KEY `fk_chain_service_provision_provider_id` (`provider_id`),
  KEY `fk_chain_service_provision_recipient_id` (`recipient_id`),
  KEY `fk_chain_service_provision_received_by_id` (`received_by_id`),
  CONSTRAINT `fk_chain_service_provision_agreement_id` FOREIGN KEY (`agreement_id`) REFERENCES `chain_agreements` (`id`),
  CONSTRAINT `fk_chain_service_provision_exchange_group_id` FOREIGN KEY (`exchange_group_id`) REFERENCES `proposal_groups` (`id`),
  CONSTRAINT `fk_chain_service_provision_provider_id` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_chain_service_provision_received_by_id` FOREIGN KEY (`received_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_chain_service_provision_recipient_id` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_chain_service_provision_service_id` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `creation_date` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `is_remote` tinyint(1) NOT NULL DEFAULT '0',
  `is_suspended` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `services_user_type_index` (`user_id`,`type`),
  CONSTRAINT `FK_SERVICES_USER` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `staff_operation_logs`;
CREATE TABLE `staff_operation_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `staff_id` int NOT NULL,
  `staff_username` varchar(30) NOT NULL,
  `action` varchar(32) NOT NULL,
  `target_type` varchar(10) NOT NULL,
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
DROP TABLE IF EXISTS `swipe_decisions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `swipe_decisions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actor_id` int NOT NULL,
  `candidate_id` int NOT NULL,
  `actor_offer_id` int NOT NULL,
  `actor_request_id` int NOT NULL,
  `candidate_offer_id` int NOT NULL,
  `candidate_request_id` int NOT NULL,
  `proposal_id` int DEFAULT NULL,
  `direction` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `creation_date` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `swipe_decision_combination_unique` (`actor_id`,`candidate_id`,`actor_offer_id`,`actor_request_id`,`candidate_offer_id`,`candidate_request_id`),
  KEY `swipe_decisions_actor_index` (`actor_id`),
  KEY `IDX_8736033578313EC9` (`candidate_id`),
  KEY `IDX_8736033537596D22` (`actor_offer_id`),
  KEY `IDX_873603353C9869EA` (`actor_request_id`),
  KEY `IDX_87360335451C29A4` (`candidate_offer_id`),
  KEY `IDX_873603355B7BBAFA` (`candidate_request_id`),
  KEY `IDX_8736033519928CCA` (`proposal_id`),
  CONSTRAINT `FK_SWIPE_DECISIONS_ACTOR` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_SWIPE_DECISIONS_ACTOR_OFFER` FOREIGN KEY (`actor_offer_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_SWIPE_DECISIONS_ACTOR_REQUEST` FOREIGN KEY (`actor_request_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_SWIPE_DECISIONS_CANDIDATE` FOREIGN KEY (`candidate_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_SWIPE_DECISIONS_CANDIDATE_OFFER` FOREIGN KEY (`candidate_offer_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_SWIPE_DECISIONS_CANDIDATE_REQUEST` FOREIGN KEY (`candidate_request_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_SWIPE_DECISIONS_PROPOSAL` FOREIGN KEY (`proposal_id`) REFERENCES `proposals` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `expiration_date` datetime NOT NULL,
  `group_id` int DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chain_token_unique` (`group_id`,`user_id`),
  KEY `fk_chain_tokens_user_id` (`user_id`),
  CONSTRAINT `fk_chain_tokens_group_id` FOREIGN KEY (`group_id`) REFERENCES `proposal_groups` (`id`),
  CONSTRAINT `fk_chain_tokens_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reporter_id` int NOT NULL,
  `reported_user_id` int NOT NULL,
  `reason` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creation_date` datetime NOT NULL,
  `status` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `review_note` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_report_pair_unique` (`reporter_id`,`reported_user_id`),
  KEY `user_report_target_index` (`reported_user_id`),
  KEY `user_report_reviewer_index` (`reviewed_by_id`),
  KEY `user_report_status_index` (`status`),
  CONSTRAINT `user_report_author_fk` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`),
  CONSTRAINT `user_report_reviewer_fk` FOREIGN KEY (`reviewed_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `user_report_target_fk` FOREIGN KEY (`reported_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `creation_date` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `bio` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `profile_image_url` varchar(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_users_username` (`username`),
  UNIQUE KEY `unique_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- Token lifecycle added by DoctrineMigrations\Version20261018000100.
-- Existing tokens start as AVAILABLE. EXPIRED is calculated from expiration_date when read.
ALTER TABLE tokens
  ADD COLUMN status varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AVAILABLE';

-- Keep every attempt as history. NULL releases the offer for another exchange.
DROP TABLE IF EXISTS token_redemptions;
CREATE TABLE token_redemptions (
  id int NOT NULL AUTO_INCREMENT,
  token_id int NOT NULL,
  service_id int NOT NULL,
  recipient_id int NOT NULL,
  provider_id int NOT NULL,
  status varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  reserved_service_id int DEFAULT NULL,
  created_at datetime NOT NULL,
  accepted_at datetime DEFAULT NULL,
  closed_at datetime DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY token_reserved_service_unique (reserved_service_id),
  KEY token_redemption_token_index (token_id,id),
  KEY token_redemption_recipient_index (recipient_id),
  KEY token_redemption_provider_index (provider_id),
  CONSTRAINT FK_TOKEN_REDEMPTION_TOKEN FOREIGN KEY (token_id) REFERENCES tokens (id),
  CONSTRAINT FK_TOKEN_REDEMPTION_SERVICE FOREIGN KEY (service_id) REFERENCES services (id),
  CONSTRAINT FK_TOKEN_REDEMPTION_RESERVED_SERVICE FOREIGN KEY (reserved_service_id) REFERENCES services (id),
  CONSTRAINT FK_TOKEN_REDEMPTION_RECIPIENT FOREIGN KEY (recipient_id) REFERENCES users (id),
  CONSTRAINT FK_TOKEN_REDEMPTION_PROVIDER FOREIGN KEY (provider_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Additional source tables, indexes, counters and foreign keys.
DROP TABLE IF EXISTS `chat`;
CREATE TABLE `chat` (
  `id` int(11) NOT NULL,
  `proposal_mutual_id` int(11) DEFAULT NULL,
  `proposal_group_id` int(11) DEFAULT NULL,
  `creation_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `chat`
  ADD PRIMARY KEY (`id`),
  ADD KEY `proposal_id` (`proposal_mutual_id`),
  ADD KEY `group_proposal_id` (`proposal_group_id`);

ALTER TABLE `chat`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

ALTER TABLE `chat`
  ADD CONSTRAINT `chat_ibfk_1` FOREIGN KEY (`proposal_mutual_id`) REFERENCES `proposals` (`id`),
  ADD CONSTRAINT `chat_ibfk_2` FOREIGN KEY (`proposal_group_id`) REFERENCES `proposal_groups` (`id`);

DROP TABLE IF EXISTS `chat_messages`;
CREATE TABLE `chat_messages` (
  `id` int(11) NOT NULL,
  `chat_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `creation_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `chat_id` (`chat_id`);

ALTER TABLE `chat_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

ALTER TABLE `chat_messages`
  ADD CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `chat_messages_ibfk_2` FOREIGN KEY (`chat_id`) REFERENCES `chat` (`id`);

DROP TABLE IF EXISTS `chat_participants`;
CREATE TABLE `chat_participants` (
  `chat_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `last_message_read` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `chat_participants`
  ADD PRIMARY KEY (`chat_id`,`user_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `last_message_read` (`last_message_read`);

ALTER TABLE `chat_participants`
  ADD CONSTRAINT `chat_participants_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `chat_participants_ibfk_2` FOREIGN KEY (`chat_id`) REFERENCES `chat` (`id`),
  ADD CONSTRAINT `chat_participants_ibfk_3` FOREIGN KEY (`last_message_read`) REFERENCES `chat_messages` (`id`);

DROP TABLE IF EXISTS `exchange_mutual`;
CREATE TABLE `exchange_mutual` (
  `id` int(11) NOT NULL,
  `proposal_id` int(11) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `status` enum('IN_ATTESA','ACCETTATO','RIFIUTATO') DEFAULT NULL,
  `creation_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `exchange_mutual`
  ADD PRIMARY KEY (`id`),
  ADD KEY `proposal_id` (`proposal_id`);

ALTER TABLE `exchange_mutual`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `exchange_mutual`
  ADD CONSTRAINT `exchange_mutual_ibfk_1` FOREIGN KEY (`proposal_id`) REFERENCES `proposals` (`id`);

DROP TABLE IF EXISTS `exchange_participants`;
CREATE TABLE `exchange_participants` (
  `exchange_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `start_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `completion_date` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `exchange_accepted` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `exchange_participants`
  ADD PRIMARY KEY (`exchange_id`,`user_id`,`service_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `service_id` (`service_id`);

ALTER TABLE `exchange_participants`
  ADD CONSTRAINT `exchange_participants_ibfk_1` FOREIGN KEY (`exchange_id`) REFERENCES `exchange_mutual` (`id`),
  ADD CONSTRAINT `exchange_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `exchange_participants_ibfk_3` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`);

-- Integrated data.
INSERT INTO `categories` (`id`, `description`) VALUES (1, 'Cooking'), (2, 'Gardening');

INSERT INTO `chat` (`id`, `proposal_mutual_id`, `proposal_group_id`, `creation_date`) VALUES
(1, 1, NULL, '2026-09-26 18:31:24'),
(2, 2, NULL, '2026-09-27 11:27:10'),
(6, NULL, 1, '2026-10-10 08:59:18'),
(7, NULL, 1, '2026-10-10 12:21:31');

INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES
(1, 1, 1, 'Hello, this is a test message.', '2026-09-26 19:04:22'),
(2, 1, 1, 'Testing endpoint again', '2026-09-27 10:49:35'),
(3, 1, 2, 'This is from bob', '2026-10-06 19:51:39'),
(4, 7, 1, 'Hi Alice', '2026-10-10 12:23:03'),
(5, 7, 3, 'Hello Marioooo', '2026-10-10 12:24:06');

INSERT INTO `chat_participants` (`chat_id`, `user_id`, `last_message_read`) VALUES
(1, 1, NULL),
(1, 2, NULL),
(6, 1, NULL),
(6, 2, NULL),
(7, 1, NULL),
(7, 3, NULL);

INSERT INTO `doctrine_migration_versions` (`version`, `executed_at`, `execution_time`) VALUES
('DoctrineMigrations\\Version20260924000100', '2026-10-18 13:24:14', 31),
('DoctrineMigrations\\Version20260924000200', '2026-10-18 13:24:15', 367),
('DoctrineMigrations\\Version20260925000100', '2026-10-18 13:24:15', 14),
('DoctrineMigrations\\Version20261003000100', '2026-10-18 13:33:40', 952),
('DoctrineMigrations\\Version20261013000100', '2026-10-18 13:33:41', 22),
('DoctrineMigrations\\Version20261013000200', '2026-10-18 13:33:41', 65),
('DoctrineMigrations\\Version20261015000100', '2026-10-18 13:33:41', 3),
('DoctrineMigrations\\Version20261015000200', '2026-10-18 13:33:41', 3),
('DoctrineMigrations\\Version20261016000100', '2026-10-18 13:33:41', 6),
('DoctrineMigrations\\Version20261016000200', '2026-10-18 13:33:41', 3),
('DoctrineMigrations\\Version20261016000300', '2026-10-18 13:33:41', 15),
('DoctrineMigrations\\Version20261018000100', '2026-10-18 13:33:41', 24);

INSERT INTO `group_participants` (`group_id`, `user_id`, `received_service`, `position`, `offered_service_id`, `requested_service_id`, `decision`, `confirmed_at`) VALUES
(1, 1, 2, NULL, NULL, NULL, NULL, NULL),
(1, 3, 1, NULL, NULL, NULL, NULL, NULL);

INSERT INTO `proposals` (`id`, `location`, `status`, `creation_date`, `offer_pair_key`) VALUES
(1, 'Perugia', 'PENDING', '2026-09-26 14:50:26', '1:2'),
(2, 'Perugia', 'PENDING', '2026-09-27 11:25:50', '1:2');

INSERT INTO `proposal_groups` (`id`, `current_offered_service`, `last_requested_service`, `creation_date`, `status`, `location`, `initiator_id`, `offered_service_id`, `requested_service_id`, `application_status`, `search_deadline`, `confirmation_deadline`, `proposed_at`, `next_search_at`, `cancelled_by_id`, `cancellation_reason`, `cancelled_at`, `completed_at`, `active_search_key`) VALUES
(1, 1, 1, '2026-10-10 08:32:49', 'IN_ATTESA', 'Perugia', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO `proposal_participants` (`proposal_id`, `user_id`, `service_id`, `confirmation_date`, `id`) VALUES
(1, 1, 1, '2026-09-26 16:52:20', 1),
(1, 2, 2, '2026-09-26 16:52:20', 2),
(2, 1, 1, '2026-09-27 13:26:15', 3),
(2, 2, 2, '2026-09-27 13:26:15', 4);

INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES
(1, 1, 'OFFER', 'Creazione siti web', '2026-09-26 14:49:45', 0, 0, NULL, NULL),
(2, 2, 'OFFER', 'Giardinaggio', '2026-09-26 14:49:45', 0, 0, NULL, NULL),
(3, 1, 'REQUEST', 'Giardinaggio', '2026-09-26 14:50:05', 0, 0, NULL, NULL),
(4, 2, 'REQUEST', 'Siti Web', '2026-09-26 14:50:05', 0, 0, NULL, NULL),
(5, 3, 'OFFER', 'Babysitting', '2026-10-10 12:14:34', 0, 0, NULL, NULL);

INSERT INTO `users` (`id`, `name`, `surname`, `location`, `bio`, `profile_image_url`, `username`, `email`, `password_hash`, `roles`, `account_status`, `creation_date`) VALUES
(1, 'Mario', 'Rossi', 'Perugia', 'abc', NULL, 'mario.rossi', 'mariooo@test.it', 'demo', '[\"ROLE_USER\"]', 'ACTIVE', '2026-09-26 14:48:32'),
(2, 'Bob', 'Americano', 'Perugia', 'abcd', NULL, 'Bobbyyy', 'bob.americano@murica.com', 'demo', '[\"ROLE_USER\"]', 'ACTIVE', '2026-09-26 14:48:32'),
(3, 'Alice', 'Aliciana', 'Perugia', NULL, NULL, 'Aaaaalice', 'alice_myemail@google.com', 'demo', '[\"ROLE_USER\"]\r\n	', 'ACTIVE', '2026-10-10 12:14:04');

ALTER TABLE `categories` AUTO_INCREMENT = 3;
ALTER TABLE `proposals` AUTO_INCREMENT = 3;
ALTER TABLE `proposal_groups` AUTO_INCREMENT = 2;
ALTER TABLE `proposal_participants` AUTO_INCREMENT = 5;
ALTER TABLE `services` AUTO_INCREMENT = 6;
ALTER TABLE `users` AUTO_INCREMENT = 4;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
