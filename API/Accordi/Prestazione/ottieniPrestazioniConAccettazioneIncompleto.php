<?php
require_once __DIR__ . "/../../DbConnector.php";
require_once __DIR__ . "/../../TokenManager.php";

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type,authorization");


if($_SERVER["REQUEST_METHOD"] === "GET"){
    $haErrore = false;
    $tokenManager = new TokenManager();
    $token = $tokenManager->getBearerToken();

    if(!$tokenManager->validate($token)){
        $haErrore = true;
        echo json_encode(["errore" => "401 Unauthorized"]);
    }

    if(!$haErrore){
        $connection = new DbConnector("localhost", "root", "root","barattolo");

        $accordi = ottieniPrestazioniConAccettazioneIncompleto($connection, $_GET["utente"]);
        
        if($accordi){
            echo json_encode($accordi);
        }
        else{
            echo json_encode(["errore" => "404 Not Found"]);
        }

    }

}


function ottieniPrestazioniConAccettazioneIncompleto($connection, $utente){
    $statement = $connection->prepare('
        SELECT *
        FROM partecipanti_accordo_prestazione as pap JOIN accordi_prestazione as ap ON pap.id_accordo = ap.id
        WHERE id_utente = :utente AND accettazione is NULL
    ');

    $statement->bindParam(":utente", $utente);

    try{
        $statement->execute();

        $result = $statement->fetchAll(PDO::FETCH_ASSOC);

        return $result;
    }
    catch(PDOException $e){
        return false;
    }
}

?>