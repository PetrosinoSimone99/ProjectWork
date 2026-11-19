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
| — | *(vuoto: la sessione nuova parte da qui)* | | | |

## Se una misura fallisce

Non si applica la fix dentro questo file: si apre il blocco nel `plan.md` con il
criterio di verifica, e la misura si ripete nello stesso turno in cui la fix
atterra. Un fallimento trovato qui è un finding nuovo: va in `docs/audits/` con
la stessa forma degli assessment del 18/11, non nel report di chat.
