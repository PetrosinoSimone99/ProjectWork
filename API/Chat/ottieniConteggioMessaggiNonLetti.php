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

        $conteggio = getUnreadMessagesCount($connection, $_GET["utente"], $_GET["ultimoMessaggioLetto"]);

        if($conteggio){
            echo json_encode($conteggio);
        }
        else{
            echo json_encode(["errore" => "400 Bad Request"]);
        }
    }
}
function getUnreadMessagesCount($connection, $utente, $ultimoMessaggioLetto){
    $statement = $connection->prepare('
        SELECT username,COUNT(mc.id) AS "conteggio"
        FROM messaggi_chat AS mc JOIN utenti ON mc.id_utente = utenti.id
        WHERE mc.id > :ultimoMessaggioLetto AND mc.id_utente != :utente AND mc.id_chat IN 
        (SELECT DISTINCT pc.id_chat FROM partecipanti_chat as pc WHERE pc.id_utente = :utente)
        GROUP BY id_utente
    ');
    $statement->bindParam(":utente", $utente);
    $statement->bindParam(":ultimoMessaggioLetto", $ultimoMessaggioLetto);
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