# Plan — Residual of the third UX audit (2026-11-14)

Class **L**. Contract: [`plan-brief.md`](plan-brief.md) (objective, verified
state, closed decisions, the three corrected decisions, criteria, exclusions).
This file is the truth for execution; the chat summary is not.

`Stile: full`

## Why L and not M

18 files touched, 0 new, 3 lanes + 2 shared files + `docs/changelog.md`,
5 children, 1 human stop (this plan). Counting is derived from the blocks
below, not estimated: shared 2 (`PageHeader.jsx`, `PillBar.jsx`) + L1 6 +
L2 6 + L3 3 + `docs/changelog.md` 1 = 18. Wide fork on time: **~3-4 h**;
the count is the verifiable part, the duration is not.

---

## Blocks

- 0. Write the two shared files and commit them as the base every lane stands on: `PageHeader.jsx` gains the `indietro` slot (44 pt target, same row as the title, row pulled left by `min(target.min + space.sm, max(0, (window - layout.maxContent) / 2))` so the H1 lands on the body edge wherever a gutter exists) and loses `occhiello`/`azione`; `PillBar.jsx` marks the active pill with `t.serviceBg` + bold label + `t.primary` border, the treatment `ThemeSelector.jsx:52` uses, instead of filling it with the accent | files: Frontend/src/components/PageHeader.jsx, Frontend/src/components/PillBar.jsx | done: `grep -rn "occhiello\|azione" src/components/PageHeader.jsx` returns nothing; `grep -rn "backgroundColor: attivo ? t.primary" src` returns nothing; `PillBar` active state carries `serviceBg`; `(tabs)/index.jsx`, `ServicesSection.jsx`, `StaffAreaGate.jsx` still render unchanged; gate green; one commit `refactor: give the page header a back slot and the pills a tinted selection` | Stato: TODO
- 1. Lane L1 — F3, F7, §8.2, §8.5, §8.8 on the six screens L1 owns: every title row becomes `<PageHeader titolo=… [frase=…] [indietro={<BackButton />}] />` with no hand-built `flexDirection: 'row'` around it; the two detached retries move into their `Banner` via `etichettaAzione`/`onAzione`; `report.jsx`'s empty state carries its own action; `/profile` and `/match` get the screen names the audit asks for; `/staff` and `/staff-users` pass `refreshing`/`onRefresh` to `Screen` | files: Frontend/src/app/staff.jsx, Frontend/src/app/staff-users.jsx, Frontend/src/app/edit-profile.jsx, Frontend/src/app/report.jsx, Frontend/src/app/(tabs)/match.jsx, Frontend/src/app/(tabs)/profile.jsx | done: `grep -n "flexDirection: 'row'" ` on the six files returns no title row; `grep -c "BackButton"` shows it only as `<PageHeader … indietro={<BackButton />} />`; `grep -n 'label="Riprova"' edit-profile.jsx staff-users.jsx` returns nothing; `report.jsx` has `etichettaAzione`/`onAzione` on `EmptyState` and no sibling `AppButton`; `profile.jsx` H1 is «Profilo», `match.jsx` H1 is «Match»; the two staff screens name `onRefresh` on `Screen`; gate green | Stato: TODO
- 2. Lane L2 — F10, F11, F12, F9 (agreements), §8.1, §8.4, plus the F3 and F7 sites that live in L2's files: `applicaBozza` closes the panel when `layoutStretto`; the proposal-sent `Banner` leaves `ListHeaderComponent` and the list scrolls to offset 0 on success through a `ref` forwarded to the `FlatList`; `PublicationsSection` loses the repeated clause and says «Seleziona»; `agreements` uses `PageHeader` and `SectionTabs` marks the active segment with `serviceBg` instead of the accent; the filtered empty state stops duplicating the footer reset and stops repeating the query in its body; `/offer-and-request` uses `PageHeader` and its list-error retry moves inside the `Banner` | files: Frontend/src/components/FilterBar.jsx, Frontend/src/components/PublicationsSection.jsx, Frontend/src/components/ServicesSection.jsx, Frontend/src/app/(tabs)/index.jsx, Frontend/src/app/(tabs)/offer-and-request.jsx, Frontend/src/app/(tabs)/agreements.jsx | done: `grep -n "setPannelloAperto(false)" components/FilterBar.jsx` shows the close inside `applicaBozza`; `grep -rn "testata" src/app/\(tabs\)/index.jsx` no longer wraps the proposal banner; `grep -rn "Tocca" src` returns nothing; `grep -rn "backgroundColor: attiva ? t.primary" src/app/\(tabs\)/agreements.jsx` returns nothing; one «Azzera filtri» affordance on `/` (`grep -c azzeraFiltri` bounded to the footer path); `grep -n "descriviFiltri" src/app/\(tabs\)/index.jsx` is used only when the query is not already the title; no `AppButton label="Riprova"` outside a `Banner` on `offer-and-request.jsx`; gate green | Stato: TODO
- 3. Lane L3 — F17: both auth screens name the task as their H1 through `PageHeader`, and `AuthShell` stops owning the title — the wordmark is decoration on both, not a heading | files: Frontend/src/app/(auth)/login.jsx, Frontend/src/app/(auth)/register.jsx, Frontend/src/components/AuthShell.jsx | done: `grep -rn "wordmarkAsTitle" src` returns nothing; `login.jsx` and `register.jsx` each render `PageHeader` with the task as `titolo` and neither declares `level={1}`; `AuthShell.jsx` has no `level` at all; exactly one H1 per screen; gate green | Stato: TODO
- 4. Review at fresh context, two distinct angles (correctness / consistency with this plan), each returning P0/P1/P2 with `file:line` and a merge verdict | files: none (read-only) | done: two reports in hand, every P0 either fixed or explicitly accepted in chat; no finding silently dropped | Stato: TODO
- 5. Close: append the session entry to the changelog (what changed, why, files touched) in the same commit as the last code block, and re-run the gate on the final tree | files: docs/changelog.md | done: changelog entry dated 2026-11-14 names every finding closed and the two shared files; `git status --porcelain` clean; `cd Frontend && npx expo lint && npx tsc --noEmit` green on the committed tree; commits 2-3 files each, none of them `git add -A` | Stato: TODO
- 6. Push the branch (`andrea-frontend` only — `main` is never pushed from this cycle) | files: none | done: `git push origin andrea-frontend` succeeds, `origin/andrea-frontend` matches local, no force flag used | Stato: TODO

## Contratto delle lane

Given to every child verbatim by pointer (this file), never summarised:

- **Read the brief and this block before editing.** `plan-brief.md` is the
  contract; § "Decisions taken here" is already decided, not up for negotiation.
- **Stop before the first edit if a symbol contradicts the plan.** Check with
  `grep` that every symbol and signature named for your files exists. If it does
  not, change nothing and report the two lines side by side. Aliasing a missing
  symbol to make the plan fit is the defect, not the fix. Provenance: a symbol
  that lives in the repo is `PATH:line`; one named only by this plan is NOT a
  contradiction to stop on.
- **`git` is forbidden.** No `add`, `commit`, `stash`, `checkout`, `restore`,
  `switch`. The parent commits. Leave the tree dirty; report the files you
  touched.
- **Only your files.** A fix that needs a file outside your list stops and
  comes back to the parent — it does not widen the lane.
- **Style.** The minimum that closes the finding. No refactor, no new component,
  no rename, no reformatting of untouched lines.
- **Verification for your own files only** (`npx expo lint` on the touched
  paths, `npx tsc --noEmit` is the parent's gate): do not run the full gate and
  do not fix other lanes' files.

## Lanes

Shared, written and committed by the parent **before** any lane starts (block 0):
`Frontend/src/components/PageHeader.jsx` and `Frontend/src/components/PillBar.jsx`.
`docs/changelog.md` is the parent's, written at block 5.

Lane mode **(b) shared tree**: disjoint files, children never touch git, the
parent commits. Before each commit `git diff --stat` must equal the declared
file set — a lane that was cut leaves partial edits and that check is what
catches it.

| Lane | Block | Writes | Disjoint from |
| --- | --- | --- | --- |
| L1 | 1 | `app/staff.jsx`, `app/staff-users.jsx`, `app/edit-profile.jsx`, `app/report.jsx`, `app/(tabs)/match.jsx`, `app/(tabs)/profile.jsx` | L2, L3 |
| L2 | 2 | `components/FilterBar.jsx`, `components/PublicationsSection.jsx`, `components/ServicesSection.jsx`, `app/(tabs)/index.jsx`, `app/(tabs)/offer-and-request.jsx`, `app/(tabs)/agreements.jsx` | L1, L3 |
| L3 | 3 | `app/(auth)/login.jsx`, `app/(auth)/register.jsx`, `components/AuthShell.jsx` | L1, L2 |

All three lanes are launched in **one** `subagent({tasks: [...]})` call, payload
under 16 KB. Children: 3 lanes + 2 reviewers = **5**, the class-L ceiling.

## Per-finding card (`file:line` → the change)

Kept here so a lane needs no archaeology and a cold resume needs no chat.

- **F3** `edit-profile.jsx:316`, `staff.jsx:219`, `staff-users.jsx:238`,
  `report.jsx:83`, `agreements.jsx:206`, `offer-and-request.jsx:424`,
  `match.jsx:17`, `profile.jsx:221`, `register.jsx:339` → `<PageHeader>`; the
  `indietro` slot is `<BackButton />` on the six back-navigable screens, absent
  on the three tab/auth screens. The instruction sentence that lives in a
  subtitle (`agreements.jsx:209-210`, `edit-profile.jsx:320-322`) does not move
  into a `frase`: it goes to the empty state that needs it, or it goes away.
- **F7** `edit-profile.jsx:325-333`, `staff-users.jsx:296-304` (L1),
  `offer-and-request.jsx:452-459` (L2) → `Banner` gains
  `etichettaAzione="Riprova"` + `onAzione` + `caricamentoAzione`, the sibling
  `AppButton` is deleted. The categories retry at `offer-and-request.jsx:443`
  is not a `Banner` pair and stays as it is.
- **F9** `PillBar.jsx:71` (shared, block 0) and `agreements.jsx:354` (L2). The
  ATTIVO chip and the bell FAB are data marks and the screen's one accent: they
  stay.
- **F10** `FilterBar.jsx:88` → close the panel when `layoutStretto` (already
  computed at `:80`), leave it open above 480.
- **F11** `index.jsx:244-256` + `ServicesSection.jsx:85` → banner outside the
  list header; `propostaInviata` scrolls the list to offset 0.
- **F12** `PublicationsSection.jsx:26-31`, `:37-45` → one sentence per idea,
  «Seleziona «Aggiungi»» instead of «Tocca».
- **F17** `login.jsx:78`, `AuthShell.jsx:21-24,29,49`, `register.jsx:339-341`.
- **§8.1** `index.jsx:196` → the empty state keeps the sentence, the footer
  keeps the only reset (`FilterBar.jsx:359` calls it «sempre visibile»).
- **§8.2** `report.jsx:94-105` → action inside `EmptyState`.
- **§8.4** `index.jsx:152-154` → the body does not repeat the query that the
  title already shows.
- **§8.5** `profile.jsx:221`, `match.jsx:17` → «Profilo», «Match».
- **§8.8** `staff.jsx:217`, `staff-users.jsx:236` → `refreshing`/`onRefresh` on
  `Screen`, the same pair the screens already own.
