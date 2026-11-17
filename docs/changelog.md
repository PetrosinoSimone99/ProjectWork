# Changelog

Session log of project-level changes that affect how the codebase is built,
run, or understood. Newest first. Each entry says what changed, why, and the
documents/code touched.

---

## 2026-11-17 — The match empty state stops promising a match that never runs

Session start: `git fetch origin`. `andrea-frontend` was **0 ahead, 0 behind**
`origin/andrea-frontend`; 323 ahead of `origin/main`, 0 behind. Working tree clean.
No merge needed, nothing pushed to `main`.

### Why

The Match tab's empty state said, in the present tense, that the automatic match
compares queues. Nothing consumes the `async` transport in the local stack
(`docs/setup.md:107-110`), so a queue created from that tab never produces a
match: the sentence promised behaviour the stack does not perform.

### What changed

- `Frontend/src/app/(tabs)/match.jsx:68-69` — `EMPTY_DESCRIPTION` now reads «il
  match automatico **confronterà** le tue code con quelle della tua località»:
  future tense, no claim about the runtime. Copy only. No worker was added to the
  stack and `Backend/compose.yaml` is untouched — that decision was taken and not
  reopened here.
- [`audits/frontend-gap-analysis-2026-11-16.md`](audits/frontend-gap-analysis-2026-11-16.md)
  §B — every item now carries one `Stato:` field: B1–B7 and B10–B12 are `DONE`,
  each with the `path:line` re-checked in this session (B1 is DONE because of the
  copy above); B8 is `N/A`, closed as not worth it on W6's measurement; B9 stays
  `TODO` with the deferral note, since no ceiling is broken
  (`api/normalizers.js` 749, `app/(tabs)/agreements.jsx` 649,
  `components/WebNavMenu.jsx` 600 against the 800 ceiling). B12's `Stato: chiuso`
  became `Stato: DONE` so the field reads one way. §C keeps its older
  `Stato: chiuso` wording: it was outside this cycle and renaming it is not a doc
  fix this entry claims.
- Contract and plan:
  [`briefs/match-empty-state-b1/plan.md`](briefs/match-empty-state-b1/plan.md).

### Touched

`Frontend/src/app/(tabs)/match.jsx`, `docs/audits/frontend-gap-analysis-2026-11-16.md`,
`docs/briefs/match-empty-state-b1/plan.md`, `docs/changelog.md`.

---

## 2026-11-17 — API authorization probe: two confirmed chat IDORs

Session start: `git fetch origin`. `andrea-frontend` was **0 ahead, 0 behind**
`origin/andrea-frontend`; 322 ahead of `origin/main`, 0 behind. Working tree clean.
No merge needed, nothing pushed to `main`.

### Why

The question was whether an offensive skill bundle was worth installing to test
whether the app is safe. It was not, but the question surfaced a real gap: nobody
had ever probed the API's authorization from a second account. Two `curl`
accounts were enough.

### What was found

[`audits/api-authz-2026-11-17.md`](audits/api-authz-2026-11-17.md) records six
findings, all reproduced against the running stack or cited to `path:line`:

- **A1** `GET /chats/agreement/{id}` has no participant check — any logged-in
  account reads any conversation and can even trigger its creation.
- **A2** `POST /chats/send-message/{chatId}` has no participant check — any
  account writes into any chat and the victim gets a `CHAT_MESSAGE`
  notification. Reproduced end to end, then the test row and its notification
  were deleted, so the seed is back to its committed state.
- **A3** an unknown `agreementId` returns `500` with the exception text, because
  `getAgreementById` is dereferenced without a null check and the controller
  appends `$e->getMessage()` to the body.
- **A4** `POST /cancel-queue/{id}` on another account's queue returns `200` and
  changes nothing — this is `backend-gaps.md` G21, confirmed, no new request.
- **A5** `POST /auth/login` has no rate limit: 15 failures in a row cost nothing
  and the next correct password succeeds. No `rate_limiter` key exists in
  `Backend/config/**`.
- **A6** `POST /send-agreement-details` never calls `isParticipant`, so a stranger
  reaching an `ACCEPTED` agreement by id gets a `500` instead of a `404`
  (`AgreementManager.php:149`). Source-read, not reproduced: the seed's only
  agreement is `PENDING`.

The rest of the id-taking surface was probed and holds: notifications, offers,
requests, staff routes and the agreement response/accept paths all answer
`404`/`403` across accounts and leave the data unchanged, login does not
enumerate users, and registration enforces 8-char passwords. The full table is in
the audit. The pattern is consistent: newer controllers resolve the row through
the viewer, and only the older `ChatManager` loads by id and never asks who is
calling.

### What was touched

`docs/audits/api-authz-2026-11-17.md` (new) and this entry. No product code: the
defects are in `Backend/`, which is read-only here, so the audit closes with four
proposals for the backend maintainer rather than a patch. No frontend change is
needed either — the app already calls these endpoints correctly; it is the server
that does not check who is asking.

### Environment note

The API answers on `127.0.0.1:8000` but not on `localhost:8000` on this host
(`curl` exit 7), while the commands in [`setup.md`](setup.md) use `localhost`.
Recorded in the audit; `setup.md` was left alone because the failure looks
machine-specific (IPv6 resolution), not a defect in the documented stack.

## 2026-11-17 — W8: the documents describe the tree that exists

Session start: `git fetch origin`. `andrea-frontend` was **0 ahead, 0 behind**
`origin/andrea-frontend`; 318 ahead of `origin/main`, 0 behind. Working tree clean.
No merge needed, nothing pushed to `main`. Plan:
[`briefs/w8-docs/plan.md`](briefs/w8-docs/plan.md).

### Why

W8 was the last open work item of
[`audits/frontend-gap-analysis-2026-11-16.md`](audits/frontend-gap-analysis-2026-11-16.md),
and the only kind of item that rots while it waits: three facts it named had moved.
`docs/frontend.md` still promised "99% statements / 80% branches" on "the two
modules" of `collectCoverageFrom`, a sample the JSON had already widened to five
files and a figure the W7 hooks had already changed. `docs/ui-triage.md` opened
its correction by saying `AGENTS.md` documents `EXPO_PUBLIC_DATI_FINTI`, which the
root rules stopped saying in D011. And the item's own edit list was stale — F3 was
`closed 2026-11-16 (W1)`, and B2's docstring had been fixed by W3 — so two of its
five points were "verify", not "edit".

### What landed

1. **`docs/architecture.md` — two phantoms, not one.** `src/agreements/` did not
exist (the rules live in `services/agreements.js`) and is replaced by
`src/validation/`, a directory the tree does have and the tree did not list. The
same block also carried `src/Subscriber/`, which is `src/EventSubscriber/`: no
audit finding, found by checking every path in the block against the tree.
2. **`docs/frontend.md` — the real coverage story.** 32 suites, 346 tests, all
green; the five files `collectCoverageFrom` names, with the measured per-file
numbers; **95.71% statements / 90.86% branches** on that sample, stated as a
hand-picked sample rather than a claim about the tree; and the eight hooks with no
suite of their own (`useCategories`, `useDocumentTitle`, `useReducedMotion`,
`useRefresh`, `useSessionExpiry`, `useUserServices`, `useWebColorScheme`,
`web-chrome`), plus the two that have one but sit outside the sample (`useChat`,
`useNotifications`). `npx jest` stays outside the gate (D019).
3. **`docs/ui-triage.md` — the correction is now history.** The section says the
variable never existed, remains true on D011 and `setup.md`, records that
`AGENTS.md:130` now says the same, and dates the closure to W8; the paragraph that
accused the repo rules of being false is gone. The demo users and the Docker note
are untouched.
4. **The audit, closed.** W8 is `Stato: chiuso` with what landed; B2, B4 and B5
carry their closure lines; §E's row 4 (W3, done 2026-11-16 but still unmarked) and
row 9 are corrected. Every `W` item of that audit is now closed or `N/A`. What
remains are the backend gaps in §D and the unmeasured hypotheses (F1/H1, H2, H3),
which need a browser at four widths before they become work.

No file under `Frontend/src/` changed: two of the item's five points were
docstrings already corrected by other items, and the third was a `ui-triage` row
already closed by W1. No test was added, relaxed or skipped.

### Verification

Gate green: `npx expo lint`, `npx tsc --noEmit`. `npx jest --coverage` run before
the edits to obtain the numbers quoted above: 32 suites / 346 tests green,
95.71% statements and 90.86% branches on the sample. Nothing to verify at runtime —
the change is prose about measurable facts, and each claim in it was produced by a
command in this session (`ls`, `grep`, `npx jest --coverage`).

### Touched

`docs/briefs/w8-docs/plan.md`, `docs/architecture.md`, `docs/frontend.md`,
`docs/ui-triage.md`, `docs/audits/frontend-gap-analysis-2026-11-16.md`,
`docs/changelog.md`. Three commits: plan, the three documents, the closure.

## 2026-11-17 — W9: the naming rule now describes the tree

Session start: `git fetch origin`. `andrea-frontend` was **1 ahead, 0 behind**
`origin/andrea-frontend`; 313 ahead of `origin/main`, 0 behind. No merge needed,
nothing pushed to `main`. Plan: [`briefs/w9-naming/plan.md`](briefs/w9-naming/plan.md).

### Why

Audit B6 (`docs/audits/frontend-gap-analysis-2026-11-16.md:132`) said the newest
code is Italian against `AGENTS.md` ("all new code is written in English") and
offered two exits: rename the files, or amend the rule. Measuring first changed
the item. The object-returning hooks are Italian from their first commit, the
row props of `ServiceCard`, `AgreementCard`, `NotificationRow` and `EntryCard` are
Italian, and `api/normalizers.js:10-12` documents the Italian UI shape as the
single contract every screen reads: renaming the four files the item named would
have forked six conventions the rest of the tree shares. B6 also carried two wrong
facts — `match.jsx` is from 2026-11-07 and `QueueCard.jsx` from 2026-11-15, not
2026-11-16, and `GATE_NEED_ONE` is English.

### What landed

1. **D026 — two layers, one vocabulary.** Structure is English (files, routes,
   exports, helpers, constants, flags); the internal contract is Italian, one word
   per concept at every layer it crosses (normalised shape, hook return objects,
   row/state/action props); no sweeps — D013's rename-on-next-touch is unchanged.
2. **`docs/frontend.md:16-53`** rewrote the code-language bullets and the naming
   section on those two layers; **`AGENTS.md`** (Code language, plus the "Code
   style" line that still said English-only) says the same.
3. **The helpers that really were inconsistent are English now**: `refundsCredit`
   and `activeQueue` in `match.jsx` (the second was `codaAttiva`),
   `cancelConfirmMessage`, `canOpen`, `openLabel` and `infoBlock` in
   `QueueCard.jsx`, the five Italian locals left in `match.jsx` (`quanti` →
   `count`, `voce` → `typeWord`, `esitoCode`/`esitoServizi` →
   `outcomeQueues`/`outcomeServices`, `guasto` → `failure`), plus the test helpers
   of the two touched suites only (`press`, `button`, `node`, `renderedButtons`,
   `renderCard`, `openable`, `OPEN_LABEL_PREFIX`, `QUEUE`, `ACTIVE_QUEUE`,
   `OFFER_SERVICE`, `REQUEST_SERVICE`). The same words survive on purpose in
   `NotificationRow`, `AgreementSheet.test` and `MessageComposer.test`, outside
   this item.
4. **Props deliberately not renamed.** `coda`, `occupata`, `onAnnulla` and
   `onApri` are the words the other cards already use, and the hooks keep their
   Italian return objects: D026 makes them the contract, so renaming one card's
   copy of them is the fork to avoid, not the fix. Declared leftovers that stay:
   `actionError` (`useAgreements`), `refreshing`/`onRefresh` (`useRefresh`, also
   surfaced by `useServiceCatalog`), and `hasActiveQueue(code)` in `services/` —
   which is why the rule says *data* hooks and not *every* hook.
5. **The audit document corrected**: the B6 dates and the closing line that put
   `npx jest` in the gate (D019 keeps it outside; jest verifies a change).

### Verification

`npx expo lint` and `npx tsc --noEmit` green. `npx jest` green on the two touched
suites (3 tests in `QueueCard`, 5 in `match`) and 346 green in the whole suite, no
assertion changed and no test added: the existing ones pin every renamed symbol.
No user copy touched — the renames never reached a string. Three read-only review
angles (correctness, data and claims, coherence with the brief) found no P0; their
P1/P2 were documentation statements this entry and D026 had overstated (the hook
quantifier, `useRefresh`, the alias rule) plus the five locals above, all fixed
before the push.

## 2026-11-17 — W7: the two stateful hooks and the match gate have tests

Session start: `git fetch origin`. `andrea-frontend` was **0 ahead, 0 behind**
`origin/andrea-frontend`; 304 ahead of `origin/main`, 0 behind. No merge needed,
nothing pushed to `main`. Plan:
[`briefs/w7-hook-tests/plan.md`](briefs/w7-hook-tests/plan.md).

### Why

Audit W7 (`docs/audits/frontend-gap-analysis-2026-11-16.md:500`) named
`useAgreements` and `useServiceCatalog` as the frontend's two state machines and
noted that neither had a test: the rules they claim in their own docstrings — a
stale response never overwrites a newer one, a failed reload keeps what is on
screen, an action is single-flight — were enforced by nobody. `match.jsx` carried
the whole create-queue gate (one service of the type, no active queue, nothing in
flight) with no test either.

### What landed

1. **Two hook test files, 21 tests** (`src/hooks/__tests__/`): the stale-response
drop, the response in flight dropped on blur, the failed reload that keeps the
rows, the busy slot that names the agreement, the reload and the sentence after
an action, the action failure that lands in `actionError` and leaves the list
alone, the retry that repeats the request that failed, append-in-copy for «Carica
altri», the province that clears the comune, the focus reload that skips itself
while filters are applied.
2. **A screen test for `match.jsx`, 5 tests**: zero services of the type, more
than one, an active queue that closes both buttons, and a second create that
never starts while the first is in flight. It renders the real screen with
`useAuth`, `expo-router`, `@/api` and `react-native-safe-area-context` mocked —
no production file changed.
3. **Coverage that names what it measures** (`Frontend/package.json:55-61`):
`collectCoverageFrom` gained `useAgreements.js` and `useServiceCatalog.js`, the
two files W7 tests. Measured: **0% → 95.16%** and **0% → 90.69%** statements.
The folder-wide `src/hooks/**` was rejected on purpose: 80% there needs tests on
eight hooks this cycle did not touch, so the number would be decoration.
4. **`Frontend/.gitignore`** gained `coverage/`: `npx jest --coverage` writes its
HTML report there and the tree stopped being clean after every measurement.

Gate at close: `npx expo lint` clean, `npx tsc --noEmit` clean, `npx jest`
**32 suites / 346 tests green** (from 29 / 320).

### Review, and the seven findings it produced

Three fresh-context angles (correctness, data and security, coherence with the
plan) all returned `MERGE` with no P0/P1; every finding was P2 and about the
tests or the documents, none about production code. Applied: the catalog fixture
used `mansione`, a field `normalizeCatalogOffer` never emits, so it now uses
`descrizione`; the `expo-router` mock in both hook files accumulated the focus
callbacks of previous mounts, and `tornaInFocus` fired the dead one silently, so
both `beforeEach` blocks now clear the list; the missing half of rule 1 in
`useAgreements` («leaving the tab invalidates the response in flight») got its
own test, which fails if the cleanup loses either the sequence bump or the
spinner switch-off; and `expect(classificati).not.toBeNull()` became the concrete
section it should have asserted. The rest were numbers: the audit said "nine"
files without tests where the folder holds eight, and this entry was missing its
last commit.

### Residuals this session found and did not fix

`useAgreements.eseguiAzione` (`useAgreements.js:97`) has no internal
single-flight guard: it writes `azioneInCorso` without checking whether it is
already set, so the "one action at a time" rule is enforced only by the disabled
buttons in `agreements.jsx:178,554`. `match.jsx:170` does carry the guard. Adding
it to the hook is a behaviour change on two fast taps, so it belongs to an item
that can decide that on purpose. `useNotifications.js` stays at 37% statements
(the poll is tested, the list hook is not), and the coverage sentence in
`docs/frontend.md:120-126` is still wrong — that is W8's B5.

Branches no test names, all outside the criteria W7 declared: `azzeraTesto`,
`congedaEsito`, the `cambiaScelta('comune')` guard that ignores a comune with no
province applied, and the `cancel` path of `match.jsx` (including the credit
refund sentence). A regression there produces no red. One contradiction the
fixtures could not settle from the frontend alone: `services/agreements.js:15-16`
documents `PENDING` + my `true` answer as the `sent` bucket, while
`api/areas/agreements.js:104-106` says one answer already moves the agreement to
`ACCEPTED`/`REFUSED`. Both cannot hold with real data, and which one is wrong is
a backend fact, not a testing one.

### Commits

`2f35741` plan · `2db7613` tests · `ce4fad4` coverage · `692ae04` gitignore ·
the review fixes and this entry in the closing commit.

---

## 2026-11-17 — W10: the profile badge asks again on its own

Session start: `git fetch origin`. `andrea-frontend` was **0 ahead, 0 behind**
`origin/andrea-frontend`; 299 ahead of `origin/main`, 0 behind. No merge needed,
nothing pushed to `main`.

### Why

Audit W10 (`docs/audits/frontend-gap-analysis-2026-11-16.md:546`) said the unread
row in the profile was true only at the instant the screen opened: `useUnreadCount`
read the count on focus and on pull-to-refresh, then never again, so a
notification written by another device stayed invisible until the user changed
tab. The audit classed the item `S`; it became `M` because its own `Done` line
asks for a fake-timer assertion and `hooks/useNotifications.js` had no test file,
so the work created one. Plan:
[`briefs/w10-unread-polling/plan.md`](briefs/w10-unread-polling/plan.md).

### What landed

1. **The poll** (`9d0d7e2`): `useUnreadCount` exports `UNREAD_POLL_MS = 30000`
   and creates its interval inside `useFocusEffect`, so a blur clears it. A tick
   returns early when `AppState.currentState` is not `'active'`; a `change`
   listener on the same effect reads once on the `'active'` transition, so coming
   back to the foreground does not wait a whole interval. `Frontend/src` had zero
   `AppState` hits before this, so there was no helper to reuse.
2. **The B12 log** (`9d0d7e2`): the failure path is `catch (err)`, still leaves
   the row neutral (`null`), and warns `[notifiche] conteggio non lette non
   riuscito` under `__DEV__`, the shape `api/client.js:120-122` already uses.
3. **Five tests** (`src/hooks/__tests__/useNotifications.test.js`): the badge
   moves after one interval, the foreground return reads at once, a backgrounded
   app sends nothing, blur stops the timer, a failed count warns and stays
   neutral. Harness borrowed from `useChat.test.js` (react-test-renderer, fake
   timers, mocked `useFocusEffect`).

### What did not change, and why

`profile.jsx` was left alone: its copy (`:290-291`) never promised a live row, so
"if the copy needs to say it polls" resolved to nothing. The inbox needed no work
either — it uses `useNotifications`, so "no polling on the inbox screen" was
already true by construction, and that hook is untouched. No backend call was
added: the poll reuses `getNotifications(token, { limit: 1 })`.

### Touched

`Frontend/src/hooks/useNotifications.js`,
`Frontend/src/hooks/__tests__/useNotifications.test.js` (new), `docs/api.md`,
`docs/audits/frontend-gap-analysis-2026-11-16.md`, `docs/changelog.md`,
`docs/briefs/w10-unread-polling/plan.md` (new).

Gate: `npx expo lint`, `npx tsc --noEmit`, `npx jest` (29 suites, 320 tests)
green before the push.

---

## 2026-11-17 — W4: the staff area drives the four endpoints it promised

Session start: `git fetch origin`. `andrea-frontend` was **0 ahead, 0 behind**
`origin/andrea-frontend`; 292 ahead of `origin/main`, 0 behind. No merge needed,
nothing pushed to `main`.

### Why

Audit W4 (`docs/audits/frontend-gap-analysis-2026-11-16.md:375`) and
`docs/api.md:211-216` both claimed the staff area was complete. It was not: a
grep for `staff/services`, `getStaffReport` and `getStaffOperation` in
`Frontend/src` returned nothing, so four documented endpoints — the deleted
services of every user, their restore, one report, one log entry — had no
caller. The screen showed the report list and a read-only log and stopped
there.

### What landed

1. **The four calls** (`d7046c5`): `listStaffDeletedServices`,
   `restoreStaffService`, `getStaffReport`, `getStaffOperation`, with
   `normalizeStaffDeletedServices` (a service plus `proprietario` and
   `categoriaNome`) and `normalizeStaffOperation` (`before`/`after`, `null` when
   the entry has none). Non-staff was already handled by `StaffAreaGate` and
the mapped `403`; that was verified, not rebuilt.
2. **The components** (`38eff76`): `StaffOperationsLog` (rows are `Pressable`
   and open the detail), `StaffDeletedServicesSection` (restore, plus «Carica
   altri 20» because `limit` stops at 50), and a «Dettagli» action on
   `StaffReportCard` that exists on closed reports too — the detail is a read,
   not a decision.
3. **The wiring** (`83e6396`): `staff.jsx` loads the deleted services with
   their own request and their own error (the F57 lesson: one failure must not
   reinterpret another), opens both details from the row already in memory and
   refreshes them in the background, and confirms a restore with
   `varianteConferma="primary"` — a reversible action must not wear the red of
   a destructive one. The two panels live in `StaffDetailPanels.jsx`.

### What cost more than planned

`staff.jsx` measures **588 lines**, not the <500 the plan's step 5 wrote. Three
surfaces in one route plus two panels: the extractions above (log, section,
panels) took out ~230 lines, and going under 500 would mean extracting the
review flow as well, which is a refactor this item did not ask for. The repo
ceiling is 800 (`docs/frontend.md`), so this is declared, not hidden: the plan's
step 5 is marked `DONE` with the measured number next to it.

### Review a contesto fresco, and what it caught

Three reviewers on distinct angles (deepseek for correctness, deepseek for
security and data, glm for brief coherence) read the cycle against the
contract. Merge: yes from all three, no P0. The fixes that landed in
`e211683`: the detail panel now ignores a late answer for a row it is no longer
showing (open A, then B, and A's failure no longer writes into B's panel);
«Carica altri 20» cannot start while page 1 is reloading, and appended pages
dedupe by `chiave` because offset pagination shifts under a restore; a fresh
answer of `null` is now reported as stale instead of being read as fresh;
`restoringId` is cleared before the reload so the other rows do not stay
disabled; the row shows `daRemoto` instead of deducing it from a missing
location; a service restored while suspended now says «Sospesa» and the copy
stopped promising the catalog (`ServiceRestorer` only clears `deletedAt`,
`Service.php:74`); `listStaffDeletedServices` and `getStaffUser` joined the
other calls behind `withActionMessage`, so a `403` speaks Italian; the
operation panel redacts `password|token|secret|jwt|hash` keys and renders
nested values as JSON instead of `[object Object]`.

Gate after the fixes: `npx expo lint`, `npx tsc --noEmit` clean, `npx jest` 28
suites / 315 tests. Plan and contract: `docs/briefs/w4-staff-surface/plan.md`.

---

## 2026-11-16 — W6: the lazy dataset was measured, not built

Session start: `git fetch origin`. `andrea-frontend` was **0 ahead, 0 behind**
`origin/andrea-frontend`; 291 ahead of `origin/main`, 0 behind. No merge needed.

### Why

Audit W6 asked to load `province-comuni.json` lazily so the home route would not
pay for it. Before writing code the premise was measured, and it does not hold.

### What the measurement showed

`npx expo export -p web` (2026-11-16, `dist/` is gitignored) puts the dataset in
`__common-*.js`, the 736.675 B chunk **every** route loads: 112.357 B minified,
41.591 B gzip, and parsing it in V8 costs about 1 ms. The home tab renders
`ServiceCard` → `localitaPerDisplay` → `analizzaLocalita`, so the dataset is
needed at first paint; `FilterBar` is not the only consumer, as B8 assumed. A
`require()` inside an accessor is resolved by Metro at build time, so it removes
no byte from the chunk and does not take the JSON out of the home route's module
graph: it only moves the evaluation. The two ways to really remove it — an async
`import()` behind async display functions, or dropping the canonical spelling
(`roma - roma` → `Roma - Roma`) — change what the user reads, which W6 forbade.

### What landed

No code. `docs/audits/frontend-gap-analysis-2026-11-16.md`: B8's judgment is
corrected with the numbers above, W6 moves to `Stato: N/A` with the reason, and
the suggested run order marks it closed. `src/services/italian-locations.js` is
untouched: it is pure, 100% covered and behaves as documented.

The item reopens only if the display contract changes (a location shown without
canonical spelling, or an async formatter) — a product decision, not a refactor.

---

## 2026-11-16 — W3: the public profile of another person

Session start: `git fetch origin`. `andrea-frontend` was **0 ahead, 0 behind**
`origin/andrea-frontend`; **283 ahead** of `origin/main`, 0 behind. No merge
needed, nothing pushed to `main`.

### Why

Audit W3 (`docs/audits/frontend-gap-analysis-2026-11-16.md:319`): the service
detail of the home catalog names the person who published it and shows three of
their publications, and there was no page behind that name. The recipient of a
blind proposal could not look at who was proposing. G3's endpoint has existed
since 2026-11-15; only the surface was missing.

### What landed

1. **One owner for the rows** (`1ed4fe3`): the group of publications was private
to `UserServicesMiniCard`, capped at three. It is now
`src/components/ServiceGroup.jsx` — heading, one `- descrizione` line per row,
and the «e N altre» counter only when the list is actually cut. `limite` is the
caller's decision: the mini card passes 3, the profile passes `null` and shows
everything. A counter over a list nobody truncated would be a lie.
2. **The identity block** (`a857cc8`): `src/components/ProfileSummary.jsx` draws
name, `@username`, place, bio and photo from the envelope `normalizeUserServices`
already returns. A field the person left empty has no line — never «Bio non
indicata», a sentence the person never said. A photo that fails to load leaves
the initials in the circle plus one prose line saying so, the same rule as the
own-profile screen. The place goes through `localitaPerDisplay`, so a location
reads the same here as on a card.
3. **The screen** (`1393d07`): `/user/[id]`, registered in the `Stack` beside
`chat/[agreementId]`, document title `Profilo · Baratto-lo` through the
`TITOLI_CON_ID` family. It adds no request of its own: `useUserServices` already
answers `{utente, offerte, richieste}` and already separates `404` (**this**
person, unknown or deactivated) from `403` (**the reader's** inactive account).
Five explicit states: first read, person gone, viewer refused, failed read with
a retry, and nothing published.
4. **The entry point** (`136a332`): the «Pubblicato da» row of
`ServiceDetailModal` becomes a `Pressable` when the owner has an integer id and
the parent passes `onOpenProfile`, with name and username folded into the
accessible name (a `button` makes its descendants presentational, the F50
lesson). The panel still never imports the router: the home owns the push.

### What was decided before writing

The audit left one decision open and the closing lock took it: **the agreement
side does not ship.** `GET /get-agreements` rows carry the counterpart's
username only (G6 is still open), so a username → id lookup would mean paging
the whole catalog client-side to invent a mapping the backend does not offer.
Consequence: the screen takes an id only, `AgreementCard.jsx` and
`AgreementSheet.jsx` are untouched, and the remaining entry point stays G6's
business, not a W3 residue.

### Corrections against the plan

- The location needed `localitaPerDisplay`; the plan had the raw field.
- My own diff review caught a real defect: a non-integer id sat on a
  `LoadingScreen` that no answer could ever end. It now falls into «Profilo non
  disponibile», the same state as a person the backend does not know.
- The plan's gate baseline (19 suites / 240 tests) was stale — it came from W2's
  close, and W1 added 8 suites after it. The gate on the final tree is **27
  suites / 298 tests**, lint clean, `tsc --noEmit` exit 0.

### Review

Three fresh-context angles, one model each: correctness (`deepseek-v4.1-flash`),
security and data (`deepseek-v4.1-flash`), brief fit (`glm-5.3-flash`). Two
`MERGE WITH FIXES`, one `MERGE`, no open P0. What the accepted fixes changed:

- The panel closed **after** the push, so it stayed on top of the profile it had
  just opened and the tap looked like it did nothing.
- The profile's rows were capped to a single line by the mini card's rule:
  `ServiceGroup` gained `righe` next to `limite` — the summary truncates, the
  page shows the description whole.
- The new button was about 22 pt tall; it now takes `target.min` and centres its
  row.
- `@username` printed twice for a person with no name, a broken photo survived a
  move to another person, `limite <= 0` counted rows it did not hide, and the
  `403` sentence claimed the profile existed. One line each.

Still open, recorded rather than fixed: the screen's five states and the modal's
gating have no render test (the reviewer who found the P0 noted that one would
have caught it), and the id is checked as a number rather than as canonical
digits (`0x7` reaches `/users/7`; the endpoint answers `404`, so nothing is
shown).

### Touched

`Frontend/src/components/ServiceGroup.jsx` (new),
`Frontend/src/components/ProfileSummary.jsx` (new),
`Frontend/src/app/user/[id].jsx` (new),
`Frontend/src/components/__tests__/ServiceGroup.test.js` (new),
`Frontend/src/components/__tests__/ProfileSummary.test.js` (new),
`Frontend/src/components/UserServicesMiniCard.jsx`,
`Frontend/src/components/ServiceDetailModal.jsx`,
`Frontend/src/app/(tabs)/index.jsx`, `Frontend/src/app/_layout.jsx`,
`Frontend/src/navigation/screen-titles.js`,
`Frontend/src/navigation/__tests__/screen-titles.test.js`, plus this changelog,
the W3 section of the audit and the plan under `docs/briefs/w3-public-profile/`.
No `Backend/**` file, no `Context_and_DB_V2/**` file, no change to the API
surface or to the hook.

---

## 2026-11-16 — W1: the chat of an accepted agreement

Session start: `git fetch origin`. `andrea-frontend` was **0 ahead, 0 behind**
`origin/andrea-frontend`; **268 ahead** of `origin/main`, 0 behind. No merge
needed, nothing pushed to `main`.

### Why

Audit W1 (`docs/audits/frontend-gap-analysis-2026-11-16.md:214`): four chat
routes existed and **no line of `Frontend/src` named them**. The lifecycle
stopped at the delivery sheet: proposal → agreement → sheet → … → conclusion had
nothing in the middle. The chat is attached to the agreement, so this closes the
last functional hole of the product, not a nicer screen.

### What landed

1. **The message row** (`2cf1273`): `normalizeChatHistory({chatId, messages})` →
   `{chatId, messaggi: [{id, chatId, autore, testo, inviatoIl}]}`, dropping a row
   without an id or without text; `formatIsoDateTime` next to `formatIsoDate`,
   sharing one parse guard.
2. **The area** (`82b22c0`): `getAgreementChat`, `sendChatMessage`,
   `getMostRecentMessageId`, `getNewChatMessages` with the Italian copy for the
   statuses the screen can hit. `sendChatMessage` returns `true`, because the
   route answers only the acknowledgement.
3. **The bubble and the composer** (`0eff37d`, fixed in `0b0e722`): one bubble per
   message, own side / other side, time from `formatIsoDateTime`; the composer
   reuses `AppInput` and refuses an empty draft. The 1000-character cap is ours:
   `Backend/src/Entity/ChatMessage.php` has no constraint at all.
4. **The entry point** (`a3ee739`): `AgreementCard` gains `onApriChat`, drawn only
   on `ACCEPTED` rows with an id, and the tab owns the router.
5. **The hook and the screen** (`940f9b7`, `ad39bfb`): history on focus, a 15 s
   poll that lives inside `useFocusEffect` and never survives a blur, the send
   with its own error, and `/chat/<agreementId>` registered in the `Stack` with
   `Chat` as its document title. The poll's cursor is the highest id already on
   screen; `most-recent-message` only seeds a chat whose history is empty.

### Decisions worth knowing

- **No optimistic bubble.** `POST /chats/send-message/{chatId}` answers
  `{success: {code, message}}` and never the row it wrote. A local bubble would
  have no id to reconcile and could duplicate; the screen re-reads the history.
- **No `myUsername` in the hook.** The backend already excludes the caller's own
  messages (`ChatMessageRepository.php:44-58`), and the bubble takes the name from
  the screen. The parameter was in the first contract by inertia and was removed.
- **The composer clears only on `true`.** The first version emptied the field
  before the POST answered, so a rejected message lost the draft; the clear now
  waits for the caller's answer and a test locks both directions.
- **Scroll follows the newest message** (`onContentSizeChange` →
  `scrollToEnd`), because that is where a conversation is.

### The review's P0, and what it cost

The fresh-context review found the poll was a no-op: `sonda` asked
`most-recent-message` on every tick and handed that id to `check-new-messages`,
which answers only what is **newer** than the id it is given — so the answer was
empty by construction and the counterpart's message would have arrived only on
the next focus. Two of the three reviewers found it independently. Fixed by
keeping the cursor in a ref fed by the displayed history, plus a fake-timer test
(`src/hooks/__tests__/useChat.test.js`) that fails against the old version.

Also from the review: the 1000-character cap is re-checked at the data boundary
(`useChat.invia`) and not only in the field; a bubble needs a real `myUsername`
before it may say «Tu»; the card's `ACCEPTED`-only gate now has a test; the
first frame shows the spinner; two failed polls in a row surface as an error
instead of staying a dev warning; `formatIsoDateTime` has the test a comment
already claimed it had.

### What the run corrected against the plan

The whole second wave timed out: two `worker` children, 30 minutes each, **no
file written** (105K and 112K tokens spent reading). Rather than resume a job
with nothing on disk, the two integration files (`useChat.js` and the screen)
were written by the orchestrator against the contracts the plan had already
fixed. Recorded in `docs/briefs/w1-chat/plan.md` §«Cosa il run ha corretto».

### Docs and known gaps

- `docs/api.md` (the Chat section now says what the app drives, and that
  `check-new-messages` is global), `docs/backend-gaps.md` **G24** (no chat route
  checks the caller is a participant — found reading the backend, backend defect,
  not fixable from here), `docs/ui-triage.md` **F3 closed** (the chat screen now
  exists, so the `Screen.jsx` paragraph describes a real screen).
- **The hook has no test.** `useChat` carries the only non-trivial logic of the
  item (poll cursor, stale-response guard, send state) and is covered by nothing:
  the existing suite tests the area, the bubble and the composer. That is W7 of
  the audit, not a silent omission.

## 2026-11-16 — W2: notifications and queues reach their agreement

Session start: `git fetch origin`. `andrea-frontend` was **19 commits ahead** of
`origin/andrea-frontend`, **0 behind**; **261 ahead** of `origin/main`, 0 behind.
No merge needed, nothing pushed to `main`.

### Why

Audit W2 (`docs/audits/frontend-gap-analysis-2026-11-16.md:238`): two surfaces
already hold the `agreementId` of the exchange they talk about and threw it away.
The inbox normaliser keeps the backend `data` object verbatim, so
`notifica.dati.agreementId` was already in memory; `normalizeQueue` already
carried `agreementId` and the card already printed "Collegata a uno scambio". The
row said something was happening and gave no way to go look.

### What landed

1. **`NotificationRow`** (`0718c3a`): the informational block (header row plus
   message) is one `Pressable` with `accessibilityRole="button"` and the
   composed label `Apri lo scambio di questa notifica: <tipo, data, messaggio>`
   when `Number.isInteger(notifica.dati?.agreementId)`; a row without it, or with
   a string id, renders exactly the old markup — no pressable, no role, no label.
   The actions row and the delete `ConfirmModal` stay outside it.
2. **`notifications.jsx`**: owns `useRouter`, passes
   `onApri={() => router.push('/agreements')}`. The component stays data and
   callbacks only, with no `expo-router` import.
3. **`QueueCard` + `match.jsx`** (`ca9e098`): same shape for the linked case
   (`Number.isInteger(coda.agreementId)`), label
   `Apri lo scambio collegato a questa coda: <descrizione, categoria, luogo,
   stato>`; `Annulla coda` and its modal stay outside the pressable.
4. **Tests**: two new cases in `NotificationRow.test.js` (integer id → one
   actionable button that fires `onApri` and whose name carries the message;
   missing/`null`/`'12'` → none), and a new `__tests__/QueueCard.test.js`
   (linked, unlinked, and the cancel path that must never navigate) — the queue
   half had no test file at all.

Why the actions stay outside the pressable: on `react-native-web` a press inside
a nested pressable bubbles up, so a card-wide pressable would make "Elimina" and
"Annulla coda" navigate as well.

### The review's P1 that changed the labels

Fresh-context review, two angles (correctness; data, security, brief fit), both
`MERGE WITH FIXES`. The finding they agreed on: a `Pressable` with the `button`
role makes its descendants presentational, so a **fixed** label silenced the
message, the type and the date on exactly the rows that could be opened — the
same class of bug `ServiceCard` had as F50. Both names are now folded out of the
visible strings, both tests assert the composed name carries the row's own text,
and the pressed state got the house feedback (`opacity: pressed ? 0.7 : 1`,
`ServiceCard`'s shape). The other P2s: the queue predicate became
`Number.isInteger` like the notification half (a missing key would be
`undefined`, which `!== null` treats as linked — unreachable today, cheap to
close), and two sentences of this file and of the audit that said more than the
code does were corrected.

Two corrections to the plan, both kept in the comments: react-test-renderer
exposes a `Pressable`'s accessibility props on the composite layers and the host
view, so "exactly one node" counts three — `QueueCard.test.js` counts rendered
host elements, `NotificationRow.test.js` asserts the actionable node (prefix +
role + handler); and a new wrapper swallows the card's own `gap`, so both
pressables carry `gap: space.sm` to keep the two states visually identical.

Honest limit: `/agreements` reads no search params, so the tap lands on the tab
and not on the single agreement. Deep-linking one agreement is its own item.

### Gate

`npx expo lint` exit 0, `npx tsc --noEmit` exit 0 (syntax-only, D010), `npx jest`
**19 suites / 240 tests** green (was 18/235).

### Touched

`Frontend/src/components/NotificationRow.jsx`,
`Frontend/src/app/notifications.jsx`,
`Frontend/src/components/__tests__/NotificationRow.test.js`,
`Frontend/src/components/QueueCard.jsx`, `Frontend/src/app/(tabs)/match.jsx`,
`Frontend/src/components/__tests__/QueueCard.test.js` (new),
`docs/audits/frontend-gap-analysis-2026-11-16.md`,
`docs/briefs/w2-agreement-links/plan.md`, this file.

---

## 2026-11-16 — No white screen left: a global error boundary around the Stack

Session start: `git fetch origin`. `andrea-frontend` was **17 commits ahead** of
`origin/andrea-frontend`, **0 behind**; **259 ahead** of `origin/main`, 0 behind.
No merge needed, nothing pushed to `main`.

### Why

Audit B7 (`docs/audits/frontend-gap-analysis-2026-11-16.md`):
`grep -rn "ErrorBoundary\|componentDidCatch" Frontend/src` returned nothing, so any
throw inside a render — a normalizer returning an unexpected shape, a token
payload that parses to `null`, a locale API missing on web — unmounted the tree
and left a blank screen with no way back except a manual reload. Every data path
in the app is explicit about loading/empty/error; this was the last unhandled
class of failure. W5 closes it.

### What landed

1. **`src/components/AppErrorBoundary.jsx` (new).** A class boundary
   (`getDerivedStateFromError` + `componentDidCatch`) plus the `ErrorFallback`
   function in the same file, because the fallback needs `useRouter()` and the
   class cannot use hooks. State is `{ error, retryKey }`: `Riprova` resets
   `error` and bumps `retryKey`, and the children are rendered inside a
   `<Fragment key={retryKey}>` so the retry **remounts** the subtree instead of
   repainting the fallback. `Torna ai servizi` resets and then
   `router.replace('/')` — without the reset the fallback would stay on screen
   after the navigation.
2. **Mount point.** `src/app/_layout.jsx` wraps **only** the `Stack` in the
   boundary, inside `ThemeProvider` + `AuthProvider` + `RootNavigator`: the shell
   above it (`WebNavMenu`, `SessionExpiryBanner`) keeps working while a screen is
   on the fallback.
3. **Copy and accessibility.** Italian, honest, no stack or exception message on
   screen; the container is `accessibilityRole="alert"`, the title is
   `AppText variant="title"` and both commands are `AppButton` (50 px tall,
   `accessibilityRole="button"`, so reachable by keyboard on web and announced).
   No literal colours: `useTokens` + `space`. The only log is `console.error`
   under `__DEV__`.
4. **Four tests** (`src/components/__tests__/AppErrorBoundary.test.js`, new):
   fallback instead of a blank tree with the alert role and the dev log, retry
   remounting the children, `replace('/')` on `Torna ai servizi`, and no error
   text on screen.

### The red test, and why the first version was wrong

The cycle arrived with 1 of 4 tests failing on disk. Cause, read from the log and
not guessed: the retry test used a child that threw on its first render only, and
**the crash never reached the boundary** — React 19 replays a render that throws
at sync priority, so that replay was the child's "second attempt" and it
succeeded (3 renders logged, 0 errors caught). A render counter is not a crash
condition. The test now throws from a module gate and provokes the crash **after**
the child mounted, via `renderer.update(...)`, so `Riprova` is proven to produce a
second real mount (a `useEffect` mount log going 1 → 2), which is the property the
plan asked for and a stronger one than "it re-renders".

Stated limit, not a coverage claim: the test mounts the boundary itself, so it
does not prove `_layout.jsx` keeps it mounted. That is the `grep` on the layout
plus the gate.

### Gate

`npx expo lint` clean, `npx tsc --noEmit` clean (syntax/imports only, D010),
`npx jest` **18 suites / 235 tests green** (was 17 / 231). No new dependency:
`react-test-renderer` was already there.

### Touched

`Frontend/src/components/AppErrorBoundary.jsx` (new),
`Frontend/src/components/__tests__/AppErrorBoundary.test.js` (new),
`Frontend/src/app/_layout.jsx`, `docs/briefs/global-error-boundary/plan.md` (new),
`docs/audits/frontend-gap-analysis-2026-11-16.md` (new; W5 and B7 marked closed),
`docs/changelog.md`. No backend file, no schema, no rename (that is W9).

---

## 2026-11-16 (later) — Upstream pushed twice: one queue per account, and a cancel that only notifies when it cancels

Session start: `git fetch origin`. `andrea-frontend` was **11 commits ahead** of
`origin/andrea-frontend` and **2 behind** `origin/main`; nobody had pushed to the
frontend branch, the two new commits were on `main` (`yrl26`, 2026-11-16).
`origin/main` was merged in (`153e26b`, no conflict, 3 backend files), and the
match tab was fixed for the new queue rule in the same session (**D025**).

### What landed upstream (`origin/main`)

1. **`4c90ccd` — `POST /create-service-queue` now refuses a second queue.**
   `ServiceQueueManager::createServiceQueue` asks the new
   `ServiceQueueRepository::getActiveQueueByUser` (any queue whose status is not
   `CLOSED`) and throws before the type mapping, before the credit and before the
   service lookup. So a refused create costs nothing — G19's credit-then-fail
   trap is narrowed, not closed — and the rule is now **one active queue per
   account, of either type**.
2. **`cccd44c` — `POST /cancel-agreement` only notifies when it cancels.**
   The `AGREEMENT_CANCELLED` notification moved inside the
   `status === ACCEPTED` branch, so a cancel on a `PENDING`/`REFUSED` agreement
   no longer tells the counterpart that a live exchange was called off. No
   frontend change: the app renders that action on `ACCEPTED` rows only
   (`agreements.jsx:297`).

Neither commit touches `Frontend/`, `docs/` or the schema.

### What it costs the app today

- **A reachable `500` in the match tab.** `CreateQueueActions`
  (`Frontend/src/app/(tabs)/match.jsx:265`) enables each create button off the
  account's services and never off the queues on screen, so an account holding an
  `OPEN` queue can still press the other type. The backend now throws a plain
  `\Exception`, which `QueueController` cannot catch (`G13`), so the screen says
  «Il servizio ha avuto un problema. Riprova tra poco.» — a retryable server
  fault for a state only a cancel fixes. `giulia.bianchi` (the seeded account
  that already holds a queue) is the fastest reproduction.
- **The one-queue rule contradicts the product rule the app follows.** One offer
  and one request per account is the rule in `setup.md`, `database.md` and every
  seed (changelog 2026-11-13); the new guard blocks the second *type*. Requested
  as **G23**, together with a `409` instead of the `500`.

### What this cycle implemented (decision **D025**, choice "the server wins")

1. **Both create buttons go down while a queue is active.**
   `services/queues.js` grew `hasActiveQueue(code)` (true when any row is not
   `CLOSED`, fails closed on a non-list, never mutates), and `CreateQueueActions`
   in `Frontend/src/app/(tabs)/match.jsx` takes that flag: when it is true, both
   actions are disabled and one sentence under the row — «Hai già una coda
   attiva: annullala per poterne crearne un’altra.» — replaces the two
   per-button reasons, because the queue is the only thing that changed. No new
   request: `GET /get-queues` already returns only non-`CLOSED` rows, so "a queue
   on screen" **is** "a queue the backend counts". Seven cases pinned in
   `services/__tests__/queues.test.js` (28 tests in the file, green).
2. **The `500` is now unreachable from the app.** It stays reachable from a
   client that does not look at the list, which is why **G23** still asks the
   backend for a `409` and a guard keyed on `queueType`.
3. **Nothing to change for the agreement commit.** `cccd44c` is behaviour-neutral
   here: the app renders cancel on `ACCEPTED` rows only (`agreements.jsx:297`).

The cost of the choice, stated once: the second queue type is unreachable in the
app until G23 lands. Hiding a button that is guaranteed to fail was judged better
than a rule narrower than the product wants, and D025 records it as reversible.

Pre-push gate green: `npx expo lint`, `npx tsc --noEmit`.

Docs touched: `api.md` (create/cancel/get queue rows, the five facts, the third
client guard), `backend-gaps.md` (new G23 + how the app lives with it),
`setup.md` (the demo account), `decisions.md` (D025), this entry.

## 2026-11-16 (earlier) — A location is Comune - Provincia, the credits verified, the registration fixed

Class **L**, 28 files (5 new, 1 deleted), contract and plan in
[`briefs/location-comune/`](briefs/location-comune/). Branch `andrea-frontend`,
clean tree at start, `HEAD == origin/andrea-frontend`, 0 behind `origin/main`.

### What changed

1. **Regione is gone from the frontend.** Every picker descends Provincia →
   Comune and the composed string is `Comune - Provincia` (`Roma - Roma`),
   decision **D024**. `italian-locations.js` owns compose, parse and display;
   `italian-regions.js` is deleted. The dataset is a verbatim copy of upstream
   `Context_and_DB_V2/province-comuni.json` (110 provinces, 7.894 comuni) at
   `Frontend/src/services/data/province-comuni.json`; the parser splits on the
   last separator (one comune is named `Tripi - Abakainon`), accepts a comune
   only in its own province, and refuses the old `Milano (Lombardia)` shape —
   `localitaPerDisplay` shows it verbatim and edit-profile asks for a re-pick.
2. **The registration no longer leaves the user on the form.** `signUp` created
   the session but nothing moved the URL off `/register`: the root Stack swaps
   `(auth)` for `(tabs)` and on the web that does not navigate, so the form
   stayed on screen with the home's web menu drawn over it. `register.jsx` now
   navigates itself, the same single-owner rule `login.jsx` already documented.
   **Login never had the bug** — it always navigated.
3. **Credits verified against what the backend implements**, and one sentence
   fixed. The four movements are −1 on a `REQUEST` queue, +1 when such a queue
   is cancelled with no agreement, +1 when a queue-born agreement is cancelled,
   +1 when the scheduler completes one; a new account starts at 1. The app
   states the cost, refuses to create a queue without exactly one service of
   the type, maps `Not enough credits`, and shows no balance because no route
   exposes one (`G15`). The one wrong copy: the cancel flow did not mention the
   refund — the confirm modal and the outcome banner now do, and only for a
   `REQUEST` queue with no agreement (the list never carries `CLOSED` rows, so
   the sentence is always true).
4. **The demo seed is now what the app writes.** The volume was rebuilt on the
   reference schema with only the category catalog, six accounts were registered
   from the web build (Playwright, real form, real payloads) picking Provincia
   and Comune, a `REQUEST` queue was created from the match tab, and the
   database was dumped back into `Backend/docker/seed-demo.sql`. Measured before
   and after the rebuild from that file: 50 categories, 6 users, 12 services,
   12 `service_categories`, 1 OPEN queue, identical rows, 0 locations outside
   `% - %`, credits 0/1 as designed. Accounts: `giulia.bianchi` (Roma, 0, one
   queue), `marco.ricci`, `sara.mancini`, `davide.costa`, `chiara.marino`,
   `luca.ferrari` (1 each), password `demo1234`.

What the run measured in the app, not in the code: registration lands on `/`
with the form gone; the profile shows `Località: Milano - Milano`; edit-profile
pre-fills Provincia/Comune from the stored string; the home lists the other
accounts' offers as `Firenze - Firenze`, `Napoli - Napoli`, …; filtering by the
province alone (`Roma`) returns 1 of 5; the match tab creates a `REQUEST` queue
and its cancel dialog says the credit comes back.

One plan step was impossible by design, not by defect: the product rule allows
**one offer and one request per person**, so no account gets a second entry. The
run exposed **no frontend defect**: every insert landed in the shape the client
composes.

### Review round: two fresh-context reviews, five fixes, one P1

Two reviewers read the tree (correctness; data and security) and returned
`MERGE` and `MERGE WITH FIXES`. The one real defect the cycle had shipped:

- **P1 — the province filter was a substring match.** The backend runs
  `LOWER(service.location) LIKE '%…%'`, so sending the bare province name found
  comuni in other provinces: `Torino` matched `Torino di Sangro - Chieti`,
  `Roma` matched `Romano di Lombardia - Bergamo`, `Bari` matched
  `Bariano - Bergamo`. The app now sends `" - Provincia"`
  (`formattaProvinciaPerFiltro`), so the match anchors on the province half;
  both test files pin the collisions. Documented in `api.md` next to the
  exact-equality rule the queue match uses: the two comparisons are opposite
  kinds of match and now say so.
- **A ghost filter.** A comune chosen between a province change and its response
  was counted as one active filter while `filtriDaQuery` dropped it (the empty
  state read «Prova a toglierne uno: .»). `useServiceCatalog.cambiaScelta`
  ignores a comune when the applied province is empty.
- **Dead payload helpers with the wrong key.** `aPayloadApi`,
  `aPayloadPubblicazione` and `aPayloadAggiornamento` had no callers and emitted
  `localita` where the backend accepts only `location`: deleted.
- **A seed that cannot be half-imported.** `START TRANSACTION` / `COMMIT` around
  the rows.
- **Stale references to the old seed** in `Backend/compose.yaml` (Docker
  exception, reported here), `docs/setup.md`, `docs/backend-gaps.md` (G19),
  `docs/database.md`, and the Playwright harness of the previous cycle, which
  still logged in as `coda.demo` / `demo`.

Accepted as documented, not fixed: **editing an entry whose location predates the
format writes `NULL` over it** (`api.md`, next to the PATCH table) — the decision
of 2026-10-13 stands and the current seed has no such row; **MySQL is still
published on `0.0.0.0:3306` with `root`/`root`**, older than this diff and the
Docker owner's call; the six bcrypt hashes in the seed stay, bounded by a
read-only dev-only mount.

### Touched

Code: `Frontend/src/services/italian-locations.js` (new),
`Frontend/src/services/data/province-comuni.json` (new, copy),
`Frontend/src/services/italian-regions.js` (deleted), `offer-request.js`,
`api/areas/services.js`, `hooks/useServiceCatalog.js`, `app/(auth)/register.jsx`,
`app/edit-profile.jsx`, `app/(tabs)/offer-and-request.jsx`,
`app/(tabs)/index.jsx`, `app/(tabs)/profile.jsx`, `app/(tabs)/match.jsx`,
`components/EntryForm.jsx`, `EntryCard.jsx`, `FilterBar.jsx`,
`DeletedServicesSection.jsx`, `QueueCard.jsx`, `ServiceCard.jsx`,
`ServiceDetailModal.jsx`, `ModalShell.jsx` (comment only); tests
`services/__tests__/italian-locations.test.js` (new),
`services/__tests__/offer-request-location.test.js` (new); `Frontend/package.json`
(coverage entry).

Docker exception: `Backend/docker/seed-demo.sql` regenerated from the app's own
writes — the backend maintainer is notified here, as `AGENTS.md` requires.

Docs: `api.md` (format + the credits table), `database.md`, `setup.md`,
`backend-gaps.md` (G11), `decisions.md` (D024), `ui-triage.md` (demo accounts),
this entry, plus `briefs/location-comune/plan-brief.md` and `plan.md`.

Gate after every commit: `expo lint` 0, `tsc --noEmit` 0, `jest` 17 suites /
224 tests green.

---

## 2026-11-16 — Synced with main: one reference file in, three fixes stated

Session start ran the mandatory `git fetch origin` and the comparison against
`origin/main` and `origin/andrea-frontend`; upstream was then merged in. This
entry is that report plus the docs it produced. No `Frontend/` code changed.

### Delta at session start

| Comparison | Result |
| --- | --- |
| local vs `origin/andrea-frontend` | identical (`fa84c3a`), working tree clean — **nobody pushed to this branch**: every `PushEvent` on `refs/heads/andrea-frontend` in the repository event feed is ours, and the branch carries no commit by another author that is not already on `main` |
| local vs `origin/main` | main 1 ahead, branch 241 ahead — diverged, so a merge was owed |

### The merge

`git merge origin/main --no-edit` → `edafe05` (parents `e9a1bc4` + `7408f52`),
merge commit, no rebase. One file added, zero conflicts, zero overlap:
`git diff --stat e9a1bc4..HEAD -- Frontend/` is empty. After the merge:
`origin/main` is fully contained (`rev-list --left-right --count` → `0 243`).
The commit merged is `7408f52` (yrl26, 2026-11-15 20:43).

### What the pushes contain

1. **`7408f52` — `Context_and_DB_V2/province-comuni.json`** (new,
   8.116 lines, 188 KB): every province mapped to its comuni. Nothing in
   `Backend/` reads it and no endpoint serves it: it is reference data for the
   frontend, which today stops at province (`italian-regions.js`,
   `Provincia (Regione)`). Read-only material, never edited.
2. **Already in the branch** through yesterday's sync merge `70c799b` (24
   commits), itemised now because the sync entry only said "notifications,
   service queues, credits":
   - `11cffda` — a queue-born agreement credits +1 when the end-date scheduler
     completes it, and cancelling a `REQUEST` queue with no agreement refunds
     it; `refundCreditForQueue` became `IncreaseOrRefundCredit`, a plain
     `credits + 1`.
   - `76a3fc4` — `create-service-queue` reads its body through the injected
     `Request` (it called `AbstractController::getRequest()`, removed in
     Symfony 7), `cancel-queue` passes user and id to the manager, and
     `ServiceQueueDTO::getLocation()` was added so `GET /get-queues`
     serialises `location`.
   - `761357b` — the scheduler's debug `echo` is gone.
   - Notifications (PRs #54–#56) were already covered by `docs/api.md`.

### What it unblocks / what we owe

- **A comune-level location picker**: `province-comuni.json` is now in the
  branch. `register`, `edit-profile` and the entry form stop at province today.
  The stored format (`Provincia (Regione)`) is a product decision first — the
  queue match compares the string exactly (`docs/backend-gaps.md` G11), so
  changing it changes both sides and the existing rows.
- **Credits move on four paths and none is readable** (`G15`): create a
  `REQUEST` queue (−1), cancel it without an agreement (+1), cancel a
  queue-born agreement (+1), complete one through the scheduler (+1). The app
  still shows no number, by design until a route exists.
- **The completion credit sits behind the unconsumed scheduler** (`G12`): in
  the local stack nothing changes until a worker consumes `scheduler_default`.
- Everything else the pushes touched (notifications, queues,
  `GET /users/{id}/services`) was implemented and documented in the previous
  two cycles; no new backend route appeared.

### Touched

`docs/changelog.md` (this entry, plus the missing heading of the 2026-11-15
sync block), `docs/api.md`, `docs/backend-gaps.md`, `docs/database.md`. Merge
commit `edafe05`. No `Frontend/` code, no `Backend/` file, no edit to any
`Context_and_DB_V2/` file.

## 2026-11-15 (later) — Cycle 2: design debt closed, queues and the agreement sheet

Cycle: [`docs/briefs/cycle-2/plan.md`](briefs/cycle-2/plan.md). Branch
`andrea-frontend`. Twelve blocks, three lanes of disjoint files, evidence in
[`docs/audits/native-parity-2026-11-15.md`](audits/native-parity-2026-11-15.md)
and [`docs/audits/ux-audit-cycle2-2026-11-15.md`](audits/ux-audit-cycle2-2026-11-15.md).

### What changed

1. **The three P1 and the two cheap P2 of the 2026-11-15 audit are closed.**
   «Elimina» on a notification goes through `ConfirmModal` and lost its red
   outline (`AppButton` gained `dangerGhost`); an unread row is the `primary`
   border plus a leading dot on `surface`, not a `serviceBg` fill; the mini-card
   no longer repeats the service that opened it and gives every row
   `numberOfLines={1}`; the refresh sentence is said once, in the header; the
   profile unread count is a `Chip`.
2. **The `match` tab is a real surface.** `GET /get-queues`, create and cancel,
   with loading/empty/error states, the credit cost in words (no balance route
   exists: G15) and a local gate that explains why a create button is disabled.
   `cancel` goes through `ConfirmModal` because a queue attached to an agreement
   cancels that agreement too.
3. **The delivery sheet is callable and called.** The premise that blocked it was
   wrong: `send-agreement-details` reads only the agreement id, the remote flag
   and the dates, and each sheet row carries `providerUsername` +
   `beneficiaryUsername`, so the card knows which row it fills and which it
   confirms. G6 is narrowed to `serviceId` + counterpart id.
4. **Native parity is documented, not claimed.** Both bundles export, `expo-doctor`
   is 20/20, every `Platform.OS` branch was read with a verdict, and the web build
   was driven with Playwright in light and dark. The device half is a checklist in
   `docs/audits/native-parity-2026-11-15.md` §5 — owed, not done.

### Docker exception (backend maintainer: read this)

`Backend/docker/seed-demo.sql` gained one account at the end: `coda.demo` /
`demo` (Roma, one offer, one request, one credit, category `Aiuto compiti`).
Reason: `POST /create-service-queue` resolves the account's service with
`getOneOrNullResult()`, so every generated demo user (four to seven services per
type) gets a `500` from the route; without this account the queue UI cannot be
exercised at all. Measured after `docker compose down -v && up -d`: login `200`,
`offers/mine` 1, `requests/mine` 1, `create-service-queue` `201` then credit
1→0, `cancel-queue/1` `200` then credit 0→1, empty `get-queues` `404`. No other
Docker file changed.

### Review (fresh context, two angles)

Two reviewers read the cycle at `cd16fad`: correctness/data/security and
brief/evidence coherence. Both verdicts: **mergeable with fixes**, no P0. Fixed in
the same cycle: the read-only sheet claimed a start date the schema does not keep
(G20) — it now shows only the end date plus the reason; the new cross-module
exports of `services/queues.js` were Italian, against D023, and are English now
(`QUEUE_TYPE_LABELS`, `queueTypeLabel`, `servicesOfQueueType`, and
`otherServices` in the mini-card); the dead `404` mapping on cancel-queue is gone
(the route always answers `200`, now filed as G21); the sheet calls gained API
tests and the component test now rejects with a real `ApiError`; cancelling can no
longer race an in-flight sheet; the match tab loads the two answers independently
so a failing own-services call no longer hides an arrived queue list; the
in-progress/concluded split now reads the **latest** end date of the two sheet
rows; seven stale `Backend/**` line citations and five count/claim errors in the
docs are corrected.

### Gaps filed

`G17` (an empty queue list is a `404`), `G18` (accepting an agreement can leave
half a sheet and answer `500`), `G19` (queue creation needs exactly one service
of that type and spends the credit first), `G20` (`agreement_details.start_date`
has `ON UPDATE CURRENT_TIMESTAMP`, so the start date a reader sees is the last
write time). `G6` narrowed, `G7` note updated: both sheet routes are now called.

## 2026-11-15 — Sync with main: 24 commits, Expo SDK 58, an inbox and a mini-card

Cycle: [`docs/briefs/sync-15112026/plan.md`](briefs/sync-15112026/plan.md).
`origin/main` had 24 commits (notifications, service queues, credits, full auth
on `/api`, new reference dump) and none of them touched `Frontend/`.

### What changed

1. **`origin/main` merged into `andrea-frontend`** (merge commit, no rebase).
   Backend, `Context_and_DB_V2/` and `Archive/` only; the frontend code is the
   same as before the merge.
2. **The Docker stack imports the current schema.** `Backend/compose.yaml`
   mounts `Context_and_DB_V2/barattolo_15112026.sql` (15 tables, structure
   only) and then `Backend/docker/seed-demo.sql`, a new file carrying the demo
   rows that schema lacks: 50 categories, 30 users (password `demo`) and 300
   services, copied verbatim from the archived demo dump whose column order
   still matches. Agreements, notifications and queues stay empty.
3. **Why a seed of our own.** The reference dump has zero `INSERT`s and the
   generator `Backend/tools/create-demo-database.php` still targets the previous
   schema and filename, so it cannot run against this one. Without rows
   `GET /api/categories` returns an empty list and the app cannot register.

### Measured (empty volume, `docker compose down -v` + up)

| check | result |
| --- | --- |
| tables in `barattolo` | 15 (was 12) |
| `categories` / `users` / `services` | 50 / 30 / 300 |
| `GET /api/categories` | 200, 50 rows |
| `POST /api/auth/login` (`mario.rossi` / `demo`) | 200 with JWT |
| `GET /api/notifications` with that JWT | 200 `{notifications:[],pagination:…,unreadCount:0}` |

### What changed on the frontend

1. **Expo SDK 58** (`2574674`): `expo 58.0.25`, React 19.3.0, React Native
   0.88.1, `expo-router 58.0.31`, `react-native-gesture-handler 3.3.0` (major),
   jest 30 and TypeScript 6. `expo-doctor` 20/20, `expo lint` and
   `tsc --noEmit` green, `jest` 122 tests green, and both bundles exported
   (iOS Hermes 3.2 MB, web) so Expo Go 58 can load the project.
2. **`CANCELLED` and `COMPLETED`** (`f94b55a`): the backend renamed the
   cancellation status and the scheduler adds a completed one; the classifier
   keeps both in "Concluse" and the card labels them "Annullato"/"Completato".
   Before this, cancelled and completed exchanges silently disappeared.
3. **A notifications inbox** (`2f82e54`, `c1c21ae`, `4de5c6f`): the API layer
   (`api/areas/notifications.js`), two normalisers, `useNotifications`, the
   `notifications` screen and its row, plus the profile row that opens it with
   the unread count. The backend has no push channel, so the screen reloads
   when it comes back to the foreground and the copy says so.
4. **The offerer mini-card** (`fae86fa`): `GET /users/{id}/services` fills the
   block that used to declare gap G3, with loading, empty, failure and
   "account gone" states.

Both writing lanes (inbox, mini-card) were killed by the workflow timeout at
1800 s with **zero files written**; the parent implemented both blocks instead
of re-running them. Recorded here because the cost of that failure is the
measured part of this cycle.

5. **The web build hydrates again** (`cc6cf03`). SDK 58's root-HTML contract
   changed: `+html.jsx` must render `headNodes`/`bodyNodes` from
   `useServerDocumentContext()`, otherwise the exported HTML carries **no**
   bundle script and every web surface stays on the boot placeholder. Measured
   before the fix (one inline script, zero bundle requests) and after (the app
   renders, `document.title` follows the route). The `/notifications` route also
   entered the secondary-title map, so the browser tab says "Notifiche".
6. **An audit of the two new surfaces** (`docs/audits/ux-audit-2026-11-15.md`,
   27/40 on the ten heuristics, six captures): the P1 items are the missing
   confirmation on delete, the mini-card repeating the open service, and unread
   rows filled with `serviceBg`.

### Touched

`Backend/compose.yaml`, `Backend/docker/seed-demo.sql` (new),
`Frontend/package.json`, `Frontend/package-lock.json`,
`Frontend/src/api/**`, `Frontend/src/hooks/**`, `Frontend/src/components/**`,
`Frontend/src/app/**`, `Frontend/src/services/agreements.js`,
`docs/setup.md`, `docs/briefs/sync-15112026/**`, `AGENTS.md` (brought in line
with D011 and with what the lint gate really proves).

### Attention (backend maintainer)

`Backend/compose.yaml` and a new file under `Backend/docker/` changed under the
ownership exception in AGENTS.md (D008): the schema mount now points at
`barattolo_15112026.sql` and a seed file was added. No backend source, config or
test was touched, and the archived dump the seed comes from is read-only.

Open points for the backend side (detail in `docs/backend-gaps.md`): the new
dump ships **no data**, `tools/create-demo-database.php` cannot regenerate it,
the scheduler is registered but **nothing consumes** `scheduler_default`
(`debug:scheduler` lists the task; the stack starts no worker), so `COMPLETED` is
never written locally, and `QueueHandler` can create several agreements for one
queue. Queues created through the API stay unmatched for the same reason.

## 2026-11-14 — The page has a frame, the body has a measure

Direction: **(a) as (c)** — the gutters are used deliberately, and the page
header is the thing that uses them (approved in
[`docs/briefs/ux-desktop-composition/plan.md`](briefs/ux-desktop-composition/plan.md),
block 2).

### What changed

1. **From `layout.sogliaLarga` (1024) up, the page header is the band of the
   page.** `PageHeader` leaves the column on both ends by the gutter, reaches the
   ends of the window and closes with a `border` rule; the body keeps the measure
   and stays centred. Below the threshold nothing changes: the column is the page
   and the header is the stack it always was.
2. **The measure travels as a parameter**, `misura`, because the band is only
   correct if it knows the column it is leaving: the catalog passes
   `layout.maxCatalogo`, every reading screen keeps the default. The two auth
   screens pass `banda={false}`: their column is centred on purpose, so a band on
   the page frame would be a second composition inside one page.
3. **The bar's top reserve stops at the same threshold.** `Screen` reserved 64 pt
   above the content whenever the bar could reach the column, so at 1280 the page
   started 64 pt lower than at 1920 — two compositions for one rule. Above
   `layout.sogliaLarga` the bar sits over the band's outer end, never over the
   title, and the page starts at the window's top edge at every wide width.
4. **Why not two panes.** A ≥1024 list-plus-detail pane was option (b); it
   reopens the catalog's interaction surface (modal → pane) and belongs to a
   redesign, not to this audit's consistency work. Direction A had already
   refused it in [`ux-realignment/direction.md`](briefs/ux-realignment/direction.md).

### Measured (chromium, real backend, both themes)

| width | header band | body column | bar right edge |
| --- | --- | --- | --- |
| 390 | none, title on the body edge (16) | 16 → 359 | 374 |
| 768 | none, title on the body edge (32) | 32 → 720 | 752 |
| 1024 | 8 → 1000, page top edge 16 | 160 → 848 | 1008 |
| 1280 | 8 → 1256, page top edge 16 | 288 → 976 | 1264 |
| 1920 | 16 → 1904, page top edge 16 | 608 → 1296 | 1904 |
| 1200 / 2560 | 16 → window − 16 | — | window − 16 |

The band follows the **page box**, not a second constant: it is inset `space.lg`
inside it, the same inset the chrome bar uses, so the band's rule and the bar's
edge coincide (1920) unless the platform reserves a classic scrollbar — the page
box the band follows is then narrower than the viewport the fixed bar is
anchored to, which is why the 1024 and 1280 rows read 8 and 24 from the window.
That residual is the scrollbar's width, not a value anybody maintains.

Captures (8 PNGs, 390/768/1280/1920 × light/dark) in
`%TEMP%\baratto-desktop-f14\`, outside the repo: they are evidence for this
session, not tracked assets.

Touched: `Frontend/src/theme/tokens.js` (`sogliaLarga`),
`Frontend/src/components/PageHeader.jsx`,
`Frontend/src/components/Screen.jsx` (`riservaMenuWeb`),
`Frontend/src/app/(tabs)/index.jsx` (`misura`),
`Frontend/src/app/(auth)/login.jsx`, `Frontend/src/app/(auth)/register.jsx`,
`docs/DESIGN.md` § Measures / § Refresh / § Composition rules. Gate green
(`expo lint`, `tsc --noEmit`, `jest` 97/97), `impeccable detect` clean.

## 2026-11-14 — The catalog scrolls the page, not its column

### What changed

1. **The scrollbar of the catalog is at the window's edge.** `Screen` puts the
   content measure on its own box, and the catalog's box was the ancestor of the
   `FlatList`: the node that scrolled was the 720 column, so the scrollbar was
   drawn on the column's edge (≈x 975 at 1280, ≈x 1300 at 1920) and the wheel over
   the gutters did nothing (audit UX F14). `Screen` now gives the measure up when
   it is `larga`, and the measure travels with the content that scrolls: the new
   `colonna()` helper in `theme/tokens.js`, read by `ServicesSection`'s
   `FlatList` and by the proposal-sent `Banner` in `(tabs)/index.jsx`.
2. **Measured, not assumed** (chromium at 1280x800 and 1920x900, logged in, real
   backend): the only scroll node of `/` is now `0 → window width` (was 720 wide);
   a wheel over the gutter at x = 40 advances `scrollTop` 0 → 400; the card is
   `288 → 976` at 1280 and `608 → 1296` at 1920. At 390x844 the card is
   `16 → 359` with no change: the measure that used to sit on the ancestor is the
   same one that now sits on the scroll content, so the phone geometry is
   identical.
3. **Cards gain the 15 px of scrollbar at wide sizes** (688 wide instead of 673):
   that scrollbar used to live *inside* the 720 box, it now lives outside it, and
   the measure means what the token says.

The other branch of `Screen` was already correct and is untouched: `/profile`
scrolls through `Screen`'s own `ScrollView`, which spans the window with the
measure on its content container.

Touched: `Frontend/src/theme/tokens.js` (`colonna`),
`Frontend/src/components/Screen.jsx`, `Frontend/src/components/ServicesSection.jsx`,
`Frontend/src/app/(tabs)/index.jsx`. Gate green (`expo lint`, `tsc --noEmit`,
`jest` 97/97).

## 2026-11-14 — An expired token is no longer an error message on arrival

### What changed

1. **The boot no longer announces an expired session.**
   `auth/auth-context.jsx` restores the saved session at startup; when the
   stored token was no longer valid it cleared it **and** set the same reason
   the in-session `401` sets, so `/login` opened with "La sessione è scaduta:
   accedi di nuovo." on top. That copy answers `F91` ("thrown out mid-task
   with no explanation"), and at boot nothing was interrupted: someone coming
   back to the site an hour later met an error message on a screen they had
   just arrived at. The clear is now silent; the announcement stays where it
   has a recipient, the `401` of an authenticated request.
2. **`signUp` clears the exit reason** as `signIn` already did. Registration
   started from a screen showing that banner used to carry the old reason past
   the successful signup.

`auth/__tests__/auth-context.test.js` is the first test of the provider: it
pins all four behaviours (silent boot on an invalid token, silent restore on a
valid one, announced `401` mid-session, cleared reason after registration), so
the next session cannot re-introduce the noisy boot by accident.

### Touched

`Frontend/src/auth/auth-context.jsx`,
`Frontend/src/auth/__tests__/auth-context.test.js` (new), `docs/changelog.md`.
Gate green: `npx expo lint`, `npx tsc --noEmit`, `npx jest` (97 tests).

---

## 2026-11-14 — Residual of the third audit: one header, one accent, one retry

### What changed

Twelve findings from
[`audits/ux-audit-2026-11-13.md`](audits/ux-audit-2026-11-13.md) are closed:
**F3, F7, F9, F10, F11, F12, F17** and §8 items 1, 2, 4, 5, 8. Contract and
plan: [`briefs/ux-residual-2026-11-14/`](briefs/ux-residual-2026-11-14/).
Nothing new was built except the one slot the audit asked for.

1. **Every screen's title comes from `PageHeader` (F3).** Nine screens
   hand-built the row `[back 44pt][gap][title]`, which started the H1 56 px
   right of the body column, and two of them carried usage instructions in the
   subtitle slot the component documents as "what the screen holds".
   `PageHeader` gained an `indietro` slot: same row, but the row pulls left by
   `min(56, gutter)`, so the title sits on the body edge wherever the window
   has a gutter (exact from 672 px up) and falls back to today's offset on a
   phone, where the gutter is zero. `occhiello` and `azione` are deleted: no
   call site had ever used them.
2. **The retry lives in the banner that failed (F7).** Four screens drew
   `Banner` + a detached `AppButton`; on `/profile` the detached retry carried
   no `variant`, so the strongest button on the screen appeared exactly when
   loading had failed. All four now pass `etichettaAzione`/`onAzione` to the
   banner.
3. **One filled accent per screen (F9).** `PillBar` is the shared track behind
   `/staff`, `/staff-users` and the staff review sheet, and it filled the
   active pill with `primary`; `/agreements` filled its segment the same way
   next to a filled bell. Both now mark the selection with `serviceBg`, a
   `primary` border and primary-family text — the treatment `ThemeSelector`
   already used. The ATTIVO chip and the bell FAB stay: they are data marks and
   the screen's one accent.
4. **Applying a filter closes the panel on a phone (F10).** The panel occupied
   the whole first viewport on 390, so every iteration of "pick, look, pick
   again" cost a scroll down and back. Every applied choice closes it below
   480 px and leaves it open above, where it costs one row.
5. **The proposal-sent confirmation is visible from where you send (F11).** It
   lived in the list header of a 20-row virtualised list; it now sits above the
   list, and the list returns to offset 0 when the proposal leaves.
6. **One sentence per idea on `/offer-and-request` (F12).** Both empty states
   repeated the definition already in the section hint and told a desktop user
   to touch; they now say `Seleziona «Aggiungi» per iniziare.`
7. **Both auth screens name the task as their H1 (F17).** `/login` made the
   wordmark the only first-level heading, so "Accedi" existed only inside the
   submit button; `AuthShell` no longer owns the title and `wordmarkAsTitle` is
   gone with its single use.
8. **The §8 leftovers.** The filtered empty state no longer offers a second
   reset next to the always-visible footer one (§8.1) nor repeats the query its
   title already shows (§8.4); `/report`'s empty state carries its own action
   instead of a left-aligned secondary button outside it (§8.2); `/profile` and
   `/match` are named in the heading index (§8.5); `/staff` and `/staff-users`
   get pull-to-refresh and the web bar's "Aggiorna" through the existing
   `hooks/useRefresh` (§8.8) — until now the only refresh was the empty state's
   button, which exists only when the list is empty.

### Why

The audit's consistency axis (#4) was the visible symptom: the same three jobs
— header, retry, live region — drawn two or three ways. This cycle made the
codebase do what `DESIGN.md` already said, and updated `DESIGN.md` where it
described surface that no longer exists (the eyebrow).

### What was not taken

**F14** (no desktop composition) and the **F19** surface step still need a
direction document, not a polish pass. §8.3 (two centred notes in the detail
sheet), §8.6 (two "Aggiungi" with different fills), §8.7 (form label role) and
§8.9 (evidence notes) were left out of the declared scope.

### Touched

`Frontend/src/components/`: `PageHeader.jsx`, `PillBar.jsx`, `FilterBar.jsx`,
`PublicationsSection.jsx`, `ServicesSection.jsx`, `AuthShell.jsx`.
`Frontend/src/app/`: `staff.jsx`, `staff-users.jsx`, `edit-profile.jsx`,
`report.jsx`, `(tabs)/index.jsx`, `(tabs)/agreements.jsx`,
`(tabs)/offer-and-request.jsx`, `(tabs)/profile.jsx`, `(tabs)/match.jsx`,
`(auth)/login.jsx`, `(auth)/register.jsx`.
Docs: `docs/DESIGN.md`, `docs/changelog.md`,
`docs/briefs/ux-residual-2026-11-14/`. No backend file was read into the diff
and none was written.

### Notes for the next session

- `staff-users.jsx:313` still declares only `accessibilityLiveRegion` on the
  search row: the previous cycle's entry claims that site was closed for F4.
  Out of this cycle's scope, so not touched.
- `components/DeletedServicesSection.jsx:46-56` still draws the pattern F7
  removed: a `danger` message followed by a detached `AppButton` "Riprova".
- `PageHeader`'s `indietro` assumes the standard reading measure
  (`layout.maxContent`). No `larga` screen uses it yet; one that does would
  need the measure passed in.

---

## 2026-11-14 — Polish pass: dead ends, self-broken rules, browser surfaces

### What changed

Eleven findings from
[`audits/ux-audit-2026-11-13.md`](audits/ux-audit-2026-11-13.md) are closed,
taken in the order that audit suggested (Lane 1, plus the one-line rule-breaks
next to it). No new component was added for its own sake: three of the eleven
were fixed by giving an existing shared component one more job.

1. **A secondary route no longer pretends to load forever (F1).** `/staff`,
   `/staff-users` and `/edit-profile` are registered for every session, so a
   logged-out visit reached them; the screens then waited on a request that
   never left, behind a spinner with no exit. All three now redirect to
   `/login`, as the tabs layout already did.
2. **A logged-in non-staff visitor is told, not failed (F13).** The role rule
   (`STAFF` or `ADMIN`) moved out of `profile.jsx` into
   `services/staff.js:puoEntrareNellAreaStaff`, and the two area routes draw
   `StaffAreaGate` for everyone else: one sentence and the way back, instead of
   the backend's `403` arriving as a generic error.
3. **Every error and confirmation is announced on web (F4).** `Banner`, the
   result-count row and the staff-users search row declared only
   `accessibilityLiveRegion`, which `react-native-web` ignores: `aria-live` is
   now beside it at all three sites, `Banner` included — that is the app's only
   error surface, on ten routes.
4. **Every route has a name in the browser (F16).** `document.title` was empty
   everywhere (`ExpoRoot` disables expo-router's own title for static
   rendering). `navigation/screen-titles.js` maps the path to the word the
   screen already shows — the tabs from `TAB_ROUTES`, the six secondary routes
   by hand — and `hooks/useDocumentTitle.js` writes it.
5. **The browser's own surfaces follow the theme (F19).** One `color-scheme`
   line on the document (`hooks/useWebColorScheme.js`) takes the scrollbar, the
   caret, the native dropdowns and the form controls from the *resolved* theme
   rather than from `prefers-color-scheme`: the dark theme's scrollbar track was
   near-white against `#111613`, and the user can choose light on a dark system.
6. **Three touch targets reached the floor (F5, F6).** The two web chrome-bar
   controls are 44 (`minHeight` was 40); the two auth links are a real control
   now — `TextLink` wraps the word in a 44 pt `Pressable` inside `Link asChild`,
   where it was an 18 pt strip of text and the only exit from `/login`.
7. **The dialog is centred and stops wearing the accent (F2, F8).** `ModalShell`
   sets `alignItems: 'center'` on the overlay (the panel resolved to the start of
   the flex line, so above 560 px it sat at x ≈ 16 with the overlay empty to its
   right), and the container is excluded from the focus ring — `ModalShell`
   focuses it programmatically, and the ring spent `primary` a second time
   beside the panel's own primary button.
8. **The two «Mansione» fields are two fields (F18).** `AppInput` accepts an
   `accessibilityLabel`; `EntryEditor` names the section ("Mansione — cosa
   offri" / "… cosa cerchi"). The visible word stays the product's own.
9. **One value for one state (F15).** `opacity.disabled` (0.7) replaces three
   different numbers at seven sites; `EmptyState`'s dead `variante` prop left its
   seven call sites; `WebNavMenu`'s two imports on one line, the corrupted
   `role="main"` comment in `Screen.jsx`, the broken indentation in
   `staff-users.jsx`'s `catch`, and the two stale contrast notes (`tokens.js`,
   `AppButton.jsx`) are fixed.

### Why

The 2026-11-13 critique scored 27/40 and said its own number was dominated by
consistency, not by craft: every P1 was a "one convention, applied everywhere"
item. This pass takes the ones that needed no new decision — the paths that
block, the states that lie, and the places where `DESIGN.md` already said what
the code did not do.

What was **not** taken, deliberately: **F3** (a `PageHeader` back slot and nine
call sites) and **F7** (four retries moved into their banner) are the same kind
of fix but change a convention, so they need one decision first; **F9** (the
accent spent twice on three screens), **F10**, **F12**, **F14** (no desktop
composition) and **F17** belong to composition and copy, not to a polish pass.

### Verified

Live on the running web build (`npx expo start --web`), 390 and 1280, both
themes, measured in the DOM rather than read from the source: `document.title`
is `Accedi · Baratto-lo` / `Crea il tuo profilo · Baratto-lo` and the product
name on an unknown path; both auth links are 44 tall and keep `role="link"` +
`tabindex="0"`; the `Banner` carries `aria-live="polite"` with the message
inside; the two «Mansione» fields expose distinct accessible names;
`color-scheme` follows the stored preference (`light` while the system was dark,
`dark` after choosing «scuro»); the injected focus rule carries the dialog
exception. `impeccable detect --json Frontend/src` → `[]`. `npx tsc --noEmit`
and `npx expo lint` clean, `npx jest` 93/93 with the 20 tests that pin the two
new rules (`navigation/__tests__/screen-titles.test.js`, the role gate in
`services/__tests__/staff.test.js`).

**Not verified live:** the authenticated screens. Docker Desktop would not start
in this session, so `/staff`, `/staff-users`, `/edit-profile`, the centred dialog
and the dark-theme scrollbar are verified by source and by the measurements
above, not by a capture. The staff guards in particular deserve one authenticated
pass.

### Touched

`Frontend/src/app/_layout.jsx`, `(auth)/login.jsx`, `(auth)/register.jsx`,
`(tabs)/profile.jsx`, `edit-profile.jsx`, `staff.jsx`, `staff-users.jsx`;
`src/components/` — `AppButton`, `AppCheckbox`, `AppInput`, `Banner`,
`CategorySelector`, `EntryEditor`, `FilterBar`, `FocusRing`, `ListSelector`,
`ModalShell`, `PillBar`, `PublicationsSection`, `Screen`, `ServicesSection`,
`TextLink` (new), `StaffAreaGate` (new), `WebNavMenu`, plus the `EmptyState`
call sites in `(tabs)/index.jsx`, `(tabs)/match.jsx`, `(tabs)/agreements.jsx`,
`report.jsx` and `staff.jsx`;
`src/hooks/useDocumentTitle.js` (new), `src/hooks/useWebColorScheme.js` (new),
`src/navigation/screen-titles.js` (new), `src/services/staff.js`,
`src/theme/tokens.js`, `docs/DESIGN.md`, `docs/changelog.md`.

No file under `Backend/`, `Context_and_DB_V2/` or `Archive/`.

---

## 2026-11-13 — Full frontend critique, third pass (docs only)

### What changed

1. **New audit: [`audits/ux-audit-2026-11-13.md`](audits/ux-audit-2026-11-13.md).**
   Dual-agent critique of `Frontend/src` on tree `c3442ba`, read against the
   2026-11-12 captures: Nielsen 27/40, design specificity, 19 numbered findings
   (0 × P0, 6 × P1, 13 × P2) with evidence, why-it-matters and the smallest fix
   for each, a technical appendix (contrast, targets, live regions, focus, state
   matrix, responsive rules), a closed-findings table, and a suggested lane order
   for the next session.

2. **`audits/screens-2026-11-12/` is now referenced** as the visual evidence of
   record for `c3442ba`. Two of its filenames mislead and are noted in the audit
   (§8.9): `mobile-390-profile-loaded.png` is the loading state, and
   `desktop-1280-navmenu-kb.png` shows the service detail sheet, not the popover.

### Why

Three priority items from the 2026-11-11 critique are closed (login dead end,
heading levels, refresh band), so the score moved 24 → 27. The new pass found
that two of that critique's items were only *half* fixed (`PageHeader` is still
used by one screen; four retries are still detached from their message; three
live regions are still silent on web), plus two defects no previous pass had
looked for: a logged-out secondary route renders an endless spinner, and the
dialog is left-anchored instead of centred above 560 px.

### Touched

`docs/audits/ux-audit-2026-11-13.md` (new), `docs/changelog.md`. No code, no
configuration, no `Frontend/` file. The harness snapshot of the run is at
`.impeccable/critique/2026-11-13T16-07-00Z__frontend-src-app.md`.

---

## 2026-11-11 — One chrome bar, and the top of the screen comes back (critique P2)

### What changed

1. **The web refresh left its own band and moved into the chrome bar.**
   `Screen` no longer draws an `Aggiorna` row above the content: it publishes
   the pair it already receives (`hooks/web-chrome`: a module store, read with
   `useSyncExternalStore`, published on focus so the screen in front always owns
   it) and `WebNavMenu` draws it next to `Menu`, in the same neutral pill. The
   band cost `16 + 50 + 16 = 82` on every screen, put a second right edge next to
   the column's, and on a phone pushed the first service to `y≈437` of 844.
   `DESIGN.md` § Refresh is rewritten: the rule (one control, outside the scroll,
   same place everywhere) is unchanged; the owner of the pixels changed.

2. **The reserve rule now measures the bar, not its height.** With `Aggiorna`
   inside, the bar can reach over the column: `Screen` reserves the top band when
   the gap between the column's edge and the window's is narrower than
   `larghezzaBarraMenuWeb` (new token, 320). Constant, not measured at runtime:
   the threshold is `maxWidth + 2 × (320 + 16)`, so 1392 for the catalog — laptops
   reserve 64 pt, wide desktops do not reserve anything. Section warnings
   (`_layout.jsx`) hold the same width.

3. **The filter card is one row when there is nothing to filter by.**
   `Nessun filtro attivo` moved from a footer row of its own onto the summary
   row (`FilterBar`), and the footer — count plus `Azzera` — renders only when at
   least one filter is applied. The closed card went from 108 to 68 pt.

### Measured (Chromium, light, catalog, logged in as `mario.rossi`)

| Viewport | First service card | Before | After |
| --- | --- | --- | --- |
| 390×844 | `y` | ≈437 | **298** |
| 1280×900 | `y` | ≈358 | **280** |
| 1440×900 | `y` | ≈358 | **216** |
| 1920×1000 | `y` | ≈360 | **216** |

Bar and header do not overlap at any of the four widths, by construction: above
the threshold the bar clears the column, below it the column starts under the
bar. Verified that a screen **without** a refresh (`/report`) shows name and menu
only, that a filter in use restores the footer (`1 filtro attivo ·` + `Azzera` +
`7 di 7 servizi`), and that `Azzera` returns the row to `Nessun filtro attivo`.
Dark theme re-checked on the bar and the loading state.

### Why

The critique's P2: the chrome was anchored to the window while the content was a
column, and the band paid 82 pt for a control that a bar already at the top of
the screen could carry.

### Touched

`Frontend/src/hooks/web-chrome.js` (new), `components/Screen.jsx`,
`components/WebNavMenu.jsx`, `components/FilterBar.jsx`, `app/_layout.jsx`,
`theme/tokens.js`, `docs/DESIGN.md` § Refresh.

### Still open

- The scrollbar rail is the browser's own, next to the column and over the empty
  canvas. Theming it means exposing the palette as CSS variables, because
  `+html.jsx` cannot import `light`/`dark` from `tokens.js`; not done here.
- `/staff` and `/staff-users` still mount for a non-staff user (previous entry).

---

## 2026-11-11 — One first-level title per screen, from the role (critique P1)

### What changed

1. **`AppText`'s heading depth now follows the role.** `level` defaulted to 2
   for every variant, so a screen title that did not pass `level={1}` announced
   as a section inside nothing — and seven of twelve routes had no `H1` at all,
   while `/profile` opened with `H2 "MR"`, the avatar's initials. `title` now
   defaults to 1, `heading` to 2; a caller that genuinely differs (a panel
   title, which roots its own dialog) still states `level`.
   `print` was not involved; no call site had to change to keep its current
   depth.
2. **Repeated chrome stopped being a heading.** The `AuthShell` wordmark is no
   longer a heading on `/register`, where the page's title is
   «Crea il tuo profilo»; it stays the `H1` on `/login`, the only screen with no
   title of its own (`wordmarkAsTitle`). The profile's initials carry
   `accessibilityRole="text"`.
3. **Measured in the browser, all twelve routes**: `/` Servizi · `/match` Match
   automatico · `/offer-and-request` Offro e cerco · `/agreements` Accordi ·
   `/profile` Mario Rossi (initials no longer a heading) · `/edit-profile`
   Modifica profilo · `/report` Segnala alla staff · `/staff` Area staff ·
   `/staff-users` Utenti · `/login` Baratto-lo · `/register` Crea il tuo profilo ·
   `/nope` Pagina non trovata. Exactly one `H1` each, sections one step down.

### Why

`docs/DESIGN.md` § Type states the rule that the screen title is the root of its
page; a default of 2 made the rule unenforceable from the component and turned
every omission into a silent accessibility defect (WCAG 1.3.1). F51 introduced
the `level` prop and closed as a mechanism; the call sites were never migrated.

### Touched

`Frontend/src/components/AppText.jsx`, `Frontend/src/components/AuthShell.jsx`,
`Frontend/src/app/(auth)/login.jsx`, `Frontend/src/app/(tabs)/profile.jsx`,
`docs/DESIGN.md` § Type.

### Left open, with evidence

While measuring, `/staff` and `/staff-users` mounted for `mario.rossi`
(`ROLE_USER`, not staff) and rendered the moderation shell over three `403`s
from `/api/staff/*`. The backend enforces the role; the frontend has no route
guard, so the user sees «Area staff» and a failed log instead of being sent
away. Not part of this change.

---

## 2026-11-11 — Login enters the app on the web (critique P0)

### What changed

1. **`login.jsx` always navigates after a successful sign-in.** The screen only
   called `router.replace(ritorno)`, and only when `ritorno` was a valid
   internal path; every deliberate visit to `/login` has no `ritorno`, so
   nothing navigated. The root `Stack` swaps `(auth)` for `(tabs)`
   declaratively (`app/_layout.jsx:74-79`), which carries the screen on native
   but leaves the web URL at `/login`: the token was stored and the app's own
   navigation bar rendered **above** the still-mounted login form. The F58 fix
   removed the auth layout's `<Redirect>` (killing the two-owner race) and left
   the exit without an owner — closed in code, open in behaviour. Destination
   now defaults to `/`; the `ritorno` path is unchanged.

2. **Verified live, both directions.** `/login` → the catalog at `/` with
   `barattolo.token` stored; `/login?ritorno=/report` → `/report`, so the F26
   return path still works. `npx expo lint` and `npx tsc --noEmit` clean.

### Why

`docs/DESIGN.md` and the UX rubric assume an authenticated user reaches the
app; the critique that opened this session (`24/40`, one P0) found the primary
task unreachable from the interface itself on the only runnable surface.

### Touched

`Frontend/src/app/(auth)/login.jsx`.

---

## 2026-11-11 — UX realignment cycle 3: F74, F72, F61 closed

### What changed

1. **F74 — the catalog stops re-rendering on every keystroke.** The draft text
   left the catalog's state: `FilterBar` owns the string and
   `useServiceCatalog` receives it only when a search is applied
   (`3a9b7df`). Re-measured with the method the finding was measured with (22
   real keydowns, one `requestAnimationFrame` probe per key, 390 light, the
   pre-fix build in a worktree and the fixed build compared in one session):
   **16.6–37.6 ms, median 25.3 → 7.6–21.8 ms, median 10.3**, against a control
   «Nome» at 7–20.8 ms, median 11.6. Two corrections to what cycle 2 wrote: the
   49–73 ms of that session was the same pre-fix code (the dev bundle is not a
   stable instrument, so only same-session deltas are attributable), and the
   «~6 mutations per key» were the filter card's own churn inside the list's
   subtree — the 20 rows mutate **0** times before and after. No `memo` was
   added: the measurement reached the control, so that block closed `N/A`.
2. **F72 — the web has a refresh action, and it lives in one place.**
   `Screen` renders one neutral «Aggiorna» control above the content and
   outside the scroll, for every screen that already owns `useRefresh`; native
   keeps the gesture and shows nothing (`b8bbe28`). The home forwards the same
   pair it hands to its `FlatList`. The placement rule is in `DESIGN.md`
   § Refresh, next to the accent and border rules, together with why the
   control is `secondary` and not the filled accent.
3. **F61 — the operations log's vocabulary is pinned by a test.**
   `services/__tests__/staff.test.js` asserts the eight actions and four target
   types of `Backend/src/Entity/StaffOperationLog.php:19-20` from two literal
   lists, plus the value the backend adds later (returned raw), the
   prototype-key case and the two empty paths (`159cd77`, 20 tests). The demo
   log holds no rows and writing one would modify demo data, which the cycle
   forbids.
4. **The review's one P1, fixed in the file that owns the draft.**
   «Azzera filtri» in the empty state calls the hook directly, so after the F74
   change the field kept the old term while the chip announced a search that was
   no longer running. `FilterBar` now lets the draft follow the applied text when
   that becomes empty (render-phase adjustment: the effect form trips
   `react-hooks/set-state-in-effect`). Everything else the review raised is P2
   and is recorded in the plan's review section, not taken.
5. **Verification.** Three captures at 390 light in
   `docs/audits/screens-2026-11-11-final/` — the home with «Aggiorna», the
   typed filters before and after — each paired with its reference; the
   assertions, the console and both measurement tables are in that directory's
   README.

### Why

Cycle 2 closed wave 3 row by row and left three of them with a condition
instead of a fix: F74 needed a measurement and a file it had not scoped, F72
needed a placement decision, F61 needed evidence that did not depend on a demo
row. Cycle 3 pays all three, and records one pre-existing defect it met on the
way (Enter pressed in the same tick as the last character applies the previous
value) instead of folding it into this cycle.

### Touched

`Frontend/src/components/{FilterBar,Screen}.jsx`,
`Frontend/src/hooks/useServiceCatalog.js`,
`Frontend/src/app/(tabs)/index.jsx`,
`Frontend/src/services/__tests__/staff.test.js`,
`docs/DESIGN.md`, `docs/audits/ux-remediation-2026-11-11.md`,
`docs/audits/screens-2026-11-11-final/`, `docs/briefs/ux-realignment/*`.

### Attention (backend maintainer)

`Backend/` was read and never edited; nothing about the API contract changed.
The staff vocabulary in `services/staff.js` is still a hand-copied mirror of
`StaffOperationLog::ACTIONS`/`TARGET_TYPES`, now with a test that fails when the
lists and the map disagree. A new backend action needs the map extended: the
fallback prints the raw value rather than hiding the row.

---

## 2026-11-11 — UX realignment cycle 2: the five owed, and one voice per type

### What changed

1. **The four findings cycle 1 answered but never shipped.** F45 and F84 in
   `FilterBar.jsx`: no «Filtra» label is left in `src`, «Cerca» lives inside the
   field it governs, the typed-but-unapplied text is the amber chip
   «Cerca «testo»», and the always-visible foot reads «N filtri attivi ·
   Azzera» with the count coming from applied filters only. F59 in
   `edit-profile.jsx`: a broken image URL blocks its own field and offers
   «Rimuovi immagine», while name, surname, location and bio save and the broken
   URL never travels. F90 in `AuthShell.jsx` + the auth pair: one masthead, one
   alignment, the login form centred instead of hanging under the safe area.
2. **The profile borrow the direction owed.** `(tabs)/profile.jsx` is one sheet
   divided by 1px rules — identity, data, «Modifica profilo», «Area staff» (role
   only), «Aspetto», session line — instead of five cards of identical weight.
   «Esci» stays outside as a ghost button.
3. **Product rule: one offer and one request per user, not five and five.**
   `LIMITE_VOCI` goes to 1 (`6de86dd`) and every string derives from it:
   `SOSTANTIVI_VOCE` makes the cap read «1 offerta» / «1 ricerca», the counter
   keeps its ratio at the cap («1 di 1»), and an account over the cap reads how
   many rows to remove instead of «eliminane una delle N». Rows are never
   deleted: the cap blocks additions only. Suspended voices still occupy their
   place, because the client feeds the cap the whole list of that type.
   Affordances that add a voice disappear once the voice exists
   (`EntriesSection`, `PublicationsSection`, registration).
4. **Wave 3 closed on its own evidence.** F61 prints the operations log with the
   backend's vocabulary (`Backend/src/Entity/StaffOperationLog.php:19-20`).
   F73 is `N/A`: every staff list asks for one page with a fixed `limit`, so
   nothing queues. F74 is measured (49–73 ms per keystroke against a 23–31 ms
   control) and owes a fix in a file this cycle did not scope. F94 is closed on
   the captured console. F72 is `N/A` by decision, with its condition written.
5. **Verification.** Five captures at 390 light in
   `docs/audits/screens-2026-11-11-final/`, each paired with its "before"; the
   full assertions and the console are in that directory's README.

### Why

Cycle 1 closed with four findings whose answer existed and whose file no block
owned, one composition borrow the direction never spent, and five wave-3 rows
deferred on missing facts. Cycle 2 spent them, and took the one product decision
that had been waiting: a person should have one thing they offer and one thing
they search.

### Touched

`Frontend/src/components/{FilterBar,AuthShell,EntriesSection,PublicationsSection,EntryEditor}.jsx`,
`Frontend/src/app/(auth)/{login,register}.jsx`, `Frontend/src/app/(tabs)/profile.jsx`,
`Frontend/src/app/{edit-profile,staff}.jsx`,
`Frontend/src/services/{offer-request,staff}.js`,
`Frontend/src/services/__tests__/offer-request.test.js`,
`docs/changelog.md`, `docs/audits/ux-remediation-2026-11-11.md`,
`docs/audits/screens-2026-11-11-final/`, `docs/briefs/ux-realignment/*`,
`.gitignore` (browser MCP log directory).

### Attention (backend maintainer)

`Backend/` was read and never edited. The one-per-type cap has **no server
counterpart** — `grep -rn LIMITE_VOCI Backend/` returns nothing — exactly as the
previous cap of five had none. If the backend should enforce it, that is a
backend decision and the client constant becomes the mirror of it, not the
source.

---

## 2026-11-11 — UX realignment cycle: blocks 4b to 6

### What changed

1. **Block 4b — the direction, nine files, four commits.** One frame and one
   measure (`layout.maxCatalogo` becomes a reading measure, so a card fills its
   column and the screen has one right edge instead of three), three spacing
   beats, a new `PageHeader` that owns every title block, one card anatomy with
   the person's sentence as the headline and the category inline, one empty-state
   anatomy with an action only when a real one exists, a neutral web bar in place
   of the accent disc, and the type scale cut to five roles plus `label`.
2. **Block 4c — wave 2, fifteen files, six commits.** Heading depths
   (`aria-level`), `role="main"` and `role="navigation"`, polite live regions on
   the loading surfaces, a panel that caps at 85 % of the window and scrolls only
   its body with the primary action pinned outside it, confirm commands that
   stack before they truncate, one trailing action column per card, choice
   tracks that are `radiogroup`/`radio` on one scroll row, and the removed
   aliases of the type scale.
3. **Block 5 — verification, `docs/audits/screens-2026-11-11-after/`.** Ten
   captures on the real backend and the real web build, named to pair with the
   before set, plus a DOM check of the semantics that a picture cannot show:
   one `main`, one `navigation`, one level-1 heading, one live region on `/`, and
   a `radiogroup` with three `radio` children and no `tab` left on `/agreements`.
   Console: zero errors, one pre-existing react-native-web deprecation about
   `shadow*` props.
4. **Block 6 — closure.** `docs/DESIGN.md` is new: roles and rules read out of
   `tokens.js`, with no value restated (checked by grep, not by eye).
   `docs/audits/ux-remediation-2026-11-11.md` §9 carries the final status of all
   38 findings and §10 lists the four whose answer exists in the direction but
   whose file fell outside both blocks: F45 and F84 (`FilterBar`), F59
   (`edit-profile`), F90 (the auth pair), plus the profile-sheet borrow.

### Why

The cycle's objective was a refinement, not a redesign: the palette, the
contrasts, the radius scale and the touch floor were frozen from the start and
none of them moved. What moved was composition — where things sit, how many
times the accent is spent per screen, what an empty state is allowed to promise —
which is what the audit's collapsed dimension was measuring.

### Documents touched

`docs/DESIGN.md` (new), `docs/changelog.md`, `docs/briefs/ux-realignment/plan.md`,
`docs/briefs/ux-realignment/direction.md`,
`docs/audits/ux-remediation-2026-11-11.md`,
`docs/audits/screens-2026-11-11-after/` (new, ten captures and a README).

### Not done, on purpose

Wave 3 (F61, F72, F73, F74, F94) keeps its unblocking conditions. `origin/main`
is still 3 commits ahead, Backend only: the merge is a separate commit and needs
Andrea's word.

---

## 2026-11-11 — UX realignment cycle: block 0 to 4a

### What changed

1. **Realignment cycle opened with a plan and a brief**
   (`docs/briefs/ux-realignment/`), class L: audit, triage, direction,
   implementation, verification, closure. Refinement, not a redesign: the token
   palette, the contrasts, the radius scale and `target.min` are frozen.
2. **Block 0 — the duplicated plus.** `PublicationsSection` rendered
   `label="+ Aggiungi"` next to `icon="add"`, so the CTA read `+ + Aggiungi`.
   The label is now `Aggiungi` and the glyph comes from the icon alone.
3. **Block 1 — new audit, `docs/audits/ux-audit-2026-11-11.md`.** 38 findings on
   the same five dimensions and the same formula as 2026-11-10, with 37 captures
   in `docs/audits/screens-2026-11-11/` (real backend, light and dark, 390x844 /
   360x800 / 1280x800). **6.8/10**, and the document explains why that number is
   not "worse than 9.9": the previous 9.9 was a code-evidence re-measurement that
   did not open the app, and every visual row below is only visible on a screen.
4. **Block 2 — triage, `docs/audits/ux-remediation-2026-11-11.md`.** 29
   mechanical findings with the fix written out, 9 directional ones with the
   design question each poses, 29 files counted, split into three waves.
5. **Block 3 — direction, `docs/briefs/ux-realignment/direction.md`.** Three
   directions proposed, one chosen (one column, one beat), ten lines of
   motivation, the nine directional questions answered one by one, and the nine
   files block 4b may touch frozen in the document.
6. **Block 4a — wave 1 written: 12 of 14 findings closed in six commits.** The
   review note that a "No, torna indietro" destroyed (F44), the failed request
   drawn as "you published nothing" (F56), the reports error claiming a missing
   endpoint (F57), the login transition with two owners and a draft whose owner
   was always `null` (F58), the dead session landing on a login with no
   explanation (F91), the catalog row announcing only its description (F50), the
   detached retry (F87), the banner that stated its kind four times (F49), the
   close control named twice (F54), the four banners that never dismissed (F46),
   the cap line contradicting the count (F92), the literal `&apos;` (F60).

### Why

The app was measured, not assumed. Thirteen of the eighteen visual findings in
the audit are composition defects that no code read had ever produced, and the
two severity-3 findings destroy something the user wrote or leave the user
without a reason. The mechanical half of the cycle fixes what misinforms or
destroys; the direction half is written down before a single component moves,
so the same question is answered once instead of once per file.

### Touched

`Frontend/src/app/staff.jsx`, `Frontend/src/app/staff-users.jsx`,
`Frontend/src/app/(tabs)/index.jsx`, `Frontend/src/app/(tabs)/offer-and-request.jsx`,
`Frontend/src/app/(auth)/register.jsx`, `Frontend/src/app/(auth)/_layout.jsx`,
`Frontend/src/app/edit-profile.jsx`, `Frontend/src/auth/auth-context.jsx`,
`Frontend/src/components/PublicationsSection.jsx`,
`Frontend/src/components/ServiceCard.jsx`, `Frontend/src/components/ModalShell.jsx`,
`Frontend/src/components/Banner.jsx`, `Frontend/src/services/offer-request.js`,
`docs/audits/ux-audit-2026-11-11.md`,
`docs/audits/ux-remediation-2026-11-11.md`, `docs/audits/screens-2026-11-11/**`,
`docs/briefs/ux-realignment/**`.

### Attention (backend maintainer)

Two notes from the cycle. `EXPO_PUBLIC_DATI_FINTI` no longer exists in the
frontend (removed 2026-11-07 per decisions.md D011) but `AGENTS.md` still
describes it: the doc is stale, the code is right. And the operations log prints
the backend's raw `action`/`target.type` values with no label map (F61, open):
if the backend has a canonical vocabulary for those, it is worth sending one.

---

## 2026-11-10 — UX remediation: 3.6 to 9.9, 42 of 43 findings closed

### What changed

1. **Eight commits close 42 of the 43 findings** of the audit of the same day:
   the session loop (F26: a 401 leaves the protected screen with the reason, the
   return path and the typed text; F25: the login says the session expired), the
   error vocabulary (F27/F30/F33: the status becomes an Italian sentence with a
   cause and a next step, and the server text goes to the log), one modal shell
   for six panels (F15/F16/F38: Escape on the web, focus moved in, one close
   pattern, 44 pt), the accessible name of every form field (F14), the page
   language (F20), the home's payload back in the first screen with a polite live
   region (F10/F21/F32), confirmations before every irreversible action
   (F01/F02/F03), a search that asks the server (F11), and the copy that talked
   about the backend and about a removed swipe feed (F28).
2. **`docs/audits/ux-remediation-2026-11-10.md` is new.** The same rubric, the
   same severity scale and the same formula applied to the remediated tree:
   43 rows with `closed`/`open` and the `file:line` that proves each closure, the
   five dimensions recomputed, the arithmetic printed, and the list of what this
   pass did not execute. **Score 9.9/10** (usability 10, accessibility 10, states
   and copy 10, design system 10, platform 9.5), from 3.6.
3. **F42 stays open, and the re-audit says so.** The catalog is virtualised; the
   two staff lists still render inside the screen's scroll view, because they are
   one fixed server page of 50 rows with no append. A recorded gap instead of a
   silent one.
4. **Two fixes differ from what the audit proposed.** The dark `primaryPressed`
   had to move *up*, not down: `#3A8862` gives 3.98:1, `#42966C` gives 4.75:1
   (F18). The "Tutte le …" row (F05) exists only where the caller asks for it,
   because in registration that copy would be wrong.
5. **`Status` tables of `ux.md` and `accessibility.md` are replaced** with the
   measured post-remediation state — rows dated 2026-11-10, not appended — and
   say explicitly what a code reading can and cannot certify.

### Why

The audit measured the build and produced no fix. The brief for this session was
to bring the app to at least 8/10 on the same rubric without weakening a rule: the
score is linear in the number of open findings, so closing the ten best-ratio
items was never going to be enough.

### Verification

`npx tsc --noEmit`, `npx expo lint`, `npx jest` (49 tests, four suites) green on
the final tree and on **each of the code commits separately**, checked in fresh
worktrees. A fresh-context review found three P1 in the first pass — a search
that fired twice per keystroke, one Escape closing two nested panels (and losing
the typed note), and F22 marked closed with three hosts still drawing raw icons —
and all three are closed before this entry was written. The
runtime checks that need the Docker stack and a screen reader are listed as not
verified in the remediation file, with what would verify them.

### Documents touched

`docs/audits/ux-remediation-2026-11-10.md` (new), `docs/ux.md` and
`docs/accessibility.md` (`Status` section), `docs/decisions.md` (D023),
`docs/changelog.md`, `docs/briefs/ux-score-8/*`.

## 2026-11-10 — First full UX and accessibility audit of the frontend

### What changed

1. **`docs/audits/ux-audit-2026-11-10.md` is new.** Full audit of `Frontend/`
   against `ux.md` and `accessibility.md`: method and environment, the rubric
   with arithmetic behind every score (43 findings: 8 severity 1, 27 severity 2,
   7 severity 3, 1 severity 4), the finding table with `file:line` evidence and
   the evidence status of each (VERIFIED / DEDUCED), the ten improvements
   ordered by impact over effort, the explicit "not verified" list with what
   would verify it, and 23 screenshots in `docs/audits/screens/`.
2. **Verdict: 3.6/10 weighted** (usability 0.8, accessibility 2.8, states and
   copy 1.2, design system 8.1, platform 8.5). The one severity-4 finding is the
   session-expiry dead end: a 401 clears the session, leaves the user on the
   protected screen with a form that cannot be saved, and renders the backend's
   `Invalid JWT Token` as UI copy. Not a conformance claim in either direction —
   VoiceOver, TalkBack and native dynamic type were not exercised.
3. **Both `Status` tables are replaced with measured values**, same rows, dated
   2026-11-10 and pointing at the audit for the finding ids. Three claims that
   had been recorded as holding do not: the 44 pt target (pills 34 pt, checkbox
   30 pt, icon buttons 34 pt, modal close 38 pt), the screen-reader label on
   every interactive element (every `AppInput` field has no accessible name),
   and the polite live region as complete feedback (the catalog count and the
   append are silent). One contrast pair fails too: `onPrimary` on
   `primaryPressed` in the dark theme is 4.46:1.
4. **Audited live, not only by reading.** The Docker stack, the Expo web dev
   server and Chromium were driven for the walk: both viewports, both themes,
   200% reflow, keyboard walk, DOM inspection, and the 401 path forced with
   `page.route` and a forged token. No demo row was created, changed or deleted;
   the stack was started by the session and stopped at its end.

### Why

`D022` made `ux.md` and `accessibility.md` normative but their status tables
were written from a code read. The brief for this session was to test the app
against its own rules and to state what holds, what does not, and what could not
be checked, before the next feature work builds on unverified claims.

### Documents touched

`docs/audits/ux-audit-2026-11-10.md` (new), `docs/audits/screens/*` (new),
`docs/ux.md` and `docs/accessibility.md` (`Status` section only),
`docs/changelog.md`. No code was modified: the audit produced no fix.

---


### What changed

1. **`docs/ux.md` is new and normative.** Usability and accessibility
   definitions (ISO 9241-11, AgID, Legge 4/2004 art. 2), the six principles of
   an effective interface with the failure signature of each, the ten Nielsen
   heuristics with a Baratto-lo requirement and a verification method per row,
   the dark patterns refused by design with DSA art. 25 as the legal anchor,
   usability measurement, the four design phases as they apply here, a
   repeatable usability test protocol (3-5 participants, think-aloud, severity
   1-4, one-page report under `docs/briefs/<feature>/`), a review checklist, and
   the precedence rule that a design skill never overrides the project.
2. **`docs/accessibility.md` is new and normative.** The normative frame
   (Legge 4/2004, legge 18/2009, DL 179/2012, direttiva 2016/2102, EAA
   2019/882, EN 301 549, WCAG 2.1) with the honest statement that no obligation
   is triggered for this project and that WCAG 2.1 AA is adopted anyway; POUR;
   the AA criteria that bind a React Native app with a web build, each with the
   mechanism and the failure signature; the assistive technology pass; content
   rules; the per-screen verification procedure; the appendix for non-web
   documents; a checklist.
3. **The audit of the current app is recorded, not claimed.** Both files end
   with a table dated 2026-11-10 stating what holds (accessibility props on
   every interactive file, `FocusRing`, `target.min` at 44 pt, `borderInput`
   contrast, token discipline) and what does not (dynamic type at 200% never
   checked, `lang` missing on the web export, no announcement for the catalog
   count and the page append, no automated check, no usability test ever run).

`docs/frontend.md` now defers to those two files for UX and accessibility and
keeps only implementation conventions; `docs/README.md` maps them, lists them
in the reading order for building and reviewing a screen, and adds them to the
sources of truth. The pre-push gate is unchanged.

Touched: `docs/ux.md`, `docs/accessibility.md`, `docs/README.md`,
`docs/frontend.md`, `docs/decisions.md` (D022).

---

## 2026-11-10 — Agreements tab: three section tabs in a row, floating bell with its panel above

### What changed

1. **The three sections are tabs, seen one at a time.** `agreements.jsx` no
   longer stacks "Proposte inviate", "Accordi in corso" and "Conclusi" down the
   page: they are three buttons in a row (`Inviate`, `In corso`, `Conclusi`),
   each with the real count of its bucket (`0` included, so an empty section says
   "zero" instead of hiding the badge and looking like a failed load). The tab
   row is a `tablist` with `tab` children, the pattern `PillBar` already uses.
2. **The bell floats in the bottom-right corner.** The big "Proposte ricevute"
   card at the top is gone; the bell is a round button with the count of
   proposals to answer on its badge, and it opens its panel **above itself**
   (`Modal`, right-aligned, at most 70% of the window height, rows scrolling
   inside). A floating button has no room to grow downwards, so the old inline
   expansion would have been clipped or would have scrolled away. Tapping
   outside closes the panel; the close button is the only control announced, the
   backdrop is hidden from screen readers.
3. **The list scrolls clear of the bell.** `Screen` gets a larger
   `bottomSpacing` on this tab, so the last card ends above the floating button.

Behaviour of the data is unchanged: the same hook, the same pure classification,
no invented counts (no badge before the first response or without the viewer's
username), and every section still draws its own loading, empty and error state.

Touched: `Frontend/src/app/(tabs)/agreements.jsx`, `docs/frontend.md`.


### What changed

1. **Local database moved to the demo dump.** `Backend/compose.yaml` mounts
   `Context_and_DB_V2/barattolo_demo_20261108.sql` instead of the schema-only v3.1
   dump: 12 tables (the three agreement tables included) plus seed rows — 50
   categories, 30 users with password `demo`, 200 offers, 100 requests. The
   agreement endpoints answered `500` against the old dump because their tables
   did not exist. Re-import requires `docker compose down -v`, which wipes local
   dev data. **Backend maintainer: `compose.yaml` is a shared file, edited under
   the Docker ownership exception in `AGENTS.md` — this is the notification.**
2. **Home: the client-side relevance ordering and remote filter are gone.** The
   backend sorts the whole catalog by the viewer's request categories before
   pagination and accepts `isRemote=true|false`, so `src/services/relevance.js`
   and its test were deleted, `passaModalita`/`rigaFiltroModalita` removed, and
   the extra `GET /requests/mine` per home open dropped. The mode selector now
   sends the parameter; both "only among the rows already loaded" lines are gone
   because they were no longer true.
3. **Agreements tab wired to the real endpoints.** New `src/api/areas/agreements.js`
   (`get-agreements`, `create-exchange-agreement`, `send-agreement-response`,
   `cancel-agreement/{id}`), agreement normalisers, the pure classification in
   `src/services/agreements.js` with tests, `useAgreements`, `AgreementCard`, and a
   rewritten `agreements.jsx`: real bell count, tick/cross answering, three
   sections, explicit loading/empty/error states, "Annulla scambio" on accepted
   agreements. The delivery sheet stays read-only as "Scheda non compilata":
   `send-agreement-details` needs a `beneficiaryId` no row carries (G6).
4. **"Invia proposta" is real.** It sends the person (`offerente.id`), not a
   service: the agreement is born with that person and the service is named later
   in the sheet. Duplicates with the same person remain possible while the backend
   takes only a user id (G4), documented and not masked. Success closes the panel
   and shows a banner pointing to Accordi; failures show an Italian line.
5. **Gaps closed with their real shape.** G1 landed as an implicit relevance order
   (no `sort=relevance`) and G2 as `isRemote` (not `onlyRemote`); both recorded as
   landed in `backend-gaps.md` without renumbering. G6 gained the concrete
   consequence: the sheet cannot be filled from the app at all.

### Verified

Backend on port 8000, after the DB rebuild: login (`mario.rossi`/`demo`) →
proposal to `giulia.bianchi` (`201`, creator `Provider` with `response: true`) →
her list shows `response: null` → accept (`200`, `ACCEPTED`) → second answer
`409` → cancel (`200`, `VOID`) → self-proposal `400`, unknown user `404`.
Frontend gate: `expo lint` clean, `tsc --noEmit` clean, `jest` 37/37.

Browser pass on `npx expo start --web` (200 OK, no console errors): login
`mario.rossi`/`demo` → home shows 20 rows ordered by relevance → mode filter
"Solo da remoto" returns a different page from the server (no client-side
disclaimer line) → "Invia proposta" on a service closes the panel and shows
"Proposta inviata a @lorenzo.fontana. La trovi in Accordi." → on `lorenzo.fontana`
the bell reads "1 da rispondere" → the panel lists the proposal with tick/cross
and the counterpart in the accessible name → accept moves it to "Accordi in
corso" with "Scheda non compilata" and "Annulla scambio" → confirming the
modal moves it to "Conclusi" as "Annullato".

### Files

`Backend/compose.yaml`, `Frontend/package.json`, `Frontend/src/api/{index,normalizers}.js`,
`Frontend/src/api/areas/{agreements.js (new),services.js}`,
`Frontend/src/services/{offer-request,agreements}.js`,
`Frontend/src/services/__tests__/{relevance.test.js (deleted),agreements.test.js}`,
`Frontend/src/hooks/{useServiceCatalog,useAgreements}.js`,
`Frontend/src/components/{ServiceDetailModal,AgreementCard,FilterBar}.jsx`,
`Frontend/src/app/(tabs)/{index,agreements}.jsx`,
`docs/{api,backend-gaps,database,setup,frontend,decisions,changelog,README}.md`,
`docs/briefs/agreements-wiring/{plan-brief,plan}.md` (new; local process artefact,
committed so the next session can reconstruct every closed decision).

### Fixes applied after review

`normalizeAgreementSheet` now reads the wire keys the backend serialises
(`providerUsername`, `serviceDescription`, `beneficiaryUsername`); the sections
no longer claim "Caricamento non riuscito" before the first request; the focus
cleanup switches off the loading flags so «Carica altri» cannot stay stuck; a
send-proposal response can no longer act on a service opened later; `CONTESTED`
lands in "Conclusi" instead of vanishing; the bell label carries the count and
`expanded`; accept/refuse are distinguishable by screen reader; the mode filter
no longer applies unconfirmed text; `pendingCount`, `SCELTE_MODALITA` and
`listMyRequests` (orphans) are gone.

### Known doc drift (not introduced here)

`docs/decisions.md` D005 still names `php:8.3-cli` while `Backend/docker/Dockerfile`
ships 8.4. Historical entries are appended, never rewritten, so the correction
belongs in a new decision if the image pin becomes a topic.

---

## 2026-11-09 — Agreements: the endpoints repaired, the contract documented

### What changed

1. **The five agreement routes answer instead of failing.** `AgreementController`
   read the body from `$request` without ever receiving it, so
   `create-exchange-agreement`, `send-agreement-response` and
   `send-agreement-details` returned `500` on every call — with a correct schema
   too. The three actions take `Request $request` now, and body fields are read
   with `?? null`, so a missing key is a `400` instead of a warning that the dev
   error handler turns into an exception caught as `500`.
2. **404 stays 404.** `catch(\ResourceNotFound)` pointed at the global namespace,
   so the imported `App\Exception\ResourceNotFound` fell through to the generic
   `catch(\Exception)` and the response was `500`. Both occurrences (response and
   cancel) catch the real class.
3. **The delivery sheet names the service.** It used
   `ServiceManager::getUserOfferedService()` — the provider's *first* offer,
   whatever the exchange was about. The body carries `serviceId`, which must be
   an offer owned by the caller (`404` otherwise), plus `beneficiaryId`
   validation, `endDate > startDate` (`400`) and an `ACCEPTED`-only guard.
4. **`response: null` means "has not answered yet".** It was `false` for the
   invited participant, indistinguishable from a refusal, and both participants
   were stored as `Provider`. The invited participant is `BENEFICIARY` with a
   `null` response, the creator keeps `response: true`, and `sendResponse`
   refuses a second answer or a non-pending agreement (`409`) instead of
   overwriting the state.
5. **Cancelling no longer breaks on the enum.** The reference schema's
   `agreements.status` has no `CANCELLED` value while the code wrote it, so the
   update failed. Cancel produces `VOID` (the schema's "called off" state) and
   the unused `AgreementStatus::CANCELLED` case is gone. Only a participant can
   cancel; anyone else gets `404`.
6. **The sheet's status reaches the client.** `AgreementDetailsDTO` declared
   seven constructor arguments while the manager passed eight, so PHP dropped
   `status` silently. The DTO exposes it now (`UNCOMPILED`).
7. **`send-agreement-details` is a `POST`.** It was a `GET` that read a JSON
   body, which a browser cannot send: the sheet was unreachable from the app.
8. **Tests.** New `AgreementControllerTest` drives the whole lifecycle on the
   reference schema (create → second answer `409` → accept → sheet → inverted
   dates `400` → non-participant `404` → cancel → `VOID`). The route-inventory
   test was already red before this session — it listed three chat routes that no
   longer exist and missed `GET /api/chats/agreement/{agreementId}` — and now
   matches the router, agreement routes included.

### Why

The frontend needs the agreements tab against a real contract. The endpoints
existed but could not be called: three of them failed on a missing request
object, and the response model could not tell "has not answered" from
"refused". `docs/api.md` now documents the delivered contract, and
`docs/backend-gaps.md` G4–G8 state what is still missing (service on creation,
per-participant answers, ids in the rows, sheet confirmation, chat schema)
instead of describing endpoints that exist in another shape.

### Verified

- `php bin/phpunit`: 87 tests, 1062 assertions, 1 failure —
  `DeletedServiceControllerTest::testPermissionsAndInputValidation`, red before
  these changes (`DeletedServiceController.php:70` calls `getUser()->getId()`
  without the null guard, so an unauthenticated call is a `500` instead of a
  `401`). Left untouched: outside this fix.
- Live on the Docker stack, MySQL 8, against a scratch database imported from
  `barattolo_demo_20261108.sql` (dropped afterwards): create `201`, empty body
  `400`, self `400`, unknown participant `404`, second answer `409`, sheet `200`,
  inverted dates `400`, cancel `200` with `status = VOID`, and the row returns
  `agreementDetails[].status = "UNCOMPILED"`.

### Touched

`Backend/src/{Controller/AgreementController,Manager/AgreementManager,DTO/AgreementDetailsDTO,Entity/Agreement,Entity/AgreementProposal,Enum/AgreementStatus}.php`,
`Backend/tests/Functional/{AgreementControllerTest,RetainedApiTest}.php`,
`docs/{api,backend-gaps,changelog}.md`.

### Attention (backend maintainer)

These are the only `Backend/**` source changes made from the frontend side in
this session, under Andrea's explicit authorization (the file scope in
`AGENTS.md` keeps the backend read-only by default). Please review:

- `send-agreement-details` changed method from `GET` to `POST` and now requires
  `serviceId` in the body — a breaking change for any other client.
- `cancel-agreement` writes `VOID` instead of a state the schema does not have.
  If a distinct `CANCELLED` is wanted, the enum in
  `Context_and_DB_V2/barattolo_demo_20261108.sql` must carry it (that file is
  read-only here).
- `AgreementStatus::CANCELLED` was removed with no remaining references.
- The `DeletedServiceController` guard is still missing; its test remains red.

---

## 2026-11-09 — First code block: the five tabs against the real backend

### What changed

1. **API layer rewritten against the endpoints that exist today**
   (`feat: wire session and shared ui`). `api/index.js` now exposes login,
   registration, categories, catalog, reports and re-exports the three areas:
   profile, own services (list/create/update/suspend/delete/deleted/restore)
   and staff (users, promote, status, reports, claim, review, operations). The
   legacy routes are gone: `segnalazioni.php`, `notifiche.php`, `utenti.php`,
   `userRoleManager.php`, `userStatoManager.php`, `Accordi1_a_1/*`, with the
   fake-data branches that called them.
2. **In-app notifications removed.** `NotificationBanner`, `useNotifications`
   and `services/notifications.js` are deleted with the global banner: the
   backend exposes no notification endpoint, so there is nothing real to show.
   The session-expiry banner stays.
3. **Login and registration** (`feat: login and registration`): shared
   validators, generic failure copy (never says which datum is wrong), the dev
   tour hook removed, e-mail/password/field limits centralised. A section can be
   emptied; the screen stops before the request and says the backend requires one
   entry per section (`backend-gaps.md` G9).
4. **Home catalog** (`feat: home catalog with relevance-aware ordering`): the
   viewer's requests are loaded to rank the loaded page — services sharing a
   category first, then the rest, newest first inside each group. The screen and
   the module state the limit (the backend has no `sort=relevance`, G1).
5. **Service detail** (`feat: service detail modal`): publisher, location or
   “Da remoto”, date, categories, a declared-unavailable “what they offer and
   look for” block (G3), a working report action (`POST /reports`) and the
   proposal button visible-but-disabled with “disponibile a breve” (G4).
6. **Own services** (`feat: manage own services`): list, create, edit,
   suspend/reactivate, soft delete and the “Eliminati” section with restore; the
   “+” is the primary action of the screen; every write reloads both lists.
7. **Profile editing** (`feat: profile editing`): name, surname, location, bio
   and the pasted photo URL, validated in shape and by actually loading the
   image (a URL that does not load blocks the save). The profile screen shows the
   image, or the initials with a declared error, and takes name/surname from the
   profile endpoint instead of the frozen login snapshot.
8. **Agreements tab** (`feat: placeholder sections`): the three sections
   (sent, accepted, concluded) and the bell of received proposals, each in a
   declared-unavailable state; the bell shows no count (G4–G6). The legacy
   agreement state module and chip are deleted.
9. **Tests** (`test: cover ordering and validation`): jest with the `jest-expo`
   preset covers `services/relevance.js` and `src/validation/` (33 tests, 99%
   statements / 80% branches). The suite found a real defect and it is fixed: a
   missing category id became category `0` through `Number(null)`, which made
   every service look relevant.

### Why

The plan's last step turns the cleaned skeleton into a working first block: the
screens now talk only to routes that exist, every surface without a backend says
so instead of pretending, and the pure logic of ordering and validation is
covered by tests.

### Verified on web (Docker stack, Chromium via Playwright)

- Login with a real account; wrong credentials show the generic message.
- Registration: empty submit reports every missing field, region/province
  cascade works, categories load, account created (one offer and one request).
- Home: catalog renders (6 rows), relevance note visible, detail panel opens with
  publisher, location or “Da remoto”, G3 block, disabled proposal, and the report
  action navigates to `/report`.
- Report: `POST /api/reports` `201`, success card; a second attempt is described
  as “Hai già segnalato questa persona.” (`409`).
- Own services: list with both rows, suspend -> “SOSPESA” + “Ripubblica”,
  delete -> confirm -> “Ricerca eliminata.” + row in “Eliminati” with its date,
  restore -> “Ricerca ripristinata.” and the row back in “Cosa cerco”, create ->
  new request listed first.
- Profile: edit surname saved and shown by the profile screen; a photo URL that
  does not load shows the explicit error and blocks the save; theme selector and
  logout work; the staff entry appears for a staff account.
- Staff: reports list with status filters, claim (`IN ESAME`), review with
  outcome + note + confirmation -> `CONFERMATA` and read-only; operations log
  shows `REPORT_CLAIMED`/`REPORT_REVIEWED`; users list with translated
  role/status, promote/status commands hidden on staff and self; deactivate and
  reactivate a user.
- Agreements: three sections and the bell, all declared unavailable, no invented
  count.

### Touched

`Frontend/src/**` (API layer, screens, components, services, validation, tests),
`Frontend/package.json`, `Frontend/eslint.config.js`, `docs/{api,backend-gaps,frontend,decisions,changelog}.md`.

### Attention (backend maintainer)

1. **Registration cannot accept empty service lists today**:
   `AuthController::validateServices` rejects `[]` with a `400`, so the frontend
   states that one offer and one request are required. Requested as G9 in
   `docs/backend-gaps.md`.
2. **`onlyRemote` is silently ignored** by `GET /services`: unknown query
   parameters are not rejected, so the request returns `200` with the parameter
   unused. The frontend filters the loaded page and says so (G2).
3. **This Windows/Docker stack is slower than the 2026-11-04 measurement**, and
   the 10 s client budget is marginal: `GET /api/categories` measured 3–6 s warm
   and 20–24 s for the first call in a worker; every browser GET also pays a
   CORS preflight (~1–4 s). A screen that loads five endpoints can exceed 10 s on
   a cold stack, so a first load can show “Il servizio sta impiegando troppo
   tempo”. The budget was **not** changed (the recorded decision is that the
   server, not the client, is wrong); verification used a temporarily longer
   timeout, reverted before the commit. The real fix remains the volume strategy
   for `.:/app` on a Windows bind mount.
4. Jest adds dev-only dependencies (`jest`, `jest-expo`, `@react-native/jest-preset`,
   `react-test-renderer`) and makes `typescript` explicit: the gate calls
   `npx tsc`, and without the package npm fetched an unrelated `tsc` package.

---

## 2026-11-07c — Frontend aligned with the cleaned repository

### What changed

1. **Sync with the cleaned main.** `origin/main` merged: swipe, chains and
   tokens are gone from the backend, the old dumps moved to
   `Archive/DB_pre_November/`, and the deleted-service APIs (soft delete plus
   restore) arrived.
2. **Dead domain removed from the frontend** (`refactor: drop dead domain`):
   23 unreachable screens, cards, hooks and helpers, `api/finti/` in full, the
   automatic tour, the unused Expo template assets, and the fake-data branches
   inside the API layer. A reachability resolver measured the graph before and
   after: 75 files reachable, 0 orphaned. Three dead links found and closed
   (token card, chat and proposal buttons in the popup, agreement detail
   navigation); the popup now shows a disabled "Invia proposta".
3. **Rename to English** (`refactor: rename to English`): directories, file
   names, route paths and exported symbols. The five tabs are now `/`,
   `/match`, `/offer-and-request`, `/agreements`, `/profile`; the business
   routes are `/edit-profile`, `/report`, `/staff`, `/staff-users`.
4. **Documentation rewritten** for the five-tab model, the v3.1 schema and the
   JavaScript-only stack; `project-structure.md` and `ux.md` absorbed into
   `architecture.md` and `frontend.md`; new `backend-gaps.md` holding the eight
   endpoints the frontend needs and the backend does not have.
5. **Docker seed fixed** (`fix: seed the stack from the v3.1 dump`): the stack
   pointed at `barattolo_v2_18102026_token_redemptions.sql`, which the backend
   cleanup moved to `Archive/DB_pre_November/`. It now imports the dump named
   by `LAST_DB_TO_USE.txt`, so a fresh volume initializes again.

### Why

The frontend was a mature app built on a product the team had just retired:
swipe feeding, chain exchanges and compensation tokens. Half of it could not
work against the cleaned backend and none of it matched the schema the team
kept. This session brings the code, the routes and the documentation in line
with the five tabs the team agreed on, and states plainly what the backend
still owes.

### Touched

`Frontend/src/**` (deletions, renames, dead-link removal), `docs/**`
(rewritten set plus `backend-gaps.md`), `Backend/compose.yaml` (Docker
exception).

### Attention (backend maintainer)

1. `Backend/compose.yaml` changed under the documented Docker exception: the
   seed dump path now points at the v3.1 dump. No backend source, config or
   test file was touched.
2. **The v3.1 dump carries no seed rows**: a fresh database has an empty
   `categories` table, so publishing a service is impossible until reference
   categories are loaded. Please decide whether the dump or a migration should
   provide them.
3. The frontend requests eight endpoints, listed with payloads in
   `docs/backend-gaps.md`: relevance ordering, remote-only filter, public
   profile, proposals (send, list, accept, refuse), agreements (list, detail),
   the agreement sheet confirmation, and the chat attached to an agreement.

---

## 2026-11-04 — Registration failed: API latency above the client timeout

### Symptom

`/register` opened on the message *«Non riesco a caricare le categorie: senza,
non posso completare la registrazione»* and the «Crea account» button stayed
disabled. The categories request never completed, so the screen had no
catalogue to choose from.

### Root cause (measured, not guessed)

`GET /api/categories` took **4–23 s** against the Docker stack, far above the
frontend's 10 s `TIMEOUT_RICHIESTA_MS` (`Frontend/src/api/client.js`), so the
`AbortController` fired and the screen showed the error state. Two causes on
the backend container, both in `Backend/compose.yaml`:

1. `php -S` is **single-threaded**: parallel requests queue. Four concurrent
   calls measured 4.1 / 7.7 / 11.9 / 16.8 s — plain serialization.
2. opcache is **off in the CLI SAPI** (the SAPI `php -S` uses), and
   `opcache.validate_timestamps` was re-statting every file over the Windows
   bind mount: ~2 s of pure `stat` per request, ~4 s of recompilation without
   opcache.

### What changed

- `Backend/compose.yaml` (Docker exception, runtime only):
  `PHP_CLI_SERVER_WORKERS=4`, and the server now starts with
  `-d opcache.enable_cli=1 -d opcache.memory_consumption=256
  -d opcache.interned_strings_buffer=32 -d opcache.max_accelerated_files=20000
  -d opcache.validate_timestamps=1 -d opcache.revalidate_freq=60`.
- `docs/setup.md`: the backend row said PHP 8.3 (it is 8.4 since
  2026-11-03c), the “first boot” step described a bare `php -S`, the
  `curl /api/categories` check claimed `401` was correct (**it is public and
  returns `200`**), and three troubleshooting rows were added (this
  symptom, the 60 s opcache revalidation, the lost workers).

### After

`GET /api/categories`: 1.5 s warm, 1.4 s with four in parallel (was 4–23 s).
`POST /api/auth/register`: 3.2 s end to end, `201`. First request after a
container start is still the slowest (~7.7 s) because each worker warms its
own opcache — under the timeout, but the stack has to be up before the
screen is opened.

No frontend code changed: the 10 s budget was correct, the server was not.

### Attention (backend maintainer)

- Only the Docker exception files were edited (runtime, no source/config/test).
- `opcache.revalidate_freq=60` means a PHP file edited on the host can take up
to a minute to be served; `docker compose restart backend` forces it. If a
shorter window is preferred, lower the value — it costs ~2 s per request.
- The real fix for the remaining 1.5 s is the volume strategy (`.:/app` on a
  Windows bind mount); that is a backend/Docker decision, not a frontend one.

---

## 2026-11-03c — Docker stack fixes: PHP 8.4 image, test DBs, dump mount

### What changed

Docker-exception files edited so the backend stack and its test suite run:

- `Backend/docker/Dockerfile`: base image `php:8.3-cli` -> `php:8.4-cli`.
  `composer.lock` requires PHP ^8.4 (doctrine/collections 3.1.0,
  doctrine/orm 3.7.2); with 8.3 `composer install` failed and the backend
  container never started ("Dependencies are missing").
- `Backend/compose.yaml`: added read-only mount
  `../Context_and_DB_V2:/Context_and_DB_V2:ro` on the backend service.
  `tests/Integration/TokenRedemptionMigrationTest.php` resolves the dump at
  `dirname(__DIR__, 3)`, which inside the container (`/app` = `Backend/`)
  points to `/Context_and_DB_V2`.
- No other exception files touched. Test databases created at runtime only
  (`barattolo_test`, `chain_check_local_test`, `staff_check_local_test`,
  `token_check_local*`) — no file change.

Result: full backend suite green — 119 tests, ~1.7K assertions, 0 failures
(run of 2026-11-03, PHP 8.4.27 in container).

### Attention (backend maintainer)

- The Dockerfile now pins PHP 8.4 to match `composer.lock`; keep both in sync.

---

## 2026-11-03b — Docs realigned to schema v3.1 (swipe/chat/chains dropped)

### What changed

`docs/overview.md`, `docs/database.md`, `docs/api.md`, `docs/ux.md` and
`docs/README.md` now describe schema **v3.1 "senza swipe chat catene"**
(`barattolo_v3_1_senza_swipe_chat_catene.sql`, per `LAST_DB_TO_USE.txt`)
instead of the v2 dump.

- Exchange model restated as **pairwise and directional**: one agreement =
  one provider, one beneficiary, one service. Receive first, provide later;
  paths of any length emerge from independent agreements. The closed 3–4
  person chain is retired.
- Table map replaced with the v3.1 set (`service_queues`, `match_candidates`,
  `agreements`, `agreement_proposal`, `agreement_details`,
  `queue_associated_agreements`) and legacy tables removed from the map.
- **Swipe and chat marked "in development"**: v3.1 creates no tables for
  them; the backend owner is developing them. Old routes documented as
  reference only.
- Target navigation recorded as **four tabs** (Swipe, Cerco e offro, Chat,
  Profilo), with the current five-tab code marked as transitional.
- Gaps recorded explicitly: `credits` and `is_used` inert, token reservation
  incompatible with v3.1 until `ChainRepository::hasDirectProposal()` is
  reworked, no ordering/expiry on `service_queues`.

### Why

The frontend docs still described the retired feature set, so any agent
reading them (including this session) produced wrong answers about the
product. Source of truth: commit `8e6f52b` on `origin/main` (2026-11-01).

### Touched

`docs/overview.md`, `docs/database.md`, `docs/api.md`, `docs/ux.md`,
`docs/README.md`, `docs/changelog.md`. No code, no `Context_and_DB_V2/` file.

### Attention (backend maintainer)

- The v3.1 dumps and `Archive/` only exist on `origin/main`; this branch is
  behind and still lacks them locally.
- `Backend/compose.yaml` still seeds the v2 dump — switching the seed to v3.1
  is an open task owned by the Docker exception holder.
- Frontend code still follows the old five-tab model; realignment is pending.

---

## 2025-11-03 — Project governance, docs set, Docker Desktop stack

### What changed

1. **Root `AGENTS.md` created** — the rulebook binding AI agents and humans:
   frontend-owner file scope (read-only `Backend/` with the Docker
   exception), per-push main authorization, merge-not-rebase sync, English
   code/commits, lint+tsc pre-push gate, docs duty.
2. **`docs/` created** — 12 documents covering product overview,
   architecture, project structure, local setup, frontend-facing API, the
   MySQL v2 schema with its known gaps, frontend conventions, UX rules,
   decision log, workflow for humans, and this changelog.
3. **Docker Desktop stack rebuilt** (`Backend/compose.yaml`,
   `compose.override.yaml`, new `Backend/docker/Dockerfile` — the allowed
   exception per D008):
   - database **MySQL 8.0** (replacing the Postgres skeleton, D004),
     seeded on first boot from
     `Context_and_DB_V2/barattolo_v2_18102026_token_redemptions.sql`
     (`LAST_DB_TO_USE`);
   - **backend PHP 8.3 dev container** serving Symfony on host port 8000,
     with `composer install` + local JWT keypair generation on boot.
4. **Decision log opened** (decisions.md D001–D009) recording today's
   governance choices and the pre-existing team charter decisions.

### Why

The frontend owner needs an environment where the backend and its database
run under Docker Desktop (her owned subsystem), plus project docs precise
enough for every developer and every AI agent — docs are the project's
shared memory.

### Touched

`AGENTS.md`, `docs/**`, `Backend/compose.yaml`, `Backend/compose.override.yaml`,
`Backend/docker/Dockerfile`.

### Attention (backend maintainer)

`Backend/compose.yaml`, `compose.override.yaml` and `Backend/docker/`
changed under the ownership exception documented in AGENTS.md and
decisions.md (D008). No backend source, config or test file was touched. If
the runtime container approach conflicts with backend plans (e.g. its own
Docker strategy), coordinate on the compose files.
