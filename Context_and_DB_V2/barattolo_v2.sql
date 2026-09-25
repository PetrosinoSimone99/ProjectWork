CREATE TABLE `users` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `surname` varchar(50) NOT NULL,
  `location` varchar(255),
  `bio` text,
  `profile_image_url` varchar(2048),
  `username` varchar(30) NOT NULL UNIQUE,
  `email` varchar(180) NOT NULL UNIQUE,
  `password_hash` varchar(255) NOT NULL,
  `roles` json NOT NULL,
  `account_status` ENUM ('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `creation_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `services` (
  `id` int PRIMARY KEY,
  `user_id` int,
  `type` ENUM ('RICHIESTA', 'OFFERTA'),
  `description` varchar(255),
  `creation_date` timestamp
);

CREATE TABLE `service_categories` (
  `service_id` int,
  `category_id` int,
  PRIMARY KEY (`service_id`, `category_id`)
);

CREATE TABLE `categories` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `description` varchar(255)
);

CREATE TABLE `proposals` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `location` varchar(255),
  `status` ENUM ('IN_ATTESA', 'ACCETTATO', 'RIFIUTATO'),
  `creation_date` timestamp
);

CREATE TABLE `proposal_participants` (
  `proposal_id` int,
  `user_id` int,
  `service_id` int,
  `confirmation_date` timestamp,
  PRIMARY KEY (`proposal_id`, `user_id`, `service_id`)
);

CREATE TABLE `chat` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `proposal_id` int,
  `creation_date` timestamp
);

CREATE TABLE `chat_participants` (
  `chat_id` int,
  `user_id` int,
  `last_message_read` int,
  PRIMARY KEY (`chat_id`, `user_id`)
);

CREATE TABLE `chat_messages` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `chat_id` int,
  `user_id` int,
  `message` text,
  `creation_date` timestamp
);

CREATE TABLE `exchange_1_on_1` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `proposal_id` int,
  `location` varchar(255),
  `status` ENUM ('IN_ATTESA', 'ACCETTATO', 'RIFIUTATO'),
  `creation_date` timestamp
);

CREATE TABLE `exchange_participants` (
  `exchange_id` int,
  `user_id` int,
  `service_id` int,
  `start_date` timestamp,
  `completion_date` timestamp,
  `exchange_accepted` boolean,
  PRIMARY KEY (`exchange_id`, `user_id`, `service_id`)
);

CREATE TABLE `exchange_group_proposal` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `current_offered_service` int,
  `last_requested_service` int,
  `creation_date` timestamp,
  `status` ENUM ('IN_ATTESA', 'CONFERMATO', 'ANNULLATO'),
  `location` varchar(255)
);

CREATE TABLE `group_participants` (
  `group_id` int,
  `user_id` int,
  `received_service` int,
  PRIMARY KEY (`group_id`, `user_id`, `received_service`)
);

CREATE TABLE `service_provision` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `exchange_group_id` int,
  `service_id` int,
  `location` varchar(255),
  `start_date` timestamp,
  `end_date` timestamp
);

CREATE TABLE `service_participants` (
  `service_provision_id` int,
  `user_id` int,
  `role` ENUM ('EROGATORE', 'BENEFICIARIO'),
  PRIMARY KEY (`service_provision_id`, `user_id`)
);

CREATE TABLE `tokens` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int,
  `expiration_date` timestamp
);

ALTER TABLE `services` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `proposal_participants` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `proposal_participants` ADD FOREIGN KEY (`proposal_id`) REFERENCES `proposals` (`id`);

ALTER TABLE `proposal_participants` ADD FOREIGN KEY (`service_id`) REFERENCES `services` (`id`);

ALTER TABLE `chat_participants` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `chat_participants` ADD FOREIGN KEY (`chat_id`) REFERENCES `chat` (`id`);

ALTER TABLE `chat_messages` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `chat_messages` ADD FOREIGN KEY (`chat_id`) REFERENCES `chat` (`id`);

ALTER TABLE `chat_participants` ADD FOREIGN KEY (`last_message_read`) REFERENCES `chat_messages` (`id`);

ALTER TABLE `exchange_participants` ADD FOREIGN KEY (`exchange_id`) REFERENCES `exchange_1_on_1` (`id`);

ALTER TABLE `exchange_participants` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `exchange_participants` ADD FOREIGN KEY (`service_id`) REFERENCES `services` (`id`);

ALTER TABLE `group_participants` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `group_participants` ADD FOREIGN KEY (`group_id`) REFERENCES `exchange_group_proposal` (`id`);

ALTER TABLE `group_participants` ADD FOREIGN KEY (`received_service`) REFERENCES `services` (`id`);

ALTER TABLE `exchange_group_proposal` ADD FOREIGN KEY (`current_offered_service`) REFERENCES `services` (`id`);

ALTER TABLE `exchange_group_proposal` ADD FOREIGN KEY (`last_requested_service`) REFERENCES `services` (`id`);

ALTER TABLE `chat` ADD FOREIGN KEY (`proposal_id`) REFERENCES `proposals` (`id`);

ALTER TABLE `chat` ADD FOREIGN KEY (`proposal_id`) REFERENCES `exchange_group_proposal` (`id`);

ALTER TABLE `service_participants` ADD FOREIGN KEY (`service_provision_id`) REFERENCES `service_provision` (`id`);

ALTER TABLE `service_participants` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `service_categories` ADD FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

ALTER TABLE `service_categories` ADD FOREIGN KEY (`service_id`) REFERENCES `services` (`id`);

ALTER TABLE `tokens` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `exchange_1_on_1` ADD FOREIGN KEY (`proposal_id`) REFERENCES `proposals` (`id`);
