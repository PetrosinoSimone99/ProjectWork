# W3 — Public profile of another user: contract

Source: `docs/audits/frontend-gap-analysis-2026-11-16.md:319-341` (W3), closes the
second half of `docs/backend-gaps.md` G3. Class `L` (11 product files, 5 new).

## Objective

From a service detail, the owner's public profile opens: name, username,
location, bio, photo when there is one, plus every offer and every request that
person publishes. Today the very same data is shown truncated to three rows
inside the modal (`UserServicesMiniCard`, `RIGHE_VISIBILI = 3`) and there is no
page to open. No new endpoint, no new normaliser, no new hook: everything the
screen needs already exists.

## Verified facts (do not re-litigate)

| Fact | Provenance |
| --- | --- |
| `GET /users/{id}/services` answers `{user:{id,name,surname,username,location,bio,profileImageUrl}, offers[], requests[]}` | `docs/api.md:366`, `Context_and_DB_V2/API docs/…:15-45` |
| `getUserServices(token, userId)` already calls it and refuses a non-integer id | `Frontend/src/api/areas/services.js` (last export) |
| `normalizeUserServices` returns `{utente, offerte, richieste}`, `utente` = `{id, username, nome, cognome, localita, bio, immagineProfilo}` | `Frontend/src/api/normalizers.js:590`, `:149` |
| `useUserServices` returns `{dati, disponibile, caricamento, ricaricando, errore, mancante, vietato, riprova}`; `404`→`mancante`, `403`→`vietato` | `Frontend/src/hooks/useUserServices.js` |
| The owner row of the detail panel already knows `owner.id` (`haPersona`) | `Frontend/src/components/ServiceDetailModal.jsx` |
| `/chat/[agreementId]` is the precedent for an id route, hand-listed in the `Stack` | `Frontend/src/app/_layout.jsx`, `Frontend/src/app/chat/[agreementId].jsx` |
| `TITOLI_CON_ID` is the prefix list that names id routes (`/chat/` → `Chat`) | `Frontend/src/navigation/screen-titles.js`, test at `src/navigation/__tests__/screen-titles.test.js` |
| `GET /get-agreements` rows carry the counterpart **username only**, no id; the sheet carries usernames too | `docs/backend-gaps.md:76-91`, `Frontend/src/api/normalizers.js:454-473` |
| Gate baseline: `npx jest` = 19 suites / 240 tests | W2 close, `docs/briefs/w2-agreement-links/plan.md` step 8 |

## Closed decisions

1. **The agreement entry point does not ship.** G6 is still open: no counterpart
   id in `/get-agreements`. Resolving a username to an id would mean paging the
   whole catalog client-side, which invents an identity mapping the backend does
   not offer. W3 ships the service-detail entry only; `AgreementCard.jsx`,
   `AgreementSheet.jsx` and the agreements tab are untouched.
2. **The profile is reachable by id only** (`/user/{id}`). A `username` variant
   would need the same fake mapping and is out.
3. **Reuse, not new plumbing**: `useUserServices` + `getUserServices` +
   `normalizeUserServices` as they are. No new API function, no new hook, no
   change to `src/api/index.js`.
4. **One owner per row group.** The capped `Gruppo` inside
   `UserServicesMiniCard.jsx` moves into `ServiceGroup.jsx` with a `limite` prop;
   the modal keeps cap 3, the profile passes no cap. No duplicated row markup.
5. **Rows on the profile are not pressable.** Opening a service detail from a
   profile would need the modal's proposal/report wiring duplicated outside the
   home; it is recorded as an exclusion, not a gap.
6. Route `/user/[id]`, document title `Profilo · Baratto-lo` via
   `TITOLI_CON_ID = [{ prefisso: '/user/', titolo: 'Profilo' }]`, left arrow in
   the header like `/staff-users`.
7. Copy is Italian, identifiers English, no invented fields: a missing
   location/bio/username simply has no line — never a placeholder.
8. `404` = "this person does not exist or is no longer active" (inactive owner is
   the same answer from the backend); `403` = **the viewer's** account is
   inactive, said as such. The two sentences stay distinct, as in the mini card.

## Success criteria

- Tapping the owner of a service in the home catalog opens `/user/{id}` with
  name, `@username`, location, bio, photo (initial fallback) and every offer and
  request, untruncated.
- Loading, empty, `404`, `403`, and a retryable error are five explicit states.
- `npx expo lint`, `npx tsc --noEmit`, `npx jest` green; docs updated in the same
  commits.

## Exclusions

- No agreement-side entry point (decision 1), no username route (2), no pressable
  rows (5), no "Segnala"/"Invia proposta" on the profile, no service detail
  opened from the profile, no photo upload, no change to `UserServicesMiniCard`'s
  own behaviour or `UserServicesMiniCard.test.js`.
- No backend change, no `Backend/**` file, no `Context_and_DB_V2/**` file.

Stile: full
