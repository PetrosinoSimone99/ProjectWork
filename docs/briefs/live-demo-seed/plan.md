# Plan — a local database that looks alive

## Brief

**Obiettivo.** Il database locale nasce con sei account e i loro servizi, poi si
ferma: accordi, schede, chat, notifiche e segnalazioni sono tabelle vuote, quindi
ogni schermata che le legge mostra il suo stato vuoto. Questo ciclo porta il seed
`Backend/docker/seed-demo.sql` a contenere un'app viva — scambi in tutti gli
stati, chat con messaggi, notifiche lette e non lette, code, segnalazioni — e un
account speciale (`demo.staff`) che è staff **e** parte in causa negli scambi, così
da un solo login si vedono tutte le schermate con dati veri.

**Vincoli.**
- `Backend/**` è in sola lettura tranne `Backend/docker/` (eccezione Docker, di
  Andrea). Questo ciclo tocca solo `Backend/docker/seed-demo.sql` e i documenti.
- Il seed è **ciò che l'app scrive**: le righe nuove si creano guidando le rotte
  del backend, non scrivendo `INSERT` a mano, e si esportano con `mysqldump`
  (`--no-create-info --complete-insert --skip-extended-insert`) conservando
  l'intestazione di provenienza del file.
- L'account staff si crea con `Backend/src/Command/CreateStaffUserCommand.php`,
  cioè con lo strumento del backend, non con una riga di SQL.
- Nessuna credenziale in chiaro fuori da `docs/setup.md`; qui le password demo
  restano quelle pubbliche del seed.
- Nessuna riga di frontend: l'app non si tocca. Se una schermata non mostra il
  dato nuovo, il difetto è nei dati o nel payload noto (`backend-gaps.md`).

**Decisioni chiuse.**
| # | Decisione |
| --- | --- |
| D1 | I dati si producono con uno script usa-e-getta che chiama le rotte reali (come fece l'audit), poi si esporta il database nel seed. Le righe nascono dal prodotto, non dalla fantasia di chi scrive SQL. |
| D2 | Scenario fisso, piccolo e leggibile: **5 accordi** (uno `PENDING` ricevuto, uno `PENDING` inviato, uno `ACCEPTED` con scheda da compilare, uno `ACCEPTED` con scheda compilata da confermare, uno `CANCELLED`), **3 chat** (due con 4–6 messaggi, una vuota), **8 notifiche** (4 non lette), **2 code**, **2 segnalazioni** (una aperta, una già esaminata). Niente di più: ogni riga in più è una riga che qualcuno deve poter spiegare. |
| D3 | L'account speciale è **`demo.staff`** (password `demo1234`), creato col comando del backend, partecipante a tre degli scambi e autore di una segnalazione: da lì si aprono `/staff`, `/staff-users`, gli accordi con scheda, la chat e le notifiche. L'app non ha una schermata «vedi tutto»: quello che un account può coprire è *ogni schermata con dati*, e questo account la copre. |
| D4 | `giulia.bianchi` resta l'account della coda (i documenti la usano per la demo della coda) e diventa la controparte di due scambi, così il pulsante «accetta» ha dall'altra parte qualcuno che risponde. |
| D5 | Il seed si applica **solo su volume vuoto**: per vederlo serve `docker compose down -v` e riavvio, che cancella i dati locali. È il costo dichiarato, non un effetto collaterale da scoprire. |

**Criteri di successo.**
1. Da volume vuoto, `docker compose up -d` ricostruisce il database e le schermate
   mostrano dati reali: catalogo, match con code, accordi nei cinque stati, chat
   con messaggi, notifiche con alcuni non letti, profilo, `/staff` e
   `/staff-users` pieni.
2. Il seed si ricostruisce da sé: `down -v` + up due volte dà gli stessi conteggi.
3. `demo.staff` entra, vede le schermate staff e i propri scambi, e non è l'unico
   a poter agire: le controparti rispondono.
4. Nessun `INSERT` scritto a mano fuori dagli export; l'intestazione del seed dice
   come è stato prodotto e con quali rotte.

**Esclusioni.** Nessuna modifica a `Backend/src`, `Backend/config` o alle rotte;
nessun dato reale; nessun frontend; nessuna nuova dipendenza.

**Fatti già verificati (non da ri-verificare).**
- 15 tabelle nello schema; il seed ne popola 5 (`categories`,
  `service_categories`, `services`, `service_queues`, `users`).
- `agreement_details.start_date` è `ON UPDATE CURRENT_TIMESTAMP`: una scheda
  compilata nel seed mostrerà come inizio l'ora dell'ultima scrittura. È il
  difetto noto G20, non un errore del seed.
- Esiste `Backend/tools/create-demo-database.php` ma è fermo allo schema
  precedente: non si usa, non si aggiusta (fuori scope, già in `backend-gaps`).

## How to resume

- Prima cosa: `git status --porcelain`; i file modificati sono il lavoro in corso.
- Stack: `cd Backend && docker compose down -v && docker compose up -d --build`;
  il seed è montato come `20-seed.sql` e girа **solo** su volume vuoto.
- Il backend risponde in 2–8 s a freddo: lo script che popola i dati deve
  aspettare la risposta, non un tempo fisso.
- Credenziali: quelle pubbliche del seed (`demo1234`), nient'altro.
- Gate: nessuna suite tocca questi file; la verifica è il punto 2 dei criteri
  (ricostruzione da zero con gli stessi conteggi) più le schermate lette a mano.
- Playwright non serve: i dati si verificano con `curl` e con l'app aperta.

## Steps

- 0. Commit di questo piano | files: docs/briefs/live-demo-seed/plan.md | done: il commit esiste su `andrea-frontend`, albero pulito | Stato: DONE
- 1. Script di popolamento (fuori dal repo, `/tmp`): login di ogni account demo, poi le rotte reali nell'ordine di dipendenza — accordi, risposte, schede, chat e messaggi, code, segnalazioni, notifiche — e `CreateStaffUserCommand` per `demo.staff` | files: — | done: ogni chiamata risponde il codice atteso e la somma dei conteggi finali è quella di D2 | Stato: DONE
- 2. Export nel seed | files: Backend/docker/seed-demo.sql | done: `mysqldump --no-create-info --complete-insert --skip-extended-insert` di `categories`, `service_categories`, `services`, `service_queues`, `users`, `agreements`, `agreement_details`, `agreement_proposal`, `chat`, `chat_participants`, `chat_messages`, `notifications`, `user_reports`, con l'intestazione riscritta che dice come è stato prodotto e quali rotte sono state usate. Una tabella in più rispetto a questa lista, dichiarata nell'intestazione del seed perché le rotte staff la scrivono: `staff_operation_logs` | Stato: DONE
- 3. Prova di ricostruzione | files: — | done: `down -v` + up due volte; i conteggi per tabella sono identici in entrambi i giri e uguali a quelli misurati prima dell'export | Stato: DONE
- 4. Documenti | files: docs/setup.md,docs/database.md,docs/changelog.md | done: `setup.md` elenca cosa contiene un database fresco, il login `demo.staff`, il costo del reset; `database.md` aggiorna la riga di provenienza del seed e le tabelle coperte; `changelog.md` racconta il ciclo | Stato: DONE
- 5. Verifica a mano sulle schermate | files: — | done: da `demo.staff` si vedono catalogo, match con code, cinque accordi negli stati dichiarati, chat con messaggi, notifiche con non lette, `/staff` e `/staff-users`; nessuna schermata resta sullo stato vuoto per mancanza di dati | Stato: DONE
- 6. Gate e push | files: — | done: `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest` verde (i file toccati non sono frontend, il gate si esegue lo stesso), albero pulito, push su `andrea-frontend` | Stato: DONE

## Lanes

Una sola lane di scrittura, perché tutto dipende da un unico artefatto (il seed)
e i documenti lo raccontano: `Backend/docker/seed-demo.sql` +
`docs/setup.md` + `docs/database.md` + `docs/changelog.md`. I passi 1 e 3 sono
lettura/esecuzione sul database; 2, 4 e 6 sono scritture.

## Lock

1. **Più dati nel seed, prodotto dalle rotte reali e non da SQL scritto a mano.**
   Raccomando: sì — è la regola del file, e un seed scritto a mano invecchia
   subito.
2. **Lo scenario è quello di D2** (5 accordi, 3 chat, 8 notifiche, 2 code, 2
   segnalazioni). Raccomando: sì, e niente di più.
3. **L'account speciale è `demo.staff`**: ruolo staff dal comando del backend, e
   parte in causa in tre scambi. Raccomando: sì, un solo login per tutto.
4. **Il reset del volume è accettato**: per vedere i dati nuovi serve `down -v`,
   che cancella il database locale. Raccomando: sì (è demo).
