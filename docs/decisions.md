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

**D002 — 2025 — Fake-data mode is a single switch. (Superseded by D011.)**
`USA_DATI_FINTI` in `src/api/config.js` (env `EXPO_PUBLIC_DATI_FINTI`) is the
only fake-vs-real decision point, consumed in `src/api/barattolo.js`. The
demo banner is generic and hides technical details.
*Consequences:* components and screens stay backend-agnostic; fake mode
always shows the banner; no parallel API paths. (source: `src/api/config.js` docs).
The whole mechanism was removed on 2026-11-07, see D011.

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

---

**D010 — 2026-11-07 — JavaScript only, no TypeScript migration.**
The frontend stays on `.js`/`.jsx`. `npx tsc --noEmit` remains in the gate but
checks **syntax only** (`allowJs` without `checkJs`, verified with a scratch
fixture): it catches a missing brace, not a wrong field name.
*Consequences:* `expo lint` is the real pre-push check; type safety is not
expected from the toolchain and must not be assumed in review.

**D011 — 2026-11-07 — The fake-data layer is gone.**
`src/api/finti/`, `USA_DATI_FINTI`, the demo banner, the guard in
`api/client.js` and the automatic tour were deleted. The app talks to the real
backend only; a missing endpoint renders an explicit "not available" state.
*Consequences:* no screen can show invented content; development needs the
Docker stack running; the demo mode no longer exists as a product surface.

**D012 — 2026-11-07 — Deletions are decided by measured reachability.**
Before deleting the dead domain, a resolver walked the import graph from the
fifteen app entry points. 23 files were unreachable and removed; afterwards
75 files are reachable and 0 are orphaned.
*Consequences:* renames and deletions can be re-verified at any time; a file
that nothing imports is a bug (or pending work), not a candidate to keep.

**D013 — 2026-11-07 — Rename scope: files, routes, exported symbols first.**
Directories, file names, route paths and exported component/hook/constant names
are English. Camel-case function and variable names inside `api/` and
`services/` are still Italian and are renamed module by module as those files
are rewritten against the real endpoints.
*Consequences:* the diff stays reviewable; the outstanding Italian identifiers
live only where the code is about to be replaced anyway.

**D014 — 2026-11-07 — No data-fetching library.**
The existing hook pattern (loading, error, pagination guard, retry, focus
refresh) stays. No TanStack Query, no global cache.
*Consequences:* one hook per screen concern; stale responses cannot overwrite
newer ones; the cost is repetitive code in each hook.

**D015 — 2026-11-07 — Form validation is hand-written.**
One module (`src/validation/`) with functions returning the first Italian error
message, instead of adding zod. This is a conscious deviation from the
schema-based validation line in the global rules: four forms with simple shape
rules do not justify a new dependency.
*Consequences:* validation messages stay in one place and in Italian; a new form
must reuse the module instead of writing its own checks.

**D016 — 2026-11-07 — An agreement concludes at its end date.**
No `COMPLETED` status is added to the schema. The agreement is concluded when
the agreed `end_date` has passed; a service that is not delivered becomes
`CONTESTED` and goes to staff.
*Consequences:* no schema change; the chat becomes inaccessible at conclusion;
a service delivered earlier cannot be closed early without a new decision.

**D017 — 2026-11-07 — The chat is reachable only through an accepted agreement.**
The legacy chat endpoints (keyed by proposals that no longer exist) are not
called; the old chat screen and its components were deleted. The chat will be
built on the agreement id.
*Consequences:* no chat surface until the backend exposes G8 in
`backend-gaps.md`; the design decisions (bubbles, composer, sheet inside the
chat) are kept in this documentation, not in dead code.

**D018 — 2026-11-07 — Documentation set: nine files plus the gap list.**
`project-structure.md` was absorbed into `architecture.md` and `ux.md` into
`frontend.md`; `backend-gaps.md` is new and holds the requests to the backend.
*Consequences:* one file per job; the gap list is the artefact handed to the
backend maintainer.
