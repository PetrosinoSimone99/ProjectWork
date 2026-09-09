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

    // Il blocco impedisce che due accettazioni contemporanee aggiornino lo
    // stato basandosi su dati non piu' aggiornati.
    $accordo = caricaAccordo($db, $idAccordo, true);

    if ($accordo === false) {
        lanciaErrore(404, 'Accordo non trovato.');
    }

    $partecipazione = caricaPartecipazione($db, $idAccordo, $idUtente);
    if ($partecipazione === false) {
        lanciaErrore(403, 'Non partecipi a questo accordo.');
    }

    if ($accordo['stato'] !== 'PROPOSTO') {
        lanciaErrore(409, 'L accordo non e piu in stato PROPOSTO.');
    }

    $aggiorna = $db->prepare(
        'UPDATE partecipanti_accordo_1_a_1
         SET accettazione = 1
         WHERE id_accordo = :id_accordo AND id_utente = :id_utente'
    );
    eseguiQuery($aggiorna, [
        'id_accordo' => $idAccordo,
        'id_utente' => $idUtente,
    ]);

    $conta = $db->prepare(
        'SELECT COUNT(*) AS totale,
                SUM(CASE WHEN accettazione = 1 THEN 1 ELSE 0 END) AS accettati
         FROM partecipanti_accordo_1_a_1
         WHERE id_accordo = :id_accordo'
    );
    eseguiQuery($conta, ['id_accordo' => $idAccordo]);
    $conteggio = $conta->fetch(PDO::FETCH_ASSOC);

    if ((int) $conteggio['totale'] !== 2) {
        lanciaErrore(409, 'L accordo non contiene esattamente due partecipanti.');
    }

    $nuovoStato = 'PROPOSTO';
    if ((int) $conteggio['accettati'] === 2) {
        $cambiaStato = $db->prepare(
            "UPDATE accordi_1_a_1 SET stato = 'ACCETTATO' WHERE id = :id"
        );
        eseguiQuery($cambiaStato, ['id' => $idAccordo]);
        $nuovoStato = 'ACCETTATO';
    }

    confermaTransazione($db);
    $transazioneAvviata = false;

    rispostaJson(200, true, 'Accettazione registrata correttamente.', [
        'id_accordo' => $idAccordo,
        'stato' => $nuovoStato,
    ]);
} catch (Throwable $errore) {
    gestisciErroreEndpoint($db, $transazioneAvviata, $errore);
}
