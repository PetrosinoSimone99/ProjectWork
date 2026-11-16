# Global error boundary — W5 (audit B7)

Classe: **M** — 5 file (2 nuovi), 2 figli, 1 stop (questo piano). Stile: `full`.
Fonte: `docs/audits/frontend-gap-analysis-2026-11-16.md` — B7 (P1) e C/W5.

## Brief

**Obiettivo.** Nessun throw dentro un render lascia l'utente su una schermata
bianca. Oggi `grep -rn "ErrorBoundary\|componentDidCatch" Frontend/src` non
restituisce niente (audit B7, verificato di nuovo in questo ciclo: 0 hit).

**Vincoli.**

- Il boundary si monta **attorno allo `Stack`** in `src/app/_layout.jsx`, dentro
  `ThemeProvider` + `AuthProvider` + `RootNavigator`: gli avvisi globali
  (`SessionExpiryBanner`, `WebNavMenu`) e gli hook di shell continuano a vivere
  anche quando una schermata crasha.
- Copy in italiano, onesta, **zero dettagli tecnici a schermo** (niente stack,
  niente messaggio dell'eccezione).
- `console.error` (con `error` e `info`) **solo sotto `__DEV__`**.
- Identificatori in inglese (regola `AGENTS.md`, nuova code); copy UI in
  italiano; nessun emoji.
- `Riprova`: rimonta il sottoalbero (chiave di retry che cambia), non solo
  ridipinge il fallback.
- `Torna ai servizi`: resetta lo stato del boundary e naviga a `/`.
- Niente librerie nuove: `react-test-renderer` è già in devDependencies e
  `jest`/`jest-expo` sono già configurati (`testMatch: **/__tests__/**/*.test.js`).
- Icone/colori dai token esistenti (`useTokens`, `space`, `radius`), nessun
  colore letterale; il fallback usa `AppText`/`AppButton` come il resto dell'app.

**Decisioni chiuse.**

1. Forma: una classe `AppErrorBoundary` (`getDerivedStateFromError` +
   `componentDidCatch`) nello stesso file del fallback di funzione
   `ErrorFallback`. Il fallback usa `useRouter()` (convenzione del repo, es.
   `src/app/(auth)/login.jsx:3`); la classe non può usare hook.
2. Stato del boundary: `{ error, retryKey }`. `Riprova` fa
   `setState({ error: null, retryKey: retryKey + 1 })`; il sottoalbero è reso in
   un `<Fragment key={retryKey}>` così il retry **rimonta** davvero.
3. `Torna ai servizi` fa lo stesso reset e poi `router.replace('/')`: senza il
   reset il fallback resterebbe a schermo dopo la navigazione.
4. Accessibilità: il contenitore del fallback ha `accessibilityRole="alert"`;
   i due comandi sono `AppButton` (già `accessibilityRole="button"`,
   `accessibilityLabel`, `minHeight: 50`), quindi raggiungibili da tastiera sul
   web e annunciati. Il titolo è un `AppText variant="title"` (ruolo `header`,
   livello 1).
5. Il test copre il comportamento, non l'implementazione: un figlio che lancia
   rende il fallback (il testo è nel tree, non una schermata vuota), `Riprova`
   rimonta il figlio (il figlio "ripara" al secondo tentativo e il suo contenuto
   riappare), `Torna ai servizi` chiama `replace('/')`, `console.error` è
   chiamato una volta sola e non contiene testo a schermo.

**Criteri di successo.**

- `npx expo lint`, `npx tsc --noEmit`, `npx jest` verdi (231 test attuali + i
  nuovi).
- Il nuovo test fallisce se il boundary viene rimosso da `_layout.jsx`? No: il
  test monta il componente direttamente. La verifica del montaggio è il
  `grep` sul `_layout.jsx` + il gate; il test prova il comportamento del
  componente. Dichiarato qui per non fingere una copertura che non c'è.
- `docs/changelog.md` con la voce di sessione e la sezione W5 dell'audit
  chiusa, **nello stesso commit** del codice.

**Esclusioni.**

- Nessun boundary per-schermata, nessun retry automatico, nessun report verso
  il backend (non esiste un endpoint e non serve per chiudere B7).
- Nessun tocco a `Backend/**`, nessuna rinomina (W9 è un altro item).

## Piano

- 1. Scrivere `AppErrorBoundary` (classe + `ErrorFallback`) con reset, retry con chiave, `router.replace('/')`, `accessibilityRole="alert"`, log solo in `__DEV__` | files: Frontend/src/components/AppErrorBoundary.jsx | done: il file esporta `AppErrorBoundary`, non contiene colori letterali, `console.error` compare solo dentro un `if (__DEV__)` | Stato: fatto — `0e22832`
- 2. Scrivere il test con `react-test-renderer` che prova fallback al posto di schermata bianca, retry che rimonta, reset a `/`, log solo in dev | files: Frontend/src/components/__tests__/AppErrorBoundary.test.js | done: `npx jest AppErrorBoundary` verde, 4 test, nessun warning di `act` | Stato: fatto, ma non come scritto qui — vedi «Il test rosso» sotto
- 3. Montare il boundary attorno allo `Stack` in `_layout.jsx`, senza spostare gli avvisi globali | files: Frontend/src/app/_layout.jsx | done: `<AppErrorBoundary>` avvolge `<Stack>` e nient'altro; `npx expo lint` e `npx tsc --noEmit` verdi | Stato: fatto — `0e22832`
- 4. Docs: voce in `docs/changelog.md` (sessione, cosa, perché, touched) e chiusura di W5 nell'audit, che è ancora untracked e va nel commit | files: docs/changelog.md,docs/audits/frontend-gap-analysis-2026-11-16.md | done: changelog in testa con data 2026-11-16 e commit del ciclo; W5 marcata chiusa con il suo commit | Stato: fatto, nello stesso commit che ha riparato il test
- 5. Gate completo e review a contesto fresco (correttezza / accessibilità e dati / coerenza col brief) | files: - | done: lint + tsc + jest verdi; verdetto Merge con P0/P1/P2 su file:linea | Stato: fatto — `expo lint` e `tsc --noEmit` puliti, `jest` 18 suite / 235 test verdi

Lanes: `single`. Condizione che manca per le lane: i tre file di codice sono in
dipendenza stretta (il test importa il componente, `_layout.jsx` monta il
componente) e il lavoro di una lane sarebbe più corto del costo di merge e
verifica. Nessun file `shared` da toccare prima: `_layout.jsx` e i due doc li
scrive il padre.

## Ripresa a freddo

`git status --porcelain` prima di tutto: i file sporchi sono il blocco in corso.
Poi `grep 'Stato: TODO'` su questo file e si parte dal primo TODO con
condizione vera.

## Il test rosso (chiuso)

Il quarto test era rosso: `remounts the children on Riprova` trovava il figlio
già recuperato prima di premere. Causa, letta dal `renderLog` e non intuita:
React 19 **ripete** a priorità sincrona il render che lancia, quindi un figlio
«lancia solo al primo tentativo» non arriva mai al boundary — il secondo
tentativo, che è la ripetizione automatica, riesce. Il contatore dei render non
è una condizione di crash.

Riparazione: il figlio lancia da un gate di modulo (`shouldCrash`), non da un
contatore, e il crash viene provocato **dopo** il mount con
`renderer.update(...)`. Così il test prova ciò che il piano voleva provare e in
più qualcosa di più forte: il figlio montato (uno `useEffect` di mount
registrato), poi il crash su update, poi `Riprova` → secondo mount reale
(`mounts` da 1 a 2), non una ridipintura dell'albero.
