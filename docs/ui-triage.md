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
| F1 | `layout.maxContent` is 560 and applies to every screen except the home catalog, which passes `larga` for 720 | `src/theme/tokens.js` · `src/components/Screen.jsx:68-74` |
| F2 | `AppButton`'s icon carries `marginLeft: -space.xs` inside a `justifyContent: 'center'` row with `gap: space.sm`; 33 call sites pass `icon` | `src/components/AppButton.jsx:83` |
| F3 | **closed 2026-11-16 (W1)**: the chat screen now exists at `src/app/chat/[agreementId].jsx`, so the `Screen.jsx` paragraph about "a bar anchored at the bottom (chat)" and `bottomSpacing` describes a real screen; `_layout.jsx` lists the route and names no screen it lacks | `src/components/Screen.jsx:52` · `src/app/_layout.jsx:96` |
| F4 | **closed 2026-11-17: wrong premise.** Both rows do use `alignItems: 'baseline'`, but `AppInput` pairs 13/600 with 13/400 (one scale, two weights, measured offset 0.00 px) and `PageHeader`'s 12/600 + 13 pair never renders: the only call site passes `frase`, never `titolo` | `src/components/AppInput.jsx:115` · `src/components/PageHeader.jsx:44` · `src/components/ServicesSection.jsx:105` |
| F5 | Every route file under `src/app` is listed in the route table, and every `router.push` / `router.replace` target resolves to an existing route | `src/app/_layout.jsx` |

F5 says a static reading exposes no redirect defect. It does **not** say
redirects work: auth-state timing, the `booting` gate, `replace` ordering,
back-stack skipping, session expiry and web URL hydration are all invisible to
a resolve check.

## Hypothesis

Measured on 2026-11-17. A closed hypothesis stays here instead of being deleted:
the next session needs the number that retired it, not the absence of a number.

- **H1 (from F1) — dismissed.** The column is 560 at 1280 with 360 of margin on
  each side, 560 at 1920 with 680, and 720 on the catalog; at 768 it is 560 (720
  on the catalog) and at 375 it is the whole window. The same numbers in both
  themes and in the empty state — this is the measure `docs/DESIGN.md` §Measures
  declares, `PageHeader`'s band included, so the sweep finds no gap between the
  system and the render. The wide margins at 1280/1920 are that measure doing its
  job. What stays a judgment, and was always the judgment rather than the number,
  is whether a reading measure belongs on a surface that is scanned.
- **H2 (from F2) — dismissed as a defect, confirmed as a number.** 136
  measurements: the ink centre sits between 0.92 and 1.96 px left of the pill's
  centre, median 1.42 px left, and the composite's box is exactly 2.00 px left,
  which is the arithmetic of `marginLeft: -space.xs` (-4 px against a
  `gap: space.sm` of 8). Without the margin the residual would be about +0.6 px,
  so **the margin creates the offset it was meant to remove.** Not touched:
  1.4 px on a pill from 118 to 528 px is not visible, and `DESIGN.md` fixes no
  optical centre for it to violate.
- **H3 (from F4) — dismissed on the premise, not on the alignment.** `AppInput`
  pairs 13/600 with 13/400 — one scale, two weights — and the baseline offset is
  0.00 px in all 24 measured rows, across the eight viewport/theme combinations.
  `PageHeader`'s 12/600 + 13 pair never renders: the only call site of
  `variante="sezione"` is `ServicesSection.jsx:105`, and it passes `frase`,
  never `titolo`. F4 is therefore the wrong fact, and H3 has no pair to shift.

The measurement is `docs/audits/scripts/ui-triage-sweep.js`. Its captures and the
raw JSON stay in `.playwright-mcp/`, outside the repository, so no document here
links to them.

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
loading and error on the profile (a delayed and then an aborted `/api/**`), empty
on the catalog (a search with no results). The app's boot screen is not among
the captures, so the `booting` gate stays unmeasured.

Two routes stay unseen, and not for lack of trying: **`/user/[id]` and
`/chat/[agreementId]`**. The sweep runs against the exported web build, which
generates no page per id, and no link in the rendered nav carries an `href`
towards one, so there is nothing to open — the pass logs it as "no `/user/` link
on the page" and "no `/chat/` link on the page" at every viewport. Measuring
them needs a navigable entry point (a link from a card) or a deep link with a
known id, which is a code change and not a wider sweep. Until then they are
**not seen**, not "clean".

## Out of scope

Backend behaviour, and anything under `Backend/`, `Context_and_DB_V2/` or
`Archive/`. `/staff`, `/staff-users` and `/report` need a staff account; demo
users carry only `ROLE_USER`, so those three stay out until a staff user exists
(`php bin/console app:create-staff`, see `docs/setup.md`).

## Correction: there is no fake-data mode

This section was written while `AGENTS.md` documented `EXPO_PUBLIC_DATI_FINTI=1`
in `Frontend/.env.local` as the fake-vs-real switch. The variable does not
exist: `src/api/config.js` never reads it, no branch in `src/` references it,
and both `docs/decisions.md` (D011) and `docs/setup.md` record that the layer
was removed. Setting the variable changes nothing. The sentence in `AGENTS.md`
has since been corrected — `AGENTS.md:130` now says the mode was removed — and
W8 closed the point on 2026-11-17
(`docs/audits/frontend-gap-analysis-2026-11-16.md`).

The app always talks to the real backend. The Docker stack is up
(`backend-backend-1` on :8000, `backend-database-1` healthy), so a sweep runs
against seeded data: six demo users, password `demo1234`, e.g. `marco.ricci`,
one per city (`giulia.bianchi` Roma, `marco.ricci` Milano, `sara.mancini`
Torino, `davide.costa` Bologna, `chiara.marino` Napoli, `luca.ferrari` Firenze).

Reasoning that starts from "check both data modes" is therefore still wrong,
but the repo rules no longer say it: `AGENTS.md`, `docs/decisions.md` and the
code agree that there is one mode.
