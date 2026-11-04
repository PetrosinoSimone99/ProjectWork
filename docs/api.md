# API — what the frontend can call today

Scope: what the **frontend** consumes, verified against the running backend.

## Source precedence (read this before trusting any API doc)

The documents disagree. The tie is broken by folder first, then by recency
inside the folder:

**`Context_and_DB_V2/` is the truth. `Archive/` is the rollback backup.**
Anything that exists only under `Archive/` is retired: it is kept so the team
can return to it, never as a build target. Order of authority inside the
truth folder:

1. **`Context_and_DB_V2/LAST_DB_TO_USE.txt`** → `barattolo_v3_1_senza_swipe_chat_catene.sql`.
   The official schema. It has **no** `proposals`, `swipe_decisions`,
   `chat*`, `proposal_groups` or `chain_*` tables.
2. **Live backend** (`Backend/src/Controller/`, run against the v3.1 schema).
   What actually answers.
3. **`Context_and_DB_V2/API docs/DATABASE_AND_API_GUIDE.md`** — the trimmed
   guide, current.
4. **`Archive/`** — backup only. Everything under
   `Archive/API_docs_Prima_della_verifica_stronati/` (including the
   pre-trim `DATABASE_AND_API_GUIDE.md`, byte-identical to the parent of
   commit `8e6f52b`) exists so the team can roll back. It is not current,
   it is not a build target, and it must never override
   `Context_and_DB_V2/`.

Commit `8e6f52b` ("remove features we no longer use and/or need to rework")
touched documentation and dumps only — **zero code removed**. It trimmed
`Context_and_DB_V2/` and moved the previous docs to `Archive/` as a rollback
backup. So the routes below still exist in the backend even when the official
schema cannot serve them.

Rule of thumb: if a feature appears only in `Archive/`, it is retired. If it
appears in `Context_and_DB_V2/`, it is current truth.

This is why the earlier reading — building on the archived
`DATABASE_AND_API_GUIDE.md`, which still documents swipe and chains — was
wrong: that file is the backup of a retired state, not a newer opinion.

Same trap with the dumps: `Context_and_DB_V2/` holds a dozen dated `.sql`
files because nobody cleans up. Only the one named in `LAST_DB_TO_USE.txt` is
the schema; the rest are leftovers. See the dated list in
[`database.md`](database.md#source-precedence-how-to-pick-the-right-file).

## How this matrix was produced

On 2026-11-03 the full suite ran green (119 tests, ~1.7K assertions, PHP 8.4),
and every endpoint was called on a live stack twice: once against the current
Docker seed (`barattolo_v2_18102026_token_redemptions.sql`, port 8000) and
once against a throwaway database seeded from the v3.1 dump (port 8001).
"v3.1" in the tables below means verified on that second run.

## Working on the official v3.1 schema — 32 of 50 routes

| Method + path | Verified | Response |
| --- | --- | --- |
| `POST /api/auth/register` | v3.1 live | `201` token + user + offers + requests |
| `POST /api/auth/login` | v3.1 live | `200` token; inactive accounts rejected |
| `GET /api/profile` | v3.1 live | `200` own profile |
| `PATCH /api/profile` | v2 live | `200`; rejects account fields and unknown fields |
| `GET /api/categories` | v3.1 live | `200` category catalog |
| `GET /api/services` | v3.1 live | `200` home feed + pagination |
| `POST /api/services` | v3.1 live | `201` `type` + `description` + unique `categoryIds`/`categories` |
| `GET /api/offers/mine` | v3.1 live | `200` own offers |
| `PATCH /api/offers/{id}` | v3.1 live | `200` |
| `DELETE /api/offers/{id}` | v3.1 live | `204` soft delete |
| `GET /api/requests/mine` | v3.1 live | `200` own requests |
| `PATCH /api/requests/{id}` | v3.1 live | `200` |
| `DELETE /api/requests/{id}` | v3.1 live | `204` soft delete |
| `POST /api/reports` | v3.1 live | `201` report |
| `GET /api/tokens` | v3.1 live | `200` own tokens |
| `GET /api/token-redemptions` | v3.1 live | `200` own redemptions |
| `GET /api/token-redemptions/{id}` | tests | `200` participant only |
| `POST /api/token-redemptions/{id}/decision` | tests | `200` accept/reject |
| `POST /api/token-redemptions/{id}/receipt` | tests | `200` |
| `POST /api/token-redemptions/{id}/cancel` | tests | `200` |
| `GET /api/staff/users` | v3.1 live | `200` paginated, filterable |
| `GET /api/staff/users/{id}` | v3.1 live | `200` |
| `POST /api/staff/users/{id}/promote` | v3.1 live | `200` |
| `PATCH /api/staff/users/{id}/status` | v3.1 live | `200` activate/deactivate |
| `GET /api/staff/reports` | v3.1 live | `200` |
| `GET /api/staff/reports/{id}` | v3.1 live | `200` |
| `PATCH /api/staff/reports/{id}/review` | v3.1 live | `200`; **`reviewNote` required**, 1–2000 chars |
| `GET /api/staff/operations` | v3.1 live | `200` audit list |
| `GET /api/staff/operations/{id}` | v3.1 live | `200` |
| `POST /api/staff/tokens` | v3.1 live | `201`; `{"userId":n}` only — see caveat below |
| `PUT` or `PATCH /api/staff/tokens/{id}` | v3.1 live (PUT) | `200`; one route, both verbs, takes `expiresAt` |
| `DELETE /api/staff/tokens/{id}` | tests | `204` soft delete |

Repeating `POST /api/reports` for the same author/target pair returns `409`
(tests).

Staff routes need an active `ROLE_STAFF` account. Create the first one with
`php bin/console app:create-staff <name> <surname> <username> <email> <password>`
inside the container.

## Broken on the official v3.1 schema — 18 of 50 routes

Every failure below is a **missing table**, confirmed by a live `500` carrying
`SQLSTATE[42S02] ... doesn't exist`.

### Swipe and direct proposals — 3 endpoints

On v3.1 the swipe feed, the swipe POST and the proposal decision all fail:
`swipe_decisions`, `proposals` and `proposal_participants` do not exist.

| Method + path | v3.1 result |
| --- | --- |
| `GET /api/swipes` | `500` — table `barattolo_v31.swipe_decisions` missing |
| `POST /api/swipes` | `500` — same table |
| `POST /api/proposals/{id}/decision` | `500` — table `proposals` missing |

They work only on the legacy v2 seed. **Do not build swipe UI against v3.1.**

### Service chains — 8 endpoints

`proposal_groups`, `chain_agreements` and `chain_service_reservations` are
absent, and the whole model is archived in
`Archive/API_docs_Prima_della_verifica_stronati/CHAINS_API.md` as a "plan B".

| Method + path | v3.1 result |
| --- | --- |
| `POST /api/chains` | `500` — table `proposal_groups` missing |
| `GET /api/chains` | `500` — same |
| `GET /api/chains/{id}` | `500` |
| `POST /api/chains/{id}/decision` | `500` |
| `POST /api/chains/{id}/agreements` | `500` |
| `POST /api/chains/{id}/agreements/{agreementId}/decision` | `500` |
| `POST /api/chains/{id}/provisions/{provisionId}/receipt` | `500` |
| `POST /api/chains/{id}/cancel` | `500` |

The `app:chains:process` command drives the same tables and is equally
unusable on v3.1.

### Chat — 6 endpoints

`chat`, `chat_messages` and `chat_participants` do not exist in v3.1. All six
routes return a generic `500 {"error":"An unexpected error occurred"}`.

| Method + path |
| --- |
| `GET /api/chats/mutual-proposal/{proposalId}` |
| `GET /api/chats/group-proposal/beneficiary/{groupProposalId}` |
| `GET /api/chats/group-proposal/provider/{groupProposalId}` |
| `POST /api/chats/send-message/{chatId}` |
| `GET /api/chats/most-recent-message` |
| `GET /api/chats/check-new-messages/{recentMessageId}` |

### Token reservation — 1 endpoint

| Method + path | v3.1 result |
| --- | --- |
| `POST /api/tokens/{id}/reserve` | `500` — table `proposal_participants` missing |

Cause: the availability check (`ChainRepository::hasDirectProposal`) still
queries `proposal_participants` and `swipe_decisions` without guarding for
their absence. The redemption list, detail, decision, receipt and cancel
endpoints work; only the reservation step that starts a redemption does not.
Until this is reworked a token can be issued and listed, but never spent.

The v3.1 DBML note says as much: "I token richiedono il futuro adeguamento
dei controlli di disponibilita".

## Caveats worth knowing before wiring UI

- `POST /api/staff/tokens` accepts `userId` and an optional `chainId`. With
  **no** `chainId` it returns `201` on v3.1 (verified). With a `chainId` it
  validates against `proposal_groups` and fails on v3.1 — do not send it.
- `POST /api/services` in the docs allows `categories` (names) or
  `categoryIds`. A request with neither is rejected with
  `400 {"error":"Type, description, and one or more unique category IDs are required."}`.
  Registration has the same rule for its `offers`/`requests` arrays.
- `PATCH /api/staff/reports/{id}/review` requires `reviewNote`; the field name
  `note` is rejected as unknown.
- `PATCH /api/staff/tokens/{id}` and `PUT` both take `expiresAt`.
- `POST /api/staff/reports/{id}/claim` (`PENDING -> IN_REVIEW`) exists on
  `origin/main` but **not** on `andrea-frontend` — it answers `404` here.
  The branch is 16 commits behind `main`.
- Soft-deleted services and tokens return `404` afterwards and disappear from
  lists. Chained services cannot be edited or deleted (`409`).
- All protected routes need `Authorization: Bearer <jwt>`; tokens last 1 hour.

## Frontend contract notes

- `src/api/barattolo.js` is the only module aware of real vs fake
  (`EXPO_PUBLIC_DATI_FINTI`); components never hardcode endpoints.
- Response shapes are normalized in `src/api/normalizzazioni.js`. When the
  backend renames a field, normalize there.
- Every state is explicit: loading, empty, error. A `500` from a swipe or chat
  call is a schema problem, not a network blip — surface it, do not retry.
- The domain the backend *intends* to move to is pairwise agreements
  (`service_queues`, `match_candidates`, `agreements`, `agreement_proposal`,
  `agreement_details`, `queue_associated_agreements`, see the v3.1 DBML).
  **No endpoint exists for any of it.** Build nothing on it yet.

## Open decision (blocks UI work)

`Context_and_DB_V2/baratto-context.md` (trimmed by `8e6f52b`) drops swipe,
chat, group exchanges and token compensation. But
`Context_and_DB_V2/new_user_stories_v2.md` — the file that document cites as
its requirements source, untouched since 2026-09-16 — still lists the Tinder
swipe, chat, up-to-4-person exchange and token compensation as user stories.

The same commit therefore removes and keeps the same features. Until the
backend maintainer states which side wins, the frontend cannot decide whether
the Swipe and Chat tabs are permanent, transitional, or to be deleted.
