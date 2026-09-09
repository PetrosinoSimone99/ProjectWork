<?php

declare(strict_types=1);

require_once __DIR__ . '/funzioni_comuni.php';

richiediMetodo('POST');

$db = creaDatabase();
$idUtente = autenticaUtente($db);
$dati = leggiCorpoJson();

$idAltroUtente = leggiInteroPositivo($dati, 'id_altro_utente');
$durataMia = leggiInteroPositivo($dati, 'durata_mia');
$durataAltro = leggiInteroPositivo($dati, 'durata_altro');

if ($idAltroUtente === $idUtente) {
    rispostaErrore(400, 'Non puoi creare un accordo con te stesso.');
}

// Prima della transazione controlliamo che il secondo utente esista e possa
// partecipare. L'utente autenticato e' gia' stato controllato dall'helper.
$queryUtente = $db->prepare('SELECT id, stato FROM utenti WHERE id = :id');
eseguiQuery($queryUtente, ['id' => $idAltroUtente]);
$altroUtente = $queryUtente->fetch(PDO::FETCH_ASSOC);

if ($altroUtente === false) {
    rispostaErrore(404, 'L altro utente non esiste.');
}

if ($altroUtente['stato'] !== 'ATTIVO') {
    rispostaErrore(409, 'L altro utente non e attivo.');
}

$transazioneAvviata = false;

try {
    iniziaTransazione($db);
    $transazioneAvviata = true;

    // Lo stato iniziale e' PROPOSTO. Come concordato, nessuno dei due utenti
    // risulta automaticamente accettato.
    $inserisciAccordo = $db->prepare(
        "INSERT INTO accordi_1_a_1 (stato) VALUES ('PROPOSTO')"
    );
    eseguiQuery($inserisciAccordo);
    $idAccordo = (int) $db->lastInsertId();

    $inserisciPartecipante = $db->prepare(
        'INSERT INTO partecipanti_accordo_1_a_1
            (id_accordo, id_utente, durata_attivita, accettazione, completamento)
         VALUES
            (:id_accordo, :id_utente, :durata_attivita, 0, 0)'
    );

    // Inseriamo prima il proponente e poi l'altro utente usando la stessa query.
    eseguiQuery($inserisciPartecipante, [
        'id_accordo' => $idAccordo,
        'id_utente' => $idUtente,
        'durata_attivita' => $durataMia,
    ]);
    eseguiQuery($inserisciPartecipante, [
        'id_accordo' => $idAccordo,
        'id_utente' => $idAltroUtente,
        'durata_attivita' => $durataAltro,
    ]);

    confermaTransazione($db);
    $transazioneAvviata = false;

    rispostaJson(201, true, 'Accordo creato correttamente.', [
        'id_accordo' => $idAccordo,
        'stato' => 'PROPOSTO',
    ]);
} catch (Throwable $errore) {
    gestisciErroreEndpoint($db, $transazioneAvviata, $errore);
}
