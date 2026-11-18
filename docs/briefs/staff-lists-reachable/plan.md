# Cycle 2 — Staff lists reachable (F5, C5, C7)

## How to resume

- Gate (hard): `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest`. Red gate, no commit.
- This file is the truth; the chat is not. `grep '| Stato: TODO' docs/briefs/staff-lists-reachable/plan.md` and start from the first `TODO` whose condition holds (`N/A` is not work).
- Working branch: `andrea-frontend`. Push only here, never `main`. `Backend/` is read-only.
- Trap: `docs/briefs/wiring-audit-2026-11-17/audit.md` §3.2 is the source of the three findings; its row 2 in §3.0 flips to `DONE` in the same commit that closes this cycle.
- Trap: the `paginazione` the API layer returns is `{pagina, limite, elementiTotali, pagineTotali}` (`normalizePagination`); `pageResponse` in `StaffController` already sends the *total* count, so `pagineTotali` is real.
- Trap: three lists in this cycle live on two screens; `src/app/staff.jsx` holds reports, operations and deleted services. One owner per file, never two children on it.
- Trap: `buildQuery` in `src/api/areas/staff.js` already forwards `page`/`limit`; no API change is needed anywhere in this cycle.
- First block: commit this file alone, then lane A and lane B in one `subagent({ tasks: [...] })` call.

## Brief

**Objective.** Every staff list can reach its whole result set, and its refresh re-reads
everything it shows.

**Constraints.** `Frontend/` writable, `Backend/` read-only. No backend parameter invented
(`role`, `reporterId`, `staffId` stay out). Structure in English, contract and UI copy in
Italian (D026). Every list keeps explicit loading / empty / error / load-more states. No
emoji. Existing patterns win: `StaffDeletedServicesSection` + `DELETED_PAGE_SIZE` already
paginate and are the reference, not a new invention.

**Closed decisions.** (the lock answers land here before block 0 is committed)

1. **Role pill stays local, and says so.** `GET /staff/users` has no `role` parameter
   (`StaffController::users` allows only `page`, `limit`, `q`, `accountStatus`), so the pill
   filters the rows that arrived. The empty state and the pill's helper line name that
   limit ("fra gli utenti caricati"), and a `role` server-side filter is recorded in
   `docs/backend-gaps.md` as a backend request instead of being faked on the client.
2. **One page size: 20 rows**, on users, reports and operations (deleted services already
   uses 20). The row count line reads "N di M" from `paginazione.elementiTotali` when the
   payload has it, and the button says how many rows the next page brings.
3. **One shared hook, `src/hooks/usePagedList.js`**, used by users, reports, operations and
   (after the refactor) deleted services: page/append/dedupe/stale-response/unmount rules
   live in one tested place instead of three copies in two screens.
4. **`docs/api.md` staff table corrected** in the same commit: `promote` has no body
   (`StaffController::promote` refuses one), `status` takes `{accountStatus}` not `{status}`
   — the two stale cells were read as truth by the next reader.

**Success criteria.** On `/staff-users` and `/staff`, a list with more rows than one page
offers "Carica altri 20", appends without repeating rows and stops when
`pagina >= pagineTotali`; pull-to-refresh and web "Aggiorna" reset to page 1 and re-read
every section on the screen, deleted services included; claiming, reviewing or restoring
reloads page 1; gate green; `npx jest` green; `docs/changelog.md` entry; audit §3.0 row 2
`DONE`.

**Exclusions.** Backend params and routes; server-side role filtering; F5's `getStaffUser`
(D9, cycle 1); sorting; infinite scroll; F3, F4.

## Steps

- 0. Commit this contract and the plan. | files: docs/briefs/staff-lists-reachable/plan.md | done: `git show --stat HEAD` lists only that file | Stato: TODO
- 1. Write `usePagedList` plus its test: `carica({page, limit})` returns `{righe, paginazione}`; the hook returns `{voci, paginazione, caricamento, caricamentoAltri, errore, ricarica, caricaAltri, haAltre}`; page 1 replaces, later pages append de-duplicated by a `chiave(row)` callback (default `row.id`); a response that arrives for a superseded request or after unmount writes nothing. | files: Frontend/src/hooks/usePagedList.js, Frontend/src/hooks/__tests__/usePagedList.test.js | done: `npx jest src/hooks/__tests__/usePagedList.test.js` green with a case for append-dedupe, one for stale-response, one for `haAltre` at the last page | Stato: TODO
- 2. Role-filter copy in the users service: one exported function returning the sentence that names the loaded rows, and `filterUsers` untouched. | files: Frontend/src/services/staff-users.js, Frontend/src/services/__tests__/staff-users.test.js | done: the test asserts the sentence differs for "role active" and "role + search active" | Stato: TODO
- 3. Lane A — `/staff` paginates reports and the operations log, and its refresh re-reads deleted services too. | files: Frontend/src/app/staff.jsx, Frontend/src/components/StaffOperationsLog.jsx | done: reports and operations both offer "Carica altri 20" while `pagina < pagineTotali`; `useRefresh` runs reports, operations and deleted page 1; `StaffOperationsLog` renders its own load-more without moving the screen's state | Stato: TODO
- 4. Lane B — `/staff-users` paginates users with the shared hook and wires the honest role copy. | files: Frontend/src/app/staff-users.jsx | done: "Carica altri 20" appends, the count line uses `elementiTotali`, the empty state uses the new copy, a filter or search change resets to page 1 | Stato: TODO
- 5. Docs close-out in one commit: changelog entry, `docs/backend-gaps.md` role-filter request, `docs/api.md` staff table, audit §3.0 row 2 to `DONE`. | files: docs/changelog.md, docs/backend-gaps.md, docs/api.md, docs/briefs/wiring-audit-2026-11-17/audit.md | done: `grep '| 2 — staff lists reachable' audit.md` shows `DONE`; changelog names F5, C5, C7 and the touched files | Stato: TODO

## Lanes

- **base (father, first, committed before any child runs):** `Frontend/src/hooks/usePagedList.js`,
  `Frontend/src/hooks/__tests__/usePagedList.test.js` — shared by both lanes.
- **lane A:** `Frontend/src/app/staff.jsx`, `Frontend/src/components/StaffOperationsLog.jsx`.
- **lane B:** `Frontend/src/app/staff-users.jsx`, `Frontend/src/services/staff-users.js`,
  `Frontend/src/services/__tests__/staff-users.test.js`.
- **shared:** the hook from the base block; `docs/**` and the audit row stay with the father.
- A and B are disjoint, share no symbol beyond the hook already committed, and each is longer
  than the merge + gate; shared tree, children do not touch git, the father commits.
