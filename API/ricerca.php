<?php

declare(strict_types=1);

// L'endpoint restituisce sempre risposte JSON.
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/DbConnector.php';
require_once __DIR__ . '/TokenManager.php';

// La ricerca usa il metodo GET, ad esempio: ricerca.php?q=matematica
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['errore' => 'Metodo non consentito. Usa GET.']);
    exit;
}

// Prima di cercare controlliamo che l'utente abbia inviato un Bearer token.
$tokenManager = new TokenManager();
$headerAutorizzazione = $tokenManager->getAuthorizationHeader();

if (!is_string($headerAutorizzazione) || !preg_match('/^Bearer\s+(\S+)$/i', $headerAutorizzazione, $parti)) {
    // il regex cerca bearer case insensitive con spazi vuoti dopo Bearer ammessi
    http_response_code(401);
    echo json_encode(['errore' => 'Autenticazione richiesta.']);
    exit;
}

$token = $parti[1];

// TokenManager controlla firma e scadenza del token.
if (!$tokenManager->validate($token)) {
    http_response_code(401);
    echo json_encode(['errore' => 'Token non valido o scaduto.']);
    exit;
}

// q contiene la parola o la frase che l'utente vuole cercare.
$ricerca = isset($_GET['q']) && is_string($_GET['q']) ? trim($_GET['q']) : '';

if ($ricerca === '') {
    http_response_code(400);
    echo json_encode(['errore' => 'Il parametro q è obbligatorio.']);
    exit;
}

try {
    // DbConnector prepara query parametrizzate e protegge dai valori SQL inseriti dall'utente.
    $db = new DbConnector('localhost', 'root', '', 'barattolo');
    $testoRicerca = '%' . $ricerca . '%';

    // Cerca nei servizi descritti direttamente nel profilo degli utenti attivi.
    $stmt = $db->prepare(
        'SELECT
            "SERVIZIO_PROFILO" AS tipo,
            u.id AS utente_id,
            u.username,
            u.nome,
            u.cognome,
            u.descrizione_servizio AS titolo,
            u.descrizione_servizio AS descrizione,
            NULL AS localita,
            NULL AS tariffa_oraria_crediti,
            NULL AS durata_minuti,
            u.creato_il
         FROM utenti u
         WHERE u.stato = "ATTIVO"
           AND u.descrizione_servizio LIKE :ricerca'
    );
    $stmt->bindValue(':ricerca', $testoRicerca, PDO::PARAM_STR);
    $stmt->execute();
    $risultati = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Cerca nelle richieste pubblicate, controllando anche il titolo e la località.
    $stmt = $db->prepare(
        'SELECT
            "RICHIESTA" AS tipo,
            u.id AS utente_id,
            u.username,
            u.nome,
            u.cognome,
            r.titolo,
            r.descrizione,
            r.localita,
            r.tariffa_oraria_crediti,
            r.durata_minuti,
            r.creato_il
         FROM richieste r
         INNER JOIN utenti u ON u.id = r.utente_id
         WHERE u.stato = "ATTIVO"
           AND (
                r.titolo LIKE :titolo
                OR r.descrizione LIKE :descrizione
                OR r.localita LIKE :localita
           )'
    );
    // Usiamo tre parametri distinti per funzionare anche con PDO in modalità nativa.
    $stmt->bindValue(':titolo', $testoRicerca, PDO::PARAM_STR);
    $stmt->bindValue(':descrizione', $testoRicerca, PDO::PARAM_STR);
    $stmt->bindValue(':localita', $testoRicerca, PDO::PARAM_STR);
    $stmt->execute();
    $risultati = array_merge($risultati, $stmt->fetchAll(PDO::FETCH_ASSOC));

    // Mostra prima i servizi pubblicati più recentemente.
    usort($risultati, static function (array $primo, array $secondo): int {
        return strcmp((string) $secondo['creato_il'], (string) $primo['creato_il']);
    });

    // Restituisce solo dati pubblici utili per scegliere un servizio.
    foreach ($risultati as &$risultato) {
        $risultato['utente_id'] = (int) $risultato['utente_id'];
        if ($risultato['tariffa_oraria_crediti'] !== null) {
            $risultato['tariffa_oraria_crediti'] = (int) $risultato['tariffa_oraria_crediti'];
        }
        if ($risultato['durata_minuti'] !== null) {
            $risultato['durata_minuti'] = (int) $risultato['durata_minuti'];
        }
    }
    unset($risultato);

    echo json_encode([
        'messaggio' => 'Ricerca completata.',
        'ricerca' => $ricerca,
        'numero_risultati' => count($risultati),
        'risultati' => $risultati,
    ]);
} catch (PDOException $e) {
    // Non mostriamo al client i dettagli tecnici del database.
    http_response_code(500);
    echo json_encode(['errore' => 'Errore durante la ricerca.']);
}
