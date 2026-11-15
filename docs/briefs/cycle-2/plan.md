# Piano — ciclo 2 (design debt, native parity, queues, agreement sheet)

Contract: [`scope.md`](scope.md). Style: `full`.
Branch: `andrea-frontend` (local `d3c6f95` + `756f63b`, tree clean, 0 behind
`origin/main`, 0 ahead of `origin/andrea-frontend` at plan time).
One state field only: `Stato:`.

## Brief

**Obiettivo.** Close the design debt the first cycle declared (three P1 + two
cheap P2 of [`../../audits/ux-audit-2026-11-15.md`](../../audits/ux-audit-2026-11-15.md)),
bring the native surface to the same level of *evidence* as the web, and use the
backend that already exists: service queues (create/cancel/list + credits as
copy), and the agreement sheet, which turns out to be callable without ids.

**Vincoli.** `AGENTS.md` scope (`Backend/**` read-only, Docker exception with a
changelog note); gate before every push (`npx expo lint`, `npx tsc --noEmit`,
`npx jest`); push only to `andrea-frontend`; docs in the same commit as the code
they document; no mobile claim without a proof.

**Decisioni chiuse (lock, recommended answers — confirmed or corrected before
code starts).**

1. **D is feasible, so it is built.** `POST /send-agreement-details` reads only
   `{agreementId, fromRemote, startDate, endDate}`
   (`Backend/src/Manager/AgreementManager.php:149-175`); `GET /get-agreements`
   carries `id` on the agreement and, per sheet row, `providerUsername` and
   `beneficiaryUsername` (`AgreementManager.php:60-70`). So "may I compile" and
   "may I confirm" are decidable from the row: no user id is guessed. G6 narrows
   to `serviceId` + counterpart id.
2. **B evidence**: both platform bundles + `expo-doctor` + a line-by-line read of
   every `Platform.OS` branch + Playwright-driven checks on the served web build
   (light and dark, the new surfaces included), run **once on the final tree**.
   The device checklist below is Andrea's; the block that depends on it is never
   closed `DONE` for the device half.
3. **C lives in the existing `match` tab** (`TAB_ROUTES` feeds both the native bar
   and the web menu; a sixth entry would have to be added in two places to stay
   identical, and the queue is what the matchmaker consumes).
4. **C guards creation locally**: the backend fatals (uncaught `TypeError`, not a
   `500` JSON) when the account has no published service of that type
   (`ServiceRepository::getUserServiceByType` returns `null`,
   `ServiceQueue::__construct` requires a `Service`), and `GET /get-queues`
   answers `404` when the list is empty (`if (!$queuesDTO)`). The UI gates on
   "you have a published service of this type" and reads `404` as empty; both
   facts become `G17`/`G18` in `backend-gaps.md`.
5. **A1 keeps both row actions** with `ConfirmModal` on delete (no overflow menu:
   smallest change, no new component, same pattern as `AgreementCard`).

**Criteri di successo.** (a) the five audit findings are gone, with a test or a
measured line each; (b) `expo export` iOS + Android and `expo-doctor` green on the
final tree with the result written down; (c) a queue can be created, listed and
cancelled from the app, and the credit cost is stated without inventing a
balance; (d) an accepted agreement can receive a sheet from the provider and be
confirmed by the beneficiary, or the reason it cannot is written down; (e) gate
green, docs updated, changelog entry, fresh-context review with a verdict.

**Esclusioni.** Chat UI, user-side report acceptance, backend fixes (recorded
only), renames and diffused refactors, bulk "mark all read" (no route), credit
balance (no route), matchmaker worker kept running (one dry consume only).

## Steps

- 1. Notification row: "Elimina" behind `ConfirmModal`, unread marked by the `primary` border plus a leading dot on `surface` instead of a `serviceBg` fill | files: Frontend/src/components/NotificationRow.jsx, Frontend/src/components/__tests__/NotificationRow.test.js | done: jest green with new cases (an unread row keeps `surface`; the delete callback fires only after the confirm; "No, torna indietro" leaves the row) | Stato: TODO
- 2. Mini-card: drop the service being read and cut every row to one line | files: Frontend/src/components/UserServicesMiniCard.jsx, Frontend/src/components/ServiceDetailModal.jsx, Frontend/src/components/__tests__/UserServicesMiniCard.test.js (nuovo) | done: exported pure helper returns the list without the open `(tipo, id)` pair and keeps a request that shares the numeric id; rows carry `numberOfLines={1}`; jest green | Stato: TODO
- 3. Cheap P2s: unread count as a `Chip` in the profile row; the refresh sentence said once | files: Frontend/src/app/(tabs)/profile.jsx, Frontend/src/app/notifications.jsx | done: profile row shows the count inside a `Chip` on `serviceBg`; the inbox footer paragraph is gone and the header keeps the only mention of the gesture; lint/tsc/jest green | Stato: TODO
- 4. B: native evidence on the final tree | files: docs/audits/native-parity-2026-11-15.md (nuovo) | done: `npx expo export --platform ios` and `--platform android` exit 0, `npx expo-doctor` 20/20, every `Platform.OS` branch listed with `file:line` and a verdict, Playwright pass on the served web build in light and dark (pull-to-refresh publication, tab bar absence, dark tokens on the three new surfaces, one capture each), device checklist reproduced in the doc | Stato: TODO
- 5. Shared base: normalisers for queue rows and for all sheet rows | files: Frontend/src/api/normalizers.js, Frontend/src/api/__tests__/queues.test.js (nuovo) | done: `normalizeQueues` tolerates a missing/null row, unknown enum values and a missing category; agreements expose `schede` (every row, normalised) and keep `scheda` for the first; jest green | Stato: TODO
- 6. Queue data layer: three calls, their Italian messages, the local gate helper | files: Frontend/src/api/areas/queues.js (nuovo), Frontend/src/services/queues.js (nuovo), Frontend/src/services/__tests__/queues.test.js (nuovo), Frontend/src/api/index.js | done: `404` on `get-queues` becomes an empty list, `400 {error:"Not enough credits"}` becomes its own Italian message and its own error kind, an unknown `queueType` never reaches the network; jest green | Stato: TODO
- 7. Match tab: the queue list with create/cancel and the honest credit copy | files: Frontend/src/app/(tabs)/match.jsx, Frontend/src/components/QueueCard.jsx (nuovo) | done: loading/empty/error states; create disabled with an explicit line when the account has no published service of that type; cost stated in words, no invented balance; cancel goes through `ConfirmModal`; lint/tsc/jest green | Stato: TODO
- 8. Agreement data layer: the two sheet calls and the role rules | files: Frontend/src/api/areas/agreements.js, Frontend/src/services/agreements.js, Frontend/src/services/__tests__/agreements.test.js | done: `sendAgreementDetails`/`acceptAgreementDetails` map `400/404/500` to Italian; `sheetRole(agreement, myUsername)` returns `provider`/`beneficiary`/`null` from the row, never from a guess; jest green | Stato: TODO
- 9. Agreement sheet UI: form for the provider, confirm for the beneficiary | files: Frontend/src/components/AgreementSheetForm.jsx (nuovo), Frontend/src/components/AgreementCard.jsx, Frontend/src/app/(tabs)/agreements.jsx | done: the form validates start < end before the call, shows in-flight and error states, and the card renders the sheet read-only when the side has no action; the accepted-agreement card is refreshed after the call; lint/tsc/jest green | Stato: TODO
- 10. Docs for what landed | files: docs/api.md, docs/backend-gaps.md, docs/setup.md, docs/changelog.md | done: queue UI and sheet calls documented, `G17`/`G18` added, `G6` narrowed to `serviceId` + counterpart id, scheduler/worker command verified, changelog entry for the cycle | Stato: TODO
- 11. Critique + audit of the new surfaces | files: docs/audits/ux-audit-cycle2-2026-11-15.md (nuovo) | done: findings with `file:line`, P0/P1/P2, live measurements on the web build; accepted P1s fixed in resume of this block or listed as open | Stato: TODO
- 12. Fresh-context review, then push | files: — | done: three angles (correctness / security+data / brief fit), P0/P1/P2 with `file:line`, merge verdict; gate green on the pushed commit | Stato: TODO

## Lanes

Shared files are touched by the parent first and committed as the base of every
lane: `Frontend/src/api/normalizers.js`, `Frontend/src/api/__tests__/queues.test.js`,
`docs/**`. Git is the parent's only.

- **lane-A (blocks 1-3)** — `Frontend/src/components/NotificationRow.jsx`,
  `Frontend/src/components/__tests__/NotificationRow.test.js`,
  `Frontend/src/components/UserServicesMiniCard.jsx`,
  `Frontend/src/components/ServiceDetailModal.jsx`,
  `Frontend/src/components/__tests__/UserServicesMiniCard.test.js`,
  `Frontend/src/app/(tabs)/profile.jsx`, `Frontend/src/app/notifications.jsx`.
- **lane-C (blocks 6-7)** — `Frontend/src/api/areas/queues.js`,
  `Frontend/src/services/queues.js`, `Frontend/src/services/__tests__/queues.test.js`,
  `Frontend/src/api/index.js`, `Frontend/src/app/(tabs)/match.jsx`,
  `Frontend/src/components/QueueCard.jsx`.
- **lane-D (blocks 8-9)** — `Frontend/src/api/areas/agreements.js`,
  `Frontend/src/services/agreements.js`,
  `Frontend/src/services/__tests__/agreements.test.js`,
  `Frontend/src/components/AgreementSheetForm.jsx`,
  `Frontend/src/components/AgreementCard.jsx`,
  `Frontend/src/app/(tabs)/agreements.jsx`.
- **parent only** — block 4 (B, read-only on `src`), block 5 (shared base),
  block 10 (docs), block 11 (critique), block 12 (review + push).

The three lanes are file-disjoint and depend only on block 5, so they run in the
shared tree with `git` forbidden to the children; the parent commits each lane
after `git diff --stat` matches the files the lane declared. Children: 3 workers
+ 2 reviewers = 5, inside the `L` ceiling.

## Device checklist (B5 — Andrea, one line per proof)

The agent cannot run these: no simulator and no device in this session. Each line
is a proof to execute, not a claim.

1. `npx expo start` in Expo Go 58.0.0, log in as `mario.rossi` / `demo`: the bottom
   bar shows the five tabs, none clipped, and the active tab is green.
2. Profile → Notifiche, pull down: the native spinner appears and the list comes
   back refreshed.
3. Profile, pull down: the profile data and the unread chip both move.
4. Stop the backend container, pull down on the inbox: a `Banner` appears and the
   rows already on screen stay.
5. Tap "Elimina" on a notification: the confirmation panel opens with the two
   buttons stacked; "No, torna indietro" leaves the row untouched.
6. Open a service from the catalog: "Cosa offre e cerca" shows one line per
   service and does not repeat the service you are reading.
7. Switch the system theme to dark while on the inbox: the card stays on `surface`
   and the unread marker reads as a `primary` border/dot, not a green fill.
8. Match tab: create an `OFFER` queue (free) and a `REQUEST` queue; the copy names
   the credit cost and never a balance figure.
9. Match tab with an account at zero credits: creating a `REQUEST` queue says
   "Crediti insufficienti…" with no number.
10. Match tab: cancel a queue: the row leaves the list and the success banner says
    which queue.
11. Agreements → In corso → accepted agreement: the provider sees the sheet form
    and submitting dates moves the card to "Scheda inviata"; the beneficiary sees
    "Conferma la scheda" and after confirming no button remains.
12. Safe area on a notched phone: the first card is below the notch and the last is
    above the home indicator.
13. Keyboard: in "Modifica profilo" tap the bio field: the field scrolls above the
    keyboard and is not covered.
