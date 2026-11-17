# Plan — residual mobile audit 360

Contract: [`plan-brief.md`](plan-brief.md). Worklist:
[`../../audits/ux-mobile-audit-2026-11-17-open-work.md`](../../audits/ux-mobile-audit-2026-11-17-open-work.md).
Record: [`../../audits/ux-mobile-audit-2026-11-17.md`](../../audits/ux-mobile-audit-2026-11-17.md).
Stile: `lite` (four small fixes and one docs entry; the minimum that solves).

## How to resume

- Branch `andrea-frontend`, base `bc94e08`. First command always:
  `git status --porcelain` — modified files are the work in progress of the last
  block, they are read and continued, not restarted.
- Gate, from `Frontend/`: `npx expo lint && npx tsc --noEmit && npx jest`.
- Re-measure harness (block 1): `Frontend` must run
  `npx expo export --platform web` with **nothing else writing**, then
  `npx expo serve dist --port 8083`; kill the process holding `:8083` first, it
  serves a pre-`667815a` bundle. Playwright lives in the npx cache:
  `NODE_PATH=C:/Users/Andrea/AppData/Local/npm-cache/_npx/41b79885fbdb2a18/node_modules`.
- Traps: screenshot device px = CSS × 3; Playwright's `iPhone SE` viewport is
  **320** wide (the file header still says 375 — the header is wrong, the
  descriptor is what runs); `fullPage: true` lies about `position: fixed`;
  the dev backend answers in 2–4 s, so a fixed wait measures the loader.
- Block 1 writes screenshots into a **new** directory
  (`audits/screens-mobile-2026-11-17-remisura/`): the committed captures are the
  record's evidence and are not overwritten.
- `@expo/ui/community/datetime-picker` renders `null` on web by design: the web
  branch is ours (`input[type=date]`), not a package feature.
- First block to run: block 2, unless block 1 has not produced a verdict.

## Steps

- 0. Commit the contract and this plan | files: docs/briefs/mobile-audit-residual/plan-brief.md,docs/briefs/mobile-audit-residual/plan.md | done: the commit exists on `andrea-frontend` and `git status --porcelain` is empty | Stato: DONE
- 1. Re-measure gate: stop the server on `:8083`, `npx expo export --platform web` on a clean tree, serve `dist`, run `docs/audits/scripts/audit-mobile-360.js` into a new output directory (the script takes `AUDIT_OUT`) | files: docs/audits/scripts/audit-mobile-360.js | done: `misure.json` under `docs/audits/screens-mobile-2026-11-17-remisura/` and one verdict per finding (F1, F2, F7, F9) backed by a number from it | Stato: DONE
- 2. Lane A — F4: `DateField` (native `@expo/ui` picker on press, `GG/MM/AAAA` on screen, `input[type=date]` on web), new pure helpers in `services/dates.js`, `AgreementSheet` wires the two fields | files: Frontend/src/services/dates.js,Frontend/src/components/DateField.jsx,Frontend/src/components/AgreementSheet.jsx,Frontend/src/services/__tests__/dates.test.js | done: `npx jest` green with boundary tests (ISO in, ISO out, no local-timezone day shift); pressing a field mounts the picker; the payload still carries `YYYY-MM-DD`; `periodoValido` still rejects an end before the start | Stato: DONE
- 3. Lane B1 — F2, plus the one line F1 needs where it actually breaks (both survive block 1; F1's offender is the `INPUT` inside `AppInput`, and `/register` fails with the same numbers, so the wrapper rows are not the fix) | files: Frontend/src/components/WebNavMenu.jsx,Frontend/src/components/AppInput.jsx | done: at 320 CSS px no element crosses the viewport on `/edit-profile` and `/register`; the refresh control measures at least 44×44 in both label states, nothing else in the bar moves | Stato: DONE
- 4. Lane B2 — F7 (F9 is **N/A**: withdrawn by block 1 — the same `/offro-e-cerco` screen with the same 8 controls shows `troncati: []` today against 4 truncations at audit time) | files: Frontend/src/components/StaffAreaGate.jsx | done: `/staff` with a non-staff account offers exactly one way back | Stato: DONE
- 5. F5 — new `G27` in `docs/backend-gaps.md`: what the notification payload does not carry and what the inbox cannot do until it does | files: docs/backend-gaps.md | done: `G27` sits after `G26`, names the missing field, the consequence for the reader, and the smallest backend change that closes it; zero frontend lines | Stato: DONE
- 6. Verdicts and changelog: one line per finding in the record (closed by <commit> / withdrawn with the number / open and why), the worklist closed row by row, one changelog entry for the session | files: docs/audits/ux-mobile-audit-2026-11-17.md,docs/audits/ux-mobile-audit-2026-11-17-open-work.md,docs/changelog.md | done: every id in the worklist has exactly one verdict and each verdict is committed with the change it describes | Stato: DONE
- 7. Gate and push | files: — | done: `npx expo lint && npx tsc --noEmit && npx jest` green from `Frontend/`, `git status --porcelain` empty, branch pushed to `andrea-frontend` | Stato: DONE

## Deviations from this plan, as it ran

- **F9 was closed `N/A`** by block 1: no change was made and none was needed.
- **F1's file moved** from `edit-profile.jsx` to `AppInput.jsx`, because the
  re-measure found the `INPUT` itself crossing the viewport and the same
  overflow on `/register`. The plan's step 3 says so.
- **Lane A was finished by the parent**: the worker wrote the helpers and the
  component and then hit its tool budget before wiring the sheet. The wiring and
  the boundary tests were done here rather than in a second run.
- **Block 6 cites the fix commits**; the record was written once all the fixes
  existed, so one document states all five verdicts instead of five fragments.

## Lanes

- **lane-0 (read-only, parent)** — block 1. Export, serve, harness run,
  verdicts. No source writes: it measures the tree as it stands.
- **lane-A (writer)** — block 2.
  `Frontend/src/services/dates.js`, `Frontend/src/components/DateField.jsx` (new),
  `Frontend/src/components/AgreementSheet.jsx`,
  `Frontend/src/services/__tests__/dates.test.js`.
- **lane-B (two writers, disjoint files)** — blocks 3 and 4.
  B1: `Frontend/src/components/WebNavMenu.jsx`, `Frontend/src/components/AppInput.jsx`.
  B2: `Frontend/src/components/StaffAreaGate.jsx`.
  `EntryCard.jsx` and `edit-profile.jsx` are out: F9 is withdrawn and F1's
  offender is the shared input.
  Neither lane may touch the other's files, and git is the parent's.
- **shared (parent, last)** — block 5 and 6: `docs/backend-gaps.md`,
  `docs/audits/ux-mobile-audit-2026-11-17.md`,
  `docs/audits/ux-mobile-audit-2026-11-17-open-work.md`, `docs/changelog.md`,
  and `docs/audits/scripts/audit-mobile-360.js` (the `AUDIT_OUT` override only).

## Lock

Answers already recommended, one line each; "approvato" accepts all five.

1. **F4 lives in a component** (`DateField.jsx`, Italian props) instead of inline
   in `AgreementSheet`? — Yes: two call sites in the same sheet, one boundary to
   test.
2. **F9, if it survives, is layout** (the two reversible commands wrap) rather
   than shorter labels? — Yes: the copy is the product's vocabulary and a copy
   change needs an Italian review.
3. **The re-measure looks at the same four findings, not the whole 51
   measurements** — the full harness on a clean tree, but the verdicts only for
   F1/F2/F7/F9? — Yes: the other dimensions came back clean and are not what
   this cycle changes.
4. **The worklist file is kept and closed**, not deleted? — Yes: it is the file
   that holds the re-measure numbers per finding; the record keeps the evidence.
5. **`@expo/ui` gets a `jest.mock` in the existing sheet test if jest cannot
   load the native module** — the component stays real, the test fakes the
   platform? — Yes: the alternative is a component that pretends to have a
   picker.
