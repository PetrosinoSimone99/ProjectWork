# Assessment A2 — Design Review (Baratto-lo frontend)

Evidence root: `.impeccable/critique/evidence/frontend-2026-11-18/`
Scope of this pass: the 32 existing desktop screenshots (light + dark) plus a
bounded mobile check I ran myself (375 WebKit, 412 Chromium, 19 captures + logs
in `mobile/`), plus a static source review of `Frontend/src/app/**`,
`Frontend/src/components/*`, `Frontend/src/hooks`, `docs/DESIGN.md`,
`docs/ux.md`, `Frontend/src/theme/tokens.js` and
`Frontend/src/components/AppText.jsx`.

Status: complete. Screenshots are judged from the pixels; source is cited only
where a behaviour is invisible in a still (confirmations, dismissal, refresh).

---

## 1. Design-specificity verdict

**Verdict: a specific system with an under-specified composition — "medium" specificity.**

The layer that is *not* generic is real and unusually disciplined. `tokens.js` and
`docs/DESIGN.md` define a forest/sage palette where each colour is a role
(`border` separates, `borderInput` identifies, prose never wears `caption`), one
radius vocabulary assigned by role (card 16 / input 12 / pill for anything
pressed), one accent spent once per screen, a 6-role type scale in `AppText` with
`aria-level` derived from the role, and a dual page frame (`sogliaLarga` 1024,
content measure 560, catalog measure 720). You can tell a Baratto-lo screenshot
from the tokens alone: the sage canvas, the deep-green filled pill that appears
once, the uppercase 11/700 chips, the 19px card headline over a 13px meta line,
and the vocabulary (`offerta`, `ricerca`, `coda`, `accordo`, `segnalazione`).
That is product-specific, not template-specific.

The layer that *is* generic is the composition. Almost every screen is the same
sentence: one `PageHeader` band, a vertical stack of 16-radius white cards, and
actions drawn as full-width pills of equal height. Nothing on screen is a
picture of an exchange: no portraits (initials circles only), no asymmetry, no
illustration, no motion language, no "two people on the two sides of a barter"
metaphor anywhere on the surface that should carry it — `/agreements` and the
public profile. Shown three screenshots without their copy (register, edit
profile, staff users) a stranger would say "a clean CRUD admin", not
"a mutual-credit barter community". The one place where the product's own
asymmetry would earn a specific composition — a directional, pairwise exchange —
is drawn as two `@handle: text` lines that read like a chat transcript.

So: specific at the system level, not yet at the screen level. The gap is not
craft (the craft is above average for a solo frontend), it is **voice in the
composition** and a missing visual model for the thing the product actually
does.

## 2. Nielsen 10 heuristics (0-4 each, total /40)

| # | Heuristic | Score | Concrete key issue |
| --- | --- | --- | --- |
| 1 | Visibility of system status | 3 | Every screen owns loading/empty/error and the bar carries `Aggiorna`; but a disabled primary and an enabled one differ only by `opacity.disabled` 0.7 — on `00-login` "Accedi", `54-chat` "Invia" and `72-edit-profile` "Salva modifiche" read as *enabled but washed out*, so the status of the form is legible only by guessing. |
| 2 | Match between system and the real world | 2 | Italian domain vocabulary is consistent, but English leaks into a row (`71`: "Your report has been reviewed and confirmed."), the session line says "01:11 AM" (`70`), `comune` and `provincia` print the same value as "Roma - Roma" in five places, and implementation talk reaches the UI: "Provincia e comune restringono la località, la modalità l'ambito («Tutti» non restringe)" (`21`), "Il ruolo filtra tutto l'elenco, prima della paginazione" (`61`). |
| 3 | User control and freedom | 3 | Good exits everywhere (X, backdrop, Escape, back arrow, `Azzera` filters, `ConfirmModal` before every irreversible act). The hole is theoretical freedom on `/agreements` "In corso": the card's only two doors are `Apri chat` and `Annulla scambio` — no way to declare the exchange done, so the only exit is destruction. |
| 4 | Consistency and standards | 2 | Two notification surfaces with different names and different anatomy — the floating bell panel "Proposte ricevute" (`52`) and the `Notifiche` sheet on `/profile` (`71`) — and the same inbox reachable from one and not the other. Staff cross-navigation is a bare text link floating above content ("Utenti" `60`, "Segnalazioni" `61`) instead of the bar; `/user/[id]` (`80`) drops `PageHeader`, cards and the meta line for a raw bulleted list. |
| 5 | Error prevention | 3 | Strong: dependent `Provincia → Comune`, counters `0/1000` `0/2000`, max-1 rules stated, `ConfirmModal` before accept/refuse/cancel/report/staff actions. What is missing is prevention by *information*: the accept confirm names the person and the consequence but never the two services being exchanged, so the user confirms a barter they have not been shown (`52`). |
| 6 | Recognition rather than recall | 2 | Filters stay on screen with "1 filtro attivo · Azzera", chips restate state, tabs carry counts. But the object at the centre of the product is not recognisable: an agreement shows `@giulia.bianchi: Aiuto compiti...` / `@demo.staff: Revisione di testi...` with no directionality (who gives what to whom), and `/chat` shows no counterpart name at all — you have to remember who you are talking to. |
| 7 | Flexibility and efficiency of use | 2 | Search is one tap, staff list is searchable, keyboard focus reaches cards, catalog refresh is in the bar. Missing: no sort on the catalog (10 rows, all "Pubblicato il 18 nov 2026"), no shortcut from a notification to its agreement when the row has no `agreementId`, and no path at all from a 0-credit account to a credit — a frequent task that dead-ends. |
| 8 | Aesthetic and minimalist design | 3 | The restraint is real: one accent, six type roles, generous rhythm, no decoration. It loses points where prose explains the interface (the 2-line filter legend, the pagination note in staff filters), where the same fact is said twice (`1 di 1` next to "Hai raggiunto il massimo di 1 offerta", tab name repeated as the section title), and where every action is the same full-width pill, so `Apri chat` and `Annulla scambio` have identical weight (`51`). |
| 9 | Help users recognise, diagnose and recover from errors | 2 | Empty states name the next step and every `Banner` carries its own `Riprova` — good. But no error state is evidenced anywhere in the corpus, and `90-not-found` never reaches its content: the route answers 404 with a full-viewport loading indicator that never resolves, leaving a **blank white page** (SSR body and `mobile/notes.txt` in P0) while `+not-found.jsx` clearly draws a title, a sentence and a button. |
| 10 | Help and documentation | 2 | Inline explanation exists exactly where the model is opaque ("Una coda di ricerca costa un credito", "La segnalazione arriva alla staff...", empty states that explain what a `coda` is). The two most consequential unknowns have no line at their point of doubt: how a 0-credit account earns a credit (`40`), and what accepting a proposal commits you to (`52`). What is explained instead is filter mechanics — help spent on the wrong doubt. |

**Total: 23 / 40.**

Reading of the score: no heuristic is broken (nothing scores 0-1) and the
"can the user finish the job" heuristics (1, 3, 5) are the strongest — this is a
systematically built interface. The weak band is the one that decides whether
the interface *teaches* the product: language (2), recognition of the exchange
(6), efficiency (7), help (10). The design is better at not lying than at
explaining.

## 3. Cognitive load

Eight-item checklist, applied to the corpus (desktop 1280 plus 375/412 mobile):

| # | Check | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | One primary action per screen (the accent spent once) | PASS | `20` filters + list, `40` two equal `secondary` pills and no filled accent, `51` `Apri chat` + `Annulla scambio` both secondary, `54` `Invia` the only filled pill. The rule is kept. |
| 2 | No decision point with more than four visible options | FAIL | Catalog filters open = 5 controls at once (search, categoria, provincia, comune, modalità) — on 375 they stack full-width and push every result below the fold (`m375w-21`). Staff users = 7 (search + 3 role pills + 3 status pills, `61`). Staff root = 5 status pills plus two unrelated sections in one column (`60`). |
| 3 | The consequence of a committing action is visible before committing | FAIL | The proposal panel (`52`) shows a handle, a date and the words "1 proposta da rispondere"; the two services being swapped are not on screen, and the confirm modal repeats the person, not the trade. The single most consequential tap in the product is taken blind. |
| 4 | The central object is recognisable without recall | FAIL | An agreement (`51`) is drawn as `@giulia.bianchi: Aiuto compiti...` / `@demo.staff: Revisione di testi...`: two handle-prefixed lines that read like a chat transcript, with no direction (who gives, who receives). `/chat` (`54`) names neither the counterpart nor the exchange. |
| 5 | Copy labels the interface instead of explaining it | FAIL | Three separate paragraphs explain mechanics: the filter legend "Nessuna scelta: tutti i servizi. Provincia e comune restringono la località, la modalità l'ambito («Tutti» non restringe)" (`21`), "Il ruolo filtra tutto l'elenco, prima della paginazione" (`61`), "L'opzione Sistema segue il tema del dispositivo. La scelta resta salvata su questo dispositivo" (`70`). |
| 6 | One word per concept | FAIL (mild) | "Conclusi" holds refused, cancelled and expired rows (`53`: "Gli accordi rifiutati, annullati o già scaduti"), so "concluso" means four things. The same inbox is "Proposte ricevute" in the bell panel (`52`) and "Notifiche" on the profile (`71`). "Match" and "coda" and "proposta" and "accordo" coexist for what a first-timer reads as one thing. |
| 7 | Detail on demand, not on the surface | PASS | The catalog card stays short and the description arrives in `30`; filters are collapsed by default (`20` "Nessun filtro attivo"); the profile card holds settings behind chevrons. |
| 8 | Rows are chunked and scannable | FAIL | A catalog row carries five meta tokens (category, modalità, località, date, author). At 1280 they fit one line; at 412 they re-wrap per card into a different shape each time — 4 lines, then 2, then 3 (`m412-20`) — so the scan rhythm of the list is destroyed exactly where scanning matters most. |

**Failures: 6 of 8.** The two that hold (single primary accent,
detail-on-demand) are the two the design system enforces by construction. The
six that fail are all *information* problems — what is shown next to what — not
visual-craft problems, which is consistent with the heuristic table: the system
is disciplined, its surfaces are under-explained.

**Decision points with more than four visible options (named):**

1. Catalog, filters open: search + categoria + provincia + comune + modalità =
   5 (`21`, `m375w-21`).
2. Staff users, filters: search + ruolo (Tutti/Utente/Staff) + stato
   (Tutti/Attivo/Sospeso) = 7 (`61`).
3. Staff root: no filters applied, but 5 status pills (Tutte, Aperte, In esame,
   Confermate, Respinte) sit between two unrelated sections (`60`).
4. Web `Menu` dropdown: 5 items, at the ceiling and only because Staff is
   gated out for a normal account (`23`).

## 4. Emotional journey

Walking the actual order a new account would take, on what the screenshots show:

- **Entry (`00`/`10`).** Calm and branded: wordmark, mark, one sentence, two
  fields, one button. The one flaw is compositional — roughly 200 px of dead
  air between the tagline and "Accedi", so the first task starts below the
  fold line of a laptop screen's attention. Feeling: "quiet, competent, empty".
- **Rising (`20`).** The best moment of the product. Ten rows, real Italian
  places, real names, a count that says "10 di 10 servizi", filters folded away.
  It reads like a working community, not a demo. Feeling: "there is something
  here".
- **Peak (`30`).** The service detail modal is the clearest thing in the app:
  category, title, author, place, date, a tinted box for "cosa offre e cerca",
  and one filled green `Invia proposta` with a sentence that says what happens
  next. This is the emotional peak, and it is the *understanding* peak: for one
  screen the user knows exactly what the product does.
- **Valley 1 — credits (`40`).** `Crediti disponibili: 0` as bare 13 px text,
  both create actions dead, and the only visible reason is that a queue is
  already active. Nothing on the screen, and nothing in the 32 screenshots,
  says where a credit comes from. Feeling: "I am locked out of the thing I just
  learned to do".
- **Valley 2 — the decision (`52`).** A proposal arrives and the panel asks
  accept or refuse on the strength of a handle and a date. The confirmation
  names the person and the point of no return ("da qui non puoi più cambiare
  risposta") but not the barter. Feeling: "what am I agreeing to?" — the single
  worst moment in the journey, because it is the moment the product exists for.
- **Valley 3 — the chat (`54`).** A transcript of your own two messages, a
  composer, and no name anywhere: no counterpart, no exchange, only "Chat".
  Feeling: "this could be anyone".
- **Recovery and end (`70`).** The profile is the reassurance screen: identity,
  credits, the notification count with a sentence that explains what arrives
  there, theme choice, "Sessione valida fino alle 01:11 AM", `Esci`. Ordered,
  quiet, complete. The end of the journey is the calmest screen in the app.

**Peak-end reading.** The peaks are `30` (understanding) and `70` (order); the
valleys are `40` (locked out) and `52` (commit blind). Peak-end rule says the
memory is set by the best moment and the last one — and the last one the user
actually acts on is the notification sheet, whose every row ends in a red
`Elimina` (`71`). The surfaced inbox closes on a delete button, which is a
muted, faintly punitive ending for a screen whose job is to bring good news.

**Reassurance on the three risky contracts:**

| Contract | Reassured? | Where |
| --- | --- | --- |
| Credits | **No.** The cost is stated ("Una coda di ricerca costa un credito"), the source never is. A refund is only ever announced as a transient success banner after cancelling a queue, so the reassurance exists for three seconds and then evaporates. | `40`, transient banner not captured |
| Agreements | **Partly.** `ACCETTATO` chip, `Creata il 17 nov 2026`, participant handle, and the two services — but no lifecycle (what is owed by which side, what "done" looks like) and no completion action, so the state is named and never resolved. | `51`, `53` |
| Destructive actions | **Yes, better than average.** Every destructive or irreversible action goes through `ConfirmModal` (verified in source for accept, refuse, cancel agreement, cancel queue, delete notification, send report, suspend user), the modal names the person and the real consequence in plain Italian, and `danger` is reserved for it. The one exception is `Esci`, a plain text link stranded under the card (`70`). | `51`, `52`, `60`, `61`, `71` |

## 5. Strengths

1. **A token system with real authority, and a dark theme that is a second
   palette rather than an inversion.** One accent spent once per screen; radii
   assigned by role (card 16, input 12, pill for anything a finger presses);
   `borderInput` separated from `border` with the measured 3:1 ratio written
   next to it; `opacity.disabled` collapsed from four ad-hoc values to one 0.7
   with a stated contrast reason. The dark screenshots back it up — `30` dark,
   `40` dark and `52` dark are genuinely designed (`primary` #4EA97F with a
   dark `onPrimary`, chips keeping their hue), not a filter over the light set.
2. **State completeness and honesty, as a rule rather than a habit.** Every
   data surface has loading, empty, error and loaded as separate branches
   (`match.jsx` keeps a list that arrived when the profile call failed; the
   notifications panel paints an error banner above the rows instead of
   replacing them). Empty states teach the model instead of apologising —
   "Quando invii una proposta, la trovi qui finché l'altra persona non
   risponde" (`50`) is the only place the product explains its own loop, and it
   does it in one sentence.
3. **Confirmation copy that states the real consequence.** "Accettando, lo
   scambio con X diventa un accordo in corso: da qui non puoi più cambiare
   risposta" (`agreements.jsx`) and the queue-cancel copy that warns the
   agreement goes with it. This is the kind of writing most products never
   reach, and it is what keeps heuristic 5 at a 3 despite the blind-accept gap:
   the app is honest about consequences, it just does not always show the
   object the consequence applies to.

## 6. Priority issues

Five issues, ordered by what costs the product most.

### P0 — The recovery route renders a blank white page on web

- **What.** `/questa-rotta-non-esiste` answers HTTP **404** and the served HTML
  body contains one thing: a full-viewport loading indicator on the sage
  background (`<div aria-live="polite" ... role="progressbar">`, background
  `rgba(243,245,241,1.00)`), which never resolves — in the browser the page ends
  up blank white with `document.body.innerText === ""`
  (`mobile/notes.txt`: `404 body text: ""`) after 4 s. Two independent captures
  agree (`90-not-found`, 5.2 KB uniform white; `mobile/w1280-90-not-found`), and
  the committed export shows the same state: `Frontend/dist/+not-found.html`
  (19.7 KB) does not contain the string "Pagina non trovata". The component in
  `app/+not-found.jsx` (title, sentence, recovery button) never mounts, so this
  is a render/route problem, not a server one.
- **Why P0.** It is the screen a user sees when something is already wrong (a
  stale deep link, a mistyped share URL, a hand-typed path). A white page reads
  as a crash, and the only escape is the browser's back button. It also breaks
  the one guarantee the app makes everywhere else: that every state is drawn,
  and the not-found route is the only one outside the `(tabs)`/`(auth)` groups
  — which is the first place to look for why its shell never settles.
- **Fix.** Render the recovery page without waiting on session bootstrap (it
  only needs `utente`, and it already degrades to "Torna al login" when there is
  none), and put the theme background on the root document so no state can ever
  paint white. Then re-shoot both the dev server and the export.
- **Command.** `impeccable harden`

### P1 — The decisive action is taken without seeing what is being exchanged

- **What.** `52` (light and dark): the bell panel lists `@demo.staff`, "PROPOSTA
  DEL 17 NOV 2026", then `Accetta` / `Rifiuta`. The two services — the whole
  content of the decision — are absent, and the confirm modal that follows
  repeats the handle and the consequence but never the trade.
- **Why P1.** Accepting is irreversible (the copy says so), it creates the
  agreement, and it is the moment the product exists for. Asking for it on the
  strength of a username is asking for trust the interface has not earned.
- **Fix.** Put both services in the panel row, with direction ("tu offri X →
  ricevi Y"), and repeat that pair inside the confirm copy. No new API: the
  proposal payload already carries what `51` renders on the agreement card.
- **Command.** `impeccable clarify`

### P1 — A successful exchange has no completion path

- **What.** `51`, the only card in "In corso": two doors, `Apri chat` and
  `Annulla scambio`. There is no "segna come concluso", and `53` defines
  "Conclusi" as "rifiutati, annullati o già scaduti" — a successful barter is
  not among the endings the tab can hold.
- **Why P1.** The product's happy path terminates in cancellation or expiry.
  Whatever the backend exposes, the interface currently teaches that an
  exchange ends badly or not at all, and that is a design-level statement about
  what the platform is for.
- **Fix.** If the backend can complete an exchange, add it as the card's primary
  action and separate the endings in the tab ("Conclusi" = completed;
  "Chiusi" = refused/cancelled/expired). If it cannot, say so in the "In corso"
  section sentence and log the gap in `docs/backend-gaps.md` — silence is the
  one option that is not available.
- **Command.** `impeccable shape`

### P2 — Credits are a dead end with no explanation

- **What.** `40` and `70`: `Crediti disponibili: 0` as plain text on both
  screens; on `40` both create actions are dead and the only visible reason is
  "Hai già una coda attiva: annullala per poterne creare un'altra". The rule
  that costs something ("Una coda di ricerca costa un credito") is shown, the
  rule that produces the balance is not, anywhere in the 32 screenshots.
- **Why P2.** It blocks heuristic 7 (the frequent task dead-ends) and 10 (the
  opaque model has no line at the point of doubt), and it turns a 0 balance
  into a suspicion of a paywall in a non-profit barter community — the worst
  possible misreading of the product.
- **Fix.** One sentence under the balance that says how a credit is earned (an
  exchange completed, a proposal accepted, staff-granted) plus the reason on
  the disabled control itself, not only above the pair. If the answer is
  "credits only arrive from a completed exchange", then completing an exchange
  (see the P1 above) becomes the same issue, not a separate one.
- **Command.** `impeccable clarify`

### P2 — The barter is drawn without direction, and the chat without a person

- **What.** `51`: the two services are `@handle: sentence` lines, visually
  identical, in reading order. `54` and `m412-54-chat-loaded`: header is "Chat"
  and "Messaggi dello scambio: accordatevi qui sui dettagli" — no counterpart
  name, no exchange summary, no avatar.
- **Why P2.** A pairwise directional exchange is the product's entire model
  (`docs/overview.md`), and the one surface that should express it renders two
  neutral lines. Directionality is not decoration here: it is the meaning.
- **Fix.** Give the agreement card a directional composition — "Tu dai" / "Tu
  ricevi" with an explicit arrow between the two services (they already carry
  `OFFER`/`REQUEST`, so the side is known) — and put the counterpart's name and
  the agreed service in the chat header.
- **Command.** `impeccable bolder`

## 7. Persona red flags

**Jordan — first timer, no context, evaluating whether this is for them.**

- `40`: "Crediti disponibili: 0" and both actions dead. Jordan cannot form a
  model of credits at all — the copy explains what a queue costs, never what
  produces one — so the conclusion available to them is "there is a paywall".
- `52` vs `71`: the same inbox is called "Proposte ricevute" in the bell panel
  and "Notifiche" on the profile. Jordan will reasonably think these are two
  different features, and will look for the missing one.
- `53`: "Conclusi" containing refused proposals teaches the wrong vocabulary on
  the first visit to the tab, before any agreement exists.
- `21`: the two-line filter legend ("Provincia e comune restringono la
  località, la modalità l'ambito («Tutti» non restringe)") is written for
  someone who already knows the filter model — the reader who needs it is the
  reader who cannot parse it.

**Casey — phone, one hand, in transit.**

- `m375w-20` / `m412-20`: the only navigation on a phone-shaped web viewport is
  the `Menu` dropdown in the top-right bar (`tabBar` is deliberately null on
  web, `(tabs)/_layout.jsx`). That is the far corner from the thumb, at every
  width below `sogliaLarga`, while the native build keeps a bottom bar.
- `m412-20`: catalog rows grow to ~350 px with four ragged meta lines, so ten
  services cost about eight screens of scrolling and the meta lines change
  shape card to card — Casey cannot scan, only read.
- `m412-54-chat-loaded`: the composer is correctly docked (textarea top 676 of
  an 839 px viewport) and `Invia` is full width, but `Crea accordo` occupies
  the top of the transcript as an equal-width outlined button, so the screen
  offers Casey two large actions and no statement of who they are writing to.
- The one piece of good thumb ergonomics is the bell FAB (bottom-right, 56 px,
  `50`/`m375-50`) — which is also the only door to proposals, so a thumb that
  misses it has no second route.

**Sam — screen reader and keyboard.**

- `31`: the keyboard focus ring lands on the whole card as a single control
  with a 2 px accent outline — correct and visible. `aria-level` derived from
  the type role in `AppText` means the heading outline is real, and the nav
  control announces as "Apri il menu di navigazione, sezione attuale: Accordi"
  (`mobile/notes.txt`) — that is better than most.
- Risk 1: because the card is one pressable, its accessible name is the whole
  meta concatenation — "lezioni chimica CHIMICA in presenza Caprese
  Michelangelo - Arezzo Pubblicato il 18 nov 2026 mario draghi @mario.draghi" —
  with no label saying the row opens a detail.
- Risk 2: two surfaces called "Notifiche" (the bell inside `/agreements`, the
  profile row) with different payloads; Sam has to discover which one lists
  what, from the screen contents alone.
- Risk 3: the agreements tab counts arrive after the labels (`m412-50` and
  `50` dark show "Inviate / In corso / Conclusi" with no numbers, the light
  version shows `0 1 0`), so the pill track reflows and the numbers announce
  late — a live-region and layout-stability issue in the same control.

## 8. Minor observations

- Comune and provincia are printed as "Roma - Roma", "Bologna - Bologna" in
  `40`, `41`, `70`, `80` and on the queue card. The formatter does not
  collapse duplicates.
- "Sessione valida fino alle 01:11 AM" (`70`) mixes Italian with AM/PM.
- `71` carries an English notification body: "Your report has been reviewed and
  confirmed." It looks backend-supplied (the same row's chips are Italian), so
  the fix may be a backend copy change — but it reaches the user unfiltered.
- Disabled primaries differ from enabled ones by `opacity.disabled` 0.7 only:
  `Accedi` (`00`), `Invia` (`54`), `Salva modifiche` (`72`) read as washed-out
  rather than off, and there is no second cue (cursor on web, no pointer
  affordance).
- `41` says "1 di 1" beside "Hai raggiunto il massimo di 1 offerta": the same
  fact twice in two registers.
- `50`/`51` repeat the active tab's name as the section title ("Proposte
  inviate" under the "Inviate" pill, same icon family): one label too many.
- `30`: `Segnala` sits centred in the middle of the modal, between the content
  and the primary action — a secondary, accusatory action in the visual centre
  of the screen. `74` also has `Invia alla staff` as a narrow left-aligned
  pill while every other primary action in the app is full width.
- `22`: the empty result states "Nessun risultato per ..." with no recovery
  button inside the empty state; `Azzera` lives up in the filter card, above
  the fold on 375.
- `80`: the public profile drops the whole system — no `PageHeader`, no card, raw
  `- service` bullets, no bio, no `Segnala`, no action. It is the one screen
  that looks like a different app.
- `60`: the staff root opens on "Servizi eliminati" and puts report filters and
  a report list below it in the same column, with the `Utenti` cross-link as a
  bare text link above the title. Three entities, one hierarchy level.
- `72`: the image field is a URL paste with no preview; the avatar stays
  initials even when an image exists.
- `61` and `60` both lack the "N di M" count line the catalog and staff users
  establish elsewhere.
- Mobile web chrome: the `Baratto-lo / Aggiorna / Menu` bar consumes the top
  ~100 px at 375 and 412 and is the same bar as desktop, so the phone-shaped
  web experience is a shrunken desktop page rather than a phone layout.

## 9. NOT COVERED

Each of these is a surface I did not judge, and why:

- **Native-only navigation and gestures** — the bottom tab bar, pull-to-refresh,
  swipe-back, native modal presentation. `(tabs)/_layout.jsx` nulls the tab bar
  on web, so no browser run can show it; a device run is out of scope here.
- **Error states on every screen** — no screenshot in the corpus shows a 5xx,
  a timeout or a retry mid-failure, and the repo forbids an invented debug-only
  failure branch. Heuristic 9 is therefore scored on the empty states, the
  retry-equipped banners I could read in source, and the blank 404 — not on an
  observed error screen.
- **Hover, pressed, focus-visible beyond one shot (`31`), transitions and
  `useReducedMotion` behaviour** — static captures cannot show them.
- **200% text zoom and large font scaling** — needs a dedicated pass at zoomed
  metrics; I checked only that no control drops under 44 pt at 320/375/412
  (`mobile/notes.txt`: "controls under 44pt -> none" on catalog, agreements and
  profile).
- **Screen-reader output** — I read `aria-level`, roles and accessible names
  from source and from one DOM probe, but I did not run NVDA/VoiceOver. Output
  behaviour (announcement order, live regions) is unverified.
- **The chat at 375 in WebKit** — captured during Metro bundling
  (`m375w-54-chat` shows "Bundling... app/chat/[agreementId].jsx"); the loaded
  chat is only evidenced at 412 Chromium (`m412-54-chat-loaded`). Retried once,
  per the two-attempt limit.
- **The catalog at 375 in WebKit, first pass** — captured mid-load ("Carico i
  servizi...", `m375w-20-catalog`); the loaded 375 evidence is the filters-open
  frame and the 412 run.
- **Live updates over SSE** — WebKit logged `Fetch API cannot load
  http://localhost:8000/api/stream ... access control checks`, i.e. the event
  stream is CORS-blocked in at least one browser. Noted, not investigated: it
  is a backend/CORS surface, outside this review.
- **Staff drill-down flows** (`StaffDetailPanels`, `ReportReviewSheet`), the
  report success state, staff decisions on a service or a user — not captured,
  and `60`/`61` only show the list level.
- **Session-expiry banner** (`SessionExpiryBanner`) and the auth-failure path —
  not captured.
- **Dark theme for screens that only have a light capture** — `10`-`12`,
  `21`-`23`, `31`, `53`, `54`, `60`, `61`, `70`-`72`, `74`, `75`, `80`, `90`.
  Dark parity is judged on the six pairs that exist.
- **Native keyboard handling in forms** (return-key flow, autocomplete hints at
  the OS level) — not observable in a browser.

## 10. Screenshot index

Existing corpus, `.impeccable/critique/evidence/frontend-2026-11-18/*.png`:

| File | What it shows |
| --- | --- |
| `00-login-desktop.png` | Login, centred, 200 px of dead air above the form (identical to `10`) |
| `10-login-desktop-light.png` | Byte-identical duplicate of `00` (md5 `6005cfc8...`) |
| `11-register-desktop-light.png` | Registration card, Nome/Cognome pairs, dependent Provincia/Comune |
| `12-register-validation-empty-required.png` | Invalid email in focus: green ring, no error text |
| `20-catalog-desktop-light.png` | Catalog, filters collapsed, 10 rows, count line |
| `20-catalog-desktop-dark.png` | Same in dark: parity holds |
| `21-catalog-filters-open-desktop-light.png` | 5 controls in one card plus the 2-line filter legend |
| `22-catalog-empty-result-desktop-light.png` | Empty result, "1 filtro attivo · Azzera", no in-state recovery button |
| `23-web-nav-menu-open-desktop-light.png` | Web menu dropdown, 5 items, "Sezione attuale: Servizi" |
| `30-service-detail-modal-desktop-light.png` | Detail modal: tagged box, centred `Segnala`, single `Invia proposta` |
| `30-service-detail-modal-desktop-dark.png` | Dark modal; box still reading "Carico le altre pubblicazioni..." |
| `31-catalog-keyboard-focus-desktop-light.png` | 2 px accent focus ring on a whole catalog card |
| `40-match-desktop-light.png` | Match: 0 credits, two dead pills, active request queue card |
| `40-match-desktop-dark.png` | Same in dark |
| `41-offer-and-request-desktop-light.png` | One offer and one request at maximum, both read-only `Modifica` |
| `41-onr-desktop-dark.png` | Same in dark |
| `50-agreements-desktop-light.png` | Agreements, `Inviate 0 / In corso 1 / Conclusi 0`, empty state, bell FAB |
| `50-agreements-desktop-dark.png` | Captured mid-load: tab counts absent, "Carico gli accordi..." |
| `51-agreements-in-progress-desktop-light.png` | In-progress agreement: `Apri chat` + `Annulla scambio` |
| `52-agreements-bell-panel-desktop-light.png` | Bell panel: handle, date, Accetta/Rifiuta — no services |
| `52-bell-panel-desktop-dark.png` | Same in dark |
| `53-agreements-concluded-desktop-light.png` | Conclusi tab, "rifiutati, annullati o già scaduti" |
| `54-chat-desktop-light.png` | Chat: no counterpart, `Crea accordo` on top, composer below |
| `60-staff-desktop-light.png` | Staff root: Servizi eliminati, 5 status pills, report card |
| `61-staff-users-desktop-light.png` | Users: search + role pills + status pills, Rendi staff/Sospendi |
| `70-profile-desktop-light.png` | Profile: credits, notifications row, theme track, session line, `Esci` |
| `71-notifications-sheet-desktop-light.png` | Notifications panel: unread ring, chips, `Elimina`, English body |
| `72-edit-profile-desktop-light.png` | Edit profile: data card + image URL card, full-width save |
| `74-report-form-desktop-light.png` | Report: person card, 2000-char field, narrow `Invia alla staff` |
| `75-report-validation-desktop-light.png` | Report field focused with 1 character, no error messaging visible |
| `80-public-profile-desktop-light.png` | Public profile: raw bullet list, no cards, no action |
| `90-not-found-desktop-light.png` | Blank white page (5.2 KB uniform white) |

Mobile evidence added by this pass,
`.impeccable/critique/evidence/frontend-2026-11-18/mobile/*.png` (plus
`notes.txt` with overflow, target-size, URL and error logs):

| File | Viewport / engine | What it shows |
| --- | --- | --- |
| `m375-20-catalog.png` | 320 WebKit (Playwright `iPhone SE` profile) | Catalog mid-load, chrome bar reserve |
| `m375-50-agreements.png` | 320 WebKit | Agreements mid-load, 3 segments without counts, bell FAB |
| `m375-70-profile.png` | 320 WebKit | Profile at the narrowest width |
| `m375-71-notifications.png` | 320 WebKit | Notifications panel loading, over the profile |
| `m375w-20-catalog.png` | 375 WebKit | Catalog mid-load ("Carico i servizi...") |
| `m375w-21-filters-open.png` | 375 WebKit | Filters open: 5 stacked controls, results pushed below the fold |
| `m375w-51-agreements-in-progress.png` | 375 WebKit | In corso selected; only `Aggiorna`, `Menu`, bell in the bar |
| `m375w-54-chat.png` | 375 WebKit | Chat during Metro bundling (not the screen) |
| `m375w-70-profile.png` | 375 WebKit | Profile, loaded |
| `m375w-71-notifications.png` | 375 WebKit | Notifications loading |
| `m412-20-catalog.png` | 412 Chromium (Pixel 7) | Catalog loaded: rows wrapping into 4/2/3 meta lines |
| `m412-50-agreements.png` | 412 Chromium | Agreements mid-load, segments without counts |
| `m412-51-agreements-in-progress.png` | 412 Chromium | In progress selected, card with the two actions |
| `m412-54-chat.png` | 412 Chromium | Chat during bundling |
| `m412-54-chat-loaded.png` | 412 Chromium | Chat loaded: composer docked at 676/839 |
| `m412-70-profile.png` | 412 Chromium | Profile loaded, sheet open over it |
| `m412-71-notifications.png` | 412 Chromium | Notifications loading |
| `m412-71-notifications-loaded.png` | 412 Chromium | Notifications loaded: chips wrap, date drops to a second line |
| `w1280-90-not-found.png` | 1280 Chromium | 404: blank white, empty body text |

Scripts used (kept for reproduction, no app code touched):
`scripts/mobile-a2.js`, `scripts/mobile-a2-chat.js`.

