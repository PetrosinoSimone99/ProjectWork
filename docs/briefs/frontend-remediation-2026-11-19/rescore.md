# Re-score — 2026-11-19 (reduced, measured)

The 2026-11-18 audit prescribed a full `/impeccable audit` re-score after the
remediation cycle. What follows is what was **actually measured**, on the
production web export (`npx expo export --platform web`, served statically on
`:8090`) against the real Docker backend on `:8000`, **one Playwright context**,
while the cycle was closing. It is not a full re-score and does not claim to be.

## What was measured

| Route | Result |
| --- | --- |
| `/login` (after `404 → /login?ritorno=/`) | neutral masthead disc, one accent (the submit), subtitle present, `Registrati` link. The `ritorno` parameter is written on the redirect. |
| `/` catalog, signed in as `demo.staff` | every card carries the same three-line meta shape (chip │ mode, location │ date, author) — the 412 re-wrap is gone at desktop width; chrome bar neutral with `Aggiorna` and `Menu`. |
| `/agreements` | `Offre` / `Riceve` with both names and both services on every card; section titles and the tab say `Scambi`; bell disc neutral with a red badge; three pills with counts; `Apri chat` + `Annulla scambio` on `ACCEPTED` only. |
| `/chat/1` | header sentence names the trade (`Scambio con @giulia.bianchi: … per …`), `Invia la scheda` as the sheet action, composer with counter and one accent. |

Console: 0 errors across the four routes. The export compiled all 17 routes.

## What was NOT measured (and must not be claimed)

- ~~Dark theme on `/chat`, `/edit-profile`, `/user/<id>`; the notifications
  panel's loading/error/empty states.~~ **Measured 2026-11-19** (`residuals.md`
  steps 1a and 1b): the three dark routes are contrast-clean (no text pair under
  4.5:1; the lowest is the accent button's own label at 5.97:1, controls'
  borders 3.3-3.8:1), and the panel's error state is a `Banner` with `Riprova`
  above the rows — forced `500` on
  `GET /api/notifications?page=1&limit=20&unreadOnly=false`, body
  `{"error":"forced"}`. The panel's **loading** and **empty** states are the
  last two, measured in the closing session (`residuals.md` step 3): a delayed
  answer shows one labelled row, «Carico le notifiche…», inside a polite live
  region and nothing else; a 200 with zero rows shows the sentence that says what
  will arrive, with no spinner and no list left over. The three states never
  replace each other.
- Any native surface: no emulator or device on this machine. Every native
  change (size classes, live region on validation, 48 dp floor, native driver,
  `expo-image`) is a source claim. Re-stated, not lifted, on 2026-11-19
- Reduced-motion behaviour, Dynamic Type, keyboard insets.
- The 412 and 768 widths after the catalog grid and the size classes: the grid
  was measured at desktop width only. **Measured 2026-11-19** (`residuals.md`
  step 1c): no horizontal overflow at 375 / 412 / 768 / 1024 on `/`,
  `/agreements`, `/profile`, and the catalog keeps three meta rows on 11 of 11
  cards at every width. That run also found a defect this document could not
  have seen: at 375 and 412 the category chip overflows its column and is painted
  over the mode icon (§ Defects found by a later run).
- Production performance (LCP, bundle size, FPS). The backend's 4 s median is
  unchanged and out of scope for the frontend; it is stated in the demo, not
  hidden.
- The `404` route and the heading structure remain as the audit left them
  (correct; the blank state was Metro's first-visit compile).

## Defects found by this run and fixed before closing

- The agreements screen still titled itself `Accordi` while the tab, the
  sections and every sentence said `Scambi` — the exact one-word-per-object rule
  the clarify step had just installed, missed on the page header. Fixed in the
  same commit; the page title now comes from `TAB_ROUTES`.

## Defects found by a later run

`residuals.md` (2026-11-19) found one defect this re-score could not have seen,
because it only appears on the narrow widths this document did not measure:

- **The category chip leaves its column and is painted over the mode icon** at
  375 (36 px on `Assistenza computer`, 26 px on `Cucina vegetariana`, 11 px on
  `Cura delle piante`) and at 412 (17 px, 8 px). The chip keeps the width of its
  own text (175 px) in both classes, so it is not the column that clips it. Filed
  as `docs/audits/frontend-2026-11-19-catalog-chip-overlap.md`, block 16 of the
  plan, and **fixed on 2026-11-19**: the chip now shrinks inside its half-row
  (12 px of clearance at 375 and 412, 0 overlaps on every card) and truncates with
  an ellipsis instead of dropping the label. The three-meta-row shape this
  document called fixed was re-measured and holds on every card at 375, 412, 768
  and 1024.

## What the residuals session added to the score

- `/match` no longer states the balance as bare small grey text: it is a data
  mark (icon + label + tabular value) on the card surface, at the control floor
  height, with the zero case in `t.danger` plus a sentence naming the way back.
  Measured at 375 and 412, light and dark, with no overflow and with the
  confirmation still naming the same number. The same mark now also stands in the
  `I tuoi dati` band on `/profile` (measured 33→182.1, 44 high, no overflow), and
  the design system documents the object in `docs/DESIGN.md` («Data mark»):
  anatomy, height, and the surface rule that makes `t.surface` a decision instead
  of an exception.
- The notifications panel's last two states are measured: a delayed answer is one
  labelled row inside a polite live region, a zero-row answer is the sentence
  that says what will arrive. Neither replaces the other, and neither is a blank
  panel.
