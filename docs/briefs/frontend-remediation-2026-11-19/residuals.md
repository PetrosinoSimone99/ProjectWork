# Residui — misurare e poi chiudere, in un solo giro

Continuazione del ciclo `frontend-remediation-2026-11-19` (`plan.md`,
`plan-brief.md`). La sessione del 19/11 ha chiuso i P1 dell'audit e ha misurato
quattro rotte in tema chiaro (`rescore.md`); qui c'è **tutto il resto**, in
ordine: le misure mai fatte, poi l'unica fix aperta, poi la riverifica di quella
fix, poi il nativo (che qui non si misura) e infine la registrazione.

Un file e non due perché l'ordine è parte del contenuto: misurare dopo una fix
significa catturare un albero che sta cambiando.

**Ripresa, una riga:** "Esegui: `docs/briefs/frontend-remediation-2026-11-19/residuals.md`".

## Ordine di esecuzione

| # | Passo | Scrive codice? | Costo |
| --- | --- | --- | --- |
| 0 | ambiente: backend, export statico, server | no | 2 min |
| 1 | misure di base: tema scuro, pannello notifiche in errore, larghezze | no | 25 min |
| 2 | F1: `Crediti disponibili` è testo nudo su `/match` | **sì** | 5 min |
| 3 | riverifica di ciò che il passo 2 ha toccato | no | 5 min |
| 4 | nativo: si dichiara, e si passa la checklist a chi ha il telefono | no | 0 min |
| 5 | registrazione: tabella, `rescore.md`, `changelog.md`, commit e push | no | 5 min |

I passi 1 e 3 non si invertono col 2: prima si fotografa l'albero com'è, poi si
tocca, poi si rifotografa solo ciò che si è toccato. Se il passo 1 trova
difetti nuovi, **non** si correggono dentro questo file: diventano finding in
`docs/audits/` con la forma degli assessment del 18/11, e ognuno apre un blocco
suo nel `plan.md`.

## Regole che non si negoziano

- **Un contesto Playwright per volta, mai più di due vivi.** Su questo server
  Expo ogni rotta in più costa 5-30 s e le catture mostrano l'overlay
  "Bundling": è così che una sessione precedente ha perso due findings (un 404 e
  una struttura di titoli, entrambi falsi).
- **Build statico, non dev server.** `npx expo export --platform web` non ha
  Metro: nessuna compilazione per rotta, nessun overlay.
- **Credenziali demo:** si leggono da `docs/setup.md` (§«The account that can
  open everything»). Non si inventano e non si trascrivono qui.
- Ogni risultato si scrive **nello stesso turno** in cui lo si ottiene, nella
  tabella del passo 5. Senza riga scritta, la misura non esiste.

## Passo 0 — ambiente (2 min)

```bash
cd Backend && docker compose up -d          # backend su :8000, DB seminato
cd .. && cd Frontend && npx expo export --platform web
cd .. && python -m http.server 8090 -d Frontend/dist &
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/api/categories   # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8090/                 # 200
```

Trappola già pagata: `http://localhost:8090/login.html` **non** funziona — il
router risolve `/login.html`, che non è una rotta, e mostra il 404. Si parte
sempre da `/` e si lascia che il redirect porti a `/login?ritorno=/`, oppure si
naviga cliccando. Un 404 visto aprendo un file `.html` è un artefatto del server
statico, non un difetto dell'app.

## Passo 1 — misure di base, albero fermo (25 min)

### 1a. Tema scuro su `/chat`, `/edit-profile`, `/user/<id>` (10 min)

Il 18/11 il passo scuro si era interrotto su un 500 delle notifiche: queste tre
rotte non sono mai state viste in tema scuro.

1. Un contesto: `playwright_browser_emulate_media({ colorScheme: "dark" })`.
2. Naviga `/`, accedi con l'account demo dello staff.
3. Per ognuna delle tre rotte: raggiungila cliccando, cattura con
   `playwright_browser_take_screenshot({ fullPage: true, scale: "css" })`.
4. Su ogni rotta leggi i colori calcolati e calcola il contrasto:

```js
// playwright_browser_evaluate
(() => {
  const lum = (c) => {
    const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const sfondo = getComputedStyle(document.body).backgroundColor;
  const out = [];
  for (const el of document.querySelectorAll('div,span,p,h1,h2,label')) {
    const testo = (el.childNodes[0] && el.childNodes[0].nodeType === 3) ? el.textContent.trim() : '';
    if (!testo) continue;
    const st = getComputedStyle(el);
    const a = lum(st.color), b = lum(sfondo);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (ratio < 4.5) out.push({ testo: testo.slice(0, 40), colore: st.color, ratio: +ratio.toFixed(2) });
  }
  return { sfondo, sottoSoglia: out };
})()
```

**Passa se:** ogni coppia testo/sfondo ≥ 4,5:1 (≥ 3:1 per testo grande: ≥ 18,66 px
bold o ≥ 24 px), e i bordi dei controlli ≥ 3:1. **Fallisce se:** un solo testo
sotto soglia, o un controllo il cui bordo scompare sullo sfondo.

### 1b. Pannello notifiche in errore (10 min)

È la domanda aperta §6 dell'audit: il 18/11 fu visto un 500 vero e non si seppe
dire se il pannello mostrasse un errore o una lista vuota silenziosa.

```js
// playwright_browser_run_code_unsafe — forza il 500 sull'endpoint notifiche
await page.route('**/notifications**', (r) => r.fulfill({ status: 500, body: '{"error":"forced"}' }));
```

Poi apri la campanella, attendi, cattura, e leggi il DOM (`browser_snapshot`).

**Passa se:** compare uno stato d'errore con un'azione di ripetizione, e la
richiesta fallita è nominata (URL e corpo) nel report: così l'endpoint non resta
anonimo come il 18/11. **Fallisce se:** resta una lista vuota senza spiegazione,
o l'errore esiste solo in console.

### 1c. Larghezze 412 / 768 / 1024 (5 min)

Le classi di dimensione (`compact` < 600, `medium` < 1024, `expanded`) e la
griglia del catalogo sono state misurate solo a larghezza desktop.

Per ogni larghezza, con un solo contesto:
`playwright_browser_resize({ width, height: 900 })`, poi `/`, `/agreements`,
`/profile`, e su ognuna:

```js
// playwright_browser_evaluate
({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })
```

**Passa se:** `scrollWidth === clientWidth` su tutte e tre le rotte a tutte e tre
le larghezze, e a 412 ogni card del catalogo ha lo stesso numero di righe di
meta (la griglia è a forma fissa). **Fallisce se:** un overflow, o due card con
forma diversa nella stessa lista.

## Passo 2 — F1: `Crediti disponibili` è testo nudo (5 min, scrive codice)

**Dove.** `Frontend/src/app/(tabs)/match.jsx:240`:

```jsx
{profile !== null ? <AppText variant="small">{`Crediti disponibili: ${profile.crediti ?? 0}`}</AppText> : null}
```

**Cosa si vede.** Una riga di testo piccolo, grigia, senza superficie e senza
icona, appoggiata fra due blocchi. È il numero che decide se l'azione principale
della schermata può partire, e sembra una nota a piè di pagina: il dato più
importante di `/match` è il più debole visivamente.

**Cosa deve vedersi.** Un **marchio di dato**, non una frase:

- una riga sola: icona (`ticket-outline`) + etichetta `Crediti disponibili`
  (`AppText variant="small" tone="secondary"`) + valore in evidenza
  (`variant="label"`, `fontWeight: '600'`, `fontVariant: ['tabular-nums']` così
  due saldi hanno la stessa larghezza);
- sfondo `t.background` con `radius.input`, `paddingHorizontal: space.sm`,
  `minHeight: target.min`, allineata a sinistra come i marchi delle card;
- **nessun accento**: il credito non è l'azione primaria e la regola dell'accento
  resta su `Richiedi` (`DESIGN.md`, lista chiusa). A saldo zero, il segnale è
  testo (`t.danger`) e una frase che dice cosa fare — non un riempimento.

**Vincoli.** Il numero resta `balance` (`profile.crediti ?? 0`), la stessa
sorgente che legge la conferma (`:262`): due numeri diversi nella stessa
schermata sarebbero due verità. Non si toccano `askRequestConfirm`, `hasCredit`
né `CreateQueueActions`. Un solo file: `match.jsx`.

**Verifica.** `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest src/app --bail`
verdi; una riga `Stato:` aggiornata nel `plan.md` e un commit suo.

## Passo 3 — riverifica dopo la fix (5 min)

Solo ciò che il passo 2 ha toccato, perché il resto è già fotografato al passo 1.

- `/match` a 375 e a 412, tema chiaro e scuro: il saldo si legge a colpo d'occhio
  fra il titolo e le due azioni, allineato a sinistra, **mai** andato a capo in
  mezzo alla parola.
- con saldo `0`: la riga dice il vero e l'azione di ricerca resta spenta come
  oggi; con saldo `> 0`: la conferma nomina ancora lo stesso numero.
- `scrollWidth === clientWidth` a 375 e 412 (la fix non deve introdurre overflow).

## Passo 4 — nativo: quello che qui non si può fare (0 min, si dichiara)

Nessun emulatore o dispositivo esiste su questa macchina: non è una svista, è un
fatto d'ambiente. Classi di dimensione, live region sulla validazione, pavimento
44/48 dp, driver nativo e `expo-image` restano **affermazioni di sorgente**, e
chi legge il report deve trovarlo scritto.

Le due strade, nessuna delle quali è "misurare da qui":

1. **Telefono, 2 minuti, con Expo Go.** Checklist sì/no per chi ha il telefono:
   (a) barra in basso con le quattro destinazioni, nessuna etichetta tagliata;
   (b) tema scuro da Profilo, poi riapri l'app: la scelta resta; (c) testo di
   sistema al 200%: nessun testo tagliato, nessun bottone che perde l'etichetta;
   (d) tastiera aperta nella chat: il campo non finisce sotto la tastiera;
   (e) swipe dal bordo sinistro: torna indietro; (f) campanella: il badge si
   legge e il pannello si apre sopra il contenuto. Ogni "no" va nel report con
   la rotta.
2. **Emulatore Android** (Android Studio, 1-2 GB): sblocca (a)-(f) senza
   telefono, ma non sostituisce VoiceOver/TalkBack reali né un iPad.

## Passo 5 — registrazione (5 min)

Una riga per misura, **nello stesso turno**, qui sotto. Poi, nello stesso
commit: `rescore.md` aggiornato (cosa non è più "non misurato"), una riga in
`docs/changelog.md`, e il push su `andrea-frontend` con il gate verde.

| Data | Passo | Rotta / larghezza | Esito | Cosa è stato scritto |
| --- | --- | --- | --- | --- |
| 2026-11-19 | 1a | `/chat/1` tema scuro | **PASS** | 0 testi sotto soglia su 14 misurati (`0/1000` 7,09 / timestamp 6,29 / bolla 13,97); il valore più basso è il testo del bottone d'accento `Invia` a **5,97** su `rgb(78,169,127)`. Bordi dei controlli ≥ 3: `Invia la scheda` 3,77, textarea 3,30. Screenshot `residual-1a-chat-dark.png`. |
| 2026-11-19 | 1a | `/edit-profile` tema scuro | **PASS** | 0 testi sotto soglia; placeholder 6,29 (`Racconta le competenze…`, `https://esempio.it/foto.jpg`); nessun bordo di controllo sotto 3. Screenshot `residual-1a-edit-profile-dark.png`. |
| 2026-11-19 | 1a | `/user/2` tema scuro | **PASS** | 0 testi sotto soglia (`@marco.ricci`, località, `Offre`/`Cerca` e i due servizi tutti sopra 4,5); nessun controllo con bordo. Screenshot `residual-1a-user-dark.png`. |
| 2026-11-19 | 1c | 412 — `/`, `/agreements`, `/profile` | **PASS** (criterio) + **finding nuovo** | `scrollWidth === clientWidth === 412` su tutte e tre. Catalogo: 11/11 card con **3 righe di meta** (categoria│modalità, luogo│data, autore), altezze 137/162/187 px = 1/2/3 righe di titolo. **Ma** a 412 il chip di categoria esce dalla sua colonna e si dipinge sopra l'icona della modalità: `Assistenza computer` **17 px** (3 card), `Cucina vegetariana` 8 px. Screenshot `residual-1c-412-catalogo.png`, `residual-1c-412-card-chip.png`, `residual-1c-412-agreements.png`, `residual-1c-412-profile.png`. Vedi finding `docs/audits/frontend-2026-11-19-catalog-chip-overlap.md`. |
| 2026-11-19 | 1c | 768 — `/`, `/agreements`, `/profile` | **PASS** | `scrollWidth === clientWidth === 768` su tutte e tre; catalogo 11/11 card con 3 righe di meta; nessun chip sopra l'icona (distanza minima −144 px, cioè 144 px di aria). |
| 2026-11-19 | 1c | 1024 — `/`, `/agreements`, `/profile` | **PASS** | `scrollWidth === clientWidth === 1024` su tutte e tre; catalogo 11/11 card con 3 righe di meta; nessun chip sopra l'icona (−144 px). A 1024 `/agreements` centra la colonna `maxContent` (560): è la misura di lettura prevista da `Screen`, non un difetto (il tetto largo 720 è del solo catalogo). Screenshot `residual-1c-1024-agreements.png`. |
| 2026-11-19 | 3 | `/match` 375 tema chiaro | **PASS** | Marchio: box `16→165`, alto **44** (`minHeight` 44), sfondo `rgb(253,253,251)`, bordo 0,8 px `rgb(225,229,221)`, raggio 12; allineato al bordo del testo (16, come la frase sotto il titolo). Etichetta `Crediti disponibili` 13/400 `rgb(93,102,95)`, valore `1` 12/600 `rgb(28,33,29)` tabular: **una riga sola** (etichetta 18 px, valore 16 px, stessa fascia verticale), nessun a capo dentro una parola. `scrollWidth === clientWidth === 375`. Screenshot `residual-3-match-375-chiaro.png`. |
| 2026-11-19 | 3 | `/match` 412 tema chiaro | **PASS** | Stessa forma del 375 (marchio 16→165, alto 44): non si allarga con la colonna e non va a capo. `scrollWidth === clientWidth === 412`. Screenshot `residual-3-match-412-chiaro.png`. |
| 2026-11-19 | 3 | `/match` 412 e 375 tema scuro | **PASS** | Marchio `rgb(27,34,29)` con bordo `rgb(44,53,46)`; etichetta `rgb(153,164,155)` **6,29:1**, valore `rgb(235,239,234)` **13,97:1** sul marchio. A 412 nessun overflow. Screenshot `residual-3-match-412-scuro.png`, `residual-3-match-375-scuro.png`. |
| 2026-11-19 | 3 | `/match` saldo `0` (giulia.bianchi), chiaro e scuro | **PASS** | `0` in `t.danger` (`rgb(224,113,106)`, **5,21:1** sul marchio) e la frase «Senza crediti la ricerca resta spenta: un credito torna se annulli una coda di ricerca.» in `t.danger` (**6,74:1** sul fondo pagina). Nessun riempimento rosso. `Ricerca` resta spenta come oggi. Nessun overflow a 375. Screenshot `residual-3-match-zero-chiaro.png`, `residual-3-match-zero-scuro.png`. |
| 2026-11-19 | 3 | `/match` saldo `> 0` (sara.mancini, 1 credito) | **PASS** | Il marchio mostra `1` e la conferma di `Richiedi` dice ancora lo stesso numero: «Una coda di ricerca costa un credito. Crediti disponibili: 1.» — una sola sorgente (`balance`), nessun secondo numero. Conferma chiusa con `No, torna indietro`: nessuna coda creata. Screenshot `residual-3-match-conferma.png`. |
| 2026-11-19 | 2 | gate prima del commit di F1 | **PASS** | `npx expo lint` pulito, `npx tsc --noEmit` exit 0, `npx jest src/app --bail` 10/10. Le misure del passo 3 sono state fatte su un `npx expo export --platform web` rifatto **dopo** la fix (browser ricaricato con `/?v=` perché `index.html` era in cache). |

| 2026-11-19 | 4 | nativo | **dichiarato** | Nessun emulatore né dispositivo: nessuna misura, e nessuna affermazione di misura. Checklist (a)-(f) consegnata a chi ha il telefono (vedi sotto). |

### Dove stanno le prove

Tutti gli screenshot citati nella tabella sono in
`docs/audits/evidence/frontend-2026-11-19/`. Il finding nuovo è
`docs/audits/frontend-2026-11-19-catalog-chip-overlap.md`, e apre il **passo 16**
del `plan.md` (`Stato: TODO`): non è stato corretto qui, come vuole la regola di
questo file.

### Passo 2 — due scostamenti dal brief, dichiarati

1. **La superficie del marchio è `t.surface`, non `t.background`.** Il brief
   chiedeva `t.background`, ma il fondo della pagina di `/match` **è**
   `t.background`: un marchio dello stesso colore del foglio non avrebbe avuto né
   forma né bordo, e avrebbe contraddetto il criterio del passo 3 («si legge a
   colpo d'occhio»). Il marchio usa quindi la superficie delle card più il bordo
   sottile dei controlli (`t.border`), che è la coppia che rende la forma
   leggibile in entrambi i temi senza aggiungere un colore alla tavolozza.
2. **Nessun test nuovo.** Il brief fissa il perimetro a «un solo file:
   `match.jsx`», quindi il gate è stato fatto passare sui test esistenti (10/10 su
   `src/app`) e la verifica del marchio è la misura del passo 3, non un'asserzione
   nuova. Se si vuole l'asserzione (marchio presente, valore uguale a `balance`,
   valore in `t.danger` a saldo zero), è il primo figlio naturale del passo 16.

### Passo 4 — esito: **dichiarato**, non misurato

Nessuna misura nativa è stata fatta e nessuna è stata inventata: su questa
macchina non esistono emulatore né dispositivo, quindi restano **affermazioni di
sorgente** le classi di dimensione, la live region sulla validazione, il
pavimento 44/48 dp, il driver nativo delle animazioni e `expo-image`. La
checklist (a)-(f) del passo resta da passare a chi ha il telefono: (a) barra in
basso con le quattro destinazioni, nessuna etichetta tagliata; (b) tema scuro da
Profilo, poi riapri l'app e la scelta resta; (c) testo di sistema al 200% senza
tagli; (d) tastiera aperta nella chat, il campo non finisce sotto la tastiera;
(e) swipe dal bordo sinistro, si torna indietro; (f) campanella: badge leggibile
e pannello sopra il contenuto. Ogni «no» va riportato con la rotta.

## Se una misura fallisce

Non si applica la fix dentro questo file: si apre il blocco nel `plan.md` con il
criterio di verifica, e la misura si ripete nello stesso turno in cui la fix
atterra. Un fallimento trovato qui è un finding nuovo: va in `docs/audits/` con
la stessa forma degli assessment del 18/11, non nel report di chat.
