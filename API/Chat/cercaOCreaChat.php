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
    || !isset($post['utenteAttuale'], $post['membroChat'])
    || !is_int($post['utenteAttuale']) || $post['utenteAttuale'] <= 0
    || !is_int($post['membroChat'])    || $post['membroChat'] <= 0
    || $post['utenteAttuale'] === $post['membroChat']) {
    http_response_code(400);
    echo json_encode(['errore' => 'Specifica due utenti diversi (id interi positivi).']);
    exit;
}
$utenteAttuale = $post['utenteAttuale'];
$membroChat = $post['membroChat'];

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

    $chatId = cercaChat($connection, $utenteAttuale, $membroChat);
    if (!$chatId) {
        $chatId = creaNuovaChat($connection, $utenteAttuale, $membroChat);
    }

    echo json_encode(['id_chat' => (int) $chatId]);
} catch (PDOException $e) {
    // Mai dettagli tecnici al client: solo lo status 500.
    http_response_code(500);
    echo json_encode(['errore' => 'Errore durante la ricerca o la creazione della chat.']);
}

function cercaChat(DbConnector $connection, int $utenteAttuale, int $membroChat)
{
    $statement = $connection->prepare('
        SELECT id_chat
        FROM partecipanti_chat
        WHERE id_utente IN (:utenteAttuale, :membroChat)
        GROUP BY id_chat
        HAVING COUNT(id_utente) = 2
    ');
    $statement->bindValue(':utenteAttuale', $utenteAttuale, PDO::PARAM_INT);
    $statement->bindValue(':membroChat', $membroChat, PDO::PARAM_INT);
    $statement->execute();
    $result = $statement->fetch(PDO::FETCH_ASSOC);

    return $result ? (int) $result['id_chat'] : false;
}

function creaNuovaChat(DbConnector $connection, int $utenteAttuale, int $membroChat): int
{
    // 1. La chat è una riga vuota: MySQL genera l'id da solo.
    $statement = $connection->prepare('INSERT INTO chat() VALUES()');
    $statement->execute();
    $chatId = (int) $connection->lastInsertId();

    // 2. I due partecipanti vengono aggiunti con una query sola e 2 parametri.
    $statement = $connection->prepare(
        'INSERT INTO partecipanti_chat (id_chat, id_utente)
         VALUES (:chat, :utente1), (:chat, :utente2)'
    );
    $statement->bindValue(':chat', $chatId, PDO::PARAM_INT);
    $statement->bindValue(':utente1', $utenteAttuale, PDO::PARAM_INT);
    $statement->bindValue(':utente2', $membroChat, PDO::PARAM_INT);
    $statement->execute();

    return $chatId;
}
