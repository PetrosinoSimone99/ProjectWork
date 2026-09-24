Il database è stato progettato con la struttura attuale per cercare di soddisfare dei requisiti.
Alcuni dettagli:
- I servizi possono avere tante categorie associate ai fini di poter calcolare le compatibilità
- Per lo scambio 1 a 1, la tabella "proposals" e quelle collegate servono per la creazione dello "swipe" feed dell'utente loggato.

Requisiti Noti
- Swipe Feed: La swipe feed come contenuto avrà le proposte di altri utenti da confermare come primi risultati e sotto tutti gli utenti potenzialmente interessati al servizio dell'utente loggato per creare proposte. Esempio:

Swipe Feed di Alice quando entra in quella sezione
1. Proposte da confermare
Letture tabella proposals per cercare proposte da confermare -> se ci sono verranno mostrate come primi risultati

2. Ricerca di persone compatibili per creare proposte ad altri utenti
Calcolo compatibilità backend -> se ci sono, verranno mostrate ad Alice -> Alice quando fa lo "swipe" di conferma/accettazione, si crea una proposta -> L'altro utente vedrà questa proposta tra i primi risultati da confermare

- Scambio 1 a 1: Divisa in due fase, creazione della proposta e la creazione dell'accordo formale. Dallo swipe feed si creano le proposte e una volta confermato da entrambi le parti, si apre una chat tra di loro per fissare i dettagli e quando fissato si crea l'accordo vero dentro il database.

- Scambio a "catena" / gruppo: Sempre divisa in due fasi, la prima fase è la ricerca delle persone compatibili tra di loro, in particolare Utente A comincia la "catena" e la sua offerta verrà evidenziata per poter cercare Utente B, che richiede quel servizio, questo continua fino all'ultimo utente ricercato. L'ultimo utente che entra verrà calcolata la sua compatbilità in base alla richesta di Utente A.Se non si trovano le persone necessarie, il gruppo si annulla. Alla conferma della proposta, viene aperta una chat di gruppo per gli utenti coinvolti per fissare i dettagli. Può capitare che durante la fissazione degli accordi, parte del gruppo non si creano accordi (vedi immagine progettazione_scambio_catena per casi di esempio)

