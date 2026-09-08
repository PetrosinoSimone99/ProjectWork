<?php

require_once __DIR__ . '/../cors.php'; // Header CORS + risposta 204 al preflight OPTIONS.
require_once __DIR__ . '/../DbConnector.php';
require_once __DIR__ . '/../TokenManager.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['errore' => 'Metodo non consentito. Usa POST.']);
    exit;
}

// Validazione a monte (fail fast): prima di autenticare e interrogare il DB.
$post = json_decode(file_get_contents('php://input'), true);
if (!is_array($post)
    || !isset($post['chat'], $post['utente'], $post['messaggio'])
    || !is_int($post['chat'])         || $post['chat'] <= 0
    || !is_int($post['utente'])       || $post['utente'] <= 0
    || !is_string($post['messaggio']) || trim($post['messaggio']) === '') {
    http_response_code(400);
    echo json_encode(['errore' => 'Parametri non validi: chat e utente devono essere interi positivi, messaggio una stringa non vuota.']);
    exit;
}
$chat = $post['chat'];
$utente = $post['utente'];
$messaggio = trim($post['messaggio']);

$tokenManager = new TokenManager();
$token = $tokenManager->getBearerToken();

// Token mancante o malformato: validate() pretende una stringa, quindi il
// controllo va fatto prima di chiamarlo. In ogni caso la risposta è 401.
if (!is_string($token) || !$tokenManager->validate($token)) {
    http_response_code(401);
    echo json_encode(['errore' => 'Token non valido o scaduto.']);
    exit;
}

try {
    $connection = new DbConnector('localhost', 'root', '', 'barattolo');

    if (inviaMessaggio($connection, $chat, $utente, $messaggio)) {
        echo json_encode(['successo' => true, 'messaggio' => 'Messaggio inviato.']);
    } else {
        http_response_code(400);
        echo json_encode(['errore' => 'Invio del messaggio non riuscito.']);
    }
} catch (PDOException $e) {
    // Mai dettagli tecnici al client: solo lo status 500.
    http_response_code(500);
    echo json_encode(['errore' => 'Errore durante l\'invio del messaggio.']);
}

function inviaMessaggio(DbConnector $connection, int $chat, int $utente, string $messaggio): bool
{
    if ($messaggio === '') {
        return false;
    }

    $statement = $connection->prepare(
        'INSERT INTO messaggi_chat (id_utente, id_chat, messaggio)
         VALUES (:utente, :chat, :messaggio)'
    );
    $statement->bindValue(':utente', $utente, PDO::PARAM_INT);
    $statement->bindValue(':chat', $chat, PDO::PARAM_INT);
    $statement->bindValue(':messaggio', $messaggio, PDO::PARAM_STR);
    $statement->execute();

    return $statement->rowCount() > 0;
}
