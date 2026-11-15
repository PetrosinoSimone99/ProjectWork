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

The consequence is concrete, not theoretical: because the client has no
`beneficiaryId` to send, `POST /send-agreement-details` cannot be called from
the app at all, so the sheet stays empty forever from the product's point of
view. Until ids arrive the sheet renders read-only and says "Scheda non
compilata" instead of offering a form that would guess a user id.

## G7 — Confirmation of the delivery sheet — LANDED 2026-11-15

`POST /accept-agreement-details/{agreementId}` now sets `beneficiaryAccepted` and
`COMPILED` and notifies the provider. One leftover: an already-accepted sheet
answers `500` **with the exception message appended** instead of a `409`
(`Backend/src/Controller/AgreementController.php:281`), while the route that
writes the sheet answers a clean `Internal Server Error`. The frontend still has
no sheet form, because rows lack ids (`G6`), so nothing calls either route yet.

## G8 — Chat attached to an agreement — LANDED 2026-11-15

`chat`, `chat_messages` and `chat_participants` are in the reference schema and
the four routes are authenticated: `GET /chats/agreement/{id}`,
`POST /chats/send-message/{chatId}` with `{message}`, `GET /chats/most-recent-message`,
`GET /chats/check-new-messages/{recentMessageId}`. Sending creates a
`CHAT_MESSAGE` notification. The remaining gap is ours: no chat screen exists.

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
(`Backend/src/Repository/ServiceQueueRepository.php:24`). The app composes
`"Milano (Lombardia)"` and the column stores free text, so a queue created from
the app never matches one seeded or typed by hand (`"Milano"`). The column is
also `varchar(100)` against `varchar(255)` on `users` and `services`
(`Context_and_DB_V2/barattolo_15112026.sql:193`). Requested: the same width as
the others and either a normalised comparison or a documented contract that the
string is exactly the client's composed one.

## G12 — Nothing consumes the scheduler, so `COMPLETED` is never written

`App\Schedule\AgreementEndDateChecker` is registered (`bin/console debug:scheduler`
lists `every 30 minutes … ServiceCallMessage`), but the task only runs while a
worker consumes `scheduler_default`, and the stack starts none: an agreement
whose end date passed stays `ACCEPTED` forever. Two smaller defects next to it:
the notification type it writes is `agreement_completed`, lower case, unlike
every other `AGREEMENT_*` type, and `$details->getStartDate()->format(...)` is
called on a nullable column (`Backend/src/Schedule/AgreementEndDateChecker.php:49`)
inside a loop that can find details without one.

## G13 — Queue routes swallow their own error branch

`QueueController` writes `catch (Exception $e)` without `use Exception`
(`Backend/src/Controller/QueueController.php:15,50,69,84`): inside `App\Controller`
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

`users.credits` exists and the queue endpoints spend and refund it, but no
endpoint returns it: `GET /profile` does not include it, so the app cannot show
a balance and a `REQUEST` queue that fails with `Not enough credits` has no
visible number behind it. Requested: `credits` in `GET /profile` (or a small
`GET /credits`).

## G16 — The notifications page count is page-scoped

`NotificationController` answers `pagination.totalItems = count($items)` — the
rows of the page it just returned — and `totalPages = ceil(total / limit)`
(`Backend/src/Controller/NotificationController.php:37`). With a full first page
that is `{totalItems: 20, totalPages: 1}` whatever the real total is, so a client
cannot tell whether a second page exists and `page=2` is unreachable by design:
notifications past the twentieth cannot be read from the app at all. Requested:
`totalItems` from a `COUNT(*)` of the same filter (the repository already has
`countUnread`, so the shape exists). Until then the inbox shows the newest page
and does **not** draw a "load more" button it could never justify.

## Cross-cutting notes for the backend

- The identity always comes from the JWT; no endpoint above accepts a user id
  from the body.
- Errors keep the existing shape `{"error": "<text>"}`; the frontend maps the
  status, not the text.
- Any endpoint that can be called twice must be idempotent or answer `409`, so
  the app can retry a failed request without creating duplicates.
