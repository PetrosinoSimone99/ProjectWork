# UX remediation — 2026-11-10

Re-measurement of the 43 findings of
[`ux-audit-2026-11-10.md`](ux-audit-2026-11-10.md) after the remediation session.
Same rubric, same severity scale, same arithmetic: the formula is the one in
[`PromptAuditUx.md`](PromptAuditUx.md) §5, so the count below can be redone line
by line. The baseline audit is left untouched; this file is the second reading of
the same build.

Plan and contract: [`../briefs/ux-score-8/plan.md`](../briefs/ux-score-8/plan.md)
and [`plan-brief.md`](../briefs/ux-score-8/plan-brief.md).

## 1. Method, and what this pass is not

**Date** 2026-11-10. **Branch** `andrea-frontend`. **Code changes** 7 commits on
top of `7263cf2` (the commit the baseline audited).

This pass is a **code-evidence re-measurement**, not a second live audit. Each
finding was reopened in the file it cites, the fix was read, and the claim kept
only if the code now does what the finding asked. The gate was run on the final
tree and on every commit separately:

```text
npx tsc --noEmit    -> clean, on each of the 7 commits (fresh worktrees)
npx expo lint       -> clean
npx jest            -> 37/37 tests, 2 suites
```

Not run in this pass, and therefore still open in §5: the Docker stack, the Expo
web server, Playwright, VoiceOver/TalkBack, native dynamic type, the 200 % reflow
on a device, the exported web build. Decision recorded in the brief (D5): the
runtime checks that need the slow PHP dev server were excluded on purpose, so
everything below that says "closed" means **closed in code**, and everything
that needs a running state stays listed as unverified. That is exactly the
distinction the baseline audit used, applied in the other direction.

The four writer lanes of the plan produced their own finding-by-finding report;
the parent reopened every citation below. Where a line number comes from a lane
report and the parent only confirmed the surrounding function, the row says so.

## 2. Scores

`dimension = 10 − (0.2·n1 + 0.5·n2 + 1.5·n3 + 3·n4)`, floor 0, capped at 5 when
the dimension holds a severity-4 finding.

| Dimension | Weight | sev1 | sev2 | sev3 | sev4 | Raw | Score | Weighted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Usability (heuristics + six principles) | 30 % | 0 | 0 | 0 | 0 | 0 | 10.0 | 3.00 |
| Accessibility (WCAG 2.1 AA, app) | 25 % | 0 | 0 | 0 | 0 | 0 | 10.0 | 2.50 |
| States and copy | 15 % | 0 | 0 | 0 | 0 | 0 | 10.0 | 1.50 |
| Design system and visual coherence | 15 % | 0 | 0 | 0 | 0 | 0 | 10.0 | 1.50 |
| Platform and perceived responsiveness | 15 % | 0 | 1 | 0 | 0 | 0.5 | 9.5 | 1.425 |
| **Total** | 100 % | **0** | **1** | **0** | **0** | | | **9.9** |

**Score: 9.9 / 10**, from 3.6. 42 of 43 findings closed, 1 open (F42, §3), no
severity 3 or 4 left.

Read the number for what it is, in the same spirit as the baseline's own caveat:
it is the audit's own count, and it is arithmetic on a list, not a certificate.
A dimension at 10.0 means "no finding of that dimension survives a code read",
not "conforms to WCAG AA": conformance needs the assistive-technology pass that
§5 still lists as not run.

## 3. Findings, one row each

`closed` = the code now does what the finding asked; `open` = it does not. The
severity is the one assigned by the baseline audit, unchanged: a fix does not
re-grade a finding, it closes it.

### Usability

| id | sev | St | Evidence |
| --- | --- | --- | --- |
| F01 | 3 | closed | `agreements.jsx:479` (pending decision state), `:586-600` (`ConfirmModal` naming the counterpart and the consequence before the call) |
| F02 | 3 | closed | `report.jsx:56,182-190` (confirm before the POST) and `:184` (the irreversible line, said **before** the send; `:115` keeps it after) |
| F03 | 3 | closed | `offer-and-request.jsx:128-130` (replacement state), `:244-251` (dirty test), `:507-515` (ConfirmModal: "Cambia e scarta") |
| F04 | 2 | closed | `services/offer-request.js:124-143` (`limiteRaggiunto`, honest counter), used by `EntriesSection.jsx:32` and `PublicationsSection.jsx:82,105` |
| F05 | 2 | closed | `CategorySelector.jsx:169-173` and `ListSelector.jsx:157-161` (the "Tutte le …" row), wired in `FilterBar.jsx` (`etichettaAzzera`) and `FilterBar.jsx:143-155` (the X clears only the text) |
| F06 | 2 | closed | `useServiceCatalog.js:169,193,217,239`: every discrete change rebuilds from `filtriApplicatiRef.current` |
| F07 | 2 | closed | `login.jsx:118` (submit disabled while empty), `register.jsx` (`puoInviare` + the rule written under the sections), `report.jsx:175-181`, `EntryForm.jsx:52-53,122`, `ReportReviewSheet.jsx` (no submit without an outcome) |
| F08 | 2 | closed | `ServiceDetailModal.jsx:206` (proposal is the only primary), `ModalShell.jsx:170-183` (the close is a 44 pt X), `PublicationsSection.jsx:90,116`, `profile.jsx:305` ("Esci" is a ghost) |
| F09 | 2 | closed | `ServiceDetailModal.jsx:213-215` (blind, non-binding proposal, decided by the other person) |
| F10 | 2 | closed | `FilterBar.jsx:46,75,85-101` (collapsed summary row, `aria-expanded`, note inside the panel) |
| F11 | 2 | closed | `staff-users.jsx:96-97` (`q` and `accountStatus` sent to the endpoint), `:147-160` (debounce), `descrizioneElencoVuoto` (three different empty states instead of one false claim) |
| F12 | 2 | closed | `agreements.jsx` bell panel: error branch is a `Banner` with `etichettaAzione="Riprova"`; the screen banner and its retry button are one element now |
| F13 | 1 | closed | `ReportReviewSheet.jsx:42` ("Esito e nota") vs `staff.jsx:307` ("Confermare questo esito?") |

### Accessibility

| id | sev | St | Evidence |
| --- | --- | --- | --- |
| F14 | 3 | closed | `AppInput.jsx:59-62` (`accessibilityLabel`, `nativeID`, `aria-invalid`, `aria-describedby`) and `:94-96` (error carries the id) |
| F15 | 2 | closed | `ModalShell.jsx:64-83`: `keydown` on web, `Escape`/`Esc`, removed on close; the six hosts are `ServiceDetailModal`, `ConfirmModal`, `CategorySelector`, `ListSelector`, `staff.jsx`, `agreements.jsx` (`grep -l ModalShell`) |
| F16 | 2 | closed | `ModalShell.jsx:86-104` (focus into the panel on open, `setAccessibilityFocus` on native), `:126-133` (backdrop `accessible={false}` + `aria-hidden` + `not focusable`), `:138-142` (`role="dialog"`, `aria-modal`, `tabIndex={-1}`) |
| F17 | 2 | closed | `PillBar.jsx:47`, `AppCheckbox.jsx:39`, `EntryEditor.jsx:103-104`, `FilterBar.jsx:96,146-151`, `ModalShell.jsx:177-178` — all `target.min` (44) |
| F18 | 2 | closed | `tokens.js:55` dark `primaryPressed` `#42966C`: 4.75:1 on `onPrimary` `#0D1F15`. **The baseline's suggested value was wrong** — `#3A8862` is *darker*, and against a dark label it lowers the ratio to 3.98:1; the pressed tone had to move up, not down |
| F19 | 2 | closed | `AppText.jsx:26-45` (title/heading/subheading/display carry `accessibilityRole="header"`), `ServicesSection.jsx:69,71`, `EntriesSection.jsx:47,49`, `PublicationsSection.jsx:153,155`, `staff.jsx:224,226`, `staff-users.jsx:302,304` (`list`/`listitem`) |
| F20 | 3 | closed | `app/+html.jsx:14` (`<html lang="it">`), with the documented Expo Router shell |
| F21 | 2 | closed | `ServicesSection.jsx:78` (one polite live region around the count row), `:53-59` (count and appended page written into it) |
| F22 | 2 | closed | `AppIcon.jsx` (decorative by default: `accessible={false}`, `accessibilityElementsHidden`, `aria-hidden`, `focusable={false}`), used in `EmptyState`, `ServiceCard`, `profile`, `agreements`, `AgreementCard`, `staff`, `WebNavMenu`, `FilterBar`, `login`, `report`, `Banner` |
| F23 | 2 | closed | `WebNavMenu.jsx:463-465` (`minHeight` around text), `agreements.jsx` badges (`minHeight` instead of `height`) |
| F24 | 1 | closed | `AppButton.jsx:77` (`opacity: 0.7`): 3.29:1 light, 3.60:1 dark for the disabled label |

### States and copy

| id | sev | St | Evidence |
| --- | --- | --- | --- |
| F25 | 3 | closed | `auth-context.jsx:34,70,99` (`motivoUscita` set on 401, cleared on a successful access), `login.jsx:31,93-99` (the line is shown on the login screen) |
| F26 | 4 | closed | `edit-profile.jsx:47` (module-level draft), `:148-158` (leaves the protected screen on a dead session with the return path), `login.jsx:31,45` (`ritorno` honoured after the new access) |
| F27 | 3 | closed | `client.js:32-49` (`STATUS_MESSAGES`, Italian, cause + next step); the server text is only kept in `ApiError.raw` for the log (`:112-118`) |
| F28 | 2 | closed | "il backend" removed from user copy (`register`, `report`, `match`, `staff`, `edit-profile`, `ServiceDetailModal`, `agreements`); "nello swipe" gone from `PublicationsSection` |
| F29 | 2 | closed | `profile.jsx:205-213`: the role is written as a word and only for staff; the `USER` enum no longer appears |
| F30 | 2 | closed | `client.js:18-20` and the `catch` at `:120-124`: timeout keeps its own sentence, a connection failure gets "controlla la connessione" |
| F31 | 2 | closed | `StaffUserCard.jsx:41,44` ("Sospendi"/"Riattiva"), `staff-users.jsx:288-300` (title and confirm name the outcome), `StaffReportCard.jsx:83,87` ("Esamina e chiudi"), `Banner` action labels in the screens |
| F32 | 1 | closed | `ServicesSection.jsx:53-56` (`N di M` from `paginazione.elementiTotali`, no number without the payload) |
| F33 | 1 | closed | `client.js:17` (`GENERIC_ERROR_MESSAGE`) exported and imported wherever the inline fallback was; `grep "Errore imprevisto"` is empty |
| F34 | 1 | closed | `staff.jsx:249-263`: loading, not-available (with the reason and a retry) and empty are three different states |
| F35 | 1 | closed | `edit-profile.jsx` (success replaces the route with `salvato=1`), `profile.jsx:154-161` (the confirmation, dismissible) |

### Design system

| id | sev | St | Evidence |
| --- | --- | --- | --- |
| F36 | 2 | closed | `ServiceCard.jsx` — the card text keeps its own measure inside the wide container |
| F37 | 2 | closed | `AppText.jsx:12-21` (`display` 30, `subheading` 17); the ad-hoc sizes in `profile`, `agreements`, `StaffUserCard` are gone |
| F38 | 2 | closed | One shell (`ModalShell`) for the six panels: header title + 44 pt X, actions in the panel, one backdrop |
| F39 | 1 | closed | `radius.pill` and `space.*` replace the literals in `login`, `profile`, `EmptyState`, `agreements`, `register` |
| F40 | 1 | closed | `WebNavMenu.jsx:343-350` (the active section in the panel header) and the button label carrying it |

### Platform and perceived responsiveness

| id | sev | St | Evidence |
| --- | --- | --- | --- |
| F41 | 2 | closed | `CategorySelector.jsx:117-139` (same search field as `ListSelector`), "Nessun risultato." at `:199` |
| F42 | 2 | **open** | The catalog is virtualised (`ServicesSection.jsx` is a `FlatList`, `index.jsx` mounts it under `Screen scroll={false}`). The two staff lists still render their rows inside `Screen`'s scroll view. Left open on purpose: those lists are a single server page of 50 rows with no append, so they do not grow, and wrapping them in `FlatList` meant moving ~90 lines of header JSX for no state that exists today. It is a recorded gap, not a silent one |
| F43 | 2 | closed | `useAgreements.js:52,166` (`esito` after every action), `agreements.jsx` success banner with a dismiss action |

## 4. What changed in the method, so the next reading is comparable

- **Two findings were closed in a different way than the baseline proposed.**
  F18: the suggested hex lowered the ratio (the pressed tone had to rise). F42:
  the catalog was virtualised, the two staff lists were not, because they have a
  fixed size today — see the row above.
- **One baseline finding was partly a spec, not a defect.** F05 asks for a
  "Tutte le …" row: the row exists in both selectors but only when the caller
  passes `etichettaAzzera`, because in registration and in the entry editor
  "Tutte le categorie" would be wrong copy. It is wired where it belongs
  (`FilterBar`), disabled by default everywhere else.
- **The verification ceiling is unchanged and explicit.** Every "closed" above
  means "the finding no longer survives a code read with the gate green".
  Anything that needs a running screen is in §5, with what would verify it. The
  baseline and this pass are therefore comparable: same formula, same evidence
  statuses, same honesty about what was not executed.

## 5. Not verified — still open, and what it would take

Unchanged from the baseline audit §7 unless stated. These are the checks this
pass deliberately did not run (D5):

| Item | Why it is open | What would verify it |
| --- | --- | --- |
| Escape, focus and reading order on the six panels | needs a browser on the running web build | Playwright on the dev server: open each panel, press Escape, read `document.activeElement` |
| `lang="it"` on the exported build | only the source `+html` was read | `npx expo export --platform web` and inspect `index.html` |
| Live region audibility (filter count, appended page, save confirmation) | needs a screen reader | VoiceOver (iOS/macOS web) or TalkBack pass |
| Session expiry end to end (401 → login → return to the screen with the draft) | needs the backend answering 401 | the baseline's `page.route` recipe, plus a save in flight |
| 44 pt targets and 200 % text on a device | web zoom does not exercise native dynamic type | device with the system font scale at maximum |
| Contrast after the token change | recomputed by hand from the hex values (4.75:1 dark pressed, 3.29/3.60 disabled) | a contrast checker over the rendered palette |
| Staff `q`/`accountStatus` filters against the real endpoint | needs the stack | one search and one status pill on `/staff-users` |
| F42 for the two staff lists | see the row in §3 | `FlatList` there when those lists start appending pages |

## 6. Gate output on the final tree

```text
$ cd Frontend && npx tsc --noEmit      # clean
$ npx expo lint                        # clean
$ npx jest --silent                    # 2 suites, 37 tests, all passing
```
