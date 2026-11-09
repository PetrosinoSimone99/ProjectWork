# Plan brief — agreements wiring, home relevance, demo DB

Contract of truth for `/plan` and for every child agent. Decisions below are closed;
nothing else is to be invented. Companion artifact: `plan.md` (same folder) holds the
step-by-step derivation; this file wins on any conflict.

## Objective

Align the frontend with the backend the backend team has shipped, and give the local
database the tables it is missing:

1. **Home.** The backend now orders the catalog by relevance (categories of the viewer's
   own requests first, whole catalog sorted before pagination:
   `ServiceRepository::paginateHomepageOffers` / `findDesiredCategoryIds`) and filters
   remote with `isRemote=true|false` (`MarketplaceController::readHomepageFilters`).
   The frontend's own relevance ordering and client-side remote filter become dead code
   and cost one extra request per home open: both are removed.
2. **Agreements tab.** The backend exposes the full lifecycle
   (`get-agreements`, `create-exchange-agreement`, `send-agreement-response`,
   `send-agreement-details`, `cancel-agreement/{id}`) with names and shapes different
   from what the tab assumes. The tab is wired to the real endpoints; the "not available"
   placeholder disappears.
3. **Database.** The local dump predates the agreement tables. `compose.yaml` mounts the
   demo dump (`Context_and_DB_V2/barattolo_demo_20261108.sql`, 12 tables incl.
   `agreements`, `agreement_proposal`, `agreement_details`; 30 seed users, password
   `demo`), which is the file `LAST_DB_TO_USE.txt` names.

## Constraints

- Frontend scope: `Frontend/` and `docs/` writable. `Backend/**` and
  `Context_and_DB_V2/**` read-only, with the one documented exception:
  `Backend/compose.yaml` (Docker runtime, owner Andrea), reported in `docs/changelog.md`
  so the backend maintainer is notified.
- Branch `andrea-frontend`; merge, never rebase; push to `main` never.
- Code, identifiers, file names, docs: English. UI copy: Italian.
- Gate before push: `npx expo lint`, `npx tsc --noEmit`, `npx jest`.
- Explicit UI states everywhere (loading, empty, error). No silently swallowed errors.
  No fake data, no invented counts.
- Docs updated in the same commit as the change they describe; changelog entry per session.
- Data layer: existing hook pattern (loading/error/pagination guards/retry), no new library.

## Closed decisions

| # | Question | Answer |
| --- | --- | --- |
| 1 | New brief for this feature? Commit `docs/briefs/`? | New brief at `docs/briefs/agreements-wiring/plan-brief.md`; `docs/briefs/` is committed. |
| 2 | Switch the local DB to the demo dump, wiping the current volume? | Yes: `compose.yaml` mounts `barattolo_demo_20261108.sql`, `docker compose down -v` + `up`. Local dev data only; reported in `changelog.md`. |
| 3 | Enable "send proposal" in the service popup? | Yes. It sends the **person** (`otherParticipant`), never a service: the agreement is born with that person, the service is named later in the sheet. Duplicates to the same person are possible while the backend only takes a user id (G4): documented, not masked. |
| 4 | "Cancel exchange" on accepted agreements? | Yes: `POST /cancel-agreement/{id}` -> `VOID`, reused `ConfirmModal`, one call. Without it an accepted agreement can never be closed. |
| 5 | Sheet (place, service, dates) from the app? | No form. `send-agreement-details` requires `beneficiaryId` and `AgreementProposalDTO` carries usernames only, so the sheet renders read-only as "scheda non compilata"; the missing id is added to gap G6. No invented ids. |
| 6 | Home ordering | `relevance.js` and its test are deleted, together with the `listMyRequests` call in `useServiceCatalog`. `sort` is not sent: the backend's `newest` plus its implicit relevance priority is the order the page needs (`sort` accepts only `newest`/`oldest`). |
| 7 | Home remote filter | `passaModalita`, `rigaFiltroModalita` and the client-side filter are deleted. The mode selector keeps its three values and maps to `isRemote=true` / `isRemote=false` / absent, one server round-trip per change. |
| 8 | Agreement classification (pure module) | `PENDING` + my `response === null` -> to answer (bell); `PENDING` + my `response === true` -> sent, waiting; `ACCEPTED` with `endDate` in the future -> in progress; `ACCEPTED` expired, `REFUSED`, `VOID` -> concluded. Confirmed by `AgreementManager::createExchangeAgreement` (creator is `Provider` with `response: true`) and `sendResponse` (one answer, final). |
| 9 | Send-proposal feedback | On `201` the popup closes and a banner says the proposal is in Accordi (naming the person). `400`/`404` become Italian messages; no retry loop. |

## Success criteria

- No reference remains to `relevance.js`, `passaModalita`, `rigaFiltroModalita`, or the
  `listMyRequests` call from the catalog hook; opening the home performs one request, not
  two; the "solo tra quelli già caricati" limitation line is gone.
- The mode filter changes the visible list through the server (page 2 and beyond respect
  it), and relevance ordering is visible across pages, not only inside the loaded page.
- The agreements tab, against the real Docker backend: bell count of proposals to answer,
  tick/cross answering in the bell panel, three sections (sent, accepted, concluded) fed
  by `GET /get-agreements`, cancelled agreement shows as concluded.
- A proposal sent from a service popup appears for the other person in their bell; refusing
  it shows the refused state on the sender's side.
- `npx expo lint`, `npx tsc --noEmit`, `npx jest` green; forced diagnostics clean on every
  touched file; manual Playwright web pass over the whole cycle (login, proposal, answer,
  cancel) on port 8000.
- `docs/api.md`, `docs/backend-gaps.md` (G1 and G2 landed: closed without renumbering),
  `docs/database.md`, `docs/setup.md`, `docs/frontend.md`, `docs/decisions.md`,
  `docs/changelog.md` updated.

## Exclusions

- Multi-category home filter (the backend accepts `categoryIds[]`; not requested).
- Filling the agreement sheet from the app (blocked by G6), chat on an agreement (G8),
  notifications/push, match tab algorithm.
- Removal of the client-side drop of the viewer's own rows (the backend already excludes
  them; a redundant guard is not a defect).
- Any staff-screen change, any edit under `Context_and_DB_V2/**` or `Archive/**`.

## Unverified assumptions

None. Every open question was answered in this round.

Style: full
