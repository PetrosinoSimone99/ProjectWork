<?php

require_once __DIR__ . '/../cors.php'; // Header CORS + risposta 204 al preflight OPTIONS.
require_once __DIR__ . '/../TokenManager.php';
require_once __DIR__ . '/sseConfig.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['errore' => 'Metodo non consentito. Usa GET.']);
    exit;
}

$tokenManager = new TokenManager();
$token = $tokenManager->getBearerToken();

// Token mancante o malformato: validate() pretende una stringa, quindi il
// controllo va fatto prima di chiamarlo. In ogni caso la risposta è 401.
if (!is_string($token) || !$tokenManager->validate($token)) {
    http_response_code(401);
    echo json_encode(['errore' => 'Token non valido o scaduto.']);
    exit;
}

$utente = $tokenManager->extractUserID($token);
$randomString = bin2hex(random_bytes(5));

$tokenSSE = creaTokenSSE($utente, $randomString);

echo json_encode($randomString . '.' . $tokenSSE);

function creaTokenSSE($utente, $randomString)
{
    $firma = hash_hmac('sha512', $utente . $randomString, sseSecret());

    return $firma;
}
