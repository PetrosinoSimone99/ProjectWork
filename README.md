# Baratto-lo

Baratto-lo is a non-profit platform where people exchange **services without
money**. One account publishes what it offers and what it looks for; the home
shows what other people offer; a proposal starts the conversation and, once both
sides accept, the exchange becomes an agreement with a chat to settle the
practical details.

Exchanges are **pairwise and directional**: there is no closed loop to complete
and no minimum group size. Longer paths (A receives from B, B receives from C)
are just independent agreements that happen to line up.

## What the app does

| Area | What it covers |
| --- | --- |
| Account | Registration with location, one offer and one request, login, profile editing, theme (light/dark/system) |
| Catalog | Home with the services other people offer, text and location filters, a category picked from a shared catalog, service detail |
| Exchange | Proposal, accept or refuse, agreement sheet with the two delivery sides, chat inside the agreement, cancellation |
| Match | A service queue per side, matched on the same normalized comune, credits spent and returned |
| Notifications | Inbox, unread badge, live stream that keeps lists and badge current without a manual refresh |
| Staff | Account activation and roles, reports and their review, deleted services, audit trail of staff actions |

Every UI state is explicit — loading, empty, error, "not available yet" — and a
feature without a working endpoint shows an empty state instead of fake data.
The UI copy is Italian.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React Native 0.88 / Expo SDK 58, expo-router, React 19, **JavaScript only** (no `.ts`/`.tsx`) |
| Backend | Symfony 7.4, PHP 8.4, Doctrine ORM 3 |
| Database | MySQL 8.0, `utf8mb4` |
| Local runtime | Backend and database in **Docker Desktop**; the frontend on the host with Node and Expo |

## Repository layout

```text
Frontend/            Expo app: screens, components, hooks, api and services layers
Backend/             Symfony app: controllers, entities, tests, migrations, Docker stack
docs/                Project documentation (start at docs/README.md)
Context_and_DB_V2/   Reference schema dumps and the backend API docs
Archive/             Frozen material, kept for reference only
```

`Backend/` has its own maintainer and its own rules; the frontend owner is
Andrea Cestelli. `Archive/` is never edited.

## Quick start

Prerequisites: **Docker Desktop** running, **Node.js** with npm, and a browser or
Expo Go on a phone.

```bash
# 1. Backend and database (MySQL 8.0 + PHP on port 8000, schema and demo rows
#    imported on the first boot of an empty volume)
cd Backend
docker compose up -d --build

# 2. Frontend configuration: EXPO_PUBLIC_API_PORT=8000 is the local default
cd ../Frontend
cp .env.example .env.local

# 3. App
npm install
npx expo start          # press w for web, or scan the QR with Expo Go
```

Check the stack with `curl http://localhost:8000/api/categories`. The demo
accounts (password `demo1234`) are listed in
[`docs/setup.md`](docs/setup.md#what-a-fresh-database-contains);
`demo.staff` is a staff account and a party in every seeded agreement, so one
login reaches every state the product has.

`docker compose down -v` **wipes** the local database and re-imports it on the
next start. Full environment, latency notes and troubleshooting:
[`docs/setup.md`](docs/setup.md).

## Tests

```bash
cd Frontend
npx expo lint
npx tsc --noEmit
npx jest                     # 48 suites, 577 tests, ~20 s, no Docker needed
```

Those three commands are the gate before any push to this branch. `tsc --noEmit`
only parses syntax and imports (`allowJs` without `checkJs`): the suite is what
covers behaviour. CI runs lint and a web export on every pull request to `main`.

The backend has its own PHPUnit suite, which needs the Docker stack up and two
MySQL test databases; the three commands are in
[`docs/setup.md`](docs/setup.md#5-backend-duties-backend-maintainer).

## Documentation

[`docs/README.md`](docs/README.md) is the map: product (`overview.md`), system
shape (`architecture.md`), frontend conventions (`frontend.md`), UX and
accessibility rules (`ux.md`, `accessibility.md`), endpoints (`api.md`), schema
(`database.md`), local environment (`setup.md`), design system (`DESIGN.md`),
decisions (`decisions.md`) and session history (`changelog.md`).

## Team

Petrosino Simone, Martinez Anthony, Marinelli Alessio, Cestelli Andrea.

## License

No project license has been declared yet. `Frontend/LICENSE` is the MIT file
that ships with the Expo template and covers the template, not this project.
