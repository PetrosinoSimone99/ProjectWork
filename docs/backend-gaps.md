# Backend gaps

What the frontend needs and the code does not provide yet, split by **who can
close it**. Every block keeps its `G` number for good: audits, briefs and
commits cite them, so a number is never reused and never renumbered.

- **A — Backend.** Open, real, read from source by both sides. Ordered by the
  priority agreed with the maintainer on 2026-11-18.
- **B — Ours.** The product/API already gives what the block asked for, or the
  remaining question is a decision this side owes. No backend request is open
  here.
- **Closed.** Landed, retired or retracted. Kept as one paragraph each, because
  the number still shows up in older documents.

A block moves out of A the moment it lands: its shape goes to `api.md`, its
paragraph moves to Closed. Nothing in this file invents data: until a block
lands, the matching frontend surface says "not available".

**Provenance.** The backend maintainer reviewed every block on 2026-11-18
against `main` (`089cc78`) and `origin/andrea-frontend` (`3bbe361`) plus the
reference dump, reading only: no file changed, no database touched. His verdict
is folded into each block. Two reproductions in the original version were
conclusions of a run rather than readings of the code and were not re-run:
`G16` (wrong, retracted) and `G20` (defect real, mechanism corrected).

## A. Backend — open and real

Agreed order: `G24` first; then the integrity of agreements, queues and credits
(`G10`, `G18`, `G19`); then `G20`; then matching and the scheduler (`G28`,
`G12`); then error bodies and the login throttle (`G25`, `G26`). The rest are
independent.

### G24 — No chat route checks that the caller is a participant

The **first** backend item. None of the four chat routes compares the JWT user
with the participants of the chat or of the agreement:

- `ChatManager::getOrCreateChat` (`Backend/src/Manager/ChatManager.php:46`)
  fetches the chat by agreement id and, when it is missing, creates it from the
  agreement's proposals — it never reads the calling user. `GET
  /chats/agreement/{agreementId}` returns the history of **any** agreement id to
  **any** authenticated account, and creates its chat as a side effect.
- `ChatManager::sendMessage` (`ChatManager.php:78`) fetches the chat by id and
  writes a message for the calling user without checking `chat_participants`.
  `POST /chats/send-message/{chatId}` lets any authenticated account post into
  any chat, and notifies the real participant (`ChatManager.php:98`).

`getUserChats` and `getNewMessagesForUser` **are** scoped by participant, so the
two cursor routes are safe; the hole is exactly the pair the screen drives.
Requested: the caller verified against `chat_participants` before reading, before
creating the chat and before writing, answering `403` (or `404` if the existence
of a chat should not leak). Confirmed as their first priority.

**Why the thinnest client change is not the fix.** The app offers the chat only
from an `ACCEPTED` row of the caller's own agreements (`AgreementCard`,
`puoAprireChat`), nothing links to `/chat/<id>` from free text, and no route
carries an id typed by a user. A person who types another account's agreement id
still reads that chat; there is nothing the client can do, and the app does not
pretend otherwise. Recorded so nobody reads "ACCEPTED only" as enforced.

### G10 — One queue can produce several agreements

`QueueHandler::__invoke` (`Backend/src/Handler/QueueHandler.php:46-68`) loops
over every relevant queue, creates an agreement for each, and overwrites
`$userQueue->setAgreement()` on every iteration: one offer in a city with three
waiting requests becomes three agreements, two of which the queue no longer
points at and the UI cannot reach.

**Branch state.** `origin/main` already carries the `break` after the first
match (`089cc78`); `andrea-frontend` (`3bbe361`) does not, and the loop above is
what this working copy runs. The `break` alone does not close the block: still
missing are one transaction around agreement + both queue statuses +
notifications, a lock and a re-read of both queues so two concurrent workers
cannot pair the same queue twice, and idempotence for a re-delivered `QueueId`
message (Messenger retries the same message after a failure). Today the writes
flush separately and `NotificationService::notify` flushes the whole unit of
work (`Backend/src/Service/NotificationService.php:16-18`).

### G18 — Accepting an agreement can leave half a sheet and answer 500

`AgreementManager::sendResponse` calls `createBlankDetails` twice on acceptance,
and each call resolves the participant's service with
`ServiceManager::getUserOfferedService` →
`ServiceRepository::findUserOfferedService`, which ends in `getOneOrNullResult()`
(`Backend/src/Repository/ServiceRepository.php:239-249`, the lookup at `:248`).
An account with more than one service of that type throws
`NonUniqueResultException` on the second call: the first sheet row is already
flushed, the agreement is already `ACCEPTED`, and the route answers `500`
(`Backend/src/Manager/AgreementManager.php:140-147`). Measured on `mario.rossi`
(seven offers) with the pre-2026-11-16 demo seed: the pair ends with one sheet
row out of two. Today's seed gives every account exactly one offer and one
request, so the case needs two services of the same type to reproduce. The app
copes — it draws the row that exists and offers only the action that row allows
— but the missing row is a lost write, not a UI state.

**Agreed fix.** `setMaxResults(1)` was withdrawn: it would pick an arbitrary
service and **hide the duplicates**. Instead: enforce **one non-deleted offer of
that type** in the backend (suspended rows included), clean the duplicates that
exist, answer a controlled error when the service is absent, and keep the
service chosen at creation on the agreement (`G4`). Acceptance writes response,
status, both sheet rows and notifications in **one transaction** — today state
and sheets are flushed separately.

### G19 — Creating a queue needs exactly one service of that type

`ServiceQueueManager::createServiceQueue` looks the account's service up with the
same `getOneOrNullResult()`. Measured: zero services of that type throw an
uncaught `TypeError` (the controller catches `Exception`, `TypeError` is an
`Error`, and the missing `use Exception` of `G13` means that `catch` matches
nothing at all), two or more throw `NonUniqueResultException` → `500`. Worse, a
`REQUEST` queue spends the credit **before** the lookup
(`ServiceQueueManager.php:69-81`), so a failing creation can cost a credit
without producing a queue. The app gates on "exactly one" and says why rather
than calling (`Frontend/src/app/(tabs)/match.jsx`).

**Agreed fix.** Checking the service first is not enough: service and
availability are checked, queue and credit are written in one transaction, and
the balance is protected against concurrent requests (conditional `UPDATE` or a
lock). The "one non-deleted offer per type" rule of `G18` removes the ambiguity
at the source. The seeded accounts hold exactly one offer and one request each,
so anything after the fix works without new data.

### G20 — `agreement_details.start_date` cannot hold a date

The column is `timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP` in the
reference dump (`Context_and_DB_V2/barattolo_15112026.sql`, table
`agreement_details`). Measured on 2026-11-15: payload `startDate: 2026-12-01` →
row `start_date = 2026-11-15 20:34:16`, `end_date = 2026-12-05 00:00:00`. The
card shows what the API returns, so the start date a reader sees is the last
update time, not the date that was typed.

**Mechanism corrected.** `ON UPDATE CURRENT_TIMESTAMP` does **not** overwrite a
value assigned explicitly by the `UPDATE` statement: it fires when an `UPDATE`
changes other columns and leaves the column unassigned — which is what a sheet
confirmation can do, so the defect is real and the fix stands (drop `ON UPDATE`
from the domain dates with a migration). Two cautions: the measurement above
must be re-measured on MySQL before it is quoted as fact (`B`, below), and the
project's tests **strip** `ON UPDATE` while converting the schema, so a green
suite cannot prove the problem is absent. The trap applies to every datetime
column a client writes.

### G28 — The matchmaking worker cannot match anything

`QueueHandler::extractKeywordsFromDescription` reads
`src/Dictionaries/<category description>.json` for the category of the queue's
service. The lookup key is the **fine-grained** category of the queue's service;
the shipped files are named after **macro areas**. Only `Fitness` and
`Giardinaggio` exist on both sides, so every other category makes
`file_get_contents` return `false`, `json_decode` yield `null` and
`array_keys(null)` throw; Messenger retries until it fails.

Evidence (2026-11-17, local stack), one account with exactly one offer:

```text
$ docker compose exec backend php bin/console messenger:consume async --limit=1 -v
[warning] Error thrown while handling message App\Message\QueueId. Sending for retry #2 ...
Error: "Handling "App\Message\QueueId" failed: Warning:
file_get_contents(/app/src/Handler/../Dictionaries/Assistenza computer.json):
Failed to open stream: No such file or directory"
```

No `agreements` row, neither queue moves to `IN_PROGRESS`, no `MATCH_CREATED`
notification. The failure precedes every location/category/remote/keyword rule,
because the extraction runs unconditionally on the handled queue.

**Branch state.** `origin/main` (`e83e503`) ships eleven dictionaries
(`Bricolage`, `Cucina`, `Educazione`, `Fitness`, `Giardinaggio`, `Informatica`,
`Lingue`, `Musica`, `Pulizie`, `Sport`, `Programmazione`); this branch ships one
(`Programmazione.json`). So on `main` the two categories literally named after a
macro area can match; here nothing does. The two queues the demo seed leaves
`OPEN` are in `Cucito` (id 11) and `Scrittura e revisione` (id 25), so the
measured failure is unchanged on both branches.

**Agreed fix.** A stable key between a category and its dictionary (not the
human-readable description), tolerant loading of a missing or invalid JSON file,
and an explicit decision on what a service with no keywords may match (a product
question, `B`). Until then the local stack has **no matchmaking**: the match tab
shows queues, never a match.

### G12 — Nothing consumes the scheduler, so `COMPLETED` is never written

`App\Schedule\AgreementEndDateChecker` is registered (`bin/console
debug:scheduler` lists `every 30 minutes … ServiceCallMessage`), but the task
runs only while a worker consumes `scheduler_default`, and this stack starts
none: an agreement whose end date passed stays `ACCEPTED` forever. The same task
is the only path that credits +1 for a queue-born agreement (`11cffda`) and,
since `256b985`, the one that closes that agreement's queues through
`CloseQueueUseCase`. With no worker, none of it happens.

Two smaller defects next to it: the notification type it writes is
`agreement_completed`, lower case, unlike every other `AGREEMENT_*` type; and
`$details->getStartDate()->format(...)` is called on a nullable column
(`Backend/src/Schedule/AgreementEndDateChecker.php:49`) inside a loop that can
find details without one.

**Scope of the claim.** That this repository starts no consumer is a fact about
this repository, not proof that no worker runs elsewhere. Confirmed. Their plan:
a persistent process for `scheduler_default`, one notification-type convention,
explicit handling of a missing date, and completion + credit written in one
transaction.

### G25 — A `500` body carries the exception message

Five handlers append `$e->getMessage()` to the `500` sentence: the three chat
routes (`Backend/src/Controller/ChatController.php:44,81,122`) and, in
`AgreementController`, the agreement cancellation (`:255`) and the sheet
confirmation (`:287`). The route that **writes** the sheet answers a fixed
`Internal Server Error` (`:222`), so it is not on the list (corrected
2026-11-18). This is the general form of **A3** in
`audits/api-authz-2026-11-17.md`. The sentence the app shows comes from
`api/client.js`, never from the body, but the text still leaves the server: it
reaches any caller and any proxy log, and it can name a table, a query or an
internal path. Requested: log the message on the server with the rest of the
context and answer a fixed sentence, as every other controller already does.

### G26 — Login has no rate limit

`POST /auth/login` compares the password and answers; there is no `rate_limiter`
in `Backend/config/**` and no per-account or per-IP counter. Measured in
`audits/api-authz-2026-11-17.md` (**A5**): fifteen wrong passwords in a row cost
nothing and the next correct one succeeds. Requested: a login throttle with
thresholds per account **and** per IP, a shared store, answering `429`. The app
already maps `429` to «Troppe richieste in poco tempo`
(`Frontend/src/api/client.js`), so nothing changes on this side. A limit sitting
in front of the app cannot be seen from these files and is not assumed.

### G4 — A proposal that names the service

`POST /create-exchange-agreement` takes only `{otherParticipant}`: the exchange
is created without the service it is about, and the delivery sheet names it
later. The product asks for the opposite (`overview.md`): the sender proposes one
specific service and the recipient reads which one before answering. Requested:
`serviceId` in the creation body, `400` for one's own service, `409` when the
same pair already has a pending exchange for that service. Confirmed: the
creation receives the participant and never the service. Their plan keeps the
chosen service on the agreement, checks its owner and availability, and refuses
a pending duplicate with an atomic rule.

Splitting the agreement list into `sent` and `received` remains a **contract
extension** they would add later; it is a decision for us, not a defect (`B`).

### G6 — Agreement rows with ids

`GET /get-agreements` returns the counterpart's username only: no user ids, no
`serviceId`. Requested: `serviceId` and the counterpart `id` in each row.

**Narrowed 2026-11-15.** The route reads only
`{agreementId, fromRemote, startDate, endDate}` and the sheet rows carry
`providerUsername` + `beneficiaryUsername`, so each side knows which row it fills
and which it confirms without a user id. The app calls both sheet routes
(`send-agreement-details`, `accept-agreement-details`). What remains: `serviceId`
(a sheet cannot name another of the provider's services without it) and the
counterpart `id` (a sheet cannot link back to a profile).

**Concluded state is not a gap.** `COMPLETED` exists and the scheduler writes it,
so the conclusion depends on `G12`, not on a new status. Consequence for the
client: a passed `endDate` must not be read as "the exchange is complete" — a
sheet with rows still unfilled is not.

### G11 — Queue matching compares location by exact string

`ServiceQueueRepository::getRelevantQueues` filters with `'location' => $location`
(`Backend/src/Repository/ServiceQueueRepository.php:29`). The app composes
`"Comune - Provincia"` (`Frontend/src/services/italian-locations.js`, e.g.
`Milano - Milano`) and the column stores free text, so only a queue composed the
same way matches: one seeded or typed by hand as `"Milano"` never does. The
column is `varchar(100)` against `varchar(255)` on `users` and `services`
(`Context_and_DB_V2/barattolo_15112026.sql:193`). Confirmed, width included.

Requested: the same width as the others, and either a normalised comparison or a
documented contract that the string is exactly the client's composed one — the
second half already exists (`docs/api.md`, service queues) and holds until this
lands. Their preferred fix is a stable municipality identifier with existing
rows normalised, instead of the composed label. Whether a **remote** service's
location should limit matching at all is a product question (`B`).

### G9 — Registration with optional services

`POST /auth/register` should accept an empty `offers` or `requests` list. Today
`AuthController::validateServices` returns `null` for `[]`, so the whole
registration is a `400` and an account cannot be created without publishing at
least one offer **and** one request. The brief makes services optional at
registration (a person may want to look at the catalog first) and the "Deleted"
section already lets them publish later. Until this lands, the registration
screen stops before the request and says that one entry per section is required.

Confirmed. Agreed shape: accept `[]` while still validating every item that is
present; response unchanged (`201 {token, user, offers, requests}`) with the
empty section an empty list. The frontend drops its "one entry per section" stop
in the same change.

### G15 — The credit balance is never exposed

`users.credits` exists and four paths move it — `POST /create-service-queue`
spends one for a `REQUEST` queue, `POST /cancel-queue/{id}` refunds a `REQUEST`
queue with no agreement, `POST /cancel-agreement/{id}` credits a queue-born
exchange, and the end-date scheduler credits a completed queue-born agreement
(`11cffda`) — but no endpoint returns it. The app cannot show a balance, and a
`REQUEST` queue that fails with `Not enough credits` has no number behind it.
Confirmed: `credits` goes into the authenticated profile and stays non-writable
through the profile `PATCH`; a separate `GET /credits` is not needed.

### G17 — An empty queue list is a `404`

`QueueController::getQueues` answers `404 {error: "Service queues not found"}`
when the account has no queue, because it tests `if (!$queuesDTO)` and an empty
array is falsy (`Backend/src/Controller/QueueController.php:80-83`). The status
that means "empty" is the one the frontend uses everywhere for "route missing",
so every client special-cases it: `listQueues` reads `404` as `[]`
(`Frontend/src/api/areas/queues.js`). Confirmed: `200 {"queues": []}` first, then
that special case can go.

### G21 — Cancelling a queue answers `200` even when nothing happened

`QueueController::cancelQueue` always answers
`200 {"message": "Service queue cancelled successfully"}`: the manager acts only
when the queue exists, belongs to the caller and is not already `CLOSED`, and the
controller returns success regardless
(`Backend/src/Manager/ServiceQueueManager.php:91-104`,
`Backend/src/Controller/QueueController.php:57-69`). An unknown id, another
account's queue or an already closed one is a silent no-op read as a success —
the screen prints «Coda annullata: …» and the row leaves only because the reload
no longer returns it. From this UI the case is nearly unreachable (the list
excludes `CLOSED` rows), but a client cannot tell a cancellation from a no-op.
Confirmed: `404` for an unknown or foreign queue; for an already closed one they
accept either `409` or a documented idempotent success. What this side needs is
only that a caller can tell the two apart; the copy follows whichever lands.

### G22 — A queue row carries no date

`ServiceQueueDTO` has no `createdAt` (and no `updatedAt`), so an `OPEN` queue
from three weeks ago and one created a minute ago look identical (`In attesa` is
a state, not a duration). Confirmed as a missing field, not a runtime error:
`createdAt` goes into the entity, the schema and the DTO, with an explicit rule
for rows that predate the column.

### G23 — A second active queue is a `500`, and one queue total is not the product rule

Since backend `4c90ccd` `ServiceQueueManager::createServiceQueue` runs
`ServiceQueueRepository::getActiveQueueByUser($user)` before anything else and
throws `\Exception("User already has an active queue.")` when the account has a
queue whose status is not `CLOSED`
(`Backend/src/Manager/ServiceQueueManager.php:61-66`). Two problems:

1. **The refusal is untyped and uncaught.** A plain `\Exception` lands in
   `QueueController::createQueue`, whose `catch (Exception $e)` names
   `App\Controller\Exception` (`G13`), so nothing catches it and the framework
   error handler answers **`500`**. The app's `500` sentence is «Il servizio ha
   avuto un problema. Riprova tra poco.» — a server fault offered as retryable
   for a state the account can only fix by cancelling a queue. Confirmed as a
   bug: a dedicated exception mapped to `409`.
2. **One queue total is a product decision, not a backend inference.** The rule
   the seed, the docs and the `match` tab follow is one offer and one request per
   account (`setup.md`, `database.md`): two queues of the two types are normal,
   not duplicates. The guard blocks the second *type* as well, so an account with
   an `OPEN` offer queue cannot create the request queue it is entitled to
   (`giulia.bianchi` can create nothing at all). Whether one `OPEN` queue **per
   type** is allowed is for us to decide (`B`). Whichever rule wins must hold
   under concurrent requests: check and insert share a transaction.

**How the app lives with it today (decision D025):** it follows the server. The
`match` tab disables **both** create actions while `GET /get-queues` returns a
row (`hasActiveQueue` in `Frontend/src/services/queues.js`) and says «Hai già una
coda attiva: annullala per poterne crearne un’altra.», so the `500` is
unreachable from the app. The cost is a narrower product rule: the second queue
type is unreachable until this lands. Then the gate becomes one per type and the
copy points at the other type instead of at cancel.

Two smaller notes on the same query: `getOneOrNullResult()` throws
`NonUniqueResultException` for an account holding two non-`CLOSED` queues
(possible for anyone who created one before `4c90ccd`), another `500`; and
`getActiveQueueByUser` duplicates `getServiceQueuesByUser` with `!= CLOSED`, so
the queue list can never show a cancelled row either.

### G29 — `GET /staff/users` has no `role` filter

`StaffController::users` accepts only `page`, `limit`, `q` and `accountStatus`
(`Backend/src/Controller/StaffController.php:32`), so the staff → users screen
cannot ask for "the staff members" or "the plain users": the role pill filters
only the rows already downloaded. That is honest — the pill says it filters the
loaded users — but it cannot answer the question it asks, because the answer may
be on page 3. The repository already filters the other two dimensions
server-side (`UserRepository::paginateForStaff`) and the field is in every row,
so this is a query parameter, not a new resource. Confirmed:
`role=USER|STAFF`, validated like `accountStatus` (`400` otherwise), applied
before pagination so `totalItems` counts the filtered set — and remembering that
a staff account can also hold `ROLE_USER`, so the filter asks for "has
`ROLE_STAFF`", never "is not `ROLE_USER`".

### G13 — Queue routes swallow their own error branch

`QueueController` writes `catch (Exception $e)` without `use Exception`
(`Backend/src/Controller/QueueController.php:51,66,85`): inside `App\Controller`
that name resolves to a class that does not exist, so the branch never matches
and real failures escape unhandled instead of answering the documented `500`.
`GET /get-queues` also dereferences `getService()->getCategories()->first()`
without a null check (`Backend/src/Manager/ServiceQueueManager.php:52-54`), so a
service without a category answers `500`. Confirmed. Their rule: qualified
exceptions, explicit domain cases, and the service validated before any
dereference — a generic `catch` is not a substitute for those checks.

### G14 — The demo generator cannot regenerate the demo data

`Backend/tools/create-demo-database.php` still writes
`Context_and_DB_V2/barattolo_demo_20261108.sql`, `DROP TABLE`s
`token_redemptions` and `tokens` (absent from the current schema, so the tool
dies) and requires the database host to be `127.0.0.1`/`localhost` (from the
container it is `database`). Result: the current dump ships **no rows** and the
only way to a working local database is the seed we wrote
(`Backend/docker/seed-demo.sql`). Confirmed, with one complaint withdrawn:
refusing to overwrite an existing dump is a **useful protection and stays**;
only the target filename, the host list and the stale DDL change.

### G7 — Confirmation of the delivery sheet — landed, one leftover

`POST /accept-agreement-details/{agreementId}` sets `beneficiaryAccepted` and
notifies the provider; `COMPILED` is written by the route that fills the sheet.
The leftover: an already-accepted sheet answers `500` **with the exception
message appended** instead of `409`
(`Backend/src/Controller/AgreementController.php:287`). Confirmed; their
preference is a `409` on the dedicated `DomainException` or an idempotent
confirmation, and both are acceptable here — the card only has to stop reporting
a server fault for a repeated tap. The leaking body itself is `G25`.

## B. Ours — resolvable on this side

### G27 — The chat notification preview

A `CHAT_MESSAGE` notification already carries what the inbox needs:
`ChatManager::sendMessage` writes `data = {agreementId, chatId, message}` —
`message` being the **full text** that just arrived
(`Backend/src/Manager/ChatManager.php:98-99`, identical on `main` and on this
branch) — while `message` on the row stays the "Nuovo messaggio da: <username>"
subject line. `normalizeNotification` already passes `dati` through to the screen
(`Frontend/src/api/normalizers.js:617`), and `docs/api.md` §Notifications now
documents the per-type `data` shape. No backend request is open.

What we do with it: for `CHAT_MESSAGE` show the first line of `dati.message`,
single-line and truncated at a named constant, rendered as **text** (it is user
input — no HTML), falling back to today's subject when the field is absent.
`AGREEMENT_*` rows carry no description in `data`, so they keep their `message`.

The audit finding stands — two messages from the same person are two identical
rows (`audits/ux-mobile-audit-2026-11-17.md` **F5**,
`iphone-14-pro/06-notifiche.png`); the original diagnosis ("the payload does not
hold the text") does not. A server-side pre-truncated field stays optional and is
not worth waiting for.

### G3 — The proposer card (the remaining half)

`GET /users/{id}/services` exists with the envelope below, and the service detail
consumes it through `UserServicesMiniCard`. The recipient of a proposal could use
the same call to see who proposed; that card is not built. It is our work, not a
request.

```json
{
  "user": {"id": 7, "name": "Mario", "surname": "Rossi", "username": "mario.rossi",
           "location": "Rome", "bio": "...", "profileImageUrl": "..."},
  "offers": [{"id": 12, "description": "Bicycle repairs", "categories": [...]}],
  "requests": [{"id": 15, "description": "Language lessons", "categories": [...]}]
}
```

### Decisions this side owes the backend

Five blocks are waiting on a product answer, not on code. Writing the answer is
the work; then the backend applies it.

1. **`G5` — two independent answers?** Per-side answers exist (the sender starts
   at `true`, the recipient decides) and one refusal correctly ends an agreement
   that needs mutual consent. That is not a defect. Say whether the product wants
   two answers still open at once; if yes, the state must be derived from them
   inside one transaction.
2. **`G23` — one queue per account or one per type?** `D025` currently follows
   the server (one total). One offer plus one request per account is what the
   seed and the docs say, so "per type" is the likely answer — but it is a rule,
   not an inference.
3. **`G11` — does location limit a remote service?** Today a remote queue is
   matched on the same composed location string as an in-person one. Decide
   whether that is intended before the column is migrated.
4. **`G28` — may a service with no keywords match?** A tolerant lookup turns a
   fatal error into "no keywords"; say whether that means "no match" (safe) or
   "match on category + mode + location only".
5. **`G4` — ask for the `sent`/`received` split now or later?** The service on
   the proposal is the fix; the split list is a contract extension the backend
   would add afterwards.

### Re-measure `G20` on MySQL (verification)

The reproduction in `G20` was a single run and the mechanism it described was
too absolute. Before the backend is asked to migrate, re-measure on our own
MySQL: an `UPDATE` that assigns `start_date` explicitly (does it survive?) and
one that changes other columns only (is `start_date` reset?). The project's tests
strip `ON UPDATE` while converting the schema, so they cannot answer this.

## Cross-cutting notes for the backend

- The identity always comes from the JWT; no endpoint above accepts a user id
  from the body.
- Errors keep the shape `{"error": "<text>"}`; the frontend maps the status, not
  the text.
- A `5xx` body never carries an exception message or a SQL fragment: the detail
  belongs in the server log (`G25`).
- Any endpoint that can be called twice must be idempotent or answer `409`, so
  the app can retry a failed request without creating duplicates.

## Closed and retracted

Kept because the numbers still appear in audits, briefs and commits.

- **G1 — relevance ordering.** Landed 2026-11-09 with an implicit priority (no
  `sort=relevance`): services sharing a category with the viewer's active
  requests first, applied before pagination
  (`ServiceRepository::paginateHomepageOffers`); `sort` still accepts only
  `newest`/`oldest`. Consumed by `src/services/relevance.js` (D021).
- **G2 — remote filter.** Landed 2026-11-09 as `isRemote=true|false`; combines
  with `q`, `categoryIds`, `location`; any other value is a `400`. The
  client-side filter is gone (D021).
- **G3 — public profile API.** Landed 2026-11-15 (`GET /users/{id}/services`);
  only the proposer card is left, and it is ours (above).
- **G7 — sheet confirmation.** Landed 2026-11-15; one leftover on the double
  confirmation, listed in A.
- **G8 — chat attached to an agreement.** Landed 2026-11-15: `chat`,
  `chat_messages`, `chat_participants`, four authenticated routes, and a
  `CHAT_MESSAGE` notification on send. Consumed since W1 (2026-11-16) by
  `Frontend/src/app/chat/[agreementId].jsx`. The authorisation hole is `G24`.
- **G16 — notification count.** **Retracted 2026-11-18.** `NotificationController`
  calls `count($items)` on a `Doctrine\ORM\Tools\Pagination\Paginator`, whose
  `count()` runs a count query over the same filter
  (`Backend/vendor/doctrine/orm/src/Tools/Pagination/Paginator.php:85-96`):
  `totalItems` is the real total, page 2 is reachable, and a test asserts exactly
  that. The inbox's "page 1 only" is our choice; the header comment in
  `Frontend/src/hooks/useNotifications.js` that repeated the wrong premise was
  corrected in the same pass. Do not re-file this.
