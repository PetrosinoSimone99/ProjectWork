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
4xx/5xx status. The **agreement routes** may also use the wrapped shape
`{"error": {"code": …, "message": …}}` instead: the app maps those by status
(`Frontend/src/api/areas/agreements.js`), never by body, so both shapes reach
the user as Italian copy.

## Authentication

| Call | Body | Response |
| --- | --- | --- |
| `POST /auth/register` | `{name, surname, username, email, password, location, offers[], requests[]}` | `201 {token, user, offers, requests}` |
| `POST /auth/login` | `{username, password}` | `{token, user}` |

`location` is mandatory, and so are the services: **exactly one entry in
`offers` and exactly one in `requests`**, otherwise `400`. Each entry is
`{description, categoryIds[], isRemote, isSuspended?, location?}`. Registration
assigns an active `ROLE_USER` account with one credit.
The token lasts one hour. Login allows five failed attempts per username/IP and
fifty per IP in fifteen minutes, then returns `429` with `Retry-After`.
Counters are shared through MySQL, including across PHP workers.

## Profile

| Call | Notes |
| --- | --- |
| `GET /profile` | `{profile: {id, name, surname, location, username, email, bio, profileImageUrl, credits}}` |
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

There is at most one non-deleted service per owner/type, including suspended
services: every account carries **one offer and one request**, both created at
registration. Creating a second service of the same type returns `409`. The
owner edits them and cannot remove them: `DELETE` and a status-only `PATCH`
(`isSuspended`) answer `409`, because an account without its two entries could
not take part in the product. Content edits stay open and are blocked only by
active queues or pending/accepted agreements. Staff restore is a separate,
staff-only route and is unaffected.

| Call | Notes |
| --- | --- |
| `GET /offers/mine` | `{offers: [...]}` — the viewer's own offers, newest first |
| `GET /requests/mine` | `{requests: [...]}` — the viewer's own requests |
| `PATCH /offers/{id}` `PATCH /requests/{id}` | Edits `description`, `categoryIds`, `location`, `isRemote`; returns `{offer}`/`{request}`. `isSuspended` alone is a `409` |
| `DELETE /offers/{id}` `DELETE /requests/{id}` | Always `409`: the owner cannot delete a service |
| `GET /offers/deleted` `GET /requests/deleted` | The user's own deleted services (historical rows; the app no longer shows the section) |
| `POST /offers/{id}/restore` `POST /requests/{id}/restore` | Restores a deleted service (historical rows; the app no longer offers it) |

The app shows only the edit action: suspend, delete and restore are gone from
"Offro e cerco" (`decisions.md` D028).

Suspension is no longer a writable state from the app: `PATCH` with `isSuspended`
answers `409`, and historical suspended rows render as such in the owner's list.

**The content edit form carries `location`,** and `null` there clears the column
(`OfferController:71-73`). The edit form composes the value from the province and
comune it shows, so editing an entry whose stored location predates the
`Comune - Provincia` format — `Milano (Lombardia)`, a bare `Roma` — sends `null`
and the old value is lost on the first save. Accepted on 2026-10-13 with the
decision that a deploy database starts fresh (`services/offer-request.js`), and
unreachable on the current seed, where every row is in the new format.

Content changes return `409` while an active queue or pending/accepted agreement
uses the service. Status-only changes preserve those commitments.

## Agreements

| Call | Contract |
| --- | --- |
| `POST /create-exchange-agreement` | `{otherParticipant, serviceId}`; the service belongs to the recipient. The sender must have an available offer. Returns `201`; duplicate pending or accepted service pairs return `409`. **Reciprocal proposal**: when a `PENDING` agreement already exists with the caller as beneficiary for the same two services, that agreement is accepted instead of creating a second one and the body carries `autoAccepted: true`. |
| `GET /get-agreements` | Existing `{success: {code, message, agreements: [...]}}` envelope. Rows include `id, agreementStatus, creationDate, fromQueue, direction, agreementProposal, agreementDetails`. |
| `POST /send-agreement-response` | `{agreementId, response: boolean}`. The sender already consented; the recipient answers once. Repeated answers return `409`. |
| `POST /send-agreement-details` | `{agreementId, notes}`. `notes` is 1..500 characters. The backend writes `startDate`, `fromRemote`, `sentAt` and `status`; the client sends no date. `409` when the other participant's sheet of the same agreement is already compiled: the first sender locks the round. |
| `POST /accept-agreement-details/{agreementId}` | Confirms the other side's sheet: writes `endDate` and closes the exchange (`COMPLETED`), notifies both participants with the details. Uncompiled, repeated or non-accepted confirmations return `409`. |
| `POST /cancel-agreement/{agreementId}` | Cancels an accepted agreement and its queues; repeated cancellation succeeds without another refund. |

Each proposal participant includes `userId, username, role, response,
responseDate, serviceId, serviceDescription`. Each sheet includes
`providerId, providerUsername, beneficiaryId, beneficiaryUsername, serviceId,
serviceDescription, serviceType, fromRemote, startDate, endDate, notes, sentAt,
beneficiaryAccepted, status`. `direction` is `sent` or `received` relative to
the caller.

`startDate` is the moment the proposal was accepted and exists from the moment
the sheet is created; `endDate` is null until the recipient confirms. `notes` is
the free text the sender writes (the one field the form asks for), `fromRemote`
comes from the sender's own service, `sentAt` is when the sheet was sent.

Direct exchanges persist both offers when proposed and create two sheets upon
acceptance, of which **one** is ever compiled: the sheet is written once, by one
participant, and the other confirms or refuses it. Queue matches represent a
single delivery and create one sheet.
Acceptance, sheets and notifications commit together. Legacy unresolved proposal
services cause a controlled conflict instead of selecting an arbitrary offer.
Confirming the sheet moves the agreement to `COMPLETED` and credits the provider
for queue-born deliveries; the scheduler still closes anything left open. The
frontend does not infer completion from its clock.

## Reports

`POST /reports` with `{reportedUserId, reason}`. The author always comes from the
JWT, never from the body. `reason` is 1 to 2000 characters; reporting yourself
is a `400`; a pair that already reported each other is a `409`.

## Staff

`GET /staff/users` also accepts `role=USER|STAFF`. USER excludes staff members;
the role is applied before pagination and totals. Invalid roles return `400`.

All of these return `403` for a non-staff caller.

| Call | Notes |
| --- | --- |
| `GET /staff/users` | Query `page`, `limit`, `q`, `accountStatus`, `role=USER|STAFF`; filters and totals are server-side |
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

History and creation verify agreement participation; sending verifies chat and
agreement participation. Unknown/foreign resources return `404`. Participants
can read historical chats; sending requires ACCEPTED and returns `409` otherwise.
Unexpected errors are logged server-side and return fixed text.

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

Both history and send enforce participation; G24 is corrected.

## Notifications

The backend writes notifications synchronously inside the request that causes
them (agreement proposed, answered, cancelled, sheet written or accepted, chat
message, match created, staff actions). Writing a row is still the only thing
that happens: there is no message broker, no Mercure and no email. What changed
on 2026-11-20 is the read side — `GET /stream` keeps one request open and pushes
the rows that appear (see [Live stream](#live-stream-server-sent-events)). Until
the app connects to it, a client learns about a new row by asking again. Two
readers ask, both with the token:

- the inbox (`useNotifications`) reads every page when the panel opens;
- the profile row (`useUnreadCount`) reads `limit: 1` on focus, on
  pull-to-refresh and **every 30 s while the screen is in the foreground**
  (`UNREAD_POLL_MS`). It sends no request while the app is backgrounded
  (`AppState`) and reads once more when the app comes back, so the badge moves
  without a second, parallel counter.

Reading is not a command and it is not the opening. `PATCH
/notifications/{id}/read` has no bulk form, so **closing** the panel sends one
`PATCH` per unread row it showed (`NotificationsSheet` →
`useNotifications.segnaLetteMostrate`); while the panel is open nothing is marked,
which is what keeps «Non letta» readable. A `PATCH` that fails leaves that row
unread, which is what the row then says. The panel then calls `onLette` and the
profile re-reads the unread count, so the badge is not read before the writes
land.

The inbox reads every page, up to `NOTIFICATIONS_MAX_PAGES` (5, i.e. 100 rows):
`pagination.totalPages` is the real total (`backend-gaps.md` G16, retracted), and
with page 1 alone twenty-one unread notifications would leave the badge above
zero forever. Beyond the cap the badge can stay above zero: declared limit, not a
local counter.

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

## Live stream (Server-Sent Events)

The only push-shaped route of the API, added on 2026-11-20 (`backend-gaps.md`
G32) without a new dependency: no Mercure, no socket server, no broker. The
route holds one normal request open and writes `text/event-stream` frames; a
chat message needs no second channel, because sending one already writes a
`CHAT_MESSAGE` notification carrying `chatId` and the text.

| Call | Contract |
| --- | --- |
| `GET /stream?after=<id>` | `200 text/event-stream`. Token required, like every other `/api` route. `after` is the client's **cursor**: the last notification id it already applied. Omitted means "start at now" — the stream is the live edge, not a backfill. Anything other than one non-negative integer is a `400`; **any other query parameter is a `400`** |

Frames, in order of appearance:

```text
event: hello
data: {"lastId": 42, "unreadCount": 3}

event: notification
id: 43
data: {"notification": {…same shape as one row of GET /notifications…}, "unreadCount": 4}

: ping
```

- **`hello`** is always the first frame: the cursor the server accepted and the
  unread count, so a reconnecting client can reconcile in one step.
- **`notification`** carries a row whose id is greater than the cursor, one
  frame per row, oldest first; `id:` is the new cursor. `unreadCount` is read
  once per tick, not once per row.
- **`: ping`** is a comment frame every 15 s of silence (`heartbeat_ms`), so a
  quiet minute is distinguishable from a dead socket. A parser must ignore
  lines starting with `:`.

Rules the client must respect:

1. **The cursor is the client's.** Reconnect with the id of the last frame it
   applied; a reconnect with an old cursor replays the rows in between (that is
   the recovery path, not a bug) and a cursor from another account yields
   nothing, because every query is scoped to the token's user.
2. **The connection ends by itself after 30 s** (`max_seconds`). This is
   deliberate: a php worker serves one request at a time, so an endless stream
   would eat the dev server's pool. Reconnecting is normal, not an error, and
   the 10 s client timeout of `apiFetch` must not be applied to this route.
3. **The server is not a log.** Only rows written while the request is open (or
   after an explicit cursor) are delivered; history comes from
   `GET /notifications`, which stays the only source of the full list.

Tuning lives in `Backend/config/services.yaml` (`app.stream.poll_ms` = 1000,
`app.stream.heartbeat_ms` = 15000, `app.stream.max_seconds` = 30). Worst-case
latency of a new row is `poll_ms`. The dev stack raises
`PHP_CLI_SERVER_WORKERS` to 12 in `Backend/compose.yaml` because each open
stream holds one worker.

## Service queues (matchmaker)

| Call | Contract |
| --- | --- |
| `GET /get-queues` | `200 {queues: [...]}`, including an empty array; only OPEN and IN_PROGRESS rows. Each row has `id, queueType, queueStatus, location, serviceDescription, serviceCategory, serviceRemote, agreementId, createdAt`. Historical unknown creation times remain null. |
| `POST /create-service-queue` | `{queueType: "OFFER"|"REQUEST"}`. Returns `201`; malformed types return `400`. Missing/unavailable services, another active queue or missing delivery history return `409`. |
| `POST /cancel-queue/{queueId}` | `200`; closing an already closed own queue is idempotent. Unknown or foreign IDs return `404`. An in-progress queue cancels its agreement too. |

One active queue total per account is enforced by row locks and a database
unique index. A request queue costs **one credit and nothing else**; an offer
queue costs nothing. Creation and debit commit atomically. Cancellation refunds
the request owner once; completed queue delivery credits its provider once and
closes both queues. `GET /profile` exposes the balance.

The async worker locks and rechecks both queues, creates at most one agreement,
and commits agreement, sheet, queue changes and notifications together.
Redelivery is safe; a closed, matched, suspended or deleted service is skipped.
Matching requires different owners, a shared category, equal remote mode and
equal normalized location. Known municipalities normalize to `Comune - Provincia`;
unknown or ambiguous text is preserved. A mapped valid dictionary adds a
shared-keyword condition; missing or invalid dictionaries fall back to category.
Remote services retain the same location rule.

Compose runs separate `async` and `scheduler_default` workers. No browser polling
is responsible for matching or completing agreements.

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

### What the app does with a stream frame

One connection per app, opened in the root layout (`src/hooks/useEventStream.js`,
inside `AuthProvider`). A frame is not a payload to draw: `notification.type`
plus `data` say **who** has to re-read, and the predicates in
`src/api/stream.js` decide. Every screen keeps reading its own `GET`.

| Consumer | Rows that make it re-read | Read it repeats |
| --- | --- | --- |
| Open chat (`useChat`) | `CHAT_MESSAGE` whose `data.chatId` is the open one | `GET /chats/check-new-messages/{id}`, then the history |
| Agreements tab (`useAgreements`) | `AGREEMENT_PROPOSAL`, `_RESPONSE`, `_DETAILS`, `_DETAILS_ACCEPTED`, `_CANCELLED`, `_COMPLETED` | `GET /get-agreements` |
| Inbox panel (`useNotifications`) | every row, while the panel is mounted (it is mounted only while open) | `GET /notifications`, every page |
| Profile badge (`useUnreadCount`) | `unreadCount` of `hello` and of every frame; the 120 s poll is the fallback when the stream is not connected | nothing: the count travels in the frame |
| Profile screen | `USER_PROMOTED`, `USER_STATUS_CHANGED`, `SERVICE_RESTORED` | `GET /profile` and the stored session (role and account state are not in the row) |
| Match tab | `MATCH_CREATED` | `GET /get-queues` and `GET /profile` (a match spends the request credit) |

The type is compared in upper case, the same way the inbox normalises it: the
scheduler writes `agreement_completed` in lower case and it still reaches the
agreements tab.

**Declared limits.** The stream carries the rows the backend writes, so screens
whose tables write no notification are outside it and stay on focus and
pull-to-refresh: the home catalog (`useServiceCatalog`), another user's public
profile and the staff lists. A reconnect hands back the client's cursor, so a
gap inside a session is replayed once and not twice; an app restart starts at
the live edge and the focus reads cover the gap. `UNREAD_POLL_MS` (120 s) and
`CHAT_POLL_MS` (60 s) remain as the fallback for a stream that is down.
