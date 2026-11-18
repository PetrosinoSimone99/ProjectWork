# Plan — agreements workflow corrections

Contract: `plan-brief.md` (same directory). `Stile: full`.

## How to resume

1. `git status --porcelain` — modified files are the block in progress; continue
   from there, never restart it.
2. `grep '| Stato: TODO' docs/briefs/agreements-workflow/plan.md` (with the pipe)
   and take the first step whose condition is true (`N/A` is not work).
3. Environment: no PHP on the host. Backend runs in Docker
   (`Backend/compose.yaml`); frontend on the host.
4. The running DB may lag the merged code: `upgrade-workflows.php` runs at
   container start. `docker compose restart backend` applies it and takes ~60 s
   (healthcheck). Never `down -v` on a populated volume.
5. Backend gate is two runs (the two test families want different databases):
   SQLite for almost everything, MySQL `barattolo_test` for
   `ReportControllerTest`, MySQL `workflow_checks_test` for
   `WorkflowControllerTest`. Exact commands in step 8. **The gate runs alone**:
   two concurrent phpunit runs share the SQLite file and drop each other's
   tables. A child uses its own path (`/tmp/barattolo-<lane>.db`).
6. Frontend gate: `npx expo lint`, `npx tsc --noEmit`, `npx jest`.
7. First executable block: the first `| Stato: TODO` above.
8. Since 2026-11-19 the app also carries a server-sent-events stream (backend
   `StreamController`/`NotificationEventStream`, frontend `api/stream.js` and
   the root layout): the chat and the agreements now reload on a stream frame
   as well as on focus, so re-check that the sheet flow still behaves after
   any pull of new commits.
9. Browser verification needs MS Edge (`--browser msedge` in the Playwright
   MCP config): the default Chromium channel is not installed on this machine.

## Steps

- 0. Commit this contract and this plan on `andrea-frontend`. | files: docs/briefs/agreements-workflow/plan-brief.md,docs/briefs/agreements-workflow/plan.md | done: commit exists and `git status --porcelain` is clean | Stato: DONE
- 1. Apply the merged workflow migration to the running stack: `cd Backend && docker compose restart backend`, then check `docker compose logs --tail=20 backend` for `upgrade-workflows.php` and `curl -s localhost:8000/api/categories`. | files: none | done: `service_active_slot_unique` and `agreement_proposal.service_id` exist in `barattolo`, categories answer 200 | Stato: DONE
- 2. Shared frontend contract, parent-owned: `normalizeAgreementSheet` gains `note`, `tipoServizio`, `inviataIl` (and keeps `inizio`/`fine`); profile normaliser drops `puoAccodareRicerca`. `api/index.js` is pruned in step 8, when the lanes have removed the owner-side service functions it re-exports. | files: Frontend/src/api/normalizers.js | done: `npx jest src/api` green (80 tests) and no consumer reads `puoAccodareRicerca` after step 6 | Stato: DONE
- 3. Lane A — backend agreements: reciprocal proposal auto-accepts (reuse the pending agreement instead of creating a second one), sheet rewrite (auto `start_date` from the acceptance moment, `notes`, `end_date` written at confirmation, first-sender 409, `serviceType` in the payload), the confirmation completing the agreement and notifying both, migration for `agreement_details.notes`/`sent_at`, SQLite fixture columns, agreement tests. | files: Backend/src/Manager/AgreementManager.php,Backend/src/Entity/AgreementDetails.php,Backend/src/Controller/AgreementController.php,Backend/migrations/Version20261119000100.php,Backend/tests/Support/ReferenceDatabaseSchema.php,Backend/tests/Functional/AgreementControllerTest.php,Backend/tests/Functional/ReciprocalProposalTest.php | done: agreement + reciprocal tests green on SQLite, the migration applies on a copy of the reference schema, confirming a sheet writes `end_date`, sets the agreement to COMPLETED and writes one `AGREEMENT_COMPLETED` per participant with the details | Stato: DONE
- 4. Lane B — backend services and queues: remove `QueueEligibility` (a request queue needs one credit only), registration requires exactly one offer **and** one request, owner-side delete and suspend refused (409, staff restore untouched), `GET /profile` drops `canRequestQueue`. | files: Backend/src/Manager/ServiceQueueManager.php,Backend/src/Service/QueueEligibility.php,Backend/src/Controller/ProfileController.php,Backend/src/Controller/OfferController.php,Backend/src/Controller/RequestController.php,Backend/src/Controller/AuthController.php,Backend/tests/Functional/WorkflowControllerTest.php,Backend/tests/Functional/AuthControllerTest.php,Backend/tests/Functional/DeletedServiceControllerTest.php,Backend/tests/Functional/RequestControllerTest.php,Backend/tests/Functional/MarketplaceControllerTest.php,Backend/tests/Functional/RetainedApiTest.php | done: queue/credit/registration tests green on SQLite and the MySQL workflow filter supports a request queue on one credit with no prior delivery | Stato: DONE
- 5. Lane C — frontend agreements and chat: card keeps only "Apri chat" and "Annulla scambio"; the sheet becomes a modal opened from the chat ("Crea accordo" / "Accordo") showing `inizio` and `fine` read-only as `GG/MM/AAAA HH:MM` (hidden fields, `—` until `fine` is written), the sender's published services read-only, and one `descrizione` text field; the recipient only accepts or refuses; the agreements screen drops the sheet callbacks. | files: Frontend/src/app/(tabs)/agreements.jsx,Frontend/src/components/AgreementCard.jsx,Frontend/src/components/AgreementSheet.jsx,Frontend/src/components/AgreementFormModal.jsx,Frontend/src/app/chat/[agreementId].jsx,Frontend/src/services/agreements.js,Frontend/src/services/dates.js,Frontend/src/api/areas/agreements.js,Frontend/src/services/__tests__/agreements.test.js,Frontend/src/services/__tests__/dates.test.js,Frontend/src/api/__tests__/agreements.test.js,Frontend/src/components/__tests__/AgreementCard.test.js,Frontend/src/components/__tests__/AgreementSheet.test.js,Frontend/src/components/__tests__/AgreementFormModal.test.js | done: jest suites of the touched files green, lint and tsc clean | Stato: DONE
- 6. Lane D — frontend services, queues, registration: "Offro e cerco" loses suspend, delete and the "Eliminati" section (two entries always present, edit only), `match` keeps two create actions (one per type, each typed by the owner's service, which now always exists) and drops only the count/eligibility gates, registration requires one offer and one request, owner-side service API exports removed. | files: Frontend/src/app/(tabs)/offer-and-request.jsx,Frontend/src/components/PublicationsSection.jsx,Frontend/src/components/EntryCard.jsx,Frontend/src/components/DeletedServicesSection.jsx,Frontend/src/services/offer-request.js,Frontend/src/api/areas/services.js,Frontend/src/app/(tabs)/match.jsx,Frontend/src/services/queues.js,Frontend/src/app/(auth)/register.jsx,Frontend/src/app/(tabs)/__tests__/match.test.js,Frontend/src/components/__tests__/EntryCard.test.js,Frontend/src/services/__tests__/offer-request.test.js,Frontend/src/services/__tests__/queues.test.js | done: jest, lint and tsc green; no screen imports a removed function; the registration rule is a pure function with its own test | Stato: DONE
- 7. Docs, parent-owned: `api.md` (sheet contract, queue eligibility gone, service limits), `backend-gaps.md` (what the correction changed), `decisions.md` D028 superseding the D027 rules it replaces, `overview.md` (lifecycle + tab states), `changelog.md` (session entry + backend-derogation notice), `setup.md` (backend gate commands). | files: docs/api.md,docs/backend-gaps.md,docs/decisions.md,docs/overview.md,docs/changelog.md,docs/setup.md | done: every changed contract in the code appears in the docs, no stale D027 sentence left | Stato: DONE
- 8. Integration, parent-owned: restart the backend so the new migration applies, make `blankDetails` write `start_date` when the rows are created (so the sheet shows Inizio before it is sent, not only after), rewrite the two sheet blocks of `Backend/tests/Functional/WorkflowControllerTest.php` to `{agreementId, notes}` (dropping the endDate-before-startDate assertion), then run all gates — `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest`; `cd Backend && docker compose exec -T -e APP_ENV=test -e 'DATABASE_URL=sqlite:////tmp/barattolo-test.db' backend php bin/phpunit -c phpunit.dist.xml --no-coverage` (only the 6 `ReportControllerTest` database errors are expected); `docker compose exec -T -e APP_ENV=test -e 'DATABASE_URL=mysql://root:root@database:3306/workflow_checks?serverVersion=8.0&charset=utf8mb4' backend php bin/phpunit -c phpunit.dist.xml --filter 'WorkflowControllerTest'`; curl smoke on a reciprocal proposal, on a sheet send/accept (including the completion notification) and on a registration without both entries. | files: none | done: all four gates green, the three smoke cases answer as specified | Stato: DONE
- 9. Review at fresh context, three angles and one model per angle (correctness `deepseek-v4.1-flash`, security/data `deepseek-v4.1-flash`, brief coherence `glm-5.3-flash`); apply only accepted P0/P1. | files: none | done: verdicts returned and every accepted finding fixed by a resumed child | Stato: DONE
- 10. Push `andrea-frontend` (never `main`), clean tree, gates green. | files: none | done: `git push origin andrea-frontend` succeeds and `git rev-list --count origin/andrea-frontend..HEAD` is 0 | Stato: DONE
- 11. End-to-end check in a real browser (MS Edge through the Playwright MCP; Chrome is not installed there), on the app served by the Expo dev server on port 8081: two accounts propose to each other (expect the "proposta accettata" banner), the sheet is written from the chat, confirmed by the other side, and the chat must end up read-only with "Torna agli accordi" and no navigation error. Then re-run the four gates with the SSE work on top. | files: none | done: the crossed proposal auto-accepts, the sheet send/confirm completes the exchange, the concluded chat keeps its history and offers the way back, and all four gates are green | Stato: DONE — Edge on 8081, sara.mancini ⇄ luca.ferrari: the second proposal auto-accepted (banner «Proposta accettata»), the In corso card with the two actions only, the sheet written from the chat as `18/11/2026 22:57` / `—` with one Descrizione, confirmed by the other side and the exchange closed on «Accordo concluso il 18/11/2026 23:00» with «Torna agli accordi», zero console errors, history readable after a reload and on an older concluded chat; gates 42/480 + lint + tsc, SQLite 126/1565 with the six expected errors, MySQL reports 6/6, MySQL workflow 8/8. The browser found two gaps the tests could not: no entry point into a concluded chat and a duplicated line on it, both fixed (`decisions.md` D030)

## Contracts the lanes must obey (fixed here, not renegotiable by a child)

Sheet on the wire (`GET /get-agreements` → `agreementDetails[]`): existing keys
plus `serviceType: "OFFER"|"REQUEST"`, `notes: string|null`, `sentAt: string|null`.
`startDate` is written by the backend from the agreement's acceptance moment and
is never sent by the client; `endDate` stays null until the recipient confirms.
`accept-agreement-details/{id}` is what ends the exchange: it writes
`end_date = now`, `beneficiary_accepted`, `is_completed` on the confirmed row and
moves the agreement to `COMPLETED` (the confirmed sheet **is** the delivery; the
other row stays UNCOMPILED, so the scheduler's "all sheets compiled" guard would
never close an exchange agreement), performs the provider credit and the queue
closing when `from_queue` is true, and notifies both participants with
`AGREEMENT_COMPLETED` carrying
`{agreementId, serviceDescription, startDate, endDate, otherUsername}`.
`send-agreement-details` accepts `{agreementId, notes}` only (`notes` required,
1..500 chars) and answers 409 when the other participant's row of the same
agreement is already `COMPILED` — the first sender locks the round.
`fromRemote` is no longer sent: it is copied from the sender's own service when
the sheet is written.

Normalised sheet (`api/normalizers.js`) keeps `descrizione` = the service text and
adds `note` = the free text (label "Descrizione" on screen), `tipoServizio`,
`inviataIl`. The two words are not interchangeable and nothing renames them.

`POST /auth/register` requires exactly one `offers` item **and** exactly one
`requests` item; anything else is a 400 with a field message.

`AgreementEndDateChecker` is not touched unless it scans beyond ACCEPTED: an
agreement completed at confirmation is already `COMPLETED`, so it cannot be
notified twice. If it does scan further, the only allowed change is `if
($detail->getIsCompleted()) { continue; }` before its notification.

`POST /create-exchange-agreement`: when a PENDING agreement already exists with
the caller as beneficiary and the same two services, the backend accepts that
agreement (both proposals `response = true`, status `ACCEPTED`, sheets created)
and returns 201 with `{autoAccepted: true}`; the duplicate-pair 409 applies only
to a second proposal for the same pair after that.

Owner-side services: `DELETE` and status-only `PATCH` (`isSuspended`) are 409 —
modification stays open, staff restore stays open. `POST /create-service-queue`
for `REQUEST` requires one credit and nothing else.

## Lanes

- **lane-a-backend-agreements**: `Backend/src/Manager/AgreementManager.php`,
  `Backend/src/Entity/AgreementDetails.php`,
  `Backend/src/Controller/AgreementController.php`,
  `Backend/migrations/Version20261119000100.php` (new),
  `Backend/tests/Support/ReferenceDatabaseSchema.php`,
  `Backend/tests/Functional/AgreementControllerTest.php`,
  `Backend/tests/Functional/ReciprocalProposalTest.php` (new).
- **lane-b-backend-services**: `Backend/src/Manager/ServiceQueueManager.php`,
  `Backend/src/Service/QueueEligibility.php` (delete),
  `Backend/src/Controller/ProfileController.php`,
  `Backend/src/Controller/OfferController.php`,
  `Backend/src/Controller/RequestController.php`,
  `Backend/src/Controller/AuthController.php`,
  `Backend/tests/Functional/WorkflowControllerTest.php`,
  `Backend/tests/Functional/AuthControllerTest.php`,
  `Backend/tests/Functional/DeletedServiceControllerTest.php`,
  `Backend/tests/Functional/RequestControllerTest.php`,
  `Backend/tests/Functional/MarketplaceControllerTest.php`,
  `Backend/tests/Functional/RetainedApiTest.php`.
- **lane-c-frontend-agreements**: `Frontend/src/app/(tabs)/agreements.jsx`,
  `Frontend/src/components/AgreementCard.jsx`,
  `Frontend/src/components/AgreementSheet.jsx`,
  `Frontend/src/components/AgreementFormModal.jsx` (new),
  `Frontend/src/app/chat/[agreementId].jsx`,
  `Frontend/src/services/agreements.js`, `Frontend/src/services/dates.js`
  (`formatIsoDateTimeNumeric`), `Frontend/src/api/areas/agreements.js`,
  `Frontend/src/services/__tests__/agreements.test.js`,
  `Frontend/src/services/__tests__/dates.test.js`,
  `Frontend/src/api/__tests__/agreements.test.js`,
  `Frontend/src/components/__tests__/AgreementCard.test.js`,
  `Frontend/src/components/__tests__/AgreementSheet.test.js`,
  `Frontend/src/components/__tests__/AgreementFormModal.test.js` (new).
- **lane-d-frontend-services**: `Frontend/src/app/(tabs)/offer-and-request.jsx`,
  `Frontend/src/components/PublicationsSection.jsx`,
  `Frontend/src/components/EntryCard.jsx` (the suspend/delete buttons live here),
  `Frontend/src/components/DeletedServicesSection.jsx` (delete),
  `Frontend/src/services/offer-request.js`,
  `Frontend/src/api/areas/services.js`,
  `Frontend/src/app/(tabs)/match.jsx`,
  `Frontend/src/services/queues.js`,
  `Frontend/src/app/(auth)/register.jsx`,
  `Frontend/src/app/(tabs)/__tests__/match.test.js`,
  `Frontend/src/components/__tests__/EntryCard.test.js`,
  `Frontend/src/services/__tests__/offer-request.test.js`,
  `Frontend/src/services/__tests__/queues.test.js`.
- **shared, parent-owned before the lanes**: `Frontend/src/api/normalizers.js`
  (step 2); `Frontend/src/api/index.js` and `docs/*` at integration (step 7, 8).
