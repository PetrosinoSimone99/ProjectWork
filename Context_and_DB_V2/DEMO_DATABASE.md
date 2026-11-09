# Database demo

Dump: `barattolo_demo_20261108.sql`. Password di tutti gli account: **demo** (salvata come hash).

Contiene 50 categorie, 28 utenti ordinari, 2 staff, 200 offerte e 100 richieste. Tutti sono attivi; nessun servizio e sospeso o eliminato. Le altre tabelle sono vuote. `tokens` e `token_redemptions` sono assenti.

## Importazione

Importare solo in un database MySQL vuoto. Non eseguire le migrazioni storiche su questo schema.

```sql
CREATE DATABASE barattolo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE barattolo;
SOURCE Context_and_DB_V2/barattolo_demo_20261108.sql;
```

Login: `POST /api/auth/login` con `username` scelto dalla tabella e `password` uguale a `demo`. La registrazione continua a richiedere almeno 8 caratteri per le nuove password.

| Username | Ruolo | Localita |
| --- | --- | --- |
| mario.rossi | Utente | Roma |
| giulia.bianchi | Utente | Milano |
| luca.ferrari | Utente | Torino |
| sofia.romano | Utente | Bologna |
| marco.ricci | Utente | Firenze |
| chiara.marino | Utente | Napoli |
| andrea.greco | Utente | Palermo |
| francesca.bruno | Utente | Genova |
| alessandro.gallo | Utente | Bari |
| elena.conti | Utente | Padova |
| matteo.deluca | Utente | Roma |
| sara.mancini | Utente | Milano |
| davide.costa | Utente | Torino |
| martina.giordano | Utente | Bologna |
| simone.rizzo | Utente | Firenze |
| valentina.lombardi | Utente | Napoli |
| federico.moretti | Utente | Palermo |
| alice.barbieri | Utente | Genova |
| lorenzo.fontana | Utente | Bari |
| beatrice.santoro | Utente | Padova |
| gabriele.mariani | Utente | Roma |
| laura.rinaldi | Utente | Milano |
| riccardo.caruso | Utente | Torino |
| silvia.ferrara | Utente | Bologna |
| nicola.galli | Utente | Firenze |
| paola.martini | Utente | Napoli |
| tommaso.leone | Utente | Palermo |
| roberta.longo | Utente | Genova |
| staff.anna | Staff | Bari |
| staff.paolo | Staff | Padova |

Per rigenerare da un database locale vuoto usare `php tools/create-demo-database.php` dalla cartella Backend. Lo script rifiuta database popolati e dump gia esistenti. Il backup precedente alle modifiche si trova in `Backend/var/backups/`.
