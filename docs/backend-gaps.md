# Backend gaps

Endpoints the frontend needs and the backend does not expose yet, in the order
the product needs them. Each block states the call, the payload, the response
and the states the app expects. Until a block is implemented, the matching
frontend surface shows an explicit "not available" state and never invents
data.

Everything here is a **request to the backend maintainer**, not a description of
current behaviour. When one lands, it moves to `api.md`.

## G1 — Relevance ordering on the home catalog

`GET /services` accepts `sort=relevance`, and it becomes the default.

Ordering rule: first every service that shares **at least one category with the
viewer's own REQUEST services**, newest first (`createdAt` then `id`
descending); then every other service, same ordering inside the group. Pagination
must apply after the ordering, so page 2 continues the ranking instead of
restarting it.

Why the backend: the app loads 20 rows per page, so sorting in the client can
only reorder what it already has, which is not the rule above.

Response: unchanged (`offers`, `pagination`); an optional `relevanceRank` per
row is welcome but not required.

## G2 — Remote-only filter

`GET /services` accepts `onlyRemote=true|false`, excluding rows whose
`isRemote` is false when true. Complements `q`, `categoryIds` and `location`.

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

## G4 — Proposals: send and list

`POST /proposals` with `{serviceId}` — the blind proposal described in
`overview.md`: the sender asks for that service and fills in nothing else. The
sender comes from the JWT. `409` if the same pair already has a pending proposal
for that service; `400` for one's own service; `404` for a missing service.

Response: `201 {proposal: {id, serviceId, sender, recipient, status, createdAt}}`
with `status` in `PENDING|ACCEPTED|REFUSED`.

`GET /proposals` → `{sent: [...], received: [...]}`, newest first, with the
counterpart summary so the app can render the bell and the "sent" section
without extra calls.

## G5 — Accept or refuse a proposal

`POST /proposals/{id}/accept` and `POST /proposals/{id}/refuse`, no body.

- `accept` on a `PENDING` proposal creates the agreement and returns
  `{proposal, agreementId}`; the agreement starts with no details compiled.
- `refuse` marks the proposal `REFUSED`; the sender keeps seeing it with that
  state.
- `409` when the proposal is no longer pending, `403` when the caller is not the
  recipient.

## G6 — Agreements: list and detail

`GET /agreements` → `{sent: [...], accepted: [...], concluded: [...]}`, split as
the agreements tab needs. Each row:
`{id, serviceId, serviceDescription, counterpart: {id, username, name}, role,
status, startDate, endDate, detailsStatus, createdAt}` with `status` in
`PENDING|ACCEPTED|REFUSED|CONTESTED|VOID` and `detailsStatus` in
`COMPILED|UNCOMPILED`.

`GET /agreements/{id}` → the same row plus the full sheet and both participants'
confirmation state. Access limited to the two participants (`403` otherwise).

## G7 — Agreement sheet inside the chat

`PUT /agreements/{id}/details` with `{providerId, serviceId, location, isRemote,
startDate, endDate}` — either participant may write it; every write resets the
other participant's confirmation and sets `detailsStatus` to `UNCOMPILED`.

`POST /agreements/{id}/details/confirm` — the other participant confirms;
`detailsStatus` becomes `COMPILED`.

Response: the updated agreement row (G6 shape). `409` if the agreement is not
`ACCEPTED`, `400` if the end date precedes the start date or the service does
not belong to the provider.

## G8 — Chat attached to an agreement

- `GET /agreements/{id}/chat` → `{chatId, messages: [{id, senderId, username,
  message, createdAt}]}`. `403` if the caller is not a participant, `409` if the
  agreement is not `ACCEPTED` (concluded agreements have no accessible chat).
- `POST /agreements/{id}/messages` with `{message}` → `201 {message: {...}}`.
- Polling for new messages: `GET /agreements/{id}/messages?after={messageId}`.

The chat is reachable only from an accepted agreement, which is the only entry
point the product allows.

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
