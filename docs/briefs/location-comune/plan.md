# Plan — location as Provincia + Comune, credits verdict, registration redirect

Contract: [`plan-brief.md`](plan-brief.md). Style: `full`.
Branch: `andrea-frontend` (tree clean, `HEAD == origin/andrea-frontend`, 0 behind
`origin/main`). One state field only: `Stato:`.

Scope: 28 files (5 new, 1 deleted). Class **L** because the rename spans 13
importers; the work is therefore `single`, not lanes.

## Steps

- 1. Add the location data and the pure module, without touching the old one | files: Frontend/src/services/data/province-comuni.json,Frontend/src/services/italian-locations.js,Frontend/src/services/__tests__/italian-locations.test.js | done: `npx jest services/__tests__/italian-locations.test.js` green; module exports `PROVINCE`, `comuniPerProvincia`, `formattaLocalita`, `analizzaLocalita`, `localitaPerDisplay`; `formattaLocalita('Roma','Roma') === 'Roma - Roma'`; `analizzaLocalita('Milano (Lombardia)') === null` | Stato: DONE — `f13d727`, 20 tests, 100% coverage on the module
- 2. Mechanical sweep: the model (`provincia` + `comune`) and every importer, then delete the old module | files: Frontend/src/services/offer-request.js,Frontend/src/api/areas/services.js,Frontend/src/hooks/useServiceCatalog.js,Frontend/src/app/(auth)/register.jsx,Frontend/src/app/edit-profile.jsx,Frontend/src/app/(tabs)/offer-and-request.jsx,Frontend/src/app/(tabs)/index.jsx,Frontend/src/app/(tabs)/profile.jsx,Frontend/src/components/EntryForm.jsx,Frontend/src/components/EntryCard.jsx,Frontend/src/components/FilterBar.jsx,Frontend/src/components/DeletedServicesSection.jsx,Frontend/src/components/QueueCard.jsx,Frontend/src/components/ServiceCard.jsx,Frontend/src/components/ServiceDetailModal.jsx,Frontend/src/services/italian-regions.js (delete) | done: `grep -rn "regione\|italian-regions" Frontend/src --include=*.js --include=*.jsx` is empty; form voce and filter state are `{provincia, comune}`; cascade provincia→comune in every pair; lint+tsc+jest green; one commit | Stato: DONE — `4d0a0a4`, 15 importers plus the deletion, gate green
- 3. Surface copy and validation for register and edit-profile on the new pair | files: Frontend/src/app/(auth)/register.jsx,Frontend/src/app/edit-profile.jsx | done: register requires `provincia` and `comune` («Seleziona il comune.»), edit-profile pre-fills only from a parseable `Comune - Provincia` value and keeps «Valore attuale: …» for legacy text; gate green | Stato: DONE — landed inside `4d0a0a4` (the sweep touched the same two files); grep confirms no stale `regione` key and both new sentences exist
- 4. Fix the registration redirect: one navigation owner, as in login | files: Frontend/src/app/(auth)/register.jsx | done: after `signUp` the screen calls `router.replace('/')`, the stale comment is gone, and on the web build a submit lands on `/` with no registration form and no menu over it | Stato: DONE — `7ef4613`; measured on the web build: URL `/`, title Servizi, zero «Crea il tuo profilo» headings after submit
- 5. Credits: verdict plus the one wrong sentence | files: Frontend/src/app/(tabs)/match.jsx,Frontend/src/components/QueueCard.jsx,docs/api.md | done: cancelling a `REQUEST` queue with `agreementId === null` says the credit returned; an `OFFER` one and a queue born into an agreement do not claim it; `docs/api.md` lists the four credit paths with their frontend counterpart and keeps G15 as a gap | Stato: DONE — `67a3dde`; the refund sentence was read in the live cancel dialog
- 6. Rebuild the local volume on the reference schema and fill it **through the app** | files: none (data only) | done: after `docker compose down -v` + `up -d` on `barattolo_15112026.sql`, six accounts are registered from the web build with Provincia → Comune (password `demo1234`, at least 8 characters), each registration carrying its one offer and one request, one of them left with exactly one service per type; then entries are added from «Offro e cerco» and one `REQUEST` queue is created on that account; every `users.location` and `services.location` matches `% - %` and each fresh account is at `credits = 1` (0 on the one that spent it) | Stato: DONE with one clause impossible by design — the product rule allows one offer and one request per person, so there is no second entry to add; measured: 6 accounts, 12 services, 1 OPEN queue, credits 0/1
- 7. Dump the populated database back into the seed and prove it reproduces | files: Backend/docker/seed-demo.sql | done: `mysqldump --no-create-info --complete-insert --skip-extended-insert` of `categories`, `users`, `services`, `service_categories`, `service_queues` with the provenance header rewritten; `down -v` + `up -d` reconstructs the same row counts, the same locations in `Comune - Provincia` and the same credits; the app reads the rows back (home list, filter by province, match tab, profile, edit-profile prefill) | Stato: DONE — `7ac047b`; rebuilt from the file and compared: 50/6/12/12/1 rows, 0 locations outside the format
- 8. Every frontend defect the run exposes, one commit each | files: declared by the run (if it exposes none: `Stato: N/A`) | done: each finding is reproduced by the run, fixed, and re-run green on the same flow | Stato: N/A — the run exposed no frontend defect; what it did expose is the missing test for the location shapes, committed as `8bb479a` (`services/__tests__/offer-request-location.test.js`, 12 tests)
- 9. Documentation: contract, schema note, gaps, decision, changelog | files: docs/api.md,docs/database.md,docs/backend-gaps.md,docs/decisions.md,docs/setup.md,docs/changelog.md | done: the composed string and its exact-match consequence are stated once per document; the seed section names the new provenance, the six accounts and the password; G11 names the new format; a decision entry records `Comune - Provincia`; the changelog entry carries the file counts and the seed note | Stato: DONE — `35e9d14`
- 10. Gate and review on the final tree | files: none | done: lint+tsc+jest green; two fresh-context reviews (correctness; data and security) with P0/P1/P2 findings and a Merge verdict | Stato: TODO

## Lanes

`single` — a rename across 13 importers plus one shared model module: the
contract forbids renames and diffuse refactors in lanes, and every lane would
import the same changed modules. The population run (steps 6-7) is sequential by
nature (one database, one volume) and owns no source file, so it cannot collide
with the sweep. Shared files the parent owns and commits first:
`Frontend/src/services/italian-locations.js`,
`Frontend/src/services/offer-request.js`.

Children: 2 (1 worker only if step 8 actually triggers a fix in a file the
parent is not editing, 1 reviewer at the end). Stops: 1 (this plan).
