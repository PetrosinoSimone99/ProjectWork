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
        echo json_encode(["code" => "401 Unauthorized"]);
    }

    if(!$haErrore){
        $connection = new DbConnector("localhost", "root", "root", "barattolo");
        $ultimoMessaggioletto = ottieniUltimoMessaggioLetto($connection, $_GET["utente"]);

        if($ultimoMessaggioletto){
            echo json_encode($ultimoMessaggioletto);
        }
        else{
            echo json_encode(["error" => "400 Bad Request"]);
        }
    }
}

function ottieniUltimoMessaggioLetto($connection, $utente){
    $statement = $connection->prepare('
        SELECT id_ultimo_messaggio_letto as "ultimoMessaggioLetto"
        FROM utenti
        WHERE id = :utente
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



?>