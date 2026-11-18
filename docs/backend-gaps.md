# Backend gaps

Status after the essential workflow corrections of 2026-11-18. G identifiers
are stable so earlier audits remain traceable. Current behavior is documented in
[api.md](api.md); earlier measurements describe the code before this correction.

## Implemented or corrected

| IDs | Resolution |
| --- | --- |
| G1, G2 | Relevance ordering and remote filtering were already implemented; preserved. |
| G3, G6 | Public profile API retained. Agreement participants and sheets now include user/service IDs; cards show both services and link to the counterpart profile. COMPLETED is authoritative. |
| G4 | Proposals name the requested service and retain both offers. Duplicate pending service pairs are rejected. Sent/received direction is returned with the existing agreement envelope. |
| G5 | Product decision: reciprocal direct exchange. Sender consents when proposing; recipient answers once. Responses remain per participant; one refusal terminates the exchange. No extra confirmation round. |
| G7 | Only compiled sheets of accepted agreements can be confirmed. Repeated confirmation and edits to confirmed sheets return 409. |
| G8, G24 | Chat history/creation and sends verify participation. Foreign IDs return 404; history remains readable, sending requires ACCEPTED. |
| G9 | Registration accepts empty/missing service lists and at most one item per type. The frontend permits browsing before publishing. |
| G10 | Matching locks/rechecks both queues, creates one agreement and one sheet, commits notifications and queue changes together, and ignores redelivery. |
| G11 | Queue locations are 255 characters. Known locations normalize through the shared municipality catalog; matching compares normalized values. Unknown/ambiguous values are preserved. |
| G12 | Compose runs async and scheduler consumers. Completion requires all expected sheets compiled, confirmed and expired. Notifications use AGREEMENT_COMPLETED. Provider credit and queue closure are atomic and occur once. |
| G13 | Queue errors are mapped explicitly; missing service/category becomes a controlled conflict instead of a dereference error. |
| G14 | Generator imports the maintained seed into an empty current schema, accepts the Docker host and exports without generated columns. Populated databases and existing output files are still refused. |
| G15 | GET /profile returns credits and canRequestQueue. The latter requires an earlier completed queue-born offered delivery. |
| G17 | Empty queues return 200 with an empty list. |
| G18, G19 | Acceptance uses persisted service references; writes are transactional. Queue validation precedes debit, and account locking plus unique constraints prevent duplicate active slots. |
| G20 | Migration removes automatic updates from start_date and response_date; dates are nullable domain datetimes. MySQL tests verify that confirmation preserves start_date. Explicitly assigning start_date was never inherently unsupported by MySQL. |
| G21 | Foreign/missing queues return 404; cancelling an already closed own queue is idempotent and never refunds twice. |
| G22 | New queues include createdAt; unknown historical dates stay null. |
| G23 | Product decision: one OPEN/IN_PROGRESS queue total per account, not one per type. Conflicts return 409. Request additionally requires a completed offered delivery and positive balance. |
| G25 | Unexpected errors return fixed messages; exception context stays in server logs. |
| G26 | Shared database throttle: five failed username/IP attempts and fifty IP attempts per fifteen minutes; 429 includes Retry-After. |
| G27 | Chat payload already contained data.message. Frontend now renders its first 60 characters as a single-line text preview. |
| G28 | Explicit category/dictionary mapping; valid dictionaries add keyword matching. Missing/invalid dictionaries fall back to category, mode and normalized location. |
| G29 | role=USER|STAFF is validated and applied before pagination. USER excludes staff members. |

## Retracted diagnosis

**G16:** count() on Doctrine Paginator already returns the filtered total, not
the current page size. The existing controller and pagination tests are retained.
The current notifications panel already reads successive pages and marks the
rows it displayed on close; that behavior is preserved.

## Data and rollout constraints

The incremental migration refuses duplicate live service slots or active queue
slots before altering schema; it reports owners and never silently discards data.
Legacy proposal services are recovered from delivery sheets or, for pending
proposals, the unique offer. Unresolved references produce 409 on acceptance.
MySQL DDL cannot be rolled back as a unit: a failed partial migration must be
repaired before retrying. Existing development volumes must not be reset.
