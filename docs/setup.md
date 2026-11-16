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
Those rows are **what the app writes**: six accounts (every password `demo1234`,
the shortest the registration form accepts) registered from the web build by
picking Provincia then Comune, one offer and one request each, the 50 categories
of the shared catalog, and one OPEN `REQUEST` queue created from the match tab.
Agreements, notifications and the rest start empty on purpose: the app is meant
to create them through the API. The file was produced by dumping the database
those registrations produced, so the seed and the app cannot drift.

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
the only way back (`backend-gaps.md` G23). The six accounts are `giulia.bianchi` (Roma, 0 credits, one OPEN
request queue), `marco.ricci` (Milano), `sara.mancini` (Torino), `davide.costa`
(Bologna), `chiara.marino` (Napoli) and `luca.ferrari` (Firenze), the last five
at one credit each:

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
schema and the demo seed on the empty volume — six demo users, password
`demo1234`, listed above).

**Measured latency (2026-11-15, after `down -v` + up):** the first call after a
start reached **7.8 s**, warm calls 2.0–2.6 s, and the client's timeout is 10 s. A
screen opened in the first seconds after a restart can therefore show «Il servizio
sta impiegando troppo tempo»: wait a moment and retry. This is the environment,
not the app, and it is why the Playwright pass of this cycle waits for the loaded
state instead of the frame
(`docs/audits/native-parity-2026-11-15.md`).

The new backend routes `App\Message\QueueId` to the `async` transport
(`doctrine://default`, i.e. the `messenger_messages` table) and schedules
`App\Schedule\AgreementEndDateChecker`. Nothing consumes either inside the
stack: queues created through `POST /api/create-service-queue` stay unmatched
and `COMPLETED` is never assigned until a worker is started by hand —
`docker compose exec backend php bin/console messenger:consume async scheduler_default`.
One tick is enough to check the scheduler:
`messenger:consume scheduler_default --limit=1`.

## 2. Configure the frontend

`Frontend/.env.local` (not committed, gitignored):

| Variable | Value | When |
| --- | --- | --- |
| `EXPO_PUBLIC_API_PORT` | `8000` | normal dev: the host is taken from the Expo dev server, so the address follows the network |
| `EXPO_PUBLIC_API_URL` | e.g. `http://192.168.1.20:8000` | only for tunnels, built bundles, or a dev server that is not on the API machine |

`src/api/config.js` reads them at build time (`EXPO_PUBLIC_*`) and stops with an
explicit warning when `EXPO_PUBLIC_API_PORT` is set to the Metro port (8081).
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

1. Register from `/register` (location is mandatory; services are optional).
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
php bin/phpunit
```

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
