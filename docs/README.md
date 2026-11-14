# Baratto-lo documentation

Baratto-lo is a non-profit platform where people exchange services. One account
publishes what it offers and what it looks for, browses the services other
people offer, sends a proposal, and once both sides accept, an agreement is
created and a chat opens to settle the details.

**Team:** Petrosino Simone, Martinez Anthony, Marinelli Alessio, Cestelli Andrea.

## File map

| File | What it covers |
| --- | --- |
| [`overview.md`](overview.md) | Product, actors, the five tabs, the proposal to agreement to chat lifecycle, glossary |
| [`architecture.md`](architecture.md) | System shape, repository tree, data flow, auth, cross-cutting rules |
| [`frontend.md`](frontend.md) | Frontend conventions: stack, naming, states, hooks, theme, validation |
| [`ux.md`](ux.md) | UX rules: definitions, six principles, the ten Nielsen heuristics, dark patterns, usability measurement, design process, usability test protocol, review checklist |
| [`accessibility.md`](accessibility.md) | Accessibility rules: normative frame, POUR, the WCAG AA criteria that bind the app, assistive technology pass, content rules, verification procedure, non-web documents, checklist |
| [`api.md`](api.md) | Endpoints that exist today, with request and response shapes |
| [`backend-gaps.md`](backend-gaps.md) | The endpoints the frontend needs and the backend does not have yet |
| [`database.md`](database.md) | MySQL schema (the demo dump): tables, what they encode, known gaps |
| [`setup.md`](setup.md) | Local environment: Docker Desktop stack, Expo, environment variables |
| [`ui-triage.md`](ui-triage.md) | Open UI symptom inventory: what is verified from source, what still needs a rendered capture |
| [`decisions.md`](decisions.md) | Decision log (ADR-light) |
| [`changelog.md`](changelog.md) | Session-by-session history, newest first |

## Reading order

- New to the project: `overview.md` then `architecture.md` then `setup.md`.
- Building a screen: `ux.md` and `accessibility.md` first (they are
  normative), then `frontend.md` for conventions, `api.md` for the data,
  `backend-gaps.md` to know what cannot be built yet.
- Reviewing or testing a UI: `ux.md` checklist plus `accessibility.md` checklist.
- Backend topics: `database.md`, then the canonical sources in
  `Context_and_DB_V2/` (`LAST_DB_TO_USE.txt`, `API docs/`).

## Sources of truth

| Topic | Canonical source |
| --- | --- |
| Schema | the dump named in `Context_and_DB_V2/LAST_DB_TO_USE.txt` |
| Backend behaviour | `Backend/src/Controller/**` and `Backend/tests/**` |
| Functional requirements | `Context_and_DB_V2/new_user_stories_v2.md` |
| UX and usability rules | `docs/ux.md` |
| Accessibility rules | `docs/accessibility.md` |
| Previous chain/token material | `Archive/` — rollback only, never a reference |

`Archive/` holds decisions that were reversed (swipe feed, chain exchanges,
compensation tokens). It exists so the team can go back if needed; nothing in
it describes the current product.

## Ownership and updates

`docs/` is maintained by the frontend side (Andrea Cestelli and the AI agents
he works with) but must be written with the precision of someone who also owns
the backend topics. The workflow rules binding humans and agents are in the
root [`AGENTS.md`](../AGENTS.md). Every session that changes code or
configuration updates the affected documents and prepends a `changelog.md`
entry, in the same commit as the change.
