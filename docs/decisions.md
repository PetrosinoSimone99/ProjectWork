# Decisions

ADR-light log: one numbered entry per decision, appended (never rewritten).
Format: date — decision — context — consequences. Reversal = new entry that
supersedes.

---

**D001 — 2025 (pre-dated, team charter) — Code language: English.**
Code (identifiers, comments, new files, test names) is English; UI copy is
product language (Italian). Legacy Italian-named frontend modules are
grandfathered and renamed opportunistically. (source: `Context_and_DB_V2/new_user_stories_v2.md`,
`baratto-context.md` "Scelte tecniche confermate"; AGENTS.md.)

**D002 — 2025 — Fake-data mode is a single switch.**
`USA_DATI_FINTI` in `src/api/config.js` (env `EXPO_PUBLIC_DATI_FINTI`) is the
only fake-vs-real decision point, consumed in `src/api/barattolo.js`. The
demo banner is generic and hides technical details.
*Consequences:* components and screens stay backend-agnostic; fake mode
always shows the banner; no parallel API paths. (source: `src/api/config.js` docs)

**D003 — 2025-11-03 — Branch sync via merge, never rebase.**
Published branches are shared history; `git merge origin/main` into
`andrea-frontend` is the sync operation (matches the existing history).
*Consequences:* straightforward conflict history; no history rewrite.

**D004 — 2025-11-03 — MySQL 8.0 over Postgres in Docker Desktop stack.**
`Backend/compose.yaml`'s old Postgres skeleton is replaced by `mysql:8.0`;
dump compatibility (utf8mb4, MySQL dialect) and backend examples required it.
*Consequences:* first boot imports `barattolo_v2_18102026_token_redemptions.sql`;
`serverVersion=8.0` in `DATABASE_URL`; Postgres configs must not return.

**D005 — 2025-11-03 — Backend PHP served from a dev-only container.**
`Backend/docker/Dockerfile` (php:8.3-cli + intl/zip/pdo_mysql + composer)
replaces host-based MAMP/Laragon setups in the team's local flow, backend
service fixed at host port 8000.
*Consequences:* single dev stack under Docker Desktop; production image
strategy stays out of scope for this repo.

**D006 — 2025-11-03 — Frontend pre-push gate: expo lint + tsc.**
`npx expo lint` and `npx tsc --noEmit` must pass before any push; unit tests
enter the gate when a test runner lands.
*Consequences:* no red push; no intentionally weakened checks.

**D007 — 2025-11-03 — docs/api.md is frontend-facing only.**
It documents the endpoints the frontend consumes, with pointers to canonical
backend sources; must be re-verified whenever a session touches APIs.
*Consequences:* no duplicated API reference; reliance on
`Context_and_DB_V2/API docs/` as truth.

**D008 — 2025-11-03 — Docker exception inside the backend write-block.**
Andrea (frontend owner) is allowed to edit only `Backend/compose.yaml`,
`compose.override.yaml` and `Backend/docker/` because Docker Desktop is her
owned subsystem; every change is reported in changelog so the backend owner
stays informed.
*Consequences:* narrow, auditable exception; the rest of `Backend/` remains
untouchable.

**D009 — 2025-11-03 — Code style rules documented in frontend docs, not AGENTS.**
Style (component naming, token discipline, file size) lives in
[frontend.md](frontend.md) since it is negotiable; the AGENTS file holds only
the non-negotiable workflow boundary rules.
