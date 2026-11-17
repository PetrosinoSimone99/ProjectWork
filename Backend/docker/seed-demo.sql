-- Demo seed for the local Docker stack: the rows the app itself writes.
--
-- The reference dump `barattolo_15112026.sql` is STRUCTURE ONLY (0 INSERTs) and
-- is mounted as `10-schema.sql`. This file is mounted right after it as
-- `20-seed.sql` and carries the data. docker-entrypoint-initdb.d runs it once,
-- on an empty data volume: after any edit the stack needs
-- `docker compose down -v`, which deletes the local database. That reset is the
-- declared cost of this file, not a surprise (docs/setup.md).
--
-- What a fresh database contains (the scenario of
-- docs/briefs/live-demo-seed/plan.md, decision D2):
--
--   * the 50 categories, the backend's shared catalog: the only rows the app
--     does not create, because it only picks from them;
--   * seven accounts: giulia.bianchi (0 credits, one OPEN request queue),
--     marco.ricci, sara.mancini, davide.costa, chiara.marino, luca.ferrari
--     (1 credit each) and `demo.staff` (ROLE_STAFF, 1 credit, one offer). All
--     of them use the password `demo1234`, which is public demo material; the
--     working credentials and how to log in live in docs/setup.md;
--   * one offer and one request each, `demo.staff` included (the delivery-sheet
--     route needs a service of the caller's own);
--   * two queues: giulia.bianchi's OPEN REQUEST (the one the match tab shows)
--     and `demo.staff`'s OPEN OFFER;
--   * five agreements, one per state worth showing: PENDING proposed by
--     giulia.bianchi and still unanswered by `demo.staff`; PENDING proposed by
--     `demo.staff` and still unanswered by giulia.bianchi; ACCEPTED with both
--     delivery sheets blank (marco.ricci and `demo.staff`); ACCEPTED with
--     davide.costa's sheet compiled and waiting for chiara.marino's
--     confirmation; CANCELLED (sara.mancini called off the exchange with
--     luca.ferrari);
--   * three chats on those agreements: two with five messages each, one empty;
--   * two reports: one PENDING written by `demo.staff` about davide.costa, one
--     CONFIRMED (giulia.bianchi about marco.ricci) with the two audit rows its
--     claim and review wrote in `staff_operation_logs`;
--   * eight notifications, four of them unread: the inbox `demo.staff` opens
--     holds four rows and carries a badge of three.
--
-- How it was produced (2026-11-17). The volume was rebuilt on the reference
-- schema with the seed this file replaces, `demo.staff` was created with the
-- backend's own command
--
--   php bin/console app:create-staff Valentina Moretti demo.staff \
--       demo.staff@example.test demo1234
--
-- and every other row was written by a throwaway script that called the
-- running API on http://localhost:8000 — never by a hand-written INSERT:
--
--   POST   /auth/login                     once per account
--   PATCH  /profile                        demo.staff: location and bio
--   POST   /services                       demo.staff: its own offer
--   POST   /create-exchange-agreement      the five agreements
--   POST   /send-agreement-response        the acceptances
--   POST   /send-agreement-details         davide.costa's delivery sheet
--   POST   /cancel-agreement/{id}          the accepted exchange -> CANCELLED
--   GET    /chats/agreement/{id}           creates the three chats
--   POST   /chats/send-message/{chatId}    the ten messages
--   POST   /create-service-queue           demo.staff's OFFER queue
--   POST   /reports                        the two reports
--   POST   /staff/reports/{id}/claim       giulia.bianchi's report
--   PATCH  /staff/reports/{id}/review      CONFIRMED, with a review note
--   PATCH  /notifications/{id}/read        marks four of the eight as read
--   DELETE /notifications/{id}             trims the surplus the rows above
--                                          produced (each chat message writes
--                                          a notice): the inbox is held at the
--                                          size D2 asks for, through the same
--                                          route the app uses to empty it
--
-- then dumped from that database with
--
--   mysqldump --no-create-info --complete-insert --skip-extended-insert --compact
--
-- and the stack was rebuilt from this file twice (`down -v` + up), comparing
-- the row count of each of the fourteen tables below: identical in both
-- rebuilds and identical to the counts measured before the dump.
--
-- Two deliberate omissions and one order:
--
--   * `messenger_messages` is the async transport, not app data, so a rebuilt
--     volume has it empty; the match job the queue creation left there is a
--     pending message, not a row worth restoring.
--   * `agreement_details.start_date` is `ON UPDATE CURRENT_TIMESTAMP` in the
--     reference dump, so the compiled sheet shows the moment of its last write
--     as the start date. That is schema defect G20 (docs/backend-gaps.md), not
--     a mistake in this file.
--   * tables are dumped parents first because the schema carries foreign keys
--     and this file keeps them enabled.
--
-- Owned by the Docker exception in AGENTS.md; reported in docs/changelog.md.
-- Never mount this file outside the local stack.

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
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES (7,'Valentina','Moretti','Bologna - Bologna','demo.staff','demo.staff@example.test','$2y$13$ZCxIR0ZF.llxLHQnjCj4Jut9Ef4gea08KQ1BCNRHTXw9HIt1/mwMS','[\"ROLE_STAFF\"]','ACTIVE',1,'2026-11-17 22:11:03','Moderazione della piattaforma e revisione dei testi condivisi nelle segnalazioni.',NULL);
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
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (13,7,'OFFER','Revisione di testi, relazioni e tesi: grammatica, lessico e impaginazione.',1,'2026-11-17 22:11:18',1,0,NULL,'Bologna - Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (14,7,'REQUEST','Cerco aiuto per rimettere a posto le piante del balcone, una volta al mese.',1,'2026-11-17 22:11:19',0,0,NULL,'Bologna - Bologna');
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
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES (13,25);
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES (14,3);
INSERT INTO `service_queues` (`id`, `user_id`, `type`, `service_id`, `location`, `agreement_created`, `status`) VALUES (1,1,'REQUEST',2,'Roma - Roma',NULL,'OPEN');
INSERT INTO `service_queues` (`id`, `user_id`, `type`, `service_id`, `location`, `agreement_created`, `status`) VALUES (2,7,'OFFER',13,'Bologna - Bologna',NULL,'OPEN');
INSERT INTO `agreements` (`id`, `status`, `creation_date`, `from_queue`) VALUES (1,'PENDING','2026-11-17 22:11:23',0);
INSERT INTO `agreements` (`id`, `status`, `creation_date`, `from_queue`) VALUES (2,'PENDING','2026-11-17 22:11:29',0);
INSERT INTO `agreements` (`id`, `status`, `creation_date`, `from_queue`) VALUES (3,'ACCEPTED','2026-11-17 22:11:35',0);
INSERT INTO `agreements` (`id`, `status`, `creation_date`, `from_queue`) VALUES (4,'ACCEPTED','2026-11-17 22:11:43',0);
INSERT INTO `agreements` (`id`, `status`, `creation_date`, `from_queue`) VALUES (5,'CANCELLED','2026-11-17 22:11:59',0);
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (1,1,'Provider',1,'2026-11-17 22:11:23');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (1,7,'Beneficiary',NULL,'2026-11-17 22:11:23');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (2,1,'Beneficiary',NULL,'2026-11-17 22:11:29');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (2,7,'Provider',1,'2026-11-17 22:11:29');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (3,2,'Provider',1,'2026-11-17 22:11:35');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (3,7,'Beneficiary',1,'2026-11-17 22:11:39');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (4,4,'Provider',1,'2026-11-17 22:11:43');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (4,5,'Beneficiary',1,'2026-11-17 22:11:48');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (5,3,'Provider',1,'2026-11-17 22:11:59');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (5,6,'Beneficiary',1,'2026-11-17 22:12:03');
INSERT INTO `agreement_details` (`agreement_id`, `provider_id`, `service_provided`, `beneficiary_id`, `from_remote`, `start_date`, `end_date`, `beneficiary_accepted`, `status`, `is_completed`) VALUES (3,2,3,7,NULL,NULL,NULL,NULL,'UNCOMPILED',0);
INSERT INTO `agreement_details` (`agreement_id`, `provider_id`, `service_provided`, `beneficiary_id`, `from_remote`, `start_date`, `end_date`, `beneficiary_accepted`, `status`, `is_completed`) VALUES (3,7,13,2,NULL,NULL,NULL,NULL,'UNCOMPILED',0);
INSERT INTO `agreement_details` (`agreement_id`, `provider_id`, `service_provided`, `beneficiary_id`, `from_remote`, `start_date`, `end_date`, `beneficiary_accepted`, `status`, `is_completed`) VALUES (4,4,7,5,0,'2026-11-20 09:00:00','2026-11-24 19:00:00',NULL,'COMPILED',0);
INSERT INTO `agreement_details` (`agreement_id`, `provider_id`, `service_provided`, `beneficiary_id`, `from_remote`, `start_date`, `end_date`, `beneficiary_accepted`, `status`, `is_completed`) VALUES (4,5,9,4,NULL,NULL,NULL,NULL,'UNCOMPILED',0);
INSERT INTO `agreement_details` (`agreement_id`, `provider_id`, `service_provided`, `beneficiary_id`, `from_remote`, `start_date`, `end_date`, `beneficiary_accepted`, `status`, `is_completed`) VALUES (5,3,5,6,NULL,NULL,NULL,NULL,'UNCOMPILED',0);
INSERT INTO `agreement_details` (`agreement_id`, `provider_id`, `service_provided`, `beneficiary_id`, `from_remote`, `start_date`, `end_date`, `beneficiary_accepted`, `status`, `is_completed`) VALUES (5,6,11,3,NULL,NULL,NULL,NULL,'UNCOMPILED',0);
INSERT INTO `chat` (`id`, `agreement_id`, `status`, `creation_date`) VALUES (1,3,'OPEN','2026-11-17 22:12:08');
INSERT INTO `chat` (`id`, `agreement_id`, `status`, `creation_date`) VALUES (2,4,'OPEN','2026-11-17 22:12:10');
INSERT INTO `chat` (`id`, `agreement_id`, `status`, `creation_date`) VALUES (3,5,'OPEN','2026-11-17 22:12:13');
INSERT INTO `chat_participants` (`chat_id`, `user_id`, `last_message_read`) VALUES (1,2,0);
INSERT INTO `chat_participants` (`chat_id`, `user_id`, `last_message_read`) VALUES (1,7,0);
INSERT INTO `chat_participants` (`chat_id`, `user_id`, `last_message_read`) VALUES (2,4,0);
INSERT INTO `chat_participants` (`chat_id`, `user_id`, `last_message_read`) VALUES (2,5,0);
INSERT INTO `chat_participants` (`chat_id`, `user_id`, `last_message_read`) VALUES (3,3,0);
INSERT INTO `chat_participants` (`chat_id`, `user_id`, `last_message_read`) VALUES (3,6,0);
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (1,1,2,'Ciao, ho letto la tua proposta per la revisione della relazione: posso passarti il testo giovedì.','2026-11-17 22:12:14');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (2,1,7,'Giovedì va bene. Mandami il file la mattina, così lo leggo con calma.','2026-11-17 22:12:16');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (3,1,2,'Te lo mando per le nove. Sono una quindicina di pagine, con le foto già impaginate.','2026-11-17 22:12:18');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (4,1,7,'Se le foto restano, la revisione si ferma al testo. Va bene anche a te?','2026-11-17 22:12:21');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (5,1,2,'Sì, va bene. Grazie.','2026-11-17 22:12:23');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (6,2,4,'Ciao Chiara, per i gatti ti lascio le chiavi sabato mattina.','2026-11-17 22:12:25');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (7,2,5,'Va bene. Quanti giorni resti via?','2026-11-17 22:12:27');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (8,2,4,'Cinque giorni, torno giovedì sera. Biscotto mangia due volte al giorno.','2026-11-17 22:12:29');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (9,2,5,'Segnato. Ti mando una foto ogni sera, così sei tranquillo.','2026-11-17 22:12:31');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (10,2,4,'Grazie, sei gentilissima.','2026-11-17 22:12:34');
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (1,7,'AGREEMENT_PROPOSAL','Ricevuto proposta di scambio da: giulia.bianchi','{\"agreementId\":1}','2026-11-17 22:11:23','2026-11-17 22:13:35');
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (4,2,'AGREEMENT_RESPONSE','Ricevuta risposta da: demo.staff - Accettata','{\"agreementId\":3,\"response\":true}','2026-11-17 22:11:40','2026-11-17 22:13:03');
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (7,5,'AGREEMENT_DETAILS','Ricevuti dettagli da: davide.costa','{\"agreementId\":4,\"fromRemote\":false,\"startDate\":\"2026-11-20\",\"endDate\":\"2026-11-24\"}','2026-11-17 22:11:53','2026-11-17 22:13:24');
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (10,6,'AGREEMENT_CANCELLED','Accordo annullato da: sara.mancini','{\"agreementId\":5}','2026-11-17 22:12:06','2026-11-17 22:13:29');
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (11,7,'CHAT_MESSAGE','Nuovo messaggio da: marco.ricci','{\"agreementId\":3,\"chatId\":1,\"message\":\"Ciao, ho letto la tua proposta per la revisione della relazione: posso passarti il testo gioved\\u00ec.\"}','2026-11-17 22:12:15',NULL);
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (13,7,'CHAT_MESSAGE','Nuovo messaggio da: marco.ricci','{\"agreementId\":3,\"chatId\":1,\"message\":\"Te lo mando per le nove. Sono una quindicina di pagine, con le foto gi\\u00e0 impaginate.\"}','2026-11-17 22:12:19',NULL);
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (15,7,'CHAT_MESSAGE','Nuovo messaggio da: marco.ricci','{\"agreementId\":3,\"chatId\":1,\"message\":\"S\\u00ec, va bene. Grazie.\"}','2026-11-17 22:12:23',NULL);
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (22,1,'REPORT_REVIEWED','Your report has been reviewed and confirmed.','{\"reportId\":2,\"status\":\"CONFIRMED\"}','2026-11-17 22:12:46',NULL);
INSERT INTO `user_reports` (`id`, `reporter_id`, `reported_user_id`, `reason`, `creation_date`, `status`, `review_note`, `reviewed_at`, `reviewed_by_id`, `assigned_to_id`, `assigned_at`) VALUES (1,7,4,'La descrizione del servizio contiene un recapito esterno e un link per il pagamento.','2026-11-17 22:12:41','PENDING',NULL,NULL,NULL,NULL,NULL);
INSERT INTO `user_reports` (`id`, `reporter_id`, `reported_user_id`, `reason`, `creation_date`, `status`, `review_note`, `reviewed_at`, `reviewed_by_id`, `assigned_to_id`, `assigned_at`) VALUES (2,1,2,'Mi ha chiesto i dati personali in un messaggio privato prima di fissare lo scambio.','2026-11-17 22:12:42','CONFIRMED','Segnalazione fondata: i dati personali sono stati chiesti fuori dalla chat dello scambio. Utente avvisato.','2026-11-17 22:12:46',7,7,'2026-11-17 22:12:44');
INSERT INTO `staff_operation_logs` (`id`, `staff_id`, `staff_username`, `action`, `target_type`, `target_id`, `before_values`, `after_values`, `created_at`) VALUES (1,7,'demo.staff','REPORT_CLAIMED','REPORT',2,'{\"status\":\"PENDING\",\"assignedToId\":null,\"assignedAt\":null,\"reviewNote\":null,\"reviewedById\":null,\"reviewedAt\":null}','{\"status\":\"IN_REVIEW\",\"assignedToId\":7,\"assignedAt\":\"2026-11-17T22:12:44+00:00\",\"reviewNote\":null,\"reviewedById\":null,\"reviewedAt\":null}','2026-11-17 22:12:44');
INSERT INTO `staff_operation_logs` (`id`, `staff_id`, `staff_username`, `action`, `target_type`, `target_id`, `before_values`, `after_values`, `created_at`) VALUES (2,7,'demo.staff','REPORT_REVIEWED','REPORT',2,'{\"status\":\"IN_REVIEW\",\"assignedToId\":7,\"assignedAt\":\"2026-11-17T22:12:44+00:00\",\"reviewNote\":null,\"reviewedById\":null,\"reviewedAt\":null}','{\"status\":\"CONFIRMED\",\"assignedToId\":7,\"assignedAt\":\"2026-11-17T22:12:44+00:00\",\"reviewNote\":\"Segnalazione fondata: i dati personali sono stati chiesti fuori dalla chat dello scambio. Utente avvisato.\",\"reviewedById\":7,\"reviewedAt\":\"2026-11-17T22:12:46+00:00\"}','2026-11-17 22:12:46');

COMMIT;
