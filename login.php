<?php

declare(strict_types=1);

// L'endpoint restituisce sempre risposte JSON.
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/DbConnector.php';
require_once __DIR__ . '/TokenManager.php';

// Il login accetta solo richieste POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['errore' => 'Metodo non consentito. Usa POST.']);
    exit;
}

// Legge il corpo della richiesta, ad esempio:
// {"username":"mario.rossi", "password":"password"}
$dati = json_decode(file_get_contents('php://input'), true);

// Verifica che sia arrivato un JSON valido con entrambi i campi richiesti.
if (!is_array($dati) || empty($dati['username']) || empty($dati['password'])) {
    http_response_code(400);
    echo json_encode(['errore' => 'Username e password sono obbligatori.']);
    exit;
}

$username = trim($dati['username']);
$password = $dati['password'];

try {
    // La query parametrizzata evita SQL injection.
    $db = new DbConnector('localhost', 'root', '', 'barattolo');
    $stmt = $db->prepare(
        'SELECT id, username, nome, cognome, password_hash
         FROM utenti
         WHERE username = :username AND stato = "ATTIVO"'
    );
    $stmt->bindValue(':username', $username, PDO::PARAM_STR);
    $stmt->execute();
    $utente = $stmt->fetch(PDO::FETCH_ASSOC);

    // Si usa lo stesso messaggio sia per username inesistente sia per password errata.
    if (!$utente || !password_verify($password, $utente['password_hash'])) {
        http_response_code(401);
        echo json_encode(['errore' => 'Username o password non validi.']);
        exit;
    }

    // TokenManager si occupa di creare il token dell'utente autenticato.
    $tokenManager = new TokenManager();
    $token = $tokenManager->generateToken((int) $utente['id']);

    // Non viene mai restituito l'hash della password.
    echo json_encode([ // TODO aggiustare dati necessari
        'messaggio' => 'Login effettuato con successo.',
        'token' => $token,
        'utente' => [
            'id' => (int) $utente['id'],
            'username' => $utente['username'],
            'nome' => $utente['nome'],
            'cognome' => $utente['cognome'],
        ],
    ]);
} catch (PDOException $e) {
    // In produzione non si espone il dettaglio tecnico dell'errore al client.
    http_response_code(500);
    echo json_encode(['errore' => 'Errore durante il collegamento al database.']);
}
