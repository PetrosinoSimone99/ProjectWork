# Plan — Chat mobile: spazio, e i testi che si tagliano (class M)

## How to resume

- Gate (hard, per passo): `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest`.
  Gate rosso, niente commit. `tsc` qui non type-checka i `.jsx` (`allowJs` senza `checkJs`):
  il passo che copre il comportamento è `jest`.
- Questo file è la verità, la chat no. `grep '| Stato: TODO' docs/briefs/mobile-chat-space/plan.md`
  (col pipe: senza, il pattern pesca anche i criteri `done:`) e si parte dal primo `TODO` la
  cui condizione è vera. `N/A` non è lavoro.
- Branch `andrea-frontend`. Push solo lì, gate verde, mai `main`, mai `--force`. All'apertura
  del ciclo il branch era 1 commit avanti a `origin/andrea-frontend` (un commit `docs:`).
- Blocco 0 = questo file committato. Nessun figlio parte prima che quel commit esista.
- Trappole: (a) `ModalShell` ha già il suo `ScrollView` di corpo — ogni `ScrollView` dentro
  `children` è uno scroller annidato, e in `staff.jsx` ce ne sono tre con `maxHeight: '85%'`
  (percentuale di un padre senza altezza definita); (b) `AppInput` è condiviso da sei campi,
  la prop nuova deve avere come default il valore di oggi (96); (c) il composer ha una
  suite che conta i nodi: label `Messaggio`, contatore `0/1000`, nome `Invia` restano
  identici; (d) nessun `numberOfLines` nuovo: la richiesta è che i testi **non** si taglino.
- Primo blocco dopo questo: passo 1 (`staff.jsx`), perché è il difetto che l'utente ha visto.

## Brief

**Obiettivo.** Due foti da iPhone (390x844 pt) mostrano: (1) la chat dove la cornice fissa —
testata 110, battute da 32, composer 178 — lascia ai messaggi 325 pt su 727, cioè il 45%;
(2) il pannello «Dettaglio dell'operazione» dove `reviewNote` si ferma a «…i dati personali
sor» e le ultime righe di `Dopo` non si raggiungono. Terzo punto, chiesto esplicitamente:
lo stesso taglio non deve esistere altrove.

**Vincoli.**
- Nessun testo troncato: niente `numberOfLines` nuovo, niente ellissi. Lo spazio si guadagna
  sulla cornice, non sul contenuto.
- Un solo scroller per pannello: `ModalShell` dichiara che scorre **solo il corpo**; i tre
  `ScrollView` di `staff.jsx` contraddicono quel contratto.
- I token restano una fonte sola: nessun letterale nuovo in una schermata. Se serve una
  misura nuova, va in `theme/tokens.js` e in `docs/DESIGN.md`.
- Il contratto di copy e di nomi non si rinegozia: `Invia`, `Messaggio`, `0/1000`, «scheda di
  consegna», i nomi italiani delle prop.

**Decisioni chiuse.**
1. Il composer diventa **una riga**: campo a due righe (`minHeight` 56) e `Invia` accanto,
   allineato in basso. Non è un'eccezione alla regola «le azioni in coda formano una colonna»:
   quella regola parla di una card, e qui l'azione è dell'input, non della scheda.
2. La frase della testata **resta intera** (nessun taglio): si guadagna spazio sulle battute
   (32 → 12) e sul composer, non sulla frase. Si corregge solo la giunzione rotta
   «…anche la sera. per Revisione…» in «…in cambio di…».
3. Nel pannello dell'operazione la coppia chiave/valore resta **una riga** con la chiave su
   una colonna da 88 e il valore che va a capo (`flex: 1, minWidth: 0`). Non si passa a
   chiave-sopra-valore: 6 righe per blocco diventerebbero 12.
4. Lo sweep dei testi tagliati copre i quattro punti trovati leggendo i layout a riga:
   `AgreementSheet` (riga icona+descrizione e `RigaFatto`), `QueueCard` (categoria e luogo),
   `AgreementCard` (controparte). Non è un audit di tutta l'app: è la stessa classe di
   difetto, chiusa dove il testo può essere lungo.

**Criteri di successo.**
- A 390x844 la lista dei messaggi è almeno il 55% dell'altezza del contenuto (era 45%), e
  l'altezza del composer a riposo è ≤ 90 pt (era 178).
- `Dettaglio dell'operazione`: `reviewNote` si legge intero su più righe e l'ultima riga di
  `Dopo` si raggiunge scorrendo; nessun `ScrollView` dentro `ModalShell` in `staff.jsx`.
- `scrollWidth === clientWidth` sulle quattro superfici dello sweep alla larghezza di 375 e
  412, con il testo più lungo che i fixture hanno.
- Gate verde, suite esistente intatta.

**Esclusioni.**
- La bolla del menu dev (il cerchio blu con l'ingranaggio in alto a destra nelle due foto)
  non è codice dell'app: è l'overlay di Expo in dev. Non si tocca.
- Nessun ridisegno della chat: niente `BarterPair` nella testata, niente bolle diverse,
  niente colori nuovi.
- Nessuna misura su dispositivo fisico: le quote sono calcolate sulla scena 390x844 e
  verificate sui testi e sugli stili, e il piano lo dichiara.

## Triage

`M: 13 file (2 nuovi), 6 figli in una ondata, ~60-90 min`

## Lock (le domande che cambiano una decisione)

1. **Composer a una riga** (campo a sinistra, `Invia` a destra) invece di due blocchi
   impilati. *Raccomandata: sì.* È l'unico modo di recuperare ~90 pt senza toccare il testo.
2. **La frase della testata resta intera a 4 righe**, e si guadagna sulle battute. *Raccomandata:
   sì*, perché chiedi esplicitamente che i testi non si taglino; l'alternativa (2 righe con
   ellissi) taglia la descrizione del servizio.
3. **Chiave/valore su una riga con la chiave a colonna 88 e il valore che va a capo**, invece
   di chiave sopra valore. *Raccomandata: sì.*
4. **Lo sweep tocca anche `AgreementSheet`, `QueueCard` e `AgreementCard`** oltre al pannello
   staff. *Raccomandata: sì* — sono la stessa riga senza `flexShrink`, e la scheda di consegna
   è quella che si apre proprio dalla chat.

## Steps

- 0. Commit del contratto e di questo piano | files: docs/briefs/mobile-chat-space/plan.md | done: il file è in HEAD e `git status --porcelain` è vuoto | Stato: DONE — `2e9b2a7`
- 1. Il pannello dell'operazione: via i tre `ScrollView` annidati, scorre solo il corpo di `ModalShell` | files: Frontend/src/app/staff.jsx | done: `grep -c '<ScrollView' Frontend/src/app/staff.jsx` = 0; il dettaglio arriva all'ultima riga di `Dopo` e l'import non resta inutilizzato (lint verde) | Stato: DONE — `8232615`: i tre `ScrollView` (righe 577/640/653) sono spariti con l'import; `grep -c '<ScrollView'` = 0, lint verde. Scorrimento verificato strutturalmente (un solo scroller, corpo `flexShrink: 1`), non a schermo
- 2. Il pannello dell'operazione: il valore lungo va a capo invece di uscire dal pannello | files: Frontend/src/components/StaffDetailPanels.jsx,Frontend/src/components/__tests__/StaffDetailPanels.test.js | done: `reviewNote` si legge intero su più righe, la chiave tiene una colonna da 88, e il test nuovo asserisce che il nodo del valore restringe (`flex` + `minWidth: 0`) e non porta `numberOfLines` | Stato: DONE — `8232615`: chiave `flexShrink: 0, minWidth: 88`, valore `flex: 1, minWidth: 0`, `alignItems: 'flex-start'`; il test nuovo ha 3 casi e la suite intera passa
- 3. `AppInput`: una prop per l'altezza minima del campo multilinea, col default di oggi | files: Frontend/src/components/AppInput.jsx | done: senza la prop il campo multilinea è ancora 96; con la prop scende a 56; gli altri cinque campi multilinea non cambiano | Stato: DONE — `e79caac`: `altezzaMinima` con default `ALTEZZA_MINIMA_MULTILINEA` (96); nessun altro campo toccato
- 4. Chat: la cornice fissa smette di mangiarsi lo schermo | files: Frontend/src/app/chat/[agreementId].jsx | done: una sola colonna flex con `space.md` fra i blocchi, la lista è l'unica cosa che cresce, la giunzione della frase legge «in cambio di» | Stato: DONE — `a16faa2`: un figlio solo dentro `Screen` (`flex: 1, gap: space.md`), testata e blocco lista a `space.md`, `senzaPuntoFinale` + «in cambio di». Diff reale 22+/9− (il resto è rientro)
- 5. Composer: campo e `Invia` su una riga, campo a due righe | files: Frontend/src/components/MessageComposer.jsx,Frontend/src/components/__tests__/MessageComposer.test.js | done: altezza a riposo ≤ 90 pt, e la suite del composer passa senza modifiche alle asserzioni esistenti | Stato: DONE — `a16faa2`: riga a `flex-end`, campo `flex: 1, minWidth: 0` con `altezzaMinima={56}`, 82 pt stimati a riposo; 9 test (8 esistenti intatti + 1 nuovo sul layout)
- 6. Sweep: ogni riga etichetta+valore restringe il testo | files: Frontend/src/components/AgreementSheet.jsx,Frontend/src/components/QueueCard.jsx,Frontend/src/components/AgreementCard.jsx,Frontend/src/components/__tests__/AgreementSheet.test.js | done: `scrollWidth === clientWidth` a 375 e 412 sulle tre superfici col testo lungo, e un test asserisce lo stile che restringe | Stato: DONE — `73b2e8a`: cinque righe (scheda ×2, coda ×2, accordo ×1) prendono `flexShrink: 1, minWidth: 0`; `scrollWidth === clientWidth` **non** misurato a schermo (nessun browser in questa sessione): è asserito dallo stile, non dalla misura
- 7. Documentazione: changelog e la riga del composer in `DESIGN.md` | files: docs/changelog.md,docs/DESIGN.md | done: una voce di changelog nomina le quattro superfici, e le regole di composizione dichiarano che input e invio sono una riga sola | Stato: DONE — voce di changelog del 2026-11-19 e due regole nuove in `DESIGN.md` («One writing row», «A row that holds text has a flexible side»)

## Lanes

Una ondata = una sola chiamata `subagent({ tasks: [...] })`. File disgiunti, un padrone per
file. `shared` toccati dal padre **prima** dell'ondata e committati come base.

- **Base del padre (prima dell'ondata):** passo 3 (`AppInput.jsx`) e passo 0 (questo file).
  `AppInput` è la dipendenza del passo 5: senza la prop, il figlio del composer inventerebbe
  un letterale.
- **Ondata 1, 6 figli, ~15 min:**
  - A1 `Frontend/src/app/staff.jsx` (passo 1)
  - A2 `Frontend/src/components/StaffDetailPanels.jsx` + `components/__tests__/StaffDetailPanels.test.js` (passo 2)
  - B1 `Frontend/src/app/chat/[agreementId].jsx` (passo 4)
  - B2 `Frontend/src/components/MessageComposer.jsx` + `components/__tests__/MessageComposer.test.js` (passo 5)
  - C1 `Frontend/src/components/AgreementSheet.jsx` + `components/__tests__/AgreementSheet.test.js` (passo 6a)
  - C2 `Frontend/src/components/QueueCard.jsx` + `Frontend/src/components/AgreementCard.jsx` (passo 6b)
- **Chiusura del padre:** commit per confine (staff / chat / sweep), passo 7, gate completo,
  push su `andrea-frontend`.
- `shared`: nessuno fra le lane. `AppInput.jsx` è del padre e basta.
