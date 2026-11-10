# Plan — UX score >= 8

Contract: [`plan-brief.md`](plan-brief.md) (objective, constraints, decisions,
success criteria, exclusions). Baseline: `docs/audits/ux-audit-2026-11-10.md`
(43 findings, score 3.6). Rubric and formula:
`docs/audits/PromptAuditUx.md`.

Class: **L** — ~45 files touched, 3 new. Children: 4 writers in parallel (one
writer per file set, no git in children) + 1 fresh-context reviewer, inside the
L cap of 5. `node_modules` is not duplicated: the lanes write disjoint file sets
in the same working tree, so no worktree and no second `npm install`.

## Blocks

- [ ] 0. Commit the pre-existing dirty tree in three logical commits so every block starts from a clean tree | files: docs/ux.md,docs/accessibility.md,docs/README.md,docs/frontend.md,docs/decisions.md,Frontend/src/app/(tabs)/agreements.jsx,docs/audits/** | done: `git status --short` empty before block 1; each commit passes `npx tsc --noEmit` in `Frontend/` | Stato: TODO

- [ ] 1. Foundation, written by the parent and committed as base for the lanes: ModalShell (new), AppIcon (new), app/+html (new), AppText roles and variants, AppButton disabled contrast, AppInput accessible name, client.js status map + network branch + shared fallback constant + session-expiry reason, Screen non-scrolling variant, tokens dark `primaryPressed` | files: Frontend/src/components/ModalShell.jsx,Frontend/src/components/AppIcon.jsx,Frontend/src/app/+html.jsx,Frontend/src/components/AppText.jsx,Frontend/src/components/AppButton.jsx,Frontend/src/components/AppInput.jsx,Frontend/src/api/client.js,Frontend/src/components/Screen.jsx,Frontend/src/theme/tokens.js | done: closes F14,F18,F20,F22(primitive),F24,F27,F30,F33(constant),F37(variants),F19(variant→role); gate green; commit `feat: add the shared UI primitives the audit asked for` | Stato: TODO

- [ ] 2. Lane A — session, copy and the staff/profile screens: 401 leaves the protected screen with the reason and keeps the draft, Italian status messages reach the UI, one fallback-error constant everywhere, backend and removed-swipe wording gone, role no longer the raw enum, staff search honest, staff list virtualised, staff vocabulary unified | files: Frontend/src/auth/auth-context.jsx,Frontend/src/app/_layout.jsx,Frontend/src/app/(auth)/login.jsx,Frontend/src/app/(auth)/register.jsx,Frontend/src/app/edit-profile.jsx,Frontend/src/app/report.jsx,Frontend/src/app/staff.jsx,Frontend/src/app/staff-users.jsx,Frontend/src/app/(tabs)/profile.jsx,Frontend/src/app/(tabs)/match.jsx,Frontend/src/hooks/useCategories.js,Frontend/src/services/staff-users.js | done: closes F02,F07(login/register/report),F11,F13(F31 copy half),F22,F26,F28,F29,F33,F34,F35,F39(profile),F42(staff),F15/F16(staff sheet); gate green | Stato: TODO

- [ ] 3. Lane B — modals, focus, targets, service detail: the new shell adopted by Confirmation, Category, List, ServiceDetail and the review sheet; proposal is the primary action and the close is a 44 pt X; a caption says what a proposal is; every sub-44 pt control lifted; selector clear rows; category search; sheet title distinct from the confirmation | files: Frontend/src/components/ServiceDetailModal.jsx,Frontend/src/components/ConfirmModal.jsx,Frontend/src/components/CategorySelector.jsx,Frontend/src/components/ListSelector.jsx,Frontend/src/components/ReportReviewSheet.jsx,Frontend/src/components/PillBar.jsx,Frontend/src/components/AppCheckbox.jsx,Frontend/src/components/StaffUserCard.jsx,Frontend/src/components/StaffReportCard.jsx,Frontend/src/components/EntryEditor.jsx | done: closes F05,F08,F09,F13,F15,F16,F17,F31(F41),F38; gate green | Stato: TODO

- [ ] 4. Lane C — home, filters, catalog, web nav: filter panel collapsed to a summary row, one polite live region for count and append, count header stops changing meaning, draft vs applied filters unified, catalog virtualised, card measure at desktop, decorative icons hidden, nav shows the active section | files: Frontend/src/app/(tabs)/index.jsx,Frontend/src/components/FilterBar.jsx,Frontend/src/components/ServicesSection.jsx,Frontend/src/components/ServiceCard.jsx,Frontend/src/components/EmptyState.jsx,Frontend/src/hooks/useServiceCatalog.js,Frontend/src/components/WebNavMenu.jsx | done: closes F05(FilterBar),F06,F10,F19(collections),F21,F22,F23,F32,F36,F39(EmptyState),F40,F42(catalog); gate green | Stato: TODO

- [ ] 5. Lane D — offer and request: swapping form asks before dropping typed text, the cap copy matches what the list shows, one primary per screen, the removed-swipe sentence gone, entry sections become lists | files: Frontend/src/app/(tabs)/offer-and-request.jsx,Frontend/src/components/EntriesSection.jsx,Frontend/src/components/PublicationsSection.jsx,Frontend/src/components/EntryCard.jsx,Frontend/src/components/EntryForm.jsx,Frontend/src/services/offer-request.js | done: closes F03,F04,F08(offer half),F19,F28(swipe),F07(entry form); gate green | Stato: TODO

- [ ] 6. Lane E, run by the parent while the lanes work: agreements tab — confirm before accept/refuse, success banner after every write, retry inside the bell panel, bell panel on the shared shell, unified "Chiudi" wording, 44 pt and token spacing, no fixed heights around text | files: Frontend/src/app/(tabs)/agreements.jsx,Frontend/src/hooks/useAgreements.js,Frontend/src/components/AgreementCard.jsx | done: closes F01,F12,F15,F16(bell),F23,F28(agreements),F31(agreements),F39,F43; gate green | Stato: TODO

- [ ] 7. Gate and fresh-context review: `expo lint`, `tsc --noEmit`, `jest`, then one reviewer child on correctness / security and data / brief coherence, P0-P2 with `file:line` and a merge verdict; accepted fixes applied in the same run | files: (whatever the review names) | done: gate green, zero P0, every P1 either fixed or recorded open in the re-audit | Stato: TODO

- [ ] 8. Commit the lanes as three atomic commits (session and copy / modals and targets / lists and filters), each green on its own | files: as in blocks 2-6 | done: `git status --short` empty, each commit checked out alone passes the gate | Stato: TODO

- [ ] 9. Re-measure with the rubric: new `docs/audits/ux-remediation-2026-11-10.md` with all 43 findings `closed`/`open`, the `file:line` evidence for each closed one, the five dimension scores and the weighted total recomputed with the `PromptAuditUx.md` formula, plus the "not verified" list | files: docs/audits/ux-remediation-2026-11-10.md | done: arithmetic printed and reproducible; total `>= 8.0` with no open sev3/sev4 | Stato: TODO

- [ ] 10. Docs in the same commit as the code they describe: `Status` tables in `docs/ux.md` and `docs/accessibility.md` replaced with measured values, `docs/changelog.md` top entry, `docs/decisions.md` record for the modal shell and the virtualisation, `docs/frontend.md` if a convention changed | files: docs/ux.md,docs/accessibility.md,docs/changelog.md,docs/decisions.md,docs/frontend.md | done: every claim in the tables points at a `file:line` or the re-audit; changelog entry names the score before and after | Stato: TODO

## Contradiction rule for every child

Before editing, verify with `grep`/`read` that **every** symbol and signature the
block names exists as named (`AppText` variants, `target.min`, `radius.pill`,
`ConfirmModal` props, `apiFetch` signature, `Screen` props, `useAgreements`
returns). A missing or differently-shaped symbol means **no edit**: report the
two lines to the parent. Aliasing a symbol to make the plan fit is the defect,
not the fix. Provenance of every contract named in a task is `PATH:line` when it
lives in the repo, `SPECIFICA DEL PADRE` when the parent wrote it; a field that
exists only in the parent's spec is not a contradiction.

## Lanes

| Lane | Files (disjoint) | Depends on | Shared |
| --- | --- | --- | --- |
| foundation (parent, block 1) | ModalShell.jsx(new), AppIcon.jsx(new), app/+html.jsx(new), AppText.jsx, AppButton.jsx, AppInput.jsx, api/client.js, Screen.jsx, tokens.js | — | yes — all lanes consume them, so this block is committed first |
| A — session/copy/staff | auth-context.jsx, _layout.jsx, (auth)/login.jsx, (auth)/register.jsx, edit-profile.jsx, report.jsx, staff.jsx, staff-users.jsx, (tabs)/profile.jsx, (tabs)/match.jsx, hooks/useCategories.js, services/staff-users.js | foundation | no |
| B — modals/targets/detail | ServiceDetailModal.jsx, ConfirmModal.jsx, CategorySelector.jsx, ListSelector.jsx, ReportReviewSheet.jsx, PillBar.jsx, AppCheckbox.jsx, StaffUserCard.jsx, StaffReportCard.jsx, EntryEditor.jsx | foundation | no |
| C — home/filters/lists/nav | (tabs)/index.jsx, FilterBar.jsx, ServicesSection.jsx, ServiceCard.jsx, EmptyState.jsx, hooks/useServiceCatalog.js, WebNavMenu.jsx | foundation | no |
| D — offer and request | (tabs)/offer-and-request.jsx, EntriesSection.jsx, PublicationsSection.jsx, EntryCard.jsx, EntryForm.jsx, services/offer-request.js | foundation | no |
| E — agreements (parent) | (tabs)/agreements.jsx, hooks/useAgreements.js, AgreementCard.jsx | foundation | no |

Parallelism: A, B, C, D launched in **one** `subagent({ tasks: [...] })` call
while the parent writes lane E. Merge cost: none (disjoint files, one tree, no
git from children; the parent commits). Not eligible for lanes: nothing in this
plan renames a symbol across files — if a lane needs one, it stops and asks.
