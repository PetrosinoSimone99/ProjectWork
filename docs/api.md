# API

Endpoints that exist in the backend **today**, as the frontend consumes them.
Canonical sources: `Backend/src/Controller/**`, `Backend/tests/**`, and
`Context_and_DB_V2/API docs/DATABASE_AND_API_GUIDE.md` (the backend-written
guide). What the frontend needs and the backend does not have is in
[`backend-gaps.md`](backend-gaps.md).

Base URL: `http://localhost:8000/api` in development. Every protected call
carries `Authorization: Bearer <jwt>`. Catalog, auth and staff routes answer
errors as `{"error": "<text>"}` with a 4xx/5xx status. The **agreement routes**
use the wrapped shape `{"error": {"code": …, "message": …}}` instead: the app
maps those by status (`Frontend/src/api/areas/agreements.js`), never by body, so
both shapes reach the user as Italian copy.

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

`profileImageUrl` is a pasted URL (no upload). The frontend accepts only
`http`/`https` URLs ending in `.png`, `.jpg` or `.jpeg` and reports an explicit
error when the image does not load.

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
| `POST /send-agreement-details` | `{agreementId, serviceId, beneficiaryId, fromRemote, startDate, endDate}` | The delivery sheet on an `ACCEPTED` agreement. Today the manager checks only that the agreement exists and is accepted, that `serviceId` belongs to the caller and that the beneficiary exists: **no** participant check and **no** type check on `serviceId` (backend to add, G7). `400` when the end date does not come after the start date. The sheet starts `UNCOMPILED` with `beneficiaryAccepted: null` |
| `POST /cancel-agreement/{agreementId}` | — | An `ACCEPTED` exchange becomes `VOID`. `404` when the caller is not a participant |

The details route used to be a `GET` that read a JSON body, which a browser
cannot send: the sheet was unreachable from the app. It is a `POST` now.

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

`agreementStatus` is `PENDING`, `ACCEPTED`, `REFUSED`, `CONTESTED` or `VOID`:
the reference schema has no `CANCELLED`, so calling off an accepted exchange
produces `VOID`. `response: null` means "has not answered yet" and is not a
refusal. `agreementDetails` is empty until someone writes the sheet, and its
`status` stays `UNCOMPILED` because no endpoint confirms it yet
(`backend-gaps.md` G7). Rows carry no user ids: the viewer is identified by
username, and no row names the exchanged service until the sheet does
(`backend-gaps.md` G4). Because the sheet route needs a `beneficiaryId` that no
row carries, the frontend never calls `POST /send-agreement-details`: the sheet
renders read-only as "Scheda non compilata" (`backend-gaps.md` G6).

## Reports

`POST /reports` with `{reportedUserId, reason}`. The author always comes from the
JWT, never from the body. `reason` is 1 to 2000 characters; reporting yourself
is a `400`; a pair that already reported each other is a `409`.

## Staff

All of these return `403` for a non-staff caller.

| Call | Notes |
| --- | --- |
| `GET /staff/users` | List with role, status and filters |
| `GET /staff/users/{id}` | One user |
| `POST /staff/users/{id}/promote` | Body `{role}` |
| `PATCH /staff/users/{id}/status` | Body `{status}` |
| `GET /staff/reports`, `GET /staff/reports/{id}` | Report list and detail |
| `POST /staff/reports/{id}/claim` | Takes the report into review |
| `PATCH /staff/reports/{id}/review` | Closes it with an outcome and a note |
| `GET /staff/operations`, `GET /staff/operations/{id}` | Audit trail of staff actions |
| `GET /staff/services/deleted` | Deleted services across users |
| `POST /staff/services/{id}/restore` | Restores one |

## Chat (legacy, not usable)

`GET /chats/mutual-proposal/{proposalId}`, `GET /chats/group-proposal/{...}`,
`POST /chats/send-message/{chatId}`, `GET /chats/most-recent-message`,
`GET /chats/check-new-messages/{recentMessageId}`.

The controller is still in the backend, but the tables it needs are absent from
the v3.1 schema and the proposal identifiers it expects no longer exist, so the
frontend does not call them. The chat will be rebuilt on the agreement id; see
`backend-gaps.md` G7 and G8.

## Frontend mapping notes

- `OFFER`/`REQUEST` on the wire become `OFFERTA`/`RICERCA` inside the frontend.
- The catalog normaliser also derives the display fields (categories as labels,
  formatted dates, location text) so screens never read backend keys.
- `ApiError` carries the status; `401` triggers logout, `404` on a route the
  product knows is missing becomes the "not available" state rather than an
  error with retry.
