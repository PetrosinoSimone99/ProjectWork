-- Baratto-lo: local application schema and data, updated with backend migrations.
-- Prepared for the 2026-10-13 staff administration and report reviews feature.
-- Import into an empty database; JWT keys and database credentials are not included.

-- MySQL dump 10.13  Distrib 8.4.3, for Win64 (x86_64)
--
-- Source: local barattolo database
-- ------------------------------------------------------
-- Server version	8.4.3

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

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_3AF346687E3C61F9` (`description`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Cooking'),(2,'Gardening');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chain_agreements`
--

DROP TABLE IF EXISTS `chain_agreements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chain_agreements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `recipient_id` int NOT NULL,
  `service_id` int NOT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_at` datetime NOT NULL,
  `status` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `decided_at` datetime DEFAULT NULL,
  `pending_key` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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

--
-- Dumping data for table `chain_agreements`
--

LOCK TABLES `chain_agreements` WRITE;
/*!40000 ALTER TABLE `chain_agreements` DISABLE KEYS */;
/*!40000 ALTER TABLE `chain_agreements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chain_service_reservations`
--

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

--
-- Dumping data for table `chain_service_reservations`
--

LOCK TABLES `chain_service_reservations` WRITE;
/*!40000 ALTER TABLE `chain_service_reservations` DISABLE KEYS */;
/*!40000 ALTER TABLE `chain_service_reservations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doctrine_migration_versions`
--

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

--
-- Dumping data for table `doctrine_migration_versions`
--

LOCK TABLES `doctrine_migration_versions` WRITE;
/*!40000 ALTER TABLE `doctrine_migration_versions` DISABLE KEYS */;
INSERT INTO `doctrine_migration_versions` VALUES ('DoctrineMigrations\\Version20260924000100','2026-09-26 12:02:19',31),('DoctrineMigrations\\Version20260924000200','2026-09-26 12:02:19',867),('DoctrineMigrations\\Version20260925000100','2026-09-26 12:02:20',23),('DoctrineMigrations\\Version20261003000100','2026-10-03 14:52:04',1993),('DoctrineMigrations\\Version20261013000100','2026-10-13 11:05:15',25),('DoctrineMigrations\\Version20261013000200','2026-10-13 11:05:15',88);
/*!40000 ALTER TABLE `doctrine_migration_versions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `group_participants`
--

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
  `decision` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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

--
-- Dumping data for table `group_participants`
--

LOCK TABLES `group_participants` WRITE;
/*!40000 ALTER TABLE `group_participants` DISABLE KEYS */;
/*!40000 ALTER TABLE `group_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proposal_groups`
--

DROP TABLE IF EXISTS `proposal_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proposal_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `current_offered_service` int DEFAULT NULL,
  `last_requested_service` int DEFAULT NULL,
  `creation_date` datetime NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `initiator_id` int DEFAULT NULL,
  `offered_service_id` int DEFAULT NULL,
  `requested_service_id` int DEFAULT NULL,
  `application_status` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `search_deadline` datetime DEFAULT NULL,
  `confirmation_deadline` datetime DEFAULT NULL,
  `proposed_at` datetime DEFAULT NULL,
  `next_search_at` datetime DEFAULT NULL,
  `cancelled_by_id` int DEFAULT NULL,
  `cancellation_reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `active_search_key` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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

--
-- Dumping data for table `proposal_groups`
--

LOCK TABLES `proposal_groups` WRITE;
/*!40000 ALTER TABLE `proposal_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `proposal_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proposal_participants`
--

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

--
-- Dumping data for table `proposal_participants`
--

LOCK TABLES `proposal_participants` WRITE;
/*!40000 ALTER TABLE `proposal_participants` DISABLE KEYS */;
/*!40000 ALTER TABLE `proposal_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proposals`
--

DROP TABLE IF EXISTS `proposals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proposals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `status` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `offer_pair_key` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `creation_date` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `proposal_offer_pair_unique` (`offer_pair_key`),
  KEY `proposals_status_created_index` (`status`,`creation_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proposals`
--

LOCK TABLES `proposals` WRITE;
/*!40000 ALTER TABLE `proposals` DISABLE KEYS */;
/*!40000 ALTER TABLE `proposals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_categories`
--

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

--
-- Dumping data for table `service_categories`
--

LOCK TABLES `service_categories` WRITE;
/*!40000 ALTER TABLE `service_categories` DISABLE KEYS */;
INSERT INTO `service_categories` VALUES (1,1),(2,2);
/*!40000 ALTER TABLE `service_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_participants`
--

DROP TABLE IF EXISTS `service_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_participants` (
  `service_provision_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`service_provision_id`,`user_id`),
  KEY `fk_chain_service_participants_user_id` (`user_id`),
  CONSTRAINT `fk_chain_service_participants_service_provision_id` FOREIGN KEY (`service_provision_id`) REFERENCES `service_provision` (`id`),
  CONSTRAINT `fk_chain_service_participants_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_participants`
--

LOCK TABLES `service_participants` WRITE;
/*!40000 ALTER TABLE `service_participants` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_provision`
--

DROP TABLE IF EXISTS `service_provision`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_provision` (
  `id` int NOT NULL AUTO_INCREMENT,
  `exchange_group_id` int DEFAULT NULL,
  `service_id` int DEFAULT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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

--
-- Dumping data for table `service_provision`
--

LOCK TABLES `service_provision` WRITE;
/*!40000 ALTER TABLE `service_provision` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_provision` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `creation_date` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  PRIMARY KEY (`id`),
  KEY `services_user_type_index` (`user_id`,`type`),
  CONSTRAINT `FK_SERVICES_USER` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES (1,2,'OFFER','I can cook Italian meals.','2026-09-26 13:56:47'),(2,2,'REQUEST','I need help with gardening.','2026-09-26 13:56:47');
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `swipe_decisions`
--

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

--
-- Dumping data for table `swipe_decisions`
--

LOCK TABLES `swipe_decisions` WRITE;
/*!40000 ALTER TABLE `swipe_decisions` DISABLE KEYS */;
/*!40000 ALTER TABLE `swipe_decisions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tokens`
--

DROP TABLE IF EXISTS `tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `expiration_date` datetime NOT NULL,
  `group_id` int DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chain_token_unique` (`group_id`,`user_id`),
  KEY `fk_chain_tokens_user_id` (`user_id`),
  CONSTRAINT `fk_chain_tokens_group_id` FOREIGN KEY (`group_id`) REFERENCES `proposal_groups` (`id`),
  CONSTRAINT `fk_chain_tokens_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tokens`
--

LOCK TABLES `tokens` WRITE;
/*!40000 ALTER TABLE `tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_reports`
--

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

--
-- Dumping data for table `user_reports`
--

LOCK TABLES `user_reports` WRITE;
/*!40000 ALTER TABLE `user_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Mario','Rossi',NULL,'mario.rossi','mario@example.com','$2y$13$CIUnNOSKl/TL9aHlGD1pu.45SEKGRjjIh9SqgJcu2sC3rZoh1GjRS','[\"ROLE_USER\"]','ACTIVE','2026-09-26 12:22:15',NULL,NULL),(2,'Luca','Rossi','Milan','luca.rossi','luca@example.com','$2y$13$/0/7YvWZErrGoPcfJ.4XUevWBahuassbBRn/OOU/cMDi6vBhgSs/u','[\"ROLE_USER\"]','ACTIVE','2026-09-26 13:56:46',NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed
