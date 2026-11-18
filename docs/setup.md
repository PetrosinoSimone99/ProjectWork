# Local setup

Backend and database run under **Docker Desktop** (MySQL 8.0 + PHP backend);
the frontend runs on the host with Node and Expo. Docker Desktop is owned and
operated by the frontend owner (see decisions D005, D008).

## 0. Prerequisites

- **Docker Desktop** running. Stack files: `Backend/compose.yaml`,
  `Backend/compose.override.yaml`, `Backend/docker/Dockerfile`.
- **Node.js** with npm for the frontend.
- A browser, or Expo Go on a phone.

## 1. Start the stack

```bash
cd Backend
docker compose up -d --build
```

| Service | Image | Port | Notes |
| --- | --- | --- | --- |
| `database` | `mysql:8.0` | 3306 | database `barattolo`, dev credentials `root`/`root` |
| `backend` | PHP 8.4 (built from `Backend/docker/`) | **8000** | Symfony at `http://localhost:8000` |

First boot on an empty data volume imports the schema named by
`Context_and_DB_V2/LAST_DB_TO_USE.txt` — today `barattolo_15112026.sql`: the
**15-table** schema of the current backend (agreements, chat, notifications,
service queues, messenger included). That dump is **structure only**, so the
demo rows come from `Backend/docker/seed-demo.sql`, mounted right after it.
Those rows are **what the app writes**, and every one of them was created by a
real route: a throwaway script logged in with the seeded accounts and called
`/create-exchange-agreement`, `/send-agreement-response`,
`/send-agreement-details`, `/cancel-agreement`, `/chats/agreement`,
`/chats/send-message`, `/create-service-queue`, `/reports`,
`/staff/reports/{id}/claim`, `/staff/reports/{id}/review` and the notification
routes, then the database was dumped (`docs/database.md` has the provenance).
The one row it did not create is the category catalog, which the app only picks
from.

### What a fresh database contains

| Table | Rows | What they are |
| --- | --- | --- |
| `categories` | 50 | the shared catalog |
| `users` | 7 | the six demo people plus `demo.staff` |
| `services` | 14 | one offer and one request each, `demo.staff` included; `luca.ferrari`'s request is soft-deleted, so the deleted-entries sections have a row |
| `service_categories` | 14 | the category of each service |
| `service_queues` | 2 | `giulia.bianchi`'s OPEN request, `demo.staff`'s OPEN offer |
| `agreements` | 7 | one per state worth showing (see below) |
| `agreement_proposal` | 14 | two per agreement, with their responses |
| `agreement_details` | 8 | two per agreement that reached `ACCEPTED` (the cancelled and the completed one included); one of the eight waits for its beneficiary |
| `chat`, `chat_participants` | 3, 6 | one chat per agreement that carried a conversation |
| `chat_messages` | 10 | five in each of the two populated chats; the third chat is empty |
| `notifications` | 11 | four of them unread, eight in `demo.staff`'s inbox |
| `user_reports` | 2 | one PENDING, one CONFIRMED |
| `staff_operation_logs` | 2 | the claim and the review of that report |
| `messenger_messages` | 0 | the async transport, not app data |

The seven agreements, with `demo.staff` a party in every one of them: `PENDING`
proposed by `giulia.bianchi` and still unanswered, `PENDING` proposed by
`demo.staff` and still unanswered by her, `ACCEPTED` with both delivery sheets
compiled and confirmed (`marco.ricci`), `ACCEPTED` with `demo.staff`'s own sheet
still blank and `davide.costa`'s sheet waiting for its confirmation, `CANCELLED`
(`demo.staff` called off the exchange with `sara.mancini`), `COMPLETED`
(`chiara.marino`, both sheets dated in the past) and `REFUSED`
(`luca.ferrari` said no). A sheet compiled in the seed shows the moment of its
last write as the start date: that is schema defect G20 (`backend-gaps.md`), not
a seed mistake.

`COMPLETED` is not written by the seed: the two sheets of that agreement carry
dates in the past and the backend's own scheduler closed it, run once with
`docker compose exec backend php bin/console messenger:consume scheduler_default
--limit=1`. Re-running that command on a fresh volume therefore changes nothing
(it has nothing left to close) — the status is already in the dump.

### The account that can open everything (`demo.staff` / `demo1234`, local only)

Ideal for a demo that must not stop at a permission error, and chosen so that
**one login reaches every state the product has**. It holds `ROLE_STAFF`, so
`/staff` and `/staff-users` (seven accounts) answer, and it is a party in all
seven agreements: from a single session you see the catalog, the match tab with
its own queue, the proposal someone else sent (with Accetta/Rifiuta), the one it
sent, two exchanges in progress (one sheet to compile, one to confirm), and the
closed ones — completed, cancelled, refused. Plus a chat with five messages, an
inbox with eight rows and a badge of three, the review queue with both reports,
the audit trail those actions wrote, and the deleted service on the staff
restore screen.

Two things it cannot show, and neither is a data problem: **no queue is ever
matched** (the worker that matches reads a per-category dictionary that does not
exist, `backend-gaps.md` G28 — the match tab shows an OPEN queue, not a match),
and the G20 card above shows a start date that is the moment of the last write.

It was created with the backend's own command, not with SQL, so a local staff
account can be recreated at any time:

```bash
docker compose exec backend php bin/console app:create-staff \
  Valentina Moretti demo.staff demo.staff@example.test demo1234
```

### The queue demo account (`giulia.bianchi` / `demo1234`)

`POST /api/create-service-queue` resolves the account's service with
`getOneOrNullResult()`, so it only works for an account with **exactly one**
service of the requested type (`docs/backend-gaps.md` G19). The product rule
gives every account exactly one offer and one request, so every seeded account
qualifies; `giulia.bianchi` is the one the seed already carries a queue for, and
it sits at **zero credits** because that queue spent the one a new account
starts with. Since backend `4c90ccd` she also cannot create anything at all: the
one-queue guard fires before the credit check, so what used to answer
`400 Not enough credits` for her now answers `500`, and cancelling her queue is
the only way back (`backend-gaps.md` G23). The seven accounts are `giulia.bianchi` (Roma, 0 credits, one OPEN
request queue), `marco.ricci` (Milano), `sara.mancini` (Torino), `davide.costa`
(Bologna), `chiara.marino` (Napoli), `luca.ferrari` (Firenze), the last five
at one credit each, and `demo.staff` (Bologna, `ROLE_STAFF`, one credit and one
OPEN offer queue):

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"luca.ferrari","password":"demo1234"}' | jq -r .token)
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:8000/api/create-service-queue \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"queueType":"REQUEST"}'          # 201, and the credit goes 1 -> 0
QUEUE_ID=$(curl -s http://localhost:8000/api/get-queues -H "Authorization: Bearer $TOKEN" | jq -r .queues[0].id)
curl -s -o /dev/null -w '%{http_code}\n' -X POST "http://localhost:8000/api/cancel-queue/$QUEUE_ID" \
  -H "Authorization: Bearer $TOKEN"                                        # 200, credit back to 1
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/api/get-queues \
  -H "Authorization: Bearer $TOKEN"                                        # 404: the list is empty
```

Without that seed the app cannot register or log in, because
`GET /api/categories` would answer with an empty list. The generator
`Backend/tools/create-demo-database.php` is not usable for this yet: it targets
the previous schema and filename (see `docs/backend-gaps.md`).

Re-importing only happens on an empty volume: after changing the dump in
`compose.yaml`, `docker compose down -v` then up again. That **wipes** the local
dev data.

The backend container installs Composer dependencies, generates local JWT keys
(`Backend/config/jwt/*.pem`, skipped when present) and serves
`public/` with the PHP built-in server. Two dev-only settings in `compose.yaml`
matter:

| Setting | Why |
| --- | --- |
| `PHP_CLI_SERVER_WORKERS=4` | `php -S` is single-threaded by default: every request would queue behind the previous one |
| `opcache.enable_cli=1` with `revalidate_freq=60` | without it every request recompiles the framework over the Windows bind mount (measured: 4–23 s per call, above the app's 10 s timeout) |

Healthy state:

```bash
docker compose ps
curl http://localhost:8000/api/categories    # 200 {"categories":[...]} — GET is public
```

Reset from scratch: `docker compose down -v`, then up again (re-imports the
schema and the demo seed on the empty volume — the seven demo accounts of the
paragraph above, password `demo1234`). **`down -v` deletes the local database**:
everything created by hand in it is lost, and the volume is rebuilt from the seed
instead. That is the declared cost of shipping the demo rows in the seed rather
than in a script: the seed only runs on an empty volume, so there is no way to
add the new rows to a volume that already exists.

**Measured latency (2026-11-15, after `down -v` + up):** the first call after a
start reached **7.8 s**, warm calls 2.0–2.6 s, and the client's timeout is 10 s. A
screen opened in the first seconds after a restart can therefore show «Il servizio
sta impiegando troppo tempo»: wait a moment and retry. This is the environment,
not the app, and it is why the Playwright pass of this cycle waits for the loaded
state instead of the frame
(`docs/audits/native-parity-2026-11-15.md`).

The backend routes `App\Message\QueueId` to the `async` transport
(`doctrine://default`, i.e. the `messenger_messages` table) and schedules
`App\Schedule\AgreementEndDateChecker`. Both have a consumer inside the stack:
`worker` and `scheduler` are services of `compose.yaml` and come up with it. A
queue created through `POST /api/create-service-queue` therefore answers `OPEN`
and flips to `IN_PROGRESS` a moment later, when the worker writes the agreement
and the two `MATCH_CREATED` notifications; the scheduler closes every accepted
agreement whose sheets are all past their end date, which is exactly how the
seed's `COMPLETED` row was produced.

Matching is demonstrable locally. The eleven dictionaries live in
`Backend/src/Dictionaries/`, and a category with no dictionary is not a failure:
it falls back to category, mode and normalized location (`backend-gaps.md` G28).
The match is attempted **only when a queue is created** — there is no periodic
re-match — so a queue whose data is corrected afterwards stays unmatched until it
is cancelled and created again, and the rule that decides it is the one in
`docs/api.md`: same normalized comune, nothing wider.

## 2. Configure the frontend

`Frontend/.env.local` (not committed, gitignored):

| Variable | Value | When |
| --- | --- | --- |
| `EXPO_PUBLIC_API_PORT` | `8000` | normal dev: the host is taken from the Expo dev server, so the address follows the network |
| `EXPO_PUBLIC_API_URL` | e.g. `http://192.168.1.20:8000` | only for tunnels, built bundles, or a dev server that is not on the API machine |

`src/api/config.js` reads them at build time (`EXPO_PUBLIC_*`) and warns on the
console when `EXPO_PUBLIC_API_PORT` is set to the Metro port (8081); the warning
does not stop the build, it keeps the value and says which one to fix.
There is no fake-data switch any more: the app always talks to the real
backend.

## 3. Run the frontend

```bash
cd Frontend
npm install
npx expo start
```

| Surface | How |
| --- | --- |
| **Web** | `npx expo start --web` (or press `w`); the API host is the page host, so `http://localhost:8000` works |
| **Expo Go (phone)** | scan the QR; the API host is the dev-server machine's LAN IP, so phone and PC must share the network |
| **Reviews** | the web surface driven through Playwright, against the real backend |

## 4. Verify end to end

1. Register from `/register` (location is mandatory; one offer and one request
   are required today, `backend-gaps.md` G9).
2. Log in: the JWT (1 hour) is stored with `expo-secure-store`.
3. Publish one offer and one request from "Offro e cerco".
4. Filter the home and open a service detail.
5. Watch the backend while acting: `docker compose logs backend -f`.

## 5. Backend duties (backend maintainer)

```bash
# staff account
php bin/console app:create-staff "Alice Bianchi" alice.staff alice@example.com 'safe-password'

# migrations (only outside the dump-based flow)
php bin/console doctrine:migrations:migrate

# tests
docker compose exec backend php bin/phpunit -c phpunit.dist.xml
```

Two test families want two databases, and the compose file pins `DATABASE_URL`
for the app, so both are run with an explicit override (never against
`barattolo`, which holds the demo data):

```bash
# almost everything, on an isolated SQLite file
docker compose exec -T -e APP_ENV=test \
  -e 'DATABASE_URL=sqlite:////tmp/barattolo-test.db' \
  backend php bin/phpunit -c phpunit.dist.xml --no-coverage

# reports (create the database once: `CREATE DATABASE barattolo_test`)
docker compose exec -T -e APP_ENV=test \
  -e 'DATABASE_URL=mysql://root:root@database:3306/barattolo?serverVersion=8.0&charset=utf8mb4' \
  backend php bin/phpunit -c phpunit.dist.xml --filter ReportControllerTest

# queue and agreement lifecycle on MySQL (create `workflow_checks_test` once)
docker compose exec -T -e APP_ENV=test \
  -e 'DATABASE_URL=mysql://root:root@database:3306/workflow_checks?serverVersion=8.0&charset=utf8mb4' \
  backend php bin/phpunit -c phpunit.dist.xml --filter WorkflowControllerTest
```

`php bin/phpunit` alone finds no configuration (`phpunit.dist.xml` is not
auto-discovered) and boots the dev environment, where functional tests cannot
start. Two runs at the same time share the SQLite file and drop each other's
tables: one gate at a time, or one file per run.

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `curl :8000` refused | backend container still installing | `docker compose logs backend -f`, wait for the `php -S` line |
| `Unknown database barattolo` | volume initialized before the dump existed | `docker compose down -v`, then up |
| Service form has no categories | the database was imported from the old schema-only dump | `docker compose down -v`, then up (the demo dump carries 50 categories) |
| Agreement endpoints answer `500` | the volume still holds the old dump, which has no agreement tables | `docker compose down -v`, then up |
| Registration cannot load categories | API slower than the 10 s client timeout (cold container, workers missing) | `docker compose up -d backend`, retry; the first call after a start is the slowest |
| A PHP edit does not appear for a minute | `opcache.revalidate_freq=60` | wait, or `docker compose restart backend` |
| One call blocks the next | `PHP_CLI_SERVER_WORKERS` lost (old container) | `docker compose up -d backend` |
| Web works, phone does not | phone on another Wi-Fi, or hotspot isolating clients | same network, or set `EXPO_PUBLIC_API_URL` with the PC address |
| `400` on every call with port 8000 set | `EXPO_PUBLIC_API_PORT` overwritten by 8081 (shell beats `.env.local`) | fix the value, `npx expo start -c` |
| JWT errors after key regeneration | stale token in secure storage | log out and in again |

## Workflow upgrade (2026-11-18, extended 2026-11-19)

The backend startup runs `php tools/upgrade-workflows.php`, applying the
incremental migrations in order — `Version20261118000100` (proposal services,
queue dates, service and queue slots) and `Version20261119000100` (the sheet's
`notes` and `sent_at`) — to the selected reference schema. Each step checks its
own column first, so a second start is a no-op. Do not replay older historical
migrations against the already-current dump. The first step refuses multiple
non-deleted services per owner/type or multiple active queues per owner; it
reports affected accounts and never deletes their records. Resolve those records
deliberately before retrying. MySQL DDL is not transactional: back up existing
databases before upgrading; a partial migration requires repair.

Run `docker compose up -d --build backend worker scheduler` from Backend.
The workers wait for backend health and restart automatically. Never reset a
populated volume just to apply this migration. The demo generator uses the
maintained `docker/seed-demo.sql`, accepts the Docker database host, refuses
populated databases/existing outputs, and exports to `Backend/var/demo-export.sql`
(or an explicit first argument). Generated columns are excluded from INSERTs.

Workflow MySQL tests use only `workflow_*_test` databases and refuse to reset
any other MySQL schema. With `DATABASE_URL` pointing at a base name such as
`workflow_checks`, test configuration appends `_test`. They import the reference
schema, apply the same incremental migrations and test the same lifecycle as
SQLite, plus concurrent queue creation and matching. The development database is
not reset.
