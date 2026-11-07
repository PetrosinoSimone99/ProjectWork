> **Compatibilità con lo schema corrente:** tutte le API chat descritte qui sono conservate. Il dump indicato da `LAST_DB_TO_USE.txt` non contiene le tabelle chat e proposte necessarie: le chat non funzionano con il solo dump. Le denominazioni di proposta e gruppo negli URL restano per compatibilità del codice; non implicano la disponibilità delle API di swipe o catene. Nessuno schema chat viene aggiunto automaticamente. Il Bearer token è un JWT di autenticazione.

/api/chats/mutual-proposal/{proposalId}

Endpoint che recupera la chat e lo storico di messaggi partendo dall'id della proposta di scambio 1 a 1.

Metodo: GET
Authorization: Bearer Token

Formato di esempio della response senza dati
{
    "chatId":...,
    "messages":[
        {"id":...,
        "chatId":...,
        "username":..,
        "message":...,
        "creationDate":...},
        {"id":...,
        "chatId":...,
        "username":..,
        "message":...,
        "creationDate":...}
        ]
}

/api/chats/group-proposal/beneficiary/{groupProposalId} *
Endpoint che recupera la chat e lo storico di messaggi partendo dall'id della proposta di gruppo(Scambio a catena).E' stato impostato così per difficoltà di trovare un implementazione più pulita. Questo è per quando l'utente è beneficiario di un servizio

Metodo: GET
Authorization: Bearer Token

Formato di esempio della response senza dati
{
    "chatId":...,
    "messages":[
        {"id":...,
        "chatId":...,
        "username":..,
        "message":...,
        "creationDate":...},
        {"id":...,
        "chatId":...,
        "username":..,
        "message":...,
        "creationDate":...}
        ]
}

/api/chats/group-proposal/provider/{groupProposalId} *
Endpoint che recupera la chat e lo storico di messaggi partendo dall'id della proposta di gruppo(Scambio a catena).E' stato impostato così per difficoltà di trovare un implementazione più pulita. Questo è per quando l'utente è erogatore di un servizio

Metodo: GET
Authorization: Bearer Token

Formato di esempio della response senza dati
{
    "chatId":...,
    "messages":[
        {"id":...,
        "chatId":...,
        "username":..,
        "message":...,
        "creationDate":...},
        {"id":...,
        "chatId":...,
        "username":..,
        "message":...,
        "creationDate":...}
        ]
}

*IMPORTANTE per frontend: Si consiglia di utilizzare due bottoni per aprire le chat. Uno per quando è beneficiario l'utente e l'altro per quando è un erogatore di servizio.


/api/chats/send-message/{chatId}
Enpoint per inviare i messaggi ad una chat.

Metodo: POST
Authorization: Bearer Token

/api/chats/most-recent-message * 
Endpoint per recuperare l'id del messaggio più recente dell'utente. Questo deve essere chiamato preferibilmente il più presto possibile per poter utilizzare bene il prossimo Endpoint.

Metodo: GET
Authorization: Bearer Token

Formato di esempio della response senza dati:
{
    "chatMessageId":...
}

/api/chats/check-new-messages/{recentMessageId} * 
Endpoint per recuperare nuovi messaggi ricevuti utilizzando la tecnica del polling. Richiede l'id del messaggio ottenuto dall'endpoint precedente come punto di partenza. Quando un nuovo messaggio è stato ricevuto, l'equivalente di recentMessageId lato frontend deve essere aggiornato.

Metodo: GET
Authorization: Bearer Token

Formato di esempio della response senza dati:
{
    "id":...,
    "chatId":...,
    "username":..,
    "message":...,
    "creationDate":...
}

*IMPORTANTE per frontend: Questi due devono essere usati insieme. Chiamare prima most-recent-message e poi utilizzare l'id ottenuto per utilizzare check-new-messages. Aggiornare l'equivalente frontend di recentMessageId quando si ottiene un nuovo messaggio.