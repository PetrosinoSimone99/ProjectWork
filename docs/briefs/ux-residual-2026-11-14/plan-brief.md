# Brief — Residual of the third UX audit (2026-11-14)

Contract for [`plan.md`](plan.md). One page; the plan is the execution truth.

## Objective

Close the residue of
[`audits/ux-audit-2026-11-13.md`](../../audits/ux-audit-2026-11-13.md) that is
mechanical: **F3, F7, F9, F10, F11, F12, F17** plus the §8 minor items named
below. The previous cycle (`71b09dd`) closed F1, F2, F4, F5, F6, F8, F13, F15,
F16, F18 and the F19 surface items; those are not re-opened and not re-counted.

No composition decision is taken here. **F14** (no desktop composition) and the
**F19 surface** items (dark-theme surface step) are out: they need a direction
doc, not a polish pass.

## State verified against the tree (not taken from the audit)

The audit's line numbers come from `c3442ba`. Every symbol was re-checked at
`71b09dd` and all of them exist with the stated shape:

| Finding | Verified facts at `71b09dd` |
| --- | --- |
| F3 | `PageHeader` used by `(tabs)/index.jsx:239`, `ServicesSection.jsx:92` (`variante="sezione"`), `StaffAreaGate.jsx:28`. Six back-navigable screens and three tab/auth screens still hand-build the title row: `edit-profile.jsx:316`, `staff.jsx:219`, `staff-users.jsx:238`, `report.jsx:83`, `agreements.jsx:206`, `offer-and-request.jsx:424`, `match.jsx:17`, `profile.jsx:221`, `register.jsx:341`. `occhiello` and `azione` have **zero** call sites. |
| F7 | Three sites still draw `Banner` + a detached `AppButton`: `edit-profile.jsx:327`, `staff-users.jsx:298`, `offer-and-request.jsx:453`. `profile.jsx` is already in-banner; `report.jsx:160` too. |
| F9 | `PillBar` active pill is `backgroundColor: t.primary` (`PillBar.jsx:71`). Two `PillBar` on `staff-users.jsx:267,:278`; one via `StaffStatusBar` on `staff.jsx:239`; `agreements.jsx:354` fills its own `SectionTabs` segment; `agreements.jsx:420` fills the bell FAB. |
| F10 | `pannelloAperto` at `FilterBar.jsx:81`, toggled only at `:135`; `applicaBozza` (`:88`) never closes it. `SOGLIA_LAYOUT_STRETTO = 480` already exists (`:24`). |
| F11 | The success `Banner` sits in `testata` (`index.jsx:244`), which is `ListHeaderComponent` (`ServicesSection.jsx:85`) of a virtualised list. |
| F12 | `PublicationsSection.jsx:26-31` and `:37-45`: each `vuoto.descrizione` repeats the clause already in `spiegazione` and says «Tocca «Aggiungi»». |
| F17 | `login.jsx:78` passes `wordmarkAsTitle`; `AuthShell.jsx:29,49` turns the wordmark into the H1. `register.jsx:339-341` already gives the task as H1. |
| §8.1 | `FilterBar`'s footer is «**sempre visibile**» (`FilterBar.jsx:359-362`) and carries «Azzera»; `index.jsx:196` adds a second reset in the empty state. |
| §8.2 | `report.jsx:94-105`: `EmptyState` centred, then a left-aligned `secondary` «Torna indietro» outside it. |
| §8.4 | `index.jsx:152-154` builds the empty-state body with `descriviFiltri`, which repeats the query already in the title. |
| §8.5 | `profile.jsx:221` H1 is the person's name; `match.jsx:17` H1 is «Match automatico». |
| §8.8 | `staff.jsx:217` and `staff-users.jsx:236` pass no `refreshing`/`onRefresh` to `Screen`. |

## Closed decisions

1. **Scope.** `Frontend/**` and `docs/**` only. `Backend/` and
   `Context_and_DB_V2/` read-only.
2. **No new component.** `PageHeader` gains one slot; nothing else is created.
3. **`occhiello` and `azione` are deleted** from `PageHeader`. No lane uses them
   and no call site ever did; keeping dead surface is what F3 asked to stop.
4. **No `impeccable` pass.** `detect` is already `[]` and every remaining
   finding is a decision, not a pattern. Lanes plus a fresh-context review
   replace it.
5. **Git stays with the parent.** Lanes share one tree, disjoint files, no
   `git` at all (mode (b): measured 4 lanes / 8 commits / green gate in
   `PW-01a1c79d`). Before each commit `git diff --stat` must equal the file set
   the lanes declared.

## Decisions taken here, corrected with one word

These three changed the file list the request carried. Each is defensible on a
fact, and each is reversible without re-doing the plan.

1. **F11 uses scroll-to-header, not a chrome slot.** The web bar has a fixed
   height (`ALTEZZA_BARRA` 48) whose reservation lives in `tokens.js:108` and
   `Screen.jsx:93-100`; a notice inside it needs `Screen.jsx` — a file the
   lane list did not carry — plus a second publish slot in `web-chrome.js`, for
   a confirmation that is momentary. Measured alternative: forward a `ref` to
   the `FlatList` in `ServicesSection.jsx` (2 lines) and scroll to offset 0
   when `propostaInviataA` becomes non-null. **Recommended: scroll-to-header.**
   `ServicesSection.jsx` replaces `WebNavMenu.jsx` + `hooks/web-chrome.js`.
2. **F9 is fixed once, in `PillBar.jsx`.** The active pill is the accent, and
   `PillBar` is the shared control behind `/staff` (`StaffStatusBar`),
   `/staff-users` (twice) and the staff review sheet. Tinting it there (the
   treatment `ThemeSelector.jsx:52` already uses: `serviceBg` + bold) fixes the
   finding centrally and leaves `agreements`' own `SectionTabs` as the only
   per-screen edit. `PillBar.jsx` becomes a **second shared file**, written and
   committed with `PageHeader` before any lane. Without it, F9 would split
   across two lanes and touch the same control twice.
3. **F3's `indietro` aligns the title only where a gutter exists.** Measured:
   body padding is `space.lg` (16) and `target.min` is 44, so an in-flow arrow
   pushes the H1 by 52. Pulling the row left by the arrow needs 52 of gutter,
   and the gutter is `(window − 560) / 2`: it is **zero at 390 and at 600**, so
   the title cannot reach the body edge on a phone without the arrow leaving
   the screen. The slot therefore pulls the row left by
   `min(52, max(0, (window − layout.maxContent)/2))`: exact alignment from
   ~664 px up (where the finding was measured, `desktop-1280-edit-profile`),
   today's offset on a phone, and no second layout mode or breakpoint.

## Success criteria

- The nine ad-hoc title rows are gone: every screen's H1 comes from
  `PageHeader`, exactly one per screen.
- No `BackButton` sits in a hand-built title row; no retry lives outside the
  `Banner` that failed.
- On `/staff`, `/staff-users` and `/agreements` the filled accent appears once
  per screen (data chips and the FAB count, track controls do not).
- Applying a filter closes the panel under 480 px and leaves it open above.
- The proposal-sent confirmation is visible from wherever the sheet was opened.
- One sentence per idea on `/offer-and-request`; «Seleziona», not «Tocca».
- Both auth screens name the task as their H1; `wordmarkAsTitle` no longer
  exists anywhere.
- `cd Frontend && npx expo lint && npx tsc --noEmit` green.

## Exclusions

F14, the F19 surface step, §8.3 (two centred notes in the detail sheet), §8.6
(two «Aggiungi» with different fills), §8.7 (form label role), §8.9 (evidence
notes). Also out: any new screenshot set, any `DESIGN.md` rewrite, any push to
`main`.
