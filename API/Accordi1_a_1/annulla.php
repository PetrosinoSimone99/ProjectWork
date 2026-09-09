<?php

declare(strict_types=1);

require_once __DIR__ . '/funzioni_comuni.php';

richiediMetodo('POST');

$db = creaDatabase();
$idUtente = autenticaUtente($db);
$idAccordo = leggiInteroPositivo(leggiCorpoJson(), 'id_accordo');
$transazioneAvviata = false;

try {
    iniziaTransazione($db);
    $transazioneAvviata = true;

    $accordo = caricaAccordo($db, $idAccordo, true);
    if ($accordo === false) {
        lanciaErrore(404, 'Accordo non trovato.');
    }

    if (caricaPartecipazione($db, $idAccordo, $idUtente) === false) {
        lanciaErrore(403, 'Non partecipi a questo accordo.');
    }

    if (!in_array($accordo['stato'], ['PROPOSTO', 'ACCETTATO'], true)) {
        lanciaErrore(409, 'L accordo non puo essere annullato nello stato attuale.');
    }

    $aggiorna = $db->prepare(
        "UPDATE accordi_1_a_1
         SET stato = 'ANNULLATO', data_fine = CURRENT_TIMESTAMP
         WHERE id = :id"
    );
    eseguiQuery($aggiorna, ['id' => $idAccordo]);

    confermaTransazione($db);
    $transazioneAvviata = false;

    rispostaJson(200, true, 'Accordo annullato correttamente.', [
        'id_accordo' => $idAccordo,
        'stato' => 'ANNULLATO',
    ]);
} catch (Throwable $errore) {
    gestisciErroreEndpoint($db, $transazioneAvviata, $errore);
}
