Spiegazione delle endpoint

- creaAccordoPrestazione.php

Questo crea un accordo di tipo "Prestazione". La prestazione a sua volta può essere di tipo "Richiesta" o "Offerta". Se è di tipo richiesta, i crediti del beneficiario vengono ridotti subito. L'utente che ha inizializzato accetta subito l'accordo. L'operazione iniziale è la verifica se i due partecipanti hanno un accordo in corso, se verificato, un nuovo accordo non può essere fatto.

Metodo: POST
Authorization: Bearer Token

Parametri richiesti:
$post["erogatore"] -> id di tipo int
$post["beneficiario"] -> id di tipo int
$post["durata"] -> valore di tipo int
$post["crediti"] -> valore di tipo int

- ottieniAccordiPrestazioniUtente.php

Recupera tutti gli accordi dell'utente.

Metodo: GET
Authorization: Bearer Token

Parametri richiesti:
$_GET["utente"] -> id di tipo int

- ottieniPrestazioniConAccettazioneIncompleto.php

Recupera gli accordi dove l'utente non ha ancora dato la sua conferma.

Metodo: GET
Authorization: Bearer Token

Parametri richiesti:
$_GET["utente"] -> id di tipo int

- verificaRispostaPrestazione.php

Si occupa di ricevere le risposte dei vari utenti in accordi dove non ha risposto. Quando un utente invia la sua risposta, l'accordo stesso viene modificato in base ai risultati. Esempio:
Utente 1 accetta l'accordo -> l'accordo passa allo stato "Accettato" perchè entrambi i partecipanti hanno accettato.
Utente 2 rifiuta l'accordo -> l'accordo passa allo stato "Annullato" perchè uno dei partecipanti ha rifiutato.

Se l'utente che invia la risposta è il beneficiario e conferma l'accordo, i suoi crediti vengono ridotti.
In caso di annullamento dell'accordo, il beneficiario viene rimborsato i crediti associati all'accordo.

Metodo: POST
Authorization: Bearer Token

Parametri richiesti:
$post["accordo"] -> id di tipo int
$post["utente"] -> id di tipo int
$post["risposta"] -> valore int di 0 o 1, molto importante perchè mysql interpreta male il booleano false per qualche motivo.

- impostaCompletamentoBeneficiario.php
Riceve la conferma di completamento del beneficiario e incrementa i crediti dell'erogatore se esito positivo. Attualmente impostato con il presupposto di buon fine dell'accordo.

Metodo: POST
Authorization: Bearer Token

Parametri richiesti:
$post["accordo"] -> id di tipo int
$post["utente"] -> id di tipo int
$post["risposta"] -> valore di tipo 0 o 1, molto importante perchè mysql interpreta male il booleano false per qualche motivo.

MISC:
- decrementaCreditiBeneficiario.php (Esclusivo per Accordi di prestazione)
Una funzione che decrementa i crediti del beneficiario dove necessario

Parametri richiesti:
$beneficiario -> id di tipo int
$accordo -> id di tipo int

- recuperaRuoloUtente.php (Esclusivo per Accordi di prestazione)
Recupera il ruolo dell'utente nell'accordo Prestazione dove necessario

Parametri richiesti:
$accordo -> id di tipo int
$utente -> id di tipo int

