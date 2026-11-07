# API

Endpoints that exist in the backend **today**, as the frontend consumes them.
Canonical sources: `Backend/src/Controller/**`, `Backend/tests/**`, and
`Context_and_DB_V2/API docs/DATABASE_AND_API_GUIDE.md` (the backend-written
guide). What the frontend needs and the backend does not have is in
[`backend-gaps.md`](backend-gaps.md).

Base URL: `http://localhost:8000/api` in development. Every protected call
carries `Authorization: Bearer <jwt>`. Errors are `{"error": "<text>"}` with a
4xx/5xx status; the frontend maps them to Italian copy.

## Authentication

| Call | Body | Response |
| --- | --- | --- |
| `POST /auth/register` | `{name, surname, username, email, password, location, offers[], requests[]}` | `201 {token, user, offers, requests}` |
| `POST /auth/login` | `{username, password}` | `{token, user}` |

`location` is mandatory; `offers` and `requests` may be empty arrays. Items are
`{description, categories[]}`. Registration always assigns `ROLE_USER` and an
active account. The token lasts one hour.

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

`GET /services?q=&categoryIds=1,2&location=&sort=newest|oldest&page=1&limit=20`

Returns `{offers: [...], pagination: {page, limit, totalItems, totalPages}}`.
`limit` defaults to 20, maximum 50. The backend already excludes the viewer's
own services, soft-deleted services, suspended services and inactive owners, and
returns `OFFER` rows only.

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
