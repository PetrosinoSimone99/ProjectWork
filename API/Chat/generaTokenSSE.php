<?php
require_once __DIR__ . '/../TokenManager.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type,authorization");

if($_SERVER["REQUEST_METHOD"] === "GET"){
    $tokenManager = new TokenManager();

    $token = $tokenManager->getBearerToken();

    if($tokenManager->validate($token)){
        $utente = $tokenManager->extractUserID($token);
        $randomString = bin2hex(random_bytes(5));

        $tokenSSE = creaTokenSSE($utente,$randomString);

        echo json_encode($randomString.".".$tokenSSE);
    }
    else{
        echo json_encode(["error" => "401 Unauthorized"]);
    }

}

function creaTokenSSE($utente, $randomString){
    $firma = hash_hmac('sha512', $utente.$randomString, 'abc123');

    return $firma;
}
?>