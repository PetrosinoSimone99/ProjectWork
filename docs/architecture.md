# Architecture

## High-level shape

```text
Expo devices / browser
  (React Native 0.86, expo-router)
        │  HTTP + JSON, JWT Bearer auth
        ▼
Symfony 7.4 backend  (Backend/, PHP 8.3)
  Controllers → services/repositories → Doctrine ORM
        │  PDO mysql
        ▼
MySQL 8.0  ("barattolo", schema v2 dumps in Context_and_DB_V2/)
```

- **Frontend** runs on the host with Node/Expo. No container.
- **Backend + database run in Docker Desktop** (`Backend/compose.yaml`):
  MySQL 8.0 seeded from the reference dump on first boot, plus a dev-only
  PHP 8.3 container serving Symfony at `http://localhost:8000`. See
  [`setup.md`](setup.md).
- The frontend reads backend code and dumps as **reference only**; the backend
  code stays outside the frontend owner's write scope (root `AGENTS.md`).

## Auth

The backend issues a **one-hour JWT (RS256)** via
`POST /api/auth/register` and `POST /api/auth/login`; protected requests carry
`Authorization: Bearer <token>`. Keys are RSA (4096-bit) generated locally,
living in `Backend/config/jwt/*.pem` (gitignored). On the frontend:

- `src/auth/token-store.js` persists the token securely
  (`expo-secure-store`);
- `src/auth/auth-context.jsx` exposes the session (`utente`) and owns the
  protected-route behavior: on web, any tab-route URL reached without a
  session redirects to `/login` (guard in `src/app/(tabs)/_layout.jsx`).

Inactive accounts are rejected server-side (`ActiveAccountSubscriber`), and
role-based permissions are enforced by backend controllers; the frontend
honors `ROLE_USER` / staff roles for navigation (staff screens live outside
the tab bar), but never repeats authorization decisions on its own.

## Frontend data flow

One direction, one switch:

1. **Screens** (`src/app/…`) render from data returned by the API layer.
2. **API layer** (`src/api/barattolo.js`) is the **only** place that decides
   fake-vs-real data (`USA_DATI_FINTI` in `src/api/config.js`).
3. `src/api/normalizzazioni.js` maps backend payloads into view models.
4. `src/api/finti/` contains canned data for the fake mode;
   `src/api/aree/` groups consumers per domain.

In fake mode (`EXPO_PUBLIC_DATI_FINTI=1`), the app shows the `AVVISO_DEMO`
banner and never touches the network — which doubles as the demo mode for
screens without backend support yet.

## Backend organization (read-reference)

Controllers map REST endpoints (`/api/...`); see [`api.md`](api.md) for the
frontend-facing catalog. Domain logic lives in dedicated layers — e.g.
`Service/ChainService`, `Service/ChainMatcher`, `Service/ServiceCompatibility`
for chain building and matching; `Manager/ChatManager` for chat; repositories
for query-heavy reads. A scheduler command (`ProcessChainsCommand`) drives the
chain search window; staff actions go through `StaffOperationLogger` into
audit tables. JWT keys, DB URL and MySQL engine version are configured via
env (`DATABASE_URL`), not code.

## Cross-cutting rules

- **Engine discipline:** MySQL 8.0 / utf8mb4 everywhere. Postgres must not
  reappear in configs (the old skeleton compose was MySQL-switched on
  purpose — see `decisions.md` D004).
- **Port discipline:** backend fixed on host port **8000**, matched by the
  frontend `EXPO_PUBLIC_API_PORT=8000`; Metro dev server is 8081. The
  frontend config actively detects the misconfiguration where 8000 is set to
  the Metro port.
- **State on the wire:** proposals and agreements have lifecycle states
  (`IN_ATTESA` / `ACCETTATO` / `RIFIUTATO`, chain variants). Only the backend
  mutates them; the frontend sends decision requests and re-renders from
  responses.
- **CORS:** handled server-side by `CorsSubscriber`; no proxies in the
  frontend.
- **Error paths:** the frontend never silently swerrors; every request path
  surfaces an explicit state (see [`frontend.md`](frontend.md)).
