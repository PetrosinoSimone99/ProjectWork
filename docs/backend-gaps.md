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

## G3 — Public profile of another user

`GET /users/{id}` → the public profile plus the services used to judge
compatibility:

```json
{
  "user": {"id": 7, "name": "Mario", "surname": "Rossi", "username": "mario.rossi",
           "location": "Rome", "bio": "...", "profileImageUrl": "..."},
  "offers": [{"id": 12, "description": "Bicycle repairs", "categories": [...]}],
  "requests": [{"id": 15, "description": "Language lessons", "categories": [...]}]
}
```

No email, no roles, no account status. `404` for an unknown or inactive user.
The service detail popup needs it in the "what they offer and look for" block,
and the recipient of a proposal needs the same data about the proposer.

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

## G7 — Confirmation of the delivery sheet

`POST /send-agreement-details` writes the sheet as `UNCOMPILED` with
`beneficiaryAccepted: null`, and no endpoint ever sets it: the other participant
cannot confirm, `COMPILED` is never reached, and a sheet that is not final is
indistinguishable from one that is. Requested:
`POST /agreements/{id}/details/confirm`, `403` for anyone but the beneficiary,
`409` when the agreement is not `ACCEPTED`.

## G8 — Chat attached to an agreement

`GET /api/chats/agreement/{agreementId}` exists in `ChatController`, but the
`chat`, `chat_messages` and `chat_participants` tables are absent from the
reference dump, so it cannot work. Requested: the schema plus the send/list
routes described in the previous version of this file (`POST` a message, poll
after a message id, `403` for non-participants, `409` when the agreement is not
`ACCEPTED`).

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

## Cross-cutting notes for the backend

- The identity always comes from the JWT; no endpoint above accepts a user id
  from the body.
- Errors keep the existing shape `{"error": "<text>"}`; the frontend maps the
  status, not the text.
- Any endpoint that can be called twice must be idempotent or answer `409`, so
  the app can retry a failed request without creating duplicates.
