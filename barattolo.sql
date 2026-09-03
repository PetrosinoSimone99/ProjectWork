-- phpMyAdmin SQL Dump
-- version 6.0.0-dev+20260430.56011a6912
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Aug 24, 2026 at 01:55 PM
-- Server version: 8.4.3
-- PHP Version: 8.3.30

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
  `id` int NOT NULL,
  `data_creazione` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `utente_1` int DEFAULT NULL,
  `utente_2` int DEFAULT NULL,
  `durata_attivita_utente1` int DEFAULT NULL,
  `durata_attivita_utente2` int DEFAULT NULL,
  `accettazione_utente1` tinyint(1) DEFAULT NULL,
  `accettazione_utente2` tinyint(1) DEFAULT NULL,
  `completamento_utente1` tinyint(1) DEFAULT NULL,
  `completamento_utente2` tinyint(1) DEFAULT NULL,
  `stato` enum('PROPOSTO','ACCETTATO','IN_ESECUZIONE','COMPLETATO','CONTESTATO','ANNULLATO') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
  `id` int NOT NULL,
  `data_creazione` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `utente_richiedente` int DEFAULT NULL,
  `utente_erogatore` int DEFAULT NULL,
  `durata_attivita_erogatore` int DEFAULT NULL,
  `tariffa_credito` int DEFAULT NULL,
  `accettazione_utente_erogatore` tinyint(1) DEFAULT NULL,
  `completamento_utente_richiedente` tinyint(1) DEFAULT NULL,
  `stato` enum('PROPOSTO','ACCETTATO','IN_ESECUZIONE','COMPLETATO','CONTESTATO','ANNULLATO') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
  `id` int NOT NULL,
  `utente_1` int NOT NULL,
  `utente_2` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `chat`
--

INSERT INTO `chat` (`id`, `utente_1`, `utente_2`) VALUES
(1, 4, 8),
(2, 5, 3),
(3, 6, 2),
(4, 10, 7),
(5, 4, 6);

-- --------------------------------------------------------

--
-- Table structure for table `contenuto_chat`
--

CREATE TABLE `contenuto_chat` (
  `id` int NOT NULL,
  `messaggio` text,
  `id_utente` int DEFAULT NULL,
  `id_chat` int DEFAULT NULL,
  `timestamp_messaggio` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `contenuto_chat`
--

INSERT INTO `contenuto_chat` (`id`, `messaggio`, `id_utente`, `id_chat`, `timestamp_messaggio`) VALUES
(1, 'Ciao Chiara, ho visto il tuo annuncio per le lezioni di chitarra, sei disponibile questa settimana?', 4, 1, '2025-03-17 09:00:00'),
(2, 'Ciao Sara! Sì, sono libera martedì e giovedì pomeriggio, ti va bene?', 8, 1, '2025-03-17 09:05:00'),
(3, 'Perfetto, direi giovedì alle 17:00.', 4, 1, '2025-03-17 09:07:00'),
(4, 'Salve, avrei bisogno di riparare il rubinetto entro venerdì, è urgente.', 5, 2, '2025-03-17 08:00:00'),
(5, 'Buongiorno, posso passare domani mattina verso le 9, le va bene?', 3, 2, '2025-03-17 08:20:00'),
(6, 'Sì perfetto, grazie mille.', 5, 2, '2025-03-17 08:22:00'),
(7, 'Ciao, ho letto della tua richiesta di traduzione, di quante pagine si tratta esattamente?', 2, 3, '2025-03-17 10:00:00'),
(8, 'Sono circa 10 pagine di manuale tecnico, formattazione semplice.', 6, 3, '2025-03-17 10:05:00'),
(9, 'Ok, posso consegnare entro 5 giorni lavorativi.', 2, 3, '2025-03-17 10:10:00'),
(10, 'Ciao, sono interessato al dog sitting per il weekend del 22-23 marzo.', 7, 4, '2025-03-17 11:00:00'),
(11, 'Perfetto! Il mio cane è molto tranquillo, ti mando i dettagli in privato.', 10, 4, '2025-03-17 11:05:00'),
(12, 'Ciao, per l aiuto compiti di mio figlio saresti disponibile il lunedì?', 6, 5, '2025-03-17 12:00:00'),
(13, 'Sì, il lunedì pomeriggio va benissimo, dalle 15 alle 17.', 4, 5, '2025-03-17 12:10:00');

-- --------------------------------------------------------

--
-- Table structure for table `richieste`
--

CREATE TABLE `richieste` (
  `id` int NOT NULL,
  `utente_id` int NOT NULL,
  `titolo` varchar(100) NOT NULL,
  `descrizione` text NOT NULL,
  `tariffa_oraria_crediti` int DEFAULT NULL COMMENT 'Facoltativa per le richieste',
  `durata_minuti` int DEFAULT NULL,
  `localita` varchar(100) DEFAULT NULL,
  `creato_il` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
  `id` int NOT NULL,
  `nome` varchar(50) DEFAULT NULL,
  `cognome` varchar(50) DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(45) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `ruolo` varchar(20) NOT NULL DEFAULT 'UTENTE' COMMENT 'UTENTE, STAFF o ADMIN',
  `stato` varchar(20) NOT NULL DEFAULT 'ATTIVO' COMMENT 'ATTIVO, SOSPESO o BLOCCATO',
  `saldo_disponibile` int NOT NULL DEFAULT '0',
  `saldo_bloccato` int NOT NULL DEFAULT '0',
  `creato_il` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `descrizione_servizio` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `utenti`
--

INSERT INTO `utenti` (`id`, `nome`, `cognome`, `username`, `email`, `password_hash`, `ruolo`, `stato`, `saldo_disponibile`, `saldo_bloccato`, `creato_il`, `descrizione_servizio`) VALUES
(1, 'Marco', 'Rossi', 'marco.rossi', 'marco.rossi@example.com', 'demo', 'ADMIN', 'ATTIVO', 500, 0, '2025-01-10 08:15:00', 'Gestione piattaforma e supporto utenti'),
(2, 'Giulia', 'Bianchi', 'giulia.bianchi', 'giulia.bianchi@example.com', 'demo', 'STAFF', 'ATTIVO', 300, 0, '2025-01-15 09:30:00', 'Moderazione contenuti e assistenza dispute'),
(3, 'Luca', 'Verdi', 'luca.verdi', 'luca.verdi@example.com', 'demo', 'STAFF', 'ATTIVO', 250, 0, '2025-01-20 10:00:00', 'Supporto tecnico e onboarding nuovi utenti'),
(4, 'Sara', 'Colombo', 'sara.colombo', 'sara.colombo@example.com', 'demo', 'UTENTE', 'ATTIVO', 120, 20, '2025-02-01 07:45:00', 'Lezioni private di matematica e fisica'),
(5, 'Davide', 'Ferrari', 'davide.ferrari', 'davide.ferrari@example.com', 'demo', 'UTENTE', 'ATTIVO', 80, 10, '2025-02-05 13:20:00', 'Riparazioni idrauliche ed elettriche domestiche'),
(6, 'Elena', 'Romano', 'elena.romano', 'elena.romano@example.com', 'demo', 'UTENTE', 'ATTIVO', 60, 0, '2025-02-10 15:00:00', 'Traduzioni italiano-inglese e revisione testi'),
(7, 'Andrea', 'Greco', 'andrea.greco', 'andrea.greco@example.com', 'demo', 'UTENTE', 'SOSPESO', 40, 0, '2025-02-15 08:10:00', 'Assistenza informatica a domicilio'),
(8, 'Chiara', 'Bruno', 'chiara.bruno', 'chiara.bruno@example.com', 'demo', 'UTENTE', 'ATTIVO', 200, 15, '2025-02-20 11:30:00', 'Lezioni di chitarra e teoria musicale'),
(9, 'Matteo', 'Gallo', 'matteo.gallo', 'matteo.gallo@example.com', 'demo', 'UTENTE', 'BLOCCATO', 10, 0, '2025-03-01 16:45:00', 'Trasporti e piccoli traslochi'),
(10, 'Francesca', 'Conti', 'francesca.conti', 'francesca.conti@example.com', 'demo', 'UTENTE', 'ATTIVO', 150, 0, '2025-03-05 12:00:00', 'Dog sitting e passeggiate per animali');

-- --------------------------------------------------------

--
-- Table structure for table `inviti`
--

CREATE TABLE `inviti` (
  `id` int NOT NULL,
  `invitante_id` int NOT NULL,
  `invitato_id` int DEFAULT NULL,
  `codice` char(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `mese_invito` date NOT NULL COMMENT 'Primo giorno del mese solare di validita',
  `creato_il` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `riscattato_il` timestamp NULL DEFAULT NULL,
  CONSTRAINT `chk_inviti_codice` CHECK (`codice` REGEXP '^[A-Z0-9]{8}$'),
  CONSTRAINT `chk_inviti_mese` CHECK (dayofmonth(`mese_invito`) = 1),
  CONSTRAINT `chk_inviti_no_auto_invito` CHECK (`invitato_id` IS NULL OR `invitato_id` <> `invitante_id`),
  CONSTRAINT `chk_inviti_riscatto` CHECK ((`invitato_id` IS NULL AND `riscattato_il` IS NULL) OR (`invitato_id` IS NOT NULL AND `riscattato_il` IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_chat_utente_1` (`utente_1`),
  ADD KEY `idx_chat_utente_2` (`utente_2`);

--
-- Indexes for table `contenuto_chat`
--
ALTER TABLE `contenuto_chat`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_contenuto_chat_id_utente` (`id_utente`),
  ADD KEY `idx_contenuto_chat_id_chat` (`id_chat`);

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
-- Indexes for table `inviti`
--
ALTER TABLE `inviti`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_inviti_codice` (`codice`),
  ADD UNIQUE KEY `uq_inviti_invitante_mese` (`invitante_id`,`mese_invito`),
  ADD UNIQUE KEY `uq_inviti_invitato` (`invitato_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accordo_1_a_1`
--
ALTER TABLE `accordo_1_a_1`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `accordo_richiesta`
--
ALTER TABLE `accordo_richiesta`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `chat`
--
ALTER TABLE `chat`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `contenuto_chat`
--
ALTER TABLE `contenuto_chat`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `richieste`
--
ALTER TABLE `richieste`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `utenti`
--
ALTER TABLE `utenti`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `inviti`
--
ALTER TABLE `inviti`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

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
-- Constraints for table `chat`
--
ALTER TABLE `chat`
  ADD CONSTRAINT `fk_chat_utente1` FOREIGN KEY (`utente_1`) REFERENCES `utenti` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_chat_utente2` FOREIGN KEY (`utente_2`) REFERENCES `utenti` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `contenuto_chat`
--
ALTER TABLE `contenuto_chat`
  ADD CONSTRAINT `fk_contenuto_chat_chat` FOREIGN KEY (`id_chat`) REFERENCES `chat` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_contenuto_chat_utente` FOREIGN KEY (`id_utente`) REFERENCES `utenti` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `richieste`
--
ALTER TABLE `richieste`
  ADD CONSTRAINT `fk_richieste_utente` FOREIGN KEY (`utente_id`) REFERENCES `utenti` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `inviti`
--
ALTER TABLE `inviti`
  ADD CONSTRAINT `fk_inviti_invitante` FOREIGN KEY (`invitante_id`) REFERENCES `utenti` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `fk_inviti_invitato` FOREIGN KEY (`invitato_id`) REFERENCES `utenti` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
