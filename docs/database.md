# Database

Engine: **MySQL 8.0, utf8mb4** (deliberate, see decisions D004). The backend
connects through `DATABASE_URL` (Doctrine DBAL) with `serverVersion=8.0`.

## Which file is the schema

The authoritative dump is the file named in
`Context_and_DB_V2/LAST_DB_TO_USE.txt` — at the time of writing
`barattolo_v3_1_senza_swipe_chat_catene.sql`. It is a **standalone schema for an
empty database**: no migrations, no `DROP`, and no seed rows.

| Where | What it is |
| --- | --- |
| `Context_and_DB_V2/` | The truth: current dump, readable `.dbml` version, API guide, user stories |
| `Archive/DB_pre_November/` | The v2 dumps, moved out of the way when v3.1 landed. Rollback material only |
| `Archive/API_docs_Prima_della_verifica_stronati/` | The chain/token API documentation, same reason |

Nothing under `Archive/` describes the current product. Reading it to decide how
to build something is how the team ends up implementing a feature that no longer
exists.

## Table map (v3.1, 14 tables)

| Table | Responsibility |
| --- | --- |
| `users` | Identity: name, surname, optional location, unique username and email, password hash, `roles` JSON, `account_status`, `credits`, `bio`, `profile_image_url` |
| `services` | One table for both types through `type` (`OFFER`/`REQUEST`); owner, description, `is_remote`, `is_suspended`, `location`, `deleted_at` (soft delete), `is_used` |
| `categories`, `service_categories` | Category catalog and the many-to-many link to services |
| `service_queues` | A service waiting for a counterpart: `type` (`OFFER`/`REQUEST`), `location`, `status` (`OPEN`/`CLOSED`), `agreement_created` |
| `match_candidates` | Pairs one offer queue with one request queue — the future matching engine |
| `agreements` | The exchange unit: `status` (`PENDING`, `ACCEPTED`, `REFUSED`, `CONTESTED`, `VOID`), `from_queue` |
| `agreement_proposal` | Per-participant proposal: user, `role` (`Provider`/`Beneficiary`), `response`, `response_date` |
| `agreement_details` | The delivery itself: provider, service provided, beneficiary, `from_remote`, start and end datetime, `beneficiary_accepted`, `status` (`COMPILED`/`UNCOMPILED`) |
| `queue_associated_agreements` | Which queue produced which agreement |
| `tokens`, `token_redemptions` | The compensation tokens of the reversed design. The tables remain, but no API and no lifecycle code manage them any more |
| `user_reports` | Reports against users with claim and assignment (`PENDING` → `IN_REVIEW` → `CONFIRMED`/`REJECTED`) |
| `staff_operation_logs` | Audit trail of staff actions, with historical ids kept after the subjects are deleted |

## What the schema does not have

- **No swipe, chat, chain or proposal tables.** v3.1 creates none of them. The
  chat controller still exists in the backend but cannot work without its
  tables; proposals are a requested feature, not a schema entity
  (`backend-gaps.md` G4).
- **No conclusion state.** `agreements.status` has no `COMPLETED`: an agreement
  is concluded when its `agreement_details.end_date` has passed. A dispute is
  `CONTESTED` and belongs to staff.
- **`credits` and `is_used` are inert.** Both columns exist and nothing manages
  them; the app must not read them as a balance.
- **No seed data.** The dump has no categories: a fresh database has an empty
  category catalog, which blocks publishing a service until the reference data
  is loaded. Reported to the backend maintainer in the changelog.

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
grep -n "CREATE TABLE" Context_and_DB_V2/barattolo_v3_1_senza_swipe_chat_catene.sql
grep -n "ENUM" Context_and_DB_V2/barattolo_v3_1_senza_swipe_chat_catene.sql
```

`barattolo_v3_1_senza_swipe_chat_catene.dbml` is the same model in a readable
form, useful for diagrams and for checking relations quickly.
