<?php
require_once __DIR__ . '/../DbConnector.php';
require_once __DIR__ . '/../TokenManager.php';


header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: authorization");

$_GET["utente"] = 1;
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

        $conteggio = ottieniConteggioMessaggiNonLetti($connection, $_GET["utente"]);

        if($conteggio){
            echo json_encode($conteggio);
        }
        else{
            echo json_encode(["errore" => "400 Bad Request"]);
        }
    }
}

function ottieniConteggioMessaggiNonLetti($connection, $utente){
    $statement = $connection->prepare('
        SELECT msg.id_utente, COUNT(msg.id) as "conteggio"
        FROM partecipanti_chat as pm JOIN messaggi_chat as msg ON pm.id_chat = msg.id_chat
        WHERE pm.id_utente = :utente AND msg.id > pm.id_ultimo_messaggio_letto AND msg.id_utente != :utente
        GROUP BY msg.id_utente
    ');
    $statement->bindParam(":utente", $utente);
    $statement->execute();

    $result = $statement->fetchAll(PDO::FETCH_ASSOC);

    if($result){
        return $result;
    }
    else{
        return false;
    }
}

?>