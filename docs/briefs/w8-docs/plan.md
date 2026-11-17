# W8 — Documentation drift

`Stile: lite` · Classe `M` · 5 file (1 nuovo) · 2 ondate di figli (3 writer, 2 reviewer) · gate 1

Item: `docs/audits/frontend-gap-analysis-2026-11-16.md` §C W8.

## How to resume

- Gate: `cd Frontend && npx expo lint && npx tsc --noEmit`. `npx jest` non è nel
  gate (D019) ma il ciclo lo usa come verifica: girava verde (32 suite, 346 test)
  il 2026-11-17 prima del primo edit.
- Branch di lavoro `andrea-frontend`; mai `main`. Push solo alla chiusura.
- Ripresa: `git status --porcelain`, poi `grep '| Stato: TODO' docs/briefs/w8-docs/plan.md`
  (col pipe), si parte dal primo TODO con condizione vera.
- Trappola d'ambiente: `sed`/`grep` via bash non contano come lettura. Prima di
  ogni `edit` il file va aperto con `read`.
- Trappola d'ambiente: nascondere i numeri di copertura non è un'opzione — la
  tabella jest è stata misurata su questo albero, e la doc deve riportare quella.
- Primo blocco eseguibile: blocco 1 (commit di questo piano). Nessun figlio parte
  prima.

## Brief

**Obiettivo.** Nessun documento del repo descrive un file, una directory o una
cifra di copertura che l'albero non mostra. L'audit W8 nomina cinque punti: due
sono già sanati da altri item (B2, B3), tre no (B4, B5, e una sezione di
`docs/ui-triage.md` diventata falsa al contrario). Si chiude W8, non si apre un
nuovo ciclo di doc.

**Vincoli.**
- Solo documentazione. Nessuna riga di `Frontend/src/**` cambia: B2 e B3 sono
  già veri sul codice di oggi.
- Numeri solo misurati: `npx jest --coverage` su questo albero, 2026-11-17.
- `Backend/**` e `Context_and_DB_V2/**` restano fuori. Nessun `.env*` letto.
- Gate verde prima di ogni commit che non sia il blocco 0 (che è solo docs e
  comunque passa il gate perché non tocca `Frontend/`).
- `AGENTS.md` di root **non** si tocca: la sua riga 130 è già corretta e lo era
  quando l'audit l'ha scritto.

**Decisioni chiuse (lock).**

1. `docs/architecture.md:45` — la riga `src/agreements/` **si sostituisce** con
   `src/validation/`, non si cancella: `Frontend/src/validation/` esiste
   (`index.js` + `__tests__/`) e l'albero non lo nominava. Una riga, stessa forma.
   *Raccomandata: sostituire.*
2. `docs/frontend.md:136-142` — si pubblicano i numeri misurati (32 suite, 346
   test, 5 file in `collectCoverageFrom`, 95.71% stmt / 90.86% branch sul
   campione) **e** si nominano gli otto hook senza test. La cifra senza campione
   era esattamente il difetto B5.
   *Raccomandata: sì, nominarli tutti e otto.*
3. `docs/ui-triage.md:78-93` — la sezione «Correction: there is no fake-data
   mode» è diventata falsa al contrario: dichiara che `AGENTS.md` documenta
   ancora `EXPO_PUBLIC_DATI_FINTI`, e `AGENTS.md:130` dice che non esiste più. Si
   riscrive la sezione (la parte su D011 e sugli utenti demo resta) e si butta
   l'ultimo paragrafo, che oggi accusa un documento già corretto.
   *Raccomandata: riscrivere, non cancellare la sezione.*
4. `docs/audits/...-2026-11-16.md` — si aggiorna W8 (`Stato: chiuso` + cosa è
   atterrato) **e** si marcano chiusi B2/B4/B5 in §B, così l'audit non continua ad
   asserire drift che non c'è. B3 e B6 restano come sono.
   *Raccomandata: chiudere B2/B4/B5.*

**Criteri di successo.**
- `grep -rn "src/agreements" docs/` → solo l'audit (che la nomina come difetto
  storico) e il piano.
- `docs/frontend.md` non contiene più `99% statements` né «two modules», e i
  numeri che contiene corrispondono a `npx jest --coverage`.
- `docs/ui-triage.md` non contiene più l'affermazione che `AGENTS.md` documenta
  il fake-data.
- W8 nell'audit: `Stato: chiuso`, con data e tre righe di cosa è stato chiuso;
  la riga 9 di §E lo riflette.
- Una entry in `docs/changelog.md`, newest-first, stesso commit dell'audit.
- Gate verde, albero pulito, push su `andrea-frontend`.

**Esclusioni.**
- Nessun edit a `Frontend/src/components/ServiceDetailModal.jsx:34-38` (B2: il
  docstring descrive già `UserServicesMiniCard` con la chiamata vera, riga 245) né
  a `Screen.jsx:52` (B3: chiuso da W1, il paragrafo è vero) → `N/A`.
- Nessun edit a `AGENTS.md` (riga 130 corretta) → `N/A`.
- `docs/ui-triage.md` finding table: F3 è già `closed 2026-11-16 (W1)` → `N/A`.
- Nessun rinomina, nessun refactor, nessun test nuovo: W8 non tocca né codice né
  suite.

## Fatti misurati (2026-11-17, questo albero)

- `Frontend/src`: nessuna directory `agreements/`; esistono `api`, `app`, `auth`,
  `components`, `hooks`, `navigation`, `services`, `theme`, `validation`.
- `npx jest --coverage`: 32 suite, 346 test, tutti verdi. Sul campione di
  `collectCoverageFrom`: 95.71% statements, 90.86% branch, 95.08% funcs,
  95.86% lines.
  - `hooks/useAgreements.js` 95.16 / 77.27 · `hooks/useServiceCatalog.js`
    90.69 / 89.74 · `services/agreements.js` 98.5 / 96.62 ·
    `services/italian-locations.js` 100 / 100 · `validation/index.js` 100 / 81.57.
- `Frontend/package.json` `collectCoverageFrom`: 5 voci.
- `Frontend/src/hooks`: 12 file `.js`, 4 suite in `__tests__/`
  (`useAgreements`, `useChat`, `useNotifications`, `useServiceCatalog`). Senza
  test: `useCategories`, `useDocumentTitle`, `useReducedMotion`, `useRefresh`,
  `useSessionExpiry`, `useUserServices`, `useWebColorScheme`, `web-chrome`.
  `useChat` e `useNotifications` hanno una suite ma **non** sono in
  `collectCoverageFrom`.
- Suite per cartella: `api` 7, `components` 10, `services` 7, `hooks` 4,
  `app/(tabs)` 1, `auth` 1, `navigation` 1, `validation` 1.
- `AGENTS.md:130`: «There is no fake-data mode. `EXPO_PUBLIC_DATI_FINTI` was
  removed (D011)» → già corretto.

## Piano

- 1. Commit del contratto e del piano (blocco 0) | files: docs/briefs/w8-docs/plan.md | done: `git log -1 --name-only` mostra il piano, `git status --porcelain` vuoto | Stato: DONE
- 2. Lane A — `docs/architecture.md`: riga 45 `src/agreements/` → `src/validation/` («pure validation helpers, one module for every form»), più il phantom `src/Subscriber/` → `src/EventSubscriber/` segnalato dalla lane (padre, stessa regola) | files: docs/architecture.md | done: `grep -c "src/agreements" docs/architecture.md` = 0, `grep -c "src/validation" docs/architecture.md` = 1, `ls Backend/src/EventSubscriber` esiste | Stato: DONE
- 3. Lane B — `docs/frontend.md` §tests (righe 136-142): numeri misurati, cinque file del campione nominati, otto hook senza test nominati, D019 invariato | files: docs/frontend.md | done: `grep -c "99% statements\|two modules" docs/frontend.md` = 0 e i numeri nel file coincidono con §Fatti | Stato: DONE
- 4. Lane C — `docs/ui-triage.md`: sezione «Correction: there is no fake-data mode» riscritta (AGENTS.md ora corretto), ultimo paragrafo sostituito | files: docs/ui-triage.md | done: `grep -c "still documents" docs/ui-triage.md` = 0, la sezione cita D011 e `AGENTS.md:130` | Stato: DONE
- 5. Commit ondata 1 (A+B+C) | files: docs/architecture.md, docs/frontend.md, docs/ui-triage.md | done: un commit, `git show --stat` = esattamente quei 3 file, gate verde | Stato: DONE
- 6. Chiusura nell'audit: W8 `Stato: chiuso` (2026-11-17) con cosa è atterrato; B2/B4/B5 marcati chiusi in §B; riga 9 di §E aggiornata | files: docs/audits/frontend-gap-analysis-2026-11-16.md | done: `grep -n "Stato: TODO" ` non trova W8; B2/B4/B5 dicono «closed» | Stato: DONE
- 7. Entry in changelog (newest-first, dopo l'header): W8, cosa è cambiato, perché, numeri, file toccati, verifica | files: docs/changelog.md | done: `head -15 docs/changelog.md` mostra la entry sopra quella di W9 | Stato: DONE
- 8. Gate + commit di 6+7 | files: docs/audits/frontend-gap-analysis-2026-11-16.md, docs/changelog.md | done: `npx expo lint` e `npx tsc --noEmit` verdi in `Frontend/`, commit con i 2 file | Stato: DONE
- 9. Review a contesto fresco, 2 angoli in parallelo: correttezza (`deepseek-v4.1-flash`) e coerenza col brief (`glm-5.3-flash`); angolo sicurezza `N/A` (nessun codice, nessun dato, nessuna superficie auth) | files: nessuno | done: due verdetti con file:riga, P0/P1/P2 applicati o rifiutati con motivo | Stato: DONE
- 10. Push su `andrea-frontend` (mai `main`) | files: nessuno | done: albero pulito, `git log origin/andrea-frontend..HEAD --oneline` = i commit attesi | Stato: DONE

## Esito review (2026-11-17)

Due verdetti `pass`, nessun P0/P1. Applicati e rifiutati:

- **P2 accettato** — l'audit citava `docs/frontend.md:136-142`, il blocco riscritto
  arriva a 158. Citazione corretta a `136-158`.
- **P2 rifiutato** (fuori scope, registrato) — `docs/architecture.md:31`
  (`src/Manager/, src/Service/`) allinea la descrizione alla colonna 28 invece che
  24 come ogni fratello. Difetto preesistente, non introdotto qui: una riga da
  sistemare alla prossima passata sull'albero, non vale un ciclo di W8.
- **P2 rifiutato** (lettera vs intenzione del criterio) — il criterio grep dice
  che `src/agreements` deve restare solo nell'audit e nel piano; compare anche
  nella entry di changelog, come menzione storica («non esisteva, ora è
  `src/validation/`»). Il criterio è «nessun documento descrive un file che
  l'albero non mostra», e una menzione storica non descrive: nulla da editare.
- **Cifre rimisurate ad HEAD** dopo la review, su albero pulito: 32 suite, 346
  test, totali e per-file identici a quelli pubblicati (95.71 / 90.86 / 95.08 /
  95.86; useAgreements 95.16 / 77.27; useServiceCatalog 90.69 / 89.74;
  agreements 98.5 / 96.62; italian-locations 100 / 100; validation 100 / 81.57).

## Lanes:

- **lane-a** — `docs/architecture.md` (blocco 2).
- **lane-b** — `docs/frontend.md` (blocco 3).
- **lane-c** — `docs/ui-triage.md` (blocco 4).
- **shared** (padre, dopo l'ondata 1): `docs/audits/frontend-gap-analysis-2026-11-16.md`,
  `docs/changelog.md`.
- Albero condiviso, non worktree: git lo tocca solo il padre, tre file disgiunti,
  un writer per file.
