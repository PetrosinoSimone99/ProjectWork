<?php
require_once __DIR__ . '/../DbConnector.php';
require_once __DIR__ . '/../TokenManager.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type,authorization");

if($_SERVER['REQUEST_METHOD'] === "POST"){
    $post = json_decode(file_get_contents("php://input"), true);
    $haErrore = false;
    $tokenManager = new TokenManager();
    $token = $tokenManager->getBearerToken();
    
    if(!$tokenManager->validate($token)){
        $haErrore = true;
        echo json_encode(["errore" => "401 Unauthorized"]);
    }

    if(!$haErrore){
        $connection = new DbConnector("localhost", "root", "root","barattolo");

        if(inviaMessaggio($connection, $post["chat"], $post["utente"], $post["messaggio"])){
            echo json_encode(["successo" => "200 OK"]);
        }
        else{
            echo json_encode(["errore" => "400 Bad Request"]);
        }
    }
}

function inviaMessaggio($connection, $chat, $utente, $messaggio){
    $statement = $connection->prepare("
        INSERT INTO messaggi_chat(id_utente, id_chat, messaggio) VALUES(:utente, :chat, :messaggio)
    ");
    $statement->bindParam(":utente", $utente);
    $statement->bindParam(":chat", $chat);
    $statement->bindParam(":messaggio", $messaggio);

    $statement->execute();

    $result = $statement->fetchAll(PDO::FETCH_ASSOC);

    if($result > 0){
        return true;
    }
    else{
        return false;
    }
}
?>