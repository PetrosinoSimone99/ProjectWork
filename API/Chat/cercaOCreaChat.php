<?php
require_once __DIR__ . '/../DbConnector.php';
require_once __DIR__ . '/../TokenManager.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type,authorization");

$chatId = null;

if($_SERVER["REQUEST_METHOD"] === "POST"){
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
        $chatId = cercaChat($connection, $post["utenteAttuale"], $post["membroChat"]);
        if(!$chatId){
            createNewChat($connection, $post["utenteAttuale"], $post["membroChat"]);
            $chatId = cercaChat($connection, $post["utenteAttuale"], $post["membroChat"]);
        }
        
        echo json_encode($chatId);
    }
}


function cercaChat($connection, $utenteAttuale, $membroChat){
    $statement = $connection->prepare("
        SELECT id_chat
        FROM partecipanti_chat
        WHERE id_utente IN (:utenteAttuale, :membroChat)
        GROUP BY id_chat
        HAVING COUNT(id_utente) = 2  
    ");
    $statement->bindParam(":utenteAttuale", $utenteAttuale);
    $statement->bindParam(":membroChat", $membroChat);
    $statement->execute();
    $result = $statement->fetch(PDO::FETCH_ASSOC);

    if($result){
        return $result;
    }
    else{
        return false;
    }
}

function createNewChat($connection,$utenteAttuale, $membroChat){
    $statement = $connection->prepare('
        INSERT INTO chat() VALUES();

        SET @id_chat = LAST_INSERT_ID();

        INSERT INTO partecipanti_chat(id_chat, id_utente)
        VALUES(@id_chat, :utenteAttuale),(@id_chat, :membroChat);
    ');
    $statement->bindParam(":utenteAttuale", $utenteAttuale);
    $statement->bindParam(":membroChat", $membroChat);
    $statement->execute();
}
?>