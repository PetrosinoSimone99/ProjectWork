<?php

require_once __DIR__ . '/../cors.php'; // Header CORS + risposta 204 al preflight OPTIONS.
require_once __DIR__ . '/../DbConnector.php';
require_once __DIR__ . '/../TokenManager.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['errore' => 'Metodo non consentito. Usa GET.']);
    exit;
}

// chat è l'id della chat di cui si vuole lo storico: deve essere un intero positivo.
if (!isset($_GET['chat']) || !ctype_digit((string) $_GET['chat']) || (int) $_GET['chat'] <= 0) {
    http_response_code(400);
    echo json_encode(['errore' => 'chat deve essere un intero positivo.']);
    exit;
}
$chat = (int) $_GET['chat'];

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

    // Una chat appena creata non ha ancora messaggi: la lista vuota è un
    // risultato valido (200), non un errore.
    $messaggi = ottieniStoricoChat($connection, $chat);
    echo json_encode($messaggi);
} catch (PDOException $e) {
    // Mai dettagli tecnici al client: solo lo status 500.
    http_response_code(500);
    echo json_encode(['errore' => 'Errore durante il caricamento dello storico.']);
}

function ottieniStoricoChat(DbConnector $connection, int $chat): array
{
    $statement = $connection->prepare('
        SELECT *
        FROM messaggi_chat
        WHERE id_chat = :chat
    ');
    $statement->bindValue(':chat', $chat, PDO::PARAM_INT);
    $statement->execute();

    return $statement->fetchAll(PDO::FETCH_ASSOC);
}
