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

    // Questa riga viene bloccata fino al COMMIT. Due richieste contemporanee
    // non possono quindi assegnare due volte i crediti dello stesso accordo.
    $accordo = caricaAccordo($db, $idAccordo, true);
    if ($accordo === false) {
        lanciaErrore(404, 'Accordo non trovato.');
    }

    if (caricaPartecipazione($db, $idAccordo, $idUtente) === false) {
        lanciaErrore(403, 'Non partecipi a questo accordo.');
    }

    // Rendiamo idempotente la ripetizione della richiesta: se l'accordo e'
    // gia' concluso rispondiamo senza toccare nuovamente i saldi.
    if ($accordo['stato'] === 'COMPLETATO') {
        confermaTransazione($db);
        $transazioneAvviata = false;

        rispostaJson(200, true, 'L accordo era gia stato completato.', [
            'id_accordo' => $idAccordo,
            'stato' => 'COMPLETATO',
            'crediti_assegnati_ora' => false,
        ]);
    }

    if ($accordo['stato'] !== 'IN_ESECUZIONE') {
        lanciaErrore(409, 'Soltanto un accordo IN_ESECUZIONE puo essere completato.');
    }

    $confermaUtente = $db->prepare(
        'UPDATE partecipanti_accordo_1_a_1
         SET completamento = 1
         WHERE id_accordo = :id_accordo AND id_utente = :id_utente'
    );
    eseguiQuery($confermaUtente, [
        'id_accordo' => $idAccordo,
        'id_utente' => $idUtente,
    ]);

    $conta = $db->prepare(
        'SELECT COUNT(*) AS totale,
                SUM(CASE WHEN completamento = 1 THEN 1 ELSE 0 END) AS completati
         FROM partecipanti_accordo_1_a_1
         WHERE id_accordo = :id_accordo'
    );
    eseguiQuery($conta, ['id_accordo' => $idAccordo]);
    $conteggio = $conta->fetch(PDO::FETCH_ASSOC);

    if ((int) $conteggio['totale'] !== 2) {
        lanciaErrore(409, 'L accordo non contiene esattamente due partecipanti.');
    }

    $nuovoStato = 'IN_ESECUZIONE';
    $creditiAssegnati = false;

    if ((int) $conteggio['completati'] === 2) {
        // Entrambi hanno confermato: accreditiamo 10 crediti a ognuno. Questa
        // query e il cambio di stato fanno parte della stessa transazione.
        $accredita = $db->prepare(
            'UPDATE utenti u
             INNER JOIN partecipanti_accordo_1_a_1 p ON p.id_utente = u.id
             SET u.saldo_disponibile = u.saldo_disponibile + 10
             WHERE p.id_accordo = :id_accordo'
        );
        eseguiQuery($accredita, ['id_accordo' => $idAccordo]);

        if ($accredita->rowCount() !== 2) {
            throw new RuntimeException('Non e stato possibile accreditare entrambi i partecipanti.');
        }

        $chiudiAccordo = $db->prepare(
            "UPDATE accordi_1_a_1
             SET stato = 'COMPLETATO', data_fine = CURRENT_TIMESTAMP
             WHERE id = :id"
        );
        eseguiQuery($chiudiAccordo, ['id' => $idAccordo]);

        $nuovoStato = 'COMPLETATO';
        $creditiAssegnati = true;
    }

    confermaTransazione($db);
    $transazioneAvviata = false;

    rispostaJson(200, true, 'Conferma di completamento registrata.', [
        'id_accordo' => $idAccordo,
        'stato' => $nuovoStato,
        'crediti_assegnati_ora' => $creditiAssegnati,
    ]);
} catch (Throwable $errore) {
    gestisciErroreEndpoint($db, $transazioneAvviata, $errore);
}
