# Plan — Wiring conformance (cycle 1)

Contract: [`plan-brief.md`](plan-brief.md). Findings: [`../wiring-audit-2026-11-17/audit.md`](../wiring-audit-2026-11-17/audit.md)
§3.1. One status field per step: `Stato: TODO | DONE | N/A`.

## How to resume

1. `git status --porcelain` first: modified files are the work in progress of the
   last block, not garbage. Read them, continue, do not restart.
2. `grep '| Stato: TODO' docs/briefs/wiring-conformance/plan.md` (pipe matters:
   without it the pattern also hits `done:` criteria and this section).
3. Start from the first `TODO` whose condition holds. `N/A` is not work.
4. Do not replay `DONE` steps, do not renegotiate the brief: the chat is not a source.
5. Gate for every step: `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest`.
6. Environment traps: frontend runs on the host, no Docker needed for lint/tsc/jest.
   `npx expo lint` loads `.env.local` — that is normal, do not read it.
7. Block 0 (the commit of this plan) must exist before any child starts.
8. One writer per file. Children do not touch git in this cycle: the father commits.
9. Push only at closure, on `andrea-frontend`, tree clean and gate green.

## Steps

- 0. Commit the contract, the plan and the audit file it points at | files: docs/briefs/wiring-audit-2026-11-17/audit.md,docs/briefs/wiring-conformance/plan-brief.md,docs/briefs/wiring-conformance/plan.md | done: `git log -1 --stat` lists the three docs, `git status --porcelain` empty right after the commit | Stato: DONE
- 1. F1 — make the photo rule the backend's rule (https + URL shape + 2048, no extension), and remove the `isValid` export with its test block (step 7's validation half, so one owner holds the file) | files: Frontend/src/validation/index.js,Frontend/src/validation/__tests__/validation.test.js | done: `http://…/a.jpg` refused with the https sentence, `https://cdn.example/a` accepted, 2049 chars refused, `''` accepted; jest validation suite green | Stato: DONE
- 2. F2 — when the preview failed and the typed URL differs from the saved one, show why the Save button is disabled, next to the button; the 400 branch keeps its own local sentence | files: Frontend/src/app/edit-profile.jsx | done: a broken preview shows the reason beside "Salva modifiche" and "Rimuovi immagine" clears URL and flag; no new state, no import from the validation lane | Stato: DONE
- 3. C2 — "Segnala" disabled through the existing `haPersona` condition, with a one-line reason when there is no person | files: Frontend/src/components/ServiceDetailModal.jsx | done: `owner.id` not an integer ⇒ button disabled and the line under it says why; integer id ⇒ enabled and `onReport` still fires | Stato: DONE
- 3b. C2 parent — expected `N/A`; open only if step 3 needs the parent to change | files: Frontend/src/app/(tabs)/index.jsx | done: either no change (write `N/A`) or the parent's guard is the only reason the modal stays honest | Stato: N/A
- 4. D1/D9 + D4/D10 — remove `getStaffUser` and its re-export, and the three status arrays with no importer | files: Frontend/src/api/areas/staff.js,Frontend/src/api/index.js | done: `grep -rn "getStaffUser\|REPORT_STATUSES\|USER_STATUSES" Frontend/src` empty; `normalizeStaffUser` still used by promote/status; jest api suite green | Stato: DONE
- 5. D2 + D3 — drop the `errors.form` banner (and the now-unused `Banner` import); drop the `categories` prop and the `nomeCategoria([], id)` fallback | files: Frontend/src/components/ReportReviewSheet.jsx,Frontend/src/components/StaffDeletedServicesSection.jsx | done: no `errors.form` and no `categories` in the two files, imports trimmed, lint green | Stato: DONE
- 6. D8 — remove the `ADMIN` branch from the staff gate and from the profile role label, with the comment corrected, and update the test that asserted the removed branch | files: Frontend/src/services/staff.js,Frontend/src/app/(tabs)/profile.jsx,Frontend/src/services/__tests__/staff.test.js | done: `grep -rn "ADMIN"` on the two source files empty; the role test no longer expects `Admin` to pass; jest src/services green | Stato: DONE
- 7. D10 rest — remove `descriviVoce`, `rimuoviVoce`, `describeUser` (the `isValid` half is in step 1, same file as the rule) | files: Frontend/src/services/offer-request.js,Frontend/src/services/staff-users.js | done: `grep -rn "descriviVoce\|rimuoviVoce\|describeUser" Frontend/src` empty; jest green | Stato: DONE
- 8. Docs closure — `docs/api.md` states https-only with no extension requirement; changelog entry; row 1 of `audit.md` §3.0 flipped to `DONE` | files: docs/api.md,docs/changelog.md,docs/briefs/wiring-audit-2026-11-17/audit.md | done: the three files changed in one commit that also closes this plan, `git status --porcelain` clean after it | Stato: TODO
- 9. Gate + push on `andrea-frontend` | files: none | done: `npx expo lint` 0, `npx tsc --noEmit` 0, `npx jest` all green, push accepted on `andrea-frontend`, never on `main` | Stato: TODO

## Lanes:

All lanes are disjoint, none depends on another. The father commits; children never
touch git. Each lane is one `worker` per file group below, contract path passed, not
summarised.

- **lane A — rule (F1):** `Frontend/src/validation/index.js`, `Frontend/src/validation/__tests__/validation.test.js`
- **lane B — profile screen (F1 copy, F2):** `Frontend/src/app/edit-profile.jsx`
- **lane C — report guard (C2):** `Frontend/src/components/ServiceDetailModal.jsx` (`(tabs)/index.jsx` only if step 3b stops being `N/A`)
- **lane D — dead api surface (D1/D9, D4/D10):** `Frontend/src/api/areas/staff.js`, `Frontend/src/api/index.js`
- **lane E — dead staff components (D2, D3):** `Frontend/src/components/ReportReviewSheet.jsx`, `Frontend/src/components/StaffDeletedServicesSection.jsx`
- **lane F — role branch (D8):** `Frontend/src/services/staff.js`, `Frontend/src/app/(tabs)/profile.jsx`, `Frontend/src/services/__tests__/staff.test.js` (added mid-wave: the test asserted the removed `ADMIN` branch, and no other lane holds that file)
- **lane G — dead helpers (D10 rest):** `Frontend/src/services/offer-request.js`, `Frontend/src/services/staff-users.js`
- **shared (father, after the lanes):** `docs/api.md`, `docs/changelog.md`, `docs/briefs/wiring-audit-2026-11-17/audit.md`

No file is in two lanes: `validation/index.js` belongs to lane A alone, which is why
`isValid` (step 7's name) is deleted there and not in lane G.
