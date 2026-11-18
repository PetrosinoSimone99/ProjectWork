# Backend ledger

**There is no open gap.** Every id G1–G32 is closed, superseded or retracted, so
this file no longer asks the backend for anything. It keeps the ids alive
because audits, `decisions.md` and `api.md` cite them by number, and it records
the limits the app works around on purpose.

Current behavior lives in [api.md](api.md); the history of each id — what was
wrong and when it landed — is in [changelog.md](changelog.md), newest first.

## Closed (26)

What the backend does today, in one line per row.

| IDs | What the backend does now |
| --- | --- |
| G1, G2 | Relevance ordering and remote filtering are implemented and preserved. |
| G3, G6 | Public profile API retained; agreement participants and sheets carry user and service ids, cards show both services and link to the counterpart profile; `COMPLETED` is authoritative. |
| G4 | Proposals name the requested service and keep both offers; duplicate pending service pairs return `409`; sent/received direction travels with the agreement envelope. |
| G5 | Reciprocal direct exchange: the sender consents when proposing, the recipient answers once, a single refusal terminates, no extra confirmation round. |
| G7 | Only compiled sheets of accepted agreements can be confirmed; repeated confirmation and edits to confirmed sheets return `409`. |
| G8, G24 | Chat history, creation and sends verify participation: foreign ids are `404`, history stays readable, sending requires `ACCEPTED`. |
| G10 | Matching locks and rechecks both queues, creates one agreement and one sheet, commits notifications and queue changes together, ignores redelivery. |
| G11 | Queue locations are 255 characters; known locations normalize through the shared municipality catalog and matching compares normalized values; unknown or ambiguous values are preserved. |
| G12 | Compose runs async and scheduler workers; completion requires every expected sheet compiled, confirmed and expired; notifications use `AGREEMENT_COMPLETED`; provider credit and queue closure are atomic and happen once. |
| G13 | Queue errors are mapped explicitly; a missing service or category is a controlled conflict, not a dereference error. |
| G14 | The seed generator imports the maintained dump into an empty current schema, accepts the Docker host and exports without generated columns; populated databases and existing output files are refused. |
| G17 | Empty queues return `200` with an empty list. |
| G18, G19 | Acceptance uses persisted service references; writes are transactional; queue validation precedes the debit; account locking plus unique constraints prevent duplicate active slots. |
| G20 | No automatic update on `start_date`/`response_date`; both are nullable domain datetimes; MySQL tests prove confirmation preserves `start_date`. |
| G21 | Foreign or missing queues return `404`; cancelling an already closed own queue is idempotent and never refunds twice. |
| G22 | New queues carry `createdAt`; unknown historical dates stay null. |
| G25 | Unexpected errors return a fixed message; exception context stays in server logs. |
| G26 | Shared throttle: five failed username/IP attempts and fifty IP attempts per fifteen minutes; `429` carries `Retry-After`. |
| G27 | Chat payload carries `data.message`; the app renders its first 60 characters as a single-line preview. |
| G28 | Explicit category/dictionary mapping; valid dictionaries add keyword matching; missing or invalid ones fall back to category, mode and normalized location. |
| G29 | `role=USER\|STAFF` is validated before pagination; `USER` excludes staff members. |
| G30 | A reciprocal proposal accepts the pending mirror agreement and answers `autoAccepted: true` (`decisions.md` D028). |
| G31 | The delivery sheet is written once: `startDate` at acceptance, `endDate` at confirmation, the first sender locks the round with `409`, and confirmation closes the exchange, credits the queue provider and notifies both participants (`decisions.md` D028). |
| G32 | `GET /api/stream` pushes over Server-Sent Events on the notifications table: one event type, `notification`, so chat messages and notifications share the stream (`decisions.md` D029). |

## Superseded (3)

The product rule changed; these are **not** requests to the backend.

| IDs | Rule that replaced the gap |
| --- | --- |
| G9 | Registration requires exactly one offer **and** one request; the optional-lists rule is retired (`decisions.md` D028). |
| G15 | `GET /profile` exposes `credits` only; `canRequestQueue` is gone with the eligibility rule it served. |
| G23 | A request queue costs one credit with no prior delivered offer required; one OPEN/IN_PROGRESS queue total per account still holds, answered with `409`. |

## Retracted (1)

**G16:** `count()` on Doctrine Paginator already returns the filtered total, not
the current page size. The diagnosis was wrong; the controller and its
pagination tests were always correct and are retained.

## Residual limits

Nothing here is a backend gap; these are the surfaces the app deliberately
covers another way. `api.md` §"Declared limits" is the normative statement.

- The stream carries only the tables that write a notification. The home
  catalog, another user's public profile and the staff lists stay on focus read
  and pull-to-refresh.
- `UNREAD_POLL_MS` (120 s) and `CHAT_POLL_MS` (60 s) remain the fallback for a
  stream that is down.
- An app restart starts at the stream's live edge; the focus reads cover the
  gap, because a cursor replay happens only within a session.

## Data and rollout constraints

Owner-side deletion and suspension answer `409`; rows created before this
correction stay readable and editable, and staff restore still works.

`Version20261119000100` only adds `notes` and `sent_at` to
`agreement_details`; the start-up upgrade applies it after the 2026-11-18 one.
It refuses duplicate live service slots or active queue slots before altering
the schema, reports owners and never silently discards data. Legacy proposal
services are recovered from delivery sheets or, for pending proposals, from the
unique offer; unresolved references produce `409` on acceptance.

MySQL DDL cannot be rolled back as a unit: a failed partial migration must be
repaired before retrying, and existing development volumes must not be reset.
