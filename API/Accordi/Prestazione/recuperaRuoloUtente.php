<?php
function recuperaRuoloUtente($connection, $accordo, $utente){
    $statement = $connection->prepare('
        SELECT ruolo
        FROM partecipanti_accordo_prestazione
        WHERE id_accordo = :accordo AND id_utente = :utente
    ');

    $statement->bindParam(":accordo", $accordo);
    $statement->bindParam(":utente", $utente);

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