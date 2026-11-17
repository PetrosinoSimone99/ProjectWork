# Backend gaps

Endpoints the frontend needs and the backend does not expose yet, in the order
the product needs them. Each block states the call, the payload, the response
and the states the app expects. Until a block is implemented, the matching
frontend surface shows an explicit "not available" state and never invents
data.

Everything here is a **request to the backend maintainer**, not a description of
current behaviour. When one lands, it moves to `api.md`.

## G1 — Relevance ordering on the home catalog — LANDED 2026-11-09

Implemented with a different shape from the request: the priority is
**implicit**, there is no `sort=relevance` parameter. First every service that
shares **at least one category with the viewer's own active REQUEST services**
(not deleted, not suspended), newest
first (`createdAt` then `id` descending); then everything else, same ordering
inside the group. It is applied to the whole catalog **before** pagination
(`ServiceRepository::paginateHomepageOffers` + `findDesiredCategoryIds`), so page
2 continues the ranking instead of restarting it. `sort` still accepts only
`newest`/`oldest`.

Consumed by the frontend: `src/services/relevance.js` and the extra
`GET /requests/mine` per home open are gone (`docs/decisions.md` D021).

## G2 — Remote-only filter — LANDED 2026-11-09

Implemented as `isRemote=true|false` (not `onlyRemote`): omitted means both
modes, `true` remote only, `false` in person only, any other value is a `400`.
Combines with `q`, `categoryIds` and `location`.

Consumed by the frontend: the client-side mode filter and its "only among the
loaded rows" line are gone, the mode selector sends the parameter
(`docs/decisions.md` D021).

## G3 — Public profile of another user — LANDED 2026-11-15

The backend now exposes `GET /users/{id}/services` with exactly the envelope the
frontend asked for:

```json
{
  "user": {"id": 7, "name": "Mario", "surname": "Rossi", "username": "mario.rossi",
           "location": "Rome", "bio": "...", "profileImageUrl": "..."},
  "offers": [{"id": 12, "description": "Bicycle repairs", "categories": [...]}],
  "requests": [{"id": 15, "description": "Language lessons", "categories": [...]}]
}
```

The service detail's "what they offer and look for" block is now
`UserServicesMiniCard` and the sentence that said "not available for now" is
gone. The recipient of a proposal could use the same call to see the proposer;
that screen is not built yet, and it is the only remaining half of this gap.

## G4 — A proposal that names the service

`POST /create-exchange-agreement` takes only `{otherParticipant}`: the exchange
is created without the service it is about, and the delivery sheet names it
later. The product asks for the opposite (`overview.md`): the sender proposes one
specific service and the recipient reads which one before answering.
Requested: `serviceId` in the creation body, `400` for one's own service, `409`
when the same pair already has a pending exchange for that service.

Also requested: a list split into `sent` and `received` with the counterpart
summary, so the bell and the "sent" section do not have to derive their state
from the agreement list.

## G5 — Per-participant answers

`POST /send-agreement-response` now refuses a second answer and an agreement
that is no longer pending (`409`), but the model is still whole-agreement: one
refusal sets `REFUSED`, whatever the other participant answered. Requested:
keep the two answers independent and derive the agreement state from them.

## G6 — Agreement rows with ids and a concluded state

`GET /get-agreements` returns the counterpart's username only: no user ids, no
`serviceId`, and nothing marks an accepted exchange whose end date has passed
as concluded. Requested: `serviceId` and the counterpart `id` in each row, plus
either a concluded status or a documented rule the client applies (today the
client compares `agreementDetails.endDate` with the current time).

**Narrowed on 2026-11-15 (cycle 2).** The paragraph that used to say the sheet
could not be called at all is wrong against the current backend: the route reads
only `{agreementId, fromRemote, startDate, endDate}`, and the sheet rows carry
`providerUsername` + `beneficiaryUsername`, so each side knows which row it fills
and which it confirms without a user id. The app now calls both sheet routes
(`send-agreement-details`, `accept-agreement-details`). What remains of G6 is the
missing `serviceId` (a sheet cannot name another of the provider's services
without it) and the counterpart `id` (a sheet cannot link back to a profile).

## G7 — Confirmation of the delivery sheet — LANDED 2026-11-15

`POST /accept-agreement-details/{agreementId}` now sets `beneficiaryAccepted` and
notifies the provider; `COMPILED` is written by the route that fills the sheet,
not by this one. One leftover: an already-accepted sheet answers `500` **with the
exception message appended** instead of a `409`
(`Backend/src/Controller/AgreementController.php:287`), while the route that
writes the sheet answers a clean `Internal Server Error`. Both routes are called
by the app since the second cycle; the `500` on a double confirmation is what the
card shows as "Il server non ha accettato la scheda".

## G8 — Chat attached to an agreement — LANDED 2026-11-15

`chat`, `chat_messages` and `chat_participants` are in the reference schema and
the four routes are authenticated: `GET /chats/agreement/{id}`,
`POST /chats/send-message/{chatId}` with `{message}`, `GET /chats/most-recent-message`,
`GET /chats/check-new-messages/{recentMessageId}`. Sending creates a
`CHAT_MESSAGE` notification. Consumed by the frontend since W1 (2026-11-16):
`Frontend/src/app/chat/[agreementId].jsx` opens the history of an accepted
agreement, sends, and polls `check-new-messages` while the screen is focused. The
remaining gap is authorisation: no route checks that the caller participates
(`G24`).

## G9 — Registration with optional services

`POST /auth/register` should accept an empty `offers` or `requests` list. Today
`AuthController::validateServices` returns `null` for `[]`, so the whole
registration is a `400` and an account cannot be created without publishing at
least one offer **and** one request.

Why the frontend asks: the brief makes services optional at registration (a
person may want to look at the catalog before publishing anything), and the
"Deleted" section already lets them publish later. Until this lands, the
registration screen stops before the request and says that one entry per section
is required.

Response: unchanged (`201 {token, user, offers, requests}`), with the empty
section simply an empty list.

## G10 — One queue can produce several agreements

`QueueHandler::__invoke` (`Backend/src/Handler/QueueHandler.php:46-68`) loops over
every relevant queue, creates an agreement for each, and overwrites
`$userQueue->setAgreement()` on every iteration: one offer in a city with three
waiting requests becomes three agreements, two of which the queue no longer
points at and the UI cannot reach. Requested: one match per queue (stop after
the first, or re-read the queue status inside the loop) and a single transaction
around agreement + queue status + notification. Today the three writes flush
separately, and `NotificationService::notify` flushes the whole unit of work
(`Backend/src/Service/NotificationService.php:16-18`).

## G11 — Queue matching compares location by exact string

`ServiceQueueRepository::getRelevantQueues` filters with `'location' => $location`
(`Backend/src/Repository/ServiceQueueRepository.php:29`). The app composes
`"Comune - Provincia"` (`Frontend/src/services/italian-locations.js`,
e.g. `Milano - Milano`) and the column stores free text, so a queue created from
the app only matches another one composed by the app: a queue seeded or typed by
hand as `"Milano"` never meets it. The column is also `varchar(100)` against
`varchar(255)` on `users` and `services`
(`Context_and_DB_V2/barattolo_15112026.sql:193`). Requested: the same width as
the others and either a normalised comparison or a documented contract that the
string is exactly the client's composed one — the second half now exists
(`docs/api.md`, service queues).

## G12 — Nothing consumes the scheduler, so `COMPLETED` is never written

`App\Schedule\AgreementEndDateChecker` is registered (`bin/console debug:scheduler`
lists `every 30 minutes … ServiceCallMessage`), but the task only runs while a
worker consumes `scheduler_default`, and the stack starts none: an agreement
whose end date passed stays `ACCEPTED` forever. Two smaller defects next to it:
the notification type it writes is `agreement_completed`, lower case, unlike
every other `AGREEMENT_*` type, and `$details->getStartDate()->format(...)` is
called on a nullable column (`Backend/src/Schedule/AgreementEndDateChecker.php:49`)
inside a loop that can find details without one. Since `11cffda` the same task
is also the only path that credits +1 when a queue-born agreement completes:
with no worker that credit never arrives either.

## G13 — Queue routes swallow their own error branch

`QueueController` writes `catch (Exception $e)` without `use Exception`
(`Backend/src/Controller/QueueController.php:51,66,85`): inside `App\Controller`
that name resolves to a class that does not exist, so the branch never matches
and real failures escape unhandled instead of answering the documented `500`.
`GET /get-queues` also dereferences `getService()->getCategories()->first()`
without a null check (`Backend/src/Manager/ServiceQueueManager.php:52-54`), so a
service without a category answers `500`.

## G14 — The demo generator cannot regenerate the demo data

`Backend/tools/create-demo-database.php` still writes
`Context_and_DB_V2/barattolo_demo_20261108.sql`, refuses to overwrite an
existing file, `DROP TABLE`s `token_redemptions` and `tokens` (absent from the
current schema, so the tool dies) and requires the database host to be
`127.0.0.1`/`localhost` (from the container it is `database`). Result: the
current dump ships **no rows** and the only way to get a working local database
is the seed we wrote (`Backend/docker/seed-demo.sql`). Requested: the tool
retargeted to the current schema and to a filename the compose stack mounts.

## G15 — The credit balance is never exposed

`users.credits` exists and four paths move it — `POST /create-service-queue`
spends one for a `REQUEST` queue, `POST /cancel-queue/{id}` refunds a `REQUEST`
queue with no agreement, `POST /cancel-agreement/{id}` credits a queue-born
exchange, and the end-date scheduler credits a completed queue-born agreement
(`11cffda`, backend, 2026-11-15) — but no
endpoint returns it: `GET /profile` does not include it, so the app cannot show
a balance and a `REQUEST` queue that fails with `Not enough credits` has no
visible number behind it. Requested: `credits` in `GET /profile` (or a small
`GET /credits`).

## G16 — The notifications page count is page-scoped

`NotificationController` answers `pagination.totalItems = count($items)` — the
rows of the page it just returned — and `totalPages = ceil(total / limit)`
(`Backend/src/Controller/NotificationController.php:38` for the count, `:41` for
the payload). With a full first page
that is `{totalItems: 20, totalPages: 1}` whatever the real total is, so a client
cannot tell whether a second page exists and `page=2` is unreachable by design:
notifications past the twentieth cannot be read from the app at all. Requested:
`totalItems` from a `COUNT(*)` of the same filter (the repository already has
`countUnread`, so the shape exists). Until then the inbox shows the newest page
and does **not** draw a "load more" button it could never justify.

## G17 — An empty queue list is a `404`

`QueueController::getQueues` answers `404 {error: "Service queues not found"}`
when the account has no queue, because it tests `if (!$queuesDTO)` and an empty
array is falsy (`Backend/src/Controller/QueueController.php:80-83`). The status
that means "empty" is the one the frontend uses everywhere for "route missing",
so every client has to special-case it: `listQueues` reads `404` as `[]`
(`Frontend/src/api/areas/queues.js`). Requested: `200` with `{"queues": []}`, so
"empty" and "broken" stop sharing a status.

## G18 — Accepting an agreement can leave half a sheet and answer 500

`AgreementManager::sendResponse` calls `createBlankDetails` twice on acceptance,
and each call resolves the participant's service with
`ServiceManager::getUserOfferedService` →
`ServiceRepository::findUserOfferedService`, which ends in `getOneOrNullResult()`
(`Backend/src/Repository/ServiceRepository.php:239-249`, the lookup at `:248`). An account with more
than one service of that type throws `NonUniqueResultException` on the second
call: the first sheet row is already flushed, the agreement is already
`ACCEPTED`, and the route answers `500` (`Backend/src/Manager/AgreementManager.php:140-147`).
Measured on `mario.rossi` (seven offers) with the pre-2026-11-16 demo seed: the
pair ends up with one sheet row out of two. Today's seed gives every account
exactly one offer and one request, so the case needs two services of the same
type to reproduce. The app copes — it draws the row that exists and offers only the action
that row allows — but the missing second row is not a UI state, it is a lost
write. Same root cause as G19. Requested: `setMaxResults(1)` (with a documented
choice) or a deterministic "primary service" per type.

## G19 — Creating a queue needs exactly one service of that type

`ServiceQueueManager::createServiceQueue` looks the account's service up with the
same `getOneOrNullResult()`. Measured: zero services of that type throw an
uncaught `TypeError` (not the documented `500` JSON: the controller catches
`Exception`, and `TypeError` is an `Error` — next to it, the missing `use
Exception` of G13 means that `catch` never matches anything at all), and two or
more throw
`NonUniqueResultException` → `500 Internal Server Error`
(`More than one result was found for query although one row or none was
expected`). Worse, a `REQUEST` queue spends the credit **before** the lookup
(`ServiceQueueManager.php:69-81`), so a failing creation can cost a credit
without producing a queue. The seed the app now produces gives **every** account
exactly one offer and one request, so every seeded account can create either
queue (before 2026-11-16 the generated demo users carried several services per
type, and only one added account could). The
app gates on "exactly one" and says why rather than calling
(`Frontend/src/app/(tabs)/match.jsx`). Requested: pick one service deliberately
and deduct the credit only after the queue is persisted.

## G20 — `agreement_details.start_date` cannot hold a date

The column is `timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP` in the
reference dump (`Context_and_DB_V2/barattolo_15112026.sql`, table
`agreement_details`). `POST /send-agreement-details` updates the row, so
`end_date` is stored correctly and `start_date` is reset to the moment of the
write. Measured: payload `startDate: 2026-12-01` → row
`start_date = 2026-11-15 20:34:16`, `end_date = 2026-12-05 00:00:00`. The card
shows what the API returns, so the start date a reader sees is the last update
time, not the date that was typed. Requested: drop `ON UPDATE CURRENT_TIMESTAMP`
from `start_date` (the other datetime columns have it too, and the same trap
applies to any column a client writes).

## G21 — Cancelling a queue answers `200` even when nothing happened

`QueueController::cancelQueue` always answers
`200 {"message": "Service queue cancelled successfully"}`: it calls the manager,
which only acts when the queue exists, belongs to the caller and is not already
`CLOSED`, and then returns success regardless
(`Backend/src/Manager/ServiceQueueManager.php:91-104`,
`Backend/src/Controller/QueueController.php:57-69`). An unknown id, another
account's queue or an already closed one is a silent no-op that the app reads as
a success — the screen prints «Coda annullata: …» and the row only leaves the
list because the reload no longer returns it. From this UI the case is nearly
unreachable (the list excludes `CLOSED` rows), but a client cannot tell a real
cancellation from a no-op. Requested: `404` when the caller is not a participant
and `409` when the queue is already closed.

## G22 — A queue row carries no date

`ServiceQueueDTO` has no `createdAt` (and no `updatedAt`), so the app cannot say
how old a queue is: an `OPEN` queue from three weeks ago and one created a minute
ago look identical (`In attesa` is a state, not a duration). Requested: one
timestamp in the row.

## G23 — A second active queue is a `500`, and one queue total is not the product rule

Since backend `4c90ccd` `ServiceQueueManager::createServiceQueue` runs
`ServiceQueueRepository::getActiveQueueByUser($user)` before anything else and
throws `\Exception("User already has an active queue.")` when the account has a
queue whose status is not `CLOSED`
(`Backend/src/Manager/ServiceQueueManager.php:61-66`). Two problems with that
shape:

1. **The refusal is untyped and uncaught.** A plain `\Exception` lands in
   `QueueController::createQueue`, whose `catch (Exception $e)` names
   `App\Controller\Exception` (no `use Exception`, `G13`), so nothing catches it
   and the framework error handler answers **`500`**. The app's `500` sentence is
   «Il servizio ha avuto un problema. Riprova tra poco.» — a server fault offered
   as retryable for a state the account can only fix by cancelling a queue.
   Requested: a dedicated exception mapped to `409 \{error: "User already has an
   active queue"\}` (the cross-cutting rule above asks for `409` on a call that
   cannot be repeated).
2. **One queue total conflicts with the product rule.** The rule the seed, the
   docs and the `match` tab all follow is **one offer and one request per
   account** (`setup.md`, `database.md`, changelog 2026-11-13): two queues of the
   two different types are a normal state, not a duplicate. The guard blocks the
   second *type* as well, so an account with an `OPEN` offer queue can no longer
   create the request queue it is entitled to. Measured against the seed:
   `giulia.bianchi` holds the one `OPEN` request queue, so she can create nothing
   at all, and every other account gets one queue and then the same refusal.
   Requested: the guard keyed on `queueType` (one `OPEN` queue **per type**), or a
   product decision that one queue per account is the new rule — the app cannot
   guess which.

**How the app lives with it today (decision D025):** it follows the server. The
`match` tab disables **both** create actions while `GET /get-queues` returns a
row (`hasActiveQueue` in `Frontend/src/services/queues.js`) and says «Hai già una
coda attiva: annullala per poterne crearne un’altra.», so the `500` is
unreachable from the app and nothing is offered that cannot work. The cost is a
narrower product rule: the second queue type is unreachable until this block is
implemented. When it is, the gate becomes one per type and the copy points at
the other type instead of at cancel.

Two smaller notes on the same query: `getOneOrNullResult()` throws
`NonUniqueResultException` for an account that already holds two non-`CLOSED`
queues (possible for any account that created one before `4c90ccd` merged), which
is another `500`; and `getActiveQueueByUser` now duplicates
`getServiceQueuesByUser` with `!= CLOSED`, so the queue list can never show a
cancelled row either.

## G24 — No chat route checks that the caller is a participant

Found while writing W1 (2026-11-16), from reading only. None of the four chat
routes compares the JWT user with the participants of the chat or of the
agreement:

- `ChatManager::getOrCreateChat` (`Backend/src/Manager/ChatManager.php:46`)
  fetches the chat by agreement id and, when it is missing, creates it from the
  agreement's proposals — it never reads the calling user. `GET
  /chats/agreement/{agreementId}` therefore returns the history of **any**
  agreement id to **any** authenticated account, and creates its chat as a side
  effect.
- `ChatManager::sendMessage` (`ChatManager.php:78`) fetches the chat by id and
  writes a message for the calling user without checking `chat_participants`.
  `POST /chats/send-message/{chatId}` lets any authenticated account post into
  any chat, and sends a `CHAT_MESSAGE` notification to the real participant
  (`ChatManager.php:98`).

`getUserChats` and `getNewMessagesForUser` **are** scoped by participant, so the
two cursor routes are safe; the hole is exactly the pair the screen drives.

Requested: a participant check on both routes, answering `403` (or `404`, if the
existence of the chat should not leak) for a caller who is not in
`chat_participants` of that chat / in the proposals of that agreement. Until
then this is a backend authorization defect, not a frontend one.

**How the app lives with it today:** it does not widen the hole further. The
chat is reachable only from an `ACCEPTED` row of the caller's own agreements
(`AgreementCard`, `puoAprireChat`), the route carries no agreement id from a
free-text source, and nothing links to `/chat/<id>` from outside the app. A
person who types another account's agreement id still gets that chat: there is
nothing the client can do about it, and the app does not pretend otherwise.

The same applies **inside one account**: the chat is *offered* only by `ACCEPTED`
rows, but a typed `/chat/<id>` (or a deep link) opens the chat of a `PENDING`,
`CANCELLED` or `COMPLETED` agreement of the caller — and `getOrCreateChat`
creates it if it is missing. Closing that would need the agreement's status,
which the chat screen does not read (the chat routes return no agreement
state); with a participant check in place at G24's suggestion, the remaining
case is a person reading a chat of their own exchange, which the product may
accept. Recorded so nobody reads the "ACCEPTED only" rule as enforced.

## G25 — A `500` body carries the exception message

Five handlers append `$e->getMessage()` to the `500` sentence: the three chat
routes (`Backend/src/Controller/ChatController.php:44,71,120`) and both details
routes of an agreement (`Backend/src/Controller/AgreementController.php:264,285`).
This is the general form of **A3** in `audits/api-authz-2026-11-17.md` (reproduced
there on an unknown `agreementId`). The status sentence the app shows comes from
`api/client.js`, never from the body, but the text still leaves the server: it
reaches any caller and any proxy log, and it can name a table, a query or an
internal path. Requested: log the message on the server with the rest of the
context and answer a fixed sentence, as every other controller already does.

Found by the read-only documentation audit of 2026-11-17
(`docs/audits/check-2026-11-17.md`, §Security). Nothing in the frontend depends
on that text.

## G26 — Login has no rate limit

`POST /auth/login` compares the password and answers; there is no `rate_limiter`
in `Backend/config/**` and no per-account or per-IP counter. Measured in
`audits/api-authz-2026-11-17.md` (**A5**): fifteen wrong passwords in a row cost
nothing and the next correct one succeeds. Requested: a login throttle
(`RateLimiter` or a counter in the user row) answering `429`, so a password list
is not free to run. The app already maps `429` to «Troppe richieste in poco
tempo» (`Frontend/src/api/client.js`), so nothing changes on this side.

## G27 — A notification carries no message preview

A notification row is `{id, type, message, data, createdAt, readAt}`
(`docs/api.md` §Notifications). For `CHAT_MESSAGE` the backend writes
`message = "Nuovo messaggio da: <username>"` and nothing else: `data` carries the
`{agreementId}` and no part of the text that arrived. Two messages from the same
person are therefore two identical rows and only the minute tells them apart —
measured in `audits/ux-mobile-audit-2026-11-17.md` (**F5**), screenshot
`iphone-14-pro/06-notifiche.png`.

What the inbox cannot do until the payload carries it: triage. The only way to
know which message is waiting is to open the agreement, so the notification's
whole value — deciding *whether* to open anything — is lost for the most
frequent type. Nothing on this side can paper over it: guessing a subject from
the agreement would print a fact the payload does not hold.

The text is available where the row is written (notifications are created
synchronously inside the request that causes them, `docs/api.md` §Notifications),
so no new query is needed. Requested: for `CHAT_MESSAGE` (and for
`AGREEMENT_*` rows where a description exists), add the first ~60 characters of
the body as one more field of the row — a server-truncated, single-line, plain
text preview — escaping or stripping newlines server-side. The app already
prints `message` as text, so this side changes once, when the field exists;
until then the row stays untriageable on purpose rather than approximate.

## Cross-cutting notes for the backend

- The identity always comes from the JWT; no endpoint above accepts a user id
  from the body.
- Errors keep the existing shape `{"error": "<text>"}`; the frontend maps the
  status, not the text.
- A `5xx` body never carries an exception message or a SQL fragment: the detail
  belongs in the server log (`G25`).
- Any endpoint that can be called twice must be idempotent or answer `409`, so
  the app can retry a failed request without creating duplicates.
