# Brief — location becomes Provincia + Comune, credits verdict, registration redirect

Class: **L** · Style: `full` · Date: 2026-11-16 · Branch: `andrea-frontend`
(clean tree, `HEAD == origin/andrea-frontend`, 0 behind `origin/main`).

## Objective

1. The frontend forgets **regione**. Everywhere a region and a province were
   picked, it now picks a **province then a comune**, composed into one string
   that the backend stores as-is (`users.location`, `services.location`,
   `service_queues.location` are `varchar`, no separate columns).
2. Verify that the **credits** of the queue/match system in the app are what the
   backend actually implements, state the verdict, and fix the one copy that is
   wrong.
3. Fix the **registration bug**: pressing «Crea account» creates the session but
   the URL stays `/register`, so the screen stays and the home's web menu
   appears on top of it.

## Facts (verified, not assumed)

- Gate at plan time: `npx expo lint` 0, `npx tsc --noEmit` 0, `npx jest` 15
  suites / 188 tests green. No test mentions `regione`/`provincia`, so the
  rename cannot break the suite silently — only the pure modules can be
  uncovered.
- Today's composed format is `Provincia (Regione)`
  (`Frontend/src/services/italian-regions.js:172-177`), consumed by 13 files.
- Queue matching compares `location` with **exact equality**
  (`Backend/src/Repository/ServiceQueueRepository.php:29`; `backend-gaps.md`
  G11): the composed string is contract, not decoration.
- `Context_and_DB_V2/province-comuni.json` (upstream `7408f52`) is
  `provincia -> [comuni]`: 110 keys, 7.894 comuni, largest list 312 (Torino).
  Names differ from the old dataset: `Bolzano/Bozen`, `Reggio nell'Emilia`,
  `Valle d'Aosta/Vallée d'Aoste`, plus the aggregate Sardinian keys.
- The reference dump `barattolo_15112026.sql` has **0 INSERTs** (structure
  only) and is mounted as `10-schema.sql`; the rows come from
  `Backend/docker/seed-demo.sql` (Docker exception, `20-seed.sql`), copied
  verbatim from the archived demo dump: 50 categories, 30 users + `coda.demo`,
  302 services, locations are 10 bare city names (`Roma`, `Milano`, …, also
  province capitals), every user at `credits = 0`.
- `Frontend/src/api/index.js:133-159` already copies the person's `location`
  into every service created at registration (`toServiceBodies(entries,
  location)`), so a registration performed through the app fills the three
  location columns with the same composed string.
- The registration form requires a password of at least 8 characters
  (`Frontend/src/validation/index.js:18`), so accounts created through the UI
  cannot carry the archived `demo` password.
- Credis (backend, verified in code): a new user starts with **1 credit**
  (`Backend/src/Entity/User.php:73`); a `REQUEST` queue spends 1
  (`ServiceQueueManager.php:69-77`); `cancel-queue` refunds a `REQUEST` queue
  with no agreement (`:97-101`); cancelling a queue-born agreement credits +1
  (`AgreementManager.php:187-193`); the end-date scheduler credits +1 when a
  queue-born agreement completes (`AgreementEndDateChecker.php:57-63`). No
  route exposes the balance (`backend-gaps.md` G15).
- `GET /get-queues` never returns `CLOSED` rows
  (`ServiceQueueRepository::getServiceQueuesByUser` filters them): every row the
  app shows is one where `cancel-queue` really acts, so a refund sentence on a
  `REQUEST` row without `agreementId` is always true.
- Registration bug root cause: `Frontend/src/app/(auth)/login.jsx:57-71`
  navigates explicitly because the root `Stack` swapping `(auth)` for `(tabs)`
  does not move the web URL; `Frontend/src/app/(auth)/register.jsx:330` only
  has the comment «la root navigation passa da sola ai tab» and no navigation.

## Decisions closed (lock with Andrea, 2026-11-16)

1. **Composed format is `Comune - Provincia`** (`Roma - Roma`,
   `Sesto San Giovanni - Milano`), separator `" - "`.
2. **The reference dump's structure is kept and we fill it ourselves** with the
   data users would insert **through the frontend**: rebuild the volume on
   `barattolo_15112026.sql`, register the demo accounts from the web build with
   Provincia → Comune, add entries from «Offro e cerco», exercise one `REQUEST`
   queue, then dump that database back into `Backend/docker/seed-demo.sql` and
   rebuild from it. The goal is the measurement: if the app fills the DB
   correctly nothing is invented; every mismatch it exposes becomes a frontend
   fix. The reference dump under `Context_and_DB_V2/` stays read-only (it has no
   rows to fix).
3. **Filters** become Provincia → Comune; a province alone is a valid filter,
   the comune is enabled only after its province.
4. **Mandatory**: the person's location needs both fields (the backend rejects
   an empty `location`); a service/entry location stays optional, but if filled
   needs both.
5. **Credits**: written verdict plus **one** copy fix (a `REQUEST` queue
   cancelled with no agreement says the credit came back). No balance figure:
   no route exposes one.

## Constraints

- `Backend/**` read-only except `Backend/docker/seed-demo.sql` (Docker
  exception, reported in `docs/changelog.md`); `Context_and_DB_V2/**` never
  edited; `Archive/` untouched.
- Gate before push: `npx expo lint`, `npx tsc --noEmit`, `npx jest`.
- Docs updated in the same commit as the code they document.
- No emoji, no Italian identifiers in new code, no hardcoded URLs/secrets.
- One state field per block: `Stato:` (`TODO` / `DONE` / `N/A`).

## Success criteria

- `grep -rn "regione\|italian-regions" Frontend/src --include=*.js --include=*.jsx`
  returns nothing; the app composes and parses `Comune - Provincia`.
- Legacy rows (`Milano (Lombardia)`, `Roma`) are displayed verbatim, never
  guessed, and edit-profile asks for a fresh pick (existing «Valore attuale»).
- `SELECT` on the recreated volume: 0 `users.location` / `services.location`
  rows that do not match `% - %`, and the demo cities still resolve.
- On the web build: submit on `/register` lands on `/` with the home visible and
  no registration form left behind; login unchanged.
- Cancelling a `REQUEST` queue with no agreement says the credit returned;
  cancelling an `OFFER` one does not.
- Two fresh-context reviews (correctness, data/security) with a verdict.

## Exclusions

- No backend change, no new endpoint, no request for a credits endpoint (G15
  stays a documented gap).
- No region-to-province migration table and no rewrite of old rows client-side.
- No virtualised picker for the 312-comune list (ListSelector's `ScrollView` is
  the pattern already in use).
- No change to login.
