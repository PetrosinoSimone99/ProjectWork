# UX remediation — 2026-11-11

Companion to [`ux-audit-2026-11-11.md`](ux-audit-2026-11-11.md). This document
is the **triage**: every finding of that audit, classified as mechanical (the
fix is a specific code change, written out here) or directional (it needs a
design decision first, and the question it poses is written out here). No code
was changed by this pass; block 3 answers the directional half, block 4 writes
both halves.

## 1. Method, and what this pass is not

The audit produced 38 findings across five dimensions. The triage rule is one
sentence long: **if the fix can be written as `file:line` → exact change without
choosing between two acceptable outcomes, the finding is mechanical; if writing
it requires picking one of two defensible compositions, it is directional.**

Every mechanical row below carries the change, not a verb. Every directional row
carries the question and nothing else — no half-decided answer, because a row
that reads like a fix but leaves a choice open is how a cycle ends up with two
competing rules in the tree.

Three findings moved during triage:

- **F70** (the modal has no scroll region) and **F94** (the react-native-web
  overlay in the catalog's failure path) are mechanical, but F94 has no
  `file:line` yet: it needs the browser console stack, which the capture did not
  collect. It stays mechanical and blocked, and it is not silently merged into
  F70.
- **F72** (no refresh affordance on web) was mechanical in the audit and is
  **deferred**: the fix is not a line of code but a choice between a header
  action, a keyboard shortcut and a web-only `RefreshControl` shim.
- **F55** (the tab pattern has no `tabpanel`) was directional in the audit and
  stays directional: the cheap fix is to change the role to `radiogroup`, which
  is a decision about what those pills mean, not a patch.

Counts: **29 mechanical, 9 directional.** Severity is the audit's, unchanged; a
fix does not re-grade a finding.

## 2. Scores

Same table as the audit's §2, repeated here because this document carries the
status of every row and the two must not drift.

| Dimension | Weight | sev1 | sev2 | sev3 | sev4 | Score | Weighted |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Usability | 30 % | 2 | 1 | 1 | 0 | 7.6 | 2.28 |
| Accessibility | 25 % | 3 | 3 | 0 | 0 | 7.9 | 1.98 |
| States and copy | 15 % | 2 | 4 | 0 | 0 | 7.6 | 1.14 |
| Design system and visual coherence | 15 % | 3 | 13 | 1 | 0 | 1.4 | 0.21 |
| Platform and perceived responsiveness | 15 % | 1 | 4 | 0 | 0 | 7.8 | 1.17 |
| **Total** | 100 % | **11** | **25** | **2** | **0** | | **6.8** |

**6.8 / 10** on this pass's own arithmetic, from 9.9 recorded on 2026-11-10.
The audit's §2 explains why the two are not the same measurement: the 9.9 came
from a code-evidence re-measurement that never opened the app, and this is the
first pass that read the screens. The dimension that collapsed is the one the
earlier method could not see. What this document is responsible for is that the
number moves for the right reason from here: after the mechanical rows land, a
re-read must find those rows closed, and only the directional ones open.

## 3. Triage, one row each

### 3.1 Mechanical — 29 rows, the fix written out

`wave` is the execution order proposed in §5: 1 = loss and truth (a user is
misinformed or loses work), 2 = system (a shared rule, pairs with the visual
direction), 3 = deferred with the condition that unblocks it.

| id | sev | wave | files | the fix |
| --- | --- | --- | --- | --- |
| F44 | 3 | 1 | `Frontend/src/app/staff.jsx` | In `askConfirmation` (l.141-142) keep `setConfirm({...review})` and **remove** `setReview(null)`; on the confirm's cancel, `setConfirm(null)` and leave `review` standing so `ModalShell` reopens the sheet; on `confirmReview` success, clear both. No other file changes. |
| F46 | 1 | 1 | `(tabs)/index.jsx`, `(tabs)/offer-and-request.jsx`, `app/staff.jsx`, `app/staff-users.jsx` | Give the four success banners the dismiss the app already uses at `agreements.jsx:222-224`: `etichettaAzione="Ho capito"` plus the action that clears the message state. Same component, same call shape, four call sites. |
| F49 | 1 | 1 | `components/Banner.jsx` | Delete the 3 px `borderLeftWidth` and its colour (l.44-49). The icon and the kind word already carry the semantic. |
| F50 | 2 | 1 | `components/ServiceCard.jsx` | Compose the row's `accessibilityLabel` from the fields instead of the description alone: category, description, mode, place, publication date, author. One stop, everything the row shows is announced. (The structural alternative — card as a plain container with an inner pressable — is the directional version of the same fix and is not in this cycle.) |
| F54 | 1 | 1 | `components/ModalShell.jsx` | Make the close icon decorative (l.218-220): drop its `label`, keep the `Pressable`'s `accessibilityLabel`. One control, one name. |
| F56 | 2 | 1 | `components/PublicationsSection.jsx`, `app/(tabs)/offer-and-request.jsx` | Pass the section's own `errore` into `PublicationsSection` and render the empty state only when `voci.length === 0 && !errore` — the guard the comment at l.172 already claims. The caller has the error already; it is dropping it. |
| F57 | 2 | 1 | `app/staff.jsx` | Split the one `Promise.all` (l.80-96) into two loads with two `loading`/`error` pairs, so a failed reports call no longer makes the log card state "Registro non disponibile". |
| F58 | 2 | 1 | `app/(auth)/_layout.jsx`, `app/(auth)/login.jsx`, `app/edit-profile.jsx` | One owner for the transition: drop `<Redirect href="/" />` from the layout (l.9-10) and let `login` do `router.replace(ritorno)` (l.53-60), which already exists. In `edit-profile.jsx:169` write the real owner (`utente?.username` is `null` by construction on that line) — read it from the session before the `if (utente) return` guard, or move the save into the unmount path where `utente` is still set. |
| F60 | 1 | 1 | `app/(auth)/register.jsx` | l.461-463: the string is JavaScript, so `l&apos;account` prints as typed. Use `'…creare l'account.'` with the apostrophe escaped in the JS string. |
| F61 | 1 | 1 | `api/normalizers.js` or `app/staff.jsx` | Add `ACTION_LABELS`/`TARGET_LABELS` maps with a fallback to the raw value, and print through them at `staff.jsx:278-280`. Nothing else about the log changes. |
| F87 | 2 | 1 | `app/(tabs)/index.jsx`, `components/Banner.jsx` | Pass `etichettaAzione`/`onAzione` into the error banner (as `agreements.jsx:207-214` and `staff.jsx:200-208` already do) and delete the detached "Riprova" at l.262-268. The count line keeps its frame by not unmounting the section. |
| F90 | 1 | 1 | `app/(auth)/login.jsx`, `app/(auth)/register.jsx` | One auth shell: the same horizontal alignment and the same masthead in both, and the login's top offset becomes a centred block so the form is not anchored 24 px below the safe area with 300 px of air underneath. |
| F91 | 3 | 1 | `auth/auth-context.jsx`, `app/(auth)/login.jsx` | Set `motivoUscita` on the **boot** path too (l.40-48): when a stored token exists but `isTokenValid` rejects it, set the same reason the 401 path sets (l.67-73) before clearing. The login already renders it (l.95-99) with a dismiss; nothing else changes. |
| F92 | 2 | 1 | `components/PublicationsSection.jsx`, `services/offer-request.js` | Derive the cap line from the count instead of printing the constant next to a larger number: at or over `LIMITE_VOCI`, "Massimo raggiunto: sospendine o eliminane una delle N" (`testoConteggioVoci` already knows N). |
| F47 | 1 | 2 | `components/AppText.jsx`, `app/(tabs)/profile.jsx` | Drop the `display` role (one call site, the avatar initials, moves to `title`), fold `subheading` into `heading` at 19, and repoint the four `subheading` call sites on the profile. Seven roles become five. |
| F48 | 1 | 2 | `components/AppText.jsx`, `components/ServiceDetailModal.jsx`, `components/ServicesSection.jsx`, `components/ServiceCard.jsx`, `components/EntryCard.jsx`, `app/(tabs)/profile.jsx` | Add a `label` role (12 px, 600, sentence case) and move every prose use of `caption` onto it: the modal's warning sentence and the profile's image-error line are the two that must move; pills, chips and the count header keep `caption`. |
| F51 | 2 | 2 | `components/AppText.jsx`, `components/ServiceDetailModal.jsx`, `app/(tabs)/agreements.jsx`, `app/staff.jsx` | Add a `level` prop that emits `aria-level` next to `accessibilityRole="header"`: 1 for the screen title, 2 for a section title inside it, 3 for a card title. Default 2, and the three screens that nest headings pass theirs. |
| F52 | 1 | 2 | `components/Screen.jsx`, `components/WebNavMenu.jsx` | `role="main"` on the screen's content container, `role="navigation"` on the web menu's nav. Two attributes; no layout change. |
| F53 | 2 | 2 | `components/LoadingScreen.jsx`, `app/(tabs)/index.jsx`, `app/(tabs)/agreements.jsx` | Put the four loading surfaces in a polite live region (`accessibilityLiveRegion="polite"` plus `aria-live` on web, the same pair `Banner` already uses). |
| F70 | 2 | 2 | `components/ModalShell.jsx` | Give the panel `maxHeight` (85 % of the window) and put its body in a `ScrollView` with the header and the primary action outside the scroll area. |
| F71 | 2 | 2 | `components/ConfirmModal.jsx`, `components/AppButton.jsx` | Stack the two confirm actions when the row cannot hold both labels (a `useWindowDimensions` threshold, the pattern `agreements.jsx:477` already uses), and put `numberOfLines={1}` on the button label so a long verb cannot wrap inside a pill. |
| F80 | 2 | 2 | `components/Screen.jsx`, `components/ServiceCard.jsx`, `theme/tokens.js` | Fix the cap, not the column: centre the card inside its 1024 column (or set the catalog column to the card's 712), so a card never ends 260 px short of its own frame. Which of the two is decided in block 3 with F89; the mechanical half is that the three right edges become one. |
| F81 | 2 | 2 | `theme/tokens.js`, `components/Screen.jsx`, `components/Card.jsx`, `components/PublicationsSection.jsx` | Add one spacing role (32) for the gap between top-level sections, keep 16 between blocks and 12 inside a card, and use the role at the three places that today pass 16 for both jobs. |
| F83 | 2 | 2 | `components/EntryCard.jsx`, `components/AppButton.jsx`, `components/StaffUserCard.jsx` | One trailing action column instead of a wrapping flow: the destructive action keeps its own row by rule, not by accident, and `StaffUserCard`'s pair stops being ragged at 360 because both labels are bound to one line. |
| F85 | 2 | 2 | `components/PillBar.jsx` | Make the chip row a horizontal scroll row so five statuses never break 4+1 at 390 while fitting one line at 1280. The "one choice device" half belongs to F88/F82 and stays directional. |

### 3.2 Directional — 9 rows, the question each one poses

| id | sev | the design question, in one sentence |
| --- | --- | --- |
| F45 | 2 | Does the filter bar mark text that has been typed but not applied — a pending state on the field and in the "N attivi" summary — or does every control apply itself and the difference between typed and applied disappears? |
| F55 | 1 | Are the filter pills and the three agreement sections a `tablist` (and then something must play `tabpanel` and answer the arrow keys), or are they a `radiogroup` of mutually exclusive filters, which is what `ThemeSelector` already uses for the same job? |
| F59 | 2 | May a broken avatar URL block an unrelated save, or does "never save a broken URL" apply to the image field only, with the rest of the form still saveable? |
| F82 | 2 | What is the one anatomy of a card here — a title rank, a single meta line, one trailing action — and do an identity block, a settings row and a listing item deserve the same card at all? |
| F84 | 2 | Does the filter panel confirm once at its foot (and then the selects stop applying on touch), or does each control apply itself and the word "Filtra" becomes "Cerca" inside the field? |
| F86 | 2 | What must an empty state carry to be legitimate in this app, and which of the eleven call sites actually has an action to offer? |
| F88 | 2 | Where does the accent live: on the one action of the screen, on the one data mark, or on the four discs that all claim it today (nav, bell, brand, avatar)? |
| F89 | 2 | What is the second line under a page title for — what this screen is, or how to operate it — and does the title block become one shared component with it? |
| F93 | 2 | On a catalog card, which field is the headline: the person's sentence, or the category, and how many lines does the list give it? |

These nine are the input to block 3. They are also the reason the block exists:
eight of the nine would otherwise be answered twice, once per component, by
whoever touched it first.

## 4. The file count, counted

Union of the files the 29 mechanical rows touch:

```text
Frontend/src/components (16)  AppButton, AppText, Banner, Card, ConfirmModal,
                              EntryCard, LoadingScreen, ModalShell, PillBar,
                              PublicationsSection, Screen, ServiceCard,
                              ServicesSection, StaffUserCard, WebNavMenu,
                              ServiceDetailModal
Frontend/src/app (9)          (auth)/_layout, (auth)/login, (auth)/register,
                              (tabs)/agreements, (tabs)/index,
                              (tabs)/offer-and-request, edit-profile, staff,
                              staff-users
elsewhere (4)                 theme/tokens.js, services/offer-request.js,
                              api/normalizers.js, auth/auth-context.jsx
```

**29 modified, 0 new** for the mechanical half. The directional half adds
**1 new file** if F89 is answered with a shared header (`PageHeader.jsx`) and
touches the files the chosen direction names, capped at 8 by the plan.
Documentation: 1 new (this file), plus `docs/DESIGN.md` at close.

## 5. Scope: what fits in this cycle and what does not

The plan's block 4 was written before this triage existed and caps itself at 8
files: it was sized for the direction, not for 29 mechanical rows across 29
files. The honest split, which block 4 now has to carry in two parts:

- **Wave 1 — loss and truth (14 rows, 19 files).** F44, F46, F49, F50, F54, F56,
  F57, F58, F60, F61, F87, F90, F91, F92. Every one of these tells the user
  something false or destroys something they typed. None of them depends on the
  visual direction, and all of them survive it: a card anatomy (F82) or a page
  frame (F80) does not change whether a failed request is drawn as an empty list.
  One commit per 2-3 files, six commits, gate green on each.
- **Wave 2 — system (11 rows, 13 files).** F47, F48, F51, F52, F53, F70, F71,
  F80, F81, F83, F85. These are the rules the direction will re-use: type roles,
  spacing beats, the frame, the panel. Doing them before the direction is
  answering F82/F88 by accident.
- **Wave 3 — deferred (4 rows).** F72 (needs an affordance decision, not a
  patch), F73 (needs the page contract that says whether those lists ever
  append), F74 (needs a measurement before a `memo`), F94 (blocked on the
  console stack). Each carries its unblocking condition; none is closed.

**The scope question this triage puts to Andrea**: wave 1 is 19 files, more than
double the ceiling the plan set for block 4. Either block 4 runs as 4a (wave 1)
+ 4b (the direction, wave 2), which is the recommendation because wave 1 owes
nothing to the direction, or wave 1 is cut to the four rows that lose
information (F44, F56, F58, F91) and the other ten move to the next cycle.

## 6. Not verified — still open, and what it would take

Unchanged from the audit's §7, and repeated here because it decides which rows
can be closed by a re-read: the agreements bell panel (needs a seeded incoming
proposal), the rendered accessibility tree (F50, F51, F54), 200 % text on the
panels (F70), the confirm labels' wrapping at 360 (F71), the login transition
race (F58), the operations log's values (F61), F94's line (needs the console
stack), and iOS screen-reader behaviour.

## 7. Status of every finding

`open` = nothing has changed in the code. This table is the one that gets
updated at each block, so it starts honest.

| Finding | Sev | Kind | Wave | Status |
| --- | --- | --- | --- | --- |
| F44 review note destroyed by its own confirm | 3 | mechanical | 1 | open |
| F45 typed-but-unapplied filter text | 2 | directional | — | open |
| F46 four banners that never dismiss | 1 | mechanical | 1 | open |
| F47 seven type roles for four jobs | 1 | mechanical | 2 | open |
| F48 `caption` carrying prose | 1 | mechanical | 2 | open |
| F49 banner states its kind four times | 1 | mechanical | 1 | open |
| F50 catalog row announces only its description | 2 | mechanical | 1 | open |
| F51 headings without levels | 2 | mechanical | 2 | open |
| F52 no `main`, no `navigation` on web | 1 | mechanical | 2 | open |
| F53 loading outside any live region | 2 | mechanical | 2 | open |
| F54 close control names itself twice | 1 | mechanical | 1 | open |
| F55 tab pattern without `tabpanel` | 1 | directional | — | open |
| F56 failed request drawn as an empty list | 2 | mechanical | 1 | open |
| F57 reports error claimed as a missing endpoint | 2 | mechanical | 1 | open |
| F58 login transition has two owners, draft owner is `null` | 2 | mechanical | 1 | open |
| F59 broken avatar blocks an unrelated save | 2 | directional | — | open |
| F60 `l&apos;account` printed literally | 1 | mechanical | 1 | open |
| F61 operations log prints raw backend values | 1 | mechanical | 1 | open |
| F70 panel has no scroll region | 2 | mechanical | 2 | open |
| F71 confirm actions do not stack | 2 | mechanical | 2 | open |
| F72 no refresh on web | 2 | mechanical | 3 | open (deferred) |
| F73 staff lists not virtualised | 2 | mechanical | 3 | open (deferred, F42 of 2026-11-10) |
| F74 catalog re-renders on every keystroke | 1 | mechanical | 3 | open (deferred) |
| F80 no page frame at 1280 | 2 | mechanical | 2 | open |
| F81 one flat vertical rhythm | 2 | mechanical | 2 | open |
| F82 no card anatomy | 2 | directional | — | open |
| F83 action rows wrap and go ragged | 2 | mechanical | 2 | open |
| F84 the filter primary promises the wrong scope | 2 | directional | — | open |
| F85 three choice devices, and `PillBar` wraps | 2 | mechanical | 2 | open |
| F86 five empty-state treatments | 2 | directional | — | open |
| F87 retry detached from the failure | 2 | mechanical | 1 | open |
| F88 the accent is spent on chrome | 2 | directional | — | open |
| F89 no page header, subtitle used as a manual | 2 | directional | — | open |
| F90 the auth pair has no shared shell | 1 | mechanical | 1 | open |
| F91 dead session lands with no explanation | 3 | mechanical | 1 | open |
| F92 cap line contradicts the count | 2 | mechanical | 1 | open |
| F93 the clamped sentence vs the repeated category | 2 | directional | — | open |
| F94 react-native-web overlay in the error state | 2 | mechanical | 3 | open (blocked: console stack) |

## 8. Status after block 4a (wave 1) — 2026-11-11

Wave 1 was written in six commits, each green on `npx expo lint` and
`npx tsc --noEmit` before the commit:
`14f4f76` (F44, F57), `e61cf7a` (F56, F92), `1db4e43` (F58, F91), `4a37e99`
(F49, F50, F54), `303a944` (F46, F87), `720ba5a` (F60).

| Finding | Status | Where |
| --- | --- | --- |
| F44 review note survives its own confirm | **closed** | `staff.jsx` — the confirm's cancel restores the sheet from the copy it already holds |
| F46 four success banners dismiss | **closed** | `(tabs)/index.jsx`, `(tabs)/offer-and-request.jsx`, `staff.jsx`, `staff-users.jsx` — «Ho capito» like `agreements.jsx` |
| F49 banner states its kind four times | **closed** | `Banner.jsx` — the 3 px left rule is gone, the 1 px frame stays |
| F50 catalog row announced only by its description | **closed** | `ServiceCard.jsx` — the accessible name now carries category, mode, place, date and author |
| F54 close control names itself twice | **closed** | `ModalShell.jsx` — the icon is decorative again |
| F56 failed request drawn as an empty list | **closed** | `PublicationsSection.jsx` + `(tabs)/offer-and-request.jsx` — the section receives the error it was guessing about |
| F57 reports error claimed as a missing endpoint | **closed** | `staff.jsx` — two requests, two outcomes; `isEndpointUnavailable` keeps 404/501 as "not available" |
| F58 login transition had two owners, draft owner `null` | **closed** | `(auth)/_layout.jsx` (redirect removed), `edit-profile.jsx` (the last user is remembered before the session drops) |
| F60 `l&apos;account` printed literally | **closed** | `(auth)/register.jsx` |
| F87 retry detached from the failure | **closed** | `(tabs)/index.jsx` — inside the banner, like the other three error surfaces |
| F91 dead session lands with no explanation | **closed** | `auth-context.jsx` — the boot path sets the same reason the 401 path sets |
| F92 cap line contradicted the count | **closed** | `PublicationsSection.jsx` + `services/offer-request.js` (`testoLimiteVoci`) |
| F61 operations log prints raw backend values | **moved to wave 3** | the label map needs the backend's action vocabulary, which this cycle never read; printing a guessed vocabulary would be worse than printing the raw value |
| F90 the auth pair has no shared shell | **moved to 4b** | the shared masthead is `PageHeader`'s job and `PageHeader` is 4b's first file; doing it twice would create the drift the direction exists to remove |

12 of the 14 wave-1 findings are closed, 2 are re-homed with the reason
written above. Nothing in the 12 changed a token value, an interaction or a
component contract: the mechanical half of this cycle is invisible by design.
