-- Demo seed for the local Docker stack: the rows the app itself writes.
--
-- The reference dump `barattolo_15112026.sql` is STRUCTURE ONLY (0 INSERTs) and
-- is mounted as `10-schema.sql`. This file is mounted right after it as
-- `20-seed.sql` and carries the data, in the shapes the frontend produces:
--
--   * six accounts, one per city, registered through the web build picking
--     Provincia then Comune (password `demo1234`: eight characters, the minimum
--     the registration form accepts);
--   * one offer and one request each: the product rule allows exactly one of
--     each per person, and `POST /create-service-queue` needs exactly one of the
--     type it queues;
--   * `users.location` and `services.location` in the composed format
--     `Comune - Provincia`; registration copies the person's location into the
--     two services it creates (`Frontend/src/api/index.js`), which is why both
--     tables carry the same string;
--   * an OPEN `REQUEST` queue for `giulia.bianchi`, created from the match tab,
--     which is why that account sits at `credits = 0` while the other five are
--     at 1 (a new account starts with one credit, `User::__construct`);
--   * the 50 categories, the backend's shared catalog: the only rows the app
--     does not create, because it only picks from them.
--
-- How it was produced (2026-11-16): the volume was rebuilt on the reference
-- schema with the category catalog alone, the six accounts and the queue were
-- created through the app (Playwright driving the web build: real form, real
-- payloads, real credit movements), then this file was dumped from that
-- database with
--
--   mysqldump --no-create-info --complete-insert --skip-extended-insert --compact
--
-- and the stack was rebuilt from it, proving it reproduces the same rows.
-- Owned by the Docker exception in AGENTS.md; reported in docs/changelog.md.
-- Never mount this file outside the local stack: it contains working
-- credentials for six demo accounts.
--
-- Accounts: giulia.bianchi (0 credits, one OPEN request queue), marco.ricci,
-- sara.mancini, davide.costa, chiara.marino, luca.ferrari (1 credit each).
-- The four credit movements are documented in docs/api.md.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- One transaction, so a failed row cannot leave the volume half-seeded: the
-- entrypoint runs with `set -e` but MySQL autocommits INSERT by INSERT, and
-- initdb only ever runs on an empty datadir — the only cure would be another
-- `down -v`.
START TRANSACTION;

INSERT INTO `categories` (`id`, `description`) VALUES (36,'Aiuto compiti');
INSERT INTO `categories` (`id`, `description`) VALUES (15,'Assistenza computer');
INSERT INTO `categories` (`id`, `description`) VALUES (16,'Assistenza smartphone');
INSERT INTO `categories` (`id`, `description`) VALUES (40,'Canto');
INSERT INTO `categories` (`id`, `description`) VALUES (50,'Cat sitting');
INSERT INTO `categories` (`id`, `description`) VALUES (34,'Chimica');
INSERT INTO `categories` (`id`, `description`) VALUES (38,'Chitarra');
INSERT INTO `categories` (`id`, `description`) VALUES (48,'Corsa');
INSERT INTO `categories` (`id`, `description`) VALUES (42,'Cucina italiana');
INSERT INTO `categories` (`id`, `description`) VALUES (45,'Cucina vegetariana');
INSERT INTO `categories` (`id`, `description`) VALUES (11,'Cucito');
INSERT INTO `categories` (`id`, `description`) VALUES (3,'Cura delle piante');
INSERT INTO `categories` (`id`, `description`) VALUES (26,'Curriculum e colloqui');
INSERT INTO `categories` (`id`, `description`) VALUES (49,'Dog sitting');
INSERT INTO `categories` (`id`, `description`) VALUES (13,'Falegnameria');
INSERT INTO `categories` (`id`, `description`) VALUES (33,'Fisica');
INSERT INTO `categories` (`id`, `description`) VALUES (47,'Fitness');
INSERT INTO `categories` (`id`, `description`) VALUES (20,'Fogli di calcolo');
INSERT INTO `categories` (`id`, `description`) VALUES (22,'Fotografia');
INSERT INTO `categories` (`id`, `description`) VALUES (23,'Fotoritocco');
INSERT INTO `categories` (`id`, `description`) VALUES (28,'Francese');
INSERT INTO `categories` (`id`, `description`) VALUES (1,'Giardinaggio');
INSERT INTO `categories` (`id`, `description`) VALUES (21,'Grafica digitale');
INSERT INTO `categories` (`id`, `description`) VALUES (8,'Idraulica domestica');
INSERT INTO `categories` (`id`, `description`) VALUES (35,'Informatica scolastica');
INSERT INTO `categories` (`id`, `description`) VALUES (27,'Inglese');
INSERT INTO `categories` (`id`, `description`) VALUES (31,'Italiano per stranieri');
INSERT INTO `categories` (`id`, `description`) VALUES (32,'Matematica');
INSERT INTO `categories` (`id`, `description`) VALUES (6,'Montaggio mobili');
INSERT INTO `categories` (`id`, `description`) VALUES (24,'Montaggio video');
INSERT INTO `categories` (`id`, `description`) VALUES (5,'Organizzazione della casa');
INSERT INTO `categories` (`id`, `description`) VALUES (2,'Orto domestico');
INSERT INTO `categories` (`id`, `description`) VALUES (43,'Panificazione');
INSERT INTO `categories` (`id`, `description`) VALUES (44,'Pasticceria');
INSERT INTO `categories` (`id`, `description`) VALUES (39,'Pianoforte');
INSERT INTO `categories` (`id`, `description`) VALUES (7,'Piccole riparazioni');
INSERT INTO `categories` (`id`, `description`) VALUES (37,'Preparazione esami');
INSERT INTO `categories` (`id`, `description`) VALUES (19,'Programmazione Python');
INSERT INTO `categories` (`id`, `description`) VALUES (18,'Programmazione web');
INSERT INTO `categories` (`id`, `description`) VALUES (4,'Pulizie domestiche');
INSERT INTO `categories` (`id`, `description`) VALUES (14,'Restauro mobili');
INSERT INTO `categories` (`id`, `description`) VALUES (17,'Reti Wi-Fi');
INSERT INTO `categories` (`id`, `description`) VALUES (12,'Ricamo');
INSERT INTO `categories` (`id`, `description`) VALUES (10,'Riparazione biciclette');
INSERT INTO `categories` (`id`, `description`) VALUES (25,'Scrittura e revisione');
INSERT INTO `categories` (`id`, `description`) VALUES (29,'Spagnolo');
INSERT INTO `categories` (`id`, `description`) VALUES (30,'Tedesco');
INSERT INTO `categories` (`id`, `description`) VALUES (41,'Teoria musicale');
INSERT INTO `categories` (`id`, `description`) VALUES (9,'Tinteggiatura');
INSERT INTO `categories` (`id`, `description`) VALUES (46,'Yoga');
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES (1,'Giulia','Bianchi','Roma - Roma','giulia.bianchi','giulia.bianchi@example.test','$2y$13$M4sgWi5FAoYKmdnvN0lqAOTYW1ZhnYx.kLQqk.PwXa.LDN24P7hHO','[\"ROLE_USER\"]','ACTIVE',0,'2026-11-16 00:33:01',NULL,NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES (2,'Marco','Ricci','Milano - Milano','marco.ricci','marco.ricci@example.test','$2y$13$GXmUkTf6eRm/h52sXs4gEuoHDI.lRPKBhiR20ghmVd1oJuZ/Mphd6','[\"ROLE_USER\"]','ACTIVE',1,'2026-11-16 00:34:13',NULL,NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES (3,'Sara','Mancini','Torino - Torino','sara.mancini','sara.mancini@example.test','$2y$13$8R08s2x8HrkeOJzKu4NEHOy3RCrbXEWojU1pzmx7JrbFXsWCtUsFi','[\"ROLE_USER\"]','ACTIVE',1,'2026-11-16 00:34:44',NULL,NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES (4,'Davide','Costa','Bologna - Bologna','davide.costa','davide.costa@example.test','$2y$13$FGDcy9JElD04Diz5l9c.Tu7SM/L/0/2s6ydaaqQN3Ol2qutYe.aSq','[\"ROLE_USER\"]','ACTIVE',1,'2026-11-16 00:35:24',NULL,NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES (5,'Chiara','Marino','Napoli - Napoli','chiara.marino','chiara.marino@example.test','$2y$13$TxXzfoPztLQN0gIFqe8Xc.RqA73KXK72Mbx8m6Zv3kE0RCnzROy6q','[\"ROLE_USER\"]','ACTIVE',1,'2026-11-16 00:36:45',NULL,NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES (6,'Luca','Ferrari','Firenze - Firenze','luca.ferrari','luca.ferrari@example.test','$2y$13$7F69kxunqfgPEzNV9D3yZ.laPuaz.8X4.ZC/ridW4/a5rmfJezlmy','[\"ROLE_USER\"]','ACTIVE',1,'2026-11-16 00:37:24',NULL,NULL);
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (1,1,'OFFER','Aiuto compiti per ragazzi delle medie, due pomeriggi a settimana.',1,'2026-11-16 00:33:02',0,0,NULL,'Roma - Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (2,1,'REQUEST','Mi serve un piccolo lavoro di cucito su una giacca.',1,'2026-11-16 00:33:02',0,0,NULL,'Roma - Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (3,2,'OFFER','Riparo computer e stampanti a domicilio, anche la sera.',1,'2026-11-16 00:34:13',0,0,NULL,'Milano - Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (4,2,'REQUEST','Cerco qualcuno che annaffi le piante quando sono via.',1,'2026-11-16 00:34:13',0,0,NULL,'Milano - Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (5,3,'OFFER','Lezioni di chitarra acustica per principianti, un ora a settimana.',1,'2026-11-16 00:34:44',0,0,NULL,'Torino - Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (6,3,'REQUEST','Cerco un compagno di corsa per due uscite a settimana.',1,'2026-11-16 00:34:44',0,0,NULL,'Torino - Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (7,4,'OFFER','Preparo pranzi per la settimana, porzioni singole.',1,'2026-11-16 00:35:24',0,0,NULL,'Bologna - Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (8,4,'REQUEST','Mi serve un orlo su due paia di pantaloni.',1,'2026-11-16 00:35:24',0,0,NULL,'Bologna - Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (9,5,'OFFER','Tengo i gatti a casa mia quando partite, con aggiornamenti.',1,'2026-11-16 00:36:45',0,0,NULL,'Napoli - Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (10,5,'REQUEST','Cerco aiuto per matematica, seconda superiore.',1,'2026-11-16 00:36:45',0,0,NULL,'Napoli - Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (11,6,'OFFER','Rinvaso e potatura delle piante da appartamento.',1,'2026-11-16 00:37:25',0,0,NULL,'Firenze - Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (12,6,'REQUEST','Mi serve aiuto per configurare il telefono nuovo.',1,'2026-11-16 00:37:25',0,0,NULL,'Firenze - Firenze');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES (1,36);
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES (2,11);
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES (3,15);
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES (4,3);
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES (5,38);
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES (6,48);
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES (7,42);
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES (8,11);
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES (9,50);
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES (10,36);
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES (11,3);
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES (12,16);
INSERT INTO `service_queues` (`id`, `user_id`, `type`, `service_id`, `location`, `agreement_created`, `status`) VALUES (1,1,'REQUEST',2,'Roma - Roma',NULL,'OPEN');

COMMIT;
