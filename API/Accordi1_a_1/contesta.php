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

    if ($accordo['stato'] !== 'IN_ESECUZIONE') {
        lanciaErrore(409, 'Soltanto un accordo IN_ESECUZIONE puo essere contestato.');
    }

    // Una contestazione non assegna crediti e non imposta data_fine: potra'
    // essere gestita in futuro da una specifica funzionalita' amministrativa.
    $aggiorna = $db->prepare(
        "UPDATE accordi_1_a_1 SET stato = 'CONTESTATO' WHERE id = :id"
    );
    eseguiQuery($aggiorna, ['id' => $idAccordo]);

    confermaTransazione($db);
    $transazioneAvviata = false;

    rispostaJson(200, true, 'Accordo contestato correttamente.', [
        'id_accordo' => $idAccordo,
        'stato' => 'CONTESTATO',
    ]);
} catch (Throwable $errore) {
    gestisciErroreEndpoint($db, $transazioneAvviata, $errore);
}
