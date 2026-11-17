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
| D2 | Scenario fisso, leggibile ma **completo** (revisione del 2026-11-17, richiesta di Andrea: «riempi tutto»): **7 accordi**, e `demo.staff` è parte in ognuno — `PENDING` ricevuto, `PENDING` inviato, `ACCEPTED` con le due schede compilate e confermate, `ACCEPTED` con la propria scheda da compilare e quella della controparte da confermare, `CANCELLED`, `COMPLETED`, `REFUSED` —, **3 chat** (due con 5 messaggi, una vuota), **11 notifiche** (4 non lette, 8 nel casellario di `demo.staff`), **2 code**, **2 segnalazioni** (una aperta, una già esaminata), **1 servizio eliminato**. Niente di più: ogni riga in più è una riga che qualcuno deve poter spiegare. |
| D3 | L'account speciale è **`demo.staff`** (password `demo1234`), creato col comando del backend, **parte in tutti e sette gli scambi** (revisione del 2026-11-17: prima erano tre) e autore di una segnalazione: da un solo login si aprono `/staff`, `/staff-users`, le proposte ricevute, quelle inviate, gli accordi in corso con le schede, i conclusi (completato, annullato, rifiutato), la chat, il casellario delle notifiche e il servizio eliminato in `/staff`. |
| D4 | `giulia.bianchi` resta l'account della coda (i documenti la usano per la demo della coda) e diventa la controparte di due scambi, così il pulsante «accetta» ha dall'altra parte qualcuno che risponde. |
| D5 | Il seed si applica **solo su volume vuoto**: per vederlo serve `docker compose down -v` e riavvio, che cancella i dati locali. È il costo dichiarato, non un effetto collaterale da scoprire. |
| D6 | `COMPLETED` non si scrive a mano: un accordo accettato con entrambe le schede datate nel passato viene chiuso dallo **scheduler del backend**, che lo script fa girare una volta (`messenger:consume scheduler_default --limit=1`). Le notifiche `agreement_completed` arrivano da lì. |
| D7 | Il **matching non è realizzabile** nel volume locale, e non per i dati: `QueueHandler` legge `Backend/src/Dictionaries/<descrizione categoria>.json`, in quella cartella esiste solo `Programmazione.json` e per ogni categoria usata il worker muore con «Failed to open stream». `Backend/src` è fuori perimetro: il gap si documenta in `backend-gaps.md` e il seed lascia le due code pronte a sposarsi (stessa località, stesso tipo), non finge un match. |

**Criteri di successo.**
1. Da volume vuoto, `docker compose up -d` ricostruisce il database e le schermate
   mostrano dati reali: catalogo, match con code, accordi nei sette stati, chat
   con messaggi, notifiche con alcuni non letti, profilo, `/staff` (segnalazioni,
   registro, servizio eliminato) e `/staff-users` pieni. Con `demo.staff` **una
   sola sessione** copre tutti gli stati tranne quelli che il backend non può
   produrre in locale (il match, D7).
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

- 0. Commit di questa revisione | files: docs/briefs/live-demo-seed/plan.md | done: il commit esiste su `andrea-frontend`, albero pulito | Stato: DONE
- 7. Riscrittura dello script di popolamento (fuori dal repo): i sette accordi di D2 con `demo.staff` parte in tutti, le due schede compilate e confermate, quella compilata da confermare, le due schede datate nel passato, la chat, la coda, le segnalazioni, il servizio eliminato di `luca.ferrari`, e `messenger:consume scheduler_default --limit=1` per chiudere l'accordo `COMPLETED` | files: — | done: ogni chiamata risponde il codice atteso, l'accordo con le date passate risulta `COMPLETED`, e i totali sono quelli di D2 | Stato: TODO
- 8. Export nel seed | files: Backend/docker/seed-demo.sql | done: `mysqldump` delle quattordici tabelle con l'intestazione riscritta: sette accordi, chi è parte in cosa, le rotte usate, il worker che ha chiuso l'accordo, il servizio eliminato, e il motivo per cui nessuna coda è stata sposata | Stato: TODO
- 9. Prova di ricostruzione | files: — | done: `down -v` + up due volte; conteggi per tabella identici nei due giri e uguali a quelli misurati prima dell'export | Stato: TODO
- 10. Documenti | files: docs/setup.md,docs/database.md,docs/changelog.md,docs/backend-gaps.md | done: `setup.md` aggiorna il contenuto di un database fresco e la tabella dei conteggi, `database.md` la provenienza, `backend-gaps.md` il gap del matcher con la prova, `changelog.md` il ciclo | Stato: TODO
- 11. Verifica a mano sulle schermate | files: — | done: da `demo.staff` si vedono catalogo, coda, proposte ricevute (con Accetta/Rifiuta), inviate, in corso con le schede, conclusi (completato, annullato, rifiutato), chat con messaggi, notifiche con non lette, voci eliminate, `/staff` e `/staff-users`; nessuna sezione resta vuota per mancanza di dati tranne quelle che nessuna rotta può riempire (elencate nel report) | Stato: TODO
- 12. Gate e push | files: — | done: `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest` verde, albero pulito, push su `andrea-frontend` | Stato: TODO

## Lanes

Una sola lane di scrittura, perché tutto dipende da un unico artefatto (il seed)
e i documenti lo raccontano: `Backend/docker/seed-demo.sql` +
`docs/setup.md` + `docs/database.md` + `docs/changelog.md` +
`docs/backend-gaps.md`. I passi 7 e 9 sono esecuzione sul database; 8, 10 e 12
sono scritture.

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
