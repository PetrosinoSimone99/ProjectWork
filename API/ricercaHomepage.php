<?php

declare(strict_types=1);

// Questo endpoint restituisce sempre una risposta in formato JSON.
header('Content-Type: application/json; charset=utf-8');

// Usiamo le classi del progetto per il database e per controllare il token.
require_once __DIR__ . '/DbConnector.php';
require_once __DIR__ . '/TokenManager.php';

// La homepage deve solo leggere i dati, quindi accettiamo esclusivamente GET.
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['errore' => 'Metodo non consentito. Usa GET.']);
    exit;
}

// Il client deve inviare l'header nel formato:
// Authorization: Bearer IL_TOKEN_DELL_UTENTE
$tokenManager = new TokenManager();
$headerAutorizzazione = $tokenManager->getAuthorizationHeader();

// Controlliamo prima che il token sia presente e scritto nel formato corretto.
if (!is_string($headerAutorizzazione) || !preg_match('/^Bearer\s+(\S+)$/i', $headerAutorizzazione, $parti)) {
    http_response_code(401);
    echo json_encode(['errore' => 'Autenticazione richiesta.']);
    exit;
}

$token = $parti[1];

// validate() controlla la firma e la data di scadenza del token.
if (!$tokenManager->validate($token)) {
    http_response_code(401);
    echo json_encode(['errore' => 'Token non valido o scaduto.']);
    exit;
}

try {
    // Creiamo il collegamento al database usando la classe già presente nel progetto.
    $db = new DbConnector('localhost', 'root', '', 'barattolo');

    // Recuperiamo tutte le richieste della homepage. L'unico filtro serve per
    // mostrare solo annunci pubblicati da utenti con stato ATTIVO.
    $stmt = $db->prepare(
        'SELECT
            r.id,
            r.utente_id,
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
         ORDER BY r.creato_il DESC'
    );
    $stmt->execute();

    // fetchAll restituisce un array vuoto se non ci sono richieste da mostrare.
    $risultati = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // PDO può restituire i numeri come stringhe. Li convertiamo per inviare
    // un JSON più chiaro e coerente al frontend.
    foreach ($risultati as &$risultato) {
        $risultato['id'] = (int) $risultato['id'];
        $risultato['utente_id'] = (int) $risultato['utente_id'];

        // Tariffa e durata sono facoltative nel database, quindi convertiamo
        // il valore soltanto quando non sono NULL.
        if ($risultato['tariffa_oraria_crediti'] !== null) {
            $risultato['tariffa_oraria_crediti'] = (int) $risultato['tariffa_oraria_crediti'];
        }

        if ($risultato['durata_minuti'] !== null) {
            $risultato['durata_minuti'] = (int) $risultato['durata_minuti'];
        }
    }
    unset($risultato);

    echo json_encode([
        'messaggio' => 'Richieste della homepage caricate con successo.',
        'numero_risultati' => count($risultati),
        'risultati' => $risultati,
    ]);
} catch (PDOException $e) {
    // Non inviamo il dettaglio dell'errore al client per ragioni di sicurezza.
    http_response_code(500);
    echo json_encode(['errore' => 'Errore durante il caricamento delle richieste.']);
}
