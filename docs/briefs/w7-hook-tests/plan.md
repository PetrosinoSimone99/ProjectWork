# W7 — Test sui hook critici

Classe: **M** — 7 file (4 nuovi: questo piano e 3 test), 3 figli in onda 1, 3 reviewer
a fine ciclo, 1 stop (questo piano). Stile: `full`.
Fonte: `docs/audits/frontend-gap-analysis-2026-11-16.md:500-515` (W7) e `:112-121`
(B5). Sessione: `git fetch origin` → `andrea-frontend` **0 avanti / 0 indietro**
rispetto a `origin/andrea-frontend`; **304 avanti, 0 indietro** rispetto a
`origin/main`. Albero pulito. Nessun merge.

## How to resume

- Gate del repo: `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest`.
  Misurato a inizio ciclo: `npx jest` = **29 suite / 320 test verdi, ~14 s**.
- Trappola d'ambiente: `npx jest --coverage` **sull'intera suite** non è il gate e
  non è affidabile — l'instrumentation porta `AgreementSheet.test.js` e
  `auth-context.test.js` oltre il timeout di 5 s per test (misurato: 2 falliti con
  `--coverage`, 0 senza). La coverage si misura solo sui test dei hook:
  `npx jest --coverage src/hooks/__tests__`.
- Trappola: `jest` legge il path come regex, quindi `npx jest "src/app/(tabs)/…"`
  risponde `No tests found` con exit 0 (verde falso). Il path si cita sempre
  escapato: `npx jest "src/app/\(tabs\)/__tests__/match.test.js"`.
- Trappola: rendere `match.jsx` richiede `react-native-safe-area-context` mockato
  (`Screen` chiama `useSafeAreaInsets()` e senza provider lancia
  `No safe area value available`).
- Prima di tutto `git status --porcelain`: i file modificati sono il lavoro in
  corso dell'ultimo blocco, si rileggono e si continua da lì.
- Il contratto è **questo file**, non c'è `plan-brief.md` separato (classe M).
- Blocco 0 = il commit di questo piano. Nessun figlio parte prima che esista.
- Trappola: `useFocusEffect` non esiste fuori da un navigator → nel test va
  mockato come in `src/hooks/__tests__/useChat.test.js:9-14`.
- Trappola: `@/api` è un barrel. `jest.mock('@/api', ...)` deve dichiarare **ogni**
  simbolo che il file sotto test importa da lì, o il hook riceve `undefined`.
- Trappola: `react-test-renderer` non ha `fireEvent`; si preme così:
  `src/components/__tests__/QueueCard.test.js:38-50` (`findAll` su
  `accessibilityLabel` + `props.onPress()` dentro `act`).

## Contratto

**Obiettivo.** `useAgreements` e `useServiceCatalog` sono le due macchine a stati
del frontend — risposta stale, ricarica fallita, azione singola — e non hanno un
solo test (`src/hooks/__tests__/` contiene `useChat.test.js` e
`useNotifications.test.js`, nient'altro). `match.jsx` ha il triplo gate del
crea-coda per intero dentro il componente. Il lavoro: test che descrivono le tre
regole che i hook dichiarano nel proprio docstring, il gate di `match` provato
dove vive (schermata resa, non estratto in un helper), e
`collectCoverageFrom` che smette di mentire su cosa è coperto.

**Fatti verificati prima di scrivere il piano.**

- `ls Frontend/src/hooks/__tests__` → `useChat.test.js`, `useNotifications.test.js`.
  W7 dichiarava **4** file nuovi: `useNotifications.test.js` esiste già, creato da
  W10 (`9d0d7e2`). I nuovi sono **3**.
- Coverage misurata oggi con `npx jest --coverage --collectCoverageFrom='src/hooks/**/*.js'`:
  `useAgreements.js` **0%**, `useServiceCatalog.js` **0%**, `useChat.js` 68%,
  `useNotifications.js` 37%, gli altri 8 file di `src/hooks/` 0%. Totale
  `src/hooks/**` = **20,86% statements**.
- `collectCoverageFrom` in `Frontend/package.json:44-48` elenca oggi 3 file
  (`services/agreements.js`, `services/italian-locations.js`, `validation/index.js`):
  nessun hook. Il "≥80% su `src/hooks/**`" dell'audit, preso alla lettera,
  richiede test su 8 hook ancora non toccati.
- `useAgreements({ token, myUsername })` (`src/hooks/useAgreements.js:47`) ritorna
  13 chiavi: `accordi, classificati, caricamento, errore, rispondi, annulla,
  actionError, esito, congedaEsito, azioneInCorso, refreshing, onRefresh, riprova`.
- `useServiceCatalog({ token, utenteId })` (`src/hooks/useServiceCatalog.js:43`)
  ritorna 16 chiavi: `servizi, caricamento, errore, paginazione, caricamentoAltri,
  erroreAltri, filtri, filtriApplicati, cambiaScelta, cambiaModalita,
  applicaFiltri, azzeraTesto, azzeraFiltri, riprova, caricaAltri, refreshing,
  onRefresh` (17 con `onRefresh`, contate sul `return`).
- `match.jsx:96` → il gate: `servicesOfQueueType` (`services/queues.js:68`),
  `hasActiveQueue` (`:95`), `actionInFlight !== null` dentro `create`
  (`match.jsx:170`) e `cancel` (`:189`). I due bottoni nascono con
  `accessibilityLabel` esplicito (`match.jsx:310`, `:324`).
- **Contraddizione trovata, non aggirata:** `useAgreements.eseguiAzione`
  (`useAgreements.js:97-119`) **non** ha la guardia single-flight che ha
  `match.jsx`. `azioneInCorso` viene scritto senza controllare se è già pieno: il
  "un'azione è single-flight" del docstring è vero solo perché la schermata
  disabilita i bottoni (`agreements.jsx:178,554`). Vedi decisione 3.

**Vincoli.**

- Nessuna modifica a codice di produzione. `useAgreements.js`,
  `useServiceCatalog.js`, `match.jsx` non si toccano: se un test non passa, il
  difetto è del hook e va riportato al padre, non corretto di nascosto.
- `Backend/**` e `Context_and_DB_V2/**` in sola lettura. Nessuna chiamata nuova.
- Nome dei test in inglese e comportamentali (`'keeps the agreements on screen
  when a reload fails'`), mai numerati, mai `'works'`.
- Un file di test per hook, non uno per regola; `testMatch` è
  `**/__tests__/**/*.test.js` (`package.json:38-40`) — nessun `.test.jsx`.
- Nessun `@testing-library/react-native`: non è installato e non si installa.
  Solo `react-test-renderer` + fake timer di jest.
- Nessuna assertion indebolita per far passare un test; nessun `setTimeout` a
  dormire: si usano i timer finti.

**Decisioni chiuse** (le cinque domande del lock, con la risposta adottata).

1. **`collectCoverageFrom` copre i due hook che W7 testa**, non `src/hooks/**`:
   si aggiungono `src/hooks/useAgreements.js` e `src/hooks/useServiceCatalog.js`.
   Il resto della cartella resta fuori finché non ha test propri; l'80% si misura
   su ciò che si è scritto, non su 8 file vergini. Nessun `coverageThreshold`:
   la soglia resta un criterio di questo ciclo, non un guardrail che rompe il
   gate a ogni edit futuro.
2. **`useNotifications.test.js` è `N/A`**: esiste da W10, non si riscrive e
   `useNotifications.js` (37% statements) resta fuori da `collectCoverageFrom`.
   Aggiungerlo obbligherebbe a coprire anche `useNotifications` (lista), che è
   un altro lavoro.
3. **`useAgreements` si testa per quello che fa davvero**: slot `azioneInCorso`
   che nomina l'accordo, ricarica dopo l'azione, errore dell'azione che non
   cancella la lista. La guardia single-flight interna **non** si aggiunge in
   questo ciclo (è produzione, e cambierebbe il comportamento di due tap
   ravvicinati) — si registra come residuo nel changelog. Il single-flight si
   prova dove esiste: `match.jsx`.
4. **`match.jsx` si prova rendendo la schermata**, con `useAuth`, `expo-router` e
   `@/api` mockati. Nessuna estrazione di un helper puro: il gate è tre condizioni
   che leggono stato del componente, e spostarle per poterle testare sarebbe
   rifattorizzare il codice sotto test.
5. **Documenti: solo audit + changelog.** La frase sulla coverage in
   `docs/frontend.md:120-126` è di W8 (B5) e lì resta, con un rimando: due item
   che riscrivono la stessa frase in due cicli diversi è un conflitto, non
   documentazione.

**Esclusioni.** Nessun test di `useChat`/`useNotifications` (già esistenti, e il
loro 68%/37% è fuori per decisione 1). Nessun test di `useCategories`,
`useRefresh`, `useSessionExpiry`, `useUserServices`, `web-chrome`,
`useDocumentTitle`, `useReducedMotion`, `useWebColorScheme`. Nessun test di
schermate diverse da `match`. Nessun refactor di `match.jsx`. Nessun
`coverageThreshold`. Nessun tocco a `Backend/**`.

**Criteri di successo.** (a) `npx jest` verde con almeno 3 suite nuove e ~20 test
nuovi, nomi che descrivono il comportamento. (b) `npx jest --coverage
src/hooks/__tests__` dà ≥80% statements su `useAgreements.js` e
`useServiceCatalog.js`. (c) Il gate di `match` è provato su tutti e tre i rami:
zero servizi del tipo, più di uno, coda attiva, azione in volo. (d) Gate verde:
`npx expo lint`, `npx tsc --noEmit`, `npx jest`. (e) Nessuna riga di produzione
toccata: `git diff --stat` del ciclo nomina solo `__tests__/`, `package.json`,
`Frontend/.gitignore` e `docs/`.

## Passi

- 0. Commit del contratto e del piano | files: docs/briefs/w7-hook-tests/plan.md | done: il commit esiste e `git status --porcelain` è vuoto | Stato: DONE
- 1. Onda 1 — i tre file di test, un `worker` per file | files: Frontend/src/hooks/__tests__/useAgreements.test.js, Frontend/src/hooks/__tests__/useServiceCatalog.test.js, Frontend/src/app/(tabs)/__tests__/match.test.js | done: i tre file esistono; `npx jest src/hooks/__tests__ "src/app/(tabs)/__tests__/match.test.js"` verde; ogni `it` ha un nome comportamentale e nessun test è saltato o `.todo` | Stato: DONE
- 1b. Riscrivere `useNotifications.test.js` | files: Frontend/src/hooks/__tests__/useNotifications.test.js | done: nessuna modifica, il file è di W10 (decisione 2) | Stato: N/A
- 2. Coverage dichiarata | files: Frontend/package.json, Frontend/.gitignore | done: `collectCoverageFrom` elenca i due hook di W7; `npx jest --coverage src/hooks/__tests__` riporta **91,93% statements** su `useAgreements.js` e **90,69%** su `useServiceCatalog.js`, nessun altro file nel report; `coverage/` è ignorato, perché il report HTML generato rendeva l'albero sporco a ogni misura | Stato: DONE
- 3. Documenti | files: docs/audits/frontend-gap-analysis-2026-11-16.md, docs/changelog.md | done: W7 è `Stato: chiuso` con cosa è atterrato e la coverage misurata; la restrizione di `collectCoverageFrom` è scritta; il residuo single-flight di `useAgreements` è registrato; B5 rimanda a W8 e resta aperto; changelog con voce nuova in testa | Stato: DONE
- 4. Gate e review | files: — | done: `npx expo lint`, `npx tsc --noEmit`, `npx jest` verdi; tre angoli di review a contesto fresco con verdict `MERGE` e nessun P0/P1; i sette P2 applicati: fixture del catalogo su `descrizione` (non `mansione`), mock `expo-router` azzerato nei due `beforeEach`, test del blur in `useAgreements` (nona regola di fatto, ora provata), assert su `classificati` resa concreta, conteggio "eight" in B5, `.gitignore` e commit dei documenti | Stato: DONE
- 5. Push su `andrea-frontend` (mai su `main`) | files: — | done: albero pulito, gate verde, push riuscito, nessun `--force` | Stato: TODO

## Lanes:

- **Lane A — agreements** (blocco 1, onda 1, un `worker`):
  `Frontend/src/hooks/__tests__/useAgreements.test.js`. Mock: `expo-router`,
  `@/api` (`listAgreements`, `respondToAgreement`, `cancelAgreement`).
  `@/services/agreements` e `@/hooks/useRefresh` restano reali.
- **Lane B — catalog** (blocco 1, onda 1, un `worker`):
  `Frontend/src/hooks/__tests__/useServiceCatalog.test.js`. Mock: `expo-router`,
  `@/api` (`getHomeCatalog`). `@/services/offer-request` e `useRefresh` reali.
- **Lane C — match** (blocco 1, onda 1, un `worker`):
  `Frontend/src/app/(tabs)/__tests__/match.test.js`. Mock: `expo-router`
  (`useFocusEffect`, `useRouter`), `@/auth/auth-context` (`useAuth`), `@/api`
  (`listQueues`, `listMyServices`, `createQueue`, `cancelQueue`).
  `@/services/queues` reale.
- **shared — `Frontend/package.json`** (blocco 2, dopo l'onda 1, padre): la
  coverage dipende dai test che esistono, quindi non può stare in onda 1.
- **shared — documenti** (blocco 3, dopo l'onda 1, padre): `docs/audits/...`,
  `docs/changelog.md`.
- Le tre lane non si toccano: file disgiunti, nessuna dipendenza, nessun rename.
  Il padre non apre i tre file mentre i figli ci scrivono e committa lui, un
  commit per blocco. Git vietato ai figli.
