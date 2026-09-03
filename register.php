<?php

declare(strict_types=1);

// L'endpoint restituisce sempre risposte JSON.
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/DbConnector.php';
require_once __DIR__ . '/TokenManager.php';

// La registrazione accetta solo richieste POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['errore' => 'Metodo non consentito. Usa POST.']);
    exit;
}

// Legge il JSON inviato dal client, per esempio:
// {
//   "nome": "Mario",
//   "cognome": "Rossi",
//   "username": "mario.rossi",
//   "email": "mario.rossi@email.it",
//   "password": "passwordSicura",
//   "descrizione_servizio": "Ripetizioni di matematica"
// }
$dati = json_decode(file_get_contents('php://input'), true);

// Questi campi sono necessari per creare un profilo completo.
$campiObbligatori = [
    'nome',
    'cognome',
    'username',
    'email',
    'password',
    'descrizione_servizio',
];

if (!is_array($dati)) {
    http_response_code(400);
    echo json_encode(['errore' => 'Il corpo della richiesta deve contenere un JSON valido.']);
    exit;
}

// Controlla che ogni campo sia presente e non sia vuoto.
foreach ($campiObbligatori as $campo) {
    if (!isset($dati[$campo]) || !is_string($dati[$campo]) || trim($dati[$campo]) === '') {
        http_response_code(400);
        echo json_encode(['errore' => "Il campo {$campo} è obbligatorio."]);
        exit;
    }
}

// trim elimina gli spazi accidentali inseriti dall'utente.
$nome = trim($dati['nome']);
$cognome = trim($dati['cognome']);
$username = trim($dati['username']);
$email = trim($dati['email']);
$password = $dati['password'];
$descrizioneServizio = trim($dati['descrizione_servizio']);

// Verifiche semplici, coerenti con le dimensioni delle colonne del database.
if (
    mb_strlen($nome) > 50 ||
    mb_strlen($cognome) > 50 ||
    mb_strlen($username) > 50 ||
    mb_strlen($email) > 45 ||
    mb_strlen($descrizioneServizio) > 100
) {
    http_response_code(400);
    echo json_encode(['errore' => 'Uno o più campi superano la lunghezza massima consentita.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['errore' => 'Email non valida.']);
    exit;
}

// Una password troppo corta è poco sicura anche se viene salvata con hash.
if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['errore' => 'La password deve contenere almeno 8 caratteri.']);
    exit;
}

try {
    // DbConnector prepara query parametrizzate, quindi i dati non vengono concatenati all'SQL.
    $db = new DbConnector('localhost', 'root', '', 'barattolo');

    // Username ed email devono essere univoci secondo lo schema del database.
    $stmt = $db->prepare(
        'SELECT id
         FROM utenti
         WHERE username = :username OR email = :email'
    );
    $stmt->bindValue(':username', $username, PDO::PARAM_STR);
    $stmt->bindValue(':email', $email, PDO::PARAM_STR);
    $stmt->execute();

    if ($stmt->fetch(PDO::FETCH_ASSOC)) {
        http_response_code(409);
        echo json_encode(['errore' => 'Username o email già utilizzati.']);
        exit;
    }

    // password_hash non salva la password originale: produce un hash sicuro con salt automatico.
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // Ruolo, stato e saldi usano i valori iniziali previsti dal database.
    $stmt = $db->prepare(
        'INSERT INTO utenti
            (nome, cognome, username, email, password_hash, ruolo, stato,
             saldo_disponibile, saldo_bloccato, descrizione_servizio)
         VALUES
            (:nome, :cognome, :username, :email, :password_hash, "UTENTE", "ATTIVO",
             0, 0, :descrizione_servizio)'
    );
    $stmt->bindValue(':nome', $nome, PDO::PARAM_STR);
    $stmt->bindValue(':cognome', $cognome, PDO::PARAM_STR);
    $stmt->bindValue(':username', $username, PDO::PARAM_STR);
    $stmt->bindValue(':email', $email, PDO::PARAM_STR);
    $stmt->bindValue(':password_hash', $passwordHash, PDO::PARAM_STR);
    $stmt->bindValue(':descrizione_servizio', $descrizioneServizio, PDO::PARAM_STR);

    if (!$stmt->execute()) {
        throw new PDOException('Inserimento utente non riuscito.');
    }

    // DbConnector espone solo prepare(), quindi recuperiamo l'id con una seconda query.
    $stmt = $db->prepare(
        'SELECT id, username, nome, cognome
         FROM utenti
         WHERE username = :username'
    );
    $stmt->bindValue(':username', $username, PDO::PARAM_STR);
    $stmt->execute();
    $utente = $stmt->fetch(PDO::FETCH_ASSOC);

    // Questo controllo evita di generare un token se l'utente non è stato trovato.
    if (!$utente) {
        throw new PDOException('Utente registrato ma non trovato.');
    }

    // TokenManager crea il token che permette all'utente appena registrato di autenticarsi subito.
    $tokenManager = new TokenManager();
    $token = $tokenManager->generateToken((int) $utente['id']);

    http_response_code(201);
    echo json_encode([ // TODO aggiustare dati necessari
        'messaggio' => 'Registrazione effettuata con successo.',
        'token' => $token,
        'utente' => [
            'id' => (int) $utente['id'],
            'username' => $utente['username'],
            'nome' => $utente['nome'],
            'cognome' => $utente['cognome'],
        ],
    ]);
} catch (PDOException $e) {
    // Il dettaglio dell'eccezione non viene inviato al client per non esporre informazioni sul DB.
    http_response_code(500);
    echo json_encode(['errore' => 'Errore durante la registrazione.']);
}
