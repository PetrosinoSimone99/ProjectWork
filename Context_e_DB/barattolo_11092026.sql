-- phpMyAdmin SQL Dump
-- version 5.1.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Sep 11, 2026 at 01:46 PM
-- Server version: 5.7.24
-- PHP Version: 8.3.1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `barattolo`
--

-- --------------------------------------------------------

--
-- Table structure for table `accordi_1_a_1`
--

CREATE TABLE `accordi_1_a_1` (
  `id` int(11) NOT NULL,
  `data_creazione` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data_inizio` timestamp NULL DEFAULT NULL,
  `data_fine` timestamp NULL DEFAULT NULL,
  `stato` enum('PROPOSTO','ACCETTATO','IN_ESECUZIONE','COMPLETATO','CONTESTATO','ANNULLATO') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `accordi_prestazione`
--

CREATE TABLE `accordi_prestazione` (
  `id` int(11) NOT NULL,
  `tipo` enum('Offerta','Richiesta') NOT NULL,
  `durata_attivita` int(11) DEFAULT NULL,
  `crediti` int(11) DEFAULT NULL,
  `data_creazione` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data_inizio` timestamp NULL DEFAULT NULL,
  `data_fine` timestamp NULL DEFAULT NULL,
  `completamento_beneficiario` tinyint(1) DEFAULT NULL,
  `stato` enum('PROPOSTO','ACCETTATO','IN_ESECUZIONE','COMPLETATO','CONTESTATO','ANNULLATO') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `accordi_prestazione`
--

INSERT INTO `accordi_prestazione` (`id`, `tipo`, `durata_attivita`, `crediti`, `data_creazione`, `data_inizio`, `data_fine`, `completamento_beneficiario`, `stato`) VALUES
(1, 'Richiesta', 10, 10, '2026-09-07 15:54:27', NULL, NULL, NULL, 'PROPOSTO'),
(2, 'Richiesta', 10, 10, '2026-09-07 15:55:14', NULL, NULL, NULL, 'ACCETTATO'),
(3, 'Offerta', 50, 20, '2026-09-07 15:59:17', NULL, NULL, NULL, 'PROPOSTO'),
(4, 'Richiesta', 60, 20, '2026-09-08 13:15:23', NULL, NULL, NULL, 'ANNULLATO'),
(5, 'Richiesta', 60, 10, '2026-09-08 14:36:50', NULL, NULL, NULL, 'PROPOSTO'),
(6, 'Richiesta', 60, 10, '2026-09-08 19:28:05', NULL, NULL, NULL, 'COMPLETATO'),
(7, 'Richiesta', 60, 10, '2026-09-08 19:32:36', NULL, NULL, NULL, 'COMPLETATO'),
(8, 'Richiesta', 60, 10, '2026-09-08 19:40:53', NULL, NULL, NULL, 'COMPLETATO'),
(9, 'Richiesta', 60, 10, '2026-09-08 19:41:35', NULL, NULL, NULL, 'COMPLETATO'),
(10, 'Richiesta', 60, 10, '2026-09-08 19:43:06', NULL, NULL, NULL, 'COMPLETATO'),
(11, 'Offerta', 60, 10, '2026-09-08 19:44:04', NULL, NULL, NULL, 'COMPLETATO'),
(12, 'Offerta', 60, 5000, '2026-09-08 19:45:12', NULL, NULL, NULL, 'ANNULLATO');

-- --------------------------------------------------------

--
-- Table structure for table `chat`
--

CREATE TABLE `chat` (
  `id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `chat`
--

INSERT INTO `chat` (`id`) VALUES
(1),
(2),
(3),
(4),
(5),
(6),
(7);

-- --------------------------------------------------------

--
-- Table structure for table `inviti`
--

CREATE TABLE `inviti` (
  `id` int(11) NOT NULL,
  `invitante_id` int(11) NOT NULL,
  `invitato_id` int(11) DEFAULT NULL,
  `codice` char(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `mese_invito` date NOT NULL COMMENT 'Primo giorno del mese solare di validita',
  `creato_il` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `riscattato_il` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `messaggi_chat`
--

CREATE TABLE `messaggi_chat` (
  `id` int(11) NOT NULL,
  `id_chat` int(11) DEFAULT NULL,
  `id_utente` int(11) DEFAULT NULL,
  `messaggio` text,
  `data_creazione` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `messaggi_chat`
--

INSERT INTO `messaggi_chat` (`id`, `id_chat`, `id_utente`, `messaggio`, `data_creazione`) VALUES
(1, 1, 1, 'Ciao', '2026-09-06 09:08:07'),
(2, 1, 1, 'Mess 2', '2026-09-06 09:17:30'),
(3, 1, 1, 'Mess 3', '2026-09-06 09:18:22'),
(4, 1, 1, 'Mess 3', '2026-09-06 09:20:02'),
(5, 1, 1, 'Mess 4', '2026-09-06 09:21:02'),
(6, 1, 1, 'Mess 6', '2026-09-06 09:21:23'),
(7, 1, 1, 'Mess 7', '2026-09-06 09:21:57'),
(8, 1, 1, 'Mess 8', '2026-09-06 09:22:18'),
(9, 1, 1, 'Mess 9', '2026-09-06 09:22:44'),
(10, 1, 2, 'Prova messaggi non letti', '2026-09-06 10:23:17'),
(11, 1, 2, 'Test SSE', '2026-09-06 11:16:43'),
(12, 1, 2, 'Test SSE di nuovo', '2026-09-06 11:34:21'),
(13, 1, 2, 'Test Notifica', '2026-09-06 12:36:43'),
(14, 1, 1, 'Test append', '2026-09-06 12:38:32'),
(15, 1, 1, 'Mess 15', '2026-09-06 12:40:26'),
(16, 1, 1, 'Mess 16', '2026-09-06 12:41:36'),
(17, 1, 2, 'Mess 17', '2026-09-06 12:44:05'),
(18, 1, 1, 'Mess 18', '2026-09-06 12:45:47'),
(19, 2, 3, 'Mess 1', '2026-09-06 12:46:13'),
(20, 3, 4, 'Mess 1', '2026-09-06 12:48:43'),
(21, 3, 4, 'Mess 2', '2026-09-06 13:00:42'),
(22, 4, 1, 'Mess 1', '2026-09-06 13:06:29'),
(23, 5, 2, 'Mess 1', '2026-09-06 13:08:50'),
(24, 6, 3, 'Mess 1', '2026-09-06 13:11:07'),
(25, NULL, 1, 'Mess 1', '2026-09-06 13:12:33'),
(26, 7, 1, 'Mess 1', '2026-09-06 13:13:30'),
(27, 1, 2, 'Mess 19', '2026-09-06 13:19:18'),
(28, 1, 1, 'Mess 20', '2026-09-06 13:19:25'),
(29, 2, 3, 'Test mess non letti', '2026-09-11 13:18:53'),
(30, 2, 3, 'Altro mess', '2026-09-11 13:18:53');

-- --------------------------------------------------------

--
-- Table structure for table `partecipanti_accordo_1_a_1`
--

CREATE TABLE `partecipanti_accordo_1_a_1` (
  `id_accordo` int(11) NOT NULL,
  `id_utente` int(11) NOT NULL,
  `durata_attivita` int(11) DEFAULT NULL,
  `accettazione` tinyint(1) DEFAULT NULL,
  `completamento` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `partecipanti_accordo_prestazione`
--

CREATE TABLE `partecipanti_accordo_prestazione` (
  `id_accordo` int(11) NOT NULL,
  `id_utente` int(11) NOT NULL,
  `ruolo` enum('Beneficiario','Erogatore') NOT NULL,
  `accettazione` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `partecipanti_accordo_prestazione`
--

INSERT INTO `partecipanti_accordo_prestazione` (`id_accordo`, `id_utente`, `ruolo`, `accettazione`) VALUES
(2, 3, 'Beneficiario', 1),
(2, 4, 'Erogatore', 1),
(3, 4, 'Beneficiario', NULL),
(3, 6, 'Erogatore', 1),
(4, 4, 'Erogatore', 0),
(4, 8, 'Beneficiario', 1),
(5, 5, 'Erogatore', NULL),
(5, 6, 'Beneficiario', 1),
(6, 6, 'Erogatore', 1),
(6, 10, 'Beneficiario', 1),
(7, 6, 'Erogatore', NULL),
(7, 10, 'Beneficiario', 1),
(8, 6, 'Erogatore', NULL),
(8, 10, 'Beneficiario', 1),
(9, 6, 'Erogatore', NULL),
(9, 10, 'Beneficiario', 1),
(10, 6, 'Erogatore', 1),
(10, 10, 'Beneficiario', 1),
(11, 6, 'Erogatore', 1),
(11, 10, 'Beneficiario', 1),
(12, 6, 'Erogatore', 1),
(12, 10, 'Beneficiario', 0);

-- --------------------------------------------------------

--
-- Table structure for table `partecipanti_chat`
--

CREATE TABLE `partecipanti_chat` (
  `id_chat` int(11) NOT NULL,
  `id_utente` int(11) NOT NULL,
  `id_ultimo_messaggio_letto` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `partecipanti_chat`
--

INSERT INTO `partecipanti_chat` (`id_chat`, `id_utente`, `id_ultimo_messaggio_letto`) VALUES
(1, 2, NULL),
(2, 3, NULL),
(3, 1, NULL),
(3, 4, NULL),
(4, 1, NULL),
(4, 5, NULL),
(5, 2, NULL),
(5, 5, NULL),
(6, 3, NULL),
(6, 5, NULL),
(7, 1, NULL),
(7, 7, NULL),
(1, 1, 1),
(2, 1, 19);

-- --------------------------------------------------------

--
-- Table structure for table `richieste`
--

CREATE TABLE `richieste` (
  `id` int(11) NOT NULL,
  `utente_id` int(11) NOT NULL,
  `titolo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descrizione` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tariffa_oraria_crediti` int(11) DEFAULT NULL COMMENT 'Facoltativa per le richieste',
  `durata_minuti` int(11) DEFAULT NULL,
  `localita` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creato_il` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `richieste`
--

INSERT INTO `richieste` (`id`, `utente_id`, `titolo`, `descrizione`, `tariffa_oraria_crediti`, `durata_minuti`, `localita`, `creato_il`) VALUES
(1, 4, 'Ripetizioni di matematica per esame di maturità', 'Offro lezioni private di matematica e fisica per studenti delle superiori, preparazione mirata agli scritti di maturità.', 15, 90, 'Firenze', '2025-03-10 08:00:00'),
(2, 5, 'Riparazione rubinetto che perde', 'Cerco qualcuno disponibile a riparare un rubinetto che perde in cucina, lavoro semplice, materiale già presente.', 20, 60, 'Prato', '2025-03-11 14:30:00'),
(3, 6, 'Traduzione documento tecnico ITA-ENG', 'Necessito della traduzione di un manuale tecnico di circa 10 pagine dall italiano all inglese entro una settimana.', 12, 180, NULL, '2025-03-12 09:15:00'),
(4, 8, 'Lezione di chitarra per principianti', 'Offro la prima lezione di chitarra gratuita per chi vuole iniziare da zero, poi tariffa oraria concordata.', NULL, 45, 'Firenze', '2025-03-13 17:00:00'),
(5, 10, 'Dog sitting per weekend fuori città', 'Cerco persona affidabile per tenere il mio cane per un weekend, disponibilità a portarlo a passeggio 2 volte al giorno.', 8, 2880, 'Prato', '2025-03-14 10:20:00'),
(6, 4, 'Aiuto compiti scuola media', 'Disponibile per aiuto compiti pomeridiano rivolto a ragazzi delle scuole medie, tutte le materie.', 10, 60, 'Firenze', '2025-03-15 13:00:00'),
(7, 9, 'Trasloco piccolo appartamento', 'Cerco aiuto per trasportare alcuni mobili da un monolocale a un nuovo appartamento in centro.', 18, 240, 'Firenze', '2025-03-16 07:30:00');

-- --------------------------------------------------------

--
-- Table structure for table `utenti`
--

CREATE TABLE `utenti` (
  `id` int(11) NOT NULL,
  `nome` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cognome` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruolo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UTENTE' COMMENT 'UTENTE, STAFF o ADMIN',
  `stato` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ATTIVO' COMMENT 'ATTIVO, SOSPESO o BLOCCATO',
  `saldo_disponibile` int(11) NOT NULL DEFAULT '0',
  `saldo_bloccato` int(11) NOT NULL DEFAULT '0',
  `creato_il` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `descrizione_servizio` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `utenti`
--

INSERT INTO `utenti` (`id`, `nome`, `cognome`, `username`, `email`, `password_hash`, `ruolo`, `stato`, `saldo_disponibile`, `saldo_bloccato`, `creato_il`, `descrizione_servizio`) VALUES
(1, 'Marco', 'Rossi', 'marco.rossi', 'marco.rossi@example.com', 'demo', 'ADMIN', 'ATTIVO', 500, 0, '2025-01-10 08:15:00', 'Gestione piattaforma e supporto utenti'),
(2, 'Giulia', 'Bianchi', 'giulia.bianchi', 'giulia.bianchi@example.com', 'demo', 'STAFF', 'ATTIVO', 300, 0, '2025-01-15 09:30:00', 'Moderazione contenuti e assistenza dispute'),
(3, 'Luca', 'Verdi', 'luca.verdi', 'luca.verdi@example.com', 'demo', 'STAFF', 'ATTIVO', 250, 0, '2025-01-20 10:00:00', 'Supporto tecnico e onboarding nuovi utenti'),
(4, 'Sara', 'Colombo', 'sara.colombo', 'sara.colombo@example.com', 'demo', 'UTENTE', 'ATTIVO', 120, 20, '2025-02-01 07:45:00', 'Lezioni private di matematica e fisica'),
(5, 'Davide', 'Ferrari', 'davide.ferrari', 'davide.ferrari@example.com', 'demo', 'UTENTE', 'ATTIVO', 80, 10, '2025-02-05 13:20:00', 'Riparazioni idrauliche ed elettriche domestiche'),
(6, 'Elena', 'Romano', 'elena.romano', 'elena.romano@example.com', 'demo', 'UTENTE', 'ATTIVO', 5050, 0, '2025-02-10 15:00:00', 'Traduzioni italiano-inglese e revisione testi'),
(7, 'Andrea', 'Greco', 'andrea.greco', 'andrea.greco@example.com', 'demo', 'UTENTE', 'SOSPESO', 40, 0, '2025-02-15 08:10:00', 'Assistenza informatica a domicilio'),
(8, 'Chiara', 'Bruno', 'chiara.bruno', 'chiara.bruno@example.com', 'demo', 'UTENTE', 'ATTIVO', 190, 15, '2025-02-20 11:30:00', 'Lezioni di chitarra e teoria musicale'),
(9, 'Matteo', 'Gallo', 'matteo.gallo', 'matteo.gallo@example.com', 'demo', 'UTENTE', 'BLOCCATO', 10, 0, '2025-03-01 16:45:00', 'Trasporti e piccoli traslochi'),
(10, 'Francesca', 'Conti', 'francesca.conti', 'francesca.conti@example.com', 'demo', 'UTENTE', 'ATTIVO', 5000, 0, '2025-03-05 12:00:00', 'Dog sitting e passeggiate per animali');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accordi_1_a_1`
--
ALTER TABLE `accordi_1_a_1`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `accordi_prestazione`
--
ALTER TABLE `accordi_prestazione`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `chat`
--
ALTER TABLE `chat`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `inviti`
--
ALTER TABLE `inviti`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_inviti_codice` (`codice`),
  ADD UNIQUE KEY `uq_inviti_invitante_mese` (`invitante_id`,`mese_invito`),
  ADD UNIQUE KEY `uq_inviti_invitato` (`invitato_id`);

--
-- Indexes for table `messaggi_chat`
--
ALTER TABLE `messaggi_chat`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_chat` (`id_chat`),
  ADD KEY `id_utente` (`id_utente`);

--
-- Indexes for table `partecipanti_accordo_1_a_1`
--
ALTER TABLE `partecipanti_accordo_1_a_1`
  ADD PRIMARY KEY (`id_accordo`,`id_utente`),
  ADD KEY `id_utente` (`id_utente`);

--
-- Indexes for table `partecipanti_accordo_prestazione`
--
ALTER TABLE `partecipanti_accordo_prestazione`
  ADD PRIMARY KEY (`id_accordo`,`id_utente`),
  ADD KEY `id_utente` (`id_utente`);

--
-- Indexes for table `partecipanti_chat`
--
ALTER TABLE `partecipanti_chat`
  ADD PRIMARY KEY (`id_chat`,`id_utente`),
  ADD KEY `id_utente` (`id_utente`),
  ADD KEY `id_ultimo_messaggio_letto` (`id_ultimo_messaggio_letto`);

--
-- Indexes for table `richieste`
--
ALTER TABLE `richieste`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_richieste_utente_id` (`utente_id`);

--
-- Indexes for table `utenti`
--
ALTER TABLE `utenti`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_utenti_username` (`username`),
  ADD UNIQUE KEY `uq_utenti_email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accordi_1_a_1`
--
ALTER TABLE `accordi_1_a_1`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `accordi_prestazione`
--
ALTER TABLE `accordi_prestazione`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `chat`
--
ALTER TABLE `chat`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `inviti`
--
ALTER TABLE `inviti`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `messaggi_chat`
--
ALTER TABLE `messaggi_chat`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `richieste`
--
ALTER TABLE `richieste`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `utenti`
--
ALTER TABLE `utenti`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `inviti`
--
ALTER TABLE `inviti`
  ADD CONSTRAINT `fk_inviti_invitante` FOREIGN KEY (`invitante_id`) REFERENCES `utenti` (`id`),
  ADD CONSTRAINT `fk_inviti_invitato` FOREIGN KEY (`invitato_id`) REFERENCES `utenti` (`id`);

--
-- Constraints for table `messaggi_chat`
--
ALTER TABLE `messaggi_chat`
  ADD CONSTRAINT `messaggi_chat_ibfk_1` FOREIGN KEY (`id_chat`) REFERENCES `chat` (`id`),
  ADD CONSTRAINT `messaggi_chat_ibfk_2` FOREIGN KEY (`id_utente`) REFERENCES `utenti` (`id`);

--
-- Constraints for table `partecipanti_accordo_1_a_1`
--
ALTER TABLE `partecipanti_accordo_1_a_1`
  ADD CONSTRAINT `partecipanti_accordo_1_a_1_ibfk_1` FOREIGN KEY (`id_accordo`) REFERENCES `accordi_1_a_1` (`id`),
  ADD CONSTRAINT `partecipanti_accordo_1_a_1_ibfk_2` FOREIGN KEY (`id_utente`) REFERENCES `utenti` (`id`);

--
-- Constraints for table `partecipanti_accordo_prestazione`
--
ALTER TABLE `partecipanti_accordo_prestazione`
  ADD CONSTRAINT `partecipanti_accordo_prestazione_ibfk_1` FOREIGN KEY (`id_accordo`) REFERENCES `accordi_prestazione` (`id`),
  ADD CONSTRAINT `partecipanti_accordo_prestazione_ibfk_2` FOREIGN KEY (`id_utente`) REFERENCES `utenti` (`id`);

--
-- Constraints for table `partecipanti_chat`
--
ALTER TABLE `partecipanti_chat`
  ADD CONSTRAINT `partecipanti_chat_ibfk_1` FOREIGN KEY (`id_chat`) REFERENCES `chat` (`id`),
  ADD CONSTRAINT `partecipanti_chat_ibfk_2` FOREIGN KEY (`id_utente`) REFERENCES `utenti` (`id`),
  ADD CONSTRAINT `partecipanti_chat_ibfk_3` FOREIGN KEY (`id_ultimo_messaggio_letto`) REFERENCES `messaggi_chat` (`id`);

--
-- Constraints for table `richieste`
--
ALTER TABLE `richieste`
  ADD CONSTRAINT `fk_richieste_utente` FOREIGN KEY (`utente_id`) REFERENCES `utenti` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
