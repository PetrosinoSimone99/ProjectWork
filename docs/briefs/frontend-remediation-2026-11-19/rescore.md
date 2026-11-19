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

- Dark theme on `/chat`, `/edit-profile`, `/user/<id>`; the notifications
  panel's loading/error/empty states. Same reason as the audit: no re-run of the
  failing notifications request in this session.
- Any native surface: no emulator or device on this machine. Every native
  change (size classes, live region on validation, 48 dp floor, native driver,
  `expo-image`) is a source claim.
- Reduced-motion behaviour, Dynamic Type, keyboard insets.
- The 412 and 768 widths after the catalog grid and the size classes: the grid
  was measured at desktop width only.
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
