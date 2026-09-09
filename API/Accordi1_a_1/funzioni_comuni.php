<?php

declare(strict_types=1);

// I due file condivisi si trovano nella cartella API, cioe' un livello sopra.
require_once __DIR__ . '/../DbConnector.php';
require_once __DIR__ . '/../TokenManager.php';

// Tutti gli endpoint di questa cartella restituiscono sempre JSON.
header('Content-Type: application/json; charset=utf-8');

// Raccoglie anche gli errori inattesi che avvengono prima del try/catch di un
// endpoint, ad esempio se il database non e' raggiungibile durante il login.
set_exception_handler(function (Throwable $errore): void {
    error_log($errore->getMessage());
    rispostaErrore(500, 'Errore interno del server.');
});

/**
 * Eccezione usata per gli errori previsti dell'API.
 *
 * Separare questi errori dagli errori tecnici permette, ad esempio, di
 * restituire 409 per uno stato non valido e 500 per un problema del database.
 */
class ErroreApi extends RuntimeException
{
    public int $statoHttp;

    public function __construct(int $statoHttp, string $messaggio)
    {
        parent::__construct($messaggio);
        $this->statoHttp = $statoHttp;
    }
}

/** Crea il collegamento al database usando i valori tipici di Laragon. */
function creaDatabase(): DbConnector
{
    // DbConnector permette comunque di sostituire questi valori con le
    // variabili DB_HOST, DB_USER, DB_PASS e DB_NAME.
    return new DbConnector('localhost', 'root', '', 'barattolo');
}

/** Invia una risposta JSON e termina lo script. */
function rispostaJson(int $statoHttp, bool $successo, string $messaggio, mixed $dati = null): never
{
    http_response_code($statoHttp);

    $risposta = [
        'success' => $successo,
        'message' => $messaggio,
    ];

    // La chiave data viene aggiunta soltanto quando ci sono dati da restituire.
    if ($dati !== null) {
        $risposta['data'] = $dati;
    }

    echo json_encode($risposta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Scorciatoia per una risposta di errore prevista. */
function rispostaErrore(int $statoHttp, string $messaggio): never
{
    rispostaJson($statoHttp, false, $messaggio);
}

/** Interrompe il flusso lanciando un errore che verra' gestito dall'endpoint. */
function lanciaErrore(int $statoHttp, string $messaggio): never
{
    throw new ErroreApi($statoHttp, $messaggio);
}

/** Permette di usare ogni file soltanto con il metodo HTTP previsto. */
function richiediMetodo(string $metodoPrevisto): void
{
    $metodoRicevuto = $_SERVER['REQUEST_METHOD'] ?? '';

    if ($metodoRicevuto !== $metodoPrevisto) {
        header('Allow: ' . $metodoPrevisto);
        rispostaErrore(405, 'Metodo HTTP non consentito.');
    }
}

/** Legge il corpo JSON della richiesta e lo trasforma in un array PHP. */
function leggiCorpoJson(): array
{
    $corpo = file_get_contents('php://input');

    if ($corpo === false || trim($corpo) === '') {
        rispostaErrore(400, 'Il corpo JSON della richiesta e obbligatorio.');
    }

    try {
        $dati = json_decode($corpo, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        rispostaErrore(400, 'Il corpo della richiesta non contiene un JSON valido.');
    }

    if (!is_array($dati)) {
        rispostaErrore(400, 'Il JSON deve essere un oggetto.');
    }

    return $dati;
}

/** Estrae un intero positivo obbligatorio dal JSON. */
function leggiInteroPositivo(array $dati, string $campo): int
{
    if (!array_key_exists($campo, $dati) || !is_int($dati[$campo]) || $dati[$campo] <= 0) {
        rispostaErrore(400, "Il campo {$campo} deve essere un numero intero positivo.");
    }

    return $dati[$campo];
}

/** Legge un ID positivo dalla query string, per esempio ?id_accordo=3. */
function leggiIdDaQueryString(string $campo): int
{
    $valore = filter_input(INPUT_GET, $campo, FILTER_VALIDATE_INT);

    if ($valore === false || $valore === null || $valore <= 0) {
        rispostaErrore(400, "Il parametro {$campo} deve essere un numero intero positivo.");
    }

    return (int) $valore;
}

/**
 * Autentica la richiesta e restituisce l'ID dell'utente.
 *
 * TokenManager verifica la firma e la scadenza del token. Dopo la verifica
 * possiamo estrarre l'ID e controllare che l'utente esista e sia ATTIVO.
 */
function autenticaUtente(DbConnector $db): int
{
    $tokenManager = new TokenManager();
    $header = $tokenManager->getAuthorizationHeader();

    // Il controllo evita che getBearerToken() acceda a una parte inesistente.
    if (!is_string($header) || !str_starts_with($header, 'Bearer ')) {
        rispostaErrore(401, 'Token Bearer mancante o non valido.');
    }

    $token = trim((string) $tokenManager->getBearerToken());

    if ($token === '') {
        rispostaErrore(401, 'Token Bearer mancante o non valido.');
    }

    // TokenManager e' volutamente semplice e presume che il payload contenga
    // id ed exp. Controlliamo prima la forma del payload per evitare warning
    // PHP quando arriva un token costruito male.
    $partiToken = explode('.', $token);
    if (count($partiToken) !== 2) {
        rispostaErrore(401, 'Token non valido o scaduto.');
    }

    $payloadDecodificato = base64_decode($partiToken[1], true);
    $payload = $payloadDecodificato === false
        ? null
        : json_decode($payloadDecodificato, true);

    if (
        !is_array($payload)
        || !isset($payload['id'], $payload['exp'])
        || !is_int($payload['id'])
        || !is_int($payload['exp'])
    ) {
        rispostaErrore(401, 'Token non valido o scaduto.');
    }

    try {
        if (!$tokenManager->validate($token)) {
            rispostaErrore(401, 'Token non valido o scaduto.');
        }

        $idUtente = $tokenManager->extractUserID($token);
    } catch (Throwable) {
        // Un payload incompleto o non decodificabile viene trattato come token
        // non valido, senza mostrare dettagli tecnici al client.
        rispostaErrore(401, 'Token non valido o scaduto.');
    }

    if ($idUtente <= 0) {
        rispostaErrore(401, 'Token non valido o scaduto.');
    }

    $query = $db->prepare('SELECT id, stato FROM utenti WHERE id = :id');
    eseguiQuery($query, ['id' => $idUtente]);
    $utente = $query->fetch(PDO::FETCH_ASSOC);

    if ($utente === false) {
        rispostaErrore(401, 'Utente associato al token non trovato.');
    }

    if ($utente['stato'] !== 'ATTIVO') {
        rispostaErrore(403, 'L account utente non e attivo.');
    }

    return $idUtente;
}

/** Esegue una query controllando anche gli errori di PDO. */
function eseguiQuery(PDOStatement $query, array $parametri = []): void
{
    if (!$query->execute($parametri)) {
        $errore = $query->errorInfo();
        throw new RuntimeException($errore[2] ?? 'Errore durante l esecuzione della query.');
    }
}

/** Avvia una transazione sulla connessione conservata da DbConnector. */
function iniziaTransazione(DbConnector $db): void
{
    eseguiQuery($db->prepare('START TRANSACTION'));
}

/** Conferma tutte le modifiche effettuate nella transazione. */
function confermaTransazione(DbConnector $db): void
{
    eseguiQuery($db->prepare('COMMIT'));
}

/** Annulla la transazione; usata quando un controllo o una query falliscono. */
function annullaTransazione(DbConnector $db): void
{
    eseguiQuery($db->prepare('ROLLBACK'));
}

/** Carica un accordo; FOR UPDATE impedisce modifiche contemporanee incoerenti. */
function caricaAccordo(DbConnector $db, int $idAccordo, bool $blocca = false): array|false
{
    $sql = 'SELECT id, data_creazione, data_inizio, data_fine, stato
            FROM accordi_1_a_1
            WHERE id = :id';

    if ($blocca) {
        $sql .= ' FOR UPDATE';
    }

    $query = $db->prepare($sql);
    eseguiQuery($query, ['id' => $idAccordo]);

    return $query->fetch(PDO::FETCH_ASSOC);
}

/** Carica il record di partecipazione di un utente a un accordo. */
function caricaPartecipazione(DbConnector $db, int $idAccordo, int $idUtente): array|false
{
    $query = $db->prepare(
        'SELECT id_accordo, id_utente, durata_attivita, accettazione, completamento
         FROM partecipanti_accordo_1_a_1
         WHERE id_accordo = :id_accordo AND id_utente = :id_utente'
    );
    eseguiQuery($query, [
        'id_accordo' => $idAccordo,
        'id_utente' => $idUtente,
    ]);

    return $query->fetch(PDO::FETCH_ASSOC);
}

/** Restituisce i due partecipanti con le informazioni pubbliche essenziali. */
function caricaPartecipanti(DbConnector $db, int $idAccordo): array
{
    $query = $db->prepare(
        'SELECT p.id_utente, u.nome, u.cognome, u.username,
                u.descrizione_servizio, p.durata_attivita,
                p.accettazione, p.completamento
         FROM partecipanti_accordo_1_a_1 p
         INNER JOIN utenti u ON u.id = p.id_utente
         WHERE p.id_accordo = :id_accordo
         ORDER BY p.id_utente'
    );
    eseguiQuery($query, ['id_accordo' => $idAccordo]);

    $partecipanti = $query->fetchAll(PDO::FETCH_ASSOC);

    // PDO restituisce 0 e 1 come stringhe con alcuni driver. Convertiamo i
    // valori per ottenere booleani veri nel JSON finale.
    foreach ($partecipanti as &$partecipante) {
        $partecipante['id_utente'] = (int) $partecipante['id_utente'];
        $partecipante['durata_attivita'] = (int) $partecipante['durata_attivita'];
        $partecipante['accettazione'] = (bool) $partecipante['accettazione'];
        $partecipante['completamento'] = (bool) $partecipante['completamento'];
    }
    unset($partecipante);

    return $partecipanti;
}

/** Converte l'ID dell'accordo in intero prima di produrre il JSON. */
function preparaAccordoPerJson(array $accordo): array
{
    $accordo['id'] = (int) $accordo['id'];
    return $accordo;
}

/** Gestisce in modo uniforme gli errori avvenuti dentro una transazione. */
function gestisciErroreEndpoint(DbConnector $db, bool $transazioneAvviata, Throwable $errore): never
{
    if ($transazioneAvviata) {
        try {
            annullaTransazione($db);
        } catch (Throwable) {
            // Se anche il rollback fallisce, conserviamo comunque l'errore
            // originale e restituiamo una risposta generica al client.
        }
    }

    if ($errore instanceof ErroreApi) {
        rispostaErrore($errore->statoHttp, $errore->getMessage());
    }

    // Non esponiamo query, credenziali o dettagli interni del database.
    error_log($errore->getMessage());
    rispostaErrore(500, 'Errore interno del server.');
}
