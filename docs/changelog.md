# Changelog

Session log of project-level changes that affect how the codebase is built,
run, or understood. Newest first. Each entry says what changed, why, and the
documents/code touched.

---

## 2026-11-10 — UX remediation: 3.6 to 9.9, 42 of 43 findings closed

### What changed

1. **Seven commits close 42 of the 43 findings** of the audit of the same day:
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

`npx tsc --noEmit`, `npx expo lint`, `npx jest` (37 tests) green on the final tree
and on **each of the seven commits separately**, checked in fresh worktrees. The
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
