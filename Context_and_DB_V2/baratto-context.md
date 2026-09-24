# Baratto-lo — contesto del progetto e database v2

## Scopo e fonti

Questo documento descrive Baratto-lo alla luce delle user stories v2 e dello schema presente in `barattolo_v2.sql`.

Le fonti hanno ruoli distinti:

- `barattolo_v2.sql` è la fonte autorevole per tabelle, colonne, enum e relazioni attualmente progettati;
- `database_doc_spiegazione.md` chiarisce i flussi previsti per swipe, scambio diretto e scambio a catena;
- `new_user_stories_v2.md` definisce i requisiti funzionali, compresi quelli che il database non rappresenta ancora.

Il documento distingue quindi fra:

- **Presente nello schema:** struttura definita nel file SQL;
- **Comportamento previsto:** flusso descritto nelle fonti, ma non necessariamente garantito dal solo database;
- **Da definire o implementare:** requisito incompleto, ambiguo o non ancora rappresentato nello schema.

Non vengono descritte funzionalità come già implementate quando le fonti esprimono soltanto un obiettivo. Il presente documento non modifica il database, il codice o i dati esistenti.

## Obiettivo del progetto

Baratto-lo è una piattaforma senza scopo di lucro per lo scambio di servizi tra utenti, con funzionalità a supporto dell'affidabilità delle interazioni.

Le persone possono registrarsi, pubblicare ciò che offrono e cercano, consultare i servizi, scoprire utenti compatibili tramite swipe, comunicare in chat e definire scambi. Lo scambio può essere diretto fra due persone oppure coinvolgere un gruppo fino a quattro persone quando non esiste un match diretto.

I token sono previsti come compensazione nel caso in cui una persona si ritiri da uno scambio di tre o quattro partecipanti. Un token può essere usato per ottenere un servizio offerto da un altro utente e ha scadenza mensile. Lo schema v2 ne rappresenta soltanto il possesso e la scadenza.

## Attori e requisiti

### Utente

L'utente deve poter:

- registrarsi ed effettuare il login;
- creare e personalizzare il proprio profilo;
- pubblicare uno o più servizi offerti e indicare i servizi richiesti;
- consultare i servizi nella home e cercarli tramite filtri;
- vedere tramite swipe le proposte ricevute e persone potenzialmente compatibili;
- invitare un amico;
- chattare con altri utenti;
- concordare uno scambio diretto o partecipare a uno scambio di gruppo fino a quattro persone;
- ricevere e utilizzare token nei casi previsti;
- segnalare un altro utente.

### Staff

Lo staff deve poter effettuare il login, attivare o disattivare utenti, cambiarne i ruoli ed esaminare le segnalazioni.

Nel database v2 `users.roles` è un campo JSON e `users.account_status` usa l'enum `ACTIVE` o `INACTIVE`. Lo schema non definisce quali ruoli possano essere assegnati, i permessi associati, lo storico delle modifiche o le strutture necessarie per le segnalazioni.

## Profili, servizi e categorie

### Utenti

La tabella `users` contiene:

- identificativo auto-incrementale;
- nome, cognome e località opzionale;
- username ed email univoci;
- hash della password;
- ruoli in formato JSON;
- stato dell'account, attivo per default;
- data di creazione.

Lo schema non contiene un saldo nel profilo: un nuovo utente parte con zero token perché non possiede ancora righe nella tabella `tokens`.

### Servizi offerti e richiesti

Il database usa una sola tabella `services` per entrambi i tipi di servizio. La colonna `type` distingue esattamente:

- `RICHIESTA`: servizio cercato dall'utente;
- `OFFERTA`: servizio offerto dall'utente.

Ogni servizio può essere collegato al proprietario tramite `user_id` e contiene una descrizione e una data di creazione. Lo schema non definisce titolo, stato di pubblicazione, aggiornamento, disponibilità o modalità di erogazione.

La classificazione è gestita da `categories` e dalla tabella ponte `service_categories`. Un servizio può appartenere a più categorie; questa relazione molti-a-molti serve al backend per il calcolo delle compatibilità. Lo schema non specifica l'algoritmo, i pesi o la soglia con cui una compatibilità viene considerata valida.

## Home, ricerca e swipe

### Home dei servizi

La prima pagina prevista è la home con tutti i servizi offerti e i filtri di ricerca. Il database fornisce servizi, tipo, descrizione, proprietario e categorie, ma non contiene campi dedicati alla pubblicazione o alla visibilità.

**Da definire:** filtri disponibili, ordinamento, consultazione senza autenticazione e criteri con cui escludere utenti o servizi non attivi.

### Ordine dello swipe feed

Il feed swipe dell'utente autenticato è composto da due blocchi ordinati:

1. **Proposte da confermare.** Il backend legge `proposals` e `proposal_participants` per mostrare per prime le proposte in attesa che richiedono la decisione dell'utente.
2. **Persone compatibili.** Il backend calcola la compatibilità tra servizi e categorie e mostra utenti potenzialmente interessati al servizio dell'utente autenticato.

Quando l'utente conferma con uno swipe positivo una compatibilità del secondo blocco, viene creata una proposta. La controparte troverà poi quella proposta nel primo blocco del proprio feed. Il passaggio a una scheda successiva e l'eventuale rifiuto devono essere gestiti dall'applicazione; non esiste una tabella separata che conservi la cronologia di tutti gli swipe.

### Proposte

`proposals` registra identificativo, località, data di creazione e uno stato fra `IN_ATTESA`, `ACCETTATO` e `RIFIUTATO`.

`proposal_participants` associa alla proposta gli utenti e i rispettivi servizi, includendo l'eventuale data di conferma. La chiave primaria composta impedisce la duplicazione della stessa combinazione di proposta, utente e servizio, ma lo schema non impone il numero di partecipanti né stabilisce da solo quando lo stato complessivo debba cambiare.

## Scambio diretto 1:1

Lo scambio diretto è diviso in due fasi.

### Fase 1 — proposta e conferma

Lo swipe feed permette di creare e confermare una proposta. `proposals` e `proposal_participants` conservano la proposta, i partecipanti, i servizi coinvolti e le date di conferma.

Il database non garantisce che una proposta 1:1 abbia esattamente due utenti distinti, che i servizi appartengano ai partecipanti o che vi sia una corrispondenza fra un'offerta e una richiesta. Questi controlli spettano al backend.

### Fase 2 — chat e accordo formale

Quando entrambe le parti confermano la proposta, viene aperta una chat per concordare località, tempi e dettagli. Una volta definiti i termini, viene creato l'accordo in `exchange_1_on_1`, collegato alla proposta tramite `proposal_id`.

`exchange_1_on_1` contiene località, data di creazione e stato `IN_ATTESA`, `ACCETTATO` o `RIFIUTATO`. `exchange_participants` associa accordo, utente e servizio e registra data di inizio, data di completamento e il booleano `exchange_accepted`.

Lo schema consente quindi di rappresentare l'accettazione e il completamento dei singoli partecipanti, ma non definisce chi possa dichiarare completato il servizio, come gestire un mancato adempimento o se una modifica ai dettagli richieda nuove conferme.

## Scambio a catena o di gruppo

### Ricerca progressiva

Quando non è disponibile uno scambio diretto, il sistema cerca una catena compatibile di tre o quattro persone:

1. l'utente A avvia la catena e la sua offerta viene usata per cercare B, che richiede quel servizio;
2. il servizio offerto dal nuovo partecipante diventa il riferimento per trovare quello successivo;
3. la ricerca prosegue fino al numero di partecipanti necessario;
4. il servizio dell'ultimo partecipante deve soddisfare la richiesta iniziale di A e chiudere la catena;
5. se non vengono trovate le persone necessarie, la proposta di gruppo viene annullata.

La user story stabilisce una ricerca di tre ore e un massimo di quattro partecipanti. Queste regole non sono codificate in colonne o vincoli SQL e devono essere applicate dal backend.

### Struttura della proposta di gruppo

`exchange_group_proposal` rappresenta la costruzione della catena. Contiene:

- `current_offered_service`, cioè il servizio offerto da usare per proseguire la ricerca;
- `last_requested_service`, cioè la richiesta da soddisfare per chiudere la catena;
- data di creazione e località;
- stato `IN_ATTESA`, `CONFERMATO` o `ANNULLATO`.

`group_participants` collega ogni gruppo ai suoi utenti e al servizio ricevuto. Il modello permette di seguire il gruppo in formazione, ma non contiene posizione nella catena, data di ingresso, conferma individuale o un vincolo sul numero di persone.

### Chat e prestazioni concordate

Quando la proposta di gruppo viene confermata, viene aperta una chat di gruppo per stabilire i dettagli. Durante questa fase è possibile che non tutti i collegamenti ipotizzati diventino accordi effettivi: una parte del gruppo può quindi non arrivare alla creazione di una prestazione concordata.

Le prestazioni effettive sono rappresentate da `service_provision`, che collega una prestazione alla proposta di gruppo e registra servizio, località, data di inizio e data di fine. `service_participants` assegna a ciascun utente della prestazione il ruolo `EROGATORE` o `BENEFICIARIO`.

Questa separazione consente di registrare soltanto gli accordi effettivamente raggiunti dopo la discussione di gruppo. Il backend deve verificare che erogatore, beneficiario, servizio e appartenenza al gruppo siano coerenti.

## Chat

La tabella `chat` identifica una conversazione e ne registra la data di creazione. `chat_participants` associa gli utenti alla conversazione e può indicare l'ultimo messaggio letto. `chat_messages` conserva mittente, testo, chat e data del messaggio.

Il comportamento previsto comprende chat fra due utenti e chat di gruppo. Solo i partecipanti autorizzati devono poter leggere o inviare messaggi; questo vincolo non è imposto dal database.

La colonna `chat.proposal_id` presenta un'ambiguità strutturale: il file SQL aggiunge sulla stessa colonna una foreign key verso `proposals.id` e un'altra verso `exchange_group_proposal.id`. Poiché gli stessi valori dovrebbero esistere in entrambe le tabelle, la colonna non distingue in modo affidabile il tipo di proposta. Il problema deve essere risolto prima di usare lo schema in produzione, ma non viene corretto in questo documento.

## Token

`tokens` contiene soltanto identificativo, `user_id` ed `expiration_date`. Il possesso di righe non scadute può rappresentare i token disponibili dell'utente.

I requisiti prevedono che:

- un nuovo utente parta con zero token;
- un token possa essere assegnato quando una persona si ritira da uno scambio di tre o quattro partecipanti;
- il token possa essere speso per un servizio offerto da un altro utente;
- tutti i token abbiano scadenza mensile.

Lo schema non registra l'accordo o il ritiro che ha generato il token, lo stato del token, la prenotazione, il consumo, il servizio ottenuto o il beneficiario della prestazione. Non stabilisce inoltre chi riceva il token in caso di ritiro né se “scadenza mensile” significhi fine del mese solare o un mese dall'emissione.

Queste regole devono essere definite prima di implementare assegnazione e utilizzo, evitando doppie emissioni o il riutilizzo dello stesso token.

## Mappa del database v2

| Tabella | Responsabilità e relazioni attuali |
| --- | --- |
| `users` | Credenziali, profilo essenziale, ruoli JSON e stato dell'account |
| `services` | Servizi `RICHIESTA` e `OFFERTA`, associati al proprietario |
| `categories` | Catalogo delle categorie dei servizi |
| `service_categories` | Relazione molti-a-molti fra servizi e categorie |
| `proposals` | Proposte nate dal flusso swipe e relativo stato |
| `proposal_participants` | Utenti, servizi e conferme associati a una proposta |
| `chat` | Conversazione collegata tramite `proposal_id`, con collegamento attualmente ambiguo |
| `chat_participants` | Membri della chat e ultimo messaggio letto |
| `chat_messages` | Messaggi inviati nella chat |
| `exchange_1_on_1` | Accordo formale diretto collegato a una proposta |
| `exchange_participants` | Utenti e servizi dello scambio diretto, date e accettazione |
| `exchange_group_proposal` | Catena in costruzione, estremi della ricerca e stato |
| `group_participants` | Utenti del gruppo e servizi ricevuti |
| `service_provision` | Prestazioni effettivamente concordate nel gruppo |
| `service_participants` | Erogatori e beneficiari delle singole prestazioni |
| `tokens` | Token posseduti dagli utenti e relativa scadenza |

Le chiavi esterne collegano le entità principali, ma non sostituiscono i controlli applicativi necessari per validare ownership dei servizi, compatibilità, numero e unicità dei partecipanti, chiusura della catena, autorizzazioni e transizioni di stato.

## Regole applicative necessarie

- Memorizzare le password esclusivamente come hash e mantenere univoci username ed email.
- Applicare nel backend permessi basati sui ruoli contenuti in `users.roles`.
- Escludere dagli elenchi e dal matching gli account non utilizzabili secondo le regole che verranno definite.
- Verificare che ogni servizio usato in una proposta appartenga all'utente indicato e abbia il tipo corretto nel passaggio considerato.
- Impedire scambi con se stessi e partecipanti duplicati nella stessa proposta.
- Mostrare nel feed prima le proposte da confermare e poi le nuove compatibilità.
- Aggiornare gli stati delle proposte soltanto dopo le conferme richieste.
- Creare la chat e l'accordo formale 1:1 soltanto al termine della fase di proposta.
- Limitare la ricerca della catena a tre ore e a un massimo di quattro persone.
- Verificare che l'ultimo servizio della catena soddisfi la richiesta iniziale.
- Creare prestazioni di gruppo solo per gli accordi effettivamente raggiunti in chat.
- Consentire accesso a chat e messaggi soltanto ai partecipanti.
- Non considerare spendibile un token scaduto o già utilizzato, quando il ciclo di utilizzo sarà modellato.

Le operazioni che coinvolgono conferme, creazione degli accordi e token devono essere atomiche per evitare stati parziali o duplicazioni.

## Lacune e punti da chiarire

### Requisiti non rappresentati nello schema

- **Inviti:** non esiste una tabella per link, codici, invitante o utente registrato tramite invito.
- **Segnalazioni:** non esistono tabelle per autore, utente segnalato, motivazione, stato o valutazione dello staff.
- **Azioni dello staff:** ruoli e stato account sono presenti, ma mancano permessi formalizzati e storico delle modifiche.
- **Utilizzo dei token:** mancano origine, stato, prenotazione, consumo e collegamento al servizio ottenuto.
- **Cronologia swipe:** non è memorizzato il passaggio o rifiuto di una compatibilità prima della creazione di una proposta.

### Regole funzionali da definire

- Filtri della home, ordinamento e visibilità dei servizi.
- Algoritmo di compatibilità, pesi delle categorie e soglia minima.
- Condizioni esatte per accettare o rifiutare una proposta e gestione delle proposte concorrenti.
- Evento che avvia le tre ore, comportamento alla scadenza e priorità fra gruppi di tre o quattro persone.
- Conferma, modifica, completamento, ritiro e contestazione degli accordi.
- Destinatari del token dopo un ritiro, condizioni di emissione e significato della scadenza mensile.
- Permessi dello staff, ruoli assegnabili ed effetti della disattivazione su proposte, chat e scambi in corso.

### Ambiguità e limiti tecnici dello schema attuale

- `chat.proposal_id` ha due foreign key verso tabelle differenti e non include un discriminatore del tipo di proposta.
- Diverse colonne importanti non sono `NOT NULL` e molti stati e timestamp non hanno un valore di default.
- `services.id` non è dichiarato `AUTO_INCREMENT`.
- Il database non impone il numero di partecipanti negli scambi né la validità o l'ordine della catena.
- Le foreign key non garantiscono che i servizi siano posseduti dai partecipanti o che i ruoli di erogatore e beneficiario siano coerenti.
- `tokens` non consente di ricostruire origine e utilizzo del token.
- Non sono presenti strutture per inviti, segnalazioni e audit delle operazioni dello staff.

Questi punti documentano lo stato del progetto e non costituiscono modifiche automatiche al file SQL.

## Organizzazione funzionale dell'applicazione

| Area | Contenuto previsto |
| --- | --- |
| Registrazione e login | Creazione dell'account e autenticazione di utenti e staff |
| Home | Catalogo dei servizi e filtri di ricerca |
| Swipe | Proposte da confermare e nuove persone compatibili |
| Profilo | Informazioni personali, offerte e richieste dell'utente |
| Scambi diretti | Proposte, chat e accordi 1:1 |
| Scambi di gruppo | Ricerca della catena, chat di gruppo e prestazioni concordate |
| Chat | Conversazioni, messaggi e stato di lettura |
| Token | Token posseduti e scadenze; utilizzo ancora da modellare |
| Inviti | Requisito presente, struttura dati ancora assente |
| Staff | Gestione utenti, ruoli e segnalazioni; copertura dati ancora parziale |

## Scelte tecniche confermate

- Codice in lingua inglese.
- Backend PHP organizzato a classi.
- Commenti utili, scritti il più possibile in inglese.
- Distinzione fra servizi offerti e richiesti tramite `services.type`.
- Categorizzazione molti-a-molti dei servizi per supportare il calcolo delle compatibilità.

La scelta di una singola tabella `services` con un discriminatore sostituisce, nello schema v2 corrente, l'indicazione iniziale di usare due tabelle fisicamente separate. Eventuali evoluzioni dello schema devono essere pianificate separatamente e non sono implicate da questo documento.
