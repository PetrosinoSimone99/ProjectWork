# Wiring audit — every field and control vs. the backend (2026-11-17)

Question this file answers: **does everything the frontend captures actually reach the
backend and get used?** Fields first, then controls (buttons, pressables, chips, toggles,
menu items, load-more, pull-to-refresh). Read-only audit: no source file was changed to
produce it.

Method: seven read-only scouts, one per screen group, each tracing
`UI element -> local state -> payload/query -> api function -> route -> backend controller`
and quoting both ends. The backend was read as truth (`Backend/src/Controller/**`), not the
docs. Five further scouts audited controls and the unused-API surface. Verdicts:

| Verdict | Meaning |
| --- | --- |
| USATO / FUNZIONA | captured, sent, read and used by the backend |
| INVIATO-NON-USATO | sent, but the backend ignores it (or the DB overwrites it) |
| UI-MORTO | captured or exposed in the UI, never put in any request |
| SOLO-VALIDAZIONE-LOCALE | only a client-side check, no field to send (legitimate when the backend repeats it) |
| BACKEND-CAMPO/PARAM-SENZA-UI | the backend accepts and uses it, nothing in the app sends it |
| PARAMETRO-PERSO | the element already holds the value, and the request drops it |
| CHIAMATA-SBAGLIATA | the control calls the wrong route/method |
| DISABILITATO-PER-SEMPRE | the control can never become enabled |

Findings are numbered `F*` (fields and data), `C*` (controls), `D*` (dead code, no user
impact), `B*` (backend surface the app never reaches, backlog). `G*` are the gaps already
recorded in [`docs/backend-gaps.md`](../../backend-gaps.md) and not fixable from the
frontend.

---

## Part 1 — Fields

### 1.1 Verified working, nothing to do

Each row was traced to a backend read/validation/persist; the full tables per screen live in
the session that produced this file and are summarised here.

| Screen | Fields that travel and are used |
| --- | --- |
| Login (`(auth)/login.jsx`) | `username`, `password` |
| Registration (`(auth)/register.jsx`) | anagrafica `name`, `surname`, `username`, `email`, `password`, `location` (composed `Comune - Provincia`); each entry `description`, `categoryIds`, `isRemote`, plus the person's `location` |
| Offer/request entries (`(tabs)/offer-and-request.jsx`) | `type`, `description`, `categoryIds`, `isRemote`, `location` (composed); suspend/reactivate sends `{isSuspended}`; delete soft; restore |
| Home catalogue (`(tabs)/index.jsx`) | `q`, `categoryIds`, `location`, `isRemote`, `page`, `limit` |
| Match tab (`(tabs)/match.jsx`) | `queueType` on create, queue id in the path on cancel |
| Agreements (`(tabs)/agreements.jsx`) | `otherParticipant`, `agreementId` + `response`, `fromRemote`, `endDate`, sheet accept path id, cancel path id |
| Chat (`chat/[agreementId].jsx`) | `message`, agreement id in the path, chat id in the path |
| Profile (`(tabs)/profile.jsx`, `edit-profile.jsx`) | `name`, `surname`, `location`, `bio`, `profileImageUrl` (only the changed ones travel) |
| Report (`report.jsx`) | `reportedUserId`, `reason` |
| Staff (`staff.jsx`, `staff-users.jsx`) | `q`, `accountStatus`, report `status`, review `status` + `reviewNote`, claim/promote/restore path ids, deleted-services `page`/`limit` |
| Notifications (`notifications.jsx`) | `page`/`limit`/`unreadOnly` on read, `{id}/read`, `{id}` delete |

### 1.2 F — gaps that change behaviour

| Id | Finding | Evidence | Severity |
| --- | --- | --- | --- |
| **F1** | **Photo URL validation disagrees with the backend.** The app accepts `http://` and requires a `.png/.jpg/.jpeg` ending; `ProfileController` requires **https** and imposes no extension. So `http://` passes the client and fails at save (400 with a generic message), while a valid https CDN URL without extension is blocked by the client and the backend would have accepted it. | `Frontend/src/validation/index.js:85-97`, `Backend/src/Controller/ProfileController.php:129-134`, message at `Frontend/src/app/edit-profile.jsx:41-42` | high (user-facing) |
| **F2** | **A typed photo URL is dropped from the PATCH while the preview is broken** (`if (!photoLoadFailed && ...)`). Declared in the UI ("Non salvo un indirizzo rotto"), so the behaviour is honest; the residual window (URL saved before `onError` fires) is accepted in a comment. Decision to confirm, not a bug to paper over. | `Frontend/src/app/edit-profile.jsx:219-228`, `:437-439` | medium (by design) |
| **F3** | **The service chosen for a proposal never travels**: only `otherParticipant` is sent. The backend picks the sheet's service itself (G4), and with two or more active offers `getOneOrNullResult()` can throw, so accepting can fail with a 500. Frontend cannot fix: it must not invent `serviceId` the backend ignores. | `Frontend/src/app/(tabs)/index.jsx:82-88`, `Frontend/src/api/areas/agreements.js:93`, `Backend/src/Controller/AgreementController.php:71-73`, `Backend/src/Repository/ServiceRepository.php:239-249` | high (blocked by G4) |
| **F4** | **`startDate` is sent, read, written and then overwritten by the column definition** (`timestamp ... ON UPDATE CURRENT_TIMESTAMP`). The UI already refuses to display it. | `Frontend/src/components/AgreementSheet.jsx:83`, `Backend/src/Manager/AgreementManager.php:165`, `Context_and_DB_V2/barattolo_15112026.sql:49` (G20) | high (blocked by DB) |
| **F5** | **Staff lists cannot go past the first page, and the role filter hides rows that were never fetched.** `listStaffUsers`/`listStaffReports` always call with `limit: 50` and `page` defaults to 1; `paginazione` comes back and is never used. The role pill filters the already-downloaded page only. | `Frontend/src/app/staff-users.jsx:97,110,155-156`, `Frontend/src/app/staff.jsx:116`, `Frontend/src/api/areas/staff.js:54-74`, `Frontend/src/api/normalizers.js:349-356,385-391` | high (staff sees a partial list) |
| **F6** | **Multi-category services lose every category but the first on edit.** The normaliser keeps `categoryIds`, the form exposes only `idCategoria` (first), `toUpdateBody` sends `[first]`, and the backend replaces the whole list. Unreachable today (the UI only creates one), silent loss on rows created elsewhere. | `Frontend/src/api/normalizers.js:258-266`, `Frontend/src/api/areas/services.js:118-120`, `Backend/src/Controller/OfferController.php:135-139` | medium |

### 1.3 D — dead state and dead code (no user impact, cleanup candidates)

| Id | Finding | Evidence |
| --- | --- | --- |
| **D1** | `getStaffUser` is exported and re-exported; no screen or hook calls it. | `Frontend/src/api/areas/staff.js:77`, `Frontend/src/api/index.js:50` |
| **D2** | `errors.form` is read by a banner but `validateReview` only ever produces `outcome`/`note`, so the banner cannot light up. | `Frontend/src/components/ReportReviewSheet.jsx:71`, `Frontend/src/services/staff.js:78-91`, `Frontend/src/app/staff.jsx:248` |
| **D3** | The `categories` prop of `StaffDeletedServicesSection` is never passed, so its fallback `nomeCategoria([], id)` always returns `null`. | `Frontend/src/components/StaffDeletedServicesSection.jsx:29,88`, `Frontend/src/app/staff.jsx:429-446` |
| **D4** | `REVIEW_OUTCOMES`, `REPORT_STATUSES`, `USER_STATUSES` are exported and never imported outside their module. | `Frontend/src/api/areas/staff.js:22-28` |
| **D5** | `categoryIds` is written on every owned service by the normaliser and read by nobody (the form uses `idCategoria`). | `Frontend/src/api/normalizers.js:266` |
| **D6** | In the registration flow, `voce.provincia`, `voce.comune`, `voce.localita`, `voce.stato`, `voce.id` are created by `nuovaVoce` and never rendered or sent; `LIMITE_LOCALITA` therefore validates an always-empty string. `SEZIONI[].tipo` and `sezione.motivoObbligo` are read by nobody on that screen. | `Frontend/src/services/offer-request.js:102-115,230-233`, `Frontend/src/app/(auth)/register.jsx:72-90,176-183`, `Frontend/src/components/EntriesSection.jsx:64` |
| **D7** | `form.voce.localita` goes stale as soon as provincia/comune change; the payload recomputes it, so nothing breaks — a future reader would read the value from form open. | `Frontend/src/app/(tabs)/offer-and-request.jsx:226-236`, `Frontend/src/components/EntryForm.jsx:78-98` |

### 1.4 B — backend surface no UI reaches (backlog, not defects)

| Id | Surface | Evidence |
| --- | --- | --- |
| **B1** | `GET /notifications` `unreadOnly` and `page > 1`: validated and used server-side, no toggle and no pagination in the app (G16 makes `page > 1` unreachable anyway). | `Frontend/src/hooks/useNotifications.js:26-31,55`, `Backend/src/Controller/NotificationController.php:23-41` |
| **B2** | Staff filters with no UI: reports `reporterId`/`reportedUserId`; operations `staffId`/`action`/`targetType`/`targetId`; deleted services `userId`/`type`; users/reports `page` beyond 1. | `Backend/src/Controller/StaffController.php:76-88`, `StaffOperationController.php:22-46`, `DeletedServiceController.php:61-86` |
| **B3** | Catalogue `sort` (`newest`/`oldest`) has no selector by decision D021; `POST /services` `isSuspended` is never sent on create (a new entry is published); registration's `categories`-by-name path is never used (the app sends `categoryIds`), and the `offers`/`requests` array in the register response is dropped by the normaliser. | `Frontend/src/api/index.js:189-191`, `Backend/src/Controller/MarketplaceController.php:110-111,134`, `AuthController.php:172-186,227-243`, `Frontend/src/api/normalizers.js:79-84` |

### 1.5 G — real gaps, pinned to the backend or the DB

`G4` (a proposal does not carry the service) and `G6` (no sheet names the service) block
F3. `G20` (the `start_date` column resets itself) blocks F4. `G16` (notifications pagination
is page-scoped) blocks the inbox from offering "load more". `G13`/`G17`/`G19`/`G21`/`G23`
(queues) are already handled defensively in the app and need no wiring change.

---

## Part 2 — Controls

Five further scouts traced every button, pressable, chip, pill, toggle, menu item, load-more
and pull-to-refresh: `element -> handler -> api function -> method + route -> backend
acceptance`, plus the value each control already holds.

Headline: **no dead control, no wrong route and no wrong HTTP method anywhere.** Every
`Pressable` in the audited screens has an `onPress`; every `AppButton` caller passes one;
route, method and body of `claim`, `review`, `promote`, `status`, `restore`, `deleted`,
`operations`, `auth`, `services`, `offer/request`, `profile`, `agreements`, `chat` and
`notifications` match the `#[Route]` attribute on the other side. What is left are one lost
identifier, two controls that can be pressed while the call cannot succeed, and four
coverage holes.

### 2.1 C — control gaps

| Id | Finding | Evidence | Severity |
| --- | --- | --- | --- |
| **C1** | **`PARAMETRO-PERSO`: the notification's `agreementId` is dropped.** `NotificationRow` only uses `dati.agreementId` to decide whether the row is pressable, then the screen pushes `/agreements` with no param, and the agreements screen reads no params at all. The label promises "Apri lo scambio di questa notifica" and lands on the generic list. The same pattern exists on the match tab (queue card -> `/agreements`). A real fix needs either a param the list consumes or a detail route; the backend has no `GET /agreement/{id}` today. | `Frontend/src/components/NotificationRow.jsx:95,176-178`, `Frontend/src/app/notifications.jsx:89`, `Frontend/src/app/(tabs)/agreements.jsx` (no `useLocalSearchParams`), `Frontend/src/app/(tabs)/match.jsx:274` | high (a promise in the copy) |
| **C2** | **"Segnala" is pressable while it cannot succeed.** Unlike "Invia proposta" (disabled through `invioDisabilitato`), the report button has no guard, and its handler returns silently when the owner id is not an integer: the tap does nothing and the panel does not even close. | `Frontend/src/components/ServiceDetailModal.jsx:261-264` vs `:151-156`, `Frontend/src/app/(tabs)/index.jsx:107-111` | medium |
| **C3** | **The entry form stays editable while a write is in flight.** During `salvataggio` only "Salva" and "Annulla" go down; category chips, mansione, remote checkbox and both location pickers stay active (in `edit-profile` every input is `editable={!saving}`). If the write succeeds the concurrent typing is discarded by `setForm(null)`; the cards of other rows (suspend/delete) also stay clickable, allowing two writes on the same list. | `Frontend/src/components/EntryForm.jsx:84-124` vs `Frontend/src/app/edit-profile.jsx:337-421`, `Frontend/src/app/(tabs)/offer-and-request.jsx:336,475-525` | medium |
| **C4** | **"Eliminati" (own services) is capped at the first page.** `listDeletedServices` sends no `page`/`limit`, the server answers 20 rows, and the section draws no load-more: beyond 20, rows and their "Ripristina" button are unreachable. (The staff equivalent paginates correctly.) | `Frontend/src/api/areas/services.js:144-152`, `Backend/src/Controller/DeletedServiceController.php:76-80`, `Frontend/src/components/DeletedServicesSection.jsx` | medium |
| **C5** | **`/staff` refresh is partial.** `load()` re-reads reports and operations only; `useRefresh(load)` and the web "Aggiorna" therefore leave "Servizi eliminati" stale until the screen loses and regains focus. | `Frontend/src/app/staff.jsx:106-149,164,211-217,413` | low |
| **C6** | **Actions are disabled for a reason that does not apply.** `PublicationsSection` passes `disabilitato={!categoriePronte}` to every card, so "Sospendi/Ripubblica" and "Elimina" (a `{isSuspended}` PATCH and a `DELETE`, neither of which needs categories) stay off while `GET /categories` is failing. The "Riprova" recovers it, so not permanent. | `Frontend/src/components/PublicationsSection.jsx:167`, `Frontend/src/api/areas/services.js:187-212` | low |
| **C7** | **Operations log is limited to 10 rows** with no load-more, unlike reports/users (50) and deleted services (20 + pagination). | `Frontend/src/app/staff.jsx:120` | low |

### 2.2 Missing control (not a broken one)

- **No logout in the web nav menu.** `WebNavMenu` exposes five tab links plus "Aggiorna";
  "Esci" lives only in the profile tab (`(tabs)/profile.jsx:373-379` -> `signOut` -> `clearSession`,
  which works). If the intent was a logout reachable from the web chrome, the control is
  missing rather than dead.
- **`SessionExpiryBanner` has no action** by decision: the backend exposes no refresh route
  (`Frontend/src/components/SessionExpiryBanner.jsx:5-9`). Correct, listed so it is not
  re-audited as an omission.

### 2.3 D (continued) — dead branches and dead API surface

Sweep method: a regex pass over `Frontend/src/**` (excluding `__tests__`) for
`Pressable`/`Touchable*` without `onPress`, literal no-op handlers, `disabled={true}`,
`editable={false}` and `TODO|FIXME|coming soon`; then every `export` in `src/api/**`,
`src/services/**`, `src/hooks/**` and `src/components/**` was matched against the other
non-test files, and every `#[Route]` in `Backend/src/Controller/**` against the paths the
api layer builds.

Controls: the only `Pressable` without `onPress` is the one inside
`Frontend/src/components/TextLink.jsx:31`, which is legitimate (`Link asChild` owns the
press). No literal `disabled={true}`, no no-op handler, no `TODO` attached to a control
(the three `TODO(backend)` markers are comments on constants). `getStaffUser` is the only
api export with no call site (D9), and `GET /api/staff/users/{id}` is the only backend
route with no UI.

| Id | Finding | Evidence |
| --- | --- | --- |
| **D8** | The staff gate and the profile role label both branch on `ADMIN`, but `roleFromRoles` maps only `ROLE_STAFF`/`ROLE_USER` and `ROLE_ADMIN` exists nowhere in `Backend/` nor in the dump. Dead branch, fail-closed today. | `Frontend/src/services/staff.js:62-66`, `Frontend/src/app/(tabs)/profile.jsx:241`, `Frontend/src/api/normalizers.js:36-48` |
| **D9** | `getStaffUser` and its re-export wrap `GET /staff/users/{id}`, which exists and works; no screen or hook imports it, so that route has no UI. | `Frontend/src/api/areas/staff.js:77-83`, `Frontend/src/api/index.js:50`, `Backend/src/Controller/StaffController.php:44-49` |
| **D10** | Exports used nowhere at all, not even in their own module: `REPORT_STATUSES`, `USER_STATUSES`, `descriviVoce`, `rimuoviVoce`, `describeUser`, `isValid`. | `Frontend/src/api/areas/staff.js:25,28`; `Frontend/src/services/offer-request.js:152,252`; `Frontend/src/services/staff-users.js:102`; `Frontend/src/validation/index.js:32` |
| **D11** | 33 further exports are used only inside their own module (constants, normaliser helpers, poll intervals, label tables). Not dead, only unnecessary public surface: no action unless the file is touched anyway. | scan output, e.g. `Frontend/src/api/normalizers.js:27` (`toTextOrNull`), `Frontend/src/hooks/useChat.js:14` (`CHAT_POLL_MS`), `Frontend/src/services/queues.js:11,17` |

---

## Part 3 — `/ship` prompts

How to use: paste **one** line at a time into a fresh session, in this order. Each cycle
writes its own `docs/briefs/<slug>/plan.md` and stops once for the plan; the audit file is
the single source for the findings, so the task line only names the ids. `Backend/` stays
read-only in every cycle (project rule), `Frontend/` is the only writable tree, and the
pre-push gate is `cd Frontend && npx expo lint && npx tsc --noEmit` plus `npx jest`.

Two findings are deliberately in **no** prompt: **F3** (the proposal does not carry the
service) and **F4** (`start_date` overwritten by the column). Both are backend/database
gaps (`G4`, `G20`), documented in [`docs/backend-gaps.md`](../../backend-gaps.md); a
frontend cycle can only pretend to fix them.

### 3.0 Cycle status

One state field, the same vocabulary `/ship` uses for a plan (`TODO` / `DONE` / `N/A`).
The row is **not** flipped by the reader: the cycle flips its own row **in the same commit
that closes it** (together with its `docs/changelog.md` entry), so this table is the only
place that says which cycles are already done. A cycle whose findings turned out to be
`N/A` is closed as `N/A` with one line of why, never left `TODO`.

| Cycle | Class | Findings | Prompt line | Stato |
| --- | --- | --- | --- | --- |
| 1 — conformance and guards | M | F1, F2, C2, D1-D4, D8-D10 | §3.1 | DONE |
| 2 — staff lists reachable | M | F5, C5, C7 | §3.2 | DONE |
| 3 — entry form integrity | M | F6, C3, C6 (optional D5-D7) | §3.3 | TODO |
| 4 — notification deep link | S/M | C1 | §3.4 | TODO |

### 3.1 Cycle 1 — conformance and guards (class M, ~8 files)

```text
/ship Wiring conformance (F1, F2, C2, D1-D4, D8-D10; when done flip row 1 of section 3.0 in the audit to DONE) from docs/briefs/wiring-audit-2026-11-17/audit.md
```

In scope:

- **F1** — make the photo URL rule the backend's rule: `https` only. Decide with the lock
  whether the `.png/.jpg/.jpeg` ending stays as a client rule (it is stricter than the
  server today) or goes away; the copy of the error follows the decision.
- **F2** — keep "do not save a URL whose preview failed", but make the reason visible where
  the consequence is (the save button currently just sits disabled), and keep "Rimuovi
  immagine" as the way out.
- **C2** — "Segnala" gets the same guard as "Invia proposta": either disabled with the same
  condition, or the handler closes the panel and says why when the owner id is missing.
- **D1, D2, D3, D4, D8, D9, D10** — remove the dead code and the tests that assert it.

Out of scope: anything under `Backend/`; F5, F6, C1; new endpoints.
Done: gate green, `npx jest` green, a `docs/changelog.md` entry in the same commit, and
`docs/api.md` if the photo rule is stated there; flip row 1 of §3.0 to `DONE` in that same
commit.
Open lock questions: (1) extension required or not; (2) with a broken preview, refuse to
save (today) or save and let the row show a broken image.

### 3.2 Cycle 2 — staff lists reachable (class M, ~6 files)

```text
/ship Staff lists reachable (F5, C5, C7; when done flip row 2 of section 3.0 in the audit to DONE) from docs/briefs/wiring-audit-2026-11-17/audit.md
```

In scope:

- **F5** — pagination for `/staff-users` and for the report list on `/staff`, using the
  `pagination` the responses already carry; the role pill stops being a silent lie (either
  it says it filters the loaded page, or it keeps fetching pages while active — lock
  question).
- **C5** — the `/staff` refresh (pull-to-refresh and the web "Aggiorna") also re-reads
  "Servizi eliminati".
- **C7** — the operations log paginates like the other two lists.

Out of scope: backend params (`role`, `reporterId`, `staffId`, ...). If a server-side role
filter is wanted, record it in `docs/backend-gaps.md` instead of faking it.
Done: gate, tests for the page-advance and the role-filter copy, changelog, and row 2 of
§3.0 flipped to `DONE` in the same commit.

### 3.3 Cycle 3 — entry form integrity (class M, ~8 files)

```text
/ship Entry form integrity (F6, C3, C6; when done flip row 3 of section 3.0 in the audit to DONE) from docs/briefs/wiring-audit-2026-11-17/audit.md
```

In scope:

- **F6** — a service with several categories keeps them after an edit: either
  `CategorySelector` becomes multi-select (contract already accepts a list) or the PATCH
  resends the untouched `categoryIds` when the single selection did not change. Lock
  question: multi-select UI now, or preserve-only.
- **C3** — the whole form is locked while a write is in flight (category chips, mansione,
  checkbox, both pickers), matching `edit-profile`; the other rows' actions are locked too.
- **C6** — suspend/delete stop depending on `GET /categories` succeeding.
- Optional cleanup if the file is open anyway: **D5, D6, D7** (dead state on the entry
  shape, and the stale `form.voce.localita`).

Out of scope: the legacy-location clear on edit (documented decision, `offer-request.js`),
unless the cycle adds a visible warning — a candidate, not a requirement.
Done: gate, a test where a two-category service survives an edit, changelog, and row 3 of
§3.0 flipped to `DONE` in the same commit.

### 3.4 Cycle 4 — notification deep link (class S/M, ~3 files)

```text
/ship Notification deep link (C1; when done flip row 4 of section 3.0 in the audit to DONE) from docs/briefs/wiring-audit-2026-11-17/audit.md
```

In scope: the notification row already knows `dati.agreementId`; carry it into
`/agreements` as a route param and have the agreements screen open on that agreement
(expand / scroll / highlight) when the param is present. The match tab's queue card has the
same dead end and follows the same fix.

Out of scope: a new `GET /agreement/{id}` route. Frontend only.
Done: gate, a test on the param plumbing, changelog, and row 4 of §3.0 flipped to `DONE` in
the same commit. If the triage says the agreements screen cannot honour the param without
new state, that is a lock question, not a reason to drop the id again.

### All at once (not recommended)

```text
/ship Everything in docs/briefs/wiring-audit-2026-11-17/audit.md except F3 and F4: F1, F2, F5, F6, C1-C7 and the D items, in that order
```

That is an L cycle mixing four unrelated subsystems (validation, staff, entry form,
navigation). It is listed only because it exists; the four cycles above keep each lane on
its own files and each review at a readable size.

---

## Provenance

Field pass: seven read-only scouts (auth, profile/report, entries, home+filters+match,
agreements+chat, staff, notifications+other profile), each quoting both ends of every key.
Control pass: four read-only scouts (home+detail, entries+profile, agreements+chat+
notifications, staff+nav+auth) plus a mechanical sweep for handlerless controls, unused
exports and uncalled backend routes. No file was modified; the two spot checks re-run by
hand afterwards (payload builders in `api/areas/services.js`, `photoUrlError` vs
`ProfileController::validateField`) matched the scouts' reports.
