# Brief — agreements workflow corrections

## Goal

Make the four rules below true in the product (frontend + backend), replacing
the directional assumptions of D027 where they no longer hold.

1. **Reciprocal proposal auto-accepts.** If A proposes to B while B already has a
   PENDING proposal to A, the exchange must not create a second agreement: the
   existing one becomes ACCEPTED for both sides and both see "In corso".
   Today it creates a second PENDING row, so one side sees an accepted exchange
   and the other still sees its own proposal waiting.
2. **The sheet leaves the card and lives in the chat.** An accepted agreement
   shows only "Apri chat" and "Annulla scambio". Inside the chat a button
   ("Crea accordo", or "Accordo" once a sheet exists) opens a modal that holds
   the sheet, with four things and nothing else:
   - `inizio`: when the proposal was accepted (the moment "In corso" appeared).
     Written by the backend, **hidden** from the user, shown `GG/MM/AAAA HH:MM`;
   - `fine`: when the sheet is accepted, the database timestamp. Written by the
     backend, **hidden** from the user, shown `GG/MM/AAAA HH:MM`;
   - what the sender offers or looks for, derived from the services that account
     already published (read-only, it cannot contradict them);
   - `descrizione`: the only field the user writes, for the place and the
     practical details of the exchange outside the app.
   The "Si svolge da remoto" checkbox disappears from the form: the remote flag
   comes from the sender's own service. **The first participant who sends the
   sheet locks the other**: the recipient can only accept or refuse it, never
   send a competing sheet, because all they have to add is their agreement on
   the extra details.
3. **One credit, one queue type at a time.** Every account has one credit and can
   hold one active queue at a time, of one type. A request queue costs the credit
   and no longer requires a completed offered delivery first (`QueueEligibility`
   is removed): "offering first" is not a rule of the product.
4. **One offer and one request per account, both mandatory, edit only.**
   Registration requires one offer **and** one request (today both are optional
   and an account can exist with no service at all). "Offro e cerco" loses
   suspend, delete and the "Eliminati" section: with both entries mandatory,
   suspending or deleting one would make the app unusable for that account. The
   owner can only modify them.

## Constraints

- `Backend/**` is read-only per `AGENTS.md`; this cycle touches it only under the
  explicit per-ship permission granted in the lock, and the exception is reported
  in `docs/changelog.md` for the backend maintainer.
- No data destruction: the slot rule stays one non-deleted service **per owner
  and type**, which the dump already enforces and every demo account already
  satisfies. No index is tightened, no row is deleted.
- Naming: structure English, contract Italian (D026). UI copy Italian.
- No emoji, no hardcoded secrets, every state explicit.
- The existing dumped schema stays the reference: only one new incremental
  migration, no replay of historical ones, no volume reset.

## Decisions closed in the lock

- Backend derogation: **yes** (Q1) — points 1, 2 and 3 cannot be delivered
  otherwise. Reported to the backend maintainer in `docs/changelog.md`.
- Sheet "offers/looks for": **derived from the sender's services**, read-only
  (Q2 = b).
- The "Si svolge da remoto" checkbox is **replaced by `descrizione`**, not kept:
  the remote flag is derived from the sender's service (Q5).
- `fine` = sheet acceptance timestamp and the exchange concludes right after
  (Q3). A completion notification carrying the details (counterpart, service,
  `inizio`, `fine`) goes to **both** participants at confirmation; the scheduler
  does not write a second one.
- One offer **and** one request, mandatory at registration, edit only (Q4).
- No type change, no data cleanup, no seed rewrite.

## Success criteria

- Two accounts proposing to each other end with **one** accepted agreement and
  the same state on both sides.
- An accepted agreement offers chat + cancel only; the sheet is reachable only
  from inside the chat, shows two automatic timestamps in `GG/MM/AAAA HH:MM`, the
  sender's published services and one description field; once one side sends it,
  the other can only accept or refuse.
- Confirming the sheet closes the exchange and both participants read a
  notification that names the counterpart, the service and the two timestamps.
- Registration refuses an account without one offer and one request; a request
  queue costs one credit and needs nothing else.
- No suspend/delete/restore control and no "Eliminati" section in "Offro e cerco".
- Gates: `expo lint`, `tsc --noEmit`, `jest`, backend SQLite suite (the 6
  MySQL-only `ReportControllerTest` errors excepted) and the MySQL workflow
  suite.

## Exclusions

- No push channel, no chat redesign, no new notification types.
- No staff surface changes beyond the owner-side 409 (staff restore stays).
- No type change of an existing service; no account cleanup; no seed rewrite.
