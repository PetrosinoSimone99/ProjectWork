# Plan brief — Baratto-lo frontend, post-cleanup

Contract of truth for `/plan` and for every child agent. Decisions below are closed;
nothing else is to be invented. Local process artifact, not product documentation
(commit or gitignore explicitly at the end of the session).

## Objective

Bring the frontend in line with the cleaned repository and start building the app the
team agreed on: login/registration, then five tabs (home, automatic match, offer and
request, agreements, profile), against the real Symfony backend and the v3.1 schema —
no swipe, no chains, no tokens, no fake data.

## Constraints

- Frontend scope: `Frontend/` and `docs/` writable. `Backend/**`, `Context_and_DB_V2/**`
  read-only. `Archive/` never touched.
- Branch `andrea-frontend`; `git merge origin/main` (never rebase); push to
  `andrea-frontend` allowed; never to `main`.
- Code, identifiers, file names, routes, docs: English. UI copy: Italian.
- Gate before every push: `npx expo lint` + `npx tsc --noEmit` (syntax only, documented).
- Explicit UI states everywhere (loading, empty, error); no silently swallowed errors.
- Docs updated in the same commit as the change they describe; changelog entry per session.

## Closed decisions

| # | Decision |
| --- | --- |
| 1 | Sync: commit the pending Docker/docs work and `AGENTS.md` first, then merge `origin/main` into `andrea-frontend`, resolve conflicts (their cleanup wins on backend code), push. |
| 2 | Frontend: prune and keep — dead domain removed, working infrastructure and screens retained. |
| 3 | Delete in the prune: chains, tokens, swipe/candidates/loop modules, their cards and hooks, unused assets (`react-logo*`, `expo-badge*`, `tutorial-web`, `expo-logo`), `src/dev/tour-automatico.jsx`. |
| 4 | Full rename to English for survivors (`servizi/`→`services/`, `accordi/`→`agreements/`, `offro-e-cerco`→`offer-and-request`, route paths included). |
| 5 | Home ordering: backend sorts by relevance — first every service sharing at least one category with the viewer's **requests**, newest first, then everything else. Requested from backend; interim behaviour sorts the loaded page locally and documents the limitation. |
| 6 | Home filters: full-text, multiple categories, location. "Remote only" requested from backend together with relevance. |
| 7 | Service popup: username, location or "remote", what the owner offers/seeks, secondary report action, and one "send proposal" button — no form, blind proposal. |
| 8 | Proposal button stays visible but disabled with an "available soon" label until the endpoint exists. |
| 9 | No fake data: `src/api/finti/`, `EXPO_PUBLIC_DATI_FINTI`, the demo banner and the tour are deleted. Missing backend capability renders as an explicit empty/unavailable state. |
| 10 | Tabs 2 (automatic match) and 4 (agreements) exist from day one with explicit empty states. |
| 11 | Agreements tab: three sections (sent, accepted, concluded), each with its own empty state, plus a bell with the count of pending received proposals; accepted/refused happens inside the bell panel (tick/cross). Received proposals are visible only there. Proposals the user sent remain visible with an explicit refused state. |
| 12 | Lifecycle: mutual acceptance creates the agreement and opens the chat; inside the chat an agreement sheet (place, service, start and end datetime) is filled by either participant and confirmed by the other, `UNCOMPILED` until confirmed; conclusion is automatic when `end_date` passes; afterwards the chat is not accessible and only the agreement card remains; a service not delivered becomes `CONTESTED` for staff. |
| 13 | Profile photo: pasted URL only, validated `http/https` and `.png/.jpg/.jpeg`, explicit error when the image fails to load; no upload, no storage. |
| 14 | Phase 1 code scope: login, registration (name, surname, username, email, password, mandatory location, optional services), home, offer-and-request, profile (name, surname, location, bio, photo URL, theme, logout, staff entry when the role allows), plus retained reports and staff screens. |
| 15 | Offer-and-request: normal tab opening the list of the user's services, with an emphasised "+" inside the screen; per item edit, suspend/reactivate, soft delete; a recoverable "Deleted" section using the existing restore API. |
| 16 | `docs/`: nine files with one job each (`README`, `overview`, `architecture`, `frontend`, `api`, `database`, `setup`, `decisions`, `changelog`); `project-structure.md` absorbed into `architecture.md`, `ux.md` into `frontend.md`; new `docs/backend-gaps.md` holds the eight backend requests and is linked from `api.md`. |
| 17 | Language: JavaScript only, no TypeScript migration. |
| 18 | One plan, four steps, executed sequentially: sync → prune + rename → docs → first code block. Execution mode `single`. |
| 19 | Data layer: keep the existing hook pattern (loading/error/pagination guards/retry); no TanStack Query or other data library. |
| 20 | Form validation: hand-written validators in one `validation/` module, Italian messages, no zod. Recorded in `docs/decisions.md` as a conscious deviation from the schema-based line. |
| 21 | Existing chat code deleted (its endpoints reference removed proposals and its tables are absent from the dump); the design decisions above are preserved in the docs. |

## Success criteria

- `npx expo lint` and `npx tsc --noEmit` pass; the app boots on web and Expo Go.
- No module, import, string or asset references chains, tokens, swipe, candidates, loop,
  fake data or the legacy Italian domain names.
- Five tabs, Italian UI copy, English code; home, offer-and-request and profile work
  against the real Docker backend with explicit loading/empty/error states.
- Proposals/agreements/chat surfaces exist as honest empty states, never invented data.
- `docs/` reflects the five-tab model, the v3.1 schema and the eight backend gaps.
- Changelog entry for the session, in the same commits as the changes.

## Exclusions

- Match algorithm, queues and scoring.
- Implementation of proposals, agreements, notifications and chat (backend not available).
- Any change to staff features beyond the rename.
- Photo upload/storage, password change, account deletion, i18n framework, Playwright suite.
- Any edit under `Backend/**`, `Context_and_DB_V2/**`, `Archive/`.

## Unverified assumptions

None. Every open question was answered; what the backend cannot do is written as a
request in `docs/backend-gaps.md`, not assumed.

Style: full
