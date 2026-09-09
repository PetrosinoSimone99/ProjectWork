<?php
require_once __DIR__ . "/../../DbConnector.php";
require_once __DIR__ . "/../../TokenManager.php";
require_once __DIR__ . "/decrementaCreditiBeneficiario.php";
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

        if(controllerStatoPrestazione($connection, $post["accordo"], $post["utente"], $post["risposta"])){
            echo json_encode(["successo" => "200 OK"]);
        }
        else{
            echo json_encode(["errore" => "400 Bad Request"]);
        }
    }
}

function controllerStatoPrestazione($connection, $accordo, $utente, $risposta){
    try{
        $risultato = recuperaRuoloUtente($connection, $accordo, $utente);
        if($risultato["ruolo"] === "Beneficiario" && $risposta){
            $verificaCrediti = verificaCreditiBeneficiario($connection, $utente, $accordo);
            if(!$verificaCrediti["esito"]){
                return false;
            }
            decrementaCreditiBeneficiario($connection, $utente, $accordo);
        }
        
        impostaAccettazionePrestazione($connection, $accordo, $utente, $risposta);

        $conteggioRisposte = verificaAccettazioneAccordo($connection, $accordo);
        if($conteggioRisposte["risultato"] == 2){
            $stato = "ACCETTATO";
            impostaStatoAccordo($connection, $accordo, $stato);
        }
        if($conteggioRisposte["risultato"] == 1 && !$risposta){
            $stato = "ANNULLATO";
            impostaStatoAccordo($connection, $accordo, $stato);
            rimborsaCreditiBeneficiario($connection, $accordo);
        }

        return true;
    }
    catch(PDOException $e){
        return false;
    }
}
function impostaAccettazionePrestazione($connection, $accordo, $utente, $risposta){
    $statement = $connection->prepare('
        UPDATE partecipanti_accordo_prestazione
        SET accettazione = :risposta
        WHERE id_accordo = :accordo AND id_utente = :utente
    ');

    $statement->bindParam(":accordo", $accordo);
    $statement->bindParam(":utente", $utente);
    $statement->bindParam(":risposta", $risposta);

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
function verificaAccettazioneAccordo($connection, $accordo){
    $statement = $connection->prepare('
        SELECT COUNT(accettazione) as "risultato"
        FROM partecipanti_accordo_prestazione
        WHERE id_accordo = :accordo AND accettazione = true
    ');

    $statement->bindParam(":accordo", $accordo);

    try{
        $statement->execute();

        $result = $statement->fetch(PDO::FETCH_ASSOC);

        return $result;
    }
    catch(PDOException $e){
        throw $e;
    }
}
function impostaStatoAccordo($connection, $accordo, $stato){
    $statement= $connection->prepare('
        UPDATE accordi_prestazione
        SET stato = :stato
        WHERE id = :accordo
    ');

    $statement->bindParam(":accordo", $accordo);
    $statement->bindParam(":stato", $stato);
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

function rimborsaCreditiBeneficiario($connection, $accordo){
    $statement = $connection->prepare('
        UPDATE utenti
        SET saldo_disponibile = saldo_disponibile + (SELECT crediti FROM accordi_prestazione WHERE id = :accordo)
        WHERE id IN
        (SELECT id_utente
        FROM partecipanti_accordo_prestazione
        WHERE ruolo = "Beneficiario" and id_accordo = :accordoPartecipanti)
    
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
function verificaCreditiBeneficiario($connection, $beneficiario, $accordo){
    $statement = $connection->prepare('
        SELECT IF((SELECT saldo_disponibile FROM utenti WHERE id = :beneficiario) >= (SELECT crediti FROM accordi_prestazione WHERE id = :accordo), true, false) as "esito";
    ');

    $statement->bindParam(":beneficiario", $beneficiario);
    $statement->bindParam(":accordo", $accordo);

    try{
        $statement->execute();

        $result = $statement->fetch(PDO::FETCH_ASSOC);

        return $result;
    }
    catch(PDOException $e){
        throw $e;
    }
}

?>