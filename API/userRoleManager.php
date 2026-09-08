<?php

declare(strict_types=1);

// Header CORS (origine, metodi, header autorizzati) + risposta 204 al preflight OPTIONS.
require_once __DIR__ . '/cors.php';

// Questo endpoint restituisce sempre risposte in formato JSON.
header('Content-Type: application/json; charset=utf-8');

// Usiamo le classi già presenti nel progetto per il database e il token.
require_once __DIR__ . '/DbConnector.php';
require_once __DIR__ . '/TokenManager.php';

// La modifica del ruolo di un utente cambia il database, quindi accettiamo solo POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['errore' => 'Metodo non consentito. Usa POST.']);
    exit;
}

// L'operatore deve inviare un Bearer token valido.
$tokenManager = new TokenManager();
$headerAutorizzazione = $tokenManager->getAuthorizationHeader();

if (!is_string($headerAutorizzazione) || !preg_match('/^Bearer\s+(\S+)$/i', $headerAutorizzazione, $parti)) {
    http_response_code(401);
    echo json_encode(['errore' => 'Autenticazione richiesta.']);
    exit;
}

$token = $parti[1];

// validate() controlla che il token sia firmato correttamente e non sia scaduto.
if (!$tokenManager->validate($token)) {
    http_response_code(401);
    echo json_encode(['errore' => 'Token non valido o scaduto.']);
    exit;
}

// L'id dell'operatore arriva dal token firmato e non dal JSON del client.
$operatoreId = $tokenManager->extractUserID($token);

// Il client deve indicare l'utente da gestire e il nuovo ruolo.
// Esempio: {"utente_id": 4, "ruolo": "STAFF"}
$dati = json_decode(file_get_contents('php://input'), true);

if (!is_array($dati)) {
    http_response_code(400);
    echo json_encode(['errore' => 'Il corpo della richiesta deve contenere un JSON valido.']);
    exit;
}

// L'id deve essere un intero positivo. Non accettiamo stringhe come "4".
if (!isset($dati['utente_id']) || !is_int($dati['utente_id']) || $dati['utente_id'] <= 0) {
    http_response_code(400);
    echo json_encode(['errore' => 'Il campo utente_id deve essere un numero intero positivo.']);
    exit;
}

// ruolo deve essere un testo, che verrà convertito in maiuscolo.
if (!isset($dati['ruolo']) || !is_string($dati['ruolo'])) {
    http_response_code(400);
    echo json_encode(['errore' => 'Il campo ruolo è obbligatorio e deve essere un testo.']);
    exit;
}

$utenteId = $dati['utente_id'];
$nuovoRuolo = strtoupper(trim($dati['ruolo']));
$ruoliConsentiti = ['UTENTE', 'STAFF', 'ADMIN'];

if (!in_array($nuovoRuolo, $ruoliConsentiti, true)) {
    http_response_code(400);
    echo json_encode(['errore' => 'Ruolo non valido. Usa UTENTE, STAFF o ADMIN.']);
    exit;
}

try {
    $db = new DbConnector('localhost', 'root', '', 'barattolo');

    // Leggiamo ruolo e stato dell'operatore dal database.
    // Un token valido non basta se nel frattempo l'account è stato sospeso o bloccato.
    $stmt = $db->prepare(
        'SELECT id, ruolo, stato
         FROM utenti
         WHERE id = :operatore_id'
    );
    $stmt->bindValue(':operatore_id', $operatoreId, PDO::PARAM_INT);
    $stmt->execute();
    $operatore = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$operatore || $operatore['stato'] !== 'ATTIVO') {
        http_response_code(401);
        echo json_encode(['errore' => 'Operatore non attivo.']);
        exit;
    }

    // Solo STAFF e ADMIN possono modificare il ruolo di altri account.
    if ($operatore['ruolo'] !== 'STAFF' && $operatore['ruolo'] !== 'ADMIN') {
        http_response_code(403);
        echo json_encode(['errore' => 'Non hai i permessi per gestire i ruoli degli utenti.']);
        exit;
    }

    // Nessuno può modificare il proprio ruolo con questa API.
    if ($utenteId === $operatoreId) {
        http_response_code(403);
        echo json_encode(['errore' => 'Non puoi modificare il tuo ruolo con questa API.']);
        exit;
    }

    // Recuperiamo il bersaglio per verificare la gerarchia e costruire la risposta.
    $stmt = $db->prepare(
        'SELECT id, username, ruolo, stato
         FROM utenti
         WHERE id = :utente_id'
    );
    $stmt->bindValue(':utente_id', $utenteId, PDO::PARAM_INT);
    $stmt->execute();
    $utente = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$utente) {
        http_response_code(404);
        echo json_encode(['errore' => 'Utente non trovato.']);
        exit;
    }

    // STAFF può gestire soltanto utenti che hanno attualmente il ruolo UTENTE.
    if ($operatore['ruolo'] === 'STAFF' && $utente['ruolo'] !== 'UTENTE') {
        http_response_code(403);
        echo json_encode(['errore' => 'Lo STAFF può gestire solo utenti con ruolo UTENTE.']);
        exit;
    }

    // STAFF non può assegnare il ruolo ADMIN. ADMIN può assegnare tutti i ruoli.
    if ($operatore['ruolo'] === 'STAFF' && $nuovoRuolo === 'ADMIN') {
        http_response_code(403);
        echo json_encode(['errore' => 'Lo STAFF non può assegnare il ruolo ADMIN.']);
        exit;
    }

    // Aggiorniamo il ruolo anche quando è già uguale a quello richiesto.
    // Questo rende la richiesta idempotente per gli utenti che l'operatore può gestire.
    $stmt = $db->prepare(
        'UPDATE utenti
         SET ruolo = :ruolo
         WHERE id = :utente_id'
    );
    $stmt->bindValue(':ruolo', $nuovoRuolo, PDO::PARAM_STR);
    $stmt->bindValue(':utente_id', $utenteId, PDO::PARAM_INT);
    $stmt->execute();

    // Restituiamo solo le informazioni necessarie, senza password o saldi.
    $utente['id'] = (int) $utente['id'];
    $utente['ruolo'] = $nuovoRuolo;

    echo json_encode([
        'messaggio' => 'Ruolo dell\'utente aggiornato con successo.',
        'utente' => $utente,
    ]);
} catch (PDOException $e) {
    // Non inviamo al client dettagli tecnici del database.
    http_response_code(500);
    echo json_encode(['errore' => 'Errore durante l\'aggiornamento del ruolo dell\'utente.']);
}
