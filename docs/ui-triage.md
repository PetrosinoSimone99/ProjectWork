# UI triage — symptom inventory

Working inventory for the session that fixes UI defects. Not a spec, not a
backlog: three tiers, kept apart on purpose, so nothing enters a fix list on
the strength of someone's reading of the code.

| Tier | Meaning | May a fix start from it? |
| --- | --- | --- |
| **Fact** | Read out of the source. The code says this; no interpretation. | Only together with a judgment on whether it is wrong |
| **Hypothesis** | Mechanism is plausible and located, effect is unmeasured | No. Measure first |
| **Report** | An operator saw it, no repro yet | No. Reproduce first |

Surface for every entry is Expo Router on `Frontend/`. Native = Expo Go on a
physical device, web = `npx expo start --web`.

## Fact

| # | What the code says | Where |
| --- | --- | --- |
| F1 | `layout.maxContent` is 560 and applies to every screen except the home catalog, which passes `larga` for 720 | `src/theme/tokens.js:153` · `src/components/Screen.jsx:81` |
| F2 | `AppButton`'s icon carries `marginLeft: -space.xs` inside a `justifyContent: 'center'` row with `gap: space.sm`; 33 call sites pass `icon` | `src/components/AppButton.jsx:87` |
| F3 | **closed 2026-11-16 (W1)**: the chat screen now exists at `src/app/chat/[agreementId].jsx`, so the `Screen.jsx` paragraph about "a bar anchored at the bottom (chat)" and `bottomSpacing` describes a real screen; `_layout.jsx` lists the route and names no screen it lacks | `src/components/Screen.jsx:52` · `src/app/_layout.jsx:96` |
| F4 | **closed 2026-11-17: wrong premise.** Both rows do use `alignItems: 'baseline'`, but `AppInput` pairs 13/600 with 13/400 (one scale, two weights, measured offset 0.00 px) and `PageHeader`'s 12/600 + 13 pair never renders: the only call site passes `frase`, never `titolo` | `src/components/AppInput.jsx:122` · `src/components/PageHeader.jsx:74` · `src/components/ServicesSection.jsx:105` |
| F5 | Every route file under `src/app` is listed in the route table, and every `router.push` / `router.replace` target resolves to an existing route | `src/app/_layout.jsx` |
| F6 | **Stale, corrected 2026-11-21.** The route table lost `/notifications` on 2026-11-18 (it is a panel inside the profile now); the sweep still lists it as `06-notifiche` | `src/app/_layout.jsx:94` · `docs/audits/scripts/ui-triage-sweep.js:43` |
| F7 | **The `/user/[id]` and `/chat/[agreementId]` entry points exist**, so the sentence "nothing to open" below is out of date. They are `onPress` handlers, not anchors: the sweep harvests `a[href]`, which is why it still reports *nessun link* | `src/app/(tabs)/index.jsx:322` · `src/components/AgreementCard.jsx:97` · `src/app/(tabs)/agreements.jsx:279` · `docs/audits/scripts/ui-triage-sweep.js:202` |

F5 says a static reading exposes no redirect defect. It does **not** say
redirects work: auth-state timing, the `booting` gate, `replace` ordering,
back-stack skipping, session expiry and web URL hydration are all invisible to
a resolve check.

F6 and F7 are the sweep's own staleness, not a screen's. Before the next pass
the script needs two changes: drop the `06-notifiche` row (the route is gone, so
the pass can only time out on it) and reach `/user/[id]` and `/chat/[agreementId]`
by clicking the card that opens them, since an `onPress` leaves no `href` for the
harvest at line 202 to find. Neither change is a measurement, and neither is made
yet: the sweep has not been re-run since 2026-11-17.

## Hypothesis

Measured on 2026-11-17. A closed hypothesis stays here instead of being deleted:
the next session needs the number that retired it, not the absence of a number.

- **H1 (from F1) — dismissed.** The column is 560 at 1280 with 360 of margin on
  each side, 560 at 1920 with 680, and 720 on the catalog; at 768 it is 560 (720
  on the catalog) and at 375 it is the whole window. The same numbers in both
  themes — this is the two-measure system `docs/DESIGN.md` §Measures declares
  (560/720, set at `tokens.js:153`), page band included, so the sweep finds no
  gap between the system and the render. The wide margins at 1280/1920 are that
  measure doing its job. What stays a judgment, and was always the judgment
  rather than the number, is whether a reading measure belongs on a surface that
  is scanned.
- **H2 (from F2) — dismissed as a defect, confirmed as a number.** 136
  measurements — of 222 measured buttons, those whose icon carries the
  `-space.xs` margin — and the ink centre sits between 0.92 and 1.96 px left of
  the pill's centre, median 1.42 px left. The composite's box is 2.00 px left
  (2.01 on 28 of the 136, where the layout lands sub-pixel), which is the
  arithmetic of `marginLeft: -space.xs` (-4 px against a `gap: space.sm` of 8).
  Without the margin the residual would be about +0.6 px, so **the margin creates
  the offset it was meant to remove.** Not touched: 1.4 px on a pill from 118 to
  528 px is not visible, and `DESIGN.md` fixes no optical centre for it to
  violate.
- **H3 (from F4) — dismissed on the premise, not on the alignment.** `AppInput`
  pairs 13/600 with 13/400 — one scale, two weights — and the baseline offset is
  0.00 px in all 24 measured rows, across the eight viewport/theme combinations.
  `PageHeader`'s 12/600 + 13 pair never renders: the only call site of
  `variante="sezione"` is `ServicesSection.jsx:105`, and it passes `frase`,
  never `titolo`. F4 is therefore the wrong fact, and H3 has no pair to shift.

The measurement is `docs/audits/scripts/ui-triage-sweep.js`. Its captures and the
raw JSON stay in `.playwright-mcp/`, outside the repository, so no document here
links to them. Last run 2026-11-17; the script's route list and its anchor harvest
both need the two changes F6/F7 describe before it can run again.

## Report

Seen by the operator, no repro yet. Each needs: viewport, steps, expected vs
actual, and a capture. There is no fake-data mode to record (see below), so the
column is the backend's state, not a switch.

- ~~Buttons and components not centred~~ — **resolved by H2**: 1.4 px, invisible,
  against no committed optical centre.
- Blank areas inside screens that scroll.
- ~~"Screen size" wrong~~ — **resolved by H1**: the viewport was named (375 / 768
  / 1280 / 1920) and the column is the declared measure at every one.
- Redirect behaviour.
- Anything nobody has looked at yet.

`/user/[id]` and `/chat/[agreementId]` stay in this tier and not in Hypothesis:
they are **not seen**, and the blocker moved. It is no longer "there is nothing
to open" (F7: there is, three call sites) — it is that the pass cannot walk to
them yet. They are unmeasured, never clean.

## Method

1. One sweep, not one guess: every reachable route, at 375 / 768 / 1280 / 1920,
   in both themes, plus loading / empty / error. Fixed viewports, not a
   resized window.
2. Judge against `docs/DESIGN.md` (spacing beats, shape roles, measures), not
   against taste. A deviation from the committed system is a defect; a
   deviation from preference is not.
3. Anything that survives step 2 becomes a defect entry with a real repro and
   goes to the fix process.

Detectors check contrast, tap targets, overflow and type size. They do not
catch optical centring, and neither does a linter. That class needs the eye on
a capture at known dimensions.

### What the 2026-11-17 sweep covered, and what it could not

The pass measured seven authenticated routes (catalog, match, offer and request,
agreements, profile, notifications, edit profile) and the three anonymous ones
(login, register, not found), at 375 / 768 / 1280 / 1920 in both themes. States:
loading and error on the profile (a delayed and then an aborted `/api/**`). The
app's boot screen is not among the captures, so the `booting` gate stays
unmeasured. The route list has since aged (F6): `/notifications` was a screen
then and is a panel now, so that column describes a route the app no longer has.

The empty catalog is **seen but not measured**. The step exists (a search with no
results) and four captures came out of it at 375 and 1920 in both themes, but
`dati.json` holds no record for that state: the recorded run timed out filling
the search field at 375 and 1280 in both themes, so no column was ever written
down. The H1 verdict therefore claims the two themes and not the empty state; the
band, read on the captures at 1280/1920, is likewise not in the numeric probe,
which recorded the column.

Two routes stay unseen, and the reason has changed since the pass ran: **`/user/[id]`
and `/chat/[agreementId]`**. The entry points exist in the code (F7), but they are
`onPress` handlers rather than anchors, so the harvest at
`ui-triage-sweep.js:202` finds no `href` and the pass records *nessun link
`/user/` in pagina* and *nessun link `/chat/` in pagina* at every viewport. On top
of that the sweep runs against the exported web build, which generates no page
per id. Measuring them needs one of two things — a click step in the script, or a
deep link with a known id — and the first is a code change to the script, not a
wider sweep. Until then they are **not seen**, not "clean".

## Out of scope

Backend behaviour, and anything under `Backend/`, `Context_and_DB_V2/` or
`Archive/`. `/staff`, `/staff-users` and `/report` need a staff account; demo
users carry only `ROLE_USER`, so those three stay out until a staff user exists
(`php bin/console app:create-staff`, see `docs/setup.md`).

## Data mode

There is one mode: the app always talks to the real backend (`docs/decisions.md`
D011 — `src/api/config.js` reads only `EXPO_PUBLIC_API_PORT` and
`EXPO_PUBLIC_API_URL`, and no branch in `src/` references a fake-data switch).
A sweep therefore runs against seeded data: six demo users, password `demo1234`,
one per city (`giulia.bianchi` Roma, `marco.ricci` Milano, `sara.mancini`
Torino, `davide.costa` Bologna, `chiara.marino` Napoli, `luca.ferrari` Firenze).
The Docker stack is up (`backend-backend-1` on :8000, `backend-database-1`
healthy).
