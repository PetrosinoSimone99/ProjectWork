<?php

declare(strict_types=1);

// Header CORS (origine, metodi, header autorizzati) + risposta 204 al preflight OPTIONS.
require_once __DIR__ . '/cors.php';

// Questo endpoint restituisce sempre risposte in formato JSON.
header('Content-Type: application/json; charset=utf-8');

// Usiamo le classi già presenti nel progetto per il database e il token.
require_once __DIR__ . '/DbConnector.php';
require_once __DIR__ . '/TokenManager.php';

// La modifica dello stato di un utente cambia il database, quindi accettiamo solo POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['errore' => 'Metodo non consentito. Usa POST.']);
    exit;
}

// L'utente che vuole gestire uno stato deve inviare un Bearer token valido.
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

// L'id dell'operatore viene letto dal token, non dal JSON inviato dal client.
$operatoreId = $tokenManager->extractUserID($token);

// Il client deve comunicare l'utente da gestire e il nuovo stato desiderato.
// Esempio: {"utente_id": 4, "stato": "SOSPESO"}
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

// stato deve essere testo. strtoupper() permette, ad esempio, di inviare "sospeso".
if (!isset($dati['stato']) || !is_string($dati['stato'])) {
    http_response_code(400);
    echo json_encode(['errore' => 'Il campo stato è obbligatorio e deve essere un testo.']);
    exit;
}

$utenteId = $dati['utente_id'];
$nuovoStato = strtoupper(trim($dati['stato']));
$statiConsentiti = ['ATTIVO', 'SOSPESO', 'BLOCCATO'];

if (!in_array($nuovoStato, $statiConsentiti, true)) {
    http_response_code(400);
    echo json_encode(['errore' => 'Stato non valido. Usa ATTIVO, SOSPESO o BLOCCATO.']);
    exit;
}

try {
    $db = new DbConnector('localhost', 'root', '', 'barattolo');

    // Leggiamo ruolo e stato dell'operatore direttamente dal database.
    // In questo modo un token valido non basta se l'account è stato sospeso o bloccato.
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

    // Solo STAFF e ADMIN possono gestire lo stato degli altri utenti.
    if ($operatore['ruolo'] !== 'STAFF' && $operatore['ruolo'] !== 'ADMIN') {
        http_response_code(403);
        echo json_encode(['errore' => 'Non hai i permessi per gestire lo stato degli utenti.']);
        exit;
    }

    // Nessuno può modificare il proprio stato tramite questa API.
    if ($utenteId === $operatoreId) {
        http_response_code(403);
        echo json_encode(['errore' => 'Non puoi modificare il tuo stato con questa API.']);
        exit;
    }

    // Recuperiamo il bersaglio prima di decidere se la gerarchia dei ruoli lo permette.
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

    // Gli ADMIN non possono essere modificati da questa API, neppure da un altro ADMIN.
    if ($utente['ruolo'] === 'ADMIN') {
        http_response_code(403);
        echo json_encode(['errore' => 'Non puoi modificare lo stato di un amministratore.']);
        exit;
    }

    // STAFF può gestire solo UTENTE. ADMIN può gestire UTENTE e STAFF.
    if ($operatore['ruolo'] === 'STAFF' && $utente['ruolo'] !== 'UTENTE') {
        http_response_code(403);
        echo json_encode(['errore' => 'Lo STAFF può gestire solo utenti con ruolo UTENTE.']);
        exit;
    }

    // Aggiorniamo lo stato anche quando è già uguale a quello richiesto.
    // Questo rende la chiamata idempotente: la stessa richiesta può essere ripetuta senza errori.
    $stmt = $db->prepare(
        'UPDATE utenti
         SET stato = :stato
         WHERE id = :utente_id'
    );
    $stmt->bindValue(':stato', $nuovoStato, PDO::PARAM_STR);
    $stmt->bindValue(':utente_id', $utenteId, PDO::PARAM_INT);
    $stmt->execute();

    // Prepariamo i dati da restituire senza includere informazioni riservate, come password o saldi.
    $utente['id'] = (int) $utente['id'];
    $utente['stato'] = $nuovoStato;

    echo json_encode([
        'messaggio' => 'Stato dell\'utente aggiornato con successo.',
        'utente' => $utente,
    ]);
} catch (PDOException $e) {
    // Il dettaglio tecnico non viene restituito al client per non esporre dati del database.
    http_response_code(500);
    echo json_encode(['errore' => 'Errore durante l\'aggiornamento dello stato dell\'utente.']);
}
