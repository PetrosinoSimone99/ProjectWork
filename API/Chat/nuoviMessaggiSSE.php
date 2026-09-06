<?php
require_once __DIR__ . '/../DbConnector.php';

header("Access-Control-Allow-Origin: *");
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
set_time_limit(0);

$utente = $_GET["utente"];
$idMessaggio = $_GET["idMessaggioPartenza"];
$tokenSSE = $_GET["tokenSSE"];
$connessioneAttiva = false;
$connection = null;

if(validaTokenSSE($utente,$tokenSSE)){
    $connessioneAttiva = true;
}
else{
    echo "data: ".json_encode(["error" => "401 Unauthorized"])."\n\n";
    if (ob_get_level() > 0) {
            ob_end_flush();
    }
    flush();
}

while($connessioneAttiva){
    if($connection == null){
        $connection = new DbConnector("localhost", "root", "root", "barattolo");
    }
    $messaggi = ottieniNuoviMessagi($connection, $utente, $idMessaggio);

    if(count($messaggi) > 0){
        echo "data: ".json_encode($messaggi)."\n\n";
        if (ob_get_level() > 0) {
            ob_end_flush();
        }
        flush();
        $idMessaggio = $messaggi[count($messaggi) - 1]["id"];
        $messaggi = null;
    }
    
    if(connection_aborted()){
        $connessioneAttiva = false;
    }
    sleep(1);
}

exit();

function validaTokenSSE($utente,$sseToken){
    $parts = explode(".", $sseToken);
    if (hash_equals($parts[1], hash_hmac('sha512', $utente.$parts[0], 'abc123'))){
        return true;
    }
    else{
        return false;
    }
}

function ottieniNuoviMessagi($connection, $utente, $idMessaggio){
    $statement = $connection->prepare('
        SELECT utenti.username, mc.id, mc.id_chat, mc.messaggio
        FROM messaggi_chat as mc JOIN utenti ON mc.id_utente = utenti.id
        WHERE mc.id > :idMessaggio AND mc.id_chat IN
        (SELECT DISTINCT pc.id_chat FROM partecipanti_chat AS pc WHERE pc.id_utente = :utente)
    ');

    $statement->bindParam(":utente", $utente);
    $statement->bindParam(":idMessaggio", $idMessaggio);

    $statement->execute();
    $result = $statement->fetchAll(PDO::FETCH_ASSOC);

    return $result;
}
?>