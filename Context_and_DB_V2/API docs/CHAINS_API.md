# Service chains and compensation

The chain API finds a closed cycle of three or four active users. Each user's offer
satisfies the next user's request through at least one shared category. A three-user
cycle takes priority over every four-user cycle. Equal-length alternatives are
ordered by user ID, offered-service ID, then requested-service ID.

All endpoints require a bearer JWT and an active account. Other participants are
represented using public profile fields; email addresses and roles are not exposed.
The implementation never creates a chat or calls the chat manager.

## Endpoints

| Method and path | JSON input | Response envelope |
| --- | --- | --- |
| `POST /api/chains` | `offeredServiceId`, `requestedServiceId` | `chain` (201) |
| `GET /api/chains` | None | `chains` |
| `GET /api/chains/{id}` | None | `chain` |
| `POST /api/chains/{id}/decision` | `decision`: `ACCEPT` or `REJECT` | `chain` |
| `POST /api/chains/{id}/agreements` | `recipientUserId`, `location`, `startAt` | `agreement` (201) |
| `POST /api/chains/{id}/agreements/{agreementId}/decision` | `decision`: `ACCEPT` or `REJECT` | `agreement` |
| `POST /api/chains/{id}/provisions/{provisionId}/receipt` | None | `chain` |
| `POST /api/chains/{id}/cancel` | `reason` | `chain` |
| `GET /api/tokens` | None | `tokens` |
| `POST /api/staff/tokens` | `userId`, optional `chainId` | `token` (201; staff only) |
| `PUT /api/staff/tokens/{id}` | `expiresAt` | `token` (staff only) |
| `PATCH /api/staff/tokens/{id}` | `expiresAt` | `token` (staff only) |
| `DELETE /api/staff/tokens/{id}` | None | No content (204; staff only) |

IDs must be positive JSON integers. Location and cancellation reason must contain
1–255 characters after trimming. `startAt` must include seconds and a timezone,
for example `2026-10-04T14:00:00+02:00` or `2026-10-04T12:00:00Z`. Stored and returned
chain dates use UTC. Invalid calendar dates are rejected. The provider and offered
service are derived from the authenticated user and the chain edge.

Example search:

```json
{ "offeredServiceId": 12, "requestedServiceId": 15 }
```

Example agreement, sent by the provider after everybody accepts the chain:

```json
{
  "recipientUserId": 8,
  "location": "Central library",
  "startAt": "2026-10-04T14:00:00+02:00"
}
```

The recipient accepts that agreement using `{"decision":"ACCEPT"}`, reads the
chain detail to obtain the resulting provision ID, and later confirms its receipt.

## `curl` examples

The examples below use Bash, `curl`, and a local Symfony server. Start the server
from `Backend` with `php -S localhost:8000 -t public`. First sign in with an active
account and copy the returned `token` into `JWT_TOKEN`:

```bash
API_BASE_URL='http://localhost:8000'
JWT_TOKEN='paste-the-token-from-the-login-response'

curl --fail-with-body --silent --show-error \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"your-password"}' \
  "$API_BASE_URL/api/auth/login"
```

Use the bearer token on every chain request. Each participant makes decisions
and confirms their own receipts with their own token.

Start a search using your offer and request IDs:

```bash
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"offeredServiceId":12,"requestedServiceId":15}' \
  "$API_BASE_URL/api/chains"
```

List your chains, then retrieve a chain's participants, deadlines, agreements,
and provisions. Replace `42` with the `id` returned by the search:

```bash
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_BASE_URL/api/chains"

curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_BASE_URL/api/chains/42"
```

Each of the three or four participants must accept. Replace `PARTICIPANT_JWT`
with that participant's token; use `REJECT` to decline the cycle instead:

```bash
curl --fail-with-body --silent --show-error \
  -H 'Authorization: Bearer PARTICIPANT_JWT' \
  -H 'Content-Type: application/json' \
  -d '{"decision":"ACCEPT"}' \
  "$API_BASE_URL/api/chains/42/decision"
```

After the chain is confirmed, its provider proposes terms to the next participant.
The recipient ID must match the next participant in the chain response:

```bash
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"recipientUserId":8,"location":"Central library","startAt":"2026-10-04T14:00:00+02:00"}' \
  "$API_BASE_URL/api/chains/42/agreements"
```

The recipient accepts or rejects that agreement. Replace `17` with its returned
agreement ID, and use the recipient's token:

```bash
curl --fail-with-body --silent --show-error \
  -H 'Authorization: Bearer RECIPIENT_JWT' \
  -H 'Content-Type: application/json' \
  -d '{"decision":"ACCEPT"}' \
  "$API_BASE_URL/api/chains/42/agreements/17/decision"
```

After an accepted agreement creates a provision, its recipient confirms receipt.
Find the provision ID in the chain detail response; replace `23` with that ID:

```bash
curl --fail-with-body --silent --show-error \
  -H 'Authorization: Bearer RECIPIENT_JWT' \
  -X POST \
  "$API_BASE_URL/api/chains/42/provisions/23/receipt"
```

Any participant can interrupt a confirmed chain. The API derives the author from
the bearer token, so do not send a participant ID in the request:

```bash
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"reason":"I can no longer provide the service."}' \
  "$API_BASE_URL/api/chains/42/cancel"
```

List your tokens, including their expiry dates:

```bash
curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_BASE_URL/api/tokens"
```

Errors use `{"error":"English explanation."}`: 400 for invalid input, 401 for
missing authentication, 403 for inactive accounts or unauthorized actors, 404 for
missing resources, and 409 for incompatible state or concurrent conflicts. A 409
caused by concurrency can be retried after reading the current chain state.

## Lifecycle and reservations

`SEARCHING` lasts at most three hours from creation. A search is performed
immediately, then at most once a minute. Its initiating offer and request must
belong to the caller and have no available direct candidate or pending/accepted
direct proposal. Direct checks have no feed result limit. A newly available direct
path cancels a search with `DIRECT_PATH_AVAILABLE` before any cycle is proposed.

The proposed cycle enters `AWAITING_CONFIRMATIONS`. Every participant, including
the initiator, must explicitly accept within 24 hours from `proposedAt`. A rejection
or the deadline cancels the whole cycle without replacement or tokens. The exact
deadline is already too late. API calls enforce deadlines even when the scheduler
has not run. `SEARCH_EXPIRED` and `CONFIRMATION_EXPIRED` identify automatic expiry.

Offers and requests are reserved atomically when the cycle is proposed. They cannot
be used in another chain or a new direct proposal. Searching does not reserve
services. Different services owned by the same person can be used in other chains.
Reservations are released only on cancellation or completion. Left swipes retain
their existing direct-feed behavior but never exclude chain edges.

Unanimous acceptance enters `CONFIRMED`, which has no automatic deadline. Each
provider proposes terms to the next participant. Only that recipient may accept or
reject. Acceptance creates one provision with a provider and a recipient. Rejection
leaves the chain confirmed and permits a proposal with revised terms. Accepted
terms cannot be edited. Receipts may happen in any order; all receipts together
enter `COMPLETED`. Start times are agreement information, not a restriction on when
the recipient is allowed to confirm receipt.

Identical repeated searches return the same active chain. Identical decisions,
terms, receipts and cancellations do not create additional records. Repeating the
terms of a rejected agreement returns that original agreement; change the location
or start time to submit revised terms. Opposite decisions return 409. Repeated
receipts remain safe after completion, but every receipt after cancellation fails.
An active chain includes searching, awaiting confirmations and confirmed states.

## Cancellation and tokens

Only the initiator can cancel a search. After a cycle is proposed, any participant
can cancel it; a completed chain cannot be cancelled. The cancellation author always
comes from the JWT, regardless of any extra payload fields.

Only cancelling a `CONFIRMED` chain issues compensation. Every other participant
without a recorded incoming receipt receives exactly one token. The interrupter is
always excluded, including when that person has not received a service. The expected
incoming service in `group_participants` is not evidence of receipt. Tokens expire
exactly 30 days after issuance, and `(group_id, user_id)` is unique.

`GET /api/tokens` returns `id`, `chainId`, `issuedAt`, `expiresAt` and `expired`,
including expired tokens. Existing tokens imported from the dump can have a null
chain origin and issuance date; the migration does not invent their history. Token
spending and disputes are outside this API.

## Staff token management

These endpoints manage compensation tokens stored in `tokens`, not authentication
JWTs. Every request requires a valid JWT, an active account and `ROLE_STAFF`.
The existing `GET /api/tokens` remains available to active users and returns only
their own tokens, including expired ones, with its existing response format.

### Create a token manually

`POST /api/staff/tokens` requires a positive integer `userId`. The recipient must
exist but may be inactive. Optional `chainId` must be a positive integer identifying
an existing `proposal_groups` row, or `null`; omitting it also means `null`.
Staff assignments do not check chain cancellation, participation or service receipts.
Automatic compensation on chain cancellation continues to work as before.

The server sets `issuedAt` to the current UTC time and `expiresAt` to exactly 30 days
later. The client cannot choose either date during creation. A chain/user pair can
have only one token, including expired tokens; duplicates return `409`. Multiple
manual tokens without a chain are allowed for the same user.
If cancellation later compensates a user who already has a token for that chain,
the existing token is kept unchanged and cancellation still completes; no second
token is issued, even if the existing one has expired.

```bash
curl -X POST "$API_BASE_URL/api/staff/tokens" \
  -H 'Authorization: Bearer YOUR_STAFF_JWT' \
  -H 'Content-Type: application/json' \
  -d '{"userId":12,"chainId":34}'
```

To assign a token without a chain, send `{"userId":12}` instead.
Successful creation returns `201` with this shape (example dates and IDs):

```json
{
  "token": {
    "id": 7,
    "userId": 12,
    "chainId": 34,
    "issuedAt": "2026-10-15T12:00:00+00:00",
    "expiresAt": "2026-11-14T12:00:00+00:00",
    "expired": false
  }
}
```

### Replace or update the expiration

`PUT /api/staff/tokens/{id}` and `PATCH /api/staff/tokens/{id}` both require
`expiresAt`, the only editable field. Supply a valid ISO 8601 date with seconds and
a timezone, such as `2026-11-20T14:00:00+02:00` or `2026-11-20T12:00:00Z`.
Dates are stored and returned in UTC; the normalized UTC year must be between
1000 and 9999, the range supported by MySQL DATETIME. Past dates are allowed so staff can expire a
token immediately. `expired` is true when expiration is at or before the current time.
Recipient, chain and issuance date cannot be changed, even for historical tokens
whose chain or issuance date is `null`. To correct those fields, delete and recreate
the token. Both methods return `200` with the same `token` shape shown above.

```bash
curl -X PUT "$API_BASE_URL/api/staff/tokens/7" \
  -H 'Authorization: Bearer YOUR_STAFF_JWT' \
  -H 'Content-Type: application/json' \
  -d '{"expiresAt":"2026-11-20T14:00:00+02:00"}'

curl -X PATCH "$API_BASE_URL/api/staff/tokens/7" \
  -H 'Authorization: Bearer YOUR_STAFF_JWT' \
  -H 'Content-Type: application/json' \
  -d '{"expiresAt":"2026-10-01T00:00:00Z"}'
```

### Delete a token

`DELETE /api/staff/tokens/{id}` permanently removes the token and returns `204`
with an empty body. This is administrative removal, not spending a token for a service.
It does not change the chain or create a replacement token.

```bash
curl -X DELETE "$API_BASE_URL/api/staff/tokens/7" \
  -H 'Authorization: Bearer YOUR_STAFF_JWT'
```

### Errors

POST, PUT and PATCH require a JSON object and reject unknown fields. PUT and PATCH
also reject empty objects. Application errors use `{"error":"An English explanation."}`;
authentication and role errors retain the existing security responses.

| Status | Meaning |
| --- | --- |
| `400` | Invalid JSON, missing required fields, unknown fields, invalid IDs or invalid expiration date |
| `401` | Missing, invalid or expired JWT |
| `403` | Account is inactive or does not have `ROLE_STAFF` |
| `404` | Token, recipient or chain does not exist |
| `409` | Duplicate chain/user token or concurrent operation; retry where appropriate |

## Database upgrade and verification

The authoritative input is `Context_and_DB_V2/barattolo_v2_27092026.sql`. It remains
unchanged. Explicit migrations support an empty database, an existing migrated
backend, or an imported dump. Existing service types and direct-proposal states are
translated to the English API values while retaining IDs, creation dates and chat
references. Old group records without the new lifecycle data remain historical and
are not exposed as newly created chains.

Chain persistence uses Doctrine DBAL repositories and explicit migrations. No ORM
entities are added for the chain tables: do not use `doctrine:schema:update --force`,
which could remove tables outside the ORM model. This upgrade is irreversible through
migration rollback; restore a verified backup if rollback is required. Do not roll
back the baseline migrations on an imported dump.

From `Backend`, install dependencies with `composer install` and run:

```powershell
php bin/verify-chain-migrations.php
```

This creates a consistent backup in ignored `var/chain-backups`, restores it to a
separate database, and verifies migrations against empty, dump and existing-database
fixtures. It checks the connection identity before migration and checks that chat
tables/data and service creation dates are unchanged. The configured local database
is not migrated by this script. Verification databases use unique `chain_check_*`
names. `MYSQL_BIN_DIR` can override the MySQL client directory; the default is the
local Laragon MySQL 8.4.3 installation. Set it to the matching MariaDB client directory
when verifying MariaDB.

To run all API tests against the prepared isolated chain database:

```powershell
$details = Get-Content var/chain-check.json -Raw | ConvertFrom-Json
$env:CHAIN_TEST_DATABASE_URL = $details.apiUrl
php -d extension=pdo_sqlite bin/phpunit
```

The chain tests refuse to reset any database outside `chain_check_*_test`. Existing
tests use the configured SQLite test database. If `pdo_sqlite` is already enabled,
omit the `-d` option. Chain tests include independent PHP processes to verify real
concurrent starts, cancellations, direct swipes and receipts. Without an isolated
URL, chain tests are explicitly skipped. Verification details contain the connection
URL and must stay in ignored `var`; never commit them or the backups.

After successful checks and a fresh backup, upgrade the local database:

```powershell
php bin/console doctrine:migrations:migrate --no-interaction
php bin/console app:chains:process
```

## Scheduler

Run the command once per minute. Multiple invocations are safe: each process locks
the chain, reads its current state and checks `next_search_at` before searching.

For Windows Task Scheduler, create a task with a trigger repeated every one minute,
indefinitely. Set the action to the actual PHP executable (this machine uses
`C:\php\php.exe`), arguments to `bin\console app:chains:process --env=prod`, and
the working directory to `C:\laragon\www\ProjectWork\Backend`. Configure the task
to avoid overlapping runs and review its exit status. Ensure production database and
JWT configuration is available to its Windows account.

For cron, adapt the PHP executable and backend path:

```cron
* * * * * cd /path/to/ProjectWork/Backend && /usr/bin/php bin/console app:chains:process --env=prod >> var/chains-scheduler.log 2>&1
```

The command reports the number of due chains processed and returns a nonzero status
on unexpected failures. Neither Task Scheduler nor cron is installed or configured
automatically by this change.
