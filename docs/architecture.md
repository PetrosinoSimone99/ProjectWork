# Architecture

## System shape

```text
Expo app (React Native 0.86 + expo-router, JavaScript)
        │  HTTP + JSON, JWT Bearer
        ▼
Symfony 7.4 backend (Backend/, PHP 8.3/8.4 container)
  Controllers → repositories/managers → Doctrine ORM
        │  PDO mysql
        ▼
MySQL 8.0 ("barattolo", schema v3.1)
```

- The **frontend** runs on the host with Node and Expo; no container.
- **Backend and database** run under Docker Desktop (see `setup.md`).
- The backend code is read-only for the frontend owner, except the Docker
  runtime files (`Backend/compose.yaml`, `compose.override.yaml`,
  `Backend/docker/`), whose changes are reported in the changelog.

## Repository tree

```text
AGENTS.md              workflow rules for humans and agents
docs/                  this documentation set
Backend/               Symfony API (read-only reference; Docker files editable)
  src/Controller/      one controller per area, attributes-based routes
  src/Entity/          User, Service, Category, UserReport, Chat*, Proposal*, StaffOperationLog
  src/Repository/      query-heavy reads (catalog, staff, reports)
  src/Manager/, src/Service/   domain logic (chat, staff logger, restore)
  src/Subscriber/      active-account guard, CORS
  tests/               functional and integration suites
Context_and_DB_V2/     authoritative schema dumps, API guide, user stories
  API docs/            the backend-written database and API guide
Archive/               reversed decisions (swipe, chains, tokens) — rollback only
Frontend/              Expo app
  src/app/             expo-router routes: (auth), (tabs), secondary screens
  src/api/             the only place that talks HTTP
  src/services/        pure domain logic, no network, no React
  src/hooks/           stateful glue between screens and the api layer
  src/components/      presentational building blocks
  src/theme/           light/dark tokens and the preference store
  src/auth/            session context and token storage
  src/agreements/      agreement state rules (rewritten with the new model)
  src/navigation/      the five tab routes, one source for bar and web menu
```

## Frontend structure

| Layer | Owns | Rule |
| --- | --- | --- |
| `src/app/**` | Routes and screens | Compose hooks and components; never call `fetch` |
| `src/hooks/**` | Loading, error, pagination, retry, focus refresh | One hook per screen concern; stale responses never overwrite newer ones |
| `src/api/**` | HTTP, error mapping, payload normalisation | `api/client.js` is the only `fetch`; `api/index.js` is the public surface |
| `src/services/**` | Pure functions: filters, labels, state derivation | No network, no React, no side effects |
| `src/components/**` | Presentational building blocks | Props in, no data fetching |
| `src/theme/**` | Colour and spacing tokens, light/dark preference | Screens read tokens, never hard-code colours |

The route paths are English (`/match`, `/offer-and-request`, `/agreements`,
`/profile`, `/edit-profile`, `/report`, `/staff`, `/staff-users`); tab titles
are Italian because the user reads them.

## Data flow

1. A screen renders from what a hook returns.
2. The hook calls one function from `src/api/index.js`.
3. That function calls `apiFetch` in `api/client.js`: base URL, JSON, Bearer
   token, 10 s timeout, `ApiError` for every failure.
4. `api/normalizers.js` turns backend payloads into the shape the screens use.
5. Errors surface as explicit states: loading, empty, error with retry,
   "endpoint not available".

There is no client cache and no state library: each hook owns its slice and
refetches on focus, on pull-to-refresh or on user action.

## Auth

`POST /api/auth/register` and `POST /api/auth/login` return a **one-hour JWT**
(RS256). The token is stored with `expo-secure-store` (`auth/token-store.js`);
`auth/auth-context.jsx` exposes the session and rehydrates it on boot.

- A `401` from any call logs the user out and sends them back to the login.
- Inactive accounts are rejected server-side; the app shows the `403`.
- The app hides staff entries when the role does not allow them, but every
  authorisation decision is the backend's.

## Cross-cutting rules

- **Engine:** MySQL 8.0, utf8mb4. Postgres must not come back.
- **Ports:** backend fixed on host port 8000, matched by
  `EXPO_PUBLIC_API_PORT`; Metro uses 8081 and the config refuses a port that
  looks like the Metro one.
- **Errors:** every request path ends in an explicit UI state; nothing is
  swallowed and nothing is retried silently.
- **CORS:** handled by the backend subscriber; no proxy in the app.
- **Read-only backend:** frontend work never edits `Backend/src`, `config` or
  `tests`.
