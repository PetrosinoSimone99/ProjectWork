<?php

declare(strict_types=1);

require_once __DIR__ . '/cors.php';

// Questo file restituisce sempre una risposta in formato JSON.
header('Content-Type: application/json; charset=utf-8');

// Usiamo le due classi già presenti nel progetto per collegarci al database
// e per controllare il token dell'utente.
require_once __DIR__ . '/DbConnector.php';
require_once __DIR__ . '/TokenManager.php';

// Pubblicare una richiesta modifica il database, quindi accettiamo solo POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['errore' => 'Metodo non consentito. Usa POST.']);
    exit;
}

// Leggiamo l'header Authorization, che deve avere la forma:
// Authorization: Bearer IL_TOKEN_DELL_UTENTE
$tokenManager = new TokenManager();
$headerAutorizzazione = $tokenManager->getAuthorizationHeader();

if (!is_string($headerAutorizzazione) || !preg_match('/^Bearer\s+(\S+)$/i', $headerAutorizzazione, $parti)) {
    http_response_code(401);
    echo json_encode(['errore' => 'Autenticazione richiesta.']);
    exit;
}

$token = $parti[1];

// validate() controlla sia la firma del token sia la sua data di scadenza.
if (!$tokenManager->validate($token)) {
    http_response_code(401);
    echo json_encode(['errore' => 'Token non valido o scaduto.']);
    exit;
}

// L'id non viene mai preso dal JSON: lo ricaviamo dal token firmato.
// In questo modo un utente non può pubblicare una richiesta a nome di un altro.
$utenteId = $tokenManager->extractUserID($token);

// Leggiamo il JSON inviato dal client, per esempio:
// {
//   "titolo": "Ripetizioni di informatica",
//   "descrizione": "Offro aiuto con PHP e database MySQL.",
//   "tariffa_oraria_crediti": 10,
//   "durata_minuti": 60,
//   "localita": "Firenze"
// }
$dati = json_decode(file_get_contents('php://input'), true);

if (!is_array($dati)) {
    http_response_code(400);
    echo json_encode(['errore' => 'Il corpo della richiesta deve contenere un JSON valido.']);
    exit;
}

// Titolo e descrizione sono le uniche informazioni obbligatorie nella tabella.
if (!isset($dati['titolo']) || !is_string($dati['titolo']) || trim($dati['titolo']) === '') {
    http_response_code(400);
    echo json_encode(['errore' => 'Il campo titolo è obbligatorio.']);
    exit;
}

if (!isset($dati['descrizione']) || !is_string($dati['descrizione']) || trim($dati['descrizione']) === '') {
    http_response_code(400);
    echo json_encode(['errore' => 'Il campo descrizione è obbligatorio.']);
    exit;
}

// trim rimuove gli spazi inseriti per errore all'inizio e alla fine del testo.
$titolo = trim($dati['titolo']);
$descrizione = trim($dati['descrizione']);

// titolo è varchar(100), quindi non può superare 100 caratteri.
if (mb_strlen($titolo) > 100) {
    http_response_code(400);
    echo json_encode(['errore' => 'Il titolo non può superare 100 caratteri.']);
    exit;
}

// La località è facoltativa. Se non arriva nel JSON, salviamo NULL nel database.
$localita = null;
if (array_key_exists('localita', $dati)) {
    if (!is_string($dati['localita'])) {
        http_response_code(400);
        echo json_encode(['errore' => 'Il campo localita deve essere un testo.']);
        exit;
    }

    $localita = trim($dati['localita']);

    if (mb_strlen($localita) > 100) {
        http_response_code(400);
        echo json_encode(['errore' => 'La localita non può superare 100 caratteri.']);
        exit;
    }

    // Una località vuota non è utile: la trattiamo come valore non inserito.
    if ($localita === '') {
        $localita = null;
    }
}

// tariffa_oraria_crediti e durata_minuti sono facoltativi, ma quando sono presenti
// devono essere interi positivi. json_decode trasforma i numeri interi JSON in int.
$tariffaOrariaCrediti = null;
if (array_key_exists('tariffa_oraria_crediti', $dati)) {
    $tariffaOrariaCrediti = $dati['tariffa_oraria_crediti'];

    if (!is_int($tariffaOrariaCrediti) || $tariffaOrariaCrediti <= 0) {
        http_response_code(400);
        echo json_encode(['errore' => 'La tariffa_oraria_crediti deve essere un numero intero positivo.']);
        exit;
    }
}

$durataMinuti = null;
if (array_key_exists('durata_minuti', $dati)) {
    $durataMinuti = $dati['durata_minuti'];

    if (!is_int($durataMinuti) || $durataMinuti <= 0) {
        http_response_code(400);
        echo json_encode(['errore' => 'La durata_minuti deve essere un numero intero positivo.']);
        exit;
    }
}

try {
    // DbConnector usa query preparate: i dati dell'utente non vengono concatenati
    // direttamente nella query SQL e non possono modificare il comando SQL.
    $db = new DbConnector('localhost', 'root', '', 'barattolo');

    // Solo gli utenti attivi possono pubblicare nuovi annunci.
    $stmt = $db->prepare(
        'SELECT id
         FROM utenti
         WHERE id = :utente_id AND stato = "ATTIVO"'
    );
    $stmt->bindValue(':utente_id', $utenteId, PDO::PARAM_INT);
    $stmt->execute();

    if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
        http_response_code(401);
        echo json_encode(['errore' => 'Utente non attivo.']);
        exit;
    }

    // L'id e creato_il non servono nella INSERT: MySQL li crea automaticamente.
    $stmt = $db->prepare(
        'INSERT INTO richieste
            (utente_id, titolo, descrizione, tariffa_oraria_crediti, durata_minuti, localita)
         VALUES
            (:utente_id, :titolo, :descrizione, :tariffa_oraria_crediti, :durata_minuti, :localita)'
    );
    $stmt->bindValue(':utente_id', $utenteId, PDO::PARAM_INT);
    $stmt->bindValue(':titolo', $titolo, PDO::PARAM_STR);
    $stmt->bindValue(':descrizione', $descrizione, PDO::PARAM_STR);
    $stmt->bindValue(':tariffa_oraria_crediti', $tariffaOrariaCrediti, $tariffaOrariaCrediti === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $stmt->bindValue(':durata_minuti', $durataMinuti, $durataMinuti === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $stmt->bindValue(':localita', $localita, $localita === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $stmt->execute();

    // DbConnector espone soltanto prepare(), quindi recuperiamo la nuova riga con
    // una seconda query. Per questo progetto semplice scegliamo l'ultima richiesta
    // pubblicata dall'utente autenticato.
    $stmt = $db->prepare(
        'SELECT id, utente_id, titolo, descrizione, tariffa_oraria_crediti,
                durata_minuti, localita, creato_il
         FROM richieste
         WHERE utente_id = :utente_id
         ORDER BY id DESC
         LIMIT 1'
    );
    $stmt->bindValue(':utente_id', $utenteId, PDO::PARAM_INT);
    $stmt->execute();
    $richiesta = $stmt->fetch(PDO::FETCH_ASSOC);

    // Se il database ha inserito la riga, questo controllo non dovrebbe mai fallire.
    if (!$richiesta) {
        throw new PDOException('Richiesta inserita ma non trovata.');
    }

    // PDO restituisce gli interi come testo: li convertiamo prima di creare il JSON.
    $richiesta['id'] = (int) $richiesta['id'];
    $richiesta['utente_id'] = (int) $richiesta['utente_id'];
    if ($richiesta['tariffa_oraria_crediti'] !== null) {
        $richiesta['tariffa_oraria_crediti'] = (int) $richiesta['tariffa_oraria_crediti'];
    }
    if ($richiesta['durata_minuti'] !== null) {
        $richiesta['durata_minuti'] = (int) $richiesta['durata_minuti'];
    }

    http_response_code(201);
    echo json_encode([
        'messaggio' => 'Richiesta pubblicata con successo.',
        'richiesta' => $richiesta,
    ]);
} catch (PDOException $e) {
    // Non inviamo il dettaglio dell'errore al client per non esporre dati del database.
    http_response_code(500);
    echo json_encode(['errore' => 'Errore durante la pubblicazione della richiesta.']);
}
