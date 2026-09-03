<?php

declare(strict_types=1);

// L'endpoint restituisce sempre risposte JSON.
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/DbConnector.php';
require_once __DIR__ . '/TokenManager.php';

// Il mese dell'invito deve seguire il fuso orario italiano.
date_default_timezone_set('Europe/Rome');

// Entrambe le azioni modificano il database, quindi accettiamo solo POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['errore' => 'Metodo non consentito. Usa POST.']);
    exit;
}

// Controlla che sia presente un Bearer token valido.
$tokenManager = new TokenManager();
$headerAutorizzazione = $tokenManager->getAuthorizationHeader();

if (!is_string($headerAutorizzazione) || !preg_match('/^Bearer\s+(\S+)$/i', $headerAutorizzazione, $parti)) {
    http_response_code(401);
    echo json_encode(['errore' => 'Autenticazione richiesta.']);
    exit;
}

$token = $parti[1];

if (!$tokenManager->validate($token)) {
    http_response_code(401);
    echo json_encode(['errore' => 'Token non valido o scaduto.']);
    exit;
}

// L'id dell'utente non arriva dal client: viene letto dal token firmato.
$utenteId = $tokenManager->extractUserID($token);

// Il corpo deve indicare quale operazione eseguire.
$dati = json_decode(file_get_contents('php://input'), true);

if (!is_array($dati) || !isset($dati['azione']) || !is_string($dati['azione'])) {
    http_response_code(400);
    echo json_encode(['errore' => 'Inserisci una azione valida: genera oppure riscatta.']);
    exit;
}

$azione = strtolower(trim($dati['azione']));

if ($azione !== 'genera' && $azione !== 'riscatta') {
    http_response_code(400);
    echo json_encode(['errore' => 'Azione non valida. Usa genera oppure riscatta.']);
    exit;
}

// mese_invito salva sempre il primo giorno del mese corrente, per esempio 2026-08-01.
$meseCorrente = date('Y-m-01');

try {
    $db = new DbConnector('localhost', 'root', '', 'barattolo');

    // Un utente sospeso o bloccato non può generare né riscattare inviti.
    $stmt = $db->prepare(
        'SELECT id
         FROM utenti
         WHERE id = :utente_id AND stato = "ATTIVO"'
    );
    $stmt->bindValue(':utente_id', $utenteId, PDO::PARAM_INT);
    $stmt->execute();

    if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
        http_response_code(401);
        echo json_encode(['errore' => 'Utente non attivo.']);
        exit;
    }

    if ($azione === 'genera') {
        // Se il codice del mese esiste già, lo restituiamo senza crearne un secondo.
        $stmt = $db->prepare(
            'SELECT codice, mese_invito
             FROM inviti
             WHERE invitante_id = :invitante_id AND mese_invito = :mese_invito'
        );
        $stmt->bindValue(':invitante_id', $utenteId, PDO::PARAM_INT);
        $stmt->bindValue(':mese_invito', $meseCorrente, PDO::PARAM_STR);
        $stmt->execute();
        $invitoEsistente = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($invitoEsistente) {
            echo json_encode([
                'messaggio' => 'Hai già un codice valido per questo mese.',
                'codice' => $invitoEsistente['codice'],
                'mese_invito' => $invitoEsistente['mese_invito'],
            ]);
            exit;
        }

        // La probabilità di collisione è molto bassa; riproviamo comunque fino a 5 volte.
        for ($tentativo = 0; $tentativo < 5; $tentativo++) {
            $codice = generaCodiceInvito();

            try {
                $stmt = $db->prepare(
                    'INSERT INTO inviti (invitante_id, codice, mese_invito)
                     VALUES (:invitante_id, :codice, :mese_invito)'
                );
                $stmt->bindValue(':invitante_id', $utenteId, PDO::PARAM_INT);
                $stmt->bindValue(':codice', $codice, PDO::PARAM_STR);
                $stmt->bindValue(':mese_invito', $meseCorrente, PDO::PARAM_STR);
                $stmt->execute();

                http_response_code(201);
                echo json_encode([
                    'messaggio' => 'Codice invito generato con successo.',
                    'codice' => $codice,
                    'mese_invito' => $meseCorrente,
                ]);
                exit;
            } catch (PDOException $e) {
                // Un'altra richiesta potrebbe aver creato il codice mensile nello stesso istante.
                $stmt = $db->prepare(
                    'SELECT codice, mese_invito
                     FROM inviti
                     WHERE invitante_id = :invitante_id AND mese_invito = :mese_invito'
                );
                $stmt->bindValue(':invitante_id', $utenteId, PDO::PARAM_INT);
                $stmt->bindValue(':mese_invito', $meseCorrente, PDO::PARAM_STR);
                $stmt->execute();
                $invitoEsistente = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($invitoEsistente) {
                    echo json_encode([
                        'messaggio' => 'Hai già un codice valido per questo mese.',
                        'codice' => $invitoEsistente['codice'],
                        'mese_invito' => $invitoEsistente['mese_invito'],
                    ]);
                    exit;
                }

                // Se non esiste un invito mensile, la collisione può riguardare solo il codice: riproviamo.
                if ($tentativo === 4) {
                    throw $e;
                }
            }
        }
    }

    // Da qui in poi l'azione è "riscatta".
    $codice = isset($dati['codice']) && is_string($dati['codice'])
        ? strtoupper(trim($dati['codice']))
        : '';

    if (!preg_match('/^[A-Z0-9]{8}$/', $codice)) {
        http_response_code(400);
        echo json_encode(['errore' => 'Il codice deve contenere 8 lettere maiuscole o numeri.']);
        exit;
    }

    try {
        // Questa singola query aggiorna invito e saldo insieme: i 10 crediti non possono essere assegnati due volte.
        $stmt = $db->prepare(
            'UPDATE inviti i
             INNER JOIN utenti invitante
                ON invitante.id = i.invitante_id AND invitante.stato = "ATTIVO"
             SET i.invitato_id = :utente_id_assegnato,
                 i.riscattato_il = CURRENT_TIMESTAMP,
                 invitante.saldo_disponibile = invitante.saldo_disponibile + 10
             WHERE i.codice = :codice
               AND i.invitato_id IS NULL
               AND i.mese_invito = :mese_invito
               AND i.invitante_id <> :utente_id_confronto'
        );
        // I parametri hanno nomi diversi perché PDO non riutilizza lo stesso placeholder in una query nativa.
        $stmt->bindValue(':utente_id_assegnato', $utenteId, PDO::PARAM_INT);
        $stmt->bindValue(':codice', $codice, PDO::PARAM_STR);
        $stmt->bindValue(':mese_invito', $meseCorrente, PDO::PARAM_STR);
        $stmt->bindValue(':utente_id_confronto', $utenteId, PDO::PARAM_INT);
        $stmt->execute();
    } catch (PDOException $e) {
        // Il vincolo univoco su invitato_id indica che questo utente ha già riscattato un altro invito.
        if ($e->getCode() === '23000') {
            http_response_code(409);
            echo json_encode(['errore' => 'Hai già riscattato un codice invito.']);
            exit;
        }

        throw $e;
    }

    if ($stmt->rowCount() === 0) {
        http_response_code(409);
        echo json_encode(['errore' => 'Codice non valido, scaduto, già usato o non utilizzabile dal tuo account.']);
        exit;
    }

    echo json_encode([
        'messaggio' => 'Codice riscattato. L’invitante ha ricevuto 10 crediti.',
    ]);
} catch (PDOException $e) {
    // Non inviamo al client dettagli tecnici del database.
    http_response_code(500);
    echo json_encode(['errore' => 'Errore durante la gestione dell’invito.']);
}

/**
 * Crea un codice casuale di otto caratteri nel formato richiesto dal database.
 */
function generaCodiceInvito(): string
{
    $caratteri = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $codice = '';

    for ($i = 0; $i < 8; $i++) {
        $codice .= $caratteri[random_int(0, strlen($caratteri) - 1)];
    }

    return $codice;
}
