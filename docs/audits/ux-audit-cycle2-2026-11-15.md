# UX / UI critique — cycle 2 (2026-11-15, later)

Scoped critique of the surfaces this cycle created or changed: **the `match` tab**
(queues), **the agreement card with its two sheet rows**, and a regression read of
**the notification row** the first audit's P1s were about.

**Method.** `impeccable context --target Frontend/src` (loaded `DESIGN.md`; the
project still has no `PRODUCT.md`, so this is the scoped-critique path and
`/impeccable init` remains a suggestion). Rendered leg: the exported web build
(`npx expo export --platform web`, served by `npx expo serve dist`) driven by
Playwright against the real Symfony backend, at 390 and 1440, light and dark;
script and raw numbers in
[`native-parity-2026-11-15.md`](native-parity-2026-11-15.md) §3 and
[`screens-2026-11-15-cycle2/`](screens-2026-11-15-cycle2/). Source leg: the new
files read line by line, plus `DESIGN.md`'s two colour rules.

**Mode:** Operate. **Surface:** `Frontend/src` (slug `frontend-src-app`).
**Backend:** Docker stack on `barattolo_15112026` + seed, logged in as
`coda.demo` (one offer, one request, one credit) with an accepted agreement
between `coda.demo` and `mario.rossi` carrying one compiled sheet row.

---

## 1. Design health (only the heuristics these surfaces move)

| # | Heuristic | Score | Note |
| --- | --- | --- | --- |
| 1 | Visibility of system status | 3 | a queue says its state (`In attesa`) and the create/cancel outcomes arrive as banners; nothing says when a queue was opened, because the DTO carries no date |
| 2 | Match with the real world | 3 | "coda", "offerta", "ricerca" are the product's words; "credito" appears once as a cost and never as a balance, which is honest but leaves the reader unable to check it |
| 3 | User control and freedom | 3 | cancel goes through `ConfirmModal` and names the linked agreement; a created queue cannot be edited, only closed |
| 4 | Consistency and standards | 4 | every destructive action in these surfaces uses the app's own confirmation; every disabled control says why |
| 5 | Error prevention | 3 | the create buttons are disabled when the backend cannot serve them, and the sheet rejects an impossible period before the call |
| 7 | Flexibility | 2 | two date text fields with no picker: `AAAA-MM-GG` typed by hand is the only way in |
| 8 | Aesthetic and minimalist design | 3 | the queue card carries five facts and one action; the empty state explains the feature where it is needed and disappears when it is no longer needed |
| 9 | Error recovery | 3 | banners keep the rows on screen; the sheet form keeps what was typed when the call fails |

**24/32** across the seven heuristics that can move (the previous audit scored
27/40 on ten). The two lowest are the two hardest to fix inside a cycle: a date
picker is a dependency decision, and a credit balance needs a backend route
(`backend-gaps.md` G15).

## 2. Findings

### Fixed in this cycle (found by this critique, not by the first audit)

**P1 — two filled accent buttons on one screen.** The two create actions shipped
as `primary`, i.e. two filled green pills side by side. `DESIGN.md` rule 1: *one
filled primary element per screen — plus the data marks that classify* — and *a
screen with no primary action has no filled accent, and that is the rule working*.
The pair is a choice between two equal actions, not two primaries, so both are
`secondary` now (`match.jsx`, `CreateQueueActions`).

**P1 — the empty state pointed the wrong way.** «Creane una qui sopra.» while the
two buttons render **below** the empty state (`match.jsx` renders `EmptyState`
before `CreateQueueActions`). Copy that names the wrong direction is worse than no
copy. Now «Creane una con i due pulsanti qui sotto.»

**P1 — the create buttons had no accessible name of their own.** A screen reader
announced «Offerta, button» and «Ricerca, button»: the label names a noun, not an
action. Both carry `accessibilityLabel="Crea una coda per la tua offerta"` /
`"…ricerca"`.

### Carried in, not fixed (recorded)

**P2 — a date field with no picker.** The sheet form asks for `AAAA-MM-GG` twice.
`dataDaInput` refuses impossible days and `periodoValido` refuses the reversed
period before the call, so the failure mode is a clear message and not a `400`;
but typing ten characters twice on a phone is the worst part of the flow. A date
picker is a dependency and a design decision, not a cycle-2 refactor.

**P2 — a queue has no age.** `ServiceQueueDTO` carries no `createdAt`, so a queue
opened three weeks ago looks exactly like one opened a minute ago. `In attesa` is
a state, not a duration. Needs a backend field (`docs/backend-gaps.md` G17 area).

**P2 — the match explainer disappears exactly when it is useful.** The only
sentence explaining what a queue does lives in the empty state; with one queue on
screen the reader keeps the header frase («Le code di offerta e ricerca in attesa
di uno scambio.») and nothing more. A permanent one-liner above the list would fix
it, but it is product copy: left for the owner to word.

**P2 — the previous screen stays in the DOM on web.** Measured on `/match`
entered from `/`: two visible `h1` elements («Servizi», «Match») at the same box,
neither `aria-hidden`. Pre-existing stack behaviour, not introduced here; the
accessibility pass should give the inactive screen `aria-hidden` / `inert`.

**P3 — the notification row still offers two actions.** The first audit's P1 was
"confirmation or overflow menu". The cycle closed the confirmation (the destroying
action now asks first) and kept both controls visible, which is the smaller
change; the cost is two targets per row and a row that reads as a small toolbar.

## 3. Technical checks (measured on the rendered build)

| Check | Result |
| --- | --- |
| Horizontal overflow at 390 / 1440 | `scrollWidth === innerWidth` at both (`390`, `1440`) |
| Touch targets at 390 (inbox, dark) | 7 targets, 0 under 44 px |
| One visible `h1` per screen | `["Notifiche"]`, `["Accordi"]`; `/match` shows two because of the stacked screen above (P2) |
| Unread marker | dot `rgb(78, 169, 127)` in dark, card fill stays `surface`, 2 dots for 2 unread rows out of 4 |
| Refresh sentence | one occurrence (header) |
| Dark theme | `documentElement.style.colorScheme === 'dark'`; every new surface follows, no light card on a dark page |
| Empty → created → cancelled (match) | `Nessuna coda attiva` → row + `Coda di offerta creata.` → confirm panel → `Coda annullata: …` → `Nessuna coda attiva` |
| Sheet card | one block (`La tua scheda`), dates, mode, `Scheda confermata.`; the provider form is not offered on a row that belongs to the other side |
| Copy | Italian, no emoji, no backend codes; the only English word left is in a dev comment |
| Contrast | not re-derived: `tokens.js` untouched; the new pairs reuse `serviceBg`/`serviceText`, `accentBg`/`accentText`, `danger`/`dangerBg`, all audited on 2026-11-13 |

## 4. What this critique did not verify

- Native rendering: everything here is the web build (see
  [`native-parity-2026-11-15.md`](native-parity-2026-11-15.md) §5 for the owed
  checklist).
- The queue flows with a **second** account creating the matching queue (the
  matchmaker needs a worker; `setup.md` documents the command, the cycle verified
  queue creation and cancellation only).
- The sheet form with the keyboard open, and its error copy when the backend
  answers `400` (the local rule rejects the same cases first, so the backend
  message was not exercised through the UI).
- VoiceOver / TalkBack on the new chips, dots and badges.
