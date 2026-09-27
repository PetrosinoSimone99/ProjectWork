# Database and API quick guide

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

Generate the database table from the backend directory:

```bash
php bin/console doctrine:migrations:migrate
```

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

`location` must be non-empty and no longer than 255 characters. `offers` and `requests` must each be non-empty lists. Every service description must be non-empty and no longer than 255 characters. Each service must include at least one category using `categories`, `categoryIds`, or both. Category names are trimmed, must be non-empty and no longer than 255 characters, and match existing categories without case sensitivity. A new category is added to the shared catalog; a matching category is reused. Existing `categoryIds` remain supported and must refer to existing categories. Do not repeat the same category in one service.

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

## 6. Service publishing and direct swipe matching

Run the latest migration before using these endpoints:

```bash
php bin/console doctrine:migrations:migrate
```

## 7. Read and update your profile

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

The PATCH endpoint accepts `name` and `surname` up to 50 characters, `location` up to 255 characters, `bio` up to 1,000 characters, and `profileImageUrl` up to 2,048 characters. Names and locations must not be blank. Unknown fields and account fields such as username, email, password, roles, or account status are rejected with `400 Bad Request`. Public catalog and swipe responses include bio and profile image URL, but never email, roles, password data, or account status.

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
  -d '{"type":"OFFER","description":"I can cook Italian meals.","categoryIds":[1]}'
```

The endpoint returns `201 Created` with the new service. Publish both an offer and a request before expecting reciprocal swipe candidates.

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
| `location` | Case-insensitive partial search in the owner's location | Text up to 255 characters |
| `sort` | Creation-date ordering | `newest` (default) or `oldest` |
| `page` | Page to return | Positive integer, default `1` |
| `limit` | Offers per page | Integer from `1` to `50`, default `20` |

Example response:

```json
{
  "offers": [
    {
      "id": 12,
      "type": "OFFER",
      "description": "I can repair bicycles.",
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

### Read the swipe feed

```bash
curl "http://localhost:8000/api/swipes?limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

The response places incoming `pendingProposals` before `candidates`. Each candidate contains four services: the current user's offer and request, plus the candidate's offer and request. Both offer/request directions must share a category.

### Swipe left or right

Copy the four service IDs from a candidate card. The server verifies the relationship again, so IDs cannot be used to create an unrelated proposal.

```bash
curl -X POST http://localhost:8000/api/swipes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actorOfferServiceId": 10,
    "actorRequestServiceId": 11,
    "candidateOfferServiceId": 20,
    "candidateRequestServiceId": 21,
    "direction": "RIGHT"
  }'
```

Use `LEFT` to dismiss that exact four-service combination. A `RIGHT` swipe creates a `PENDING` proposal and returns its `proposalId`. Retrying the same direction is safe and returns the existing result. A contradictory decision, or an existing proposal for the same offered-service pair, returns `409 Conflict`.

### Accept or reject an incoming proposal

Only the participant who has not yet confirmed may decide.

```bash
curl -X POST http://localhost:8000/api/proposals/42/decision \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision":"ACCEPT"}'
```

`ACCEPT` changes the proposal to `ACCEPTED` and returns `"matched": true`. `REJECT` changes it to `REJECTED` and returns `"matched": false`. Only direct two-user proposals are covered by these endpoints; chat, formal exchanges, and group chains are separate future features.

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
