# W10 — Conteggio non lette in polling

Classe: **M** — 6 file (3 nuovi: questo piano, il test del hook, nessun altro), 2 figli
(più 3 reviewer a fine ciclo), 1 stop (questo piano). Stile: `full`.
Fonte: `docs/audits/frontend-gap-analysis-2026-11-16.md:546-560` (W10) e `:208-215`
(B12). Sessione: `git fetch origin` → `andrea-frontend` **0 avanti / 0 indietro**
rispetto a `origin/andrea-frontend`; **299 avanti, 0 indietro** rispetto a
`origin/main`. Nessun merge.

## How to resume

- Gate del repo: `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest`.
  Il solo blocco 2 si prova con
  `npx jest src/hooks/__tests__/useNotifications.test.js`.
- Prima di tutto `git status --porcelain`: i file modificati sono il lavoro in
  corso dell'ultimo blocco, si rileggono e si continua da lì.
- Il contratto è **questo file**, non c'è `plan-brief.md` separato (classe M).
- Blocco 0 = il commit di questo piano. Nessun figlio parte prima che esista.
- Trappola: `useFocusEffect` non esiste fuori da un navigator → nel test va
  mockato come in `src/hooks/__tests__/useChat.test.js:9-14`.
- Trappola: sotto jest-expo `AppState.currentState` non vale `'active'` da solo:
  il test lo forza nel `beforeEach`, altrimenti la guardia di blocco 1 spegne
  ogni tick e i test passano per il motivo sbagliato.
- Trappola: `clock` finto + promise. Un tick risolve in microtask: dopo
  `jest.advanceTimersByTime` serve un ciclo di `await Promise.resolve()`, come
  `unGiro()` in `useChat.test.js:51-59`.
- I due blocchi di scrittura hanno file disgiunti: hook (blocco 1) e test
  (blocco 2). I documenti li tocca il padre (blocco 3).

## Contratto

**Obiettivo.** La riga «Notifiche» del profilo oggi è vera solo nell'istante in cui
la si apre: `useUnreadCount` (`Frontend/src/hooks/useNotifications.js:152`) chiede
il conteggio all'ingresso in schermata e al pull-to-refresh, e da lì non si muove
più. Una notifica che arriva da un altro dispositivo mentre il profilo è aperto
non compare finché non si cambia tab. Il lavoro: un intervallo mentre la
schermata è in primo piano, spento al blur, che non chiede nulla ad app in
background, più il log di sviluppo che B12 chiede sulla via di errore.

Fatti verificati prima di scrivere il piano:

- `grep -rn "useUnreadCount" Frontend/src` → un solo chiamante,
  `src/app/(tabs)/profile.jsx:11,110`. La inbox (`src/app/notifications.jsx`)
  usa `useNotifications`, quindi «niente polling sulla schermata inbox» è già
  vero per costruzione: nessuna modifica all'inbox.
- `grep -rn "AppState" Frontend/src` → **0 hit**: nessuna infrastruttura da
  riusare, la guardia si scrive qui.
- L'unico poll esistente è `CHAT_POLL_MS` in `src/hooks/useChat.js:15`, dentro
  `useFocusEffect`, con `logInSviluppo` locale (`useChat.js:20-24`).
- Infra di test disponibile: `react-test-renderer` + fake timer di jest, nessun
  `@testing-library/react-native` (`Frontend/package.json:34-39`).

**Vincoli.**

- `Backend/**` e `Context_and_DB_V2/**` in sola lettura. Nessuna chiamata nuova:
  il poll riusa `getNotifications(token, { limit: 1 })`, che è già la richiesta
  della riga (una riga sola, non una pagina).
- Niente polling in background e niente polling sulla schermata inbox.
- Il timer vive **dentro** `useFocusEffect`: uscire dalla tab lo cancella, come
  già fa `useChat`. Nessun `setInterval` di modulo.
- Prefisso dei log `[notifiche]`, come `[chat]` e `[api]`; `console.warn` solo
  sotto `__DEV__`, stessa forma di `api/client.js:120-122`.
- Inglese nuovo, italiano esistente: gli identificatori nuovi sono inglesi
  (`UNREAD_POLL_MS`, `logInSviluppo` no — è il nome già in `useChat.js`, si
  duplica identico per non introdurre due nomi per la stessa cosa).
- Il badge resta **neutro** quando il conteggio non si legge: `null`, non `0`.
  È il comportamento documentato oggi e B12 lo conferma; cambia solo il log.

**Decisioni chiuse** (le cinque domande del lock, con la risposta adottata).

1. **Intervallo: 30 s** (`export const UNREAD_POLL_MS = 30000`), non i 15 s della
   chat. Un badge non è una conversazione: la richiesta costa una riga e il
   valore deve muoversi «entro un intervallo», non entro 15 secondi. 30 s è
   anche il numero che il commento di `useUnreadCount` può citare senza
   fingere una reattività che non c'è.
2. **`AppState` come guardia nel tick + rilettura al ritorno in primo piano**,
   non pausa/riavvio dell'interval. `AppState.currentState !== 'active'` →
   nessuna richiesta; il listener `change` su `'active'` richiama subito
   `carica()` così il badge non aspetta fino a 30 s dopo il ritorno. Meno stato,
   e il caso «torna in primo piano» è coperto senza un secondo timer.
3. **Guasto di un tick**: si tiene il comportamento di oggi — `setNonLette(null)`
   (riga neutra, nessun banner sul profilo) — e si aggiunge solo il log di
   sviluppo B12. Un errore di rete sul profilo non deve diventare un banner: la
   inbox è dove l'errore si legge per esteso.
4. **`logInSviluppo` duplicato** in `useNotifications.js` invece di un modulo
   condiviso nuovo: due chiamanti non giustificano un file in più (YAGNI), e il
   corpo è di quattro righe. Se un terzo chiamante arriva, si estrae.
5. **`profile.jsx` non si tocca** (blocco 2b `N/A`): la copy attuale
   (`profile.jsx:290-291`, «N da leggere: proposte, risposte…») non promette un
   aggiornamento live, quindi non c'è niente da correggere.

**Esclusioni.** Nessun polling nella inbox (già coperta dal focus-refresh;
`useNotifications` non si tocca). Nessun push, nessun Mercure/SSE (il backend
non li ha). Nessun contatore locale: la fonte resta `unreadCount` della
risposta. Nessuna notifica di sistema. Nessun cambiamento alla forma dei dati o
ai normalizzatori. Nessun tocco a `Backend/**`.

**Criteri di successo.** (a) Con la schermata profilo aperta e in primo piano il
badge cambia da solo entro un intervallo, senza toccare nulla. (b) Lasciare la
tab cancella il timer: nessuna richiesta dopo il blur. (c) Con l'app in
background non parte nessuna richiesta; al ritorno in primo piano parte subito
una lettura. (d) Un conteggio che non si legge lascia la riga neutra e scrive
`[notifiche]` in console sotto `__DEV__`. (e) Gate verde: `npx expo lint`,
`npx tsc --noEmit`, `npx jest`.

## Passi

- 0. Commit del contratto e del piano | files: docs/briefs/w10-unread-polling/plan.md | done: il commit esiste e `git status --porcelain` è vuoto | Stato: DONE
- 1. Polling e log in `useUnreadCount` | files: Frontend/src/hooks/useNotifications.js | done: `UNREAD_POLL_MS` esportato = 30000; interval creato dentro `useFocusEffect` con `clearInterval` al cleanup e solo con token; tick con guardia `AppState.currentState !== 'active'`; listener `change` che rilegge su `'active'` e si rimuove al cleanup; `catch (err)` con `setNonLette(null)` + `logInSviluppo('[notifiche] …')`; commento del hook aggiornato | Stato: DONE
- 2. Test del hook a timer finti | files: Frontend/src/hooks/__tests__/useNotifications.test.js (nuovo) | done: 5 test verdi — `moves the badge on its own after one poll interval`, `asks again as soon as the app returns to the foreground`, `does not ask again while the app is in the background`, `stops the timer when the screen is left`, `keeps the row neutral and warns in development when the count cannot be read` | Stato: DONE
- 2b. Copy di `profile.jsx` che dica che la riga si aggiorna | files: Frontend/src/app/(tabs)/profile.jsx | done: nessuna modifica, la copy attuale non promette live (decisione 5) | Stato: N/A
- 3. Documenti | files: docs/api.md, docs/audits/frontend-gap-analysis-2026-11-16.md, docs/changelog.md | done: `api.md` §Notifications dice intervallo (30 s), guardia background e pull; l'item W10 è `Stato: chiuso` con cosa è atterrato; B12 marcato chiuso con W10; riga 7 della tabella priorità barrata; changelog con voce nuova in testa | Stato: DONE
- 4. Gate e review | files: — | done: `npx expo lint`, `npx tsc --noEmit`, `npx jest` verdi; tre angoli di review a contesto fresco con verdict, P0/P1/P2 applicati solo col consenso del padre | Stato: DONE
- 5. Push su `andrea-frontend` (mai su `main`) | files: — | done: albero pulito, gate verde, push riuscito, nessun `--force` | Stato: DONE

## Lanes:

- **Lane A — hook** (blocco 1, onda 1, un `worker`): `Frontend/src/hooks/useNotifications.js`.
- **Lane B — test** (blocco 2, onda 1, un `worker`): `Frontend/src/hooks/__tests__/useNotifications.test.js`.
  Scritto contro il contratto qui sopra, non contro il file del vicino: stessi nomi,
  stessi comportamenti. Se la firma non torna, il figlio si ferma e torna al padre.
- **shared — documenti** (blocco 3, dopo l'onda 1, padre): `docs/api.md`,
  `docs/audits/frontend-gap-analysis-2026-11-16.md`, `docs/changelog.md`.
- Le due lane non si toccano: nessuna dipendenza di file, nessun rename. Il
  padre non apre i due file di codice mentre i figli ci scrivono; committa lui,
  un commit per blocco.
