# AGENTS.md — Baratto-lo project rules

Instructions for AI agents (and humans) working in this repository.

## Project in one breath

Baratto-lo: non-profit platform for exchanging services between users
(swipe matching, 1:1 or up-to-4-person chain exchanges, chat, token
compensation, staff moderation). React Native/Expo frontend, Symfony 7.4
backend, MySQL 8.0 database. Full context: [`docs/`](docs/README.md) — read
[`docs/overview.md`](docs/overview.md) first.

## Your role

The primary operator of this repo is **Andrea Cestelli**, the **frontend
owner**. Every rule below flows from that fact.

### File scope (hard rule)

| Path | Permission | Notes |
| --- | --- | --- |
| `Frontend/` | **Write** | Your own area |
| `docs/` | **Write** | Shared documentation, mostly maintained by frontend side |
| `Backend/**` | **Read-only** | Backend maintainer's code, config and tests |
| `Backend/compose.yaml`, `Backend/compose.override.yaml`, `Backend/docker/` | **Write (exception)** | Docker runtime only; see below |
| `Context_and_DB_V2/**` | **Read-only** | Reference dumps, API and context docs; never edit SQL |
| `Archive/` | **Never touch** | Frozen material |
| Root files (`README.md`, `.github/`, `.gitignore`) | Ask first | Only when the change is strictly frontend-related |

The Docker exception exists because the "backend + database run in Docker
Desktop" requirement lives there, and **Docker Desktop ownership is Andrea's**
(only team member who manages it). Any change to those exception files must be
reported in `docs/changelog.md` so the backend maintainer is notified.
Absolute value like "yesterday" is useful only combined with the merge above.

### Backend knowledge

Even though backend code is off-limits for writing, the frontend dev and their
AI agents **must read it** (controllers, README, `Context_and_DB_V2/API docs/`)
with the same precision as if they had written it, before touching anything
API-related. Canonical sources live in `Backend/README.md` and
`Context_and_DB_V2/API docs/`; the frontend-facing summary lives in
`docs/api.md`.

## Git workflow

- **Never commit directly to `main`.** All work happens on
  `andrea-frontend`.
- **Session start (mandatory):** run `git fetch origin`, compare local branch
  against `origin/main` and `origin/andrea-frontend`, and report the delta
  (ahead/behind/diverged) before doing anything. Never merge or rebase
  automatically — report and ask.
- **Syncing with `main`:** always `git merge origin/main` into the working
  branch. **Rebasing the published branch is forbidden** — history is shared.
- **Pushes to `andrea-frontend`:** always allowed.
- **Pushes to `main`:** require explicit per-push authorization from Andrea,
  *after* showing what is about to be pushed (commits, diff summary,
  fast-forward or merge). A yes for one push is not a standing permission.
- **`git push --force` / `--force-with-lease` to `main`: never.**

## Commits

- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`,
  `test:`, `style:`.
- **English titles and bodies.** Short, minimal titles; bodies only when
  they explain a real decision. No filler ("minor improvements", "update
  stuff"), no emoji.
- **No AI-attribution footers** ("Generated with ...", "Co-Authored-By: ...").
- One logical change per commit. Documentation updates belong **in the same
  commit** as the change they document: never leave docs stale or make
  docs-only "cleanup" commits mixed inside a feature.

## Code language

**All new code is written in English** — identifiers, comments, strings the
team reads, test names, docs. Italian names may exist only in legacy modules
already in the repo (they are grandfathered, not extended). Reply language for
chat with Andrea is Italian; artifacts are English.

## Pre-push gate (hard rule)

Before every push to any branch, these must pass on the frontend:

```bash
cd Frontend
npx expo lint
npx tsc --noEmit
```

Red gate → no push. Do not weaken assertions or skip checks to make it green.

## Docs duty

Every implementation session ends with updated documentation in the same
commit. Start from [`docs/README.md`](docs/README.md) for the file map. The
`docs/` is written by the frontend side but must cover backend topics with the
care of someone who owns them. Session-level changes append to
[`docs/changelog.md`](docs/changelog.md).

## Docker (local environment)

Database and backend **must** run in Docker Desktop. The stack lives in
`Backend/compose.yaml` (MySQL 8.0 seeded from the reference dump + PHP 8.3
dev container serving Symfony on port 8000).

- Owner: Andrea. AI may start/stop/configure the stack on request.
- MySQL over Postgres is deliberate: every source (backend config examples,
  dumps) targets MySQL 8.0 / utf8mb4. Do not swap engines.
- See [`docs/setup.md`](docs/setup.md) for the full environment.

## Frontend development model

- Frontend runs on the host (Node + Expo), not in Docker: `npx expo start`.
- **Fake-data mode:** `EXPO_PUBLIC_DATI_FINTI=1` in `Frontend/.env.local`
  replaces the backend with canned data. The single switch is
  `src/api/config.js`; components never decide fake-vs-real themselves.
- API reachability is configured via `EXPO_PUBLIC_API_PORT` (dev,
  matched to the fixed Docker port 8000) or `EXPO_PUBLIC_API_URL`.
- Testing surfaces: Expo Go on a physical device, web (`npx expo start --web`),
  and Playwright-driven browser checks for final reviews.

## Code style (details live in docs/frontend.md)

- English-only naming; write code as if the backend team will read it.
- Every UI state is explicit: loading, empty, error. Never silently swallow
  errors; surface them.
- No emoji in code or UI copy. No hardcoded secrets or backend URLs.
- Keep screams in single-responsibility modules; prefer many small files
  over few large ones (see ARCHITECTURE_MAX in docs/frontend.md).
