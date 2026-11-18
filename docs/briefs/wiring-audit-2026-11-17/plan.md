# Cycle 3 — Entry form integrity (F6, C3, C6)

## How to resume

- Gate (hard): `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest`. Red gate, no commit.
- This file is the truth; the chat is not. `grep '| Stato: TODO' docs/briefs/wiring-audit-2026-11-17/plan.md`
  and start from the first `TODO` whose condition holds (`N/A` is not work).
- Working branch: `andrea-frontend`. Push only here, never `main`. `Backend/` is read-only.
- Block 0 is already committed (`docs: plan for entry form integrity (F6, C3, C6)`): if it is missing,
  nothing else may run.
- Findings source: `docs/briefs/wiring-audit-2026-11-17/audit.md` §3.3; its row 3 of §3.0 flips to
  `DONE` in the same commit that closes this cycle, next to the `docs/changelog.md` entry.
- Trap: the `categoryIds` the normaliser already writes (`normalizers.js:266`) is the whole list; the
  form still edits one category. F6 keeps the list when the selection did not change — it does not
  invent a multi-select UI.
- Trap: `CategorySelector` has no `disabled` prop today; `AppInput` has `editable`, `AppCheckbox` has
  `disabled`, `ListSelector` has `disabled`. Only the first is new work.
- Trap: `EntryCard`, `PublicationsSection` and `EntryForm` are reached only from
  `(tabs)/offer-and-request.jsx`; `EntryEditor` is also used by `EntriesSection` on registration,
  which must keep working with no new prop.
- First block after this one: lane B (data layer, no UI) — it is the only lane that needs no prop
  contract and unblocks the closing test.

## Brief

**Objective.** The entry form tells the truth about what a write does and about what is possible
while one is in flight: an edit never silently reduces a multi-category service to one category
(F6), the whole form and every other row's actions are locked while a write is in flight (C3), and
suspend/delete stop depending on `GET /categories` succeeding (C6).

**Constraints.** `Frontend/` writable, `Backend/` read-only, no endpoint invented. Structure in
English, UI contract and copy in Italian (D026). Existing components win: the lock reuses the props
the components already have (`editable`, `disabled`) and only `CategorySelector` gains one. No emoji.
One state vocabulary: `Stato:` only. Every new prop is additive so registration and the home filter
keep compiling untouched.

**Closed decisions.**

1. **F6 is preserve-only, not a multi-select UI.** The single-category selector stays. `toUpdateBody`
   resends `entry.categoryIds` when the form's `idCategoria` still equals the row's first category
   (the user did not touch the field), and sends `[idCategoria]` otherwise. Picking a different
   category is a deliberate replacement of the whole list, and the card still displays one category.
   Multi-select is a product decision (does one exchange really sit in N categories? what does the
   home ranking do then?) that this cycle must not take on the way past.
2. **C3 is one lock for the whole screen.** A single derived value,
   `scritturaInCorso = salvataggio || azioneInCorso !== null || ripristinoInCorso !== null`, is
   computed in `offer-and-request.jsx` and passed down as `scritturaInCorso` to both sections and
   `EntryForm` as `bloccato`. It turns off: category field, mansione, remote checkbox, both location
   pickers, "Salva", "Annulla", "Aggiungi", and all three card actions. Restore buttons inside
   "Eliminati" keep their own `busyId` (unchanged): that list is a separate request and a separate
   state, as the screen already says.
3. **C6 is two reasons behind two switches.** `EntryCard` replaces `disabilitato` with
   `modificaDisabilitata` (needs categories: "Modifica" only) and `azioniDisabilitate` (a write is in
   flight: all three). "Sospendi/Ripubblica" and "Elimina" therefore work while `GET /categories` is
   failing; the helper line under the section heading already says that publishing and modifying are
   the disabled ones, so it stays true and unchanged.
4. **D5 is closed by F6** (`categoryIds` is read again). **D7 is closed** by keeping
   `form.voce.localita` derived from `provincia`/`comune` on every change in the screen, so a reader
   of the form state can no longer see a value from form-open. **D6 stays `N/A`**: splitting
   `nuovaVoce` into a registration-only shape changes the contract shared with «Offro e cerco» for no
   visible gain, and the `motivoObbligo`/`EntriesSection` half of it already died in the committed
   «no trash» change.
5. **Pinned prop contract for the lanes** (no lane renegotiates these names):
   `CategorySelector.disabled = false`, `EntryEditor.bloccato = false`, `EntryForm.bloccato = false`,
   `PublicationsSection.scritturaInCorso = null`, `EntryCard.modificaDisabilitata = false` and
   `EntryCard.azioniDisabilitate = false`.

**Success criteria.** (a) `updateService` on a row with `categoryIds: [3, 5]` whose selection is
still `3` sends `[3, 5]`; with the selection changed to `7` it sends `[7]`. (b) While a save is in
flight, no control of the open form is enabled and no card action is enabled. (c) With
`statoCategorie === 'errore'`, "Modifica" is disabled and "Sospendi"/"Elimina" are enabled on every
card. (d) `npx expo lint`, `npx tsc --noEmit`, `npx jest` green. (e) Row 3 of §3.0 in the audit and a
`docs/changelog.md` entry landed in the closing commit.

**Out of scope.** Anything under `Backend/`; the legacy-location clear on edit (documented decision,
`offer-request.js`); a multi-category display on the card; restore buttons inside "Eliminati"; D6;
F5, C1.

## Steps

- 1. Commit the pending «no trash / no №1» work as the cycle's base | files: `Frontend/src/app/(auth)/register.jsx`, `Frontend/src/components/EntriesSection.jsx`, `Frontend/src/components/EntryEditor.jsx`, `Frontend/src/components/EntryForm.jsx`, `docs/ux.md`, `docs/changelog.md` | done: gate green and the commit exists on `andrea-frontend` | Stato: DONE
- 2. Commit this contract and plan before any child runs | files: `docs/briefs/wiring-audit-2026-11-17/plan.md` | done: `git status --porcelain` empty and the plan is on `andrea-frontend` | Stato: TODO
- 3. F6: keep the untouched category list in the PATCH body | files: `Frontend/src/api/areas/services.js`, `Frontend/src/api/__tests__/services.test.js` | done: `toUpdateBody` with `{idCategoria: 3, categoryIds: [3, 5]}` returns `categoryIds: [3, 5]`, with `idCategoria: 7` returns `[7]`, and `updateService` sends that body through `apiFetch`; test green | Stato: TODO
- 4. C3: `CategorySelector` accepts `disabled`, `EntryEditor` accepts `bloccato` and forwards it to category field, mansione, remote checkbox | files: `Frontend/src/components/CategorySelector.jsx`, `Frontend/src/components/EntryEditor.jsx` | done: default `false` leaves both registration and `EntryForm` behaviour unchanged; flipped, the selector is not pressable, the mansione is not editable and the checkbox is disabled | Stato: TODO
- 5. C6: the card has two reasons, the section passes both | files: `Frontend/src/components/EntryCard.jsx`, `Frontend/src/components/PublicationsSection.jsx` | done: with `modificaDisabilitata` only "Modifica" is disabled; with `azioniDisabilitate` all three are; `PublicationsSection` passes `scritturaInCorso` to `EntryForm` as `bloccato`, to every card as `azioniDisabilitate`, and to "Aggiungi" | Stato: TODO
- 6. C3: `EntryForm` accepts `bloccato` and locks Salva, Annulla, both pickers | files: `Frontend/src/components/EntryForm.jsx` | done: with `bloccato` every control in the form is non-interactive and "Salva" carries `loading={salvataggio}` | Stato: TODO
- 7. Tests for the two locks | files: `Frontend/src/components/__tests__/EntryEditor.test.js`, `Frontend/src/components/__tests__/EntryCard.test.js` | done: `EntryEditor` with `bloccato` renders a disabled category field, a non-editable input and a disabled checkbox; `EntryCard` announces disabled exactly on the buttons the two props name | Stato: TODO
- 8. Wire the single lock and close D7 in the screen | files: `Frontend/src/app/(tabs)/offer-and-request.jsx` | done: `scritturaInCorso` computed once and passed to both sections; `form.voce.localita` equals `localitaDaVoce(voce)` after every province/comune change; `grep -c scritturaInCorso` proves one source | Stato: TODO
- 9. Close the cycle: changelog, audit row 3, docs touched | files: `docs/changelog.md`, `docs/briefs/wiring-audit-2026-11-17/audit.md` | done: row 3 reads `DONE`, changelog entry names F6/C3/C6 and the two closed `D` items, full gate green in the same commit | Stato: TODO

## Lanes

Wave 1, one `subagent({ tasks: [...] })` call, shared tree, children never run `git`:

- Lane B — data layer (step 3): `Frontend/src/api/areas/services.js`,
  `Frontend/src/api/__tests__/services.test.js` (new). Independent, no prop contract.
- Lane A — form lock (step 4): `Frontend/src/components/CategorySelector.jsx`,
  `Frontend/src/components/EntryEditor.jsx`.
- Lane C — card and section (step 5): `Frontend/src/components/EntryCard.jsx`,
  `Frontend/src/components/PublicationsSection.jsx`.

Wave 2, after wave 1 is committed:

- Lane D — form forwarding (step 6) and its test (step 7a): `Frontend/src/components/EntryForm.jsx`,
  `Frontend/src/components/__tests__/EntryEditor.test.js` (new).
- Lane E — card test (step 7b): `Frontend/src/components/__tests__/EntryCard.test.js` (new).

Shared / parent-owned (never two children at once):

- `docs/briefs/wiring-audit-2026-11-17/plan.md` (step 2, before wave 1).
- `Frontend/src/app/(tabs)/offer-and-request.jsx` (step 8, after wave 2: it consumes both prop
  contracts).
- `docs/changelog.md`, `docs/briefs/wiring-audit-2026-11-17/audit.md` (step 9).
