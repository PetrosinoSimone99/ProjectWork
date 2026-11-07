# Changelog

Session log of project-level changes that affect how the codebase is built,
run, or understood. Newest first. Each entry says what changed, why, and the
documents/code touched.

---

## 2026-11-07c — Frontend aligned with the cleaned repository

### What changed

1. **Sync with the cleaned main.** `origin/main` merged: swipe, chains and
   tokens are gone from the backend, the old dumps moved to
   `Archive/DB_pre_November/`, and the deleted-service APIs (soft delete plus
   restore) arrived.
2. **Dead domain removed from the frontend** (`refactor: drop dead domain`):
   23 unreachable screens, cards, hooks and helpers, `api/finti/` in full, the
   automatic tour, the unused Expo template assets, and the fake-data branches
   inside the API layer. A reachability resolver measured the graph before and
   after: 75 files reachable, 0 orphaned. Three dead links found and closed
   (token card, chat and proposal buttons in the popup, agreement detail
   navigation); the popup now shows a disabled "Invia proposta".
3. **Rename to English** (`refactor: rename to English`): directories, file
   names, route paths and exported symbols. The five tabs are now `/`,
   `/match`, `/offer-and-request`, `/agreements`, `/profile`; the business
   routes are `/edit-profile`, `/report`, `/staff`, `/staff-users`.
4. **Documentation rewritten** for the five-tab model, the v3.1 schema and the
   JavaScript-only stack; `project-structure.md` and `ux.md` absorbed into
   `architecture.md` and `frontend.md`; new `backend-gaps.md` holding the eight
   endpoints the frontend needs and the backend does not have.
5. **Docker seed fixed** (`fix: seed the stack from the v3.1 dump`): the stack
   pointed at `barattolo_v2_18102026_token_redemptions.sql`, which the backend
   cleanup moved to `Archive/DB_pre_November/`. It now imports the dump named
   by `LAST_DB_TO_USE.txt`, so a fresh volume initializes again.

### Why

The frontend was a mature app built on a product the team had just retired:
swipe feeding, chain exchanges and compensation tokens. Half of it could not
work against the cleaned backend and none of it matched the schema the team
kept. This session brings the code, the routes and the documentation in line
with the five tabs the team agreed on, and states plainly what the backend
still owes.

### Touched

`Frontend/src/**` (deletions, renames, dead-link removal), `docs/**`
(rewritten set plus `backend-gaps.md`), `Backend/compose.yaml` (Docker
exception).

### Attention (backend maintainer)

1. `Backend/compose.yaml` changed under the documented Docker exception: the
   seed dump path now points at the v3.1 dump. No backend source, config or
   test file was touched.
2. **The v3.1 dump carries no seed rows**: a fresh database has an empty
   `categories` table, so publishing a service is impossible until reference
   categories are loaded. Please decide whether the dump or a migration should
   provide them.
3. The frontend requests eight endpoints, listed with payloads in
   `docs/backend-gaps.md`: relevance ordering, remote-only filter, public
   profile, proposals (send, list, accept, refuse), agreements (list, detail),
   the agreement sheet confirmation, and the chat attached to an agreement.

---

## 2026-11-04 — Registration failed: API latency above the client timeout

### Symptom

`/register` opened on the message *«Non riesco a caricare le categorie: senza,
non posso completare la registrazione»* and the «Crea account» button stayed
disabled. The categories request never completed, so the screen had no
catalogue to choose from.

### Root cause (measured, not guessed)

`GET /api/categories` took **4–23 s** against the Docker stack, far above the
frontend's 10 s `TIMEOUT_RICHIESTA_MS` (`Frontend/src/api/client.js`), so the
`AbortController` fired and the screen showed the error state. Two causes on
the backend container, both in `Backend/compose.yaml`:

1. `php -S` is **single-threaded**: parallel requests queue. Four concurrent
   calls measured 4.1 / 7.7 / 11.9 / 16.8 s — plain serialization.
2. opcache is **off in the CLI SAPI** (the SAPI `php -S` uses), and
   `opcache.validate_timestamps` was re-statting every file over the Windows
   bind mount: ~2 s of pure `stat` per request, ~4 s of recompilation without
   opcache.

### What changed

- `Backend/compose.yaml` (Docker exception, runtime only):
  `PHP_CLI_SERVER_WORKERS=4`, and the server now starts with
  `-d opcache.enable_cli=1 -d opcache.memory_consumption=256
  -d opcache.interned_strings_buffer=32 -d opcache.max_accelerated_files=20000
  -d opcache.validate_timestamps=1 -d opcache.revalidate_freq=60`.
- `docs/setup.md`: the backend row said PHP 8.3 (it is 8.4 since
  2026-11-03c), the “first boot” step described a bare `php -S`, the
  `curl /api/categories` check claimed `401` was correct (**it is public and
  returns `200`**), and three troubleshooting rows were added (this
  symptom, the 60 s opcache revalidation, the lost workers).

### After

`GET /api/categories`: 1.5 s warm, 1.4 s with four in parallel (was 4–23 s).
`POST /api/auth/register`: 3.2 s end to end, `201`. First request after a
container start is still the slowest (~7.7 s) because each worker warms its
own opcache — under the timeout, but the stack has to be up before the
screen is opened.

No frontend code changed: the 10 s budget was correct, the server was not.

### Attention (backend maintainer)

- Only the Docker exception files were edited (runtime, no source/config/test).
- `opcache.revalidate_freq=60` means a PHP file edited on the host can take up
to a minute to be served; `docker compose restart backend` forces it. If a
shorter window is preferred, lower the value — it costs ~2 s per request.
- The real fix for the remaining 1.5 s is the volume strategy (`.:/app` on a
  Windows bind mount); that is a backend/Docker decision, not a frontend one.

---

## 2026-11-03c — Docker stack fixes: PHP 8.4 image, test DBs, dump mount

### What changed

Docker-exception files edited so the backend stack and its test suite run:

- `Backend/docker/Dockerfile`: base image `php:8.3-cli` -> `php:8.4-cli`.
  `composer.lock` requires PHP ^8.4 (doctrine/collections 3.1.0,
  doctrine/orm 3.7.2); with 8.3 `composer install` failed and the backend
  container never started ("Dependencies are missing").
- `Backend/compose.yaml`: added read-only mount
  `../Context_and_DB_V2:/Context_and_DB_V2:ro` on the backend service.
  `tests/Integration/TokenRedemptionMigrationTest.php` resolves the dump at
  `dirname(__DIR__, 3)`, which inside the container (`/app` = `Backend/`)
  points to `/Context_and_DB_V2`.
- No other exception files touched. Test databases created at runtime only
  (`barattolo_test`, `chain_check_local_test`, `staff_check_local_test`,
  `token_check_local*`) — no file change.

Result: full backend suite green — 119 tests, ~1.7K assertions, 0 failures
(run of 2026-11-03, PHP 8.4.27 in container).

### Attention (backend maintainer)

- The Dockerfile now pins PHP 8.4 to match `composer.lock`; keep both in sync.

---

## 2026-11-03b — Docs realigned to schema v3.1 (swipe/chat/chains dropped)

### What changed

`docs/overview.md`, `docs/database.md`, `docs/api.md`, `docs/ux.md` and
`docs/README.md` now describe schema **v3.1 "senza swipe chat catene"**
(`barattolo_v3_1_senza_swipe_chat_catene.sql`, per `LAST_DB_TO_USE.txt`)
instead of the v2 dump.

- Exchange model restated as **pairwise and directional**: one agreement =
  one provider, one beneficiary, one service. Receive first, provide later;
  paths of any length emerge from independent agreements. The closed 3–4
  person chain is retired.
- Table map replaced with the v3.1 set (`service_queues`, `match_candidates`,
  `agreements`, `agreement_proposal`, `agreement_details`,
  `queue_associated_agreements`) and legacy tables removed from the map.
- **Swipe and chat marked "in development"**: v3.1 creates no tables for
  them; the backend owner is developing them. Old routes documented as
  reference only.
- Target navigation recorded as **four tabs** (Swipe, Cerco e offro, Chat,
  Profilo), with the current five-tab code marked as transitional.
- Gaps recorded explicitly: `credits` and `is_used` inert, token reservation
  incompatible with v3.1 until `ChainRepository::hasDirectProposal()` is
  reworked, no ordering/expiry on `service_queues`.

### Why

The frontend docs still described the retired feature set, so any agent
reading them (including this session) produced wrong answers about the
product. Source of truth: commit `8e6f52b` on `origin/main` (2026-11-01).

### Touched

`docs/overview.md`, `docs/database.md`, `docs/api.md`, `docs/ux.md`,
`docs/README.md`, `docs/changelog.md`. No code, no `Context_and_DB_V2/` file.

### Attention (backend maintainer)

- The v3.1 dumps and `Archive/` only exist on `origin/main`; this branch is
  behind and still lacks them locally.
- `Backend/compose.yaml` still seeds the v2 dump — switching the seed to v3.1
  is an open task owned by the Docker exception holder.
- Frontend code still follows the old five-tab model; realignment is pending.

---

## 2025-11-03 — Project governance, docs set, Docker Desktop stack

### What changed

1. **Root `AGENTS.md` created** — the rulebook binding AI agents and humans:
   frontend-owner file scope (read-only `Backend/` with the Docker
   exception), per-push main authorization, merge-not-rebase sync, English
   code/commits, lint+tsc pre-push gate, docs duty.
2. **`docs/` created** — 12 documents covering product overview,
   architecture, project structure, local setup, frontend-facing API, the
   MySQL v2 schema with its known gaps, frontend conventions, UX rules,
   decision log, workflow for humans, and this changelog.
3. **Docker Desktop stack rebuilt** (`Backend/compose.yaml`,
   `compose.override.yaml`, new `Backend/docker/Dockerfile` — the allowed
   exception per D008):
   - database **MySQL 8.0** (replacing the Postgres skeleton, D004),
     seeded on first boot from
     `Context_and_DB_V2/barattolo_v2_18102026_token_redemptions.sql`
     (`LAST_DB_TO_USE`);
   - **backend PHP 8.3 dev container** serving Symfony on host port 8000,
     with `composer install` + local JWT keypair generation on boot.
4. **Decision log opened** (decisions.md D001–D009) recording today's
   governance choices and the pre-existing team charter decisions.

### Why

The frontend owner needs an environment where the backend and its database
run under Docker Desktop (her owned subsystem), plus project docs precise
enough for every developer and every AI agent — docs are the project's
shared memory.

### Touched

`AGENTS.md`, `docs/**`, `Backend/compose.yaml`, `Backend/compose.override.yaml`,
`Backend/docker/Dockerfile`.

### Attention (backend maintainer)

`Backend/compose.yaml`, `compose.override.yaml` and `Backend/docker/`
changed under the ownership exception documented in AGENTS.md and
decisions.md (D008). No backend source, config or test file was touched. If
the runtime container approach conflicts with backend plans (e.g. its own
Docker strategy), coordinate on the compose files.
