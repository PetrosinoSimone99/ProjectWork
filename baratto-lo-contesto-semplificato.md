# Baratto-lo — contesto aggiornato e schema semplificato

## Scopo del documento

Questo documento descrive la versione semplificata di Baratto-lo concordata per il progetto. Contiene le regole funzionali principali e l'ultimo schema DBML utilizzato.

Il file DBML separato, pronto per dbdiagram.io, è `baratto-lo-schema-semplice.dbml`.

## Obiettivo del progetto

Baratto-lo è una piattaforma nella quale gli utenti possono:

- registrarsi e descrivere il servizio che offrono;
- pubblicare richieste di attività o servizi;
- contattare altri utenti tramite chat;
- accordarsi per uno scambio diretto 1:1;
- richiedere un servizio pagando con crediti virtuali;
- confermare l'accettazione e il completamento di un accordo.

## Utenti

Ogni utente possiede:

- nome e cognome;
- username ed email univoci;
- password salvata sotto forma di hash;
- ruolo (`UTENTE`, `STAFF` o `ADMIN`);
- stato (`ATTIVO`, `SOSPESO` o `BLOCCATO`);
- saldo disponibile e saldo bloccato;
- una descrizione del servizio offerto.

In questa versione basilare ogni utente dispone di una sola descrizione del servizio direttamente nel proprio profilo.

## Richieste

Un utente può pubblicare più richieste. Ogni richiesta contiene un titolo, una descrizione, una durata indicativa, un'eventuale tariffa in crediti e una località.

## Chat

Due utenti possono aprire una chat per discutere il servizio e mettersi d'accordo sulla proposta.

La tabella `chat` identifica i due partecipanti. La tabella `contenuto_chat` conserva i singoli messaggi, il mittente e il momento dell'invio. Il testo dei messaggi utilizza il tipo `text` e non è quindi limitato a 100 caratteri.

## Tipi di accordo

### Scambio diretto 1:1

La tabella `accordo_1_a_1` rappresenta uno scambio nel quale entrambi gli utenti svolgono un'attività per l'altro.

L'accordo registra:

- i due utenti;
- la durata delle due attività;
- l'accettazione di entrambi;
- la conferma di completamento di entrambi;
- lo stato dell'accordo.

### Accordo con pagamento in crediti

La tabella `accordo_richiesta` rappresenta il caso nel quale un utente richiede un'attività e l'altro la eroga in cambio di crediti.

L'accordo registra il richiedente, l'erogatore, la durata dell'attività, la tariffa in crediti, l'accettazione dell'erogatore, la conferma del richiedente e lo stato.

## Regola per guadagnare crediti con gli scambi

Quando uno scambio diretto 1:1 viene completato correttamente:

1. entrambi gli utenti devono avere confermato il completamento;
2. lo stato dell'accordo passa a `COMPLETATO`;
3. ciascuno dei due utenti riceve **10 crediti** nel proprio `saldo_disponibile`;
4. i 10 crediti devono essere assegnati una sola volta per accordo.

Quindi uno scambio 1:1 completato genera complessivamente 20 nuovi crediti: 10 per ciascun partecipante. Questa scelta permette agli utenti di iniziare a guadagnare crediti facilmente attraverso gli scambi.

L'aggiornamento dei due saldi e il completamento dell'accordo devono avvenire nella stessa operazione del backend, per evitare assegnazioni parziali o ripetute.

## Stati degli accordi

Gli stati previsti sono:

```text
PROPOSTO
ACCETTATO
IN_ESECUZIONE
COMPLETATO
CONTESTATO
ANNULLATO
```

Soltanto lo stato `COMPLETATO` consente l'assegnazione dei 10 crediti a testa nello scambio diretto 1:1.

## Schema DBML aggiornato

```dbml
Enum stato_accordo {
  PROPOSTO
  ACCETTATO
  IN_ESECUZIONE
  COMPLETATO
  CONTESTATO
  ANNULLATO
}

Table utenti {
  id int [pk, increment]
  nome varchar(50)
  cognome varchar(50)
  username varchar(50) [not null, unique]
  email varchar(45) [not null, unique]
  password_hash varchar(255) [not null]
  ruolo varchar(20) [not null, default: 'UTENTE', note: 'UTENTE, STAFF o ADMIN']
  stato varchar(20) [not null, default: 'ATTIVO', note: 'ATTIVO, SOSPESO o BLOCCATO']
  saldo_disponibile int [not null, default: 0]
  saldo_bloccato int [not null, default: 0]
  creato_il timestamp [not null]
  descrizione_servizio varchar(100) [not null]
}

Table richieste {
  id int [pk, increment]
  utente_id int [not null]
  titolo varchar(100) [not null]
  descrizione text [not null]
  tariffa_oraria_crediti int [note: 'Facoltativa per le richieste']
  durata_minuti int
  localita varchar(100)
  creato_il timestamp [not null]
}

Table chat {
  id int [pk, increment]
  utente_1 int [not null]
  utente_2 int [not null]
}

Table contenuto_chat {
  id int [pk, increment]
  messaggio text
  id_utente int
  id_chat int
  timestamp_messaggio timestamp
}

Table accordo_1_a_1 {
  id int [pk, increment]
  data_creazione timestamp
  utente_1 int
  utente_2 int
  durata_attivita_utente1 int
  durata_attivita_utente2 int
  accettazione_utente1 boolean
  accettazione_utente2 boolean
  completamento_utente1 boolean
  completamento_utente2 boolean
  stato stato_accordo
}

Table accordo_richiesta {
  id int [pk, increment]
  data_creazione timestamp
  utente_richiedente int
  utente_erogatore int
  durata_attivita_erogatore int
  tariffa_credito int
  accettazione_utente_erogatore boolean
  completamento_utente_richiedente boolean
  stato stato_accordo
}

Ref: richieste.utente_id > utenti.id

Ref: chat.utente_1 > utenti.id

Ref: chat.utente_2 > utenti.id

Ref: contenuto_chat.id_utente > utenti.id

Ref: contenuto_chat.id_chat > chat.id

Ref: accordo_1_a_1.utente_1 > utenti.id

Ref: accordo_1_a_1.utente_2 > utenti.id

Ref: accordo_richiesta.utente_richiedente > utenti.id

Ref: accordo_richiesta.utente_erogatore > utenti.id
```

## Regole applicative essenziali

- Username ed email devono essere univoci.
- Le password non devono mai essere salvate in chiaro.
- Soltanto gli utenti coinvolti possono accettare o completare un accordo.
- Un accordo annullato o contestato non genera crediti.
- I 10 crediti dello scambio 1:1 devono essere assegnati soltanto dopo la conferma di entrambi.
- Lo stesso accordo non deve poter generare crediti più di una volta.
- Un utente non deve poter creare uno scambio con se stesso.
- Il mittente di un messaggio deve appartenere alla chat indicata.

## Modifica successiva — inviti mensili con codice

È stata aggiunta allo schema SQL la tabella `inviti`; non sono state ancora aggiunte API o pagine del sito per usare questa funzionalità.

La tabella contiene:

- `id` come chiave primaria;
- `invitante_id`, riferimento obbligatorio all'utente che genera il codice;
- `invitato_id`, riferimento all'utente che riscatta il codice, inizialmente `NULL`;
- `codice`, univoco, di esattamente 8 caratteri maiuscoli alfanumerici (`A-Z` e `0-9`);
- `mese_invito`, impostato al primo giorno del mese solare in cui il codice è valido;
- `creato_il` e `riscattato_il` per tracciare generazione e uso del codice.

Regole già protette dal database:

- ogni invitante può generare un solo codice per mese solare;
- un codice è unico e, lato applicativo futuro, è valido solo nel mese indicato da `mese_invito`;
- lo stesso account può essere invitato e riscattare un codice una sola volta in assoluto;
- invitante e invitato non possono coincidere;
- `invitato_id` e `riscattato_il` devono essere entrambi vuoti prima del riscatto oppure entrambi valorizzati dopo il riscatto;
- le chiavi esterne verso `utenti` usano `ON DELETE RESTRICT` e `ON UPDATE RESTRICT`, per mantenere coerente lo storico degli inviti e dei crediti assegnati.

Quando verranno sviluppate le API, il riscatto dovrà avvenire in un'unica transazione: validare codice e utente, associare invitato e data di riscatto, poi accreditare 10 crediti a `utenti.saldo_disponibile` dell'invitante. La tabella non assegna crediti automaticamente e non sono presenti trigger o stored procedure.
