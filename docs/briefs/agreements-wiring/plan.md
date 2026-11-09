# Plan — agreements wiring, home relevance, demo DB

Approved-by: pending (A/B below are open).
Source: last assistant message of session `01a1c0ad-2e4b-76c8-875d-8b5a0293d941`
(2026-11-09 18:57), extracted verbatim to disk because that session is near its context
limit. This file is the plan for `/exec`; the contract of truth is `plan-brief.md`, which
must be written after A and B are answered.

## What changed since the previous plan

The backend now works end to end on the agreement lifecycle, not read-only (fixes in
commits `8272a32` / `5c436ee` — same patch twice, cherry-pick + merge, identical content).

| Surface | Real state (verified in code + `AgreementControllerTest`) |
| --- | --- |
| `POST /create-exchange-agreement {otherParticipant}` | `201`, creates `PENDING`: caller is `Provider` with `response: true`, the other is `Beneficiary` with `response: null`. `400` on self, `404` unknown user |
| `POST /send-agreement-response {agreementId, response}` | `200` -> `ACCEPTED`/`REFUSED`; `409` if no longer `PENDING` or already answered |
| `POST /send-agreement-details` | now `POST` (was a GET with a body, unreachable from a browser), explicit `serviceId`, sheet `UNCOMPILED` |
| `POST /cancel-agreement/{id}` | `ACCEPTED` -> `VOID` (schema has no `CANCELLED`) |
| `GET /get-agreements` | shape confirmed, now with correct `role` and the sheet `status` |

So the three earlier questions collapse:

1. Accept/Refuse works — it gets wired, nothing to decide.
2. Demo data for the tab is unnecessary — a real agreement is created from the app
   (step 5), so the tab fills with real data. No SQL snippet, no fake rows.
3. "Send proposal" in the service popup can be switched on — the endpoint takes only the
   person (`offerente.id`, already in the catalog), not the service: the agreement is born
   "with that person" and the service is named later in the sheet. That is the blind
   proposal the brief wanted (decision 7). Gap G4 remains (backend should accept `serviceId`
   and answer `409` on duplicates): two proposals to the same person create two agreements.
   It is documented, not masked.
   - The only thing left to decide: `POST /send-agreement-details` is **not usable from the
     frontend**, because it needs `beneficiaryId` and the agreements list carries no user
     ids (only usernames). So the sheet (place, dates) stays out: the UI shows "sheet not
     compiled". That is gap G6, already recorded by the backend team.

## Steps (order inverted: DB first, so the real fixes are verified immediately)

1. **DB** (`Backend/compose.yaml` -> demo dump; `docker compose down -v` + `up`): so the
   endpoints have their tables. Destroys the current local DB (dev data only). 13 tables,
   30 users, password `demo`.
2. **Manual verification** on the real server (port 8000): login `mario.rossi`/`demo` ->
   create agreement with `giulia.bianchi` -> login giulia -> list (must show
   `response: null`) -> accept -> list (must show `ACCEPTED`). If the cycle does not run
   here, stop and report before writing UI.
3. **Home**: remove `relevance.js` + `listMyRequests` (one call less per open),
   `filtriDaQuery` sends `isRemote=true|false`, `cambiaModalita` asks the backend, drop the
   client filter.
4. **Agreements**: `api/areas/agreements.js` (`get-agreements`, `respondToAgreement`,
   `sendExchangeProposal`, `cancelAgreement`), normalizer, pure `services/agreements.js` for
   the classification (`PENDING` + my response `null` -> to answer / `true` -> sent;
   `ACCEPTED` not expired -> in progress; `ACCEPTED` expired, `REFUSED`, `VOID` -> concluded),
   with tests, `useAgreements`, `AgreementCard`, rewrite `agreements.jsx` (bell with the real
   count, tick/cross, three sections).
5. **Send proposal**: in the service popup, enabled; on `201` close the popup and show a
   banner "Proposta inviata a X. La trovi in Accordi." Duplicates possible (G4), not hidden.
6. **Docs**: `api.md` (catalog: `isRemote` and server-side relevance), `backend-gaps.md`
   (G1 and G2 have landed: remove them, keep numbering to avoid breaking cross-references;
   add the G6 detail about the sheet not being compilable from the app), `database.md` /
   `setup.md` (demo dump), `frontend.md`, `decisions.md` (D021), `changelog.md` (session +
   warning to the backend team about `compose.yaml`).
7. **Gate**: `expo lint`, `tsc --noEmit`, `jest` + forced diagnostics on touched files +
   Playwright web pass over the full cycle.

## Open decisions (block the brief)

- **A.** Confirm step 1 (`down -v` on the local DB: wiped and reloaded from the demo dump)?
- **B.** "Cancel exchange" on accepted agreements (`POST /cancel-agreement/{id}` -> `VOID`):
  include it or leave it out? Recommendation: yes — a reused `ConfirmModal` plus one call,
  and without it an accepted agreement can never be closed.

## Lanes

- **A — catalog**: `Frontend/src/hooks/useServiceCatalog.js`,
  `Frontend/src/services/offer-request.js`, `Frontend/src/app/(tabs)/index.jsx`,
  `Frontend/src/api/areas/services.js`, delete `Frontend/src/services/relevance.js` + test
- **B — agreements**: `Frontend/src/api/areas/agreements.js` (new),
  `Frontend/src/services/agreements.js` (new) + test,
  `Frontend/src/hooks/useAgreements.js` (new),
  `Frontend/src/components/AgreementCard.jsx` (new),
  `Frontend/src/app/(tabs)/agreements.jsx`,
  `Frontend/src/components/ServiceDetailModal.jsx`,
  `Frontend/src/api/normalizers.js`
- **C — environment**: `Backend/compose.yaml`, `docs/setup.md`, `docs/database.md`
- **shared**: `Frontend/src/api/index.js` (A+B), `Frontend/package.json` (A), `docs/api.md`,
  `docs/backend-gaps.md`, `docs/frontend.md`, `docs/decisions.md`, `docs/changelog.md`

A and B share `api/index.js` -> execution mode **single**.
