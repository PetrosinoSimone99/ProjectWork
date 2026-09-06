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
        $messaggi = ottieniStoricoChat($connection, $_GET['chat']);
        if($messaggi){
            echo json_encode($messaggi);
        }
        else{
            echo json_encode(["errore" => "400 Bad Request"]);
        }
    }
    

}

function ottieniStoricoChat($connection, $chat){
    $statement = $connection->prepare("
    SELECT * 
    FROM messaggi_chat 
    WHERE id_chat = :chat
    ");
    $statement->bindParam(":chat", $chat);
    $statement->execute();
    $result = $statement->fetchAll(PDO::FETCH_ASSOC);

    if($result > 0){
        return $result;
    }
    else{
        return false;
    }
}
?>