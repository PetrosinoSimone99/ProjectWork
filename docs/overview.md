# Overview

Baratto-lo is a non-profit platform for exchanging services between people,
with features designed around **reliability of the interaction** rather than
payment. People register, publish what they offer and what they look for,
find compatible users through a swipe feed, talk in chat, and formalize
exchanges.

The exchange model is **pairwise and directional**: one agreement means "user
P provides service S to user B". Receiving comes first, providing comes
later, and longer paths emerge on their own — A receives from B, then B
receives from C, then C from D, and so on. There is no closed loop to finish
and no minimum group size. The product goal is that a requested service is
obtained as early as possible, with the provider's own service delivered
later.

Credits and tokens are the reliability layer that makes "receive first" safe.
Their current state is **partial**: `users.credits` exists in the schema but
no API manages it, and token reservation is incompatible with the current
schema until the backend availability check is reworked (see
[`database.md`](database.md)).

## Actors

| Actor | What they do |
| --- | --- |
| **User** | Registers and logins; creates and customizes a profile; publishes offered and requested services; browses the home catalog with filters; uses the swipe feed (proposals to confirm first, then compatible people); chats; formalizes direct or chain exchanges via agreements in chat; receives and spends tokens when the rules allow it; invites a friend; reports another user |
| **Staff** | Logins; activates/deactivates users; changes user roles; examines and closes reports; manages tokens (create, update expiration, delete) |

## Core flows

**Queues and matching.** A user enqueues a service as an offer (`OFFER`) or as
a request (`REQUEST`) in `service_queues`. `match_candidates` pairs an offer
queue with a request queue. Two open queues of opposite type are a candidate
match; nothing is reserved until an agreement exists.

**Agreement (the only exchange unit).** An `agreement` starts as `PENDING`
with a proposal row per participant (`Provider` / `Beneficiary`) and their
response. Once both sides accept, `agreement_details` records the provider,
the service provided, the beneficiary, remote/local delivery, start and end
dates, `beneficiary_accepted` and `COMPILED`/`UNCOMPILED`. Statuses are
`PENDING`, `ACCEPTED`, `REFUSED`, `CONTESTED`, `VOID`.

**Open paths, not chains.** Because every agreement is directional and pairs
two users, a path of any length is just a series of independent agreements.
The earlier design (a closed chain of three or four participants, three-hour
search window, compensation token on withdrawal) has been dropped: it is
archived in `Archive/` as a fallback plan, not current scope.

**Swipe and chat — in development.** Both remain product intent and both tabs
are planned, but the current schema v3.1 deliberately contains **no** tables
for swipe decisions, proposals or chat. The old backend code (chat entities,
chain and proposal controllers) still exists and is not authoritative. Treat
these two areas as under construction and never assume persisted state.

**Credits and tokens.** `users.credits` is the balance that would make
"receive before providing" safe, but no endpoint manages it. Tokens
(`tokens`, `token_redemptions`) still exist: staff can issue them manually and
a token can be spent to obtain a service. The withdrawal-compensation
rationale no longer applies, and token reservation needs the backend
availability check reworked first.

## Where the truth lives

| Topic | Canonical source |
| --- | --- |
| Functional requirements, user stories | `Context_and_DB_V2/new_user_stories_v2.md` |
| Schema design intent and gaps | `Context_and_DB_V2/baratto-context.md`, `database_doc_spiegazione.md` |
| Database structure | `Context_and_DB_V2/barattolo_v3_1_senza_swipe_chat_catene.sql` (see `LAST_DB_TO_USE.txt`) + [`database.md`](database.md) |
| Backend API | Backend README and `Context_and_DB_V2/API docs/DATABASE_AND_API_GUIDE.md` (see [`api.md`](api.md)) |
| Previous chain/token API docs | `Archive/API_docs_Prima_della_verifica_stronati/` — archived as a fallback, not current |
| Team rules for agents | Root [`AGENTS.md`](../AGENTS.md) |
| Frontend conventions and decisions | [`frontend.md`](frontend.md), [`decisions.md`](decisions.md) |

## Glossary

| Term | Meaning |
| --- | --- |
| **Offer / Request** | The two types of a `service`: `OFFERTA` is what a user provides, `RICHIESTA` is what a user looks for |
| **Loop** | The swipe feed screen: proposals pending confirmation first, then new compatibility candidates |
| **Queue** | A user's service waiting for a counterpart: type `OFFER` or `REQUEST`, with location and state `OPEN`/`CLOSED` |
| **Match candidate** | Pairing of one offer queue with one request queue; the potential match, not yet an agreement |
| **Agreement (accordo)** | The formalized exchange unit: one provider, one beneficiary, one service, directional |
| **Path** | Emergent series of pairwise agreements (A gets from B, B from C, ...) — replaces the old closed chain |
| **Credits** | Per-user balance in `users.credits`, intended to make "receive before providing" safe; not managed by any API yet |
| **Token** | Staff-issued credit with monthly expiration, spent through a redemption; withdrawal compensation is no longer the rationale |
| **Redemption** | The act of spending a token to obtain a service |
| **Report** | A user-submitted complaint about another user, processed by staff |
| **Staff operation log** | Audit trail of staff actions (role changes, activations, report closures, token management) |

## Explicit non-goals

- No money and no payment rails. Credits and tokens are internal reliability
  instruments, not a currency with real-world value.
- No automatic arbitration: staff review reports; open questions about
  non-compliance are tracked as gaps, not fabricated rules (see
  [`database.md`](database.md) — "Known gaps").
