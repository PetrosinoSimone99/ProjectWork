# Plan — the seven accessibility defects of `check-2026-11-17`

Contract: [`plan-brief.md`](plan-brief.md). One field per step: `Stato:`
(`TODO` / `DONE` / `N/A`). `Stile: full`.

## How to resume

- First command: `git status --porcelain`. Modified files are the last block's
  work: read them, continue from there, do not restart.
- Then `grep '| Stato: TODO' docs/briefs/accessibility-fixlist/plan.md` and start
  from the **first TODO whose condition is true** (`N/A` is not a step to do).
- Gate before every push, from `Frontend/`: `npx expo lint && npx tsc --noEmit`,
  plus `npx jest src/components/__tests__/NotificationRow.test.js
  src/components/__tests__/AgreementSheet.test.js`.
- Environment traps: `jest` is not in the gate (D019) and
  `AgreementSheet.test.js` flaked once under full parallelism — re-run it before
  reading a red result as a regression. `tsconfig.json` has `allowJs` without
  `checkJs`: `tsc` is a syntax net, not a type check.
- Trap of intent: `ConfirmModal` has **eleven** call sites; every one names the
  act except `AgreementSheet.jsx:216` (the count in the first draft of this plan
  was eight: `QueueCard` and `NotificationRow` gained theirs in later refactors,
  20e19ff, 16f7891, 59f3f00). Removing the default (step 5) leaves no caller on
  it — the default is already dead code.
- First step to execute: 0 (the pending docs from the previous session), because
  every lane starts from a clean tree.

## Steps

- 0. Commit the five documentation files left modified by the previous session, as their own commit | files: AGENTS.md,Backend/README.md,docs/audits/check-2026-11-17.md,docs/changelog.md,docs/decisions.md | done: `feat`-free `docs:` commit exists, `git status --porcelain` clean, the commit touches exactly those five paths | Stato: DONE
- 1. Commit the contract and this plan | files: docs/briefs/accessibility-fixlist/plan-brief.md,docs/briefs/accessibility-fixlist/plan.md | done: one `docs:` commit with the two files, no other path in it | Stato: DONE
- 2. ModalShell: remember `document.activeElement` when the panel opens and restore it on close, and keep Tab inside the panel with an explicit trap (focusables collected from the panel node, wrap forward and backward, panel itself as the fallback) | files: Frontend/src/components/ModalShell.jsx | done: on `Platform.OS === 'web'` the keydown handler consumes Tab and moves the focus to the first or last focusable of the panel at the edges; the close restores the saved node if it is still in the document; the native branch (`AccessibilityInfo.setAccessibilityFocus`) unchanged; docstring updated with both behaviours and their reason | Stato: DONE
- 3. AppButton: drop `numberOfLines={1}` so a label wraps to two lines at 200 % text, and update the comment that justified the clamp; remove the fixed `fontSize: 11` from the tab bar label style, keeping the weight | files: Frontend/src/components/AppButton.jsx,Frontend/src/app/(tabs)/_layout.jsx | done: `grep -n numberOfLines src/components/AppButton.jsx` empty, `grep -n "fontSize: 11" "src/app/(tabs)/_layout.jsx"` empty, both files still pass `expo lint` | Stato: DONE
- 4. NotificationRow: the unread state carries the words «Non letta» in the header row next to the dot, and the words enter `etichettaApri` for the rows that can be opened | files: Frontend/src/components/NotificationRow.jsx,Frontend/src/components/__tests__/NotificationRow.test.js | done: an unread row renders the text «Non letta», a read row does not, the open label of an unread row contains it, the suite is green with two new assertions and none removed | Stato: DONE
- 5. ConfirmModal: `etichettaConferma` becomes a required prop (no `'Conferma'` default); AgreementSheet passes the named act | files: Frontend/src/components/ConfirmModal.jsx,Frontend/src/components/AgreementSheet.jsx,Frontend/src/components/__tests__/AgreementSheet.test.js | done: no default in the signature, `grep -rn "etichettaConferma" src` shows eleven call sites all naming the act, the suite green with the confirm pressed on the panel's own button instead of the string «Conferma» | Stato: DONE
- 6. register.jsx: Enter submits from the five text fields, the way login does | files: Frontend/src/app/(auth)/register.jsx | done: every `AppInput` in the form carries `onSubmitEditing={() => void handleSubmit()}`, `grep -c onSubmitEditing "src/app/(auth)/register.jsx"` is 5 | Stato: DONE
- 7. `docs/accessibility.md`: align 2.2.1 (`:67`, `:180`) to the fact that the expiry is announced and not extendable, with the reason and the `token_ttl` citation; collapse the duplicated automated-check row (`:211`, `:213`) into one corrected row that cites the tests which do assert roles and labels; update the status rows for 1.4.4, 2.1.2 and 1.4.1 to what steps 2-4 changed | files: docs/accessibility.md,docs/audits/check-2026-11-17.md | done: the file states nothing the tree contradicts, `:211`/`:213` are one row, no claim was deleted to make code pass | Stato: DONE
- 8. `docs/changelog.md`: session entry for this cycle (date 2026-11-17, above the previous entry) | files: docs/changelog.md | done: one entry naming the seven items, the files touched, the docs duty and the exclusion on Backend security gaps | Stato: DONE
- 9. Review at fresh context, three angles, one model per angle, on the cycle's commits | files: docs/briefs/accessibility-fixlist/plan.md | done: the Review section records the three verdicts and every P0/P1, or says a row is empty | Stato: DONE
- 10. Gate and push | files: — | done: `npx expo lint` and `npx tsc --noEmit` green, the two touched suites green, `git status --porcelain` clean, pushed to `andrea-frontend` (never `main`) | Stato: TODO

Lanes: five, disjoint files. Wave 1 (the session fan-out cap is four children per
wave): A, B, C, D. Wave 2: E. No lane may write the `shared` documents.

- **A** — step 2: `Frontend/src/components/ModalShell.jsx`.
- **B** — step 3: `Frontend/src/components/AppButton.jsx`,
  `Frontend/src/app/(tabs)/_layout.jsx`.
- **C** — step 4: `Frontend/src/components/NotificationRow.jsx`,
  `Frontend/src/components/__tests__/NotificationRow.test.js`.
- **D** — step 5: `Frontend/src/components/ConfirmModal.jsx`,
  `Frontend/src/components/AgreementSheet.jsx`,
  `Frontend/src/components/__tests__/AgreementSheet.test.js`.
- **E** — step 6: `Frontend/src/app/(auth)/register.jsx`.

`shared`: `docs/accessibility.md` and `docs/changelog.md` (steps 7-8) are one
writer, the father, **after** the wave — they describe what the lane did. No
lane may write them.

## Review

Three fresh-context angles on `01989d7..8cae595`, one model per angle.
`deepseek-v4.1-flash` on correctness, `deepseek-v4.1-flash` on security and
data, `glm-5.3-flash` on coherence with the brief.

Verdicts: **BLOCK** (correctness), **OK with notes** (security), **OK with
notes** (coherence). One P1 in each of two angles, both accepted and fixed in
this cycle:

1. **P1 correctness — the trap was in the bubble phase.** `react-native-web`
   calls `stopPropagation()` on the first line of its `TextInput` keydown
   handler, so a listener on `document` never saw a Tab pressed inside a field:
   in `ListSelector` and `CategorySelector` the search field is the last
   focusable when the filter matches nothing, and Tab walked out onto the page
   behind. Fixed by registering in the capture phase (`true`), which also covers
   Escape from a field (same seam, pre-existing).
2. **P1 coherence — `docs/frontend.md:138` said 346 tests.** The two new cases
   make it 348; the changelog had already admitted the drift. Both updated.

Accepted P2s: `handleSubmit` in `register.jsx` had no in-flight guard (a second
Enter fired a second `POST /register`), and an Enter with the categories still
loading complained about the missing entries instead of the categories. Both
fixed in one line each. Comments added by lane D to `AgreementSheet.test.js`
were Italian inside an English file (D026): translated.

Rejected, with the reason: a `__DEV__` warning for a missing `etichettaConferma`
(no live caller can produce it, and a runtime net for a JS-only prop is the kind
of code the plan excluded); a visibility check in `restoreFocus`
(`getClientRects().length`, no call site can hit it today) — both recorded by the
security angle as belt-and-braces. The security angle also asked about
`AGENTS.md`/`Backend/README.md` in the range: that is commit `206a80f`, step 0,
authorised in the previous session and reported in `changelog.md` for the backend
maintainer.

The angles could not run shell commands: the counts, the gate and the diff were
re-run by the parent after the fixes (32 suites, 348 tests, `expo lint` and
`tsc --noEmit` green).
