# Baratto-lo — contesto aggiornato e schema semplificato

## Scopo del documento

Questo documento descrive la versione semplificata di Baratto-lo concordata per il progetto. Contiene le regole funzionali principali e l'ultimo schema DBML utilizzato.

Lo schema DBML qui sotto è aggiornato al dump `barattolo_ale_09092026.sql` del 9 settembre 2026. Il file separato `baratto-lo-schema-semplice.dbml` resta riferito alla versione precedente.

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

La tabella `chat` identifica la conversazione; `partecipanti_chat` associa utenti e chat tramite la chiave primaria composta (`id_chat`, `id_utente`), rappresentando una relazione molti-a-molti. La tabella `messaggi_chat` (prima `contenuto_chat`) conserva i singoli messaggi, il mittente e il momento dell'invio in `data_creazione`. Il testo dei messaggi utilizza il tipo `text` e non è quindi limitato a 100 caratteri.

Il campo facoltativo `utenti.id_ultimo_messaggio_letto` fa riferimento a `messaggi_chat.id`: è un riferimento unico per utente, non distinto per chat.

## Tipi di accordo

### Scambio diretto 1:1

La tabella `accordi_1_a_1` rappresenta uno scambio nel quale entrambi gli utenti svolgono un'attività per l'altro.

L'accordo registra:

- i due utenti;
- la durata delle due attività;
- l'accettazione di entrambi;
- la conferma di completamento di entrambi;
- lo stato dell'accordo.

Gli utenti, la durata di ciascuna attività, l'accettazione e il completamento sono registrati in `partecipanti_accordo_1_a_1`, con chiave primaria composta (`id_accordo`, `id_utente`). `accordi_1_a_1` conserva lo stato obbligatorio e le date di creazione, inizio e fine; le ultime due sono facoltative.

### Accordo con pagamento in crediti

La tabella `accordi_prestazione` (prima `accordo_richiesta`) rappresenta il caso nel quale un utente beneficia di un'attività e l'altro la eroga in cambio di crediti. Il campo obbligatorio `tipo` distingue `Offerta` e `Richiesta`.

L'accordo registra la durata dell'attività (`durata_attivita`), i `crediti`, le date di creazione, inizio e fine e lo stato. La tabella `partecipanti_accordo_prestazione`, con chiave primaria composta (`id_accordo`, `id_utente`), registra ciascun utente, il suo ruolo obbligatorio (`Beneficiario` o `Erogatore`) e la sua `accettazione`. La conferma `completamento_beneficiario` rimane in `accordi_prestazione`, perché riguarda soltanto il beneficiario.

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

Enum tipo_prestazione {
  Offerta
  Richiesta
}

Enum ruolo_partecipante {
  Beneficiario
  Erogatore
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
  creato_il timestamp [not null, default: `CURRENT_TIMESTAMP`]
  descrizione_servizio varchar(100) [not null]
  id_ultimo_messaggio_letto int
}

Table richieste {
  id int [pk, increment]
  utente_id int [not null]
  titolo varchar(100) [not null]
  descrizione text [not null]
  tariffa_oraria_crediti int [note: 'Facoltativa per le richieste']
  durata_minuti int
  localita varchar(100)
  creato_il timestamp [not null, default: `CURRENT_TIMESTAMP`]
}

Table chat {
  id int [pk, increment]
}

Table partecipanti_chat {
  id_chat int [not null]
  id_utente int [not null]

  indexes {
    (id_chat, id_utente) [pk]
  }
}

Table messaggi_chat {
  id int [pk, increment]
  id_chat int
  id_utente int
  messaggio text
  data_creazione timestamp [not null, default: `CURRENT_TIMESTAMP`]
}

Table accordi_1_a_1 {
  id int [pk, increment]
  data_creazione timestamp [not null, default: `CURRENT_TIMESTAMP`]
  data_inizio timestamp
  data_fine timestamp
  stato stato_accordo [not null]
}

Table partecipanti_accordo_1_a_1 {
  id_accordo int [not null]
  id_utente int [not null]
  durata_attivita int
  accettazione boolean
  completamento boolean

  indexes {
    (id_accordo, id_utente) [pk]
  }
}

Table accordi_prestazione {
  id int [pk, increment]
  tipo tipo_prestazione [not null]
  durata_attivita int
  crediti int
  data_creazione timestamp [not null, default: `CURRENT_TIMESTAMP`]
  data_inizio timestamp
  data_fine timestamp
  completamento_beneficiario boolean
  stato stato_accordo
}

Table partecipanti_accordo_prestazione {
  id_accordo int [not null]
  id_utente int [not null]
  ruolo ruolo_partecipante [not null]
  accettazione boolean

  indexes {
    (id_accordo, id_utente) [pk]
  }
}

Table inviti {
  id int [pk, increment]
  invitante_id int [not null]
  invitato_id int [unique]
  codice char(8) [not null, unique, note: 'CHARACTER SET ascii COLLATE ascii_bin']
  mese_invito date [not null, note: 'Primo giorno del mese solare di validita']
  creato_il timestamp [not null, default: `CURRENT_TIMESTAMP`]
  riscattato_il timestamp

  indexes {
    (invitante_id, mese_invito) [unique]
  }
}

Ref: richieste.utente_id > utenti.id [delete: cascade, update: cascade]

Ref: partecipanti_chat.id_chat > chat.id [delete: restrict, update: restrict]

Ref: partecipanti_chat.id_utente > utenti.id [delete: restrict, update: restrict]

Ref: messaggi_chat.id_utente > utenti.id [delete: restrict, update: restrict]

Ref: messaggi_chat.id_chat > chat.id [delete: restrict, update: restrict]

Ref: utenti.id_ultimo_messaggio_letto > messaggi_chat.id [delete: restrict, update: restrict]

Ref: partecipanti_accordo_1_a_1.id_accordo > accordi_1_a_1.id [delete: restrict, update: restrict]

Ref: partecipanti_accordo_1_a_1.id_utente > utenti.id [delete: restrict, update: restrict]

Ref: partecipanti_accordo_prestazione.id_accordo > accordi_prestazione.id [delete: restrict, update: restrict]

Ref: partecipanti_accordo_prestazione.id_utente > utenti.id [delete: restrict, update: restrict]

Ref: inviti.invitante_id > utenti.id [delete: restrict, update: restrict]

Ref: inviti.invitato_id > utenti.id [delete: restrict, update: restrict]
```

Nel nuovo dump tutte le chiavi esterne, tranne quella di `richieste`, omettono le clausole `ON DELETE` e `ON UPDATE`: il DBML ne rappresenta il comportamento restrittivo. Le precedenti cancellazioni a cascata di chat e accordi e il `SET NULL` sul mittente dei messaggi non sono più previsti. Il dump proviene da MySQL 5.7.24 e usa `utf8` per chat, messaggi e accordi e `utf8mb4_unicode_ci` per utenti, richieste e inviti.

## Regole applicative essenziali

- Username ed email devono essere univoci.
- Le password non devono mai essere salvate in chiaro.
- Soltanto gli utenti coinvolti possono accettare o completare un accordo.
- Un accordo annullato o contestato non genera crediti.
- I 10 crediti dello scambio 1:1 devono essere assegnati soltanto dopo la conferma di entrambi.
- Lo stesso accordo non deve poter generare crediti più di una volta.
- Un utente non deve poter creare uno scambio con se stesso.
- Il mittente di un messaggio deve appartenere alla chat indicata.
- Le chat e gli scambi 1:1 devono avere due partecipanti distinti; le prestazioni devono avere un beneficiario e un erogatore. Le tabelle di partecipazione impediscono di duplicare lo stesso utente nello stesso contesto, ma non impongono questi limiti di numero o di ruolo: deve verificarli il backend.

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
- le chiavi esterne verso `utenti` hanno comportamento restrittivo su cancellazione e aggiornamento, per mantenere coerente lo storico degli inviti e dei crediti assegnati.
- il codice deve contenere esattamente 8 caratteri maiuscoli alfanumerici (`A-Z` e `0-9`);
- `mese_invito` deve essere il primo giorno del mese solare di validità;
- invitante e invitato non possono coincidere;
- `invitato_id` e `riscattato_il` devono essere entrambi vuoti prima del riscatto oppure entrambi valorizzati dopo il riscatto;

Quando verranno sviluppate le API, il riscatto dovrà avvenire in un'unica transazione: validare codice e utente, associare invitato e data di riscatto, poi accreditare 10 crediti a `utenti.saldo_disponibile` dell'invitante. La tabella non assegna crediti automaticamente e non sono presenti trigger o stored procedure.
