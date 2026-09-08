<?php

require_once __DIR__ . '/../cors.php'; // Header CORS + risposta 204 al preflight OPTIONS.
require_once __DIR__ . '/../DbConnector.php';
require_once __DIR__ . '/../TokenManager.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['errore' => 'Metodo non consentito. Usa GET.']);
    exit;
}

// Normalizza il puntatore "ultimo messaggio letto": assente o non numerico => 0
// (0 = "nessun messaggio letto finora": qualsiasi id > 0 è non letto).
$ultimoMessaggioLetto = isset($_GET['ultimoMessaggioLetto'])
    && ctype_digit((string) $_GET['ultimoMessaggioLetto'])
    ? (int) $_GET['ultimoMessaggioLetto']
    : 0;

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

    // getUnreadMessagesCount ritorna sempre un array (anche vuoto): nessun
    // messaggio non letto è un caso normale, non un errore.
    $conteggio = getUnreadMessagesCount($connection, $utente, $ultimoMessaggioLetto);
    echo json_encode($conteggio);
} catch (PDOException $e) {
    // Mai dettagli tecnici al client: solo lo status 500.
    http_response_code(500);
    echo json_encode(['errore' => 'Impossibile calcolare il conteggio.']);
}

function getUnreadMessagesCount(DbConnector $connection, int $utente, int $ultimoMessaggioLetto): array
{
    $statement = $connection->prepare('
        SELECT utenti.username, COUNT(mc.id) AS "conteggio"
        FROM messaggi_chat AS mc
        JOIN utenti ON mc.id_utente = utenti.id
        WHERE mc.id > :ultimoMessaggioLetto
          AND mc.id_utente != :utente
          AND mc.id_chat IN (
            SELECT pc.id_chat FROM partecipanti_chat AS pc WHERE pc.id_utente = :utente
          )
        GROUP BY mc.id_utente
    ');
    $statement->bindValue(':utente', $utente, PDO::PARAM_INT);
    $statement->bindValue(':ultimoMessaggioLetto', $ultimoMessaggioLetto, PDO::PARAM_INT);
    $statement->execute();

    return $statement->fetchAll(PDO::FETCH_ASSOC);
}
