# Database

Engine: **MySQL 8.0, utf8mb4** (deliberate — see decisions.md D004). The
backend connects through `DATABASE_URL` (Doctrine DBAL) with
`serverVersion=8.0`.

The schema is **v3.1, "senza swipe chat catene"**. The authoritative dump is
the file named in `Context_and_DB_V2/LAST_DB_TO_USE.txt`
(`barattolo_v3_1_senza_swipe_chat_catene.sql` on the last check). Dumps are
dated snapshots: read the file headers. The v3.1 files are **standalone
schemas for an empty database**, not migrations, and they contain no `DROP`
and no seed data.

## Source precedence (how to pick the right file)

- **`Context_and_DB_V2/` is the truth.** It is the only current reference.
- **`Archive/` is a rollback backup, nothing else.** It exists so the team can
go back if v3.1 turns out wrong. Never read it to decide how to build.
- **Recency wins inside `Context_and_DB_V2/`.** The team never cleans up old
files, so a directory listing is a history, not a menu: only the file named in
`LAST_DB_TO_USE.txt` is the schema. Every other dated dump is a leftover.

Stale dumps still sitting in `Context_and_DB_V2/` (last commit per file on
`origin/main`, newest first). None of these is the schema:

| Date | File | Status |
| --- | --- | --- |
| 2026-11-01 | `barattolo_v3_1_senza_swipe_chat_catene.sql` | **current, named by `LAST_DB_TO_USE.txt`** |
| 2026-11-01 | `barattolo_v3_1_api_essenziali.sql` | variant, legacy tables kept empty |
| 2026-10-19 | `barattolo_v2_19102026_migrato.sql`, `..._integrato.sql`, `..._in_review.sql` | obsolete |
| 2026-10-18 | `barattolo_v2_18102026_token_redemptions.sql` | obsolete; still the Docker seed |
| 2026-10-16 | `barattolo_v2_16102026_soft_delete.sql` | obsolete; used by one migration test |
| 2026-10-15 | `barattolo_v2_15102026_services.sql` | obsolete |
| 2026-10-13 | `barattolo_v2_13102026.sql`, `..._staff.sql` | obsolete |
| 2026-09-27 | `barattolo_v2_27092026.sql` | obsolete |
| 2026-09-25 | `barattolo_v2.sql` | obsolete (still cited by `baratto-context.md`) |

Two v3.1 variants exist:

| File | Purpose |
| --- | --- |
| `barattolo_v3_1_senza_swipe_chat_catene.sql` | Target schema: full v3.1 agreement/queue model, no legacy tables |
| `barattolo_v3_1_api_essenziali.sql` | Same schema plus the legacy `proposals`/`proposal_participants`/`swipe_decisions` tables kept **empty**, because current backend code still queries them |

`barattolo_v3_1_senza_swipe_chat_catene.dbml` is the readable version of the
same model. The previous dump (`barattolo_v2_18102026_token_redemptions.sql`)
and the chain/token API docs sit under `Archive/` purely as rollback material.

## Table map (schema v3.1)

| Table | Responsibility |
| --- | --- |
| `users` | Identity: name, surname, optional location, unique username/email, password hash, `roles` JSON, `account_status`, `credits`, `bio`, `profile_image_url` |
| `services` | One table for both types via `type`; owner, description, `is_remote`, `is_suspended`, `location`, `deleted_at` (soft delete), `is_used` |
| `categories`, `service_categories` | Catalog and many-to-many linking of services to categories |
| `service_queues` | A service waiting for a counterpart: `type` (`OFFER`/`REQUEST`), `location`, `status` (`OPEN`/`CLOSED`), `agreement_created` |
| `match_candidates` | Pairing of `offer_queue_id` with `request_queue_id` — the matching engine |
| `agreements` | Exchange unit: `status` (`PENDING`/`ACCEPTED`/`REFUSED`/`CONTESTED`/`VOID`), `from_queue` |
| `agreement_proposal` | Per-participant proposal: user, `role` (`Provider`/`Beneficiary`), `response`, `response_date` |
| `agreement_details` | Actual delivery: provider, service provided, beneficiary, `from_remote`, start/end dates, `beneficiary_accepted`, `COMPILED`/`UNCOMPILED` |
| `queue_associated_agreements` | Which queue produced which agreement |
| `tokens`, `token_redemptions` | Staff-issued tokens with monthly expiration and their spend cycles; `group_id` has no foreign key to any chain |
| `user_reports` | Reports against users, with claim/assignment (`PENDING` → `IN_REVIEW` → `CONFIRMED`/`REJECTED`) |
| `staff_operation_logs` | Audit trail of staff actions; keeps historical ids after the subjects are deleted |

## Known gaps (do not fabricate rules)

`Context_and_DB_V2/baratto-context.md` documents the intended-vs-schema
distinction honestly; reproduce it rather than inventing behavior. The most
relevant open points:

- **No swipe, chat or chain tables.** v3.1 creates none of them. Swipe and
  chat are product intent still to be developed by the backend owner; never
  assume persisted state for them.
- **`credits` and `is_used` are inert.** Both columns exist but no current API
  manages them, so "receive before providing" has no enforced balance.
- **Token reservation is incompatible with v3.1.** The availability check
  calls `ChainRepository::hasDirectProposal()`, which queries
  `proposals`/`proposal_participants`/`swipe_decisions`. Until that is
  reworked, booking a service with a token fails.
- **No ordering or expiry on queues.** `service_queues` has no creation
  timestamp, priority or deadline, so "as soon as possible" ordering has to
  come from backend logic.
- **No chat deliverability rules in schema.** Agreement terms are recorded in
  `agreement_details`; the database does not enforce who may declare a
  service complete or what happens on non-compliance.

## Reading and editing

Database structure matters to three artifacts:

| Artifact | Reads |
| --- | --- |
| Backend entities/migrations (read-only reference) | `Backend/src/Entity`, `Backend/migrations` |
| Frontend normalization layer | `Frontend/src/api/normalizzazioni.js` — mirror field names |
| Docker Desktop stack | `Backend/compose.yaml` — imports this dump on first boot |

Note: the Docker stack still seeds
`barattolo_v2_18102026_token_redemptions.sql`. Switching the seed to the v3.1
dump is a pending task (see [`setup.md`](setup.md)).

**Editing discipline (hard rule, root `AGENTS.md`):** files under
`Context_and_DB_V2/` are read-only reference material. Schema/doctrine
changes belong to backend migrations and stay in backend hands; frontend
never reaches into `Context_and_DB_V2/` to "improve" dumps.

## MySQL in practice

- **First boot** of the Docker Desktop stack imports the dump into a fresh
  `/database_data` volume; re-import needs `docker compose down -v` (see
  [setup.md](setup.md)).
- **Seeded content** includes public categories and migration history only —
  user accounts are registered at runtime (dumps strip credentials by
  design).
- **Charset** is utf8mb4 end-to-end; the DATABASE_URL carries `charset=utf8mb4`
  to keep column-level and connection-level behavior aligned.
