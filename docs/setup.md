# Local setup

Target environment: everything that serves the app works from **Docker
Desktop** (MySQL 8.0 + PHP 8.3 backend); the frontend runs on the host with
Node and Expo. Docker Desktop is owned and operated by Andrea Cestelli.

## 0. Prerequisites

- **Docker Desktop** running (Windows). Stack files:
  `Backend/compose.yaml` (+ `Backend/docker/Dockerfile`).
- **Node.js** with npm for the frontend.
- A physical phone or a browser for trying the app.

## 1. Start the backend stack (Docker Desktop)

```bash
cd Backend
docker compose up -d --build
```

What this creates:

| Service | Image | Port | Notes |
| --- | --- | --- | --- |
| `database` | `mysql:8.0` | 3306 | db `barattolo`, dev credentials `root`/`root` |
| `backend` | PHP 8.4 (built from `docker/`) | **8000** | Symfony served at `http://localhost:8000` |

First boot behavior:

1. MySQL initializes its data volume by **importing the reference dump**
   (`Context_and_DB_V2/barattolo_v2_18102026_token_redemptions.sql`, the file
   named in `LAST_DB_TO_USE.txt`): full v2 schema + categories seed +
   migration history table. No manual `migrations:migrate` needed.
2. The backend container runs `composer install`, generates local JWT keys
   (`config/jwt/*.pem`, skipped if present) and starts the PHP built-in server
   on `0.0.0.0:8000 -t public` with two dev-only settings from `compose.yaml`:
   `PHP_CLI_SERVER_WORKERS=4` (the built-in server is single-threaded by
   default, so every request would queue behind the previous one) and opcache
   enabled for the CLI SAPI (`-d opcache.enable_cli=1`, with
   `opcache.revalidate_freq=60`). Without them a single API call takes 4-20 s
   over the Windows bind mount and the app's 10 s client timeout
   (`Frontend/src/api/client.js`) fires.

Wait for the healthy state:

```bash
docker compose ps
curl http://localhost:8000/api/categories   # 200 + {"categories":[...]} — GET is public
```

To reset the database from scratch: `docker compose down -v` then up again
(re-imports the dump on the empty volume).

Useful checks:

```bash
docker compose logs backend      # PHP errors, composer, JWT generation
docker compose logs database     # MySQL init progress
```

## 2. Configure the frontend

`Frontend/.env.local` (not committed):

| Var | Value | When needed |
| --- | --- | --- |
| `EXPO_PUBLIC_API_PORT` | `8000` | dev: host resolved from the Expo dev server; web users get the page host automatically |
| `EXPO_PUBLIC_API_URL` | e.g. `http://<lan-ip>:8000` | only with tunnel/built bundles, dev server host unknown |
| `EXPO_PUBLIC_DATI_FINTI` | `1` | demo mode — canned data, no network. Restart with cache cleared: `npx expo start -c` |

`src/api/config.js` reads these at build time (`EXPO_PUBLIC_*`), and detects
the classic misconfiguration of putting the Metro port (8081) into
`EXPO_PUBLIC_API_PORT` with an explicit error message.

## 3. Run the frontend

```bash
cd Frontend
npm install
npx expo start
```

| Surface | How |
| --- | --- |
| **Web** | `npx expo start --web` (or press `w`); API host = page host, so `http://localhost:8000` works |
| **Expo Go (phone)** | scan the QR; API host = the dev-server machine's LAN IP (Wi-Fi sharing with the PC keeps the API reachable on real devices) |
| **Final review (agent)** | web surface driven via Playwright MCP, after the fake-mode banner check and real-data checks |

## 4. Verify end to end

1. Register from `/register` (or use a seeded user from a team dump — dumps
   exclude passwords, so prefer registering fresh users).
2. Login → the JWT (1 h) is stored in `expo-secure-store`.
3. Publish an offer, run through home filters, then a swipe → proposal flow.
4. Confirm the backend receives with `docker compose logs backend -f` while
   acting on the UI.

## 5. Backend-side odd jobs (for the backend maintainer)

While the frontend side owns the Docker stack, some backend duties remain
with the backend owner; document them for reference:

```bash
# staff account (CLI, backend container or host)
php bin/console app:create-staff "Alice Bianchi" alice.staff alice@example.com 'safe-password'

# apply migrations instead of dump-diff flows
php bin/console doctrine:migrations:migrate

# tests (SQLite db in var/)
php bin/phpunit
```

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `curl :8000` connection refused | backend container still installing | `docker compose logs backend -f`, wait for `php -S` line |
| `400 Bad Request` on swipes with 8000 set | `EXPO_PUBLIC_API_PORT` overwritten by 8081 | fix `.env.local`, `npx expo start -c` |
| `Unknown database barattolo` | volume initialized before the dump existed | `docker compose down -v` and re-up |
| Web works, phone gets network error | phone not on the same Wi-Fi / hotspot blocked | same network, or set `EXPO_PUBLIC_API_URL` with the PC LAN IP |
| JWT errors after key regen | stale token in secure store | logout/login to mint a fresh token |
| Registration says it cannot load the categories (`Non riesco a caricare le categorie`) | API slower than the frontend's 10 s timeout — either the stack is not up to date or the container is still cold | `docker compose up -d backend` (workers + opcache in `compose.yaml`), then retry; first request after a start is the slowest |
| A PHP edit does not show up for a while | `opcache.revalidate_freq=60` in `compose.yaml` | wait up to a minute, or `docker compose restart backend` |
| One API call blocks the next one | `PHP_CLI_SERVER_WORKERS` lost (old container) | `docker compose up -d backend` and check `docker logs backend` for several `Development Server started` lines |
