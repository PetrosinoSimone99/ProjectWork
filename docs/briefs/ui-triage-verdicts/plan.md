# UI triage verdicts — plan

## Brief

**Obiettivo.** Chiudere con i numeri le tre ipotesi aperte in
`docs/ui-triage.md` (H1, H2, H3) e togliere da
`docs/audits/frontend-gap-analysis-2026-11-16.md` §D la riga "hypotheses that
need a measurement". Nessuna modifica al codice.

**Contesto.** La sweep misurata è già stata eseguita il 2026-11-17: 4 viewport
(375/768/1280/1920) × 2 temi, rotte autenticate e anonime, più stati
caricamento/errore/vuoto. Script e catture vivono in `.playwright-mcp/`, che è
gitignored (`.gitignore:57`); i numeri grezzi sono in
`.playwright-mcp/ui-triage/captures/dati.json`. I valori qui sotto sono stati
riletti da quel file, non da appunti.

**Vincoli.**
- Nessun file sotto `Frontend/src` viene toccato: il compito è registrare la
  misura, non riparare (una delle tre conclusioni è "non si tocca").
- Nessun path di cattura entra nei documenti: un lettore del repo non può
  aprirli. O si committa lo script, o si lasciano i soli numeri. Decisione
  chiusa: **si committa lo script** (`docs/audits/scripts/ui-triage-sweep.js`,
  precedente in `cycle2-web.js` e `audit-mobile-360.js`), con l'output
  reindirizzato dentro `.playwright-mcp/ui-triage/captures` perché le catture
  restino fuori dal repo.
- Non toccare i file dell'audit mobile 360 di un'altra sessione:
  `docs/audits/ux-mobile-audit-2026-11-17.md`,
  `docs/audits/scripts/audit-mobile-360.js`,
  `docs/audits/screens-mobile-2026-11-17/`.
- Gate pre-push: `npx expo lint` + `npx tsc --noEmit` in `Frontend/`.
- Push solo su `andrea-frontend`.

**Decisioni chiuse (dai numeri).**
- **H1 — smentita.** Colonna 560 a 1280 con margini 360/360; 560 a 1920 con
  680/680; catalogo 720 (280/280 a 1280, 600/600 a 1920); 768 → 560 (e 720);
  375 → finestra intera (0/0). Identico nei due temi e nello stato vuoto. È
  esattamente la misura dichiarata da `docs/DESIGN.md` §Measures, banda della
  testata compresa: il difetto largo, se c'è, è il giudizio sulla misura usata
  come pagina, non il numero.
- **H2 — smentito come difetto, confermato come numero.** 136 misure; centro
  dell'inchiostro da −0,92 a −1,96 px dal centro del pill, mediana −1,42. Il box
  del composito è esattamente −2,00 px, cioè l'aritmetica di
  `marginLeft: -space.xs` (−4 di margine contro 8 di `gap`): senza il margine il
  residuo sarebbe ~+0,6 px, quindi **il margine crea quello che doveva togliere**.
  Non si tocca: 1,4 px su un pill da 118 a 528 px non si vede, e `DESIGN.md` non
  fissa un centro ottico.
- **H3 — smentita sulla premessa, non sull'allineamento.** `AppInput` è 13/600
  contro 13/400: una scala e due pesi, offset baseline 0,00 px a ogni viewport e
  tema (24 righe, 8 combinazioni). La coppia 12/600 + 13 di `PageHeader` non
  esiste: l'unico call site della variante `sezione`
  (`ServicesSection.jsx:105`) passa sempre `frase` e mai `titolo`. Quindi è
  **F4** a essere sbagliata, non l'allineamento.

**Copertura mancante (da dichiarare).** `/user/[id]` e `/chat/[agreementId]` non
sono misurabili sull'export statico: nessuna pagina viene generata per gli id e
la nav non porta un `href` verso di esse. Restano non viste.

**Criteri di successo.**
- `docs/ui-triage.md` porta i tre verdetti con i numeri al posto delle tre
  ipotesi, F4 corretta, e una sezione che dichiara la copertura mancante.
- `docs/audits/frontend-gap-analysis-2026-11-16.md` §D non dice più che serve
  una misura: dice com'è andata, e non promuove nessuna delle tre a work item.
- Lo script è nel repo e rigiocabile; nessun path di cattura in un documento.
- `docs/changelog.md` ha la voce di sessione.
- Gate verde sul frontend, push su `andrea-frontend`.

**Esclusioni.** Nessuna riparazione di codice; nessun tocco a
`docs/audits/scripts/audit-mobile-360.js` e alla sua cartella; nessun nuovo
brief per le ipotesi (non diventano work item).

Stile: lite

## How to resume

- Gate: `cd Frontend && npx expo lint && npx tsc --noEmit` (nessun test in gate,
  D019).
- Documenti, non codice: nessun figlio `worker`, nessuna lane. I tre documenti
  devono dire gli **stessi** numeri, quindi sono `shared`: un solo scrittore (il
  padre), in sequenza.
- Trappola d'ambiente: `.playwright-mcp/` è gitignored; i numeri grezzi stanno
  lì e non vanno linkati. Lo script committato deve scrivere lì, non accanto a
  sé, o il primo run sporca l'albero.
- Trappola di contenuto: `PageHeader` variante `sezione` non ha un secondo call
  site — non "il primo", l'unico. Se ne compare un altro, H3 torna aperta.
- Primo blocco: 1 (i verdetti in `docs/ui-triage.md`), perché §D e changelog lo
  citano.

## Blocks

- 1. Chiudere H1/H2/H3 con i numeri e correggere F4 in `docs/ui-triage.md`, e dichiarare la copertura mancante | files: docs/ui-triage.md | done: le tre voci di Hypothesis sono verdetti con le cifre (560/720 e gutter, 136 misure e −2,00, 13/600 vs 13/400 e offset 0,00), F4 dice che la premessa è falsa, esiste una sezione che nomina `/user/[id]` e `/chat/[agreementId]` come non viste | Stato: TODO
- 2. Chiudere §D in `docs/audits/frontend-gap-analysis-2026-11-16.md`: al posto di "hypotheses that need a measurement" il verdetto delle tre, nessuna promossa a work item, rimando a `docs/ui-triage.md` | files: docs/audits/frontend-gap-analysis-2026-11-16.md | done: il paragrafo non chiede più una misura e cita gli stessi numeri del blocco 1 | Stato: TODO
- 3. Committare la sweep come `docs/audits/scripts/ui-triage-sweep.js` con output dentro `.playwright-mcp/ui-triage/captures` | files: docs/audits/scripts/ui-triage-sweep.js | done: `node --check` verde, `OUT` punta a `.playwright-mcp/ui-triage/captures`, nessun path assoluto di macchina nel file | Stato: TODO
- 4. Voce in `docs/changelog.md` (2026-11-17, sopra la voce dell'audit mobile) | files: docs/changelog.md | done: la voce dice cosa è cambiato, i tre verdetti in una riga ciascuno, la copertura mancante, i documenti toccati e che nessun codice è stato toccato | Stato: TODO
- 5. Gate e push | files: — | done: `npx expo lint` e `npx tsc --noEmit` verdi, `git status --porcelain` pulito, push su `andrea-frontend` | Stato: TODO

Lanes: nessuna. I tre documenti condividono gli stessi numeri e si citano a
vicenda, quindi sono un solo scrittore in sequenza; zero figli, per una modifica
documentale non c'è nulla da parallelizzare. File condivisi: tutti e tre i
documenti (`docs/ui-triage.md`, §D, `docs/changelog.md`).
