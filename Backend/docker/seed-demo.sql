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
-- docs/briefs/live-demo-seed/plan.md, decision D2 as revised on 2026-11-17):
--
--   * the 50 categories, the backend's shared catalog: the only rows the app
--     does not create, because it only picks from them;
--   * seven accounts: giulia.bianchi (0 credits, one OPEN request queue),
--     marco.ricci, sara.mancini, davide.costa, chiara.marino, luca.ferrari
--     (1 credit each) and `demo.staff` (ROLE_STAFF, 1 credit). All of them use
--     the password `demo1234`, which is public demo material; the working
--     credentials and how to log in live in docs/setup.md;
--   * one offer and one request each, `demo.staff` included (the delivery-sheet
--     route needs a service of the caller's own); luca.ferrari's request is
--     soft-deleted, so the "deleted entries" sections have a row and the staff
--     restore action has something to restore;
--   * two queues: giulia.bianchi's OPEN REQUEST (the one the match tab shows)
--     and `demo.staff`'s OPEN OFFER. No queue is matched: see the note on the
--     matchmaking worker below;
--   * seven agreements, with `demo.staff` a party in every one of them, so a
--     single login reaches every state the product has:
--       - PENDING received (giulia.bianchi proposed, `demo.staff` has not
--         answered) and PENDING sent (`demo.staff` proposed, giulia has not
--         answered) — the two halves of "proposte ricevute" and "inviate";
--       - ACCEPTED, both delivery sheets compiled and confirmed
--         (marco.ricci <-> `demo.staff`);
--       - ACCEPTED, `demo.staff`'s own sheet still blank and davide.costa's
--         sheet compiled waiting for its confirmation;
--       - CANCELLED (`demo.staff` proposed, sara.mancini accepted, then
--         `demo.staff` called it off);
--       - COMPLETED (`chiara.marino` <-> `demo.staff`): both sheets carry dates
--         in the past and the backend's own scheduler closed it, they were not
--         set to COMPLETED by hand;
--       - REFUSED (`demo.staff` proposed, luca.ferrari answered no);
--   * three chats on three of those agreements: two with five messages each,
--     one still empty;
--   * two reports: one PENDING written by `demo.staff` about davide.costa, one
--     CONFIRMED (giulia.bianchi about marco.ricci) with the two audit rows its
--     claim and review wrote in `staff_operation_logs`;
--   * eleven notifications, four of them unread: `demo.staff`'s inbox holds
--     eight rows (a proposal, a refusal, sheets written and accepted, a
--     completed exchange and three chat messages) and carries a badge of three.
--
-- How it was produced (2026-11-17). The volume was rebuilt on the reference
-- schema with the accounts-only seed, `demo.staff` was created with the
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
--   POST   /services                       demo.staff: its own offer and request
--   POST   /create-exchange-agreement      the seven agreements
--   POST   /send-agreement-response        acceptances and one refusal
--   POST   /send-agreement-details         the compiled delivery sheets
--   POST   /accept-agreement-details/{id}  the beneficiary's confirmations
--   POST   /cancel-agreement/{id}          the accepted exchange -> CANCELLED
--   GET    /chats/agreement/{id}           creates the three chats
--   POST   /chats/send-message/{chatId}    the ten messages
--   POST   /create-service-queue           demo.staff's OFFER queue
--   POST   /reports                        the two reports
--   POST   /staff/reports/{id}/claim       giulia.bianchi's report
--   PATCH  /staff/reports/{id}/review      CONFIRMED, with a review note
--   DELETE /requests/{id}                  luca.ferrari's request (soft delete)
--   PATCH  /notifications/{id}/read        marks seven of the eleven as read
--   DELETE /notifications/{id}             trims the surplus the rows above
--                                          produced (each chat message writes a
--                                          notice): the inboxes are held at the
--                                          size D2 asks for, through the same
--                                          routes the app uses
--
-- and the COMPLETED agreement was closed by the backend's scheduler, run once:
--
--   php bin/console messenger:consume scheduler_default --limit=1
--
-- then dumped from that database with
--
--   mysqldump --no-create-info --complete-insert --skip-extended-insert --compact
--
-- and the stack was rebuilt from this file twice (`down -v` + up), comparing
-- the row count of each of the fourteen tables below: identical in both
-- rebuilds and identical to the counts measured before the dump.
--
-- Why no queue is matched: `App\Handler\QueueHandler` reads
-- `src/Dictionaries/<category description>.json` to extract the keywords a
-- match needs, and that directory holds a single file (`Programmazione.json`),
-- so for every category in this seed the worker dies with "Failed to open
-- stream: No such file or directory" and no agreement is created. The rule needs
-- a `Backend/src` change, which is out of scope for this file (docs/backend-gaps.md
-- carries the defect). The two queues here are ready to match on location and
-- type, so the day the dictionaries exist the worker has something to do.
--
-- Three deliberate omissions and one order:
--
--   * `messenger_messages` is the async transport, not app data, so a rebuilt
--     volume has it empty; the match job the queue creation left there is a
--     pending message, not a row worth restoring.
--   * `agreement_details.start_date` is `ON UPDATE CURRENT_TIMESTAMP` in the
--     reference dump, so a compiled sheet shows the moment of its last write as
--     the start date. That is schema defect G20 (docs/backend-gaps.md), not a
--     mistake in this file.
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
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES (7,'Valentina','Moretti','Bologna - Bologna','demo.staff','demo.staff@example.test','$2y$13$KywDlCW3aFyM1TVJNgLhUeJYoSpndco5I1Wn7ZRDwy/7ikRSAj4vW','[\"ROLE_STAFF\"]','ACTIVE',1,'2026-11-17 22:43:28','Moderazione della piattaforma e revisione dei testi condivisi nelle segnalazioni.',NULL);
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
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (12,6,'REQUEST','Mi serve aiuto per configurare il telefono nuovo.',1,'2026-11-16 00:37:25',0,0,'2026-11-17 22:46:15','Firenze - Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (13,7,'OFFER','Revisione di testi, relazioni e tesi: grammatica, lessico e impaginazione.',1,'2026-11-17 22:43:47',1,0,NULL,'Bologna - Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES (14,7,'REQUEST','Cerco aiuto per rimettere a posto le piante del balcone, una volta al mese.',1,'2026-11-17 22:43:49',0,0,NULL,'Bologna - Bologna');
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
INSERT INTO `agreements` (`id`, `status`, `creation_date`, `from_queue`) VALUES (1,'PENDING','2026-11-17 22:43:54',0);
INSERT INTO `agreements` (`id`, `status`, `creation_date`, `from_queue`) VALUES (2,'PENDING','2026-11-17 22:44:08',0);
INSERT INTO `agreements` (`id`, `status`, `creation_date`, `from_queue`) VALUES (3,'ACCEPTED','2026-11-17 22:44:15',0);
INSERT INTO `agreements` (`id`, `status`, `creation_date`, `from_queue`) VALUES (4,'ACCEPTED','2026-11-17 22:44:36',0);
INSERT INTO `agreements` (`id`, `status`, `creation_date`, `from_queue`) VALUES (5,'CANCELLED','2026-11-17 22:44:46',0);
INSERT INTO `agreements` (`id`, `status`, `creation_date`, `from_queue`) VALUES (6,'COMPLETED','2026-11-17 22:44:55',0);
INSERT INTO `agreements` (`id`, `status`, `creation_date`, `from_queue`) VALUES (7,'REFUSED','2026-11-17 22:45:25',0);
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (1,1,'Provider',1,'2026-11-17 22:43:54');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (1,7,'Beneficiary',NULL,'2026-11-17 22:43:54');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (2,1,'Beneficiary',NULL,'2026-11-17 22:44:08');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (2,7,'Provider',1,'2026-11-17 22:44:08');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (3,2,'Provider',1,'2026-11-17 22:44:15');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (3,7,'Beneficiary',1,'2026-11-17 22:44:20');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (4,4,'Provider',1,'2026-11-17 22:44:36');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (4,7,'Beneficiary',1,'2026-11-17 22:44:40');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (5,3,'Beneficiary',1,'2026-11-17 22:44:50');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (5,7,'Provider',1,'2026-11-17 22:44:46');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (6,5,'Provider',1,'2026-11-17 22:44:55');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (6,7,'Beneficiary',1,'2026-11-17 22:45:00');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (7,6,'Beneficiary',0,'2026-11-17 22:45:28');
INSERT INTO `agreement_proposal` (`agreement_id`, `user_id`, `role`, `response`, `response_date`) VALUES (7,7,'Provider',1,'2026-11-17 22:45:25');
INSERT INTO `agreement_details` (`agreement_id`, `provider_id`, `service_provided`, `beneficiary_id`, `from_remote`, `start_date`, `end_date`, `beneficiary_accepted`, `status`, `is_completed`) VALUES (3,2,3,7,0,'2026-11-17 22:44:31','2026-12-03 18:00:00',1,'COMPILED',0);
INSERT INTO `agreement_details` (`agreement_id`, `provider_id`, `service_provided`, `beneficiary_id`, `from_remote`, `start_date`, `end_date`, `beneficiary_accepted`, `status`, `is_completed`) VALUES (3,7,13,2,1,'2026-11-17 22:44:27','2026-11-28 19:00:00',1,'COMPILED',0);
INSERT INTO `agreement_details` (`agreement_id`, `provider_id`, `service_provided`, `beneficiary_id`, `from_remote`, `start_date`, `end_date`, `beneficiary_accepted`, `status`, `is_completed`) VALUES (4,4,7,7,0,'2026-11-20 09:00:00','2026-11-24 19:00:00',NULL,'COMPILED',0);
INSERT INTO `agreement_details` (`agreement_id`, `provider_id`, `service_provided`, `beneficiary_id`, `from_remote`, `start_date`, `end_date`, `beneficiary_accepted`, `status`, `is_completed`) VALUES (4,7,13,4,NULL,NULL,NULL,NULL,'UNCOMPILED',0);
INSERT INTO `agreement_details` (`agreement_id`, `provider_id`, `service_provided`, `beneficiary_id`, `from_remote`, `start_date`, `end_date`, `beneficiary_accepted`, `status`, `is_completed`) VALUES (5,3,5,7,NULL,NULL,NULL,NULL,'UNCOMPILED',0);
INSERT INTO `agreement_details` (`agreement_id`, `provider_id`, `service_provided`, `beneficiary_id`, `from_remote`, `start_date`, `end_date`, `beneficiary_accepted`, `status`, `is_completed`) VALUES (5,7,13,3,NULL,NULL,NULL,NULL,'UNCOMPILED',0);
INSERT INTO `agreement_details` (`agreement_id`, `provider_id`, `service_provided`, `beneficiary_id`, `from_remote`, `start_date`, `end_date`, `beneficiary_accepted`, `status`, `is_completed`) VALUES (6,5,9,7,0,'2026-11-17 22:45:13','2026-11-11 18:00:00',NULL,'COMPILED',1);
INSERT INTO `agreement_details` (`agreement_id`, `provider_id`, `service_provided`, `beneficiary_id`, `from_remote`, `start_date`, `end_date`, `beneficiary_accepted`, `status`, `is_completed`) VALUES (6,7,13,5,0,'2026-11-17 22:45:13','2026-11-12 19:00:00',NULL,'COMPILED',1);
INSERT INTO `chat` (`id`, `agreement_id`, `status`, `creation_date`) VALUES (1,3,'OPEN','2026-11-17 22:45:34');
INSERT INTO `chat` (`id`, `agreement_id`, `status`, `creation_date`) VALUES (2,4,'OPEN','2026-11-17 22:45:36');
INSERT INTO `chat` (`id`, `agreement_id`, `status`, `creation_date`) VALUES (3,6,'OPEN','2026-11-17 22:45:38');
INSERT INTO `chat_participants` (`chat_id`, `user_id`, `last_message_read`) VALUES (1,2,0);
INSERT INTO `chat_participants` (`chat_id`, `user_id`, `last_message_read`) VALUES (1,7,0);
INSERT INTO `chat_participants` (`chat_id`, `user_id`, `last_message_read`) VALUES (2,4,0);
INSERT INTO `chat_participants` (`chat_id`, `user_id`, `last_message_read`) VALUES (2,7,0);
INSERT INTO `chat_participants` (`chat_id`, `user_id`, `last_message_read`) VALUES (3,5,0);
INSERT INTO `chat_participants` (`chat_id`, `user_id`, `last_message_read`) VALUES (3,7,0);
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (1,1,2,'Ciao, ho letto la tua proposta: la relazione e\' quella con le foto delle macchine, vero?','2026-11-17 22:45:40');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (2,1,7,'Si\', quella. Se le foto restano, la revisione si ferma al testo e alla punteggiatura.','2026-11-17 22:45:42');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (3,1,2,'Perfetto. Te la mando giovedi\' mattina, sono una quindicina di pagine.','2026-11-17 22:45:44');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (4,1,7,'Va bene. E per il portatile che non parte piu\' ti scrivo sabato, cosi\' lo guardi.','2026-11-17 22:45:46');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (5,1,2,'Sabato va bene, passo io con il cavo.','2026-11-17 22:45:48');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (6,2,4,'Ciao, per le piante del balcone: quante sono e ogni quanto vanno annaffiate?','2026-11-17 22:45:50');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (7,2,7,'Sette vasi, due volte a settimana. Le grasse una volta sola, stanno sotto la tettoia.','2026-11-17 22:45:52');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (8,2,4,'Segnato. In cambio ti preparo i pranzi per la settimana, porzioni singole.','2026-11-17 22:45:55');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (9,2,7,'Ottimo. Comincio lunedi\' e ti mando una foto dei vasi sistemati.','2026-11-17 22:45:57');
INSERT INTO `chat_messages` (`id`, `chat_id`, `user_id`, `message`, `creation_date`) VALUES (10,2,4,'Grazie, a lunedi\'.','2026-11-17 22:46:00');
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (4,2,'AGREEMENT_RESPONSE','Ricevuta risposta da: demo.staff - Accettata','{\"agreementId\":3,\"response\":true}','2026-11-17 22:44:20','2026-11-17 22:46:37');
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (7,7,'AGREEMENT_DETAILS_ACCEPTED','Dettagli accettati da: marco.ricci','{\"agreementId\":3}','2026-11-17 22:44:27','2026-11-17 22:47:44');
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (14,3,'AGREEMENT_CANCELLED','Accordo annullato da: demo.staff','{\"agreementId\":5}','2026-11-17 22:44:52','2026-11-17 22:46:41');
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (15,7,'AGREEMENT_PROPOSAL','Ricevuto proposta di scambio da: chiara.marino','{\"agreementId\":6}','2026-11-17 22:44:55',NULL);
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (18,7,'AGREEMENT_DETAILS','Ricevuti dettagli da: chiara.marino','{\"agreementId\":6,\"fromRemote\":false,\"startDate\":\"2026-11-08\",\"endDate\":\"2026-11-11\"}','2026-11-17 22:45:04','2026-11-17 22:47:36');
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (19,7,'agreement_completed','Il servizio di chiara.marino è stato completato.','{\"agreementId\":6,\"username\":\"chiara.marino\",\"serviceDescription\":\"Tengo i gatti a casa mia quando partite, con aggiornamenti.\",\"startDate\":\"2026-11-08 10:00:00\",\"endDate\":\"2026-11-11 18:00:00\"}','2026-11-17 22:45:13','2026-11-17 22:47:27');
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (22,7,'AGREEMENT_RESPONSE','Ricevuta risposta da: luca.ferrari - Rifiutata','{\"agreementId\":7,\"response\":false}','2026-11-17 22:45:28','2026-11-17 22:47:25');
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (28,7,'CHAT_MESSAGE','Nuovo messaggio da: davide.costa','{\"agreementId\":4,\"chatId\":2,\"message\":\"Ciao, per le piante del balcone: quante sono e ogni quanto vanno annaffiate?\"}','2026-11-17 22:45:50',NULL);
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (30,7,'CHAT_MESSAGE','Nuovo messaggio da: davide.costa','{\"agreementId\":4,\"chatId\":2,\"message\":\"Segnato. In cambio ti preparo i pranzi per la settimana, porzioni singole.\"}','2026-11-17 22:45:55',NULL);
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (32,7,'CHAT_MESSAGE','Nuovo messaggio da: davide.costa','{\"agreementId\":4,\"chatId\":2,\"message\":\"Grazie, a lunedi\'.\"}','2026-11-17 22:46:00',NULL);
INSERT INTO `notifications` (`id`, `user_id`, `type`, `message`, `data`, `created_at`, `read_at`) VALUES (34,1,'REPORT_REVIEWED','Your report has been reviewed and confirmed.','{\"reportId\":2,\"status\":\"CONFIRMED\"}','2026-11-17 22:46:11','2026-11-17 22:46:21');
INSERT INTO `user_reports` (`id`, `reporter_id`, `reported_user_id`, `reason`, `creation_date`, `status`, `review_note`, `reviewed_at`, `reviewed_by_id`, `assigned_to_id`, `assigned_at`) VALUES (1,7,4,'La descrizione del servizio contiene un recapito esterno e un link per il pagamento.','2026-11-17 22:46:06','PENDING',NULL,NULL,NULL,NULL,NULL);
INSERT INTO `user_reports` (`id`, `reporter_id`, `reported_user_id`, `reason`, `creation_date`, `status`, `review_note`, `reviewed_at`, `reviewed_by_id`, `assigned_to_id`, `assigned_at`) VALUES (2,1,2,'Mi ha chiesto i dati personali in un messaggio privato prima di fissare lo scambio.','2026-11-17 22:46:08','CONFIRMED','Segnalazione fondata: i dati personali sono stati chiesti fuori dalla chat dello scambio. Utente avvisato.','2026-11-17 22:46:11',7,7,'2026-11-17 22:46:09');
INSERT INTO `staff_operation_logs` (`id`, `staff_id`, `staff_username`, `action`, `target_type`, `target_id`, `before_values`, `after_values`, `created_at`) VALUES (1,7,'demo.staff','REPORT_CLAIMED','REPORT',2,'{\"status\":\"PENDING\",\"assignedToId\":null,\"assignedAt\":null,\"reviewNote\":null,\"reviewedById\":null,\"reviewedAt\":null}','{\"status\":\"IN_REVIEW\",\"assignedToId\":7,\"assignedAt\":\"2026-11-17T22:46:09+00:00\",\"reviewNote\":null,\"reviewedById\":null,\"reviewedAt\":null}','2026-11-17 22:46:09');
INSERT INTO `staff_operation_logs` (`id`, `staff_id`, `staff_username`, `action`, `target_type`, `target_id`, `before_values`, `after_values`, `created_at`) VALUES (2,7,'demo.staff','REPORT_REVIEWED','REPORT',2,'{\"status\":\"IN_REVIEW\",\"assignedToId\":7,\"assignedAt\":\"2026-11-17T22:46:09+00:00\",\"reviewNote\":null,\"reviewedById\":null,\"reviewedAt\":null}','{\"status\":\"CONFIRMED\",\"assignedToId\":7,\"assignedAt\":\"2026-11-17T22:46:09+00:00\",\"reviewNote\":\"Segnalazione fondata: i dati personali sono stati chiesti fuori dalla chat dello scambio. Utente avvisato.\",\"reviewedById\":7,\"reviewedAt\":\"2026-11-17T22:46:11+00:00\"}','2026-11-17 22:46:11');

COMMIT;
