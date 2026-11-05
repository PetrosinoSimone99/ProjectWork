> **Documento storico v2.** Queste descrizioni non rappresentano le funzionalità correnti. Per lo schema usare esclusivamente il dump indicato in `LAST_DB_TO_USE.txt`; per le API correnti consultare `API docs/DATABASE_AND_API_GUIDE.md`. Swipe, decisioni sulle proposte, catene e token di compensazione non hanno più API o elaborazione applicativa. JWT resta disponibile. Il codice chat è conservato, ma le sue tabelle non sono presenti nel dump di riferimento.

# Baratto-lo — contesto del progetto e database v2

## Scopo e fonti

Questo documento descrive Baratto-lo alla luce delle user stories v2 e dello schema presente in `barattolo_v2.sql`.

Le fonti hanno ruoli distinti:

- `barattolo_v2.sql` è la fonte autorevole per tabelle, colonne, enum e relazioni attualmente progettati;
- `database_doc_spiegazione.md` fornisce ulteriori spiegazioni sul modello dei dati;
- `new_user_stories_v2.md` definisce i requisiti funzionali, compresi quelli che il database non rappresenta ancora.

Il documento distingue quindi fra:

- **Presente nello schema:** struttura definita nel file SQL;
- **Comportamento previsto:** flusso descritto nelle fonti, ma non necessariamente garantito dal solo database;
- **Da definire o implementare:** requisito incompleto, ambiguo o non ancora rappresentato nello schema.

Non vengono descritte funzionalità come già implementate quando le fonti esprimono soltanto un obiettivo. Il presente documento non modifica il database, il codice o i dati esistenti.

## Obiettivo del progetto

Baratto-lo è una piattaforma senza scopo di lucro per lo scambio di servizi tra utenti, con funzionalità a supporto dell'affidabilità delle interazioni.

Le persone possono registrarsi, pubblicare ciò che offrono e cercano, consultare i servizi e definire scambi diretti.

## Attori e requisiti

### Utente

L'utente deve poter:

- registrarsi ed effettuare il login;
- creare e personalizzare il proprio profilo;
- pubblicare uno o più servizi offerti e indicare i servizi richiesti;
- consultare i servizi nella home e cercarli tramite filtri;
- invitare un amico;
- concordare uno scambio diretto;
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

### Servizi offerti e richiesti

Il database usa una sola tabella `services` per entrambi i tipi di servizio. La colonna `type` distingue esattamente:

- `RICHIESTA`: servizio cercato dall'utente;
- `OFFERTA`: servizio offerto dall'utente.

Ogni servizio può essere collegato al proprietario tramite `user_id` e contiene una descrizione e una data di creazione. Lo schema non definisce titolo, stato di pubblicazione, aggiornamento, disponibilità o modalità di erogazione.

La classificazione è gestita da `categories` e dalla tabella ponte `service_categories`. Un servizio può appartenere a più categorie; questa relazione molti-a-molti permette di classificare i servizi.

## Home e ricerca

### Home dei servizi

La prima pagina prevista è la home con tutti i servizi offerti e i filtri di ricerca. Il database fornisce servizi, tipo, descrizione, proprietario e categorie, ma non contiene campi dedicati alla pubblicazione o alla visibilità.

**Da definire:** filtri disponibili, ordinamento, consultazione senza autenticazione e criteri con cui escludere utenti o servizi non attivi.

## Scambio diretto 1:1

L'accordo formale diretto è rappresentato da `exchange_1_on_1`, che contiene località, data di creazione e stato `IN_ATTESA`, `ACCETTATO` o `RIFIUTATO`.

`exchange_participants` associa accordo, utente e servizio e registra data di inizio, data di completamento e il booleano `exchange_accepted`.

Lo schema consente di rappresentare l'accettazione e il completamento dei singoli partecipanti, ma non definisce chi possa dichiarare completato il servizio, come gestire un mancato adempimento o se una modifica ai dettagli richieda nuove conferme.

## Mappa del database v2

La mappa riporta le strutture pertinenti alle funzionalità trattate in questo documento, senza descrivere l’intero schema SQL.

| Tabella | Responsabilità e relazioni attuali |
| --- | --- |
| `users` | Credenziali, profilo essenziale, ruoli JSON e stato dell'account |
| `services` | Servizi `RICHIESTA` e `OFFERTA`, associati al proprietario |
| `categories` | Catalogo delle categorie dei servizi |
| `service_categories` | Relazione molti-a-molti fra servizi e categorie |
| `exchange_1_on_1` | Accordo formale diretto |
| `exchange_participants` | Utenti e servizi dello scambio diretto, date e accettazione |

Le chiavi esterne collegano le entità principali, ma non sostituiscono i controlli applicativi su proprietà dei servizi, unicità dei partecipanti, autorizzazioni e transizioni di stato.

## Regole applicative necessarie

- Memorizzare le password esclusivamente come hash e mantenere univoci username ed email.
- Applicare nel backend permessi basati sui ruoli contenuti in `users.roles`.
- Escludere dagli elenchi gli account non utilizzabili secondo le regole che verranno definite.
- Verificare che ogni servizio coinvolto in un accordo appartenga all'utente indicato e abbia il tipo corretto.
- Impedire scambi con se stessi e partecipanti duplicati nello stesso accordo.
- Gestire le operazioni sugli accordi in modo atomico per evitare stati parziali o duplicazioni.

## Lacune e punti da chiarire

### Requisiti non rappresentati nello schema

- **Inviti:** non esiste una tabella per link, codici, invitante o utente registrato tramite invito.
- **Segnalazioni:** non esistono tabelle per autore, utente segnalato, motivazione, stato o valutazione dello staff.
- **Azioni dello staff:** ruoli e stato account sono presenti, ma mancano permessi formalizzati e storico delle modifiche.

### Regole funzionali da definire

- Filtri della home, ordinamento e visibilità dei servizi.
- Conferma, modifica, completamento, ritiro e contestazione degli accordi.
- Permessi dello staff, ruoli assegnabili ed effetti della disattivazione sugli scambi in corso.

### Ambiguità e limiti tecnici dello schema attuale

- Diverse colonne importanti non sono `NOT NULL` e molti stati e timestamp non hanno un valore di default.
- `services.id` non è dichiarato `AUTO_INCREMENT`.
- Le foreign key non garantiscono che i servizi siano posseduti dai partecipanti o che i ruoli di erogatore e beneficiario siano coerenti.
- Non sono presenti strutture per inviti, segnalazioni e audit delle operazioni dello staff.

Questi punti documentano lo stato del progetto e non costituiscono modifiche automatiche al file SQL.

## Organizzazione funzionale dell'applicazione

| Area | Contenuto previsto |
| --- | --- |
| Registrazione e login | Creazione dell'account e autenticazione di utenti e staff |
| Home | Catalogo dei servizi e filtri di ricerca |
| Profilo | Informazioni personali, offerte e richieste dell'utente |
| Scambi diretti | Accordi 1:1 e relativi partecipanti |
| Inviti | Requisito presente, struttura dati ancora assente |
| Staff | Gestione utenti, ruoli e segnalazioni; copertura dati ancora parziale |

## Scelte tecniche confermate

- Codice in lingua inglese.
- Backend PHP organizzato a classi.
- Commenti utili, scritti il più possibile in inglese.
- Distinzione fra servizi offerti e richiesti tramite `services.type`.
- Categorizzazione molti-a-molti dei servizi.

La scelta di una singola tabella `services` con un discriminatore sostituisce, nello schema v2 corrente, l'indicazione iniziale di usare due tabelle fisicamente separate. Eventuali evoluzioni dello schema devono essere pianificate separatamente e non sono implicate da questo documento.
