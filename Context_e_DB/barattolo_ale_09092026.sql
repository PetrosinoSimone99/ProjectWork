-- phpMyAdmin SQL Dump
-- version 5.1.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Sep 08, 2026 at 04:52 PM
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

--
-- Dumping data for table `accordi_1_a_1`
--

INSERT INTO `accordi_1_a_1` (`id`, `data_creazione`, `data_inizio`, `data_fine`, `stato`) VALUES
(1, '2025-03-18 08:00:00', NULL, NULL, 'COMPLETATO'),
(2, '2025-03-19 09:00:00', NULL, NULL, 'IN_ESECUZIONE'),
(3, '2025-03-20 10:00:00', NULL, NULL, 'PROPOSTO'),
(4, '2025-03-21 11:00:00', NULL, NULL, 'CONTESTATO'),
(5, '2025-03-22 12:00:00', NULL, NULL, 'ANNULLATO');

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
(1, 'Richiesta', 45, 15, '2025-03-18 14:00:00', NULL, NULL, 1, 'COMPLETATO'),
(2, 'Richiesta', 60, 20, '2025-03-19 15:00:00', NULL, NULL, 0, 'IN_ESECUZIONE'),
(3, 'Richiesta', 180, 12, '2025-03-20 16:00:00', NULL, NULL, 0, 'ACCETTATO'),
(4, 'Richiesta', 2880, 8, '2025-03-21 17:00:00', NULL, NULL, 0, 'PROPOSTO'),
(5, 'Richiesta', 240, 18, '2025-03-22 18:00:00', NULL, NULL, 1, 'CONTESTATO');

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
(5);

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
  `riscattato_il` timestamp NULL DEFAULT NULL,
  CONSTRAINT `chk_inviti_codice` CHECK (`codice` REGEXP '^[A-Z0-9]{8}$'),
  CONSTRAINT `chk_inviti_mese` CHECK (dayofmonth(`mese_invito`) = 1),
  CONSTRAINT `chk_inviti_no_auto_invito` CHECK (`invitato_id` IS NULL OR `invitato_id` <> `invitante_id`),
  CONSTRAINT `chk_inviti_riscatto` CHECK ((`invitato_id` IS NULL AND `riscattato_il` IS NULL) OR (`invitato_id` IS NOT NULL AND `riscattato_il` IS NOT NULL))
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
(1, 1, 4, 'Ciao Chiara, ho visto il tuo annuncio per le lezioni di chitarra, sei disponibile questa settimana?', '2025-03-17 09:00:00'),
(2, 1, 8, 'Ciao Sara! Sì, sono libera martedì e giovedì pomeriggio, ti va bene?', '2025-03-17 09:05:00'),
(3, 1, 4, 'Perfetto, direi giovedì alle 17:00.', '2025-03-17 09:07:00'),
(4, 2, 5, 'Salve, avrei bisogno di riparare il rubinetto entro venerdì, è urgente.', '2025-03-17 08:00:00'),
(5, 2, 3, 'Buongiorno, posso passare domani mattina verso le 9, le va bene?', '2025-03-17 08:20:00'),
(6, 2, 5, 'Sì perfetto, grazie mille.', '2025-03-17 08:22:00'),
(7, 3, 2, 'Ciao, ho letto della tua richiesta di traduzione, di quante pagine si tratta esattamente?', '2025-03-17 10:00:00'),
(8, 3, 6, 'Sono circa 10 pagine di manuale tecnico, formattazione semplice.', '2025-03-17 10:05:00'),
(9, 3, 2, 'Ok, posso consegnare entro 5 giorni lavorativi.', '2025-03-17 10:10:00'),
(10, 4, 7, 'Ciao, sono interessato al dog sitting per il weekend del 22-23 marzo.', '2025-03-17 11:00:00'),
(11, 4, 10, 'Perfetto! Il mio cane è molto tranquillo, ti mando i dettagli in privato.', '2025-03-17 11:05:00'),
(12, 5, 6, 'Ciao, per l aiuto compiti di mio figlio saresti disponibile il lunedì?', '2025-03-17 12:00:00'),
(13, 5, 4, 'Sì, il lunedì pomeriggio va benissimo, dalle 15 alle 17.', '2025-03-17 12:10:00');

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

--
-- Dumping data for table `partecipanti_accordo_1_a_1`
--

INSERT INTO `partecipanti_accordo_1_a_1` (`id_accordo`, `id_utente`, `durata_attivita`, `accettazione`, `completamento`) VALUES
(1, 4, 60, 1, 1),
(1, 6, 60, 1, 1),
(2, 5, 30, 1, 0),
(2, 3, 0, 1, 0),
(3, 10, 120, 1, 0),
(3, 7, 0, 0, 0),
(4, 8, 45, 1, 1),
(4, 4, 45, 1, 0),
(5, 9, 0, 0, 0),
(5, 5, 0, 0, 0);

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
(1, 4, 'Beneficiario', 1),
(1, 8, 'Erogatore', 1),
(2, 5, 'Beneficiario', 1),
(2, 3, 'Erogatore', 1),
(3, 6, 'Beneficiario', 1),
(3, 2, 'Erogatore', 1),
(4, 10, 'Beneficiario', 1),
(4, 7, 'Erogatore', 0),
(5, 9, 'Beneficiario', 1),
(5, 4, 'Erogatore', 1);

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
(1, 4),
(1, 8),
(2, 5),
(2, 3),
(3, 6),
(3, 2),
(4, 10),
(4, 7),
(5, 4),
(5, 6);

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
(1, 'Marco', 'Rossi', 'marco.rossi', 'marco.rossi@example.com', 'demo', 'ADMIN', 'ATTIVO', 500, 0, '2025-01-10 08:15:00', 'Gestione piattaforma e supporto utenti', NULL),
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
-- AUTO_INCREMENT for table `accordi_1_a_1`
--
ALTER TABLE `accordi_1_a_1`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `accordi_prestazione`
--
ALTER TABLE `accordi_prestazione`
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
