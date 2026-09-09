<?php

declare(strict_types=1);

require_once __DIR__ . '/funzioni_comuni.php';

richiediMetodo('GET');

$db = creaDatabase();
$idUtente = autenticaUtente($db);

try {
    // Il JOIN limita direttamente il risultato agli accordi dell'utente.
    $query = $db->prepare(
        'SELECT a.id, a.data_creazione, a.data_inizio, a.data_fine, a.stato
         FROM accordi_1_a_1 a
         INNER JOIN partecipanti_accordo_1_a_1 p ON p.id_accordo = a.id
         WHERE p.id_utente = :id_utente
         ORDER BY a.data_creazione DESC, a.id DESC'
    );
    eseguiQuery($query, ['id_utente' => $idUtente]);
    $accordi = $query->fetchAll(PDO::FETCH_ASSOC);

    // Per mantenere il codice semplice, carichiamo i partecipanti accordo per
    // accordo. Per un progetto didattico questo e' piu' facile da comprendere.
    foreach ($accordi as &$accordo) {
        $accordo = preparaAccordoPerJson($accordo);
        $accordo['partecipanti'] = caricaPartecipanti($db, $accordo['id']);
    }
    unset($accordo);

    rispostaJson(200, true, 'Accordi recuperati correttamente.', $accordi);
} catch (Throwable $errore) {
    gestisciErroreEndpoint($db, false, $errore);
}
