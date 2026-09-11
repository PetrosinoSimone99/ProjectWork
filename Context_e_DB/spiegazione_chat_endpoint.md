Spiegazione delle endpoint

- cercaOCreaChat.php
Questo endpoint serve per ricercare l'id di una chat partendo dai partecipanti.
Quando non trova nessuna chat, viene creata una nuova e i partecipanti vengono inseriti.

Metodo: POST
Authorization: Bearer Token

Parametri richiesti:
$post["utenteAttuale"], per utente attuale
$post["membroChat"], per membro chat -> l'id di questo membro deve essere ottenuto preferibilmente quando l'utente clicca sulla chat con questa persona. 


- inviaMessaggio.php
Serve per inviare un messaggio in una chat

Metodo: POST
Authorization: Bearer Token

Parametri richiesti:
$post["chat"], id della chat -> da prendere all'endpoint cercaOCreaChat.php
$post["utente"], id dell'utente
$post["messaggio"], il messaggio


- ottieniStoricoChat.php
Serve per ottenere tutti i messaggi di una chat in particolare

Metodo: GET
Authorization: Bearer Token

Parametri richiesti:
$_GET['chat'], id della chat -> da prendere all'endpoint cercaOCreaChat.php


- ottieniConteggioMessaggiNonLetti.php
Questo serve per ottenere i messaggi non letti dall'utente partendo dall'ultimo messaggio letto. Quando trovato una risorsa, rimanda un json con username e il numero messaggi.

Metodo: GET
Authorization: Bearer Token

Parametri richiesti:
$_GET["utente"], id dell'utente


- ottieniMessaggioPiuRecente.php
Serve per ottenere l'id del messaggio di tutte le chat dove l'utente è un partecipante. Il risultato è un json con l'id del messaggio che servirà poi a nuoviMessaggiSSE.php

Metodo: GET
Authorization: Bearer Token

Parametri richiesti:
$_GET["utente"], id dell'utente

- generaTokenSSE.php (Importante!!!)
E' un endpoint che ha la funzione principale di validare il Bearer Token per nuoviMessaggiSSE.php perchè non è possibile creare header specifici con EventSource(javascript) e non è consigliato includere il Bearer Token nell'url string.
Quando il Bearer Token è valido, rilascia un token SSE per essere validato in nuoviMessaggiSSE.php prima di poter stabilire la connessione.
Il token è stato generato con l'id dell'utente e una stringa random poi hashato con hash_hmac() con una secret key.

Metodo: GET
Authorization: Bearer Token

Parametri richiesti:
$_GET["utente"], id dell'utente

- nuoviMessaggiSSE.php (Importante!!!)
E' un endpoint per prendere nuovi messaggi in chat dove l'utente è un partecipante. Ogni secondo chiede al db se ci sono nuovi messaggi e quando trova una risorsa lo rimanda al client connesso con flush(). Per stabilire una connessione il client deve utilizzare EventSource di Javascript. E' necessario il token SSE ottenuto da generaTokenSSE.php

Metodo: nessuna
Authorization: Token SSE

Parametri richiesti:
$_GET["utente"], id dell'utente
$_GET["idMessaggioPartenza"], id messaggio di partenza ottenuto da ottieniMessaggioPiuRecente.php
$_GET["tokenSSE"], token SSE ottenuto da generaTokenSSE.php