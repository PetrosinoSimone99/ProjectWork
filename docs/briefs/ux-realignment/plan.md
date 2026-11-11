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
- [ ] 4. Implementation of the chosen direction (conditional, see Ramp-out) | files: Frontend/src/theme/tokens.js only if a role is genuinely missing, plus the files frozen in `direction.md`, drawn from the declared pool below, hard cap 8 | done: every touched screen passes `npx expo lint` and `npx tsc --noEmit`; diff contains no inline style that a token could express and no per-screen copy of a shared rule; commits of 2-3 files each | Stato: DONE — approved in chat 2026-11-11
- [ ] 4'. Mechanical-only fallback (only if block 2 finds zero directional findings) | files: exactly the files named by the mechanical rows of the remediation doc | done: every mechanical finding closed, each commit green on its own, remediation row flipped to `closed` in the same commit | Stato: TODO
- [ ] 5. Verification with Playwright on the real states (conditional: needs block 4 or 4' to have a visual effect) | files: docs/audits/screens-2026-11-11-after/ (new) | done: before/after on the same states and viewports, side by side, plus the browser console captured with no new RN-web warning introduced by the cycle | Stato: TODO
- [ ] 6. Close: changelog, remediation status per finding, `docs/DESIGN.md` derived from `tokens.js` | files: docs/changelog.md, docs/audits/ux-remediation-2026-11-11.md, docs/DESIGN.md (new) | done: changelog has one entry per block; every remediation row carries a final status; `docs/DESIGN.md` states roles and rules read out of `tokens.js` with no value restated and points at the file as the source of truth; `grep` for any hex or numeric token value inside `DESIGN.md` returns only pointers, not copies | Stato: TODO

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
| 4a | wave 1, the "loss and truth" rows: F44, F46, F49, F50, F54, F56, F57, F58, F60, F87, F91, F92 (12 closed; F61 to wave 3, F90 to 4b) | 19 | **DONE in six commits** |
| 4b | the direction of `direction.md`, nine files frozen there | 9 | TODO — needs a fresh context |
| 4c | the rest of wave 2 (F51, F52, F53, F70, F71, F83, F85) | 9 | TODO |
| 5 | before/after with Playwright | `screens-2026-11-11-after/` | TODO — waits for 4b/4c |
| 6 | changelog (written), remediation status (written), `docs/DESIGN.md` (new) | 3 | TODO — `DESIGN.md` waits for 4b |

Wave 3 stays deferred with its condition written in the remediation doc: F61
(needs the backend's action vocabulary), F72 (needs an affordance decision), F73
(needs the page contract), F74 (needs a measurement), F94 (blocked on the console
stack).

## How to resume (read this first)

State on disk, nothing else needed: blocks 0, 1, 2, 3 and 4a are committed;
the tree is clean apart from the untracked `.playwright-mcp/` (browser session
logs, never to be committed). Next action is **4b**.

Order of work: 4b (the direction, 9 files frozen in
[`direction.md`](direction.md)) → 4c (F51, F52, F53, F70, F71, F83, F85) → 5
(before/after captures in `docs/audits/screens-2026-11-11-after/`) → 6
(changelog already written, remediation §8 already written, `docs/DESIGN.md`
still to create, derived from `tokens.js`).

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

Gates before every commit: `cd Frontend && npx expo lint && npx tsc --noEmit`
(both clean at every commit so far; `tsc` gates syntax and imports only, per
`docs/decisions.md` D010). Commits of 2-3 files, conventional, English, docs in
the same commit.
