<?php
function decrementaCreditiBeneficiario($connection, $beneficiario, $accordo){
    $statement = $connection->prepare('
        UPDATE utenti
        SET saldo_disponibile = saldo_disponibile - (SELECT crediti FROM accordi_prestazione WHERE id = :accordo)
        WHERE id = :beneficiario
    ');

    $statement->bindParam(":beneficiario", $beneficiario);
    $statement->bindParam(":accordo", $accordo);

    $statement->execute();

    if($statement->rowCount() !== 1){
        return false;
    }

    return true;
}
?>