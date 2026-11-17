# Database

Engine: **MySQL 8.0, utf8mb4** (deliberate, see decisions D004). The backend
connects through `DATABASE_URL` (Doctrine DBAL) with `serverVersion=8.0`.

## Which file is the schema

The authoritative dump is the file named in
`Context_and_DB_V2/LAST_DB_TO_USE.txt` — today `barattolo_15112026.sql`.
It is a **structure-only** standalone dump for an empty database: no
migrations, no `DROP`, **zero `INSERT`s**, 15 tables — `users`, `services`,
`service_categories`, `categories`, `agreements`, `agreement_proposal`,
`agreement_details`, `chat`, `chat_messages`, `chat_participants`,
`messenger_messages`, `notifications`, `service_queues`, `user_reports`,
`staff_operation_logs`.

Because it carries no rows, the local stack mounts a seed right after it:
`Backend/docker/seed-demo.sql`. That seed is **what the app writes**, not a
copied dump. It covers **fourteen** of the fifteen tables — everything but
`messenger_messages`, which is the async transport rather than app data:

| Tables | Rows | Provenance |
| --- | --- | --- |
| `categories` | 50 | the shared catalog: the app only picks from it |
| `users` | 7 | six people registered from the web build, plus `demo.staff` created by `app:create-staff` |
| `services`, `service_categories` | 14, 14 | one offer and one request each, `demo.staff` included; `luca.ferrari`'s request was soft-deleted through `DELETE /requests/{id}` so the deleted-entries sections have a row |
| `service_queues` | 2 | `POST /create-service-queue` (the second one spends no credit: it is an `OFFER` queue) |
| `agreements`, `agreement_proposal` | 7, 14 | `POST /create-exchange-agreement` + `POST /send-agreement-response` + `POST /cancel-agreement/{id}`; the `COMPLETED` one was closed by `messenger:consume scheduler_default --limit=1` |
| `agreement_details` | 8 | two sheets per agreement that reached `ACCEPTED`, the cancelled and the completed one included; compiled by `POST /send-agreement-details` |
| `chat`, `chat_participants`, `chat_messages` | 3, 6, 10 | `GET /chats/agreement/{id}` creates the chat, `POST /chats/send-message/{chatId}` the messages |
| `notifications` | 11 | written by the routes above (four left unread) |
| `user_reports` | 2 | `POST /reports` (one of them `CONFIRMED` through the staff routes) |
| `staff_operation_logs` | 2 | the claim and the review the staff routes recorded |

So a fresh database carries an app in use: seven agreements that put
`demo.staff` in every state worth showing (proposed and received proposals, sheets
to compile and to confirm, completed, cancelled, refused), three chats, a queue
each for `giulia.bianchi` and `demo.staff`,
two reports and an inbox with unread rows. Nothing is hand-written: the rows were
created by driving the API with a throwaway script (2026-11-17), and this file
is the `mysqldump --no-create-info --complete-insert --skip-extended-insert
--compact` of the database those calls left behind. Its header names every route
used, and the stack was rebuilt from it twice, counting the rows each time
(`setup.md` has the count table). Tables are dumped parents first because the
schema carries foreign keys and the import keeps them enabled.

Three known artifacts of that choice: `messenger_messages` is empty after a
rebuild (the match job the queue creation queued is a pending message, not a
row worth restoring); no queue carries an `agreement_created`, because the
matching worker cannot run at all (`backend-gaps.md` G28); and a compiled
`agreement_details` row shows the moment of its last write as `start_date`,
because the column carries
`ON UPDATE CURRENT_TIMESTAMP` (G20). The generator
`Backend/tools/create-demo-database.php` cannot do this job: it targets the
previous schema and filename (`docs/backend-gaps.md`).

| Where | What it is |
| --- | --- |
| `Context_and_DB_V2/` | The truth: current dump, API guide, user stories |
| `Archive/DB_mid_November/` | The demo dump with seed rows, plus the model dump it replaced. Rollback and seed material only |
| `Archive/DB_pre_November/` | The v2 dumps. Rollback material only |
| `Archive/API_docs_Prima_della_verifica_stronati/` | The chain/token API documentation, same reason |

Nothing under `Archive/` describes the current product. Reading it to decide how
to build something is how the team ends up implementing a feature that no longer
exists.

## Migrations are not the schema

The stack is built by importing the dump, not by running migrations, and the two
have diverged: `Backend/migrations/` never creates nine of the tables the app uses
(`agreements`, `agreement_details`, `agreement_proposal`, `chat`,
`chat_messages`, `chat_participants`, `notifications`, `service_queues`,
`messenger_messages`) and still creates four the dump dropped (`proposals`,
`proposal_participants`, `swipe_decisions`, `token_redemptions`), with
`utf8mb4_unicode_ci` instead of the dump's `utf8mb4_general_ci`. So
`doctrine:migrations:migrate` must not be run against a database imported from
the dump.

Three ORM classes are dormant for the same reason: `Proposal`,
`ProposalParticipant` and `MatchCandidate` map tables that do not exist, and
`ProposalRepository` is still resolved by
`Backend/tests/Functional/MarketplaceControllerTest.php` — a test that only
passes on a schema built from the migrations. No production code path reads
them.

## Table map (15 tables)

| Table | Responsibility |
| --- | --- |
| `users` | Identity: name, surname, optional location, unique username and email, password hash, `roles` JSON, `account_status` (varchar, `ACTIVE`/`INACTIVE`), `credits` (column default 0; a new account is created with 1), `bio`, `profile_image_url`, `creation_date` |
| `services` | One table for both types through `type` (`OFFER`/`REQUEST`, a varchar validated by the application, not a DB enum); owner, description, `is_remote`, `is_suspended`, `location`, `deleted_at` (soft delete), `is_used` |
| `categories`, `service_categories` | Category catalog and the many-to-many link to services |
| `service_queues` | A service waiting for a counterpart: `user_id`, `type` (`OFFER`/`REQUEST`), `service_id`, `location` (**varchar(100)**, the only location column that is not 255), `status` (`OPEN`/`IN_PROGRESS`/`CLOSED`), `agreement_created` |
| `agreements` | The exchange unit: `status` (`PENDING`, `ACCEPTED`, `REFUSED`, `CONTESTED`, `VOID`, `CANCELLED`, `COMPLETED`), `from_queue`, `creation_date` |
| `agreement_proposal` | Per-participant proposal: user, `role` (`Provider`/`Beneficiary`), `response`, `response_date` |
| `agreement_details` | The delivery itself: provider, service provided, beneficiary, `from_remote`, start and end `timestamp`, `beneficiary_accepted`, `status` (`COMPILED`/`UNCOMPILED`), `is_completed`. **`start_date` carries `ON UPDATE CURRENT_TIMESTAMP`**: any update of the row that does not set it explicitly silently resets it (`backend-gaps.md` G20) |
| `chat`, `chat_messages`, `chat_participants` | One chat per agreement (there is no `UNIQUE` on `chat.agreement_id`: the rule is the application's), `chat.status` (`OPEN`/`CLOSED`) and `creation_date`, the messages, and the per-participant read marker (`last_message_read`) |
| `notifications` | One row per event and recipient: `user_id` (FK, cascade), `type` (varchar(100), free text — `AGREEMENT_*`, `MATCH_CREATED`, `CHAT_MESSAGE`, `REPORT_*`, `USER_*`, `SERVICE_RESTORED`, plus a lowercase `agreement_completed` written by the scheduler), `message`, `data` (JSON, `CHECK json_valid`), `created_at`, `read_at` |
| `messenger_messages` | The `async` transport's table: `App\Message\QueueId` lands here until a worker consumes it |
| `user_reports` | Reports against users with claim and assignment (`PENDING` → `IN_REVIEW` → `CONFIRMED`/`REJECTED`), with `reason`, `creation_date`, `review_note`, `reviewed_at`, `reviewed_by_id`, `assigned_to_id`, `assigned_at` |
| `staff_operation_logs` | Audit trail of staff actions (`staff_id`, `staff_username`, `action`, `target_type`, `target_id`, `before_values`, `after_values`, `created_at`), with historical ids kept after the subjects are deleted |

`match_candidates` and `queue_associated_agreements` are **gone** from the
schema: the queue now points at the agreement it produced through
`service_queues.agreement_created`. The `tokens`, `token_redemptions`,
`proposals`, `proposal_participants` and `swipe_decisions` tables of the reversed
design are gone from the dump but **not from the repository**: the v3.1 file, the
migrations and three dormant entity classes still carry them (see *Migrations are
not the schema* above).

## What the schema does not have

- **No region or province.** Location is free text everywhere: `users.location`
  and `services.location` are `varchar(255)`, `service_queues.location` is
  `varchar(100)`. The app composes `"Comune - Provincia"` client-side
  (`Frontend/src/services/italian-locations.js`) and the database stores it as
  one string, collated `utf8mb4_general_ci`. There is no lookup table and no
  endpoint for administrative areas: the app carries a verbatim copy of
  `Context_and_DB_V2/province-comuni.json` (110 provinces, 7.894 comuni, nothing
  in `Backend/` reads it) as `Frontend/src/services/data/province-comuni.json`.
  A province-only filter works in the catalog (a `LIKE` matches `… - Milano`),
  but a queue match needs the **identical** string on both sides, which is why
  one module owns composing and parsing it.
- **No swipe or chain tables.** The product is pairwise.
- **`credits` is live now.** A `REQUEST` queue costs one credit
  (`POST /create-service-queue` answers `400` at zero); cancelling a queue with
  no agreement, cancelling a queue-born agreement and completing one through
  the end-date scheduler each add one back (backend `11cffda`). The app has no
  credits UI yet and no route exposes the balance
  (`docs/backend-gaps.md` G15).
- **`is_used` is still inert.** It exists and nothing manages it.
- **`COMPLETED` needs the scheduler.** The status exists and the backend has the
  task, but nothing consumes `scheduler_default` in the local stack, so an
  agreement stays `ACCEPTED` past its end date until a worker runs.

## Rules the schema does not enforce

The foreign keys connect the entities but say nothing about ownership or
permissions. These stay application rules, and the backend implements them:

- a service in an agreement must belong to the user listed as provider and have
  the right type;
- no exchanges with oneself, no duplicated participants;
- state transitions of an agreement are atomic;
- lists exclude inactive accounts and soft-deleted services.

## Reading the dump

```bash
grep -n "CREATE TABLE" Context_and_DB_V2/barattolo_15112026.sql
grep -n "enum(" Context_and_DB_V2/barattolo_15112026.sql
grep -n "CREATE TABLE" Backend/docker/seed-demo.sql | head
```

`Archive/DB_mid_November/barattolo_v3_1_senza_swipe_chat_catene.dbml` is an older
model in a readable form; it is **not** the current schema (no chat, no
notifications, no queues as they are today), so use it for shapes and
relationships only, never for a column list.
