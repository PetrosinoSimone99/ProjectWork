# Baratto-lo documentation

Non-profit platform for exchanging services between users: catalog and
filters, per-user offer/request queues, pairwise directional agreements
(receive first, provide later, paths of any length), chat and swipe matching
still in development, credits/tokens as the reliability layer, staff
moderation.

**Team:** Petrosino Simone, Martinez Anthony, Marinelli Alessio,
Cestelli Andrea.

## File map

| File | What it covers |
| --- | --- |
| [`overview.md`](overview.md) | Product, actors, features, domain glossary |
| [`architecture.md`](architecture.md) | System design: frontend/backend/data layer, auth, mock-data switch |
| [`project-structure.md`](project-structure.md) | Repository tree and what every directory owns |
| [`setup.md`](setup.md) | Local environment: Docker Desktop stack, env vars, how to start and verify |
| [`api.md`](api.md) | Endpoints consumed by the frontend, with canonical sources |
| [`database.md`](database.md) | MySQL schema v3.1: tables, flows they encode, known gaps |
| [`frontend.md`](frontend.md) | Frontend conventions: stack, state, API layer, code style decisions |
| [`ux.md`](ux.md) | Screens, navigation maps, UX rules and constraints |
| [`decisions.md`](decisions.md) | Decision log (ADR-light): what was decided, by whom, why |
| [`workflow.md`](workflow.md) | Git workflow for humans: branches, sync, push authorization |
| [`changelog.md`](changelog.md) | Session-by-session history of what changed and why |

## Reading order

- New to the project: `overview.md` → `project-structure.md` → `setup.md`.
- Working on a feature: `api.md` + `database.md` for the data, `frontend.md`
  for conventions, `decisions.md` to avoid re-litigating settled calls.
- Onboarding on the backend side: `architecture.md` + `database.md`, then the
  canonical backend sources listed in `api.md`.

## Ownership and updates

The `docs/` is maintained by the frontend side (Andrea Cestelli and the AI
agents he works with), but they must be written with the precision of someone
who also owns the backend topics: they serve every developer and every AI
agent in the repository. Rules in force for all agents are in the root
[`AGENTS.md`](../AGENTS.md). Every session that changes code or configuration
updates the relevant docs and appends a `changelog.md` entry, in the same
commit.
