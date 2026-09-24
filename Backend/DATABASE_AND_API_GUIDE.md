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

Send a `POST` request to `/api/auth/register`:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Mario","surname":"Rossi","username":"mario.rossi","email":"mario@example.com","password":"my-safe-password"}'
```

The response has status `201` and contains a JWT token plus safe user data. Passwords and password hashes are never returned.

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
| `401` | Invalid username or password. |
| `403` | The account is inactive. |
| `409` | Username or email already exists. |

## 6. Service publishing and direct swipe matching

Run the latest migration before using these endpoints:

```bash
php bin/console doctrine:migrations:migrate
```

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
