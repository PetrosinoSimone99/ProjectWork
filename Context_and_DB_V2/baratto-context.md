# Baratto-lo — nuovo contesto del progetto dalle user stories v2

## Scopo e fonti

Questo documento descrive la versione obiettivo di Baratto-lo sulla base di `new_user_stories_v2.md`, prendendo come riferimento organizzativo `baratto-lo-contesto-semplificato.md`.

Sono considerate soltanto le parti non commentate delle nuove user stories. Il documento definisce il progetto da realizzare: non descrive funzionalità già implementate e non certifica la compatibilità con il database attuale. La sua creazione non comporta modifiche al codice, agli schemi o ai dati esistenti.

Nel seguito:

- **Requisito** indica una funzionalità esplicitamente richiesta dalle nuove user stories o dalle relative note attive.
- **Proposta progettuale** indica una possibile struttura per realizzarla, da validare prima dell'implementazione.
- **Da definire** indica una regola che le fonti non specificano e che non viene quindi considerata già approvata.

## Obiettivo del progetto

Baratto-lo è una piattaforma senza scopo di lucro per lo scambio di servizi tra utenti, con funzionalità a supporto dell'affidabilità delle interazioni.

Le persone possono pubblicare ciò che offrono e indicare ciò che cercano, consultare i servizi, scoprire altri utenti tramite swipe, comunicare in chat e formalizzare un accordo. Lo scambio può coinvolgere due persone oppure una catena di tre o quattro persone quando manca un match diretto.

I token costituiscono un meccanismo previsto per il caso di ritiro di un partecipante da uno scambio a tre o quattro persone. Possono essere utilizzati per ottenere un servizio offerto da un'altra persona e hanno scadenza mensile.

## Attori, accesso e profili

### Utente

L'utente deve poter:

- registrarsi ed effettuare il login;
- creare e personalizzare il proprio profilo;
- pubblicare servizi offerti, disponibili anche nella scoperta tramite swipe;
- cercare un servizio applicando filtri;
- vedere tramite swipe persone potenzialmente interessate al proprio servizio;
- invitare un amico;
- chattare con altri utenti e creare accordi nella chat;
- partecipare a scambi diretti o a catene fino a quattro persone;
- ricevere e utilizzare token nei casi previsti;
- segnalare un altro utente.

### Staff

Lo staff deve poter effettuare il login, attivare o disattivare utenti, cambiare i loro ruoli ed esaminare le segnalazioni ricevute.

**Proposta progettuale:** distinguere almeno i ruoli `USER` e `STAFF` e gli stati account `ACTIVE` e `INACTIVE`. Le nuove user stories non richiedono un ruolo amministrativo separato. La gestione dei ruoli deve avere controlli espliciti sui permessi.

**Da definire:** ruoli effettivamente assegnabili dallo staff, limiti alle modifiche del proprio ruolo ed effetti della disattivazione su chat e accordi già aperti.

### Dati del profilo

**Proposta progettuale:** mantenere identificativo, username, email, hash della password, nome visualizzato, presentazione personale, eventuale immagine e località. Le informazioni di autenticazione devono rimanere distinte dai dati pubblici del profilo.

I servizi offerti e quelli cercati devono essere conservati in tabelle dedicate: non basta una sola descrizione del servizio all'interno del profilo. Un nuovo utente parte con **zero token**.

## Servizi offerti e servizi cercati

**Requisito:** il database deve contenere una tabella per ciò che gli utenti offrono e una tabella per ciò che cercano.

Questa separazione permette di rappresentare più offerte e più esigenze della stessa persona e di confrontarle per individuare possibili scambi.

**Proposta progettuale:** ciascuna offerta o ricerca contiene proprietario, titolo, descrizione, stato di pubblicazione e date di creazione e aggiornamento. Località, modalità di erogazione, disponibilità e durata indicativa possono essere aggiunte per supportare ricerca e accordi.

La pubblicazione di un'offerta la rende consultabile nella home e utilizzabile nelle schede di scoperta, se l'account e l'offerta sono attivi. Le ricerche esprimono i bisogni dell'utente e alimentano la valutazione della compatibilità.

**Da definire:** campi obbligatori, filtri effettivi, eventuale classificazione dei servizi, modalità di inserimento delle esigenze e criteri di compatibilità. Le user stories attive non impongono una specifica tecnica di raccomandazione.

## Home, ricerca e swipe

### Home dei servizi

**Requisito:** la prima pagina è la home con tutti i servizi. Deve consentire di consultare le offerte e cercare servizi tramite filtri.

**Proposta progettuale:** mostrare le offerte pubblicate e attive, con collegamenti al dettaglio e al profilo dell'offerente. I filtri possono comprendere testo, località, disponibilità e modalità di erogazione, una volta definiti i dati da raccogliere.

**Da definire:** possibilità di consultare la home senza autenticazione e azioni riservate agli utenti autenticati.

### Pagina swipe

**Requisito:** gli swipe devono essere disponibili in una pagina distinta dalla home, con un'interazione simile a Tinder. Devono permettere di vedere persone potenzialmente interessate al servizio dell'utente e rendere le offerte esplorabili tramite swipe.

**Proposta progettuale:** una scheda mostra la persona, una sua offerta e gli elementi che rendono plausibile lo scambio. L'utente può esprimere interesse oppure passare alla scheda successiva; la scelta viene registrata rispetto all'offerta presentata.

Un possibile match diretto si verifica quando due utenti esprimono interesse reciproco e i rispettivi servizi soddisfano ciò che cercano. Questa è una proposta di definizione: il significato preciso del match va concordato.

Il match rappresenta un'opportunità di scambio. L'impegno viene formalizzato successivamente mediante un accordo nella chat.

## Ricerca di scambi a tre o quattro persone

**Requisito:** quando manca un match diretto, il software cerca per **tre ore** una terza ed eventualmente una quarta persona per formare una catena di scambio. Il limite massimo è di **quattro partecipanti**.

**Proposta progettuale:** rappresentare gli scambi come cicli nei quali ogni partecipante offre un servizio a qualcuno e riceve un servizio da qualcun altro:

- scambio diretto: A offre a B e B offre ad A;
- catena a tre: A offre a B, B offre a C e C offre ad A;
- catena a quattro: A offre a B, B offre a C, C offre a D e D offre ad A.

Per ciascun passaggio deve essere chiaro quale offerta soddisfa quale esigenza. I partecipanti devono essere persone distinte e le offerte coinvolte devono essere disponibili.

### Ciclo della ricerca

**Proposta progettuale:**

1. Il sistema rileva l'assenza di un match diretto secondo un criterio da definire.
2. Registra una ricerca con orario di avvio e termine fissato tre ore dopo.
3. Cerca combinazioni compatibili di tre o quattro partecipanti nella finestra prevista.
4. Presenta la catena individuata come proposta da discutere e accettare.
5. Se non trova una soluzione entro il termine, chiude la ricerca senza creare un accordo automaticamente.

**Da definire:** evento che avvia il conteggio, priorità fra catene di diversa dimensione, possibilità di più proposte contemporanee, gestione di un match diretto sopraggiunto e possibilità di ripetere la ricerca. Va inoltre deciso se la ricerca si interrompe alla prima proposta o continua fino all'accettazione o alla scadenza. Le tre ore riguardano la ricerca; non è indicato un termine per accettare o svolgere lo scambio.

## Chat e accordi

### Conversazioni

**Requisito:** un utente deve poter chattare con un altro utente e creare un accordo o contratto all'interno della chat.

**Proposta progettuale:** supportare conversazioni a due e conversazioni di gruppo per le catene, così che tutti i partecipanti possano vedere e accettare le stesse condizioni. Le chat di gruppo sono una scelta di supporto agli scambi multipli, non una user story separata.

Ogni messaggio registra conversazione, mittente, testo e data. L'eventuale ultimo messaggio letto va associato alla partecipazione dell'utente alla singola chat.

### Contenuto dell'accordo

**Proposta progettuale:** usare un modello comune di accordo, collegato alla chat di origine, che descriva:

- tipo: scambio diretto, catena oppure servizio ottenuto tramite token;
- partecipanti coinvolti;
- servizi e condizioni concordate;
- chi eroga ogni servizio e chi lo riceve;
- tempi o disponibilità concordati;
- accettazione individuale delle condizioni;
- avanzamento e conferme delle singole prestazioni;
- eventuali ritiri e relative date;
- stato complessivo e storico delle modifiche rilevanti.

La parola “contratto” identifica qui l'accordo registrato nell'applicazione. Le user stories non specificano firme elettroniche o un particolare valore legale.

### Stati e conferme

**Proposta progettuale:** adottare gli stati `PROPOSED`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` e `DISPUTED`.

Tutti i partecipanti devono accettare la stessa versione delle condizioni prima dell'avvio. Una modifica sostanziale richiede nuove accettazioni. Per completare un accordo occorre verificare le prestazioni previste secondo una regola condivisa.

**Da definire:** chi conferma ciascuna prestazione, come trattare prestazioni parziali, disaccordi sul completamento e rifiuti. Va stabilito anche se il ritiro annulla l'intera catena, consente una sostituzione o permette di proseguire le prestazioni residue. Queste decisioni incidono direttamente sui token compensativi.

## Token

### Regole esplicite

- Ogni nuovo utente parte con **0 token**.
- È previsto il guadagno di **un token** quando una persona si ritira da uno scambio di **tre o quattro persone**.
- Un token può essere speso per un servizio offerto da un'altra persona.
- Tutti i token hanno **scadenza mensile**.

Le nuove user stories non prevedono token come premio per registrazione, inviti o normale completamento di uno scambio diretto. Non è previsto un sistema generale di crediti da guadagnare e spendere.

### Assegnazione in caso di ritiro

**Da definire:** la fonte non precisa quale partecipante abbia diritto al token, né se ne abbiano diritto tutti i partecipanti rimasti o soltanto quelli danneggiati o che abbiano già svolto una prestazione. Non specifica inoltre in quale fase il ritiro generi il diritto, chi lo accerti e come trattare più ritiri nella stessa catena.

Non si deve quindi interpretare il requisito come assegnazione automatica di un token a ogni membro della catena. Prima dell'implementazione occorre concordare destinatari, condizioni e limite di assegnazione.

**Proposta progettuale:** registrare il ritiro e collegare ogni token emesso all'accordo, all'evento che lo ha generato e al beneficiario. L'assegnazione deve essere tracciabile e non ripetibile per lo stesso diritto alla compensazione.

### Utilizzo e scadenza

**Proposta progettuale:** registrare i token singolarmente, con proprietario, origine, data di emissione, data di scadenza, stato ed eventuale accordo di utilizzo. Gli stati possono essere `AVAILABLE`, `RESERVED`, `SPENT` ed `EXPIRED`.

Il numero di token disponibili deriva da quelli appartenenti all'utente, non scaduti e non già impegnati o spesi. La validità deve essere verificata al momento dell'utilizzo, anche se un processo periodico non ha ancora aggiornato lo stato.

**Da definire prima dello sviluppo:**

- se “scadenza mensile” significhi fine del mese solare o un mese dalla data di emissione, con relativo fuso orario;
- se un token dia diritto a qualunque servizio e quali limiti abbia la prestazione ottenibile;
- come l'offerente accetti una richiesta tramite token;
- quando riservare e quando consumare definitivamente il token;
- se il token venga consumato dal sistema oppure trasferito all'erogatore;
- cosa accada in caso di annullamento, mancata prestazione o scadenza mentre il token è riservato.

Non va introdotta una tariffa oraria o una conversione da crediti a token senza un requisito aggiuntivo.

## Inviti

**Requisito:** l'utente deve poter invitare un amico.

**Proposta progettuale:** generare un link o un codice condivisibile e registrare l'eventuale registrazione dell'amico tramite quell'invito.

Le nuove user stories non specificano premi, numero massimo di inviti, formato del codice o durata di validità. I limiti mensili e il premio in crediti presenti nel contesto precedente non diventano requisiti della nuova versione.

## Segnalazioni e affidabilità

**Requisito:** gli utenti possono segnalare altri utenti; lo staff può esaminare le segnalazioni e attivare o disattivare account.

**Proposta progettuale:** una segnalazione registra autore, utente segnalato, motivazione, descrizione, data ed eventuale riferimento a una chat o a un accordo. Lo staff può registrare presa in carico ed esito, con stati come `OPEN`, `IN_REVIEW` e `CLOSED`.

Le azioni dello staff su account e ruoli devono essere tracciabili. Accordi, conferme e ritiri offrono lo storico necessario per ricostruire le interazioni contestate.

**Da definire:** motivazioni disponibili, informazioni consultabili dallo staff, gestione delle segnalazioni duplicate e possibili esiti. Non sono richiesti punteggi reputazionali o recensioni numeriche.

## Organizzazione dell'applicazione

**Proposta progettuale:** organizzare l'interfaccia nelle seguenti aree, coerenti con le funzionalità richieste.

| Area | Contenuto |
| --- | --- |
| Registrazione e login | Creazione dell'account e autenticazione di utenti e staff |
| Home | Catalogo dei servizi e filtri di ricerca |
| Swipe | Schede di persone e offerte, interesse e possibili match |
| Profilo | Personalizzazione e consultazione delle informazioni pubbliche |
| Offro e cerco | Gestione delle proprie offerte ed esigenze |
| Scambi | Ricerche di catene, proposte e accordi attivi o conclusi |
| Chat | Messaggi e creazione o consultazione degli accordi |
| Token | Token disponibili, impegnati, utilizzati e scaduti |
| Inviti | Creazione e condivisione dell'invito |
| Staff | Gestione utenti, ruoli e segnalazioni |

## Modello dati concettuale proposto

La tabella seguente sostituisce, a livello di progettazione, il vecchio schema centrato su crediti e accordi separati. Non è una migrazione SQL, non riproduce il database attuale e non modifica alcun file DBML. I nomi proposti sono in inglese, coerentemente con le scelte delle nuove user stories.

| Entità proposta | Responsabilità e relazioni principali |
| --- | --- |
| `users` | Credenziali, profilo, ruolo e stato dell'account; nessun saldo di crediti |
| `service_offers` | Più servizi offerti per utente, con dati e stato di pubblicazione |
| `service_requests` | Più servizi cercati per utente, separati dalle offerte |
| `swipes` | Scelte di interesse o passaggio, con autore e offerta mostrata |
| `matches` | Compatibilità dirette individuate e riferimenti alle offerte e alle esigenze coinvolte |
| `chain_searches` | Ricerca di una catena, contesto iniziale, avvio, termine delle tre ore e stato |
| `chain_candidates` | Soluzioni candidate collegate alla ricerca, prima della creazione di un accordo |
| `chain_candidate_steps` | Passaggi delle catene candidate, con erogatore, beneficiario, offerta ed esigenza soddisfatta |
| `chats` | Conversazioni dirette o di gruppo |
| `chat_participants` | Associazione fra chat e utenti; eventuale ultimo messaggio letto nella chat |
| `chat_messages` | Messaggi, mittente, chat e data di invio |
| `agreements` | Accordo collegato alla chat, tipo, versione delle condizioni, stato e date |
| `agreement_participants` | Partecipanti distinti e accettazione individuale della versione proposta |
| `agreement_services` | Singole prestazioni concordate, erogatore, beneficiario e conferme di esecuzione |
| `agreement_withdrawals` | Ritiri registrati, partecipante, accordo, momento e motivazione |
| `tokens` | Token individuali, titolare, ritiro di origine, emissione, scadenza e stato |
| `token_usages` | Prenotazione e utilizzo del token in un accordo per ottenere un servizio |
| `invitations` | Invitante, codice o link, eventuale invitato e date |
| `user_reports` | Segnalante, segnalato, motivo, riferimenti contestuali e stato di esame |
| `staff_actions` | Storico delle operazioni dello staff su account, ruoli e segnalazioni |

Offerte e ricerche hanno una relazione molti-a-uno con il rispettivo proprietario. Utenti e chat, così come utenti e accordi, sono collegati tramite tabelle di partecipazione. Le singole prestazioni dell'accordo esplicitano la direzione di ciascuno scambio.

Un accordo diretto coinvolge due persone; una catena tre o quattro; un servizio ottenuto tramite token coinvolge richiedente ed erogatore. Le condizioni di una prestazione vanno conservate nell'accordo, così che successive modifiche all'offerta non alterino lo storico concordato.

I vincoli di unicità per assegnazione e utilizzo dei token dipenderanno dalle regole ancora da decidere. Le chiavi esterne da sole non assicurano una catena valida, il numero corretto di partecipanti o il rispetto delle tre ore: servono anche controlli applicativi.

## Regole applicative proposte

- Credenziali univoche e password memorizzate soltanto sotto forma di hash.
- Autorizzazioni verificate nel backend per profili, pubblicazioni, chat, accordi e operazioni dello staff.
- Nessuno scambio con se stessi e nessun partecipante duplicato nella stessa catena.
- Messaggi inviabili e consultabili soltanto dai partecipanti autorizzati alla conversazione.
- Accettazioni e conferme attribuite soltanto all'utente interessato e alla corretta versione dell'accordo.
- Coerenza fra servizi, proprietari, erogatori e beneficiari dei singoli passaggi.
- Ricerca delle catene limitata alla finestra di tre ore, secondo l'evento di avvio da concordare.
- Nessun utilizzo di token scaduti o già consumati e nessuna doppia assegnazione della stessa compensazione.
- Assegnazione, prenotazione e consumo dei token gestiti con operazioni atomiche e controlli sulla concorrenza.
- Conservazione dello storico necessario a ricostruire accordi, ritiri, token e interventi dello staff.

Queste regole completano tecnicamente il contesto proposto; non sostituiscono le decisioni funzionali ancora aperte.

## Scelte tecniche richieste

- Codice in lingua inglese.
- Backend PHP organizzato a classi.
- Commenti utili, scritti il più possibile in inglese.
- Tabelle separate per servizi offerti e servizi cercati.

**Proposta progettuale:** separare nel backend autenticazione, profili, servizi, matching, ricerca delle catene, chat, accordi, token, inviti e moderazione. La ricerca temporizzata e la gestione delle scadenze richiedono un meccanismo di esecuzione lato server; la tecnologia specifica resta da scegliere.

Le nuove user stories non impongono un cambio del framework frontend o del motore database. Eventuali adattamenti dello stack esistente appartengono alla successiva fase di implementazione.

## Differenze rispetto al contesto precedente

| Contesto precedente | Nuova versione obiettivo |
| --- | --- |
| Una descrizione del servizio nel profilo | Offerte e ricerche in tabelle dedicate |
| Scoperta basata su richieste e contatto | Home dei servizi, filtri e pagina swipe distinta |
| Scambio diretto 1:1 | Scambio diretto e catene di tre o quattro persone |
| Nessuna ricerca temporizzata di catene | Ricerca della terza e quarta persona per tre ore quando manca il match diretto |
| Dieci crediti a testa al completamento dello scambio | Nessun premio ordinario previsto; token per il caso di ritiro dalle catene |
| Prestazioni con pagamento in crediti | Possibilità di ottenere un servizio utilizzando un token |
| Saldo disponibile e saldo bloccato in crediti | Token con origine, utilizzo e scadenza mensile tracciabili |
| Inviti mensili con premio in crediti | Invito a un amico, senza premi o limiti specificati nelle nuove user stories |
| Accordi separati per scambio e prestazione | Modello comune proposto per accordi diretti, catene e servizi tramite token |
| Funzioni staff non sviluppate nel contesto funzionale | Accesso staff, attivazione e disattivazione utenti, cambio ruoli ed esame segnalazioni |

Queste differenze descrivono la destinazione del progetto, non autorizzano cancellazioni o conversioni dei dati attuali. L'eventuale trattamento dei crediti e degli accordi preesistenti richiede un piano di migrazione successivo.

## Decisioni necessarie prima dell'implementazione

Le principali regole ancora da concordare sono: definizione del match e dei filtri; avvio e gestione della ricerca di tre ore; accettazione e completamento delle catene; effetti del ritiro; destinatari e condizioni di emissione del token; interpretazione della scadenza mensile; ciclo di utilizzo del token; permessi dello staff e conseguenze della disattivazione degli account.

La definizione di questi aspetti permetterà di trasformare il presente contesto in schema dati, API e interfacce coerenti senza introdurre requisiti non approvati.
