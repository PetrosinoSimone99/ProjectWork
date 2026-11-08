-- Barattolo demo: 50 categories, 30 users, 200 offers, 100 requests. All passwords: demo (hashed).
-- Import into an empty MySQL database. Dates are UTC.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `agreement_details` (
  `agreement_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `service_provided` int NOT NULL,
  `beneficiary_id` int NOT NULL,
  `from_remote` tinyint(1) NOT NULL DEFAULT '0',
  `start_date` timestamp NULL DEFAULT NULL,
  `end_date` timestamp NULL DEFAULT NULL,
  `beneficiary_accepted` tinyint(1) DEFAULT NULL,
  `status` enum('COMPILED','UNCOMPILED') COLLATE utf8mb4_unicode_ci DEFAULT 'UNCOMPILED',
  PRIMARY KEY (`agreement_id`,`provider_id`),
  KEY `provider_id` (`provider_id`),
  KEY `beneficiary_id` (`beneficiary_id`),
  KEY `service_provided` (`service_provided`),
  CONSTRAINT `agreement_details_ibfk_1` FOREIGN KEY (`agreement_id`) REFERENCES `agreements` (`id`),
  CONSTRAINT `agreement_details_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`),
  CONSTRAINT `agreement_details_ibfk_3` FOREIGN KEY (`beneficiary_id`) REFERENCES `users` (`id`),
  CONSTRAINT `agreement_details_ibfk_4` FOREIGN KEY (`service_provided`) REFERENCES `services` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `agreement_proposal` (
  `agreement_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('Provider','Beneficiary') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `response` tinyint(1) DEFAULT NULL,
  `response_date` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`agreement_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `agreement_proposal_ibfk_1` FOREIGN KEY (`agreement_id`) REFERENCES `agreements` (`id`),
  CONSTRAINT `agreement_proposal_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `agreements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `status` enum('PENDING','ACCEPTED','REFUSED','CONTESTED','VOID') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `creation_date` timestamp NOT NULL DEFAULT (now()),
  `from_queue` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_3AF346687E3C61F9` (`description`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `categories` (`id`, `description`) VALUES ('36', 'Aiuto compiti');
INSERT INTO `categories` (`id`, `description`) VALUES ('15', 'Assistenza computer');
INSERT INTO `categories` (`id`, `description`) VALUES ('16', 'Assistenza smartphone');
INSERT INTO `categories` (`id`, `description`) VALUES ('40', 'Canto');
INSERT INTO `categories` (`id`, `description`) VALUES ('50', 'Cat sitting');
INSERT INTO `categories` (`id`, `description`) VALUES ('34', 'Chimica');
INSERT INTO `categories` (`id`, `description`) VALUES ('38', 'Chitarra');
INSERT INTO `categories` (`id`, `description`) VALUES ('48', 'Corsa');
INSERT INTO `categories` (`id`, `description`) VALUES ('42', 'Cucina italiana');
INSERT INTO `categories` (`id`, `description`) VALUES ('45', 'Cucina vegetariana');
INSERT INTO `categories` (`id`, `description`) VALUES ('11', 'Cucito');
INSERT INTO `categories` (`id`, `description`) VALUES ('3', 'Cura delle piante');
INSERT INTO `categories` (`id`, `description`) VALUES ('26', 'Curriculum e colloqui');
INSERT INTO `categories` (`id`, `description`) VALUES ('49', 'Dog sitting');
INSERT INTO `categories` (`id`, `description`) VALUES ('13', 'Falegnameria');
INSERT INTO `categories` (`id`, `description`) VALUES ('33', 'Fisica');
INSERT INTO `categories` (`id`, `description`) VALUES ('47', 'Fitness');
INSERT INTO `categories` (`id`, `description`) VALUES ('20', 'Fogli di calcolo');
INSERT INTO `categories` (`id`, `description`) VALUES ('22', 'Fotografia');
INSERT INTO `categories` (`id`, `description`) VALUES ('23', 'Fotoritocco');
INSERT INTO `categories` (`id`, `description`) VALUES ('28', 'Francese');
INSERT INTO `categories` (`id`, `description`) VALUES ('1', 'Giardinaggio');
INSERT INTO `categories` (`id`, `description`) VALUES ('21', 'Grafica digitale');
INSERT INTO `categories` (`id`, `description`) VALUES ('8', 'Idraulica domestica');
INSERT INTO `categories` (`id`, `description`) VALUES ('35', 'Informatica scolastica');
INSERT INTO `categories` (`id`, `description`) VALUES ('27', 'Inglese');
INSERT INTO `categories` (`id`, `description`) VALUES ('31', 'Italiano per stranieri');
INSERT INTO `categories` (`id`, `description`) VALUES ('32', 'Matematica');
INSERT INTO `categories` (`id`, `description`) VALUES ('6', 'Montaggio mobili');
INSERT INTO `categories` (`id`, `description`) VALUES ('24', 'Montaggio video');
INSERT INTO `categories` (`id`, `description`) VALUES ('5', 'Organizzazione della casa');
INSERT INTO `categories` (`id`, `description`) VALUES ('2', 'Orto domestico');
INSERT INTO `categories` (`id`, `description`) VALUES ('43', 'Panificazione');
INSERT INTO `categories` (`id`, `description`) VALUES ('44', 'Pasticceria');
INSERT INTO `categories` (`id`, `description`) VALUES ('39', 'Pianoforte');
INSERT INTO `categories` (`id`, `description`) VALUES ('7', 'Piccole riparazioni');
INSERT INTO `categories` (`id`, `description`) VALUES ('37', 'Preparazione esami');
INSERT INTO `categories` (`id`, `description`) VALUES ('19', 'Programmazione Python');
INSERT INTO `categories` (`id`, `description`) VALUES ('18', 'Programmazione web');
INSERT INTO `categories` (`id`, `description`) VALUES ('4', 'Pulizie domestiche');
INSERT INTO `categories` (`id`, `description`) VALUES ('14', 'Restauro mobili');
INSERT INTO `categories` (`id`, `description`) VALUES ('17', 'Reti Wi-Fi');
INSERT INTO `categories` (`id`, `description`) VALUES ('12', 'Ricamo');
INSERT INTO `categories` (`id`, `description`) VALUES ('10', 'Riparazione biciclette');
INSERT INTO `categories` (`id`, `description`) VALUES ('25', 'Scrittura e revisione');
INSERT INTO `categories` (`id`, `description`) VALUES ('29', 'Spagnolo');
INSERT INTO `categories` (`id`, `description`) VALUES ('30', 'Tedesco');
INSERT INTO `categories` (`id`, `description`) VALUES ('41', 'Teoria musicale');
INSERT INTO `categories` (`id`, `description`) VALUES ('9', 'Tinteggiatura');
INSERT INTO `categories` (`id`, `description`) VALUES ('46', 'Yoga');

CREATE TABLE `match_candidates` (
  `offer_queue_id` int NOT NULL,
  `request_queue_id` int NOT NULL,
  PRIMARY KEY (`offer_queue_id`,`request_queue_id`),
  KEY `request_queue_id` (`request_queue_id`),
  CONSTRAINT `match_candidates_ibfk_1` FOREIGN KEY (`offer_queue_id`) REFERENCES `service_queues` (`id`),
  CONSTRAINT `match_candidates_ibfk_2` FOREIGN KEY (`request_queue_id`) REFERENCES `service_queues` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `queue_associated_agreements` (
  `queue_id` int NOT NULL,
  `agreement_id` int NOT NULL,
  KEY `queue_id` (`queue_id`),
  KEY `agreement_id` (`agreement_id`),
  CONSTRAINT `queue_associated_agreements_ibfk_1` FOREIGN KEY (`queue_id`) REFERENCES `service_queues` (`id`),
  CONSTRAINT `queue_associated_agreements_ibfk_2` FOREIGN KEY (`agreement_id`) REFERENCES `agreements` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `service_categories` (
  `service_id` int NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`service_id`,`category_id`),
  KEY `IDX_46551F71ED5CA9E6` (`service_id`),
  KEY `IDX_46551F7112469DE2` (`category_id`),
  CONSTRAINT `FK_SERVICE_CATEGORIES_CATEGORY` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_SERVICE_CATEGORIES_SERVICE` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('1', '1');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('1', '2');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('2', '1');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('3', '1');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('4', '1');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('5', '1');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('6', '1');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('7', '2');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('8', '2');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('9', '2');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('10', '2');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('11', '2');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('12', '2');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('13', '3');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('13', '1');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('14', '3');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('15', '3');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('16', '3');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('17', '3');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('18', '3');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('19', '4');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('20', '4');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('21', '4');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('22', '4');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('23', '4');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('24', '4');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('25', '5');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('25', '4');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('26', '5');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('27', '5');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('28', '5');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('29', '5');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('30', '5');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('31', '6');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('32', '6');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('33', '6');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('34', '6');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('35', '6');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('36', '6');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('37', '7');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('37', '6');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('38', '7');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('39', '7');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('40', '7');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('41', '7');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('42', '7');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('43', '8');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('44', '8');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('45', '8');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('46', '8');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('47', '8');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('48', '8');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('49', '9');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('49', '13');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('50', '9');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('51', '9');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('52', '9');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('53', '9');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('54', '9');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('55', '10');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('56', '10');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('57', '10');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('58', '10');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('59', '10');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('60', '10');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('61', '11');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('61', '12');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('62', '11');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('63', '11');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('64', '11');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('65', '11');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('66', '11');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('67', '12');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('68', '12');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('69', '12');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('70', '12');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('71', '12');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('72', '12');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('73', '13');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('73', '14');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('74', '13');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('75', '13');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('76', '13');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('77', '13');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('78', '13');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('79', '14');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('80', '14');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('81', '14');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('82', '14');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('83', '14');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('84', '14');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('85', '15');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('85', '16');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('86', '15');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('87', '15');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('88', '15');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('89', '15');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('90', '15');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('91', '16');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('92', '16');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('93', '16');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('94', '16');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('95', '16');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('96', '16');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('97', '17');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('97', '15');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('98', '17');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('99', '17');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('100', '17');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('101', '17');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('102', '17');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('103', '18');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('104', '18');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('105', '18');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('106', '18');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('107', '18');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('108', '18');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('109', '19');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('109', '18');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('110', '19');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('111', '19');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('112', '19');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('113', '19');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('114', '19');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('115', '20');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('116', '20');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('117', '20');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('118', '20');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('119', '20');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('120', '20');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('121', '21');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('121', '23');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('122', '21');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('123', '21');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('124', '21');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('125', '21');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('126', '21');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('127', '22');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('128', '22');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('129', '22');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('130', '22');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('131', '22');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('132', '22');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('133', '23');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('133', '22');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('134', '23');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('135', '23');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('136', '23');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('137', '23');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('138', '23');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('139', '24');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('140', '24');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('141', '24');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('142', '24');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('143', '24');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('144', '24');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('145', '25');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('145', '26');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('146', '25');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('147', '25');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('148', '25');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('149', '25');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('150', '25');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('151', '26');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('152', '26');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('153', '26');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('154', '26');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('155', '26');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('156', '26');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('157', '27');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('157', '31');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('158', '27');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('159', '27');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('160', '27');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('161', '27');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('162', '27');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('163', '28');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('164', '28');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('165', '28');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('166', '28');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('167', '28');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('168', '28');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('169', '29');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('169', '28');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('170', '29');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('171', '29');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('172', '29');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('173', '29');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('174', '29');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('175', '30');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('176', '30');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('177', '30');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('178', '30');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('179', '30');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('180', '30');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('181', '31');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('181', '27');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('182', '31');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('183', '31');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('184', '31');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('185', '31');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('186', '31');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('187', '32');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('188', '32');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('189', '32');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('190', '32');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('191', '32');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('192', '32');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('193', '33');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('193', '32');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('194', '33');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('195', '33');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('196', '33');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('197', '33');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('198', '33');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('199', '34');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('200', '34');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('201', '34');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('202', '34');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('203', '34');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('204', '34');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('205', '35');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('205', '19');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('206', '35');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('207', '35');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('208', '35');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('209', '35');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('210', '35');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('211', '36');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('212', '36');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('213', '36');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('214', '36');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('215', '36');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('216', '36');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('217', '37');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('217', '36');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('218', '37');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('219', '37');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('220', '37');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('221', '37');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('222', '37');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('223', '38');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('224', '38');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('225', '38');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('226', '38');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('227', '38');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('228', '38');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('229', '39');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('229', '41');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('230', '39');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('231', '39');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('232', '39');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('233', '39');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('234', '39');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('235', '40');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('236', '40');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('237', '40');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('238', '40');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('239', '40');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('240', '40');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('241', '41');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('241', '38');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('242', '41');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('243', '41');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('244', '41');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('245', '41');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('246', '41');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('247', '42');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('248', '42');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('249', '42');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('250', '42');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('251', '42');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('252', '42');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('253', '43');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('253', '42');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('254', '43');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('255', '43');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('256', '43');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('257', '43');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('258', '43');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('259', '44');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('260', '44');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('261', '44');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('262', '44');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('263', '44');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('264', '44');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('265', '45');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('265', '42');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('266', '45');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('267', '45');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('268', '45');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('269', '45');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('270', '45');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('271', '46');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('272', '46');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('273', '46');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('274', '46');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('275', '46');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('276', '46');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('277', '47');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('277', '48');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('278', '47');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('279', '47');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('280', '47');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('281', '47');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('282', '47');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('283', '48');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('284', '48');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('285', '48');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('286', '48');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('287', '48');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('288', '48');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('289', '49');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('289', '50');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('290', '49');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('291', '49');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('292', '49');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('293', '49');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('294', '49');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('295', '50');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('296', '50');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('297', '50');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('298', '50');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('299', '50');
INSERT INTO `service_categories` (`service_id`, `category_id`) VALUES ('300', '50');

CREATE TABLE `service_queues` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` enum('OFFER','REQUEST') COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_id` int NOT NULL,
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agreement_created` int DEFAULT NULL,
  `status` enum('OPEN','CLOSED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `service_id` (`service_id`),
  KEY `agreement_created` (`agreement_created`),
  CONSTRAINT `service_queues_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `service_queues_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`),
  CONSTRAINT `service_queues_ibfk_3` FOREIGN KEY (`agreement_created`) REFERENCES `agreements` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_used` tinyint(1) DEFAULT '1',
  `creation_date` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `is_remote` tinyint(1) NOT NULL DEFAULT '0',
  `is_suspended` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `services_user_type_index` (`user_id`,`type`),
  CONSTRAINT `FK_SERVICES_USER` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=301 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('1', '1', 'OFFER', 'Offro potatura di siepi e piccoli arbusti. Incontro individuale di un\'ora dedicato a cesoie e raccolta degli sfalci.', '1', '2026-09-01 13:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('2', '6', 'OFFER', 'Sono disponibile per potatura di siepi e piccoli arbusti. Due ore il sabato mattina: cesoie e raccolta degli sfalci.', '1', '2026-09-01 18:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('3', '11', 'OFFER', 'Propongo potatura di siepi e piccoli arbusti per principianti, con esempi pratici su cesoie e raccolta degli sfalci.', '1', '2026-09-01 23:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('4', '16', 'OFFER', 'Metto a disposizione esperienza in potatura di siepi e piccoli arbusti. Ci accordiamo per cesoie e raccolta degli sfalci.', '1', '2026-09-02 04:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('5', '21', 'REQUEST', 'Cerco aiuto per potatura di siepi e piccoli arbusti. Vorrei concentrarmi su cesoie e raccolta degli sfalci.', '1', '2026-09-02 09:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('6', '26', 'REQUEST', 'Vorrei imparare potatura di siepi e piccoli arbusti. Sono disponibile nel fine settimana per cesoie e raccolta degli sfalci.', '1', '2026-09-02 14:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('7', '4', 'OFFER', 'Offro preparazione di un orto sul balcone. Incontro individuale di un\'ora dedicato a semina di basilico e pomodori.', '1', '2026-09-02 19:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('8', '9', 'OFFER', 'Sono disponibile per preparazione di un orto sul balcone. Due ore il sabato mattina: semina di basilico e pomodori.', '1', '2026-09-03 00:00:00', '0', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('9', '14', 'OFFER', 'Propongo preparazione di un orto sul balcone per principianti, con esempi pratici su semina di basilico e pomodori.', '1', '2026-09-03 05:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('10', '19', 'OFFER', 'Metto a disposizione esperienza in preparazione di un orto sul balcone. Ci accordiamo per semina di basilico e pomodori.', '1', '2026-09-03 10:00:00', '0', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('11', '24', 'REQUEST', 'Cerco aiuto per preparazione di un orto sul balcone. Vorrei concentrarmi su semina di basilico e pomodori.', '1', '2026-09-03 15:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('12', '1', 'REQUEST', 'Vorrei imparare preparazione di un orto sul balcone. Sono disponibile nel fine settimana per semina di basilico e pomodori.', '1', '2026-09-03 20:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('13', '7', 'OFFER', 'Offro rinvaso e cura delle piante da appartamento. Incontro individuale di un\'ora dedicato a terriccio e controllo delle radici.', '1', '2026-09-04 01:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('14', '12', 'OFFER', 'Sono disponibile per rinvaso e cura delle piante da appartamento. Due ore il sabato mattina: terriccio e controllo delle radici.', '1', '2026-09-04 06:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('15', '17', 'OFFER', 'Propongo rinvaso e cura delle piante da appartamento per principianti, con esempi pratici su terriccio e controllo delle radici.', '1', '2026-09-04 11:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('16', '22', 'OFFER', 'Metto a disposizione esperienza in rinvaso e cura delle piante da appartamento. Ci accordiamo per terriccio e controllo delle radici.', '1', '2026-09-04 16:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('17', '27', 'REQUEST', 'Cerco aiuto per rinvaso e cura delle piante da appartamento. Vorrei concentrarmi su terriccio e controllo delle radici.', '1', '2026-09-04 21:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('18', '4', 'REQUEST', 'Vorrei imparare rinvaso e cura delle piante da appartamento. Sono disponibile nel fine settimana per terriccio e controllo delle radici.', '1', '2026-09-05 02:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('19', '10', 'OFFER', 'Offro pulizia di cucina e bagno. Incontro individuale di un\'ora dedicato a superfici, piastrelle e vetri.', '1', '2026-09-05 07:00:00', '0', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('20', '15', 'OFFER', 'Sono disponibile per pulizia di cucina e bagno. Due ore il sabato mattina: superfici, piastrelle e vetri.', '1', '2026-09-05 12:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('21', '20', 'OFFER', 'Propongo pulizia di cucina e bagno per principianti, con esempi pratici su superfici, piastrelle e vetri.', '1', '2026-09-05 17:00:00', '0', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('22', '25', 'OFFER', 'Metto a disposizione esperienza in pulizia di cucina e bagno. Ci accordiamo per superfici, piastrelle e vetri.', '1', '2026-09-05 22:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('23', '2', 'REQUEST', 'Cerco aiuto per pulizia di cucina e bagno. Vorrei concentrarmi su superfici, piastrelle e vetri.', '1', '2026-09-06 03:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('24', '7', 'REQUEST', 'Vorrei imparare pulizia di cucina e bagno. Sono disponibile nel fine settimana per superfici, piastrelle e vetri.', '1', '2026-09-06 08:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('25', '13', 'OFFER', 'Offro riordino di armadi e ripostigli. Incontro individuale di un\'ora dedicato a selezione e sistemazione degli oggetti.', '1', '2026-09-06 13:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('26', '18', 'OFFER', 'Sono disponibile per riordino di armadi e ripostigli. Due ore il sabato mattina: selezione e sistemazione degli oggetti.', '1', '2026-09-06 18:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('27', '23', 'OFFER', 'Propongo riordino di armadi e ripostigli per principianti, con esempi pratici su selezione e sistemazione degli oggetti.', '1', '2026-09-06 23:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('28', '28', 'OFFER', 'Metto a disposizione esperienza in riordino di armadi e ripostigli. Ci accordiamo per selezione e sistemazione degli oggetti.', '1', '2026-09-07 04:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('29', '5', 'REQUEST', 'Cerco aiuto per riordino di armadi e ripostigli. Vorrei concentrarmi su selezione e sistemazione degli oggetti.', '1', '2026-09-07 09:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('30', '10', 'REQUEST', 'Vorrei imparare riordino di armadi e ripostigli. Sono disponibile nel fine settimana per selezione e sistemazione degli oggetti.', '1', '2026-09-07 14:00:00', '0', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('31', '16', 'OFFER', 'Offro montaggio di librerie e scrivanie. Incontro individuale di un\'ora dedicato a istruzioni e fissaggio dei ripiani.', '1', '2026-09-07 19:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('32', '21', 'OFFER', 'Sono disponibile per montaggio di librerie e scrivanie. Due ore il sabato mattina: istruzioni e fissaggio dei ripiani.', '1', '2026-09-08 00:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('33', '26', 'OFFER', 'Propongo montaggio di librerie e scrivanie per principianti, con esempi pratici su istruzioni e fissaggio dei ripiani.', '1', '2026-09-08 05:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('34', '3', 'OFFER', 'Metto a disposizione esperienza in montaggio di librerie e scrivanie. Ci accordiamo per istruzioni e fissaggio dei ripiani.', '1', '2026-09-08 10:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('35', '8', 'REQUEST', 'Cerco aiuto per montaggio di librerie e scrivanie. Vorrei concentrarmi su istruzioni e fissaggio dei ripiani.', '1', '2026-09-08 15:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('36', '13', 'REQUEST', 'Vorrei imparare montaggio di librerie e scrivanie. Sono disponibile nel fine settimana per istruzioni e fissaggio dei ripiani.', '1', '2026-09-08 20:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('37', '19', 'OFFER', 'Offro riparazione di maniglie e cerniere. Incontro individuale di un\'ora dedicato a regolazione delle ante e sostituzione delle viti.', '1', '2026-09-09 01:00:00', '0', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('38', '24', 'OFFER', 'Sono disponibile per riparazione di maniglie e cerniere. Due ore il sabato mattina: regolazione delle ante e sostituzione delle viti.', '1', '2026-09-09 06:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('39', '1', 'OFFER', 'Propongo riparazione di maniglie e cerniere per principianti, con esempi pratici su regolazione delle ante e sostituzione delle viti.', '1', '2026-09-09 11:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('40', '6', 'OFFER', 'Metto a disposizione esperienza in riparazione di maniglie e cerniere. Ci accordiamo per regolazione delle ante e sostituzione delle viti.', '1', '2026-09-09 16:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('41', '11', 'REQUEST', 'Cerco aiuto per riparazione di maniglie e cerniere. Vorrei concentrarmi su regolazione delle ante e sostituzione delle viti.', '1', '2026-09-09 21:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('42', '16', 'REQUEST', 'Vorrei imparare riparazione di maniglie e cerniere. Sono disponibile nel fine settimana per regolazione delle ante e sostituzione delle viti.', '1', '2026-09-10 02:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('43', '22', 'OFFER', 'Offro sostituzione di guarnizioni dei rubinetti. Incontro individuale di un\'ora dedicato a controllo delle piccole perdite.', '1', '2026-09-10 07:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('44', '27', 'OFFER', 'Sono disponibile per sostituzione di guarnizioni dei rubinetti. Due ore il sabato mattina: controllo delle piccole perdite.', '1', '2026-09-10 12:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('45', '4', 'OFFER', 'Propongo sostituzione di guarnizioni dei rubinetti per principianti, con esempi pratici su controllo delle piccole perdite.', '1', '2026-09-10 17:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('46', '9', 'OFFER', 'Metto a disposizione esperienza in sostituzione di guarnizioni dei rubinetti. Ci accordiamo per controllo delle piccole perdite.', '1', '2026-09-10 22:00:00', '0', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('47', '14', 'REQUEST', 'Cerco aiuto per sostituzione di guarnizioni dei rubinetti. Vorrei concentrarmi su controllo delle piccole perdite.', '1', '2026-09-11 03:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('48', '19', 'REQUEST', 'Vorrei imparare sostituzione di guarnizioni dei rubinetti. Sono disponibile nel fine settimana per controllo delle piccole perdite.', '1', '2026-09-11 08:00:00', '0', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('49', '25', 'OFFER', 'Offro tinteggiatura di una parete interna. Incontro individuale di un\'ora dedicato a protezione dei mobili e preparazione del fondo.', '1', '2026-09-11 13:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('50', '2', 'OFFER', 'Sono disponibile per tinteggiatura di una parete interna. Due ore il sabato mattina: protezione dei mobili e preparazione del fondo.', '1', '2026-09-11 18:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('51', '7', 'OFFER', 'Propongo tinteggiatura di una parete interna per principianti, con esempi pratici su protezione dei mobili e preparazione del fondo.', '1', '2026-09-11 23:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('52', '12', 'OFFER', 'Metto a disposizione esperienza in tinteggiatura di una parete interna. Ci accordiamo per protezione dei mobili e preparazione del fondo.', '1', '2026-09-12 04:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('53', '17', 'REQUEST', 'Cerco aiuto per tinteggiatura di una parete interna. Vorrei concentrarmi su protezione dei mobili e preparazione del fondo.', '1', '2026-09-12 09:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('54', '22', 'REQUEST', 'Vorrei imparare tinteggiatura di una parete interna. Sono disponibile nel fine settimana per protezione dei mobili e preparazione del fondo.', '1', '2026-09-12 14:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('55', '28', 'OFFER', 'Offro manutenzione di biciclette da citta. Incontro individuale di un\'ora dedicato a regolazione dei freni e lubrificazione della catena.', '1', '2026-09-12 19:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('56', '5', 'OFFER', 'Sono disponibile per manutenzione di biciclette da citta. Due ore il sabato mattina: regolazione dei freni e lubrificazione della catena.', '1', '2026-09-13 00:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('57', '10', 'OFFER', 'Propongo manutenzione di biciclette da citta per principianti, con esempi pratici su regolazione dei freni e lubrificazione della catena.', '1', '2026-09-13 05:00:00', '0', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('58', '15', 'OFFER', 'Metto a disposizione esperienza in manutenzione di biciclette da citta. Ci accordiamo per regolazione dei freni e lubrificazione della catena.', '1', '2026-09-13 10:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('59', '20', 'REQUEST', 'Cerco aiuto per manutenzione di biciclette da citta. Vorrei concentrarmi su regolazione dei freni e lubrificazione della catena.', '1', '2026-09-13 15:00:00', '0', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('60', '25', 'REQUEST', 'Vorrei imparare manutenzione di biciclette da citta. Sono disponibile nel fine settimana per regolazione dei freni e lubrificazione della catena.', '1', '2026-09-13 20:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('61', '3', 'OFFER', 'Offro riparazione di pantaloni e camicie. Incontro individuale di un\'ora dedicato a orli e sostituzione dei bottoni.', '1', '2026-09-14 01:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('62', '8', 'OFFER', 'Sono disponibile per riparazione di pantaloni e camicie. Due ore il sabato mattina: orli e sostituzione dei bottoni.', '1', '2026-09-14 06:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('63', '13', 'OFFER', 'Propongo riparazione di pantaloni e camicie per principianti, con esempi pratici su orli e sostituzione dei bottoni.', '1', '2026-09-14 11:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('64', '18', 'OFFER', 'Metto a disposizione esperienza in riparazione di pantaloni e camicie. Ci accordiamo per orli e sostituzione dei bottoni.', '1', '2026-09-14 16:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('65', '23', 'REQUEST', 'Cerco aiuto per riparazione di pantaloni e camicie. Vorrei concentrarmi su orli e sostituzione dei bottoni.', '1', '2026-09-14 21:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('66', '28', 'REQUEST', 'Vorrei imparare riparazione di pantaloni e camicie. Sono disponibile nel fine settimana per orli e sostituzione dei bottoni.', '1', '2026-09-15 02:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('67', '6', 'OFFER', 'Offro ricamo a mano su tessuti. Incontro individuale di un\'ora dedicato a punti base e personalizzazione di tovaglioli.', '1', '2026-09-15 07:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('68', '11', 'OFFER', 'Sono disponibile per ricamo a mano su tessuti. Due ore il sabato mattina: punti base e personalizzazione di tovaglioli.', '1', '2026-09-15 12:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('69', '16', 'OFFER', 'Propongo ricamo a mano su tessuti per principianti, con esempi pratici su punti base e personalizzazione di tovaglioli.', '1', '2026-09-15 17:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('70', '21', 'OFFER', 'Metto a disposizione esperienza in ricamo a mano su tessuti. Ci accordiamo per punti base e personalizzazione di tovaglioli.', '1', '2026-09-15 22:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('71', '26', 'REQUEST', 'Cerco aiuto per ricamo a mano su tessuti. Vorrei concentrarmi su punti base e personalizzazione di tovaglioli.', '1', '2026-09-16 03:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('72', '3', 'REQUEST', 'Vorrei imparare ricamo a mano su tessuti. Sono disponibile nel fine settimana per punti base e personalizzazione di tovaglioli.', '1', '2026-09-16 08:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('73', '9', 'OFFER', 'Offro restauro di piccoli oggetti in legno. Incontro individuale di un\'ora dedicato a carteggiatura e finitura di mensole.', '1', '2026-09-16 13:00:00', '0', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('74', '14', 'OFFER', 'Sono disponibile per restauro di piccoli oggetti in legno. Due ore il sabato mattina: carteggiatura e finitura di mensole.', '1', '2026-09-16 18:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('75', '19', 'OFFER', 'Propongo restauro di piccoli oggetti in legno per principianti, con esempi pratici su carteggiatura e finitura di mensole.', '1', '2026-09-16 23:00:00', '0', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('76', '24', 'OFFER', 'Metto a disposizione esperienza in restauro di piccoli oggetti in legno. Ci accordiamo per carteggiatura e finitura di mensole.', '1', '2026-09-17 04:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('77', '1', 'REQUEST', 'Cerco aiuto per restauro di piccoli oggetti in legno. Vorrei concentrarmi su carteggiatura e finitura di mensole.', '1', '2026-09-17 09:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('78', '6', 'REQUEST', 'Vorrei imparare restauro di piccoli oggetti in legno. Sono disponibile nel fine settimana per carteggiatura e finitura di mensole.', '1', '2026-09-17 14:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('79', '12', 'OFFER', 'Offro recupero di sedie e comodini. Incontro individuale di un\'ora dedicato a pulizia del legno e trattamento della superficie.', '1', '2026-09-17 19:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('80', '17', 'OFFER', 'Sono disponibile per recupero di sedie e comodini. Due ore il sabato mattina: pulizia del legno e trattamento della superficie.', '1', '2026-09-18 00:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('81', '22', 'OFFER', 'Propongo recupero di sedie e comodini per principianti, con esempi pratici su pulizia del legno e trattamento della superficie.', '1', '2026-09-18 05:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('82', '27', 'OFFER', 'Metto a disposizione esperienza in recupero di sedie e comodini. Ci accordiamo per pulizia del legno e trattamento della superficie.', '1', '2026-09-18 10:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('83', '4', 'REQUEST', 'Cerco aiuto per recupero di sedie e comodini. Vorrei concentrarmi su pulizia del legno e trattamento della superficie.', '1', '2026-09-18 15:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('84', '9', 'REQUEST', 'Vorrei imparare recupero di sedie e comodini. Sono disponibile nel fine settimana per pulizia del legno e trattamento della superficie.', '1', '2026-09-18 20:00:00', '0', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('85', '15', 'OFFER', 'Offro configurazione di computer domestici. Incontro individuale di un\'ora dedicato a aggiornamenti e installazione dei programmi.', '1', '2026-09-19 01:00:00', '1', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('86', '20', 'OFFER', 'Sono disponibile per configurazione di computer domestici. Due ore il sabato mattina: aggiornamenti e installazione dei programmi.', '1', '2026-09-19 06:00:00', '0', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('87', '25', 'OFFER', 'Propongo configurazione di computer domestici per principianti, con esempi pratici su aggiornamenti e installazione dei programmi.', '1', '2026-09-19 11:00:00', '1', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('88', '2', 'OFFER', 'Metto a disposizione esperienza in configurazione di computer domestici. Ci accordiamo per aggiornamenti e installazione dei programmi.', '1', '2026-09-19 16:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('89', '7', 'REQUEST', 'Cerco aiuto per configurazione di computer domestici. Vorrei concentrarmi su aggiornamenti e installazione dei programmi.', '1', '2026-09-19 21:00:00', '1', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('90', '12', 'REQUEST', 'Vorrei imparare configurazione di computer domestici. Sono disponibile nel fine settimana per aggiornamenti e installazione dei programmi.', '1', '2026-09-20 02:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('91', '18', 'OFFER', 'Offro configurazione di smartphone Android. Incontro individuale di un\'ora dedicato a backup delle foto e impostazioni di accessibilita.', '1', '2026-09-20 07:00:00', '1', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('92', '23', 'OFFER', 'Sono disponibile per configurazione di smartphone Android. Due ore il sabato mattina: backup delle foto e impostazioni di accessibilita.', '1', '2026-09-20 12:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('93', '28', 'OFFER', 'Propongo configurazione di smartphone Android per principianti, con esempi pratici su backup delle foto e impostazioni di accessibilita.', '1', '2026-09-20 17:00:00', '1', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('94', '5', 'OFFER', 'Metto a disposizione esperienza in configurazione di smartphone Android. Ci accordiamo per backup delle foto e impostazioni di accessibilita.', '1', '2026-09-20 22:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('95', '10', 'REQUEST', 'Cerco aiuto per configurazione di smartphone Android. Vorrei concentrarmi su backup delle foto e impostazioni di accessibilita.', '1', '2026-09-21 03:00:00', '1', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('96', '15', 'REQUEST', 'Vorrei imparare configurazione di smartphone Android. Sono disponibile nel fine settimana per backup delle foto e impostazioni di accessibilita.', '1', '2026-09-21 08:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('97', '21', 'OFFER', 'Offro ottimizzazione della rete Wi-Fi di casa. Incontro individuale di un\'ora dedicato a posizionamento del router e verifica della copertura.', '1', '2026-09-21 13:00:00', '1', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('98', '26', 'OFFER', 'Sono disponibile per ottimizzazione della rete Wi-Fi di casa. Due ore il sabato mattina: posizionamento del router e verifica della copertura.', '1', '2026-09-21 18:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('99', '3', 'OFFER', 'Propongo ottimizzazione della rete Wi-Fi di casa per principianti, con esempi pratici su posizionamento del router e verifica della copertura.', '1', '2026-09-21 23:00:00', '1', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('100', '8', 'OFFER', 'Metto a disposizione esperienza in ottimizzazione della rete Wi-Fi di casa. Ci accordiamo per posizionamento del router e verifica della copertura.', '1', '2026-09-22 04:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('101', '13', 'REQUEST', 'Cerco aiuto per ottimizzazione della rete Wi-Fi di casa. Vorrei concentrarmi su posizionamento del router e verifica della copertura.', '1', '2026-09-22 09:00:00', '1', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('102', '18', 'REQUEST', 'Vorrei imparare ottimizzazione della rete Wi-Fi di casa. Sono disponibile nel fine settimana per posizionamento del router e verifica della copertura.', '1', '2026-09-22 14:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('103', '24', 'OFFER', 'Offro sviluppo di pagine web in HTML e CSS. Incontro individuale di un\'ora dedicato a layout responsive e moduli di contatto.', '1', '2026-09-22 19:00:00', '1', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('104', '1', 'OFFER', 'Sono disponibile per sviluppo di pagine web in HTML e CSS. Due ore il sabato mattina: layout responsive e moduli di contatto.', '1', '2026-09-23 00:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('105', '6', 'OFFER', 'Propongo sviluppo di pagine web in HTML e CSS per principianti, con esempi pratici su layout responsive e moduli di contatto.', '1', '2026-09-23 05:00:00', '1', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('106', '11', 'OFFER', 'Metto a disposizione esperienza in sviluppo di pagine web in HTML e CSS. Ci accordiamo per layout responsive e moduli di contatto.', '1', '2026-09-23 10:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('107', '16', 'REQUEST', 'Cerco aiuto per sviluppo di pagine web in HTML e CSS. Vorrei concentrarmi su layout responsive e moduli di contatto.', '1', '2026-09-23 15:00:00', '1', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('108', '21', 'REQUEST', 'Vorrei imparare sviluppo di pagine web in HTML e CSS. Sono disponibile nel fine settimana per layout responsive e moduli di contatto.', '1', '2026-09-23 20:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('109', '27', 'OFFER', 'Offro lezioni pratiche di Python. Incontro individuale di un\'ora dedicato a cicli, funzioni e lettura di file CSV.', '1', '2026-09-24 01:00:00', '1', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('110', '4', 'OFFER', 'Sono disponibile per lezioni pratiche di Python. Due ore il sabato mattina: cicli, funzioni e lettura di file CSV.', '1', '2026-09-24 06:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('111', '9', 'OFFER', 'Propongo lezioni pratiche di Python per principianti, con esempi pratici su cicli, funzioni e lettura di file CSV.', '1', '2026-09-24 11:00:00', '1', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('112', '14', 'OFFER', 'Metto a disposizione esperienza in lezioni pratiche di Python. Ci accordiamo per cicli, funzioni e lettura di file CSV.', '1', '2026-09-24 16:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('113', '19', 'REQUEST', 'Cerco aiuto per lezioni pratiche di Python. Vorrei concentrarmi su cicli, funzioni e lettura di file CSV.', '1', '2026-09-24 21:00:00', '1', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('114', '24', 'REQUEST', 'Vorrei imparare lezioni pratiche di Python. Sono disponibile nel fine settimana per cicli, funzioni e lettura di file CSV.', '1', '2026-09-25 02:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('115', '2', 'OFFER', 'Offro creazione di fogli di calcolo per le spese. Incontro individuale di un\'ora dedicato a formule, filtri e grafici mensili.', '1', '2026-09-25 07:00:00', '1', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('116', '7', 'OFFER', 'Sono disponibile per creazione di fogli di calcolo per le spese. Due ore il sabato mattina: formule, filtri e grafici mensili.', '1', '2026-09-25 12:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('117', '12', 'OFFER', 'Propongo creazione di fogli di calcolo per le spese per principianti, con esempi pratici su formule, filtri e grafici mensili.', '1', '2026-09-25 17:00:00', '1', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('118', '17', 'OFFER', 'Metto a disposizione esperienza in creazione di fogli di calcolo per le spese. Ci accordiamo per formule, filtri e grafici mensili.', '1', '2026-09-25 22:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('119', '22', 'REQUEST', 'Cerco aiuto per creazione di fogli di calcolo per le spese. Vorrei concentrarmi su formule, filtri e grafici mensili.', '1', '2026-09-26 03:00:00', '1', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('120', '27', 'REQUEST', 'Vorrei imparare creazione di fogli di calcolo per le spese. Sono disponibile nel fine settimana per formule, filtri e grafici mensili.', '1', '2026-09-26 08:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('121', '5', 'OFFER', 'Offro realizzazione di locandine digitali. Incontro individuale di un\'ora dedicato a colori, caratteri e impaginazione.', '1', '2026-09-26 13:00:00', '1', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('122', '10', 'OFFER', 'Sono disponibile per realizzazione di locandine digitali. Due ore il sabato mattina: colori, caratteri e impaginazione.', '1', '2026-09-26 18:00:00', '0', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('123', '15', 'OFFER', 'Propongo realizzazione di locandine digitali per principianti, con esempi pratici su colori, caratteri e impaginazione.', '1', '2026-09-26 23:00:00', '1', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('124', '20', 'OFFER', 'Metto a disposizione esperienza in realizzazione di locandine digitali. Ci accordiamo per colori, caratteri e impaginazione.', '1', '2026-09-27 04:00:00', '0', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('125', '25', 'REQUEST', 'Cerco aiuto per realizzazione di locandine digitali. Vorrei concentrarmi su colori, caratteri e impaginazione.', '1', '2026-09-27 09:00:00', '1', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('126', '2', 'REQUEST', 'Vorrei imparare realizzazione di locandine digitali. Sono disponibile nel fine settimana per colori, caratteri e impaginazione.', '1', '2026-09-27 14:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('127', '8', 'OFFER', 'Offro fotografia di piccoli prodotti artigianali. Incontro individuale di un\'ora dedicato a luce naturale e composizione dello scatto.', '1', '2026-09-27 19:00:00', '1', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('128', '13', 'OFFER', 'Sono disponibile per fotografia di piccoli prodotti artigianali. Due ore il sabato mattina: luce naturale e composizione dello scatto.', '1', '2026-09-28 00:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('129', '18', 'OFFER', 'Propongo fotografia di piccoli prodotti artigianali per principianti, con esempi pratici su luce naturale e composizione dello scatto.', '1', '2026-09-28 05:00:00', '1', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('130', '23', 'OFFER', 'Metto a disposizione esperienza in fotografia di piccoli prodotti artigianali. Ci accordiamo per luce naturale e composizione dello scatto.', '1', '2026-09-28 10:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('131', '28', 'REQUEST', 'Cerco aiuto per fotografia di piccoli prodotti artigianali. Vorrei concentrarmi su luce naturale e composizione dello scatto.', '1', '2026-09-28 15:00:00', '1', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('132', '5', 'REQUEST', 'Vorrei imparare fotografia di piccoli prodotti artigianali. Sono disponibile nel fine settimana per luce naturale e composizione dello scatto.', '1', '2026-09-28 20:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('133', '11', 'OFFER', 'Offro ritocco di fotografie digitali. Incontro individuale di un\'ora dedicato a correzione di esposizione e bilanciamento del bianco.', '1', '2026-09-29 01:00:00', '1', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('134', '16', 'OFFER', 'Sono disponibile per ritocco di fotografie digitali. Due ore il sabato mattina: correzione di esposizione e bilanciamento del bianco.', '1', '2026-09-29 06:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('135', '21', 'OFFER', 'Propongo ritocco di fotografie digitali per principianti, con esempi pratici su correzione di esposizione e bilanciamento del bianco.', '1', '2026-09-29 11:00:00', '1', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('136', '26', 'OFFER', 'Metto a disposizione esperienza in ritocco di fotografie digitali. Ci accordiamo per correzione di esposizione e bilanciamento del bianco.', '1', '2026-09-29 16:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('137', '3', 'REQUEST', 'Cerco aiuto per ritocco di fotografie digitali. Vorrei concentrarmi su correzione di esposizione e bilanciamento del bianco.', '1', '2026-09-29 21:00:00', '1', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('138', '8', 'REQUEST', 'Vorrei imparare ritocco di fotografie digitali. Sono disponibile nel fine settimana per correzione di esposizione e bilanciamento del bianco.', '1', '2026-09-30 02:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('139', '14', 'OFFER', 'Offro montaggio di brevi video di eventi. Incontro individuale di un\'ora dedicato a tagli, titoli e musica di sottofondo.', '1', '2026-09-30 07:00:00', '1', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('140', '19', 'OFFER', 'Sono disponibile per montaggio di brevi video di eventi. Due ore il sabato mattina: tagli, titoli e musica di sottofondo.', '1', '2026-09-30 12:00:00', '0', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('141', '24', 'OFFER', 'Propongo montaggio di brevi video di eventi per principianti, con esempi pratici su tagli, titoli e musica di sottofondo.', '1', '2026-09-30 17:00:00', '1', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('142', '1', 'OFFER', 'Metto a disposizione esperienza in montaggio di brevi video di eventi. Ci accordiamo per tagli, titoli e musica di sottofondo.', '1', '2026-09-30 22:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('143', '6', 'REQUEST', 'Cerco aiuto per montaggio di brevi video di eventi. Vorrei concentrarmi su tagli, titoli e musica di sottofondo.', '1', '2026-10-01 03:00:00', '1', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('144', '11', 'REQUEST', 'Vorrei imparare montaggio di brevi video di eventi. Sono disponibile nel fine settimana per tagli, titoli e musica di sottofondo.', '1', '2026-10-01 08:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('145', '17', 'OFFER', 'Offro revisione di testi in italiano. Incontro individuale di un\'ora dedicato a ortografia, punteggiatura e chiarezza.', '1', '2026-10-01 13:00:00', '1', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('146', '22', 'OFFER', 'Sono disponibile per revisione di testi in italiano. Due ore il sabato mattina: ortografia, punteggiatura e chiarezza.', '1', '2026-10-01 18:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('147', '27', 'OFFER', 'Propongo revisione di testi in italiano per principianti, con esempi pratici su ortografia, punteggiatura e chiarezza.', '1', '2026-10-01 23:00:00', '1', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('148', '4', 'OFFER', 'Metto a disposizione esperienza in revisione di testi in italiano. Ci accordiamo per ortografia, punteggiatura e chiarezza.', '1', '2026-10-02 04:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('149', '9', 'REQUEST', 'Cerco aiuto per revisione di testi in italiano. Vorrei concentrarmi su ortografia, punteggiatura e chiarezza.', '1', '2026-10-02 09:00:00', '1', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('150', '14', 'REQUEST', 'Vorrei imparare revisione di testi in italiano. Sono disponibile nel fine settimana per ortografia, punteggiatura e chiarezza.', '1', '2026-10-02 14:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('151', '20', 'OFFER', 'Offro preparazione di curriculum e colloqui. Incontro individuale di un\'ora dedicato a esperienze professionali e simulazione delle domande.', '1', '2026-10-02 19:00:00', '1', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('152', '25', 'OFFER', 'Sono disponibile per preparazione di curriculum e colloqui. Due ore il sabato mattina: esperienze professionali e simulazione delle domande.', '1', '2026-10-03 00:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('153', '2', 'OFFER', 'Propongo preparazione di curriculum e colloqui per principianti, con esempi pratici su esperienze professionali e simulazione delle domande.', '1', '2026-10-03 05:00:00', '1', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('154', '7', 'OFFER', 'Metto a disposizione esperienza in preparazione di curriculum e colloqui. Ci accordiamo per esperienze professionali e simulazione delle domande.', '1', '2026-10-03 10:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('155', '12', 'REQUEST', 'Cerco aiuto per preparazione di curriculum e colloqui. Vorrei concentrarmi su esperienze professionali e simulazione delle domande.', '1', '2026-10-03 15:00:00', '1', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('156', '17', 'REQUEST', 'Vorrei imparare preparazione di curriculum e colloqui. Sono disponibile nel fine settimana per esperienze professionali e simulazione delle domande.', '1', '2026-10-03 20:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('157', '23', 'OFFER', 'Offro conversazione in inglese di livello B1. Incontro individuale di un\'ora dedicato a situazioni di viaggio e pronuncia.', '1', '2026-10-04 01:00:00', '1', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('158', '28', 'OFFER', 'Sono disponibile per conversazione in inglese di livello B1. Due ore il sabato mattina: situazioni di viaggio e pronuncia.', '1', '2026-10-04 06:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('159', '5', 'OFFER', 'Propongo conversazione in inglese di livello B1 per principianti, con esempi pratici su situazioni di viaggio e pronuncia.', '1', '2026-10-04 11:00:00', '1', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('160', '10', 'OFFER', 'Metto a disposizione esperienza in conversazione in inglese di livello B1. Ci accordiamo per situazioni di viaggio e pronuncia.', '1', '2026-10-04 16:00:00', '0', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('161', '15', 'REQUEST', 'Cerco aiuto per conversazione in inglese di livello B1. Vorrei concentrarmi su situazioni di viaggio e pronuncia.', '1', '2026-10-04 21:00:00', '1', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('162', '20', 'REQUEST', 'Vorrei imparare conversazione in inglese di livello B1. Sono disponibile nel fine settimana per situazioni di viaggio e pronuncia.', '1', '2026-10-05 02:00:00', '0', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('163', '26', 'OFFER', 'Offro conversazione in francese per principianti. Incontro individuale di un\'ora dedicato a presentazioni e dialoghi quotidiani.', '1', '2026-10-05 07:00:00', '1', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('164', '3', 'OFFER', 'Sono disponibile per conversazione in francese per principianti. Due ore il sabato mattina: presentazioni e dialoghi quotidiani.', '1', '2026-10-05 12:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('165', '8', 'OFFER', 'Propongo conversazione in francese per principianti per principianti, con esempi pratici su presentazioni e dialoghi quotidiani.', '1', '2026-10-05 17:00:00', '1', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('166', '13', 'OFFER', 'Metto a disposizione esperienza in conversazione in francese per principianti. Ci accordiamo per presentazioni e dialoghi quotidiani.', '1', '2026-10-05 22:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('167', '18', 'REQUEST', 'Cerco aiuto per conversazione in francese per principianti. Vorrei concentrarmi su presentazioni e dialoghi quotidiani.', '1', '2026-10-06 03:00:00', '1', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('168', '23', 'REQUEST', 'Vorrei imparare conversazione in francese per principianti. Sono disponibile nel fine settimana per presentazioni e dialoghi quotidiani.', '1', '2026-10-06 08:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('169', '1', 'OFFER', 'Offro conversazione in spagnolo di livello A2. Incontro individuale di un\'ora dedicato a ordinazioni al ristorante e indicazioni stradali.', '1', '2026-10-06 13:00:00', '1', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('170', '6', 'OFFER', 'Sono disponibile per conversazione in spagnolo di livello A2. Due ore il sabato mattina: ordinazioni al ristorante e indicazioni stradali.', '1', '2026-10-06 18:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('171', '11', 'OFFER', 'Propongo conversazione in spagnolo di livello A2 per principianti, con esempi pratici su ordinazioni al ristorante e indicazioni stradali.', '1', '2026-10-06 23:00:00', '1', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('172', '16', 'OFFER', 'Metto a disposizione esperienza in conversazione in spagnolo di livello A2. Ci accordiamo per ordinazioni al ristorante e indicazioni stradali.', '1', '2026-10-07 04:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('173', '21', 'REQUEST', 'Cerco aiuto per conversazione in spagnolo di livello A2. Vorrei concentrarmi su ordinazioni al ristorante e indicazioni stradali.', '1', '2026-10-07 09:00:00', '1', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('174', '26', 'REQUEST', 'Vorrei imparare conversazione in spagnolo di livello A2. Sono disponibile nel fine settimana per ordinazioni al ristorante e indicazioni stradali.', '1', '2026-10-07 14:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('175', '4', 'OFFER', 'Offro ripasso delle basi del tedesco. Incontro individuale di un\'ora dedicato a articoli, verbi e frasi di uso comune.', '1', '2026-10-07 19:00:00', '1', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('176', '9', 'OFFER', 'Sono disponibile per ripasso delle basi del tedesco. Due ore il sabato mattina: articoli, verbi e frasi di uso comune.', '1', '2026-10-08 00:00:00', '0', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('177', '14', 'OFFER', 'Propongo ripasso delle basi del tedesco per principianti, con esempi pratici su articoli, verbi e frasi di uso comune.', '1', '2026-10-08 05:00:00', '1', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('178', '19', 'OFFER', 'Metto a disposizione esperienza in ripasso delle basi del tedesco. Ci accordiamo per articoli, verbi e frasi di uso comune.', '1', '2026-10-08 10:00:00', '0', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('179', '24', 'REQUEST', 'Cerco aiuto per ripasso delle basi del tedesco. Vorrei concentrarmi su articoli, verbi e frasi di uso comune.', '1', '2026-10-08 15:00:00', '1', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('180', '1', 'REQUEST', 'Vorrei imparare ripasso delle basi del tedesco. Sono disponibile nel fine settimana per articoli, verbi e frasi di uso comune.', '1', '2026-10-08 20:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('181', '7', 'OFFER', 'Offro lezioni di italiano per stranieri. Incontro individuale di un\'ora dedicato a conversazione e comprensione di testi semplici.', '1', '2026-10-09 01:00:00', '1', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('182', '12', 'OFFER', 'Sono disponibile per lezioni di italiano per stranieri. Due ore il sabato mattina: conversazione e comprensione di testi semplici.', '1', '2026-10-09 06:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('183', '17', 'OFFER', 'Propongo lezioni di italiano per stranieri per principianti, con esempi pratici su conversazione e comprensione di testi semplici.', '1', '2026-10-09 11:00:00', '1', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('184', '22', 'OFFER', 'Metto a disposizione esperienza in lezioni di italiano per stranieri. Ci accordiamo per conversazione e comprensione di testi semplici.', '1', '2026-10-09 16:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('185', '27', 'REQUEST', 'Cerco aiuto per lezioni di italiano per stranieri. Vorrei concentrarmi su conversazione e comprensione di testi semplici.', '1', '2026-10-09 21:00:00', '1', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('186', '4', 'REQUEST', 'Vorrei imparare lezioni di italiano per stranieri. Sono disponibile nel fine settimana per conversazione e comprensione di testi semplici.', '1', '2026-10-10 02:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('187', '10', 'OFFER', 'Offro ripetizioni di matematica per le superiori. Incontro individuale di un\'ora dedicato a equazioni di secondo grado e problemi geometrici.', '1', '2026-10-10 07:00:00', '1', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('188', '15', 'OFFER', 'Sono disponibile per ripetizioni di matematica per le superiori. Due ore il sabato mattina: equazioni di secondo grado e problemi geometrici.', '1', '2026-10-10 12:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('189', '20', 'OFFER', 'Propongo ripetizioni di matematica per le superiori per principianti, con esempi pratici su equazioni di secondo grado e problemi geometrici.', '1', '2026-10-10 17:00:00', '1', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('190', '25', 'OFFER', 'Metto a disposizione esperienza in ripetizioni di matematica per le superiori. Ci accordiamo per equazioni di secondo grado e problemi geometrici.', '1', '2026-10-10 22:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('191', '2', 'REQUEST', 'Cerco aiuto per ripetizioni di matematica per le superiori. Vorrei concentrarmi su equazioni di secondo grado e problemi geometrici.', '1', '2026-10-11 03:00:00', '1', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('192', '7', 'REQUEST', 'Vorrei imparare ripetizioni di matematica per le superiori. Sono disponibile nel fine settimana per equazioni di secondo grado e problemi geometrici.', '1', '2026-10-11 08:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('193', '13', 'OFFER', 'Offro ripetizioni di fisica per le superiori. Incontro individuale di un\'ora dedicato a cinematica e principi della dinamica.', '1', '2026-10-11 13:00:00', '1', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('194', '18', 'OFFER', 'Sono disponibile per ripetizioni di fisica per le superiori. Due ore il sabato mattina: cinematica e principi della dinamica.', '1', '2026-10-11 18:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('195', '23', 'OFFER', 'Propongo ripetizioni di fisica per le superiori per principianti, con esempi pratici su cinematica e principi della dinamica.', '1', '2026-10-11 23:00:00', '1', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('196', '28', 'OFFER', 'Metto a disposizione esperienza in ripetizioni di fisica per le superiori. Ci accordiamo per cinematica e principi della dinamica.', '1', '2026-10-12 04:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('197', '5', 'REQUEST', 'Cerco aiuto per ripetizioni di fisica per le superiori. Vorrei concentrarmi su cinematica e principi della dinamica.', '1', '2026-10-12 09:00:00', '1', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('198', '10', 'REQUEST', 'Vorrei imparare ripetizioni di fisica per le superiori. Sono disponibile nel fine settimana per cinematica e principi della dinamica.', '1', '2026-10-12 14:00:00', '0', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('199', '16', 'OFFER', 'Offro ripasso di chimica per le superiori. Incontro individuale di un\'ora dedicato a bilanciamento delle reazioni e tavola periodica.', '1', '2026-10-12 19:00:00', '1', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('200', '21', 'OFFER', 'Sono disponibile per ripasso di chimica per le superiori. Due ore il sabato mattina: bilanciamento delle reazioni e tavola periodica.', '1', '2026-10-13 00:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('201', '26', 'OFFER', 'Propongo ripasso di chimica per le superiori per principianti, con esempi pratici su bilanciamento delle reazioni e tavola periodica.', '1', '2026-10-13 05:00:00', '1', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('202', '3', 'OFFER', 'Metto a disposizione esperienza in ripasso di chimica per le superiori. Ci accordiamo per bilanciamento delle reazioni e tavola periodica.', '1', '2026-10-13 10:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('203', '8', 'REQUEST', 'Cerco aiuto per ripasso di chimica per le superiori. Vorrei concentrarmi su bilanciamento delle reazioni e tavola periodica.', '1', '2026-10-13 15:00:00', '1', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('204', '13', 'REQUEST', 'Vorrei imparare ripasso di chimica per le superiori. Sono disponibile nel fine settimana per bilanciamento delle reazioni e tavola periodica.', '1', '2026-10-13 20:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('205', '19', 'OFFER', 'Offro ripetizioni di informatica per le superiori. Incontro individuale di un\'ora dedicato a algoritmi e diagrammi di flusso.', '1', '2026-10-14 01:00:00', '1', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('206', '24', 'OFFER', 'Sono disponibile per ripetizioni di informatica per le superiori. Due ore il sabato mattina: algoritmi e diagrammi di flusso.', '1', '2026-10-14 06:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('207', '1', 'OFFER', 'Propongo ripetizioni di informatica per le superiori per principianti, con esempi pratici su algoritmi e diagrammi di flusso.', '1', '2026-10-14 11:00:00', '1', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('208', '6', 'OFFER', 'Metto a disposizione esperienza in ripetizioni di informatica per le superiori. Ci accordiamo per algoritmi e diagrammi di flusso.', '1', '2026-10-14 16:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('209', '11', 'REQUEST', 'Cerco aiuto per ripetizioni di informatica per le superiori. Vorrei concentrarmi su algoritmi e diagrammi di flusso.', '1', '2026-10-14 21:00:00', '1', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('210', '16', 'REQUEST', 'Vorrei imparare ripetizioni di informatica per le superiori. Sono disponibile nel fine settimana per algoritmi e diagrammi di flusso.', '1', '2026-10-15 02:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('211', '22', 'OFFER', 'Offro aiuto compiti per la scuola media. Incontro individuale di un\'ora dedicato a organizzazione dello studio e ripasso delle lezioni.', '1', '2026-10-15 07:00:00', '1', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('212', '27', 'OFFER', 'Sono disponibile per aiuto compiti per la scuola media. Due ore il sabato mattina: organizzazione dello studio e ripasso delle lezioni.', '1', '2026-10-15 12:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('213', '4', 'OFFER', 'Propongo aiuto compiti per la scuola media per principianti, con esempi pratici su organizzazione dello studio e ripasso delle lezioni.', '1', '2026-10-15 17:00:00', '1', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('214', '9', 'OFFER', 'Metto a disposizione esperienza in aiuto compiti per la scuola media. Ci accordiamo per organizzazione dello studio e ripasso delle lezioni.', '1', '2026-10-15 22:00:00', '0', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('215', '14', 'REQUEST', 'Cerco aiuto per aiuto compiti per la scuola media. Vorrei concentrarmi su organizzazione dello studio e ripasso delle lezioni.', '1', '2026-10-16 03:00:00', '1', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('216', '19', 'REQUEST', 'Vorrei imparare aiuto compiti per la scuola media. Sono disponibile nel fine settimana per organizzazione dello studio e ripasso delle lezioni.', '1', '2026-10-16 08:00:00', '0', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('217', '25', 'OFFER', 'Offro preparazione di esami universitari. Incontro individuale di un\'ora dedicato a piano di studio e simulazioni orali.', '1', '2026-10-16 13:00:00', '1', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('218', '2', 'OFFER', 'Sono disponibile per preparazione di esami universitari. Due ore il sabato mattina: piano di studio e simulazioni orali.', '1', '2026-10-16 18:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('219', '7', 'OFFER', 'Propongo preparazione di esami universitari per principianti, con esempi pratici su piano di studio e simulazioni orali.', '1', '2026-10-16 23:00:00', '1', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('220', '12', 'OFFER', 'Metto a disposizione esperienza in preparazione di esami universitari. Ci accordiamo per piano di studio e simulazioni orali.', '1', '2026-10-17 04:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('221', '17', 'REQUEST', 'Cerco aiuto per preparazione di esami universitari. Vorrei concentrarmi su piano di studio e simulazioni orali.', '1', '2026-10-17 09:00:00', '1', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('222', '22', 'REQUEST', 'Vorrei imparare preparazione di esami universitari. Sono disponibile nel fine settimana per piano di studio e simulazioni orali.', '1', '2026-10-17 14:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('223', '28', 'OFFER', 'Offro lezioni di chitarra per principianti. Incontro individuale di un\'ora dedicato a accordi aperti e accompagnamento ritmico.', '1', '2026-10-17 19:00:00', '1', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('224', '5', 'OFFER', 'Sono disponibile per lezioni di chitarra per principianti. Due ore il sabato mattina: accordi aperti e accompagnamento ritmico.', '1', '2026-10-18 00:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('225', '10', 'OFFER', 'Propongo lezioni di chitarra per principianti per principianti, con esempi pratici su accordi aperti e accompagnamento ritmico.', '1', '2026-10-18 05:00:00', '1', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('226', '15', 'OFFER', 'Metto a disposizione esperienza in lezioni di chitarra per principianti. Ci accordiamo per accordi aperti e accompagnamento ritmico.', '1', '2026-10-18 10:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('227', '20', 'REQUEST', 'Cerco aiuto per lezioni di chitarra per principianti. Vorrei concentrarmi su accordi aperti e accompagnamento ritmico.', '1', '2026-10-18 15:00:00', '1', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('228', '25', 'REQUEST', 'Vorrei imparare lezioni di chitarra per principianti. Sono disponibile nel fine settimana per accordi aperti e accompagnamento ritmico.', '1', '2026-10-18 20:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('229', '3', 'OFFER', 'Offro lezioni introduttive di pianoforte. Incontro individuale di un\'ora dedicato a lettura delle note e coordinazione delle mani.', '1', '2026-10-19 01:00:00', '1', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('230', '8', 'OFFER', 'Sono disponibile per lezioni introduttive di pianoforte. Due ore il sabato mattina: lettura delle note e coordinazione delle mani.', '1', '2026-10-19 06:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('231', '13', 'OFFER', 'Propongo lezioni introduttive di pianoforte per principianti, con esempi pratici su lettura delle note e coordinazione delle mani.', '1', '2026-10-19 11:00:00', '1', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('232', '18', 'OFFER', 'Metto a disposizione esperienza in lezioni introduttive di pianoforte. Ci accordiamo per lettura delle note e coordinazione delle mani.', '1', '2026-10-19 16:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('233', '23', 'REQUEST', 'Cerco aiuto per lezioni introduttive di pianoforte. Vorrei concentrarmi su lettura delle note e coordinazione delle mani.', '1', '2026-10-19 21:00:00', '1', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('234', '28', 'REQUEST', 'Vorrei imparare lezioni introduttive di pianoforte. Sono disponibile nel fine settimana per lettura delle note e coordinazione delle mani.', '1', '2026-10-20 02:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('235', '6', 'OFFER', 'Offro esercizi introduttivi di canto. Incontro individuale di un\'ora dedicato a respirazione e intonazione.', '1', '2026-10-20 07:00:00', '1', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('236', '11', 'OFFER', 'Sono disponibile per esercizi introduttivi di canto. Due ore il sabato mattina: respirazione e intonazione.', '1', '2026-10-20 12:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('237', '16', 'OFFER', 'Propongo esercizi introduttivi di canto per principianti, con esempi pratici su respirazione e intonazione.', '1', '2026-10-20 17:00:00', '1', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('238', '21', 'OFFER', 'Metto a disposizione esperienza in esercizi introduttivi di canto. Ci accordiamo per respirazione e intonazione.', '1', '2026-10-20 22:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('239', '26', 'REQUEST', 'Cerco aiuto per esercizi introduttivi di canto. Vorrei concentrarmi su respirazione e intonazione.', '1', '2026-10-21 03:00:00', '1', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('240', '3', 'REQUEST', 'Vorrei imparare esercizi introduttivi di canto. Sono disponibile nel fine settimana per respirazione e intonazione.', '1', '2026-10-21 08:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('241', '9', 'OFFER', 'Offro ripasso di teoria musicale. Incontro individuale di un\'ora dedicato a solfeggio ritmico e lettura dello spartito.', '1', '2026-10-21 13:00:00', '1', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('242', '14', 'OFFER', 'Sono disponibile per ripasso di teoria musicale. Due ore il sabato mattina: solfeggio ritmico e lettura dello spartito.', '1', '2026-10-21 18:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('243', '19', 'OFFER', 'Propongo ripasso di teoria musicale per principianti, con esempi pratici su solfeggio ritmico e lettura dello spartito.', '1', '2026-10-21 23:00:00', '1', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('244', '24', 'OFFER', 'Metto a disposizione esperienza in ripasso di teoria musicale. Ci accordiamo per solfeggio ritmico e lettura dello spartito.', '1', '2026-10-22 04:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('245', '1', 'REQUEST', 'Cerco aiuto per ripasso di teoria musicale. Vorrei concentrarmi su solfeggio ritmico e lettura dello spartito.', '1', '2026-10-22 09:00:00', '1', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('246', '6', 'REQUEST', 'Vorrei imparare ripasso di teoria musicale. Sono disponibile nel fine settimana per solfeggio ritmico e lettura dello spartito.', '1', '2026-10-22 14:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('247', '12', 'OFFER', 'Offro preparazione di ricette della cucina italiana. Incontro individuale di un\'ora dedicato a risotto e pasta fresca fatta in casa.', '1', '2026-10-22 19:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('248', '17', 'OFFER', 'Sono disponibile per preparazione di ricette della cucina italiana. Due ore il sabato mattina: risotto e pasta fresca fatta in casa.', '1', '2026-10-23 00:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('249', '22', 'OFFER', 'Propongo preparazione di ricette della cucina italiana per principianti, con esempi pratici su risotto e pasta fresca fatta in casa.', '1', '2026-10-23 05:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('250', '27', 'OFFER', 'Metto a disposizione esperienza in preparazione di ricette della cucina italiana. Ci accordiamo per risotto e pasta fresca fatta in casa.', '1', '2026-10-23 10:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('251', '4', 'REQUEST', 'Cerco aiuto per preparazione di ricette della cucina italiana. Vorrei concentrarmi su risotto e pasta fresca fatta in casa.', '1', '2026-10-23 15:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('252', '9', 'REQUEST', 'Vorrei imparare preparazione di ricette della cucina italiana. Sono disponibile nel fine settimana per risotto e pasta fresca fatta in casa.', '1', '2026-10-23 20:00:00', '0', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('253', '15', 'OFFER', 'Offro preparazione di pane con lievito madre. Incontro individuale di un\'ora dedicato a impasto, pieghe e tempi di lievitazione.', '1', '2026-10-24 01:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('254', '20', 'OFFER', 'Sono disponibile per preparazione di pane con lievito madre. Due ore il sabato mattina: impasto, pieghe e tempi di lievitazione.', '1', '2026-10-24 06:00:00', '0', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('255', '25', 'OFFER', 'Propongo preparazione di pane con lievito madre per principianti, con esempi pratici su impasto, pieghe e tempi di lievitazione.', '1', '2026-10-24 11:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('256', '2', 'OFFER', 'Metto a disposizione esperienza in preparazione di pane con lievito madre. Ci accordiamo per impasto, pieghe e tempi di lievitazione.', '1', '2026-10-24 16:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('257', '7', 'REQUEST', 'Cerco aiuto per preparazione di pane con lievito madre. Vorrei concentrarmi su impasto, pieghe e tempi di lievitazione.', '1', '2026-10-24 21:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('258', '12', 'REQUEST', 'Vorrei imparare preparazione di pane con lievito madre. Sono disponibile nel fine settimana per impasto, pieghe e tempi di lievitazione.', '1', '2026-10-25 02:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('259', '18', 'OFFER', 'Offro preparazione di dolci da forno. Incontro individuale di un\'ora dedicato a crostata di frutta e pasta frolla.', '1', '2026-10-25 07:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('260', '23', 'OFFER', 'Sono disponibile per preparazione di dolci da forno. Due ore il sabato mattina: crostata di frutta e pasta frolla.', '1', '2026-10-25 12:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('261', '28', 'OFFER', 'Propongo preparazione di dolci da forno per principianti, con esempi pratici su crostata di frutta e pasta frolla.', '1', '2026-10-25 17:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('262', '5', 'OFFER', 'Metto a disposizione esperienza in preparazione di dolci da forno. Ci accordiamo per crostata di frutta e pasta frolla.', '1', '2026-10-25 22:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('263', '10', 'REQUEST', 'Cerco aiuto per preparazione di dolci da forno. Vorrei concentrarmi su crostata di frutta e pasta frolla.', '1', '2026-10-26 03:00:00', '0', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('264', '15', 'REQUEST', 'Vorrei imparare preparazione di dolci da forno. Sono disponibile nel fine settimana per crostata di frutta e pasta frolla.', '1', '2026-10-26 08:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('265', '21', 'OFFER', 'Offro preparazione di pasti vegetariani. Incontro individuale di un\'ora dedicato a legumi, verdure di stagione e menu settimanale.', '1', '2026-10-26 13:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('266', '26', 'OFFER', 'Sono disponibile per preparazione di pasti vegetariani. Due ore il sabato mattina: legumi, verdure di stagione e menu settimanale.', '1', '2026-10-26 18:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('267', '3', 'OFFER', 'Propongo preparazione di pasti vegetariani per principianti, con esempi pratici su legumi, verdure di stagione e menu settimanale.', '1', '2026-10-26 23:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('268', '8', 'OFFER', 'Metto a disposizione esperienza in preparazione di pasti vegetariani. Ci accordiamo per legumi, verdure di stagione e menu settimanale.', '1', '2026-10-27 04:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('269', '13', 'REQUEST', 'Cerco aiuto per preparazione di pasti vegetariani. Vorrei concentrarmi su legumi, verdure di stagione e menu settimanale.', '1', '2026-10-27 09:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('270', '18', 'REQUEST', 'Vorrei imparare preparazione di pasti vegetariani. Sono disponibile nel fine settimana per legumi, verdure di stagione e menu settimanale.', '1', '2026-10-27 14:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('271', '24', 'OFFER', 'Offro pratica introduttiva di yoga. Incontro individuale di un\'ora dedicato a posizioni di base e respirazione consapevole.', '1', '2026-10-27 19:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('272', '1', 'OFFER', 'Sono disponibile per pratica introduttiva di yoga. Due ore il sabato mattina: posizioni di base e respirazione consapevole.', '1', '2026-10-28 00:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('273', '6', 'OFFER', 'Propongo pratica introduttiva di yoga per principianti, con esempi pratici su posizioni di base e respirazione consapevole.', '1', '2026-10-28 05:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('274', '11', 'OFFER', 'Metto a disposizione esperienza in pratica introduttiva di yoga. Ci accordiamo per posizioni di base e respirazione consapevole.', '1', '2026-10-28 10:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('275', '16', 'REQUEST', 'Cerco aiuto per pratica introduttiva di yoga. Vorrei concentrarmi su posizioni di base e respirazione consapevole.', '1', '2026-10-28 15:00:00', '0', '0', NULL, 'Napoli');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('276', '21', 'REQUEST', 'Vorrei imparare pratica introduttiva di yoga. Sono disponibile nel fine settimana per posizioni di base e respirazione consapevole.', '1', '2026-10-28 20:00:00', '0', '0', NULL, 'Roma');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('277', '27', 'OFFER', 'Offro allenamento a corpo libero per principianti. Incontro individuale di un\'ora dedicato a riscaldamento e circuiti senza attrezzi.', '1', '2026-10-29 01:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('278', '4', 'OFFER', 'Sono disponibile per allenamento a corpo libero per principianti. Due ore il sabato mattina: riscaldamento e circuiti senza attrezzi.', '1', '2026-10-29 06:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('279', '9', 'OFFER', 'Propongo allenamento a corpo libero per principianti per principianti, con esempi pratici su riscaldamento e circuiti senza attrezzi.', '1', '2026-10-29 11:00:00', '0', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('280', '14', 'OFFER', 'Metto a disposizione esperienza in allenamento a corpo libero per principianti. Ci accordiamo per riscaldamento e circuiti senza attrezzi.', '1', '2026-10-29 16:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('281', '19', 'REQUEST', 'Cerco aiuto per allenamento a corpo libero per principianti. Vorrei concentrarmi su riscaldamento e circuiti senza attrezzi.', '1', '2026-10-29 21:00:00', '0', '0', NULL, 'Bari');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('282', '24', 'REQUEST', 'Vorrei imparare allenamento a corpo libero per principianti. Sono disponibile nel fine settimana per riscaldamento e circuiti senza attrezzi.', '1', '2026-10-30 02:00:00', '0', '0', NULL, 'Bologna');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('283', '2', 'OFFER', 'Offro organizzazione di uscite di corsa per principianti. Incontro individuale di un\'ora dedicato a ritmo graduale e percorsi al parco.', '1', '2026-10-30 07:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('284', '7', 'OFFER', 'Sono disponibile per organizzazione di uscite di corsa per principianti. Due ore il sabato mattina: ritmo graduale e percorsi al parco.', '1', '2026-10-30 12:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('285', '12', 'OFFER', 'Propongo organizzazione di uscite di corsa per principianti per principianti, con esempi pratici su ritmo graduale e percorsi al parco.', '1', '2026-10-30 17:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('286', '17', 'OFFER', 'Metto a disposizione esperienza in organizzazione di uscite di corsa per principianti. Ci accordiamo per ritmo graduale e percorsi al parco.', '1', '2026-10-30 22:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('287', '22', 'REQUEST', 'Cerco aiuto per organizzazione di uscite di corsa per principianti. Vorrei concentrarmi su ritmo graduale e percorsi al parco.', '1', '2026-10-31 03:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('288', '27', 'REQUEST', 'Vorrei imparare organizzazione di uscite di corsa per principianti. Sono disponibile nel fine settimana per ritmo graduale e percorsi al parco.', '1', '2026-10-31 08:00:00', '0', '0', NULL, 'Palermo');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('289', '5', 'OFFER', 'Offro cura e passeggiate per cani. Incontro individuale di un\'ora dedicato a uscite al parco e rispetto degli orari dei pasti.', '1', '2026-10-31 13:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('290', '10', 'OFFER', 'Sono disponibile per cura e passeggiate per cani. Due ore il sabato mattina: uscite al parco e rispetto degli orari dei pasti.', '1', '2026-10-31 18:00:00', '0', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('291', '15', 'OFFER', 'Propongo cura e passeggiate per cani per principianti, con esempi pratici su uscite al parco e rispetto degli orari dei pasti.', '1', '2026-10-31 23:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('292', '20', 'OFFER', 'Metto a disposizione esperienza in cura e passeggiate per cani. Ci accordiamo per uscite al parco e rispetto degli orari dei pasti.', '1', '2026-11-01 04:00:00', '0', '0', NULL, 'Padova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('293', '25', 'REQUEST', 'Cerco aiuto per cura e passeggiate per cani. Vorrei concentrarmi su uscite al parco e rispetto degli orari dei pasti.', '1', '2026-11-01 09:00:00', '0', '0', NULL, 'Firenze');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('294', '2', 'REQUEST', 'Vorrei imparare cura e passeggiate per cani. Sono disponibile nel fine settimana per uscite al parco e rispetto degli orari dei pasti.', '1', '2026-11-01 14:00:00', '0', '0', NULL, 'Milano');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('295', '8', 'OFFER', 'Offro cura di gatti a domicilio. Incontro individuale di un\'ora dedicato a cibo, acqua e pulizia della lettiera.', '1', '2026-11-01 19:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('296', '13', 'OFFER', 'Sono disponibile per cura di gatti a domicilio. Due ore il sabato mattina: cibo, acqua e pulizia della lettiera.', '1', '2026-11-02 00:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('297', '18', 'OFFER', 'Propongo cura di gatti a domicilio per principianti, con esempi pratici su cibo, acqua e pulizia della lettiera.', '1', '2026-11-02 05:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('298', '23', 'OFFER', 'Metto a disposizione esperienza in cura di gatti a domicilio. Ci accordiamo per cibo, acqua e pulizia della lettiera.', '1', '2026-11-02 10:00:00', '0', '0', NULL, 'Torino');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('299', '28', 'REQUEST', 'Cerco aiuto per cura di gatti a domicilio. Vorrei concentrarmi su cibo, acqua e pulizia della lettiera.', '1', '2026-11-02 15:00:00', '0', '0', NULL, 'Genova');
INSERT INTO `services` (`id`, `user_id`, `type`, `description`, `is_used`, `creation_date`, `is_remote`, `is_suspended`, `deleted_at`, `location`) VALUES ('300', '5', 'REQUEST', 'Vorrei imparare cura di gatti a domicilio. Sono disponibile nel fine settimana per cibo, acqua e pulizia della lettiera.', '1', '2026-11-02 20:00:00', '0', '0', NULL, 'Firenze');

CREATE TABLE `staff_operation_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `staff_id` int NOT NULL,
  `staff_username` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_id` int NOT NULL,
  `before_values` json DEFAULT NULL,
  `after_values` json NOT NULL,
  `created_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  PRIMARY KEY (`id`),
  KEY `staff_log_date_index` (`created_at`,`id`),
  KEY `staff_log_actor_index` (`staff_id`),
  KEY `staff_log_action_index` (`action`),
  KEY `staff_log_target_index` (`target_type`,`target_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


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
  `credits` int NOT NULL DEFAULT '0',
  `creation_date` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `bio` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `profile_image_url` varchar(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_users_username` (`username`),
  UNIQUE KEY `unique_users_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('1', 'Mario', 'Rossi', 'Roma', 'mario.rossi', 'mario.rossi@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Roma. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('2', 'Giulia', 'Bianchi', 'Milano', 'giulia.bianchi', 'giulia.bianchi@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Milano. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('3', 'Luca', 'Ferrari', 'Torino', 'luca.ferrari', 'luca.ferrari@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Torino. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('4', 'Sofia', 'Romano', 'Bologna', 'sofia.romano', 'sofia.romano@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Bologna. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('5', 'Marco', 'Ricci', 'Firenze', 'marco.ricci', 'marco.ricci@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Firenze. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('6', 'Chiara', 'Marino', 'Napoli', 'chiara.marino', 'chiara.marino@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Napoli. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('7', 'Andrea', 'Greco', 'Palermo', 'andrea.greco', 'andrea.greco@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Palermo. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('8', 'Francesca', 'Bruno', 'Genova', 'francesca.bruno', 'francesca.bruno@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Genova. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('9', 'Alessandro', 'Gallo', 'Bari', 'alessandro.gallo', 'alessandro.gallo@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Bari. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('10', 'Elena', 'Conti', 'Padova', 'elena.conti', 'elena.conti@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Padova. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('11', 'Matteo', 'De Luca', 'Roma', 'matteo.deluca', 'matteo.deluca@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Roma. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('12', 'Sara', 'Mancini', 'Milano', 'sara.mancini', 'sara.mancini@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Milano. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('13', 'Davide', 'Costa', 'Torino', 'davide.costa', 'davide.costa@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Torino. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('14', 'Martina', 'Giordano', 'Bologna', 'martina.giordano', 'martina.giordano@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Bologna. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('15', 'Simone', 'Rizzo', 'Firenze', 'simone.rizzo', 'simone.rizzo@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Firenze. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('16', 'Valentina', 'Lombardi', 'Napoli', 'valentina.lombardi', 'valentina.lombardi@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Napoli. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('17', 'Federico', 'Moretti', 'Palermo', 'federico.moretti', 'federico.moretti@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Palermo. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('18', 'Alice', 'Barbieri', 'Genova', 'alice.barbieri', 'alice.barbieri@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Genova. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('19', 'Lorenzo', 'Fontana', 'Bari', 'lorenzo.fontana', 'lorenzo.fontana@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Bari. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('20', 'Beatrice', 'Santoro', 'Padova', 'beatrice.santoro', 'beatrice.santoro@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Padova. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('21', 'Gabriele', 'Mariani', 'Roma', 'gabriele.mariani', 'gabriele.mariani@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Roma. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('22', 'Laura', 'Rinaldi', 'Milano', 'laura.rinaldi', 'laura.rinaldi@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Milano. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('23', 'Riccardo', 'Caruso', 'Torino', 'riccardo.caruso', 'riccardo.caruso@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Torino. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('24', 'Silvia', 'Ferrara', 'Bologna', 'silvia.ferrara', 'silvia.ferrara@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Bologna. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('25', 'Nicola', 'Galli', 'Firenze', 'nicola.galli', 'nicola.galli@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Firenze. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('26', 'Paola', 'Martini', 'Napoli', 'paola.martini', 'paola.martini@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Napoli. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('27', 'Tommaso', 'Leone', 'Palermo', 'tommaso.leone', 'tommaso.leone@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Palermo. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('28', 'Roberta', 'Longo', 'Genova', 'roberta.longo', 'roberta.longo@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Vivo a Genova. Mi piace condividere competenze e imparare attraverso lo scambio di servizi.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('29', 'Anna', 'Serra', 'Bari', 'staff.anna', 'staff.anna@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\", \"ROLE_STAFF\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Mi occupo di assistenza agli utenti e moderazione della comunita.', NULL);
INSERT INTO `users` (`id`, `name`, `surname`, `location`, `username`, `email`, `password_hash`, `roles`, `account_status`, `credits`, `creation_date`, `bio`, `profile_image_url`) VALUES ('30', 'Paolo', 'Villa', 'Padova', 'staff.paolo', 'staff.paolo@example.test', '$2y$12$LXRr7elkVJ67hCCHaQ2fSeGTpKkwIMUJcnduTRyMBuJl/NH3qau5O', '[\"ROLE_USER\", \"ROLE_STAFF\"]', 'ACTIVE', '0', '2026-08-01 09:00:00', 'Mi occupo di assistenza agli utenti e moderazione della comunita.', NULL);

SET FOREIGN_KEY_CHECKS = 1;
