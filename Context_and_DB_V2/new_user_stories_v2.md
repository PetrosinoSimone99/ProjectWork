> **Documento storico v2.** Queste descrizioni non rappresentano le funzionalità correnti. Per lo schema usare esclusivamente il dump indicato in `LAST_DB_TO_USE.txt`; per le API correnti consultare `API docs/DATABASE_AND_API_GUIDE.md`. Swipe, decisioni sulle proposte, catene e token di compensazione non hanno più API o elaborazione applicativa. JWT resta disponibile. Il codice chat è conservato, ma le sue tabelle non sono presenti nel dump di riferimento.

Baratto-lo

Obiettivo: Scambio di servizi tra gli utenti, senza scopo di lucro con feature di affidabilità

Stakeholder:
- Persone che vogliono offrire i propri servizi

User Stories
Come Utente voglio:
- Poter registrare alla piattaforma
- Poter effettuare Login alla piattaforma

[//]: # (- Poter vedere le persone che possano essere interessati al mio servizio tramite swipe stile Tinder)
- Poter offrire il mio servizio, che deve poi essere "swipabile"
- Poter cercare un servizio tramite filtri 
<!-- - Poter ottenere crediti
- Poter spendere i miei crediti per un servizio di un utente
- Poter proporre un servizio da aggiungere allo Staff -->

[//]: # (- Poter invitare un amico)
- Poter creare e personalizzare il mio profilo
- Poter chattare con un altro utente
- Poter creare un accordo/contratto con un altro utente dentro la chat

[//]: # (- Poter partecipare ad uno scambio fino a 4 persone quando non c'è un match diretto stile tinder)
[//]: # (- Poter guadagnare un token se in uno cambio da 3-4 persone, una persona si tira indietro)
[//]: # (- Poter spendere il mio token per un servizio offerto da un'altra persona)
- Poter reportare un utente

Come Staff voglio:
- Poter effettuare Login alla piattaforma
- Poter attivare/disattivare utenti
- Poter cambiare i ruoli degli utenti
- Poter esaminare i report degli utenti

[//]: # ()
[//]: # (<!-- Casi Limite da risolvere)

[//]: # (- Come si risolve il problema quando un utente non trova utenti che hanno bisogno del suo servizio?&#40;Caso servizi categorizzati dentro il DB&#41;)

[//]: # (  Soluzione possibile:)

[//]: # (  1. Algoritmo di scansione profili per trovare match possibile dove uno possa beneficiare del servizio di un utente.&#40;Possibile applicazione dell'AI?&#41;)

[//]: # (     L'idea in teoria è di pesare le varie richieste degli altri e cercare di suggerire i profili che raggiungono un peso di target in base al servizio dell'utente)

[//]: # ( -->)

[//]: # (<!-- &#40;Sezione Ipotetica&#41;)

[//]: # (Flusso generale dell'applicazione)

[//]: # (Entrare nel sito:)

[//]: # (Registrazione -> Login -> Pagina Principale -->)

[//]: # ()
[//]: # (Note:)

[//]: # (- Nella prima pagina l'home con tutti i servizi)

[//]: # (- In un'altra pagina vedrà gli swipe come app tinder)

[//]: # (- Un utente nuovo partirà con 0 token)

[//]: # (- Tutti i token hanno scadenza mensile)

[//]: # ()
[//]: # (<!-- Scambio di servizi:)

[//]: # (Caso 1)

[//]: # (2 Utenti si scambiano i propri servizi)

[//]: # (Caso 2)

[//]: # (Utente 1 richiede un servizio da Utente 2 pagando dei crediti)

[//]: # ()
[//]: # (Note)

[//]: # (- Come deve avvenire un accordo tra gli utenti?)

[//]: # (- Nel Caso 1 è possibile che una delle parti non rispetta l'accordo fatto. Cosa deve succedere in questo scenario?)

[//]: # (- Nel Caso 1 come si verificherà l'utente che non ha rispettato l'accordo?)

[//]: # (- Nel Caso 1 le due parti devono comunque ottenere i crediti una volta eseguiti i servizi?)

[//]: # (- Nel Caso 2 l'utente a cui si chiede un servizio può rifiutare?)

[//]: # (- Come si considera "completato" uno scambio?)

[//]: # ()
[//]: # ()
[//]: # (Dettagli ulteriori sul progetto)

[//]: # (- I servizi dell'utente e richieste sono una descrizione normale senza nessuna etichetta)

[//]: # (Problematica: Per il sistema di raccomandazione, si deve applicare un algoritmo complesso o utilizzare un modello embedding per creare un possibile match -->)

[//]: # ()
[//]: # (Scelte progettuali:)

[//]: # (- Lingua inglese nel codice)

[//]: # (- PHP a classi per backend)

[//]: # (- Commenti utili in inglese il più possibile)

[//]: # ()
[//]: # ()
[//]: # (Note per Database:)

[//]: # (- db con sia tutto quello che l'utente offre in una tabella, e tabella con tutto quello che l'utente cerca)

[//]: # (- se non c'è match stile tinder, il software cerca per 3 ore il 3° e il 4° per una catena)