# Plan brief — Wiring conformance, cycle 1

One page. Source of findings: [`../wiring-audit-2026-11-17/audit.md`](../wiring-audit-2026-11-17/audit.md)
§3.1. Read the audit rows, not this page, for the evidence of each finding.

- **Class:** L (12 code files + 3 docs, all small; lanes disjoint).
- **Style:** `lite` — smallest change that closes each finding, no new abstractions.
- **Branch:** `andrea-frontend`. `main` untouched. `Backend/**` read-only.

## Objective

Close cycle 1 of the wiring audit: make the photo rule the backend's rule (F1),
make the dropped-image decision visible where it bites (F2), guard "Segnala"
(C2), and delete the dead code the audit named (D1, D2, D3, D4, D8, D9, D10 —
D1 and D9 are the same finding, `getStaffUser`).

## Constraints

- `Frontend/` is the only writable source tree. No new endpoint, no backend edit.
- Gate: `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest` — green, not weakened.
- UI copy Italian. Structure names English, contract names Italian (D026).
- No emoji. No `git add -A`. No `--amend` unless never pushed (declared).
- Status lives in `plan.md` only, one field: `Stato:`.

## Decisions taken with the user (lock, 2026-11-17)

1. **F1 — the extension rule goes.** `photoUrlError` keeps only what
   `ProfileController::validateField` enforces: scheme **https**, a URL shape,
   and the **2048** character cap. A CDN URL without `.jpg/.png` is valid; an
   `http://` URL is refused by the client exactly as the backend refuses it.
2. **F2 — keep refusing to save a broken preview**, but the reason must be
   visible next to the disabled Save button, not only in the image card. The
   exit stays "Rimuovi immagine". No new state, no new modal.
3. **C2 — "Segnala" is disabled** when the owner id is not an integer, using the
   `haPersona` condition the panel already computes for "Invia proposta", and
   the panel says in one line why it cannot be pressed.
4. **D8 — the `ADMIN` branch is removed.** `ROLE_ADMIN` exists nowhere in
   `Backend/`; `roleFromRoles` maps only `ROLE_STAFF`/`ROLE_USER`. If the
   backend ever adds an admin role, the normaliser learns it in the same change.
5. **D3 — the `categories` prop is removed**, with its `nomeCategoria([], id)`
   fallback: the row already receives `categoriaNome` from
   `normalizeStaffDeletedServices`, and no caller ever passed the prop.

### Decisions taken without a question (evidence, not preference)

- **D2** — the `errors.form` banner is removed from `ReportReviewSheet`:
  `validateReview` only ever writes `outcome`/`note`, and request failures on
  `/staff` are already shown by `actionError`. Removing the banner changes no
  behaviour.
- **D1/D9/D4/D10** — pure deletions of exports with no call site
  (`getStaffUser`, `REVIEW_OUTCOMES`/`REPORT_STATUSES`/`USER_STATUSES` in
  `api/areas/staff.js`, `descriviVoce`, `rimuoviVoce`, `describeUser`, `isValid`)
  plus the one test block that asserted `isValid`. No test asserts any other
  removed export, so nothing is lost but the dead surface.
- **Exact copy** for F1 (used by both the rule and the screen, so no aliasing):

  | Case | Message |
  | --- | --- |
  | empty | `null` |
  | not `https://` + non-empty | `L'indirizzo dell'immagine deve iniziare con https://.` |
  | starts with `https://` but no host, or whitespace inside | `L'indirizzo dell'immagine non è valido: controlla di averlo copiato per intero.` |
  | longer than 2048 | `L'indirizzo dell'immagine può avere al massimo 2048 caratteri.` |

  The two messages live inside `photoUrlError`, unexported: the field error is
  the only place they are read. The 400 branch of `edit-profile.jsx` (line ~289)
  keeps its own local `PHOTO_HTTPS_MESSAGE`, because it explains a *server*
  refusal, not a client rule. Deliberately not shared: one sentence twice, in two
  modules, costs less than a cross-module constant that would make the profile
  lane depend on the validation lane.

## Success criteria

- `photoUrlError`: `http://…/a.jpg` → directive message; `https://cdn.example/a`
  (no extension) → `null`; 2049 chars → length message; `''` → `null`.
- A broken preview blocks the save and the screen says why next to the button.
- "Segnala" cannot be pressed without a person, and the line says so.
- `grep -rn "getStaffUser\|REPORT_STATUSES\|USER_STATUSES\|descriviVoce\|rimuoviVoce\|describeUser\|isValid" Frontend/src --include=*.js --include=*.jsx`
  returns nothing (bar the `isValid`-free validation module).
- No `ADMIN` branch, no `errors.form`, no `categories` prop in the staff
  components.
- Gate green; `docs/api.md` states the https-only rule; `docs/changelog.md` has
  the entry; row 1 of `audit.md` §3.0 is `DONE` — all in the closing commit.

## Exclusions

- `Backend/**` and `Context_and_DB_V2/**` — read-only, untouched.
- F3, F4 (backend/DB gaps G4, G20), F5, F6, C1, C3-C7 — cycles 2-4.
- D5, D6, D7, D11 — not named by this cycle; D11 explicitly "no action".
- No logout control in the web nav menu (§2.2): not part of this cycle.
- No `docs/backend-gaps.md` entry for the viewer IP a remote avatar exposes: it
  is a consequence already accepted by "pasted URL, no upload", and nobody would
  act on it now (decision 6).
