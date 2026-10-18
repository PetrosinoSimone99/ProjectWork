# Compensation token redemptions

This backend flow pays for one offered service with one compensation token. It is
separate from mutual proposals, chain agreements and the future 1:1 agreement API.
It does not create an agreement or a chat. The frontend has not been changed.

## Installation

Apply migration `Version20261018000100` after the migrations represented by
`barattolo_v2_16102026_soft_delete.sql`:

```sh
php bin/console doctrine:migrations:migrate
```

The migration adds `tokens.status` and `token_redemptions`. Existing tokens start
as `AVAILABLE`; expired ones are presented as `EXPIRED`. Existing soft deletions,
expiration dates and compensation uniqueness are preserved. The migration cannot
be reversed because removing the history could make spent tokens usable again.

## Lifecycle

1. The token owner reserves another active user's available offer. The token
   becomes `RESERVED` and the redemption starts as `PENDING`.
2. The provider accepts (`ACCEPTED`) or rejects (`REJECTED`) the request.
3. Only the recipient can confirm receipt, after acceptance. The redemption
   becomes `COMPLETED` and the token becomes `SPENT`.
4. Either participant can cancel a pending or accepted request (`CANCELLED`).
   Rejection and cancellation restore the persisted token state to `AVAILABLE`.

An offer can have only one active redemption. While reserved, it cannot be edited,
suspended, deleted, used by another token, or matched in a new proposal or chain.
Closing the redemption releases the offer without suspending or deleting it.
Staff cannot delete a reserved token. Changing expiration never resets its state.

Expiration is checked when reserving. An already reserved token can be accepted
and spent after its expiration date. Releasing it after expiration makes its API
status `EXPIRED`, with no extension to its lifetime. `SPENT` always stays `SPENT`.
The existing `expired` field reports the date comparison independently of state:
a reserved or spent token can have `expired: true`.

Both participants must be active when creating or accepting a request. An active
participant can cancel or reject even if the counterpart is inactive. An active
recipient can confirm receipt after acceptance even if the provider is inactive.

Repeating an action whose target state is still current succeeds without another
transition. Conflicting actions return `409`. Retrying an old rejection or
cancellation never releases a later reservation of the same token. Reserving is
not idempotent: reserving a token that is already reserved returns `409`.

## Endpoints

All requests require `Authorization: Bearer <JWT>`. Bodies are JSON objects;
unknown fields are rejected. Dates are returned in ISO 8601 with UTC timezone.

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/api/tokens/{id}/reserve` | `{"serviceId":45}` | `201 {token, redemption}` |
| GET | `/api/tokens` | none | `200 {tokens:[...]}` (own non-deleted tokens) |
| GET | `/api/token-redemptions` | none | `200 {redemptions:[...]}` (own participation, newest first) |
| GET | `/api/token-redemptions/{id}` | none | `200 {redemption}` |
| POST | `/api/token-redemptions/{id}/decision` | `{"decision":"ACCEPT"}` or `{"decision":"REJECT"}` | `200 {token, redemption}` |
| POST | `/api/token-redemptions/{id}/receipt` | empty or `{}` | `200 {token, redemption}` |
| POST | `/api/token-redemptions/{id}/cancel` | empty or `{}` | `200 {token, redemption}` |

Reads are restricted to the recipient and provider; staff has no implicit access
to other users' redemptions. The list includes closed attempts and has no filters
or pagination. The existing staff token API keeps its existing response shape.

Example reservation response:

```json
{
  "token": {
    "id": 12,
    "chainId": 3,
    "issuedAt": "2026-10-18T12:00:00+00:00",
    "expiresAt": "2026-11-17T12:00:00+00:00",
    "expired": false,
    "status": "RESERVED",
    "serviceId": 45,
    "redemptionId": 7,
    "spentAt": null
  },
  "redemption": {
    "id": 7,
    "tokenId": 12,
    "serviceId": 45,
    "recipientId": 2,
    "providerId": 9,
    "status": "PENDING",
    "createdAt": "2026-10-18T12:05:00+00:00",
    "acceptedAt": null,
    "closedAt": null
  }
}
```

After receipt, the token keeps `serviceId` and `redemptionId` and gains `spentAt`.
After release these three fields are null. Historical attempts retain their
service and participant IDs, including after soft deletion of the offer or token.
There is no `agreementId` and no legacy `.php` alias.

Errors use `{"error":"English explanation"}`: `400` invalid input, `401` missing
authentication, `403` inactive caller or forbidden action, `404` missing/deleted
resource, `409` unavailable token/offer, incompatible transition or concurrent
conflict. An unknown service is `404`; an own service or a request instead of an
offer is `400`. A suspended offer or inactive provider is `409`.

## Verification

Tests rebuild tables **only** in the explicitly isolated database namespace
`token_check_*_test`. Supply the connection without the `_test` suffix because
Symfony adds it:

```sh
TOKEN_TEST_DATABASE_URL='mysql://user:password@127.0.0.1:3306/token_check_redemptions?serverVersion=8.4.3&charset=utf8mb4' php bin/phpunit tests/Functional/TokenRedemptionControllerTest.php
```

The suite applies the real migration and exercises HTTP permissions, lifecycle,
expiration, reuse/history, service availability and simultaneous PHP workers
competing for tokens, offers, receipt and cancellation. Run existing chain and
staff suites with their isolated `CHAIN_TEST_DATABASE_URL` and
`STAFF_TEST_DATABASE_URL` variables as well. Never point these tests at an
application database.
