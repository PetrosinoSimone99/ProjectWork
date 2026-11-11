# Plan — UX realignment 2026-11-11

Class **L**. Contract: [`plan-brief.md`](plan-brief.md) (objective, closed
decisions, criteria, exclusions, the four lock answers). This file is the truth
for execution; the chat summary is not.

`Stile: lite`

## Why L and not M

6 new files (`ux-audit-2026-11-11.md`, `ux-remediation-2026-11-11.md`,
`direction.md`, `docs/DESIGN.md`, this pair) + 2 new screenshot directories
(~45 PNGs) + 1-9 modified code files (`PublicationsSection.jsx` certain,
`changelog.md` certain, `tokens.js` conditional, up to 8 components/screens),
3 lanes in block 1, 5 children total. Counting: ~10 files touched, 6 of them new.

---

## Blocks

- [x] 0. Remove the duplicated plus from the add-publication CTA: drop `+` from `label="+ Aggiungi"`, keep `icon="add"` (AppButton already renders the glyph next to the text, `AppButton.jsx:58-63`) | files: Frontend/src/components/PublicationsSection.jsx | done: `grep -rn 'icon="add"' src` and `grep -rnE 'label=\{?["`][^"`]*\+' src` both return no CTA with a literal plus; gate green (`npx expo lint`, `npx tsc --noEmit`); one commit `fix: drop the duplicated plus from the add-publication CTA` | Stato: DONE
- [x] 1. Cold audit, read-only, one shared output file: Lane A (static, impeccable), Lane B (visual critique, taste), Lane C (captures, Playwright, run by the parent) | files: docs/audits/ux-audit-2026-11-11.md (new), docs/audits/screens-2026-11-11/ (new) | done: findings table with `file:line` and an evidence status (`VERIFIED`/`DEDUCED`/`NOT VERIFIABLE`) per row; §2 score table computed with the baseline formula `10 − (0.2·n1 + 0.5·n2 + 1.5·n3 + 3·n4)`, on the same five dimensions and weights as `ux-audit-2026-11-10.md` §2, so the two documents are row-comparable; matrix screen × state × theme captured at 390×844, 360×800, 1280×800 in light and dark | Stato: DONE
- [x] 2. Triage of findings into mechanical vs directional | files: docs/audits/ux-remediation-2026-11-11.md (new) | done: every finding from block 1 classified; mechanical rows carry the fix written out as `file:line` → exact change, no "improve X"; directional rows carry the design question they pose and nothing else; the triage row carries the file estimate counted, not guessed (`N modified + M new`), and the count is re-derived from the mechanical rows, not from this plan | Stato: DONE
- [x] 3. Visual direction over the directional findings only (conditional, see Ramp-out) | files: docs/briefs/ux-realignment/direction.md (new), `C:\Users\Andrea\AppData\Local\Temp\baratto-ux-direction\app\**` (outside the repo) | done: 3 directions proposed with palette and type frozen (`--keep palette,type`), one chosen and motivated in 10 lines, and a frozen "files to touch" list that block 4 may not extend; Andrea approves in chat before block 4 | Stato: DONE
- [x] 4. Implementation of the chosen direction (conditional, see Ramp-out) | files: Frontend/src/theme/tokens.js only if a role is genuinely missing, plus the files frozen in `direction.md`, drawn from the declared pool below, hard cap 8 | done: every touched screen passes `npx expo lint` and `npx tsc --noEmit`; diff contains no inline style that a token could express and no per-screen copy of a shared rule; commits of 2-3 files each | Stato: DONE — nine files, four commits, 2026-11-11 (see the amendment)
- [x] 4'. Mechanical-only fallback (only if block 2 finds zero directional findings) | files: exactly the files named by the mechanical rows of the remediation doc | done: every mechanical finding closed, each commit green on its own, remediation row flipped to `closed` in the same commit | Stato: NOT TRIGGERED — block 2 found nine directional rows
- [x] 5. Verification with Playwright on the real states (conditional: needs block 4 or 4' to have a visual effect) | files: docs/audits/screens-2026-11-11-after/ (new) | done: before/after on the same states and viewports, side by side, plus the browser console captured with no new RN-web warning introduced by the cycle | Stato: DONE — ten captures, names paired with the before set, console: zero errors and one pre-existing `shadow*` deprecation
- [x] 6. Close: changelog, remediation status per finding, `docs/DESIGN.md` derived from `tokens.js` | files: docs/changelog.md, docs/audits/ux-remediation-2026-11-11.md, docs/DESIGN.md (new) | done: changelog has one entry per block; every remediation row carries a final status; `docs/DESIGN.md` states roles and rules read out of `tokens.js` with no value restated and points at the file as the source of truth; `grep` for any hex or numeric token value inside `DESIGN.md` returns only pointers, not copies | Stato: DONE — `grep -nE '#[0-9A-Fa-f]{3,8}' docs/DESIGN.md` returns nothing and the only digits left are list markers

### Declared pool for block 4 (nothing outside it, cap 8 touched)

`Frontend/src/theme/tokens.js` (only for a missing role),
`Frontend/src/components/Screen.jsx`, `AppText.jsx`, `Card.jsx`,
`EmptyState.jsx`, `PillBar.jsx`, `FilterBar.jsx`, `ServiceCard.jsx`,
`ServicesSection.jsx`, `PublicationsSection.jsx`, `ServiceDetailModal.jsx`,
`ModalShell.jsx`, `WebNavMenu.jsx`, `Frontend/src/app/(tabs)/index.jsx`.

The exact subset is written into `direction.md` in block 3, before any edit.
A finding that needs a file outside this pool does not get silently widened: it
goes back to Andrea as a scope question.

### Ramp-out (condition, not a post-hoc decision)

If block 2 classifies **zero** directional findings, blocks 3 and 5 are
cancelled and block 4 is replaced by 4' — mechanical fixes still ship. Blocks 3
and 4 both cancelled with mechanical fixes dropped would leave a written list of
one-line fixes unexecuted, which contradicts the objective of the cycle (lock
answer 4 in the brief). Block 6 then records, per finding, `closed` or
`cancelled by ramp-out`.

## Lanes

Shared, written by the parent before any lane and committed as the base:
`docs/audits/ux-audit-2026-11-11.md`, `docs/audits/ux-remediation-2026-11-11.md`,
`docs/changelog.md`, `docs/DESIGN.md`, `docs/briefs/ux-realignment/*`. The parent
is also the only process that assembles the audit file: lanes return sections,
one writer per file.

| Lane | Block | Kind | Writes | Disjoint from |
| --- | --- | --- | --- | --- |
| A | 1 | child `reviewer`, read-only, static impeccable pass (`audit.native.md`, `critique.md`, `craft-floor.md`, `polish.md`, `layout.md`, `typeset.md`) | nothing in the repo; its section goes to a temp file outside git | B, C |
| B | 1 | child `reviewer`, read-only, taste critique of the design system and of the running web build (`references/app-screens.md` read whole before starting) | nothing in the repo; temp file outside git | A, C |
| C | 1 | parent, Playwright MCP (single browser session, so it cannot be a child running in parallel with another browser user) | `docs/audits/screens-2026-11-11/` | A, B |

Lanes A and B are read-only children, so no worktree: no writer per tree
conflict, no `node_modules` linking needed, no install in a lane. Blocks 2-6 are
`single`, strictly sequential (2 depends on 1; 4 depends on 3; 5 depends on 4;
6 depends on all). Block 4 never goes in a lane: it edits shared components, and
the merge would cost more than the writing.

## Children and their inputs (paths passed, never searched)

1. Lane A — `impeccable`: `C:\Users\Andrea\.agents\skills\impeccable\SKILL.md`,
   reference files in `...\impeccable\reference\`:
   `audit.native.md`, `critique.md`, `craft-floor.md`, `polish.md`, `layout.md`,
   `typeset.md`, `ios.md`. Launcher (verified, the path in the request does not
   exist): `C:\Users\Andrea\.agents\skills\impeccable\scripts\impeccable.cmd`.
   Contract handed to it: `docs/briefs/ux-realignment/plan-brief.md`.
2. Lane B — `taste`: `C:\Users\Andrea\.agents\skills\design-taste-frontend\SKILL.md`,
   read `references\app-screens.md` in full first. Same contract path.
3. Block 3 — taste in app-screen mode, `.taste-skill/app/` output outside the
   repo, `--keep palette,type`.
4. Block 5 — parent, Playwright MCP, states listed below.

States handed to Lane C and block 5, no child picks its own: empty, loaded,
limit reached (`EntriesSection.jsx:32`, `PublicationsSection.jsx:28,42`), error,
session expired (`SessionExpiryBanner.jsx`), service detail modal,
agreements bell panel, staff area (staff reports + staff users), login,
register, edit-profile under a real 401. Themes: light and dark. Viewports:
390×844, 360×800, 1280×800. Web build:
`EXPO_PUBLIC_DATI_FINTI=1 npx expo start --web --port 8081`.

## Gates and verifications

`cd Frontend && npx expo lint` (measured clean, 11.7 s) and
`npx tsc --noEmit` (measured clean, 5.2 s) before every push. `tsc` here gates
syntax and import resolution only (`allowJs` without `checkJs`, no
`@ts-check` anywhere): it is kept for what it does, not credited for what it
does not. Commits per block, conventional, English, `docs/` in the same commit
as the change. Never `git add -A`. Push to `andrea-frontend` only.

## Risks carried in the plan

- `draw.mjs --app` needs Chrome; there is no Chrome at the default path, only
  `chromium-1248` under `%LOCALAPPDATA%\ms-playwright`. Fallback in block 3: if
  the renderer cannot find a binary, the 3 directions are written as markdown
  with annotated existing captures, no Chrome install, and Andrea is told at the
  approval stop instead of the block stalling.
- `origin/main` is 3 commits ahead of the working branch (Backend only, zero
  Frontend impact). No merge performed. Proposed as a separate commit after
  block 6, on Andrea's word.
- The baseline is already at 9.9/10 by the audit's own arithmetic: a low new
  score would mean the auditor is counting differently, not that the app got
  worse. Method differences are recorded in §6, the way the 2026-11-10 document
  does.

## Amendment — approved 2026-11-11

The triage (block 2) counted 29 mechanical rows across 29 files, more than this
plan's block 4 ceiling of 8, so block 4 runs in three parts and the ramp-out is
unchanged:

| Part | What | Files | Status |
| --- | --- | --- | --- |
| 4a | wave 1, the "loss and truth" rows: F44, F46, F49, F50, F54, F56, F57, F58, F60, F87, F91, F92 (12 closed; F61 to wave 3) | 19 | **DONE in six commits** |
| 4b | the direction of `direction.md`, nine files frozen there | 9 | **DONE in four commits** (`36fd3e5`, `aa450ab`, `0af567d`, `8047a74`) — the commit range is 9 files, checked, not claimed |
| 4c | the rest of wave 2 (F51, F52, F53, F70, F71, F83, F85) | 15 | **DONE in six commits** (`92e79df`, `cca31e4`, `331c524`, `0b80b6b`, `a60f4dd`, `22febf7`): the seven rows, plus the call sites F47 and F48 could not be finished without, plus the two files §10 names |
| 5 | before/after with Playwright | `screens-2026-11-11-after/` | **DONE** — ten captures + README pairing them |
| 6 | changelog, remediation status, `docs/DESIGN.md` | 3 | **DONE** |

Wave 3 stays deferred with its condition written in the remediation doc: F61
(needs the backend's action vocabulary), F72 (needs an affordance decision), F73
(needs the page contract), F74 (needs a measurement), F94 (blocked on the console
stack).

## How to resume (read this first)

State on disk, nothing else needed: blocks 0, 1, 2, 3, 4a, 4b, 4c, 5 and 6 are
committed; the tree is clean apart from the untracked `.playwright-mcp/` (browser
session logs, never to be committed). The cycle is closed except for the items
in the next paragraph.

What is left, and it is not this cycle's work to guess at:

- **Four findings whose answer exists but whose file never entered a block**: F45
  and F84 (`components/FilterBar.jsx`), F59 (`app/edit-profile.jsx`), F90
  (`(auth)/login.jsx`, `(auth)/register.jsx`). Remediation §10 says what each
  answer is; each needs a file the direction froze out of 4b and 4c was not
  scoped for.
- **One composition statement the direction borrows and did not spend**: the
  profile as one sheet with bands instead of five peer cards. Only its type
  roles and its avatar changed.
- **Wave 3**, unchanged and deferred with its conditions: F61, F72, F73, F74,
  F94.
- **`origin/main` is still 3 commits ahead** (Backend only, zero Frontend
  impact). No merge performed: that is a separate commit on Andrea's word.

The next session, in order, if Andrea wants them: F45+F84 in one commit (one
file, one decision, both rows), then F59, then F90, then the profile sheet, then
wave 3 as each condition unblocks. Each is small enough to be its own block with
its own gate.

Environment, in this order, or the session loses half an hour to it:

1. Backend: `docker ps` must show `backend-backend-1` and `backend-database-1`
   on port 8000. The PHP dev server is single-threaded: the first request after
   a boot takes seconds, and a fixed `waitForTimeout` captures a spinner instead
   of a screen. Logins: `mario.rossi` / `demo` (user), `staff.anna` / `demo`
   (user + staff).
2. Web build: `cd Frontend && npx expo start --web --port 8081`.
3. **There is no fake-data mode.** `EXPO_PUBLIC_DATI_FINTI` has zero hits in the
   tree; the mechanism was deleted on 2026-11-07 (`docs/decisions.md` D011).
   Captures use the real backend and must not modify a demo row.
4. **Browser: use the `browser` MCP server, not `playwright`.** The `playwright`
   server wants a Chrome binary that this machine does not have and fails at
   init; `browser` is the same package on the MS Edge channel and works.
5. Theme: the app resolves it from `localStorage['barattolo.tema']`
   (`chiaro` / `scuro` / `sistema`) at startup. `emulateMedia({colorScheme})`
   alone does not change it, and the captures will silently all come out dark.
6. Session: `localStorage['barattolo.token']` and `['barattolo.utente']`. A
   401 clears both; the login POST travels through the single-threaded PHP
   server, so poll for the token instead of waiting a fixed time.
7. **A capture needs two waits, not one.** The app renders, fetches, and renders
   again when the session resolves, so a screenshot taken after a single
   `networkidle` catches the second spinner. Wait for network idle twice, then
   assert that no loading line (`/Carico|Guardo/`) is on screen. A `waitForFunction`
   on body text alone passes before the app mounts, when the body is still
   empty — this cost three capture runs on 2026-11-11.
8. **The catalog and `/staff/users` are permission-scoped**: `mario.rossi` sees
   the catalog, a non-staff session gets 403 on the users list by design. Use
   `staff.anna` for the staff area.
9. Long capture scripts time out at the MCP tool boundary even though they keep
   running and finish writing files: check the file timestamps before re-running.

Gates before every commit: `cd Frontend && npx expo lint && npx tsc --noEmit`
(both clean at every commit so far; `tsc` gates syntax and imports only, per
`docs/decisions.md` D010). Commits of 2-3 files, conventional, English, docs in
the same commit.

---

## Cycle 2 — close the five, apply the one-per-type rule (2026-11-11)

Contract for this cycle: [`plan-brief.md`](plan-brief.md) § "Cycle 2". Class
**L**: 19 files touched, 7 of them new (counted in that brief, not guessed).
`Stile: lite`. One stop: this plan.

### What cycle 1 left, restated as facts read from the tree

- **F45/F84** `FilterBar.jsx` still has `label="Filtra"` (line 187) and a
  separate `Azzera filtri` button (line 249); the count lives only in the
  collapsed row (line 108), the typed-but-unapplied text exists in the hook as
  `filtri` vs `filtriApplicati` and is drawn nowhere.
- **F59** `edit-profile.jsx:238` folds `!photoLoadFailed` into `valid`, and the
  save button is `disabled={!dirty || !valid}` (line 455): one broken image
  blocks the whole form. `changes.immagineProfilo` (line 216) travels regardless.
- **F90** `login.jsx:76-100` owns a masthead (64 pt disc + title + tagline) and
  `register.jsx:341-347` owns a different one (title + one line). No shared file.
- **Profile sheet** `profile.jsx` draws five peer `Card`s (data, edit, session,
  staff, theme) plus an identity block outside them.
- **F61 unblocked, not blocked.** `Backend/src/Entity/StaffOperationLog.php:19`
  declares `ACTIONS` (8 values) and `:20` `TARGET_TYPES` (4). The client prints
  `operation.azione` raw (`staff.jsx:402`), and the normalizer passes the
  backend string through untouched (`api/normalizers.js`, `normalizeStaffOperations`).
  A label map built from those two constants is not a guess.
- **F73 answered by the contract.** `docs/api.md:48-51` documents
  `page`/`limit` for the catalog with a maximum `limit`; `staff.jsx:80-84` and
  `staff-users.jsx:106` ask for **one** page with a fixed `limit` (50 / 10) and
  never request page 2. The lists cannot queue today, so virtualisation has no
  subject: see block 9, which closes it as `N/A` with the condition rewritten.
- **F74 measurable.** `ServicesSection.jsx:72-76` renders a `FlatList` whose
  data comes from `services`, and a keystroke only sets `filtri` in
  `useServiceCatalog` (`cambiaTesto`, line 151) — no request. Block 9 measures
  the cost per keystroke; 16 ms is the frame budget and therefore the threshold.
- **F94 needs the console, nothing else.** Captured in block 9 with the
  `browser` MCP in the error state; attribution decides between `closed` (our
  handler) and `N/A` (upstream `react-native-web`, condition rewritten).
- **F72 is a decision, not an observation**: lock question 1.

### Part 2 — the product rule, as read off the code

`LIMITE_VOCI` is the only knob and it is client-side: `grep -rn "LIMITE_VOCI"
Backend/` returns nothing, so the backend enforces no cap today (neither did the
five). It is passed to three places that matter:

| Call site | What it is given | Does the cap see suspended voices? |
| --- | --- | --- |
| `EntriesSection.jsx:32` | the registration draft rows (`stato: null`) | yes by construction: a draft has no state |
| `PublicationsSection.jsx:86` | every published row of that type | **yes**: `(tabs)/offer-and-request.jsx:207-208` filters by `tipo` only, never by `stato`, so a `SOSPESA` row still occupies its place |
| `register.jsx:273` (`aggiungiAllaSezione`) | the registration list length | yes, same reason |

So "suspending does not free a place" already holds; block 2 keeps it that way
explicitly and the sentence stops promising otherwise.

---

### Blocks — cycle 2

- 0. Record the lock answers and close the cycle-1 "answered, not shipped" rows in the brief, then add this section's plan as the base commit | files: docs/briefs/ux-realignment/plan.md,docs/briefs/ux-realignment/plan-brief.md | done: `grep -c 'Stato: TODO'` lists only cycle-2 blocks and the brief carries the five lock answers with their verdict; commit `docs: freeze the closing cycle's plan and lock` | Stato: TODO
- 1. Product rule in its single source: `LIMITE_VOCI = 1`, `testoLimiteVoci` takes both substantives so it can say «1 offerta» / «1 ricerca», over-cap branch says how to get back to one, test derives from the constant and gains the over-cap case | files: Frontend/src/services/offer-request.js,Frontend/src/services/__tests__/offer-request.test.js | done: `cd Frontend && npx jest src/services/__tests__/offer-request.test.js` green including a singular assertion (`'Hai raggiunto il massimo di 1 offerta.'`), a `'1 di 1'` counter assertion and an over-cap sentence naming the count to remove; no existing assertion loosened; `npx expo lint` and `npx tsc --noEmit` green | Stato: TODO
- 2. Part 2 affordances: the add control disappears once the voice exists, `testoLimite` copies leave `EntriesSection`/`PublicationsSection` (the function's own sentence replaces them), the EntryEditor and `aggiungiVoce` comments stop saying "da 1 a LIMITE_VOCI" | files: Frontend/src/components/EntriesSection.jsx,Frontend/src/components/PublicationsSection.jsx,Frontend/src/components/EntryEditor.jsx | done: with one offer the sections render no add affordance (`pieno` branch), still print «1 di 1»; `grep -rn 'testoLimite' Frontend/src` matches only `offer-request.js`; `grep -rn 'da 1 a' Frontend/src` empty; gate green | Stato: TODO
- 3. Registration: with one voice per type the screen shows one editor and no «aggiungi un'altra», its own copy of the sentence follows the constant and its guard keeps blocking a second row | files: Frontend/src/app/(auth)/register.jsx | done: `grep -n 'Aggiungi un' 'Frontend/src/app/(auth)/register.jsx'` empty; the section copy comes from `offer-request.js` and not from a local template; gate green | Stato: TODO — runs inside lane 3 together with block 6, same file
- 4. F45+F84 in one commit: each control applies itself, «Filtra» becomes «Cerca» inside the field it governs, the typed-but-unapplied text becomes a chip «Cerca «testo»», the foot shows «N filtri attivi · Azzera» and the summary counts applied filters only | files: Frontend/src/components/FilterBar.jsx | done: `grep -rn "'Filtra'\|\"Filtra\"" Frontend/src` empty and no comment still describes the removed button; typing without Enter renders the chip while `contaFiltri(filtriApplicati)` does not move (verified in block 10's filters capture); `onApplica` still reached by the in-field control and by Enter; gate green | Stato: TODO
- 5. F59: a broken image URL blocks its own field only and offers «Rimuovi immagine»; name, surname, location and bio still save, and the broken URL never travels | files: Frontend/src/app/edit-profile.jsx | done: `photoLoadFailed` is out of `valid`, `changes` drops `immagineProfilo` while the preview fails, the remove action clears the field; manual check on the real 404 URL: name persists, image unchanged; gate green | Stato: TODO
- 6. F90: one auth shell — the same masthead, the same alignment, the login form centred instead of hung under the safe area | files: Frontend/src/components/AuthShell.jsx,Frontend/src/app/(auth)/login.jsx,Frontend/src/app/(auth)/register.jsx | done: `grep -rn 'Baratto-lo' Frontend/src` matches the shell only; both screens import it; login's form is vertically centred at 390; gate green | Stato: TODO
- 7. Profile becomes one sheet with bands: identity and settings divided by 1 px `t.border` rules instead of five peer cards, «Modifica profilo» stays the action, «Area staff» stays role-only, «Aspetto» and the session line become bands, «Esci» stays outside | files: Frontend/src/app/(tabs)/profile.jsx | done: one `Card` in the screen body (`grep -c '<Card'` = 1), no new literal value (only `space`, `radius`, `t.*`), staff row absent for `mario.rossi` and present for `staff.anna` in block 10's captures; gate green | Stato: TODO
- 8. F61: the operations log prints the backend's vocabulary in words, with the raw value as the fallback for an action that is not in the list | files: Frontend/src/app/staff.jsx | done: a label map for the 8 `ACTIONS` and 4 `TARGET_TYPES` of `Backend/src/Entity/StaffOperationLog.php:19-20` lives next to `REVIEW_LABELS`, unknown values print raw; checked on `staff.anna`'s log in block 10; gate green | Stato: TODO
- 9. Wave 3, verification only: F73 answered against `docs/api.md:48-51` + the fixed single-page `limit`; F74 measured with the browser MCP (MutationObserver mutations per keystroke and the longest task over 20 keystrokes at 390, threshold 16 ms); F94's console stack captured in the catalog error state and attributed | files: docs/audits/ux-remediation-2026-11-11.md | done: each of the three carries `closed` or `N/A` **with the measured number or the console frame** in the same row, and the rewritten condition when `N/A`; no `TODO` left anywhere in the file | Stato: TODO
- 10. Verification captures, `browser` MCP, two `networkidle` then assert no `/Carico|Guardo/`: home 390 light, offer-and-request 390 light (the cap shows here), profile 390, registration 390, filters open 390; theme from `localStorage['barattolo.tema']`, `mario.rossi`/`demo`, `staff.anna`/`demo` for block 8's check | files: docs/audits/screens-2026-11-11-final/ (new) | done: five PNGs plus a README pairing each with its `before` file from `screens-2026-11-11/`, the console line for each capture recorded, no demo row modified | Stato: TODO
- 11. Close: one changelog entry for cycle 2, every cycle-2 row in the remediation doc flipped with its commit, the cycle-1 "How to resume" rewritten to what is now true (four findings shipped, one borrow spent, wave 3 closed with its evidence) | files: docs/changelog.md,docs/audits/ux-remediation-2026-11-11.md,docs/briefs/ux-realignment/plan.md,docs/briefs/ux-realignment/plan-brief.md | done: `grep -rn 'massimo di 5\|LIMITE_VOCI = 5' Frontend/src docs` empty, `grep -c 'Stato: TODO'` in this file is 0, every block above has `DONE` or `N/A` with its condition | Stato: TODO
- 12. F72 — conditional on lock answer 1 | files: Frontend/src/components/PageHeader.jsx,Frontend/src/app/(tabs)/index.jsx,Frontend/src/app/(tabs)/agreements.jsx,Frontend/src/app/(tabs)/offer-and-request.jsx,Frontend/src/app/(tabs)/profile.jsx (only if the answer is "affordance now") | done: if the answer is "defer", this block closes `N/A` with the condition and the four screens rewritten in the remediation row and no code touched; if the answer is "now", the refresh action exists on all four pull-to-refresh screens and only on web | Stato: TODO — decision in the brief, lock 1

### Lanes — cycle 2

Shared base written by the parent **before** any lane and committed: block 1
(`offer-request.js` + its test), because blocks 2 and 3 read the new copy out of
it. Mode **(b)**: shared tree, disjoint files, git forbidden to children, the
parent commits. Before each commit `git diff --stat` must list exactly the files
the lane declared, or the lane is cut and the difference is reported.

| Lane | Blocks | Agent | Writes | Disjoint from |
| --- | --- | --- | --- | --- |
| 1 | 4 | `worker` | `components/FilterBar.jsx` | 2, 3, 4 |
| 2 | 5 | `worker` | `app/edit-profile.jsx` | 1, 3, 4 |
| 3 | 3 + 6 | `worker` | `components/AuthShell.jsx`, `app/(auth)/login.jsx`, `app/(auth)/register.jsx` | 1, 2, 4 |
| 4 | 7 | `worker` | `app/(tabs)/profile.jsx` | 1, 2, 3 |

Four lanes is above half the L ceiling of five, so they launch in **two calls of
two** (payload under 16 KB each), never as one call of four. Parent, sequential:
blocks 2, 8, 9, 10, 11, 12. Review: **one** `reviewer` on the whole cycle diff
with the three angles written into its task (correctness / security and data /
coherence with this brief), which is the fifth and last child of the budget.

Each lane's task carries the contract path (`docs/briefs/ux-realignment/plan.md`,
`plan-brief.md`), its allowed file list, the ban on git and on widening, and the
"contradiction stop": grep every symbol this plan names before the first edit
and report back instead of aliasing it.

### Gate, commits, and the one stop

Gate before every commit: `cd Frontend && npx expo lint && npx tsc --noEmit`,
plus `npx jest src/services/__tests__/offer-request.test.js` on blocks 1-3.
Commits of 2-3 files, conventional, English, docs in the same commit. Push only
to `andrea-frontend`, never `git add -A`, never `main`.

**The one stop is the approval of this plan.** Lanes, block order and the five
lock answers in the brief are fixed by it; nothing else asks for a word.

