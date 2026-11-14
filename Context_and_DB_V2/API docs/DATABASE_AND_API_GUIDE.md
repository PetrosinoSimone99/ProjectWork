# Database and API quick guide

This guide covers authentication, profiles, services, reports and staff administration. It does not describe every feature present in the backend or historical database dumps.

## Current database

The schema reference is the dump selected by [LAST_DB_TO_USE.txt](../LAST_DB_TO_USE.txt), currently [barattolo_demo_20261108.sql](../barattolo_demo_20261108.sql). Older dumps and migrations describe historical versions, not the selected schema. The demo contains 50 categories, 30 users (including 2 staff), 200 offers and 100 requests. See [demo accounts and import instructions](../DEMO_DATABASE.md); all demo passwords are `demo`, stored as hashes.

For a fresh installation only, import the selected file into a new empty database and configure your own connection and JWT keys. Do not run the historical migrations or Doctrine schema-update commands over this schema: they can recreate removed structures or alter tables that remain intentionally unmapped.

The dump no longer contains `tokens` or `token_redemptions`; their APIs and lifecycle processing have also been removed. JWT login and authorization are unchanged. Existing staff history, including token events, remains readable.

All six chat endpoints and their code are retained. Their chat and proposal tables are absent from the selected dump, so these endpoints cannot operate with that dump alone. No replacement chat schema or new chat workflow is provided. See [chat documentation](../mini_doc_chat_endpoint.md).

### Import for a fresh setup

Read `LAST_DB_TO_USE.txt` before selecting a file. For the currently selected dump, the MySQL commands from the repository root are:

```sql
CREATE DATABASE barattolo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE barattolo;
SOURCE Context_and_DB_V2/barattolo_demo_20261108.sql;
```

Do not import over an existing database whose data must be retained. These instructions are not a verification that the dump has been imported locally.

### Current service fields

| API field | SQL column | Default | Behavior |
| --- | --- | --- | --- |
| `isRemote` | `services.is_remote` | `false` | Marks an offer or request as remote; does not change geographic filters |
| `isSuspended` | `services.is_suspended` | `false` | Hides an offer or request from the catalog; the owner still sees it in personal lists |
| `location` | `services.location` | `null` | Optional service location, independent of the profile; used by the homepage location filter |

All three fields are optional in `POST /api/services` and in every `offers`/`requests` item in `POST /api/auth/register`. Change them with `PATCH /api/offers/{id}` or `PATCH /api/requests/{id}`. For example:

```json
{"isRemote":true,"isSuspended":false,"location":"Rome"}
```

`isRemote` and `isSuspended` accept only JSON booleans; other types, including `null`, return `400` without partial changes. `location` accepts text of at most 255 characters after trimming, or `null`; empty text becomes `null`. Omitted PATCH fields retain their values. Suspension is manual: send `true` to suspend or `false` to reactivate. Only the active owner can update a service. Any update is blocked with `409` when existing links prevent changing the service, including historical links. All service representations include these three fields. The [location section](#optional-location-for-offers-and-requests) explains creation, clearing and filtering.

### Staff history and report assignment

`GET /api/staff/operations` lists effective staff changes with pagination and optional `staffId`, `action`, `targetType` and `targetId` filters. `GET /api/staff/operations/{id}` reads one entry. Both require an active staff account. Entries contain the authenticated actor, action, target, before/after values and UTC date; they cannot be created, edited or deleted through the API. See [Staff operation history](#staff-operation-history) for actions, response examples and validation rules.

The selected dump already defines service locations, staff operation history and report assignment. Use it directly as the schema reference; historical migration execution is outside this setup.

## 1. Configure the database connection

Create an empty MySQL database called `barattolo`, then create `Backend/.env.local`.

### MAMP on macOS

MAMP normally uses MySQL port `8889` and the `root` user with password `root`:

```env
DATABASE_URL="mysql://root:root@127.0.0.1:8889/barattolo?serverVersion=8.0&charset=utf8mb4"
```

### Laragon or XAMPP on Windows

Laragon and XAMPP normally use MySQL port `3306` and the `root` user without a password:

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/barattolo?serverVersion=8.0&charset=utf8mb4"
```

If the local database uses a different password, port, or MariaDB version, replace those values. For MariaDB, use its actual version, for example `serverVersion=mariadb-10.11.2`.

Use the dump selected by `LAST_DB_TO_USE.txt` for a fresh installation. Historical migrations are not an alternative setup for this schema.


Generate local JWT keys once before using registration or login:

```bash
openssl genpkey -algorithm RSA -out config/jwt/private.pem -pkeyopt rsa_keygen_bits:4096
openssl pkey -in config/jwt/private.pem -pubout -out config/jwt/public.pem
```

## 2. Start the API

Configure Apache to use `Backend/public` as its document root. With MAMP, XAMPP, or Laragon, the API is then usually available at `http://localhost` (MAMP often uses port `8888`).

For a quick local test, run:

```bash
php -S localhost:8000 -t public
```

The API URL will be `http://localhost:8000`.

## 3. Register a user

Registration creates the account, location, offers, requests, and any new categories in one call. Send a `POST` request to `/api/auth/register` with at least one offer and one request. Use category names to create or reuse categories:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Mario","surname":"Rossi","username":"mario.rossi","email":"mario@example.com","password":"my-safe-password","location":"Milan","offers":[{"description":"I can cook Italian meals.","categories":["Cooking"]}],"requests":[{"description":"I need help with gardening.","categories":["Gardening"]}]}'
```

The top-level profile `location` must be non-empty and no longer than 255 characters. Each item in `offers` and `requests` may also include its own optional `location` (text up to 255 characters after trimming, or `null`); it is never copied from the profile. `offers` and `requests` must each be non-empty lists. Every service description must be non-empty and no longer than 255 characters. Each service must include at least one category using `categories`, `categoryIds`, or both. Category names are trimmed, must be non-empty and no longer than 255 characters, and match existing categories without case sensitivity. A new category is added to the shared catalog; a matching category is reused. Existing `categoryIds` remain supported and must refer to existing categories. Do not repeat the same category in one service.

To combine category names and existing IDs in one service, include both fields:

```json
{
  "description": "I can repair bicycles.",
  "categories": ["Repairs"],
  "categoryIds": [2]
}
```

The response has status `201` and contains a JWT token, safe user data, and the saved services:

```json
{
  "token": "YOUR_JWT_TOKEN",
  "user": {
    "id": 1,
    "name": "Mario",
    "surname": "Rossi",
    "location": "Milan",
    "bio": null,
    "profileImageUrl": null,
    "username": "mario.rossi",
    "email": "mario@example.com",
    "roles": ["ROLE_USER"],
    "accountStatus": "ACTIVE"
  },
  "offers": [
    { "id": 1, "type": "OFFER", "description": "I can cook Italian meals.", "categories": [{ "id": 1, "description": "Cooking" }] }
  ],
  "requests": [
    { "id": 2, "type": "REQUEST", "description": "I need help with gardening.", "categories": [{ "id": 2, "description": "Gardening" }] }
  ]
}
```

The account, services, new categories, and category links are saved together. If the request is invalid or an ID refers to a category that does not exist, no account, service, or category is created. Passwords and password hashes are never returned.

## 4. Login

Send a `POST` request to `/api/auth/login`:

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mario.rossi","password":"my-safe-password"}'
```

The returned JWT expires after one hour. Future protected endpoints must receive it in this header:

```text
Authorization: Bearer YOUR_JWT_TOKEN
```

## 5. Common responses

| Status | Meaning |
| --- | --- |
| `201` | Registration completed. |
| `200` | Login completed. |
| `400` | Invalid JSON or missing data. |
| `404` | One or more category IDs do not exist. |
| `401` | Invalid username or password. |
| `403` | The account is inactive. |
| `409` | Username or email already exists. |

## 6. Read and update your profile

The profile endpoints require a JWT from an active account. `GET /api/profile` returns the signed-in user's profile, including account contact details. `PATCH /api/profile` changes only fields included in its JSON body.

```bash
curl http://localhost:8000/api/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

```bash
curl -X PATCH http://localhost:8000/api/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \\
  -d '{"name":"Mario","location":"Milan","bio":"I enjoy exchanging practical skills.","profileImageUrl":"https://example.com/profiles/mario.jpg"}'
```

Both endpoints return a `profile` object with `id`, `name`, `surname`, `location`, `username`, `email`, `bio`, and `profileImageUrl`. Send `null` for `location`, `bio`, or `profileImageUrl` to clear an existing value. The profile image is stored as an HTTPS URL; the server does not upload or host image files.

The PATCH endpoint accepts `name` and `surname` up to 50 characters, `location` up to 255 characters, `bio` up to 1,000 characters, and `profileImageUrl` up to 2,048 characters. Names and locations must not be blank. Unknown fields and account fields such as username, email, password, roles, or account status are rejected with `400 Bad Request`. Public catalog responses include bio and profile image URL, but never email, roles, password data, or account status.

## 7. Service publishing

Use the selected dump for the database schema.


All endpoints in this section require an active account and this header:

```text
Authorization: Bearer YOUR_JWT_TOKEN
```

### List the category catalog

Categories must already exist in the database. Their IDs are used when publishing services.

```bash
curl http://localhost:8000/api/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Example response:

```json
{
  "categories": [
    { "id": 1, "description": "Cooking" },
    { "id": 2, "description": "Gardening" }
  ]
}
```

### Publish an offered or requested service

Use `OFFER` for a service the user can provide and `REQUEST` for a service the user needs. At least one existing category ID is required.

```bash
curl -X POST http://localhost:8000/api/services \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"OFFER","description":"I can cook Italian meals.","categoryIds":[1],"location":"Rome"}'
```

The endpoint returns `201 Created` with the new service.

### Browse homepage offers

The homepage catalog is available to authenticated active users. It returns only `OFFER` services published by other active users, so a user never sees their own offers or inactive accounts in this list.

```bash
curl "http://localhost:8000/api/services?q=bicycle&categoryIds=1,3&location=Rome&sort=newest&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

All query parameters are optional:

| Parameter | Meaning | Allowed values / default |
| --- | --- | --- |
| `q` | Case-insensitive partial search in the service description | Text up to 255 characters |
| `categoryIds` | Comma-separated category IDs | Positive integers; matching any selected category |
| `location` | Case-insensitive partial search in the service's location | Text up to 255 characters |
| `isRemote` | Remote or in-person services | Exactly `true` or `false`; omit to include both |
| `sort` | Creation-date ordering within each priority group | `newest` (default) or `oldest` |
| `page` | Page to return | Positive integer, default `1` |
| `limit` | Offers per page | Integer from `1` to `50`, default `20` |

The viewer's desired categories come from their own `REQUEST` services that are
neither suspended nor deleted, including requests created during registration.
An offer matching any desired category comes before all remaining offers. Within
each group, offers are ordered by creation date and then ID, both descending by
default; `sort=oldest` makes both ascending while keeping preferred offers first.
Without valid requests, all offers use the requested date ordering.

Pagination applies to this single ordered list, so a page can contain the last
preferred offers followed by the first remaining offers. Offers with several
matching categories appear once and retain all their categories in the response.
Totals count all offers matching the filters, across both groups.

All filters apply to both groups and combine using AND. `categoryIds` matches any
listed category and restricts the results; it does not change saved preferences.
Omit it to browse all categories, including any existing uncategorized offers.
Publishing new services still requires at least one category. Filters are not saved.
Changing, suspending, deleting or restoring a request affects the next homepage
request automatically. Start again at page 1 after changing filters or requests;
pagination does not freeze the catalog against concurrent changes.

For example, `GET /api/services?isRemote=true&page=1&limit=20` shows remote offers,
with desired categories first. `GET /api/services?page=1&limit=20` shows all offers
under the usual visibility rules. Neither request changes preferences.

Example response:

```json
{
  "offers": [
    {
      "id": 12,
      "type": "OFFER",
      "description": "I can repair bicycles.",
      "location": "Rome",
      "isRemote": false,
      "isSuspended": false,
      "createdAt": "2026-09-25T10:00:00+00:00",
      "categories": [{ "id": 3, "description": "Repairs" }],
      "owner": {
        "id": 4,
        "name": "Mario",
        "surname": "Rossi",
        "username": "mario.rossi",
        "location": "Rome"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

The owner object intentionally contains public profile data only. Email addresses, roles, passwords, and account status are never returned by this endpoint. Invalid query parameters return `400 Bad Request`; a page beyond the final page returns an empty `offers` array with correct pagination metadata.

The `location` filter searches only the service's location, not `owner.location`. Offers with a null service location do not match a non-empty location filter. Service and profile locations may differ; no fallback or automatic copy is applied.

## Quick guide: use the homepage offers API

This short walkthrough shows the usual steps for loading offers in a homepage. Replace `http://localhost:8000` with the base URL used by your frontend. Every marketplace request requires a JWT from an active account.

### 1. Get an access token

Register a new account, or log in with an existing one. Save the `token` value from the JSON response.

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mario.rossi","password":"my-safe-password"}'
```

The response includes `token` and `user`. Send the token in the `Authorization` header on the following requests:

```text
Authorization: Bearer YOUR_JWT_TOKEN
```

### 2. Load the available categories

Use the category IDs as filter values when searching. Categories are read-only through this API and must already exist in the database.

```bash
curl http://localhost:8000/api/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Load homepage offers

Request the first page of offers without filters:

```bash
curl "http://localhost:8000/api/services?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Search for bicycle services in Rome in either category `2` or category `5`:

```bash
curl "http://localhost:8000/api/services?q=bicycle&categoryIds=2,5&location=Rome&sort=newest&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

The `offers` array contains the service description, its categories, creation time, and the owner's public profile. The `pagination` object reports the requested page, page size, total number of matching offers, and total page count. An empty `offers` array means that no offers matched the filters or that the requested page is past the last page.

### Common errors

| Status | Meaning | What to check |
| --- | --- | --- |
| `400` | A query parameter is invalid | Use positive integer page/category IDs, a limit from 1 to 50, and `newest` or `oldest` for sorting |
| `401` | The token is missing or invalid | Log in again and send `Authorization: Bearer <token>` |
| `403` | The account is inactive | An active account is required to use marketplace endpoints |

The homepage API shows offers from other active users only. It never returns the signed-in user's own offers or private owner fields such as email and roles.

### Manage your own offers

Load the offers published by the signed-in user. Results are ordered newest first and include the offer description, categories, and creation time:

```bash
curl http://localhost:8000/api/offers/mine \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

The response contains an `offers` array. It is empty when the user has not published any offers.

Update an offer with `PATCH /api/offers/{id}`. You can send any combination of description, category IDs, and isRemote. Omitted fields stay unchanged, while `categoryIds` replaces the full category list:

```bash
curl -X PATCH http://localhost:8000/api/offers/12 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"I can repair bicycles and scooters.","categoryIds":[3]}'
```

The response contains the updated offer in an `offer` field. Descriptions must contain 1 to 255 characters. Category IDs must be a non-empty list of unique IDs that exist in the database.

Delete an unused offer with `DELETE /api/offers/{id}`:

```bash
curl -X DELETE http://localhost:8000/api/offers/12 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Successful deletion returns `204 No Content`. Updating or deleting an offer returns `404` when it does not exist or belongs to another user, `400` for invalid update data, and `409` when the offer is already connected to an exchange. All these endpoints require an active account and a JWT.

## User reports API and updated database dump (2026-10-13)

### Report another user

`POST /api/reports` allows an active, authenticated user to report another existing user. No previous interaction with the reported user is required. The reported account may be inactive. The author is always taken from the JWT, so the frontend must not send an author ID.

```bash
curl -X POST http://localhost:8000/api/reports \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reportedUserId":2,"reason":"This user repeatedly sent offensive messages."}'
```

| Field | Required | Rules |
| --- | --- | --- |
| `reportedUserId` | Yes | A positive JSON integer identifying an existing user other than the author; numeric strings are rejected |
| `reason` | Yes | Free text containing 1 to 2000 characters after removing leading and trailing whitespace |

Unknown fields are rejected. A successful request returns `201 Created`:

```json
{
  "report": {
    "id": 1,
    "reportedUserId": 2,
    "reason": "This user repeatedly sent offensive messages.",
    "createdAt": "2026-10-13T12:00:00+00:00"
  }
}
```

The response contains only the report data and the target ID, without private user profiles. Each author can report a given user only once, permanently. Repeating the request returns `409` and preserves the original report. The opposite direction is independent: user B can still report user A after A reports B. A unique database constraint also prevents duplicates from simultaneous requests.

| Status | Meaning |
| --- | --- |
| `201` | The report was saved |
| `400` | Invalid JSON, missing or unknown fields, invalid field values, or an attempt to report yourself |
| `401` | Missing, invalid, or expired JWT; use the existing authentication endpoints |
| `403` | The author's account is inactive |
| `404` | The reported user does not exist |
| `409` | The author has already reported this user |

Application validation errors use `{"error":"An English explanation."}`. Authentication errors continue to use the existing JWT security responses. This endpoint records the report only; it does not notify anyone, disable accounts, or provide staff review endpoints.

The selected dump defines report authors, targets, review and assignment fields. Historical v2 dumps remain unchanged and are not setup references.

## Staff administration and report review API (2026-10-13)

### Staff access and first account

Every `/api/staff` endpoint requires a valid JWT, an active account and `ROLE_STAFF`. Staff log in through the existing `POST /api/auth/login` endpoint. Account roles and status are loaded from the database for each authenticated request: an existing JWT gains staff access after promotion, and an inactive account cannot use protected APIs even with an unexpired token. Reactivation lets that token work again until its original expiry.

Login, registration, public category reads and CORS preflight keep their existing behavior. Inactive accounts are still refused at login. Public registration never accepts a chosen staff role.

To create the first staff account, run the existing server command from `Backend`:

```bash
php bin/console app:create-staff Alice Bianchi alice.staff alice@example.com 'safe-password'
```

Once a staff account exists, it can promote existing active users through the API. There is no demotion endpoint. Staff cannot change the account status of themselves or any other staff member.

### Endpoint overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/staff/users` | List users, including inactive users and staff |
| `GET` | `/api/staff/users/{id}` | Read one user's administrative profile |
| `POST` | `/api/staff/users/{id}/promote` | Add the staff role to an active user |
| `PATCH` | `/api/staff/users/{id}/status` | Activate or deactivate a regular user |
| `GET` | `/api/staff/reports` | List reports and their review information |
| `GET` | `/api/staff/reports/{id}` | Read one report |
| `POST` | `/api/staff/reports/{id}/claim` | Assign a pending report to the authenticated staff member |
| `PATCH` | `/api/staff/reports/{id}/review` | Confirm or reject a pending report or your assigned report permanently |

Send `Authorization: Bearer YOUR_STAFF_JWT` with every request. User responses include ID, name, surname, location, biography, profile image URL, username, email, roles and account status. They never include passwords or password hashes.

### List and inspect users

```bash
curl "http://localhost:8000/api/staff/users?q=mario&accountStatus=ACTIVE&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_STAFF_JWT"

curl http://localhost:8000/api/staff/users/2 \
  -H "Authorization: Bearer YOUR_STAFF_JWT"
```

All query parameters are optional:

| Parameter | Rules |
| --- | --- |
| `page` | Positive integer, default `1` |
| `limit` | Integer from `1` to `50`, default `20` |
| `q` | Search text, at most 255 characters, matching name, surname, username or email case-insensitively; SQL LIKE wildcards `%` and `_` are supported |
| `accountStatus` | Exactly `ACTIVE` or `INACTIVE` |

Users are ordered by ID ascending. The list response is `{"users":[...],"pagination":{"page":1,"limit":20,"totalItems":2,"totalPages":1}}`; detail responses use `{"user":...}`. A page beyond the final page returns an empty array with the correct totals. Unknown or invalid query parameters return `400`.

### Promote, activate or deactivate a user

Promotion does not require a request body:

```bash
curl -X POST http://localhost:8000/api/staff/users/2/promote \
  -H "Authorization: Bearer YOUR_STAFF_JWT"
```

It adds `ROLE_STAFF`, preserving all existing roles. Repeating promotion of an active staff account returns `200` without changes. An inactive account returns `409`: activate the regular user first. This endpoint does not accept role selection or other editable fields.

To change a regular user's account status:

```bash
curl -X PATCH http://localhost:8000/api/staff/users/2/status \
  -H "Authorization: Bearer YOUR_STAFF_JWT" \
  -H "Content-Type: application/json" \
  -d '{"accountStatus":"INACTIVE"}'
```

Use `ACTIVE` to reactivate. Both operations return `200` with `{"user":...}`. Applying the same status again is allowed. Attempting to change any staff account's status returns `403`. Promotion and status changes lock the same user row in a transaction, so concurrent requests cannot produce an inactive staff account. Deactivation changes access to protected APIs; it does not delete services, reports or exchanges.

### List and inspect reports

```bash
curl "http://localhost:8000/api/staff/reports?status=PENDING&reportedUserId=2&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_STAFF_JWT"

curl http://localhost:8000/api/staff/reports/1 \
  -H "Authorization: Bearer YOUR_STAFF_JWT"
```

Optional filters are `status` (`PENDING`, `IN_REVIEW`, `CONFIRMED` or `REJECTED`), `reporterId` and `reportedUserId` (positive integers). Without filters, all reports are listed. Pagination uses the same `page` and `limit` rules as the user list. Reports are ordered by creation time descending, then ID descending.

List responses contain `reports` and `pagination`; detail and review responses contain `report`. A pending report has this shape:

```json
{
  "report": {
    "id": 1,
    "reportedUserId": 2,
    "reason": "Repeated offensive messages.",
    "createdAt": "2026-10-13T12:00:00+00:00",
    "reporter": {"id": 1, "username": "alice", "name": "Alice", "surname": "Bianchi"},
    "reportedUser": {"id": 2, "username": "mario", "name": "Mario", "surname": "Rossi"},
    "status": "PENDING",
    "assignedTo": null,
    "assignedAt": null,
    "reviewNote": null,
    "reviewedBy": null,
    "reviewedAt": null
  }
}
```

Author, target, assignee and reviewer summaries contain only ID, username, name and surname. Report list filters matching no rows return an empty array, including when a filtered user ID does not exist.

### Claim a report

```bash
curl -X POST http://localhost:8000/api/staff/reports/1/claim \
  -H "Authorization: Bearer YOUR_STAFF_JWT"
```

No request body is required; an empty JSON object is also accepted. Invalid JSON or any body fields return `400`. The assignee always comes from the JWT. A pending report becomes `IN_REVIEW`; the response is `200` with `{"report": ...}`, including `assignedTo` (ID, username, name and surname) and ISO 8601 `assignedAt`. `reviewNote`, `reviewedBy` and `reviewedAt` remain null until closure. Staff list and detail responses include both assignment fields.

A missing report returns `404`. Claiming an assigned or closed report returns `409`, even for the same staff member. Only the assignee may close an `IN_REVIEW` report; another staff member receives `403`. Reassignment, release and reopening are not supported. Filter these reports with `GET /api/staff/reports?status=IN_REVIEW`.

Both paths are supported: `PENDING -> CONFIRMED/REJECTED` and `PENDING -> IN_REVIEW -> CONFIRMED/REJECTED`. Direct closure leaves assignment fields null. Closure after a claim preserves the assignment and records the final reviewer separately. Claim and review lock the same report row, so concurrent operations cannot overwrite an assignment or a final outcome.

The historical migration `Version20261019000100` added only nullable `assigned_to_id INT` (foreign key to `users.id`, indexed) and `assigned_at DATETIME`. Existing states and data are preserved. `status VARCHAR(10)` already fits `IN_REVIEW`. The migration is irreversible because removing assignment data would leave reports in review without an assignee.

The selected dump already contains the assignment fields. Historical migration execution is not part of this setup.

### Close a report with an outcome and note

```bash
curl -X PATCH http://localhost:8000/api/staff/reports/1/review \
  -H "Authorization: Bearer YOUR_STAFF_JWT" \
  -H "Content-Type: application/json" \
  -d '{"status":"CONFIRMED","reviewNote":"The supplied evidence confirms the reported behavior."}'
```

Use `CONFIRMED` or `REJECTED`. A `reviewNote` containing 1 to 2000 characters after trimming whitespace is mandatory. The reviewer comes from the authenticated staff account; the backend supplies the review time. A successful review returns `200` with the full report, its final status, note, reviewer summary and ISO 8601 review time.

Closure is definitive. A second review, even an identical retry, returns `409` without changing the first review. The backend locks the report while checking its state and assignee and saving the outcome, preventing concurrent reviewers from overwriting each other. Confirmation does not automatically deactivate the target: use the separate status endpoint when appropriate. Closing a report does not allow its author to submit another report for the same user. The existing `POST /api/reports` request and response shapes remain unchanged.

### Errors and schema update

| Status | Meaning |
| --- | --- |
| `400` | Invalid JSON, unknown fields or query parameters, invalid filters, unsupported account/report status, or a missing/invalid review note |
| `401` | Missing, invalid or expired JWT |
| `403` | A regular user attempted staff access, the requester is inactive, the target status belongs to a staff account, or another staff member owns the report in review |
| `404` | The user or report identified in the path does not exist |
| `409` | Promotion of an inactive account, an already claimed/reviewed report, or a retryable database concurrency conflict |

Controller validation errors use `{"error":"An English explanation."}`. Firewall authentication and role-denial responses retain the existing Symfony/JWT behavior. All statuses and request field names are case-sensitive. Modification payloads reject unknown fields.

The selected dump includes report review and assignment fields. Use the database setup above; no historical migration execution is required by these instructions.

## Manage your own service requests

These endpoints manage services whose type is `REQUEST`. All three endpoints require an active account and `Authorization: Bearer YOUR_JWT_TOKEN`. The owner is always the signed-in user.

### List your requests

```bash
curl http://localhost:8000/api/requests/mine \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Returns `200 OK` with requests ordered by creation date and then ID, both newest first. The response contains every category for each request:

```json
{
  "requests": [
    {
      "id": 2,
      "type": "REQUEST",
      "description": "I need help with gardening.",
      "location": null,
      "isRemote": false,
      "isSuspended": false,
      "createdAt": "2026-10-13T10:30:00+00:00",
      "categories": [{ "id": 1, "description": "Gardening" }]
    }
  ]
}
```

If the user has no requests, the response is `{"requests":[]}`. Offers and other users' requests are excluded. There is no pagination.

### Update your request

```bash
curl -X PATCH http://localhost:8000/api/requests/2 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"I need help pruning trees.","categoryIds":[1]}'
```

Send any combination of `description`, `categoryIds`, `isRemote`, `isSuspended` and `location`. Omitted fields stay unchanged; `categoryIds` replaces all selected categories. Descriptions are trimmed and must contain 1 to 255 characters. Category IDs must be a non-empty list of unique positive integers referring to existing categories. Numeric strings are also accepted, as in the offers API. Boolean fields accept only JSON booleans. `location` accepts text up to 255 characters after trimming or `null`; null or empty text clears it. The owner, type, and creation time cannot be changed. Empty bodies, invalid JSON, and unknown fields are rejected. Invalid input never saves part of an update.

Returns `200 OK` with the updated service in `{"request":{...}}`, using the same fields as the list response.

### Delete your request

```bash
curl -X DELETE http://localhost:8000/api/requests/2 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Soft deletes an unused request by setting its UTC deletion date and returns `204 No Content` with an empty response body.

### Errors and linked services

| Status | Meaning |
| --- | --- |
| `400` | Invalid JSON, an empty update, invalid description/category IDs, or unknown fields |
| `401` | Missing, invalid, or expired JWT |
| `403` | The signed-in account is inactive |
| `404` | The service does not exist, belongs to another user, is an offer, or a supplied category does not exist |
| `409` | The request is connected to an exchange, or a concurrent database operation conflicts with the write |

Updating and deleting are blocked when existing links prevent changing a service, including historical links. Service row locks keep the reference check and write in the same transaction. The offers API uses the same protection and retains its existing response format. The selected dump includes `services.deleted_at`.

## Optional remote availability for offers and requests

Both `OFFER` and `REQUEST` services have an `isRemote` boolean. Use `true` for a remote service. The field is optional when creating a service and defaults to `false`, including for existing services after migration.

Send it in `POST /api/services`:

```json
{"type":"OFFER","description":"I can teach English online.","categoryIds":[1],"isRemote":true}
```

During `POST /api/auth/register`, each item in both `offers` and `requests` also accepts `isRemote`. For example, an item can be `{"description":"Online English lessons.","categories":["Languages"],"isRemote":true}`.

Update either type with `PATCH /api/offers/{id}` or `PATCH /api/requests/{id}`:

```json
{"isRemote":false}
```

A PATCH can contain only `isRemote`, or combine it with `description` and `categoryIds`. Omitted fields keep their current values. Only JSON `true` and `false` are accepted; explicit `null`, strings, numbers, arrays and objects return `400` without saving changes. Existing ownership, authentication and linked-service restrictions still apply.

Service objects in creation and registration responses, the homepage and personal lists include `isRemote` as a boolean. The field does not change geographic filters.

### Database update

The selected dump includes these fields. Historical migrations remain in the repository for earlier schemas; do not apply them over this dump.

## Suspend or reactivate an offer or request

Both service types have an `isSuspended` boolean. It defaults to `false`, including for existing services after migration. Suspension is manual and has no automatic expiry.

The active owner can suspend a service with `PATCH /api/offers/{id}` or `PATCH /api/requests/{id}`:

```json
{"isSuspended":true}
```

Send `{"isSuspended":false}` to reactivate it. The same optional field is accepted by `POST /api/services` and by each item in `offers` and `requests` during registration. Only JSON booleans are valid; `null`, strings, numbers, arrays and objects return `400`. Omitted PATCH fields retain their current values. You can combine `isSuspended` with `description`, `categoryIds` and `isRemote`; invalid payloads save no changes.

Service responses include `isSuspended`. Suspended services stay in the owner's personal list and can still be edited or deleted under the existing rules. They are excluded from the homepage catalog.

Suspension and reactivation use the existing ownership and reference checks. A service whose existing links prevent changes returns `409`, including historical links. Existing exchanges are not cancelled by this feature. Service row locks protect the reference check and update within the same transaction.

### Suspension migration

The selected dump includes these fields. Historical migrations remain in the repository for earlier schemas; do not apply them over this dump.

## Soft deletion of offers and requests

The selected dump defines nullable services.deleted_at; no historical migration is needed for this column.

The DELETE endpoints `/api/offers/{id}` and `/api/requests/{id}` save a UTC deletion date instead of removing rows. Success returns `204` with an empty body. Deleted services return `404` on later updates or DELETE requests and disappear from personal lists and the catalog. Availability is checked again after row locks.

Services referenced by `agreement_details.service_provided` or `service_queues.service_id` return `409` on update or deletion. Categories and related data are kept. Suspension remains separate: suspended services can still appear in the owner's list, while deleted services cannot. Restore APIs are described below; no permanent-delete API is provided.

### List and restore deleted services

These APIs reuse `services.deleted_at` without a database migration. All require
a JWT and an active account. Staff routes also require `ROLE_STAFF`.

| Method and path | Access | Response key |
| --- | --- | --- |
| `GET /api/offers/deleted` | Own deleted offers | `offers` |
| `GET /api/requests/deleted` | Own deleted requests | `requests` |
| `POST /api/offers/{id}/restore` | Own offer | `offer` |
| `POST /api/requests/{id}/restore` | Own request | `request` |
| `GET /api/staff/services/deleted` | Deleted services of all users | `services` |
| `POST /api/staff/services/{id}/restore` | Any user's service | `service` |

Lists accept `page` (default `1`) and `limit` (default `20`, maximum `50`).
Both must be positive integers. Unknown or invalid query parameters return `400`.
Staff lists also accept optional positive `userId` and `type=OFFER` or `type=REQUEST`.
Items are ordered by deletion date descending, then ID descending. Only deleted
services are returned, including suspended services and services of inactive owners.

Each item has the same fields as a personal service response, plus `deletedAt`
as an ISO 8601 UTC string. Staff responses also include `owner` using the public
profile representation, without private email or role fields. Every list includes
`pagination` with `page`, `limit`, `totalItems` and `totalPages`.

```http
GET /api/offers/deleted?page=1&limit=20
GET /api/staff/services/deleted?userId=12&type=OFFER
POST /api/offers/42/restore
Authorization: Bearer YOUR_JWT_TOKEN
```

Restore requests accept an absent body or an empty JSON object (`{}`). Other
bodies return `400`. Success returns `200` with the service under the response
key above, using the personal service representation (plus `owner` for staff).
An already restored service also returns `200`. Missing services, another user's
services on personal routes, and a wrong service type return `404`.
Missing authentication returns `401`; inactive callers and non-staff callers on
staff routes receive `403`. Transient database conflicts return `409`.

Restoring sets only `deleted_at` to `NULL`. The ID, content, categories, suspension
and existing links are preserved. Existing links do not block a restore. The
service returns to personal lists and follows the usual catalog visibility rules:
offers must be unsuspended and their owner active. Staff can restore services of
inactive owners without activating those owners. Restores use the same row lock
as edits and deletion.

Effective restores through staff routes record `SERVICE_RESTORED` with target
type `SERVICE` and before/after `deletedAt` values in the same transaction.
If history cannot be saved, the restore is rolled back. Repeated restores of an
active service create no new entry. Restores through personal routes do not
create staff history entries, even when the caller has a staff role.

## Optional location for offers and requests

Both `OFFER` and `REQUEST` services have their own optional `location`, independent
of the owner's profile location. It is available for remote and in-person services.

`POST /api/services` accepts it alongside the existing fields:

```json
{"type":"OFFER","description":"I can repair bicycles.","categoryIds":[1],"location":"Rome"}
```

During `POST /api/auth/register`, each item in `offers` and `requests` also accepts
`location`. The top-level registration location continues to describe the user:

```json
{
  "name":"Mario","surname":"Rossi","username":"mario.rossi",
  "email":"mario@example.test","password":"my-safe-password","location":"Milan",
  "offers":[{"description":"I repair bicycles.","categories":["Repairs"],"location":"Rome"}],
  "requests":[{"description":"I need tutoring.","categories":["Tutoring"]}]
}
```

Use `PATCH /api/offers/{id}` or `PATCH /api/requests/{id}` to change or clear it:

```json
{"location":"Milan"}
```

```json
{"location":null}
```

The value must be a string of at most 255 characters after trimming, or `null`.
Empty or whitespace-only strings become `null`. Omitted values default to `null`
on creation; omitted PATCH fields retain the current value. Other JSON types and
overlong text return `400` without saving changes. Existing ownership and
linked-service restrictions still apply.

All service representations include `location` as a string or `null`, including
registration, publishing, personal lists and homepage offers. `owner.location` still describes the owner's profile.
No profile location is copied automatically into a service.

`GET /api/services?location=rome` now searches only service locations, using a
case-insensitive partial match. Offers without a location do not match a non-empty
location filter, even when the owner's profile location matches. Without this
filter, offers without a location remain visible under the usual catalog rules.

### Location migration

The selected dump includes these fields. Historical migrations remain in the repository for earlier schemas; do not apply them over this dump.

## Staff operation history

History is recorded automatically for effective changes made through staff APIs.
Report claims record `REPORT_CLAIMED` in the existing staff history. Assignment and history are saved in one transaction; a history failure rolls back the claim. Older history entries remain unchanged and may omit assignment fields.
Only active staff accounts can read it, using `Authorization: Bearer YOUR_STAFF_JWT`.
There are no API endpoints to create, edit or delete history entries.

### Read operations

```http
GET /api/staff/operations?page=1&limit=20
GET /api/staff/operations?staffId=4&action=USER_STATUS_CHANGED&targetType=USER&targetId=12
GET /api/staff/operations/1
```

The list returns `operations` and the existing `pagination` object (`page`, `limit`,
`totalItems`, `totalPages`). Default page is 1 and default limit is 20; maximum
limit is 50. Results are ordered by `createdAt` descending, then ID descending.
No matches or a page beyond the results returns an empty list.

Optional filters combine using AND:

| Filter | Accepted values |
| --- | --- |
| `staffId` | Positive staff user ID, including historical accounts |
| `action` | An action documented below; historical `TOKEN_CREATED`, `TOKEN_EXPIRATION_CHANGED` and `TOKEN_DELETED` are also accepted |
| `targetType` | `USER`, `REPORT`, `TOKEN`, `SERVICE` |
| `targetId` | Positive object ID; requires `targetType` |

Unknown parameters, invalid actions/types, arrays, invalid IDs and pagination
values return `400`. An unknown operation ID returns `404`. Missing credentials
return `401`; regular users and inactive staff receive `403`. Unsupported write
methods return `405` for authorized callers.

Each list item has the same representation returned as `operation` by the detail API:

```json
{
  "operation": {
    "id": 1,
    "actor": {"id": 4, "username": "staff_user"},
    "action": "USER_STATUS_CHANGED",
    "target": {"type": "USER", "id": 12},
    "before": {"accountStatus": "ACTIVE"},
    "after": {"accountStatus": "INACTIVE"},
    "createdAt": "2026-10-16T12:00:00+00:00"
  }
}
```

### Recorded changes

| Action | Target | Before and after fields |
| --- | --- | --- |
| `USER_STATUS_CHANGED` | `USER` | `accountStatus` |
| `USER_PROMOTED` | `USER` | `roles` |
| `REPORT_CLAIMED`, `REPORT_REVIEWED` | `REPORT` | `status`, `assignedToId`, `assignedAt`, `reviewNote`, `reviewedById`, `reviewedAt` |
| `SERVICE_RESTORED` | `SERVICE` | `deletedAt` (UTC deletion date before, `null` after) |

Dates are stored and returned in UTC. Only the relevant fields are saved; passwords,
JWTs, complete profiles and report reasons are excluded.
The actor ID and username are snapshots taken from the authenticated staff account,
not client-supplied values. Plain target IDs and actor snapshots keep history readable
after a rename or deletion.

Reads, errors, unchanged values and staff creation via
the console command produce no entries. Existing operations are not backfilled.
Each history entry is saved inside the operation's transaction: if history cannot be
saved, the operation also rolls back. Existing row locks and transaction retries remain
in place, and a rolled-back attempt leaves no duplicate history entries.

### History migration

The selected dump includes these fields. Historical migrations remain in the repository for earlier schemas; do not apply them over this dump.
