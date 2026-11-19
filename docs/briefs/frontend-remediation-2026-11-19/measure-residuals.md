# Misurare i residui — istruzioni eseguibili da una sessione nuova

Questo file esiste perché la misura non è stata fatta: la sessione del
2026-11-19 ha chiuso il ciclo di remediation e ha misurato quattro rotte in
tema chiaro (`rescore.md`), ma ha lasciato fuori il tema scuro, lo stato
d'errore del pannello notifiche e ogni superficie nativa. `rescore.md` dice
cosa **non** è stato misurato; questo file dice **come** misurarlo, così una
sessione nuova non deve ricostruirlo dalla chat.

**Ripresa:** "Esegui: `docs/briefs/frontend-remediation-2026-11-19/measure-residuals.md`".
Contratto del ciclo: `plan.md` e `plan-brief.md` nella stessa cartella.

## Regole che non si negoziano

- **Un contesto Playwright per volta, mai più di due vivi.** Su questo server
  Expo ogni rotta in più costa 5-30 s e le catture mostrano l'overlay
  "Bundling": è così che una sessione precedente ha perso due findings (un 404
  e una struttura di titoli, entrambi falsi).
- **Meglio il build statico del dev server.** `npx expo export --platform web`
  produce `Frontend/dist/` senza Metro: nessuna compilazione per rotta, nessun
  overlay. È la sorgente di verità per le misure web di questo file.
- **Le credenziali demo si leggono da `docs/setup.md`** (§«The account that can
  open everything»): non si inventano e non si mettono qui.
- Un risultato si registra **nello stesso turno** in cui lo si ottiene, nella
  tabella in fondo a questo file; senza riga scritta, la misura non esiste.

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
naviga cliccando. Un 404 visto aprendo un file `.html` è un artefatto del
server statico, non un difetto dell'app.

## Passo 1 — Tema scuro su `/chat`, `/edit-profile`, `/user/<id>` (10 min)

Il 18/11 il passo scuro si era interrotto su un 500 delle notifiche: queste tre
rotte non sono mai state viste in tema scuro.

1. Un contesto: `playwright_browser_emulate_media({ colorScheme: "dark" })`.
2. Naviga `/`, accedi con l'account demo dello staff (credenziali in `docs/setup.md`).
3. Per ognuna delle tre rotte: raggiungila cliccando (non con `.html`), cattura
   con `playwright_browser_take_screenshot({ fullPage: true, scale: "css" })`.
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

**Passa se:** ogni coppia testo/sfondo ≥ 4,5:1 (≥ 3:1 per testo grande ≥ 18,66 px
bold o ≥ 24 px), e i bordi dei controlli ≥ 3:1. **Fallisce se:** un solo testo
sotto soglia, o un controllo il cui bordo scompare sullo sfondo. Registra ogni
coppia sotto soglia con la rotta e il selettore.

## Passo 2 — Pannello notifiche in errore (10 min)

È la domanda aperta §6 dell'audit: un 500 vero è stato visto il 18/11 e non si
seppe dire se il pannello mostrasse un errore o una lista vuota silenziosa.

```js
// playwright_browser_run_code_unsafe — forza il 500 sull'endpoint notifiche
const pagina = page;
await pagina.route('**/notifications**', (r) => r.fulfill({ status: 500, body: '{"error":"forced"}' }));
```

Poi: apri la campanella dalla barra o dalla schermata scambi, attendi, cattura,
e leggi il DOM (`browser_snapshot`) per capire cosa vede una persona.

**Passa se:** compare uno stato d'errore con un'azione di ripetizione, e la
richiesta fallita è nominata (URL e corpo) nel report — così l'endpoint non
resta anonimo come il 18/11. **Fallisce se:** resta una lista vuota senza
spiegazione, o un errore solo in console.

## Passo 3 — Larghezze 412 / 768 / 1024 (5 min)

Le classi di dimensione (`compact` < 600, `medium` < 1024, `expanded`) e la
griglia del catalogo sono state misurate solo a larghezza desktop.

Per ogni larghezza, con un solo contesto: `playwright_browser_resize({ width, height: 900 })`,
poi `/`, `/agreements`, `/profile`, e su ognuna:

```js
// playwright_browser_evaluate
({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })
```

**Passa se:** `scrollWidth === clientWidth` (nessun overflow orizzontale) su
tutte e tre le rotte a tutte e tre le larghezze, e a 412 ogni card del catalogo
ha lo stesso numero di righe di meta (la griglia è a forma fissa). **Fallisce
se:** un overflow, o due card con forma diversa nella stessa lista.

## Passo 4 — Nativo: quello che qui non si può fare (0 min, si dichiara)

Nessun emulatore o dispositivo esiste su questa macchina. Non è una svista, è
un fatto d'ambiente. Di conseguenza: classi di dimensione, live region sulla
validazione, pavimento 44/48 dp, driver nativo e `expo-image` restano
**affermazioni di sorgente**, e chi legge il report deve trovarlo scritto.

Le due strade, nessuna delle quali è "misurare da qui":

1. **Telefono, 2 minuti, con Expo Go.** Checklist per chi ha il telefono in
   mano: (a) barra in basso con le quattro destinazioni e nessuna etichetta
   tagliata; (b) tema scuro da Profilo, poi riapri l'app: la scelta resta;
   (c) testo di sistema al 200%: nessun testo tagliato, nessun bottone che
   perde l'etichetta; (d) tastiera aperta nella chat: il campo non finisce
   sotto la tastiera; (e) swipe dal bordo sinistro: torna indietro; (f)
   campanella: il badge si legge e il pannello si apre sopra il contenuto.
   Ogni voce è sì/no, e il "no" va nel report con la rotta.
2. **Emulatore Android** (`Android Studio`, 1-2 GB): sblocca (a)-(f) senza
   telefono, ma non sostituisce VoiceOver/TalkBack reali né un iPad.

## Dove si scrive il risultato

Una riga per misura, **nello stesso turno**, qui sotto. Poi, nello stesso
commit: `rescore.md` aggiornato (cosa non è più "non misurato") e una riga in
`docs/changelog.md`.

| Data | Misura | Rotta / larghezza | Esito | Cosa è stato scritto |
| --- | --- | --- | --- | --- |
| — | *(vuoto: la sessione nuova parte da qui)* | | | |

## Se una misura fallisce

Non si applica la fix in questo file: si apre il blocco nel `plan.md` del ciclo
con il criterio di verifica, e la misura si ripete nello stesso turno in cui la
fix atterra. Un fallimento trovato qui è un finding nuovo: va in
`docs/audits/` con la stessa forma degli assessment del 18/11, non nel report di
chat.
