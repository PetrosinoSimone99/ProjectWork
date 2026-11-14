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
| F3 | `_layout.jsx` and `Screen.jsx` docstrings describe chat / proposta / token screens; no such file exists under `src/app` | `src/app/_layout.jsx:19` · `src/components/Screen.jsx:42` |
| F4 | Two rows align label and value with `alignItems: 'baseline'` while their children use different type scales | `src/components/AppInput.jsx:115` · `src/components/PageHeader.jsx:44` |
| F5 | Every route file under `src/app` is listed in the route table, and every `router.push` / `router.replace` target resolves to an existing route | `src/app/_layout.jsx` |

F5 says a static reading exposes no redirect defect. It does **not** say
redirects work: auth-state timing, the `booting` gate, `replace` ordering,
back-stack skipping, session expiry and web URL hydration are all invisible to
a resolve check.

## Hypothesis

- **H1 (from F1).** At 1280 the column is 560, leaving 360pt per side; at 1920,
  680pt. If the wide empty margins are this, the defect is not the number but
  using a reading measure as the page width on surfaces that are not reading
  surfaces. `docs/DESIGN.md` defends the number, so this is a judgment call
  that has to be argued, not silently changed.
- **H2 (from F2).** The composite `[icon][gap][text]` is not symmetric under
  centring, so every icon button sits off centre. **Unmeasured.** Needs the
  rendered box, not the style sheet.
- **H3 (from F4).** Baseline alignment between two type scales shifts the pair
  when either string wraps or the line height changes.

## Report

Seen by the operator, no repro yet. Each needs: viewport, steps, expected vs
actual, and a capture. There is no fake-data mode to record (see below), so the
column is the backend's state, not a switch.

- Buttons and components not centred (possibly H2, possibly something else).
- Blank areas inside screens that scroll.
- "Screen size" wrong — the viewport has to be named before this can be judged.
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

## Out of scope

Backend behaviour, and anything under `Backend/`, `Context_and_DB_V2/` or
`Archive/`. `/staff`, `/staff-users` and `/report` need a staff account; demo
users carry only `ROLE_USER`, so those three stay out until a staff user exists
(`php bin/console app:create-staff`, see `docs/setup.md`).

## Correction: there is no fake-data mode

`AGENTS.md` still documents `EXPO_PUBLIC_DATI_FINTI=1` in `Frontend/.env.local`
as the fake-vs-real switch. It does not exist. `src/api/config.js` never reads
it, no branch in `src/` references it, and both `docs/decisions.md` (D011) and
`docs/setup.md` record that the layer was removed. Setting the variable changes
nothing.

The app always talks to the real backend. The Docker stack is up
(`backend-backend-1` on :8000, `backend-database-1` healthy), so a sweep runs
against seeded data: 30 demo users, password `demo`, e.g. `mario.rossi`.

Consequence for any agent reading `AGENTS.md` first: its premise is false, and
reasoning that starts from "check both data modes" is wrong from the first step.
