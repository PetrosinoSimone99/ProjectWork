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

    if ($accordo['stato'] !== 'ACCETTATO') {
        lanciaErrore(409, 'Soltanto un accordo ACCETTATO puo essere avviato.');
    }

    // Ricontrolliamo il numero dei partecipanti e le accettazioni: lo stato da
    // solo non deve essere sufficiente se i dati fossero incoerenti.
    $conta = $db->prepare(
        'SELECT COUNT(*) AS totale,
                SUM(CASE WHEN accettazione = 1 THEN 1 ELSE 0 END) AS accettati
         FROM partecipanti_accordo_1_a_1
         WHERE id_accordo = :id_accordo'
    );
    eseguiQuery($conta, ['id_accordo' => $idAccordo]);
    $conteggio = $conta->fetch(PDO::FETCH_ASSOC);

    if ((int) $conteggio['totale'] !== 2 || (int) $conteggio['accettati'] !== 2) {
        lanciaErrore(409, 'Entrambi i partecipanti devono avere accettato.');
    }

    $aggiorna = $db->prepare(
        "UPDATE accordi_1_a_1
         SET stato = 'IN_ESECUZIONE', data_inizio = CURRENT_TIMESTAMP
         WHERE id = :id"
    );
    eseguiQuery($aggiorna, ['id' => $idAccordo]);

    confermaTransazione($db);
    $transazioneAvviata = false;

    rispostaJson(200, true, 'Accordo avviato correttamente.', [
        'id_accordo' => $idAccordo,
        'stato' => 'IN_ESECUZIONE',
    ]);
} catch (Throwable $errore) {
    gestisciErroreEndpoint($db, $transazioneAvviata, $errore);
}
