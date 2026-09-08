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
        $accordi = ottieniAccordiPrestazioneUtente($connection, $_GET["utente"]);

        if($accordi){
            echo json_encode($accordi);
        }
        else{
            echo json_encode(["errore" => "404 Not Found"]);
        }
    }
}

function ottieniAccordiPrestazioneUtente($connection, $utente){
    $statement = $connection->prepare('
        SELECT id, tipo, stato, durata_attivita, crediti, data_creazione, data_inizio, data_fine, ruolo, accettazione
        FROM accordi_prestazione AS ap JOIN partecipanti_accordo_prestazione as pap ON ap.id = pap.id_accordo
        WHERE id_utente = :utente
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