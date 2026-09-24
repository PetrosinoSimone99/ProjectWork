-- phpMyAdmin SQL Dump
-- version 5.1.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Sep 06, 2026 at 01:35 PM
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
-- Table structure for table `accordo_1_a_1`
--

CREATE TABLE `accordo_1_a_1` (
  `id` int(11) NOT NULL,
  `data_creazione` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `utente_1` int(11) DEFAULT NULL,
  `utente_2` int(11) DEFAULT NULL,
  `durata_attivita_utente1` int(11) DEFAULT NULL,
  `durata_attivita_utente2` int(11) DEFAULT NULL,
  `accettazione_utente1` tinyint(1) DEFAULT NULL,
  `accettazione_utente2` tinyint(1) DEFAULT NULL,
  `completamento_utente1` tinyint(1) DEFAULT NULL,
  `completamento_utente2` tinyint(1) DEFAULT NULL,
  `stato` enum('PROPOSTO','ACCETTATO','IN_ESECUZIONE','COMPLETATO','CONTESTATO','ANNULLATO') COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `accordo_1_a_1`
--

INSERT INTO `accordo_1_a_1` (`id`, `data_creazione`, `utente_1`, `utente_2`, `durata_attivita_utente1`, `durata_attivita_utente2`, `accettazione_utente1`, `accettazione_utente2`, `completamento_utente1`, `completamento_utente2`, `stato`) VALUES
(1, '2025-03-18 08:00:00', 4, 6, 60, 60, 1, 1, 1, 1, 'COMPLETATO'),
(2, '2025-03-19 09:00:00', 5, 3, 30, 0, 1, 1, 0, 0, 'IN_ESECUZIONE'),
(3, '2025-03-20 10:00:00', 10, 7, 120, 0, 1, 0, 0, 0, 'PROPOSTO'),
(4, '2025-03-21 11:00:00', 8, 4, 45, 45, 1, 1, 1, 0, 'CONTESTATO'),
(5, '2025-03-22 12:00:00', 9, 5, 0, 0, 0, 0, 0, 0, 'ANNULLATO');

-- --------------------------------------------------------

--
-- Table structure for table `accordo_richiesta`
--

CREATE TABLE `accordo_richiesta` (
  `id` int(11) NOT NULL,
  `data_creazione` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `utente_richiedente` int(11) DEFAULT NULL,
  `utente_erogatore` int(11) DEFAULT NULL,
  `durata_attivita_erogatore` int(11) DEFAULT NULL,
  `tariffa_credito` int(11) DEFAULT NULL,
  `accettazione_utente_erogatore` tinyint(1) DEFAULT NULL,
  `completamento_utente_richiedente` tinyint(1) DEFAULT NULL,
  `stato` enum('PROPOSTO','ACCETTATO','IN_ESECUZIONE','COMPLETATO','CONTESTATO','ANNULLATO') COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `accordo_richiesta`
--

INSERT INTO `accordo_richiesta` (`id`, `data_creazione`, `utente_richiedente`, `utente_erogatore`, `durata_attivita_erogatore`, `tariffa_credito`, `accettazione_utente_erogatore`, `completamento_utente_richiedente`, `stato`) VALUES
(1, '2025-03-18 14:00:00', 4, 8, 45, 15, 1, 1, 'COMPLETATO'),
(2, '2025-03-19 15:00:00', 5, 3, 60, 20, 1, 0, 'IN_ESECUZIONE'),
(3, '2025-03-20 16:00:00', 6, 2, 180, 12, 1, 0, 'ACCETTATO'),
(4, '2025-03-21 17:00:00', 10, 7, 2880, 8, 0, 0, 'PROPOSTO'),
(5, '2025-03-22 18:00:00', 9, 4, 240, 18, 1, 1, 'CONTESTATO');

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
(28, 1, 1, 'Mess 20', '2026-09-06 13:19:25');

-- --------------------------------------------------------

--
-- Table structure for table `partecipanti_chat`
--

CREATE TABLE `partecipanti_chat` (
  `id_chat` int(11) NOT NULL,
  `id_utente` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `partecipanti_chat`
--

INSERT INTO `partecipanti_chat` (`id_chat`, `id_utente`) VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 1),
(7, 1),
(1, 2),
(5, 2),
(2, 3),
(6, 3),
(3, 4),
(4, 5),
(5, 5),
(6, 5),
(7, 7);

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
  `descrizione_servizio` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_ultimo_messaggio_letto` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `utenti`
--

INSERT INTO `utenti` (`id`, `nome`, `cognome`, `username`, `email`, `password_hash`, `ruolo`, `stato`, `saldo_disponibile`, `saldo_bloccato`, `creato_il`, `descrizione_servizio`, `id_ultimo_messaggio_letto`) VALUES
(1, 'Marco', 'Rossi', 'marco.rossi', 'marco.rossi@example.com', 'demo', 'ADMIN', 'ATTIVO', 500, 0, '2025-01-10 08:15:00', 'Gestione piattaforma e supporto utenti', 1),
(2, 'Giulia', 'Bianchi', 'giulia.bianchi', 'giulia.bianchi@example.com', 'demo', 'STAFF', 'ATTIVO', 300, 0, '2025-01-15 09:30:00', 'Moderazione contenuti e assistenza dispute', NULL),
(3, 'Luca', 'Verdi', 'luca.verdi', 'luca.verdi@example.com', 'demo', 'STAFF', 'ATTIVO', 250, 0, '2025-01-20 10:00:00', 'Supporto tecnico e onboarding nuovi utenti', NULL),
(4, 'Sara', 'Colombo', 'sara.colombo', 'sara.colombo@example.com', 'demo', 'UTENTE', 'ATTIVO', 120, 20, '2025-02-01 07:45:00', 'Lezioni private di matematica e fisica', NULL),
(5, 'Davide', 'Ferrari', 'davide.ferrari', 'davide.ferrari@example.com', 'demo', 'UTENTE', 'ATTIVO', 80, 10, '2025-02-05 13:20:00', 'Riparazioni idrauliche ed elettriche domestiche', NULL),
(6, 'Elena', 'Romano', 'elena.romano', 'elena.romano@example.com', 'demo', 'UTENTE', 'ATTIVO', 60, 0, '2025-02-10 15:00:00', 'Traduzioni italiano-inglese e revisione testi', NULL),
(7, 'Andrea', 'Greco', 'andrea.greco', 'andrea.greco@example.com', 'demo', 'UTENTE', 'SOSPESO', 40, 0, '2025-02-15 08:10:00', 'Assistenza informatica a domicilio', NULL),
(8, 'Chiara', 'Bruno', 'chiara.bruno', 'chiara.bruno@example.com', 'demo', 'UTENTE', 'ATTIVO', 200, 15, '2025-02-20 11:30:00', 'Lezioni di chitarra e teoria musicale', NULL),
(9, 'Matteo', 'Gallo', 'matteo.gallo', 'matteo.gallo@example.com', 'demo', 'UTENTE', 'BLOCCATO', 10, 0, '2025-03-01 16:45:00', 'Trasporti e piccoli traslochi', NULL),
(10, 'Francesca', 'Conti', 'francesca.conti', 'francesca.conti@example.com', 'demo', 'UTENTE', 'ATTIVO', 150, 0, '2025-03-05 12:00:00', 'Dog sitting e passeggiate per animali', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accordo_1_a_1`
--
ALTER TABLE `accordo_1_a_1`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_accordo_1_a_1_utente_1` (`utente_1`),
  ADD KEY `idx_accordo_1_a_1_utente_2` (`utente_2`);

--
-- Indexes for table `accordo_richiesta`
--
ALTER TABLE `accordo_richiesta`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_accordo_richiesta_richiedente` (`utente_richiedente`),
  ADD KEY `idx_accordo_richiesta_erogatore` (`utente_erogatore`);

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
-- Indexes for table `partecipanti_chat`
--
ALTER TABLE `partecipanti_chat`
  ADD PRIMARY KEY (`id_chat`,`id_utente`),
  ADD KEY `id_utente` (`id_utente`);

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
  ADD UNIQUE KEY `uq_utenti_email` (`email`),
  ADD KEY `fk_ultimo_messaggio` (`id_ultimo_messaggio_letto`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accordo_1_a_1`
--
ALTER TABLE `accordo_1_a_1`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `accordo_richiesta`
--
ALTER TABLE `accordo_richiesta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

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
-- Constraints for table `accordo_1_a_1`
--
ALTER TABLE `accordo_1_a_1`
  ADD CONSTRAINT `fk_accordo1a1_utente1` FOREIGN KEY (`utente_1`) REFERENCES `utenti` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_accordo1a1_utente2` FOREIGN KEY (`utente_2`) REFERENCES `utenti` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `accordo_richiesta`
--
ALTER TABLE `accordo_richiesta`
  ADD CONSTRAINT `fk_accordo_richiesta_erogatore` FOREIGN KEY (`utente_erogatore`) REFERENCES `utenti` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_accordo_richiesta_richiedente` FOREIGN KEY (`utente_richiedente`) REFERENCES `utenti` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
-- Constraints for table `partecipanti_chat`
--
ALTER TABLE `partecipanti_chat`
  ADD CONSTRAINT `partecipanti_chat_ibfk_1` FOREIGN KEY (`id_chat`) REFERENCES `chat` (`id`),
  ADD CONSTRAINT `partecipanti_chat_ibfk_2` FOREIGN KEY (`id_utente`) REFERENCES `utenti` (`id`);

--
-- Constraints for table `richieste`
--
ALTER TABLE `richieste`
  ADD CONSTRAINT `fk_richieste_utente` FOREIGN KEY (`utente_id`) REFERENCES `utenti` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `utenti`
--
ALTER TABLE `utenti`
  ADD CONSTRAINT `utenti_ibfk_1` FOREIGN KEY (`id_ultimo_messaggio_letto`) REFERENCES `messaggi_chat` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
