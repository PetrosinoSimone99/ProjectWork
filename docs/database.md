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
copied dump: six accounts (password `demo1234`), one offer and one request each,
an OPEN `REQUEST` queue for the account that spent its credit, plus the 50
categories of the shared catalog. It was produced by registering those accounts
from the web build and dumping the resulting database (2026-11-16), and the
stack rebuilds from it to the same rows. Agreements, chats and notifications
start empty on purpose: the app creates them through the API. The generator
`Backend/tools/create-demo-database.php` cannot do this job: it targets the
previous schema and filename (`docs/backend-gaps.md`).

| Where | What it is |
| --- | --- |
| `Context_and_DB_V2/` | The truth: current dump, API guide, user stories |
| `Archive/DB_mid_November/` | The demo dump with seed rows, plus the model dump it replaced. Rollback and seed material only |
| `Archive/DB_pre_November/` | The v2 dumps. Rollback material only |
| `Archive/API_docs_Prima_della_verifica_stronati/` | The chain/token API documentation, same reason |

Nothing under `Archive/` describes the current product, with one exception the
seed still depends on: the November demo dump keeps the column order the
reference schema uses. Reading the rest of `Archive/` to decide how to build
something is how the team ends up implementing a feature that no longer exists.

## Table map (15 tables)

| Table | Responsibility |
| --- | --- |
| `users` | Identity: name, surname, optional location, unique username and email, password hash, `roles` JSON, `account_status`, `credits` (default 0), `bio`, `profile_image_url` |
| `services` | One table for both types through `type` (`OFFER`/`REQUEST`); owner, description, `is_remote`, `is_suspended`, `location`, `deleted_at` (soft delete), `is_used` |
| `categories`, `service_categories` | Category catalog and the many-to-many link to services |
| `service_queues` | A service waiting for a counterpart: `user_id`, `type` (`OFFER`/`REQUEST`), `service_id`, `location` (**varchar(100)**, the only location column that is not 255), `status` (`OPEN`/`IN_PROGRESS`/`CLOSED`), `agreement_created` |
| `agreements` | The exchange unit: `status` (`PENDING`, `ACCEPTED`, `REFUSED`, `CONTESTED`, `VOID`, `CANCELLED`, `COMPLETED`), `from_queue` |
| `agreement_proposal` | Per-participant proposal: user, `role` (`Provider`/`Beneficiary`), `response`, `response_date` |
| `agreement_details` | The delivery itself: provider, service provided, beneficiary, `from_remote`, start and end datetime, `beneficiary_accepted`, `status` (`COMPILED`/`UNCOMPILED`), `is_completed` |
| `chat`, `chat_messages`, `chat_participants` | One chat per agreement, its messages, and per-participant read marker (`last_message_read`) |
| `notifications` | One row per event and recipient: `type` (free text), `message`, `data` (JSON), `read_at` |
| `messenger_messages` | The `async` transport's table: `App\Message\QueueId` lands here until a worker consumes it |
| `user_reports` | Reports against users with claim and assignment (`PENDING` → `IN_REVIEW` → `CONFIRMED`/`REJECTED`) |
| `staff_operation_logs` | Audit trail of staff actions, with historical ids kept after the subjects are deleted |

`match_candidates` and `queue_associated_agreements` are **gone**: the queue now
points at the agreement it produced through `service_queues.agreement_created`.
The `tokens` and `token_redemptions` tables of the reversed design are gone too
and survive only in the v3.1 file, which is no longer imported.

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
