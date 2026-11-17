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
- 1. Re-measure gate: stop the server on `:8083`, `npx expo export --platform web` on a clean tree, serve `dist`, run `docs/audits/scripts/audit-mobile-360.js` into a new output directory (the script takes `AUDIT_OUT`) | files: docs/audits/scripts/audit-mobile-360.js | done: `misure.json` under `docs/audits/screens-mobile-2026-11-17-remisura/` and one verdict per finding (F1, F2, F7, F9) backed by a number from it | Stato: TODO
- 2. Lane A — F4: `DateField` (native `@expo/ui` picker on press, `GG/MM/AAAA` on screen, `input[type=date]` on web), new pure helpers in `services/dates.js`, `AgreementSheet` wires the two fields | files: Frontend/src/services/dates.js,Frontend/src/components/DateField.jsx,Frontend/src/components/AgreementSheet.jsx,Frontend/src/services/__tests__/dates.test.js | done: `npx jest` green with boundary tests (ISO in, ISO out, no local-timezone day shift); pressing a field mounts the picker; the payload still carries `YYYY-MM-DD`; `periodoValido` still rejects an end before the start | Stato: TODO
- 3. Lane B1 — F1 + F2 (only if each survives block 1) | files: Frontend/src/app/edit-profile.jsx,Frontend/src/components/WebNavMenu.jsx | done: at 320 CSS px no form input crosses the viewport; the refresh control measures at least 44×44 in both label states, nothing else in the bar moves | Stato: TODO
- 4. Lane B2 — F7 + F9 (only if each survives block 1) | files: Frontend/src/components/StaffAreaGate.jsx,Frontend/src/components/EntryCard.jsx | done: `/staff` with a non-staff account offers exactly one way back; the entry-card action labels are complete at 320 px, targets still ≥44 pt | Stato: TODO
- 5. F5 — new `G27` in `docs/backend-gaps.md`: what the notification payload does not carry and what the inbox cannot do until it does | files: docs/backend-gaps.md | done: `G27` sits after `G26`, names the missing field, the consequence for the reader, and the smallest backend change that closes it; zero frontend lines | Stato: TODO
- 6. Verdicts and changelog: one line per finding in the record (closed by <commit> / withdrawn with the number / open and why), the worklist closed row by row, one changelog entry for the session | files: docs/audits/ux-mobile-audit-2026-11-17.md,docs/audits/ux-mobile-audit-2026-11-17-open-work.md,docs/changelog.md | done: every id in the worklist has exactly one verdict and each verdict is committed with the change it describes | Stato: TODO
- 7. Gate and push | files: — | done: `npx expo lint && npx tsc --noEmit && npx jest` green from `Frontend/`, `git status --porcelain` empty, branch pushed to `andrea-frontend` | Stato: TODO

## Lanes

- **lane-0 (read-only, parent)** — block 1. Export, serve, harness run,
  verdicts. No source writes: it measures the tree as it stands.
- **lane-A (writer)** — block 2.
  `Frontend/src/services/dates.js`, `Frontend/src/components/DateField.jsx` (new),
  `Frontend/src/components/AgreementSheet.jsx`,
  `Frontend/src/services/__tests__/dates.test.js`.
- **lane-B (two writers, disjoint files)** — blocks 3 and 4.
  B1: `Frontend/src/app/edit-profile.jsx`, `Frontend/src/components/WebNavMenu.jsx`.
  B2: `Frontend/src/components/StaffAreaGate.jsx`, `Frontend/src/components/EntryCard.jsx`.
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
