<?php

require_once __DIR__ . '/../cors.php'; // Header CORS + risposta 204 al preflight OPTIONS.
require_once __DIR__ . '/../DbConnector.php';
require_once __DIR__ . '/../TokenManager.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['errore' => 'Metodo non consentito. Usa GET.']);
    exit;
}

// utente è l'id dell'utente di cui si cerca il messaggio più recente: intero positivo.
if (!isset($_GET['utente']) || !ctype_digit((string) $_GET['utente']) || (int) $_GET['utente'] <= 0) {
    http_response_code(400);
    echo json_encode(['errore' => 'utente deve essere un intero positivo.']);
    exit;
}
$utente = (int) $_GET['utente'];

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

    // Nessun messaggio finora (es. utente appena registrato) non è un errore:
    // si risponde 200 con id null e il client usa 0 come base.
    $idMessaggio = getMostRecentMessage($connection, $utente);
    echo json_encode(['id' => $idMessaggio]);
} catch (PDOException $e) {
    // Mai dettagli tecnici al client: solo lo status 500.
    http_response_code(500);
    echo json_encode(['errore' => 'Errore durante la ricerca del messaggio più recente.']);
}

function getMostRecentMessage(DbConnector $connection, int $utente): ?int
{
    $statement = $connection->prepare('
        SELECT id
        FROM messaggi_chat
        WHERE id_chat IN (SELECT DISTINCT id_chat FROM partecipanti_chat WHERE id_utente = :utente)
        ORDER BY id DESC
        LIMIT 1
    ');
    $statement->bindValue(':utente', $utente, PDO::PARAM_INT);
    $statement->execute();
    $result = $statement->fetch(PDO::FETCH_ASSOC);

    return $result ? (int) $result['id'] : null;
}
