# Brief — match empty-state copy (B1) + `Stato:` on §B

Contract for one cycle. Everything below is verified on the tree, not remembered.

## Objective

1. `Frontend/src/app/(tabs)/match.jsx:68-69` (`EMPTY_DESCRIPTION`) stops promising
   the automatic match in the present tense. Nothing consumes the `async`
   transport in the local stack (`docs/setup.md:107-110`: "Nothing consumes either
   inside the stack: queues created through `POST /api/create-service-queue` stay
   unmatched"; neighbour of `docs/backend-gaps.md:154` G12), so the sentence as it
   stands describes a runtime that does not exist.
2. `docs/audits/frontend-gap-analysis-2026-11-16.md` §B gets one `Stato:` field per
   item B1–B11 (today only B12 carries one), every `DONE` backed by a `path:line`
   re-checked in this cycle.

## Closed decisions (not reopened)

- **Copy only.** No worker in `Backend/compose.yaml`. The stack stays backend +
  database; the missing consumer is a backend/ops matter, not this task.
- **Wording is future tense, no condition clause.** Target string:
  `'Una coda è un servizio che metti in attesa: il match automatico confronterà le tue code con quelle della tua località. Creane una con i due pulsanti qui sotto.'`
  (proposal from Andrea; refined only for agreement, never reopened as a promise).
- `docs/audits/frontend-gap-analysis-2026-11-16.md` never states a closure that the
  tree does not show: `path:line` first, `Stato:` after.
- B9 stays `TODO` (ceiling 800 not exceeded: `api/normalizers.js` 749,
  `app/(tabs)/agreements.jsx` 649, `components/WebNavMenu.jsx` 600), with the
  deferral note "split al prossimo tocco".

## Verification already done on the tree (feeds step 2)

| Item | Evidence | Stato |
| --- | --- | --- |
| B1 | `match.jsx:68-69` current string; fixed by step 1 | DONE after step 1 |
| B2 | `ServiceDetailModal.jsx:34-37` docstring, `:245` mounts `UserServicesMiniCard` | DONE |
| B3 | `src/app/chat/[agreementId].jsx` exists (W1), `Screen.jsx` paragraph true | DONE |
| B4 | `docs/architecture.md:45` = `src/validation/ …` | DONE |
| B5 | `docs/frontend.md:138-159` = 32 suites, 346 tests, 95.71/90.86, eight hooks named | DONE |
| B6 | D026 (`docs/decisions.md:255`) + `match.jsx:32,62,225` English helpers, W9 commits | DONE |
| B7 | `components/AppErrorBoundary.jsx`, mounted `src/app/_layout.jsx:90,101` | DONE |
| B8 | W6 measurement: 112 KB minified / 41 KB gzip in `__common-*.js`, ~1 ms parse. Deliberate won't-do | N/A (see Q2) |
| B9 | sizes above, none over 800 | TODO + deferral note |
| B10 | `NotificationRow.jsx:88` `apribile`, `src/app/notifications.jsx:89` `onApri` | DONE |
| B11 | `QueueCard.jsx:101,170` `canOpen`/`onPress={onApri}`, `match.jsx:274` | DONE |
| B12 | `useNotifications.js:192-198` `catch (err)` + `__DEV__` warn. Already carries a `Stato:` | DONE (already written) |

## Lock questions (recommended answers — "approvato" accepts both)

1. **B12 vocabulary.** B12 reads `` `Stato: chiuso` (2026-11-17) `` while the cycle
   field is `TODO`/`DONE`/`N/A`. Recommended: **normalise it to `Stato: DONE`**, prose
   unchanged, so one `grep "Stato: DONE"` lists every closed §B item.
2. **B8 status.** It was closed as "not worth it", not implemented. Recommended:
   **`Stato: N/A`** with "(decisione: non si fa; la misura di W6 la motiva)" — `N/A`
   means "no action pending", `DONE` would claim work that deliberately did not
   happen.

## Success criteria

- `grep -n "confronta le code" Frontend/src docs` returns nothing.
- §B carries exactly 12 `Stato:` fields; each `DONE` names `path:line`; B9 is `TODO`
  with the deferral note.
- Gate green: `npx expo lint`, `npx tsc --noEmit`, `npx jest` (Frontend).
- One commit with copy + audit + changelog entry, pushed to `andrea-frontend`.

## Exclusions

- No change to `Backend/**` (read-only), no compose/worker edit.
- No other copy touched: `EmptyState.jsx:21` ("il match automatico non ce l'ha") and
  the `match.jsx` docblock (`:72-109`) stay as they are — they describe the tab, not
  the matchmaker's timing, and every sentence there is still true.
- No §A/§C/§D edits, no renaming, no refactor.
- Nothing pushed to `main`.

Stile: lite (three one-line edits plus a mechanical doc pass).

## How to resume

- Gate: `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest`.
- First command: `git status --porcelain`; `grep '| Stato: TODO' docs/briefs/match-empty-state-b1/plan.md`.
- Step 1 is a single string in `match.jsx:68-69`; its anchor is the text, and the
  line numbers in the audit (`:69`) are one off from the file's own (`:68-69`) —
  never edit by position.
- Step 2 needs no reading of §B bodies: the table above is the verified evidence;
  re-check a row only if `git log` moved since 2026-11-17.
- `Stato: N/A` on step 5 means no gate to run, never that a step was skipped.
- Do not reformat §B; append the `Stato:` line after the item's last paragraph.
- Push only after the gate, only to `andrea-frontend`.

## Plan

- 0. Commit this contract | files: docs/briefs/match-empty-state-b1/plan.md | done: `git log -1 --name-only` lists only the plan and `git status --porcelain` is empty | Stato: DONE
- 1. Rewrite `EMPTY_DESCRIPTION` in the future tense | files: Frontend/src/app/(tabs)/match.jsx | done: `match.jsx:68-69` reads "il match automatico confronterà le tue code con quelle della tua località", `grep "confronta le code" Frontend/src` empty | Stato: DONE
- 2. Append `Stato:` to B1–B11 in §B (B1 DONE citing `match.jsx:68-69`, B8 `N/A`, B9 `TODO` + deferral, B12 normalised per Q1) | files: docs/audits/frontend-gap-analysis-2026-11-16.md | done: `sed -n '/^## B\./,/^## C\./p' … \| grep -c "\`Stato:"` = 12 and each DONE carries a `path:line` | Stato: DONE
- 3. Changelog entry (newest first, after the `---`) | files: docs/changelog.md | done: entry dated 2026-11-17 names B1, the future tense, the §B statuses and the Docker decision left untouched | Stato: DONE
- 4. Gate, commit, push | files: — | done: lint + tsc + jest green, `git diff --stat` = the two files of steps 1-3, commit on `andrea-frontend`, `git status` clean after push | Stato: DONE

## Lanes:

- `single` — one writer (the parent). The three edits are one-liners whose only real
  content is already verified above; a subagent would spend more reading the audit
  than writing it, and step 2 depends on step 1 (B1's `DONE` cites the new string),
  so the files are not disjoint in the sense that matters. What is missing for a lane
  split: nothing independent — B1, B9's deferral note and the changelog all describe
  the same single change.
