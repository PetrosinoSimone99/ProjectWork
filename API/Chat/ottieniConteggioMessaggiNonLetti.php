<?php

require_once __DIR__ . '/../cors.php'; // Header CORS + risposta 204 al preflight OPTIONS.
require_once __DIR__ . '/../DbConnector.php';
require_once __DIR__ . '/../TokenManager.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['errore' => 'Metodo non consentito. Usa GET.']);
    exit;
}

// Validazione a monte (fail fast): evita query inutili su input malformati.
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

    // ottieniConteggioMessaggiNonLetti ritorna sempre un array (anche vuoto): nessun
    // messaggio non letto è un caso normale, non un errore.
    $conteggio = ottieniConteggioMessaggiNonLetti($connection, $utente);
    echo json_encode($conteggio);
} catch (PDOException $e) {
    // Mai dettagli tecnici al client: solo lo status 500.
    http_response_code(500);
    echo json_encode(['errore' => 'Impossibile calcolare il conteggio.']);
}

function ottieniConteggioMessaggiNonLetti(DbConnector $connection, int $utente): array
{
    $statement = $connection->prepare('
        SELECT msg.id_utente, COUNT(msg.id) as "conteggio"
        FROM partecipanti_chat as pm JOIN messaggi_chat as msg ON pm.id_chat = msg.id_chat
        WHERE pm.id_utente = :utente AND msg.id > pm.id_ultimo_messaggio_letto AND msg.id_utente != :utente
        GROUP BY msg.id_utente
    ');
    $statement->bindValue(':utente', $utente, PDO::PARAM_INT);
    $statement->execute();

    return $statement->fetchAll(PDO::FETCH_ASSOC);
}
