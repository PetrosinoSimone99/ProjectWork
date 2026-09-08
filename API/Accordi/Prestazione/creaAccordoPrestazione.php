<?php
require_once __DIR__ . "/../../DbConnector.php";
require_once __DIR__ . "/../../TokenManager.php";
require_once __DIR__ . "/decrementaCreditiBeneficiario.php";

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

        if($post["tipo"] === "Richiesta"){
            if(prestazioneRichiestaController($connection, $post["erogatore"], $post["beneficiario"], $post["durata"], $post["crediti"])){
                echo json_encode(["successo" => "200 OK"]);
            }
            else{
                echo json_encode(["errore" => "400 Bad Request"]);
            }
        }

        if($post["tipo"] === "Offerta"){
            if(prestazioneOffertaController($connection, $post["erogatore"], $post["beneficiario"], $post["durata"], $post["crediti"])){
                echo json_encode(["successo" => "200 OK"]);
            }
            else{
                echo json_encode(["errore" => "400 Bad Request"]);
            }
        }
    }
}
function prestazioneRichiestaController($connection, $erogatore, $beneficiario, $durata, $crediti){
    try{
        if(cercaAccordoDaiPartecipanti($connection, $erogatore, $beneficiario)){
            return false;
        }
        $idAccordo = creaPrestazioneRichiesta($connection, $erogatore, $beneficiario, $durata, $crediti);
        decrementaCreditiBeneficiario($connection, $beneficiario, $idAccordo);

        return true;
    }
    catch(PDOException $e){
        return false;
    }
}

function prestazioneOffertaController($connection, $erogatore, $beneficiario, $durata, $crediti){
    try{
        if(cercaAccordoDaiPartecipanti($connection, $erogatore, $beneficiario)){
            return false;
        }

        creaPrestazioneOfferta($connection, $erogatore, $beneficiario, $durata, $crediti);
        return true;
    }
    catch(PDOException $e){
        return false;
    }
}

function creaPrestazioneRichiesta($connection, $erogatore, $beneficiario, $durata, $crediti){
    
    $statement = $connection->prepare('
        INSERT INTO accordi_prestazione(tipo, durata_attivita, crediti, stato)
        VALUES("Richiesta", :durata, :crediti, "PROPOSTO");

        SET @id_accordo = LAST_INSERT_ID();

        INSERT INTO partecipanti_accordo_prestazione(id_accordo, id_utente, ruolo, accettazione)
        VALUES
        (@id_accordo, :beneficiario, "Beneficiario", true),
        (@id_accordo, :erogatore, "Erogatore", NULL)
    ');

    $statement->bindParam(":beneficiario", $beneficiario);
    $statement->bindParam(":erogatore", $erogatore);
    $statement->bindParam(":durata", $durata);
    $statement->bindParam(":crediti", $crediti);

    try{
        $statement->execute();
        return $connection->lastInsertId();
    }
    catch(PDOException $e){
        throw $e;
    }

}

function creaPrestazioneOfferta($connection, $erogatore, $beneficiario, $durata, $crediti){
    $statement = $connection->prepare('
        INSERT INTO accordi_prestazione(tipo, durata_attivita, crediti, stato)
        VALUES("Offerta", :durata, :crediti, "PROPOSTO");

        SET @id_accordo = LAST_INSERT_ID();

        INSERT INTO partecipanti_accordo_prestazione(id_accordo, id_utente, ruolo, accettazione)
        VALUES
        (@id_accordo, :beneficiario, "Beneficiario", NULL),
        (@id_accordo, :erogatore, "Erogatore", true)
    ');

    $statement->bindParam(":beneficiario", $beneficiario);
    $statement->bindParam(":erogatore", $erogatore);
    $statement->bindParam(":durata", $durata);
    $statement->bindParam(":crediti", $crediti);

    try{
        $statement->execute();
    }
    catch(PDOException $e){
        throw $e;
    }
}

function cercaAccordoDaiPartecipanti($connection, $erogatore, $beneficiario){
    $statement = $connection->prepare('
        SELECT DISTINCT id_accordo
        FROM partecipanti_accordo_prestazione as pap JOIN accordi_prestazione as ap ON pap.id_accordo = ap.id
        WHERE id_utente in (:partecipante1, :partecipante2) AND stato NOT IN ("COMPLETATO", "ANNULLATO")
        GROUP BY id_accordo
        HAVING COUNT(id_utente) = 2
    ');
    
    $statement->bindParam(":partecipante1", $erogatore);
    $statement->bindParam(":partecipante2", $beneficiario);

    try{
        $statement->execute();
        
        $result = $statement->fetchAll(PDO::FETCH_ASSOC);
        if(!$result){
            return false;
        }

        return true;

    }catch(PDOException $e){
        throw $e;
    }
}
?>
