# Backend ledger

**There is no open gap.** Every id G1–G32 is closed, superseded or retracted, so
this file no longer requests anything: it keeps the ids alive because audits,
`decisions.md` and `api.md` cite them by number, and it records the limits the
app works around on purpose.

Current behavior lives in [api.md](api.md); the history of each id — what was
wrong, when it landed, which decision replaced it — is in
[changelog.md](changelog.md), newest first.

## Id status

- **Closed (26):** G1–G8, G10–G14, G17–G22, G24–G32. The backend behavior
  survives in `api.md` §"Declared limits" and the endpoint rows.
- **Superseded (3):** G9 (registration needs exactly one offer and one request),
  G15 (`GET /profile` exposes `credits` only, `canRequestQueue` is gone),
  G23 (a request queue costs one credit, no prior delivered offer; one
  OPEN/IN_PROGRESS queue per account, `409`).
- **Retracted (1):** G16 — `count()` on Doctrine Paginator already returns the
  filtered total; the diagnosis was wrong, the code was always right.

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
