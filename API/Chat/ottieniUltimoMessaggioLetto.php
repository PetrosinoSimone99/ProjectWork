<?php

require_once __DIR__ . '/../cors.php'; // Header CORS + risposta 204 al preflight OPTIONS.
require_once __DIR__ . '/../DbConnector.php';
require_once __DIR__ . '/../TokenManager.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['errore' => 'Metodo non consentito. Usa GET.']);
    exit;
}

// utente è l'id dell'utente di cui si vuole il puntatore: intero positivo.
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
    $riga = ottieniUltimoMessaggioLetto($connection, $utente);

    // Nessuna riga = l'utente non esiste: 404 (la risorsa richiesta non c'è).
    if ($riga === null) {
        http_response_code(404);
        echo json_encode(['errore' => 'Utente non trovato.']);
        exit;
    }

    // Il campo può essere NULL quando l'utente non ha mai letto nulla: si
    // risponde 200 con null, non un errore.
    $ultimoMessaggioLetto = $riga['id_ultimo_messaggio_letto'] !== null
        ? (int) $riga['id_ultimo_messaggio_letto']
        : null;

    echo json_encode(['ultimoMessaggioLetto' => $ultimoMessaggioLetto]);
} catch (PDOException $e) {
    // Mai dettagli tecnici al client: solo lo status 500.
    http_response_code(500);
    echo json_encode(['errore' => 'Errore durante la lettura dell\'ultimo messaggio letto.']);
}

function ottieniUltimoMessaggioLetto(DbConnector $connection, int $utente): ?array
{
    $statement = $connection->prepare('
        SELECT id_ultimo_messaggio_letto
        FROM utenti
        WHERE id = :utente
    ');
    $statement->bindValue(':utente', $utente, PDO::PARAM_INT);
    $statement->execute();

    // false = utente inesistente (nessuna riga); il chiamante risponde 404.
    return $statement->fetch(PDO::FETCH_ASSOC) ?: null;
}
