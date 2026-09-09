<?php

declare(strict_types=1);

require_once __DIR__ . '/funzioni_comuni.php';

richiediMetodo('GET');

$db = creaDatabase();
$idUtente = autenticaUtente($db);
$idAccordo = leggiIdDaQueryString('id_accordo');

try {
    $accordo = caricaAccordo($db, $idAccordo);

    if ($accordo === false) {
        lanciaErrore(404, 'Accordo non trovato.');
    }

    // Con un controllo separato distinguiamo un accordo inesistente da uno al
    // quale l'utente non e' autorizzato ad accedere.
    if (caricaPartecipazione($db, $idAccordo, $idUtente) === false) {
        lanciaErrore(403, 'Non partecipi a questo accordo.');
    }

    $accordo = preparaAccordoPerJson($accordo);
    $accordo['partecipanti'] = caricaPartecipanti($db, $idAccordo);

    rispostaJson(200, true, 'Accordo recuperato correttamente.', $accordo);
} catch (Throwable $errore) {
    gestisciErroreEndpoint($db, false, $errore);
}
