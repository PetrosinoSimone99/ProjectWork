# W9 — Naming coerente nei file nuovi

`Stile: full` · Classe `M` · 9 file (1 nuovo) · 0 figli · ~1 h gate incluso.
Fonte: `docs/audits/frontend-gap-analysis-2026-11-16.md` (B6, W9).

## How to resume

- Contratto: questo file. `grep '| Stato: TODO' docs/briefs/w9-naming/plan.md`, si parte dal primo
  TODO la cui condizione è vera (`N/A` non è un blocco).
- Gate, da `Frontend/`: `npx expo lint`, `npx tsc --noEmit`, `npx jest`. Rosso = stop.
- Branch `andrea-frontend`. Mai `main`. Push solo a fine ciclo, albero pulito.
- Trappola: `tsc --noEmit` non type-checka `.jsx` (`allowJs` senza `checkJs`) — verde non vuol dire
  type-safe; un rename si verifica con jest, non col gate.
- Trappola: 4 test file pinnano i simboli toccati. Se un test rompe, il rename è incompleto.
- Trappola: `AGENTS.md` è root (regola del repo: chiedere prima) — lo tocca solo il passo 5.
- Blocco 0 = commit del contratto. Nessuna modifica prima che quel commit esista.

## Brief

**Obiettivo.** La regola scritta e l'albero dicono la stessa cosa, e un oggetto non ha due nomi nello
stesso file. Il difetto di B6 non è "esiste l'italiano": è che `AGENTS.md` ("all new code is written
in English"), `docs/frontend.md:18-28` e D013 dicono una cosa che l'albero non ha mai fatto.

**Fatti misurati** (2026-11-17, `git log --diff-filter=A`, `grep`):

- I 5 hook con ritorno a oggetto sono italiani **uniformemente dal primo commit**:
  `useAgreements` (11-09) `accordi/caricamento/errore/rispondi/azioneInCorso`, `useNotifications`
  (11-15) `elementi/nonLette/azioneInCorso/ricarica/segnaLetta/elimina`, `useServiceCatalog` (11-07),
  `useUserServices`, `useSessionExpiry`. Nessuno è "legacy": la regola non li ha mai descritti.
- I props delle card sono italiani per convenzione (`occupata` su 4 componenti, `onAnnulla` su 8,
  `titolo`/`messaggio` su `ConfirmModal`), anche nei file nuovi.
- `api/normalizers.js:10-12` dichiara la shape UI italiana (`tipo`, `stato`, `localita`,
  `descrizione`, `categoria`, `daRemoto`) come contratto unico letto da ogni schermata.
- Il concetto "coda" è **già inglese** in `api/` e `services/`: `listQueues`, `createQueue`,
  `cancelQueue`, `hasActiveQueue`, `servicesOfQueueType`, `normalizeQueues`, `QueueCard`,
  `queueTypeLabel`. Gli unici nomi italiani del concetto sono la prop `coda`, il parametro di
  `rimborsaUnCredito(coda)`/`confermaAnnullamento(coda)` e la fixture `CODA`. Questi sono la
  collisione vera: lo stesso oggetto si chiama `queue` alle righe 189-203 di `match.jsx:189,203` e
  `coda` alla riga 269.
- Correzione al documento d'audit: B6 dice "match tab e card scritti il 2026-11-16"; git dice
  `match.jsx` 2026-11-07 e `QueueCard.jsx` 2026-11-15. Il passo 6 corregge.

**Decisione chiusa (D026, da scrivere al passo 1).** Due strati, un vocabolario:
(1) *struttura* = inglese — file, directory, route, export, e ogni identificatore locale che dice
come il codice lavora (helper, costanti, flag); (2) *contratto interno* = italiano, con la stessa
parola a ogni strato che attraversa — la shape normalizzata, i ritorni degli hook, i props che
portano quella shape o quello stato (`occupata`, `azioneInCorso`, `onAnnulla`); un concetto, una
parola, e rinominarlo a un solo strato è il difetto. (3) Nessuno sweep: un italiano fuori da (2) si
rinomina quando il file si tocca (meccanismo D013 invariato), e restano dichiarati
`actionError`/`refreshing`/`onRefresh` dentro i contratti italiani degli hook.

**Vincoli.** Nessuna rinomina diffusa, nessuna lane (le rinomine non sono mai una lane:
`ship.md`). `Backend/**` e `Context_and_DB_V2/**` intatti. UI copy in italiano, invariata: nessuna
stringa utente cambia in questo item.

**Criteri di successo.** `grep -rn "coda" Frontend/src` non trova più la prop né i parametri (restano
solo stringhe utente e commenti); nessun identificatore fuori da (2) in italiano nei due file toccati;
D026, `docs/frontend.md`, `AGENTS.md` e il codice dicono la stessa cosa; gate verde.

**Esclusioni.** Non si rinominano i hook (contratto legale per D026), non si toccano `useChat`,
`useServiceCatalog`, `AgreementCard`, `AgreementSheet`, `ConfirmModal` (rinomina al prossimo tocco),
nessun cambio di comportamento, nessun test nuovo (i test esistenti sono la verifica).

## Piano

- 0. Commit del contratto e del piano | files: `docs/briefs/w9-naming/plan.md` | done: `git log -1
  --name-only` elenca solo il plan.md e `git status --porcelain` è vuoto | Stato: DONE
- 1. Scrivere D026 in coda a `docs/decisions.md`, riscrivere le righe 18-28 di `docs/frontend.md`
  (code language + naming) sui due strati, voce in `docs/changelog.md` | files:
  `docs/decisions.md`,`docs/frontend.md` | done: ogni affermazione di D026 è
  verificabile su un file citato (hook, `normalizers.js:10-12`, props) e nessuna riga di
  `frontend.md` contraddice D026 | Stato: DONE — la voce di `changelog.md` è passata al passo 6, insieme ai
  fatti finali (rinomine e review), per non scriverla due volte
- 2. `QueueCard.jsx`: prop `coda`→`queue`, `onApri`→`onOpen`, `confermaAnnullamento`→
  `cancelConfirmMessage`, `apribile`→`canOpen`, `etichettaApri`→`openLabel`,
  `bloccoInformativo`→`infoBlock`; le chiavi lette (`queue.tipo`, `queue.stato`, `queue.localita`,
  `queue.descrizione`, `queue.categoria`, `queue.daRemoto`, `queue.agreementId`) restano la shape
  italiana | files: `Frontend/src/components/QueueCard.jsx` | done: `grep -n "coda\|apribile\|etichettaApri\|bloccoInformativo"` sul file → solo stringhe utente | Stato: DONE
- 3. `match.jsx`: call site `coda={`→`queue={`, `onApri`→`onOpen`, `rimborsaUnCredito`→
  `refundsCredit` (param `queue`), `codaAttiva`→`activeQueue` | files:
  `Frontend/src/app/(tabs)/match.jsx` | done: nessun `codaAttiva`/`rimborsaUnCredito` residuo,
  `npx jest match` verde | Stato: DONE
- 4. Test: `QueueCard.test.js` (`CODA`→`QUEUE`, `renderCoda`→`renderCard`,
  `PREFISSO_APRI`→`OPEN_LABEL_PREFIX`, `premi`→`press`, `pulsante`→`button`, prop `queue`/`onOpen`)
  e la fixture `CODA_ATTIVA`→`ACTIVE_QUEUE` in `match.test.js` | files:
  `Frontend/src/components/__tests__/QueueCard.test.js`,`Frontend/src/app/(tabs)/__tests__/match.test.js`
  | done: `npx jest --testPathPatterns "match|QueueCard"` verde con 8 test (3 + 5), invariati nel numero,
  e nessuna stringa utente toccata: le rinomine non passano mai dentro la copy | Stato: DONE
- 5. `AGENTS.md` (root) sezione "Code language": due strati in ≤6 righe, nessuna affermazione
  contraddetta da D026 | files: `AGENTS.md` | done: la sezione nomina i due strati e il criterio "un
  concetto, una parola" | Stato: TODO — **approvazione richiesta: Q2**
- 6. Audit: W9 → `Stato: chiuso 2026-11-17` con link a questo brief; in B6 correggere le date
  (`match.jsx` 11-07, `QueueCard` 11-15) e la riga finale che mette jest nel gate (D019 lo tiene
  fuori: qui jest è *verifica*, non gate) | files:
  `docs/audits/frontend-gap-analysis-2026-11-16.md` | done: nessuna affermazione del documento è
  smentita da `git log` o da `package.json` | Stato: TODO
- 7. Gate completo + review a contesto fresco, 3 angoli in sola lettura (correttezza, dati/sicurezza,
  coerenza col brief) | files: — | done: `npx expo lint`, `npx tsc --noEmit`, `npx jest` verdi e zero
  finding P0/P1 | Stato: TODO
- 8. Push su `andrea-frontend` | files: — | done: `git status --porcelain` vuoto, gate verde,
  fast-forward su `origin/andrea-frontend` | Stato: TODO

## Aperte (risposte attese prima del blocco 0)

1. **Dove finisce il rename?** (a) quattro file come da item, hook compresi → 11 file di codice e sei
   convenzioni forkate (`occupata`, `azioneInCorso`, `elementi`, `nonLette`, `carica/rispondi`,
   `onAnnulla`), più 2 follow-up nominati, L ~2-3 h; (b) **consigliata**: D026 + collisioni nei file
   nuovi (questo piano), 9 file, M ~1 h; (c) solo D026, codice intatto → `coda`/`queue` restano due
   nomi nello stesso file.
2. **`AGENTS.md` root** (passo 5): lo riscrivo sui due strati? Consigliato sì — altrimenti la
   contraddizione resta in piedi nel file che gli agenti leggono per primo.
3. **Contratti dei hook**: lasciarli italiani come contratto (consigliato, D026) o rinominarli anche
   loro in questo item (forka da `useServiceCatalog`/`useChat`, +6 file)?
4. **jest nel gate**: il documento d'audit chiude dicendo che il gate è lint+tsc+jest, D019 dice che
   jest è fuori dal gate. Consigliato: jest come *verifica* in questo piano e correzione della riga
   al passo 6, senza cambiare la politica del gate.

## Lanes

Nessuna. Motivo: ogni rinomina è un grafo di simboli unico (prop → call site → test nello stesso
commit) e `ship.md` vieta rinomine in lane; gli unici insiemi disgiunti sarebbero i docs, che
dipendono dal codice finale. Ciclo `single` con un solo writer.
