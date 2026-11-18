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
   `WorkflowControllerTest`. Exact commands in step 8.
6. Frontend gate: `npx expo lint`, `npx tsc --noEmit`, `npx jest`.
7. First executable block: step 1.

## Steps

- 0. Commit this contract and this plan on `andrea-frontend`. | files: docs/briefs/agreements-workflow/plan-brief.md,docs/briefs/agreements-workflow/plan.md | done: commit exists and `git status --porcelain` is clean | Stato: DONE
- 1. Apply the merged workflow migration to the running stack: `cd Backend && docker compose restart backend`, then check `docker compose logs --tail=20 backend` for `upgrade-workflows.php` and `curl -s localhost:8000/api/categories`. | files: none | done: `service_active_slot_unique` and `agreement_proposal.service_id` exist in `barattolo`, categories answer 200 | Stato: TODO
- 2. Shared frontend contracts, parent-owned: `normalizeAgreementSheet` gains `note`, `tipoServizio`, `inviataIl` (and keeps `inizio`/`fine`); profile normaliser drops `puoAccodareRicerca`; `api/index.js` exports follow the new/removed functions. | files: Frontend/src/api/normalizers.js,Frontend/src/api/index.js | done: `npx jest` green, `npx tsc --noEmit` clean | Stato: TODO
- 3. Lane A — backend agreements: reciprocal proposal auto-accepts (reuse the pending agreement instead of creating a second one), sheet rewrite (auto `start_date` from the acceptance moment, `notes`, `end_date` written at confirmation, first-sender 409, `serviceType` in the payload), the completion notification with the details at confirmation, migration for `agreement_details.notes`, agreement tests. | files: Backend/src/Manager/AgreementManager.php,Backend/src/Entity/AgreementDetails.php,Backend/src/Controller/AgreementController.php,Backend/migrations/Version20261119000100.php,Backend/tests/Functional/AgreementControllerTest.php,Backend/tests/Functional/ReciprocalProposalTest.php | done: agreement + reciprocal tests green on SQLite, the migration applies on a copy of the reference schema, confirming a sheet writes `end_date` and one `AGREEMENT_COMPLETED` per participant | Stato: TODO
- 4. Lane B — backend services and queues: remove `QueueEligibility` (a request queue needs one credit only), registration requires exactly one offer **and** one request, owner-side delete and suspend refused (409, staff restore untouched), `GET /profile` drops `canRequestQueue`. | files: Backend/src/Manager/ServiceQueueManager.php,Backend/src/Service/QueueEligibility.php,Backend/src/Controller/ProfileController.php,Backend/src/Controller/OfferController.php,Backend/src/Controller/RequestController.php,Backend/src/Controller/AuthController.php,Backend/tests/Functional/WorkflowControllerTest.php,Backend/tests/Functional/AuthControllerTest.php | done: queue/credit/registration tests green on SQLite and the MySQL workflow filter supports a request queue on one credit with no prior delivery | Stato: TODO
- 5. Lane C — frontend agreements and chat: card keeps only "Apri chat" and "Annulla scambio"; the sheet becomes a modal opened from the chat ("Crea accordo" / "Accordo") showing `inizio` and `fine` read-only as `GG/MM/AAAA HH:MM` (hidden fields, `—` until `fine` is written), the sender's published services read-only, and one `descrizione` text field; the recipient only accepts or refuses; the agreements screen drops the sheet callbacks. | files: Frontend/src/app/(tabs)/agreements.jsx,Frontend/src/components/AgreementCard.jsx,Frontend/src/components/AgreementSheet.jsx,Frontend/src/components/AgreementFormModal.jsx,Frontend/src/app/chat/[agreementId].jsx,Frontend/src/services/agreements.js,Frontend/src/api/areas/agreements.js,Frontend/src/services/__tests__/agreements.test.js,Frontend/src/api/__tests__/agreements.test.js,Frontend/src/components/__tests__/AgreementCard.test.js,Frontend/src/components/__tests__/AgreementSheet.test.js,Frontend/src/components/__tests__/AgreementFormModal.test.js | done: jest suites of the touched files green, lint and tsc clean | Stato: TODO
- 6. Lane D — frontend services, queues, registration: "Offro e cerco" loses suspend, delete and the "Eliminati" section (two entries always present, edit only), `match` has one create action typed by the owner's service and no eligibility gate, registration requires one offer and one request, owner-side service API exports removed. | files: Frontend/src/app/(tabs)/offer-and-request.jsx,Frontend/src/components/PublicationsSection.jsx,Frontend/src/components/DeletedServicesSection.jsx,Frontend/src/services/offer-request.js,Frontend/src/api/areas/services.js,Frontend/src/app/(tabs)/match.jsx,Frontend/src/services/queues.js,Frontend/src/app/(auth)/register.jsx,Frontend/src/app/(tabs)/__tests__/match.test.js,Frontend/src/services/__tests__/offer-request.test.js,Frontend/src/services/__tests__/queues.test.js | done: jest, lint and tsc green; no screen imports a removed function; the registration rule is a pure function with its own test | Stato: TODO
- 7. Docs, parent-owned: `api.md` (sheet contract, queue eligibility gone, service limits), `backend-gaps.md` (what the correction changed), `decisions.md` D028 superseding the D027 rules it replaces, `overview.md` (lifecycle + tab states), `changelog.md` (session entry + backend-derogation notice), `setup.md` (backend gate commands). | files: docs/api.md,docs/backend-gaps.md,docs/decisions.md,docs/overview.md,docs/changelog.md,docs/setup.md | done: every changed contract in the code appears in the docs, no stale D027 sentence left | Stato: TODO
- 8. Integration, parent-owned: restart the backend so the new migration applies, then run all gates — `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest`; `cd Backend && docker compose exec -T -e APP_ENV=test -e 'DATABASE_URL=sqlite:////tmp/barattolo-test.db' backend php bin/phpunit -c phpunit.dist.xml --no-coverage` (only the 6 `ReportControllerTest` database errors are expected); `docker compose exec -T -e APP_ENV=test -e 'DATABASE_URL=mysql://root:root@database:3306/workflow_checks?serverVersion=8.0&charset=utf8mb4' backend php bin/phpunit -c phpunit.dist.xml --filter 'WorkflowControllerTest'`; curl smoke on a reciprocal proposal, on a sheet send/accept (including the completion notification) and on a registration without both entries. | files: none | done: all four gates green, the three smoke cases answer as specified | Stato: TODO
- 9. Review at fresh context, three angles and one model per angle (correctness `deepseek-v4.1-flash`, security/data `deepseek-v4.1-flash`, brief coherence `glm-5.3-flash`); apply only accepted P0/P1. | files: none | done: verdicts returned and every accepted finding fixed by a resumed child | Stato: TODO
- 10. Push `andrea-frontend` (never `main`), clean tree, gates green. | files: none | done: `git push origin andrea-frontend` succeeds and `git rev-list --count origin/andrea-frontend..HEAD` is 0 | Stato: TODO

## Contracts the lanes must obey (fixed here, not renegotiable by a child)

Sheet on the wire (`GET /get-agreements` → `agreementDetails[]`): existing keys
plus `serviceType: "OFFER"|"REQUEST"`, `notes: string|null`, `sentAt: string|null`.
`startDate` is written by the backend from the agreement's acceptance moment and
is never sent by the client; `endDate` stays null until the recipient confirms,
and `accept-agreement-details/{id}` writes it with the confirmation timestamp and
notifies both participants with `AGREEMENT_COMPLETED` carrying
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
  `Backend/tests/Functional/AgreementControllerTest.php`,
  `Backend/tests/Functional/ReciprocalProposalTest.php` (new).
- **lane-b-backend-services**: `Backend/src/Manager/ServiceQueueManager.php`,
  `Backend/src/Service/QueueEligibility.php` (delete),
  `Backend/src/Controller/ProfileController.php`,
  `Backend/src/Controller/OfferController.php`,
  `Backend/src/Controller/RequestController.php`,
  `Backend/src/Controller/AuthController.php`,
  `Backend/tests/Functional/WorkflowControllerTest.php`,
  `Backend/tests/Functional/AuthControllerTest.php`.
- **lane-c-frontend-agreements**: `Frontend/src/app/(tabs)/agreements.jsx`,
  `Frontend/src/components/AgreementCard.jsx`,
  `Frontend/src/components/AgreementSheet.jsx`,
  `Frontend/src/components/AgreementFormModal.jsx` (new),
  `Frontend/src/app/chat/[agreementId].jsx`,
  `Frontend/src/services/agreements.js`,
  `Frontend/src/api/areas/agreements.js`,
  `Frontend/src/services/__tests__/agreements.test.js`,
  `Frontend/src/api/__tests__/agreements.test.js`,
  `Frontend/src/components/__tests__/AgreementCard.test.js`,
  `Frontend/src/components/__tests__/AgreementSheet.test.js`,
  `Frontend/src/components/__tests__/AgreementFormModal.test.js` (new).
- **lane-d-frontend-services**: `Frontend/src/app/(tabs)/offer-and-request.jsx`,
  `Frontend/src/components/PublicationsSection.jsx`,
  `Frontend/src/components/DeletedServicesSection.jsx` (delete),
  `Frontend/src/services/offer-request.js`,
  `Frontend/src/api/areas/services.js`,
  `Frontend/src/app/(tabs)/match.jsx`,
  `Frontend/src/services/queues.js`,
  `Frontend/src/app/(auth)/register.jsx`,
  `Frontend/src/app/(tabs)/__tests__/match.test.js`,
  `Frontend/src/services/__tests__/offer-request.test.js`,
  `Frontend/src/services/__tests__/queues.test.js`.
- **shared, parent-owned before the lanes**: `Frontend/src/api/normalizers.js`,
  `Frontend/src/api/index.js`, `docs/*`.
