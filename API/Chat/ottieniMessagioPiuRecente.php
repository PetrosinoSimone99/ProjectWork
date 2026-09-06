<?php
require_once __DIR__ . '/../DbConnector.php';
require_once __DIR__ . '/../TokenManager.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: authorization");

if($_SERVER["REQUEST_METHOD"] === "GET"){
    $haErrore = false;
    $tokenManager = new TokenManager();

    $token = $tokenManager->getBearerToken();

    if(!$tokenManager->validate($token)){
        $haErrore = true;
        echo json_encode(["errore" => "401 Unauthorized"]);
    }

    if(!$haErrore){
        $connection = new DbConnector("localhost", "root", "root", "barattolo");
        $idMessaggio = getMostRecentMessage($connection, $_GET["utente"]);

        if($idMessaggio){
            echo json_encode($idMessaggio);
        }
        else{
            echo json_encode(["errore" => "400 Bad Request"]);
        }

    }

}

function getMostRecentMessage($connection, $utente){
    $statement = $connection->prepare('
        SELECT id
        FROM messaggi_chat
        WHERE id_chat IN (SELECT DISTINCT id_chat FROM partecipanti_chat WHERE id_utente = :utente)
        ORDER BY id DESC
        LIMIT 1
    ');
    $statement->bindParam(":utente", $utente);
    $statement->execute();
    $result = $statement->fetch(PDO::FETCH_ASSOC);

    if($result){
        return $result;
    }
    else{
        return false;
    }

}