<?php
require_once __DIR__ . "/../../DbConnector.php";
require_once __DIR__ . "/../../TokenManager.php";
require_once __DIR__ . "/recuperaRuoloUtente.php";

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type,authorization");

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

        if(controllerCompletamentoBeneficiario($connection, $post["accordo"], $post["utente"], $post["risposta"])){
            echo json_encode(["successo" => "200 OK"]);
        }
        else{
            echo json_encode(["errore" => "400 Bad Request"]);
        }

    }
}

function controllerCompletamentoPrestazione($connection, $accordo, $utente, $risposta){
    try{
        $risultato = recuperaRuoloUtente($connection, $utente);
        
        if($risultato["ruolo"] !== "Beneficiario"){
            return false;
        }

        impostaCompletamentoBeneficiario($connection, $accordo, $utente, $risposta);

        if($risposta){
            incrementaCreditiErogatore($connection, $accordo);
        }

        return true;

    }catch(PDOException $e){
        return false;
    }
}


function impostaCompletamentoBeneficiario($connection, $accordo, $utente, $risposta){
    $statement = $connection->prepare('
        UPDATE accordi_prestazione
        SET completamento_beneficiario = :risposta
        WHERE id = :accordo
    ');

    $statement->bindParam(":accordo", $accordo);
    $statement->bindParam(":risposta", $risposta);

    try{
        $statement->execute();

        return true;
    }
    catch(PDOException $e){
        throw $e;
    }
    
}

function incrementaCreditiErogatore($connection, $accordo){
    $statement = $connection->prepare('
    UPDATE utenti
    SET saldo_disponibile = saldo_disponibile + (SELECT crediti FROM accordi_prestazione WHERE id = :accordo)
    WHERE id = (SELECT id_utente FROM partecipanti_accordo_prestazione WHERE id_accordo = :accordoPartecipanti AND ruolo = "Erogatore")
    ');

    $statement->bindParam(":accordo", $accordo);
    $statement->bindParam(":accordoPartecipanti", $accordo);

    try{
        $statement->execute();

        if($statement->rowCount() !== 1){
            return false;
        }

        return true;
    }
    catch(PDOException $e){
        throw $e;
    }

}
?>