# API

Endpoints that exist in the backend **today**, as the frontend consumes them.
Canonical sources: `Backend/src/Controller/**`, `Backend/tests/**`, and
`Context_and_DB_V2/API docs/DATABASE_AND_API_GUIDE.md` (the backend-written
guide). What the frontend needs and the backend does not have is in
[`backend-gaps.md`](backend-gaps.md).

Base URL: `http://localhost:8000/api` in development. **Authentication is
mandatory on every route except `POST /auth/*` and `GET /categories`**: since
2026-11-15 the firewall rule `{ path: ^/api, roles: IS_AUTHENTICATED_FULLY }` is
active, so a call without the bearer token is a `401`, and a valid token on an
inactive account is a `403` (`ActiveAccountSubscriber`). The app attaches the
token from the session on every call (`Frontend/src/api/client.js`).

Catalog, auth and staff routes answer errors as `{"error": "<text>"}` with a
4xx/5xx status. The **agreement routes** use the wrapped shape
`{"error": {"code": …, "message": …}}` instead: the app maps those by status
(`Frontend/src/api/areas/agreements.js`), never by body, so both shapes reach
the user as Italian copy.

## Authentication

| Call | Body | Response |
| --- | --- | --- |
| `POST /auth/register` | `{name, surname, username, email, password, location, offers[], requests[]}` | `201 {token, user, offers, requests}` |
| `POST /auth/login` | `{username, password}` | `{token, user}` |

`location` is mandatory. **Each of `offers` and `requests` must contain at least
one entry today**: `AuthController::validateServices` rejects an empty list with
a `400`, so the frontend states that limit instead of sending a doomed request
(see [`backend-gaps.md`](backend-gaps.md) G9). Items are
`{description, categoryIds[], isRemote, location?}`. Registration always assigns
`ROLE_USER` and an active account. The token lasts one hour.

## Profile

| Call | Notes |
| --- | --- |
| `GET /profile` | `{profile: {id, name, surname, location, username, email, bio, profileImageUrl}}` |
| `PATCH /profile` | Editable: `name`, `surname`, `location`, `bio`, `profileImageUrl`. Any other field is rejected; the whole request is validated before writing |

`profileImageUrl` is a pasted URL (no upload). The frontend applies the same
rule as `ProfileController::validateField`: `https` only, a URL shape, at most
2048 characters. No file extension is required — a CDN URL without one is
valid, and an `http://` URL is refused by the client exactly as the backend
refuses it. A URL whose preview failed is not saved, and the screen says so
next to the disabled save button.

## Categories

`GET /categories` (public) returns `{categories: [{id, description}]}`, sorted
by description. Used by the filters and by the service form.

## Services: the home catalog

`GET /services?q=&categoryIds=1,2&location=&isRemote=true|false&sort=newest|oldest&page=1&limit=20`

Returns `{offers: [...], pagination: {page, limit, totalItems, totalPages}}`.
`limit` defaults to 20, maximum 50. The backend already excludes the viewer's
own services, soft-deleted services, suspended services and inactive owners, and
returns `OFFER` rows only.

`isRemote` is optional and restricts the mode: omitted means both, `true` remote
only, `false` in person only. `sort` accepts only `newest` (default) and
`oldest`; there is **no** `sort=relevance`.

**The ordering is relevance-first and the backend decides it.** Before
paginating, the whole catalog is sorted: first the offers sharing at least one
category with the viewer's own **active** REQUEST services (not deleted, not
suspended), then everything else; inside each group `createdAt` (newest first by
default) and then `id`, which keeps pagination stable when two rows share a
timestamp. The priority is implicit, so page 2 continues the ranking instead of
restarting it, and the frontend does not reorder anything (`docs/decisions.md`
D021).

Each offer:

```json
{
  "id": 12,
  "type": "OFFER",
  "description": "Bicycle repairs",
  "location": "Rome",
  "isRemote": false,
  "isSuspended": false,
  "createdAt": "2026-11-07T18:18:35+01:00",
  "categories": [{"id": 3, "description": "Repairs"}],
  "owner": {"id": 7, "name": "Mario", "surname": "Rossi", "username": "mario.rossi",
            "location": "Rome", "bio": "...", "profileImageUrl": "..."}
}
```

`limit`, `sort` and the category list are validated before the query; an invalid
value is a `400`, not a silently different result.

`POST /services` creates a service:
`{type: "OFFER"|"REQUEST", description, categoryIds: [1,2], location?, isRemote?, isSuspended?}`,
`description` up to 255 characters and at least one category. Returns
`201 {service: {...}}`.

## Services: the user's own

| Call | Notes |
| --- | --- |
| `GET /offers/mine` | `{offers: [...]}` — the viewer's own offers, newest first |
| `GET /requests/mine` | `{requests: [...]}` — the viewer's own requests |
| `PATCH /offers/{id}` `PATCH /requests/{id}` | Edits `description`, `categoryIds`, `location`, `isRemote`, `isSuspended`; returns `{offer}`/`{request}` |
| `DELETE /offers/{id}` `DELETE /requests/{id}` | Soft delete, `204`, no body |
| `GET /offers/deleted` `GET /requests/deleted` | The user's own deleted services |
| `POST /offers/{id}/restore` `POST /requests/{id}/restore` | Restores a deleted service |

Suspending is the `isSuspended` flag through `PATCH`: a suspended service stays
in the owner's list but disappears from the home.

**A `PATCH` always carries `location`,** and `null` there clears the column
(`OfferController:71-73`). The edit form composes the value from the province and
comune it shows, so editing an entry whose stored location predates the
`Comune - Provincia` format — `Milano (Lombardia)`, a bare `Roma` — sends `null`
and the old value is lost on the first save. Accepted on 2026-10-13 with the
decision that a deploy database starts fresh (`services/offer-request.js`), and
unreachable on the current seed, where every row is in the new format.

Known conflict: `409` when the service is already used by a proposal or an
exchange; the message is shown as it is.

## Agreements

An agreement is the exchange unit. A `PENDING` agreement is one participant's
proposal; the other participant answers once and it becomes `ACCEPTED` or
`REFUSED`.

| Call | Body | Notes |
| --- | --- | --- |
| `GET /get-agreements` | — | `{success: {code, message, agreements: [...]}}`, every agreement the viewer participates in |
| `POST /create-exchange-agreement` | `{otherParticipant}` | `201`. Creates a `PENDING` exchange: the caller answers `true` (they proposed), the other participant has `response: null` (has not answered yet). `400` for yourself, `404` for an unknown user |
| `POST /send-agreement-response` | `{agreementId, response: true\|false}` | The answer, once. `true` → `ACCEPTED`, `false` → `REFUSED`. `409` when the agreement is no longer `PENDING` or this participant already answered |
| `POST /send-agreement-details` | `{agreementId, fromRemote, startDate, endDate}` | The delivery sheet on an `ACCEPTED` agreement. `serviceId` and `beneficiaryId` are **no longer read**: since 2026-11-15 the manager takes the service and the beneficiary from the agreement itself, so sending them changes nothing. `400` when a field is missing or the end date does not come after the start date, `404` when the agreement is not accepted. The sheet starts `UNCOMPILED` with `beneficiaryAccepted: null` and the beneficiary gets an `AGREEMENT_DETAILS` notification |
| `POST /accept-agreement-details/{agreementId}` | — | The beneficiary's confirmation of the sheet: sets `beneficiaryAccepted` (the row is already `COMPILED`, written by the route above) and notifies the provider with `AGREEMENT_DETAILS_ACCEPTED`. `404` when the agreement is unknown, the caller is not the beneficiary, or there is no sheet; `500` when it was already accepted (the backend answers an exception, not a `409`) |
| `POST /cancel-agreement/{agreementId}` | — | An `ACCEPTED` exchange becomes `CANCELLED` (before 2026-11-15 it became `VOID`). `404` when the caller is not a participant. A queue-born exchange refunds or increments a credit on this path. **Only an `ACCEPTED` agreement is touched**: any other status answers `200 {"success": …}` and changes nothing, and since backend `cccd44c` the `AGREEMENT_CANCELLED` notification is sent inside that branch only — before, a cancel on a `PENDING`/`REFUSED` agreement changed no row and still told the counterpart the exchange had been called off. The app offers the action on `ACCEPTED` rows only, so it never reaches the no-op branch |

The details route used to be a `GET` that read a JSON body, which a browser
cannot send: the sheet was unreachable from the app. It is a `POST` now, and
**the app calls both sheet routes** since the second cycle: the provider fills
the row whose `providerUsername` is its own, the beneficiary confirms the row
whose `beneficiaryUsername` is its own (`services/agreements.js` → `sheetsFor`).
An accepted agreement therefore carries **two** sheet rows, one per participant,
and the UI decides which one each side may act on from those two usernames:
no participant id is guessed.

Known defect in the schema behind these rows: `agreement_details.start_date` is
`timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP` in the reference dump,
so the `UPDATE` that writes the two dates resets the start to the moment of the
write while `end_date` is stored correctly (`backend-gaps.md` G20). The card
renders what the API returns; the start date is not trustworthy until the column
is fixed.

One agreement:

```json
{
  "id": 3,
  "agreementStatus": "PENDING",
  "creationDate": "2026-11-09T17:27:40+00:00",
  "agreementProposal": [
    {"username": "mario.rossi", "role": "Provider", "response": true,
     "responseDate": "2026-11-09T17:27:41+00:00"},
    {"username": "luca.ferrari", "role": "Beneficiary", "response": null,
     "responseDate": null}
  ],
  "agreementDetails": [
    {"providerUsername": "mario.rossi", "serviceDescription": "Bicycle repairs",
     "beneficiaryUsername": "luca.ferrari", "fromRemote": false,
     "startDate": "2026-12-01T09:00:00+00:00",
     "endDate": "2026-12-05T18:00:00+00:00",
     "beneficiaryAccepted": null, "status": "UNCOMPILED"}
  ]
}
```

`agreementStatus` is `PENDING`, `ACCEPTED`, `REFUSED`, `CONTESTED`,
`CANCELLED` or `COMPLETED`. `CANCELLED` is what calling off an accepted
exchange writes now; `VOID` survives only on rows created before the rename,
and the frontend classifies both as closed history. `COMPLETED` is written by
the backend's end-date scheduler once every delivery of the agreement is
finished — but nothing consumes that scheduler in the local stack, so a sheet
can stay `ACCEPTED` past its end date (see `setup.md`). On a queue-born
agreement that same task credits +1 to the user of the sheet row
(`UserManager::IncreaseOrRefundCredit`, backend `11cffda`) and, since backend
`256b985`, also closes the agreement's queues: they turn `CLOSED` and leave
`GET /get-queues`, exactly like the cancel path. `256b985` also narrowed the
task to `ACCEPTED` agreements (`findAllAgreements` now uses `findBy`; the
criteria previously passed to `findAll` were ignored), so a cancelled agreement
with a passed end date is no longer completed and no longer notifies both
sides that the service is finished. The credit is a movement no route exposes
(`backend-gaps.md` G15) and none of it can happen before a worker exists
(`backend-gaps.md` G12). `response: null` means
"has not answered yet" and is not a refusal. Rows carry no user ids: the viewer
is identified by username, and no row names the exchanged service until the
sheet does (`backend-gaps.md` G4). Until an agreement is accepted it carries no sheet at
all, and the card renders the single line "Scheda non compilata"
(`backend-gaps.md` G6).

## Reports

`POST /reports` with `{reportedUserId, reason}`. The author always comes from the
JWT, never from the body. `reason` is 1 to 2000 characters; reporting yourself
is a `400`; a pair that already reported each other is a `409`.

## Staff

All of these return `403` for a non-staff caller.

| Call | Notes |
| --- | --- |
| `GET /staff/users` | Query `page`, `limit`, `q`, `accountStatus`; **no `role` filter** (`backend-gaps.md` G29) |
| `GET /staff/users/{id}` | One user |
| `POST /staff/users/{id}/promote` | No body: adds `ROLE_STAFF`, the role is not the client's choice |
| `PATCH /staff/users/{id}/status` | Body `{accountStatus}` — `ACTIVE` or `INACTIVE` |
| `GET /staff/reports`, `GET /staff/reports/{id}` | Query `page`, `limit`, `status`, `reporterId`, `reportedUserId` |
| `POST /staff/reports/{id}/claim` | No body; takes the report into review |
| `PATCH /staff/reports/{id}/review` | Body `{status, reviewNote}` — `CONFIRMED` or `REJECTED` |
| `GET /staff/operations`, `GET /staff/operations/{id}` | Query `page`, `limit`, `staffId`, `action`, `targetType`, `targetId` |
| `GET /staff/services/deleted` | Query `page`, `limit`, `userId`, `type` |
| `POST /staff/services/{id}/restore` | No body; restores one |

Every list answers `{<collection>, pagination: {page, limit, totalItems, totalPages}}`
with the total count of the filtered set, and `limit` is capped at 50. The app
reads that payload: `/staff-users`, the report list, the operations log and the
deleted-services section all page through it with a "Carica altri 20" button
(`usePagedList`), so no list stops at its first page.

## Chat (attached to an agreement)

`GET /chats/agreement/{agreementId}`, `POST /chats/send-message/{chatId}` with
`{message: string}`, `GET /chats/most-recent-message`,
`GET /chats/check-new-messages/{recentMessageId}`.

Since 2026-11-15 the `chat`, `chat_messages` and `chat_participants` tables are
part of the reference schema, every call requires the token, `send-message`
actually sends the body (until then it sent a hardcoded `'Hello Bob'`) and
`most-recent-message` reads the JWT user instead of user id 1. Sending a
message also creates a `CHAT_MESSAGE` notification for the other participant.
The app drives three of them since W1 (2026-11-16):
`Frontend/src/app/chat/[agreementId].jsx` opens the history of one accepted
agreement, sends, and polls `check-new-messages` every 15 s while the screen is
focused. That call is **global** across the user's chats, never carries the
caller's own messages, and answers only what is newer than the id it is given
(`cm.id > :recentMessageId`): the client's cursor is therefore the highest id it
already shows, and `most-recent-message` is used **once**, to seed a chat whose
history is still empty. Asking `most-recent-message` on every tick would hand
the check its own answer's lower bound and always get an empty array back.
Sending returns only the acknowledgement: the screen re-reads the history
instead of drawing a bubble the backend never confirmed.

The routes check the token but **not** that the caller participates in that
chat: see `backend-gaps.md` G24.

## Notifications

The backend writes notifications synchronously inside the request that causes
them (agreement proposed, answered, cancelled, sheet written or accepted, chat
message, match created, staff actions). There is **no push channel**: no
Mercure, no SSE, no email. A client learns about a new row by asking again.
Two readers ask, both with the token:

- the inbox (`useNotifications`) reads page 1 when the panel opens;
- the profile row (`useUnreadCount`) reads `limit: 1` on focus, on
  pull-to-refresh and **every 30 s while the screen is in the foreground**
  (`UNREAD_POLL_MS`). It sends no request while the app is backgrounded
  (`AppState`) and reads once more when the app comes back, so the badge moves
  without a second, parallel counter.

Reading is not a command. `PATCH /notifications/{id}/read` has no bulk form, so
opening the panel sends **one `PATCH` per unread row of the page it shows**
(`NotificationsSheet` → `useNotifications.segnaVisibiliLette`); a `PATCH` that
fails leaves that row unread, which is what the row then says. The unread badge
re-reads the count when the panel closes, so it does not sit on the old number
for a full poll interval. Page 1 is a deliberate scope, not a limit: `totalItems`
is the real total (`backend-gaps.md` G16, retracted) and page 2 is reachable, but
the inbox only ever shows the first page — so on an account with more than 20
unread rows the badge can stay above zero after an opening, because those rows
were never on screen.

| Call | Notes |
| --- | --- |
| `GET /notifications?page=&limit=&unreadOnly=` | One page plus the count. `page` >= 1 (default 1), `limit` 1..50 (default 20), `unreadOnly` `true`/`false` (default `false`). **Any other query parameter is a `400`** |
| `PATCH /notifications/{id}/read` | Marks one as read and returns `{notification: {...}}`. `404` for an unknown or foreign id. There is no bulk variant |
| `DELETE /notifications/{id}` | `204`, no body. `404` likewise |

```json
{
  "notifications": [
    {"id": 7, "type": "AGREEMENT_PROPOSAL", "message": "Nuova proposta…",
     "data": {"agreementId": 12}, "createdAt": "2026-11-15T10:00:00+00:00",
     "readAt": null}
  ],
  "pagination": {"page": 1, "limit": 20, "totalItems": 1, "totalPages": 1},
  "unreadCount": 1
}
```

`type` is a free-form string, not an enum. In use: `AGREEMENT_PROPOSAL`,
`AGREEMENT_RESPONSE`, `AGREEMENT_DETAILS`, `AGREEMENT_DETAILS_ACCEPTED`,
`AGREEMENT_CANCELLED`, `CHAT_MESSAGE`, `MATCH_CREATED`, `REPORT_CLAIMED`,
`REPORT_REVIEWED`, `SERVICE_RESTORED`, `USER_PROMOTED`, `USER_STATUS_CHANGED`.
The end-date scheduler writes `agreement_completed` in lower case, so the
frontend upper-cases `type` when it normalises a row.

`data` depends on the type: `{"agreementId": <id>}` on the agreement rows, and
`{"agreementId": <id>, "chatId": <id>, "message": "<full text>"}` on
`CHAT_MESSAGE`. A chat notification therefore already carries the body of the
message that arrived, so a preview needs no new backend field
(`backend-gaps.md` G27).

## Service queues (matchmaker)

A queue is a standing "I offer this" or "I look for this" that the backend
matches in the background through `App\Message\QueueId` on the `async`
transport. Nothing consumes that transport in the local stack, so queues stay
`OPEN` until a worker runs (`setup.md`).

| Call | Body | Notes |
| --- | --- | --- |
| `POST /create-service-queue` | `{queueType: "OFFER"\|"REQUEST"}` | `201`. **One active queue per account, of either type** since backend `4c90ccd`: while a non-`CLOSED` queue exists, a second create throws `User already has an active queue.`, which the controller cannot catch (`backend-gaps.md` G13) and answers **`500`** to the client (`backend-gaps.md` G23). A `REQUEST` queue costs one credit: `400 {error: "Not enough credits"}` when the account has none — the one-queue guard runs **first**, so a refused second queue costs nothing |
| `POST /cancel-queue/{queueId}` | — | Closes the queue; a queue already attached to an agreement cancels that agreement, a `REQUEST` queue with no agreement gets its credit back. It always answers `200`, **even when nothing happened** (unknown id, another account's queue, an already closed one): the app prints «Coda annullata» off that status, so a no-op reads as a success (`backend-gaps.md` G21) |
| `GET /get-queues` | — | `{queues: [{id, queueType, queueStatus, location, serviceDescription, serviceCategory, serviceRemote, agreementId}]}`. The repository keeps only rows whose status is **not `CLOSED`** (`ServiceQueueRepository::getServiceQueuesByUser`), so the list carries `OPEN` and `IN_PROGRESS` only: a cancelled queue disappears from it instead of appearing as history. Two backend paths write `CLOSED`, both about a queue-born exchange: `POST /cancel-agreement` and the end-date scheduler once the agreement completes (backend `256b985`) |

A handled queue creates **at most one** agreement per run since backend `089cc78`
(the handler breaks after the first keyword match), where before it kept pairing
one queue with every candidate that shared keywords. That is why a single queue
must not produce several `MATCH_CREATED` pairs or several `IN_PROGRESS` rows; it
is still unreachable in practice while the keyword dictionaries are missing
(`backend-gaps.md` G28).

Matching compares `location` with **exact equality**, so the app must always
send the same composed string it uses everywhere else: `Comune - Provincia`
(`Frontend/src/services/italian-locations.js`, e.g. `Milano - Milano`,
`Sesto San Giovanni - Milano`). The **catalogue** filter is the opposite kind of
match: the backend runs `LOWER(service.location) LIKE '%…%'`, so the app sends the
composed string when a comune is chosen and `" - " + provincia` when only the
province is (`formattaProvinciaPerFiltro`). The leading separator anchors the
match to the province half; without it `Torino` also found
`Torino di Sangro - Chieti` and `Roma` found `Romano di Lombardia - Bergamo`.
`Context_and_DB_V2/province-comuni.json`
(upstream `7408f52`, province → comuni, 110 provinces and 7.894 comuni) is the
dataset the picker reads from; no endpoint serves it and no `Backend/` code
reads it, so the app carries a verbatim copy
(`Frontend/src/services/data/province-comuni.json`, `sha256` equal to the
upstream file) and the upstream file stays read-only.

The queue surface is the `match` tab (`Frontend/src/app/(tabs)/match.jsx`, second
cycle). Five facts decide how a client must talk to these routes:

- **A second active queue is refused, and it is refused with a `500`.** Since
  backend `4c90ccd` `createServiceQueue` asks
  `ServiceQueueRepository::getActiveQueueByUser` first and throws when the answer
  is not `null`, before the credit is spent and before the service lookup; the
  throw is a plain `\Exception`, the controller's `catch (Exception)` names
  `App\Controller\Exception` and never matches (`G13`), so the client reads the
  refusal as a server fault (`backend-gaps.md` G23). The guard counts **both**
  types together, so one offer queue also blocks the request one; the app follows
  the server and disables **both** create actions while a queue is active
  (`hasActiveQueue`, decision **D025**), instead of offering a call that cannot
  succeed and cannot be explained.
- **`GET /get-queues` answers `404` when the list is empty** (`if (!$queuesDTO)`
  in `QueueController::getQueues`): a client reads `404` as `[]`, not as an error
  (`backend-gaps.md` G17).
- **`POST /create-service-queue` needs exactly one service of that type.** The
  lookup ends with `getOneOrNullResult()`, so zero services throw an uncaught
  `TypeError` and two or more throw `NonUniqueResultException`, which escapes to
  the framework error handler as a `500` (the controller's `catch (Exception)`
  never matches: `backend-gaps.md` G13);
  for a `REQUEST` queue the credit is spent **before** the lookup, so a failed
  creation can cost a credit (`backend-gaps.md` G19). The app disables the button
  and says why instead of calling.
- **Any `queueType` other than `OFFER` becomes `REQUEST`** server-side, so a
  client must send one of the two exact strings; the app refuses anything else
  before the request.
- **`400 {"error": "Not enough credits"}`** is the only way to learn that the
  account has no credit: no route exposes the balance (`G15`). The app matches
  that body and shows its own sentence; it never displays a number.

### Credits: the four paths and what the app does with each

A new account starts at `credits = 1` (`Backend/src/Entity/User.php:73`). Four
paths move the number, and the app never reads it: it can only describe the cost
and translate the refusal.

| Path | Movement | Where it lives | What the app does |
| --- | --- | --- | --- |
| Create a `REQUEST` queue | −1 | `ServiceQueueManager::createServiceQueue:69-77`, spent **before** the service lookup | States the cost under the button (`REQUEST_COST_COPY`), refuses anything but the two exact types before calling, and maps `Not enough credits` to its own sentence (`api/areas/queues.js`) |
| Cancel a `REQUEST` queue with no agreement | +1 | `ServiceQueueManager::cancelServiceQueue:97-101` | The confirm modal and the outcome banner say the credit comes back, and only on that row: `OFFER` queues never spent one, and an agreement queue takes the agreement, not the credit |
| Cancel a queue-born agreement | +1 | `AgreementManager::cancelAgreement:187-193`, credited to the proposal's user | Nothing to show: the credit goes to the counterpart, and no route returns a balance |
| Complete a queue-born agreement | +1 | `AgreementEndDateChecker:57-63`, which since backend `256b985` also closes that agreement's queues | Nothing to show, and it cannot happen in the local stack: no worker consumes the scheduler (`G12`) |

Three guards the app owes and keeps: it never creates a queue when the account
does not have **exactly one** service of that type (G19 spends the credit before
the lookup), it never asks for a **second active queue** — both create buttons go
down while a queue is listed, with one sentence saying why (G23 would answer a
`500` that reads like a server fault, decision **D025**) — and it never displays a
balance, because inventing one would be a number the backend does not confirm.

A dry verification of the whole cycle, with an account that has exactly one offer
and one request (`luca.ferrari` / `demo1234`, in the seed): `create REQUEST` →
`201` and the credit goes from 1 to 0; `get-queues` → the row; `cancel-queue/{id}`
→ `200` and the credit returns to 1; `get-queues` again → `404`.

## Another user's services

| Call | Notes |
| --- | --- |
| `GET /users/{id}/services` | `{user: {id, name, surname, username, location, bio, profileImageUrl}, offers: [...], requests: [...]}`. `404` for an unknown or inactive owner, `403` when the viewer's account is inactive. Each service row has the catalog's shape, `location` included |

This is the endpoint behind the offerer mini-card in the service detail.

## Frontend mapping notes

- `OFFER`/`REQUEST` on the wire become `OFFERTA`/`RICERCA` inside the frontend.
- The catalog normaliser also derives the display fields (categories as labels,
  formatted dates, location text) so screens never read backend keys.
- `ApiError` carries the status; `401` triggers logout, `404` on a route the
  product knows is missing becomes the "not available" state rather than an
  error with retry.
