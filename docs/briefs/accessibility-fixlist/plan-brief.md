# Brief — the seven accessibility defects of `check-2026-11-17`

One page. The plan is in [`plan.md`](plan.md), next to this file. Verified on the
tree (2026-11-17), not remembered.

## Objective

Close the seven items of
[`docs/audits/check-2026-11-17.md:163-190`](../../audits/check-2026-11-17.md)
("Accessibility — the fix list for the next session"), in `Frontend/` and
`docs/` only.

| # | Defect | Where |
| --- | --- | --- |
| 1 | A modal does not restore focus to the trigger and Tab is not contained | `components/ModalShell.jsx:136-175` |
| 2 | Every button label is truncated at 200 % text; the tab bar pins `fontSize: 11` | `components/AppButton.jsx:64`, `app/(tabs)/_layout.jsx:32` |
| 3 | Unread notification carried by colour only | `components/NotificationRow.jsx:104-118,149` |
| 4 | `accessibility.md` promises an extendable session; the banner has no action | `accessibility.md:67,180`, `components/SessionExpiryBanner.jsx` |
| 5 | Generic confirm label instead of the named action | `components/ConfirmModal.jsx:29`, `components/AgreementSheet.jsx:216` |
| 6 | No Enter-to-submit on the register form, unlike login | `app/(auth)/register.jsx:361-404` vs `login.jsx:115` |
| 7 | False claim "no test asserts roles and labels" plus a duplicated row | `accessibility.md:211,213` |

Defect 7's premise is confirmed: `components/__tests__/MessageComposer.test.js:38,70`
and `components/__tests__/AppErrorBoundary.test.js:92` assert a role and a label.

## Closed decisions

- **D1 (defect 4): the documentation is aligned, not the code.** `Backend/`
  has no renewal route: the JWT is `token_ttl: 3600`
  (`Backend/config/packages/lexik_jwt_authentication.yaml:5`) and no controller
  exposes a refresh; `useSessionExpiry.js:8-14` already states the fact. A
  button in `SessionExpiryBanner` would be a control that does nothing, which is
  the same defect class as the sentence it fixes. `2.2.1` becomes **partly**
  met, with the reason written down, never deleted.
- **D2 (defect 1): explicit Tab trap inside the panel plus focus restore.** Not
  `inert` on the background: `react-native-web` mounts `Modal` in a portal under
  `document.body`, so "inert everything else" would have to switch off every
  other body child — Expo Router's own roots included — and one wrong selector
  turns the panel off too. The trap lives in the panel, is local and is the same
  on every panel because all six panels use `ModalShell`.
- **D3 (defect 5): `etichettaConferma` loses its `'Conferma'` default** and
  becomes required. Eight call sites already name the act; only
  `AgreementSheet:216` does not. A default is what let the generic label come
  back in the first place.
- **D4 (defect 6): Enter submits from every register field**, the way
  `login.jsx:115` does, not just from the last one. The audit asks for
  "`onSubmitEditing` on all the inputs"; `handleSubmit` validates per field and
  lands the first error under its own input, so an early Enter explains instead
  of doing damage.
- **D5 (defect 3): the unread state keeps the accent border and the dot and
  gains the words «Non letta»**, in the header row next to the dot, and the
  words enter `etichettaApri` for the rows that can be opened (a `button` makes
  its descendants presentational, so an unread marker outside the label would
  be announced on the wrong rows only).
- **No new source module.** The trap stays inside `ModalShell`; no new suite, so
  the suite and test counts in `docs/frontend.md:138-159` stay true.

## Constraints

- `Backend/` and `Context_and_DB_V2/` are read-only; `Archive/` never.
- `accessibility.md` and `ux.md` are corrected, never weakened: a claim that
  becomes false is rewritten with the reason, not deleted.
- Structure English, contract Italian (D026). UI copy Italian.
- Gate: `cd Frontend && npx expo lint && npx tsc --noEmit`, plus jest on the two
  touched suites. `jest` is not in the gate (D019).
- G24/G25/G26 are backend gaps (`docs/backend-gaps.md`): read, not closed.

## Success criteria

1. All seven items checked against the code, each closed or explicitly `N/A`
   with the reason.
2. On the web build a panel keeps Tab inside and returns focus to the element
   that opened it; the native path (`AccessibilityInfo.setAccessibilityFocus`)
   is untouched.
3. No label in the app is clipped at 200 % text because of a component rule.
4. The two touched jest suites are green with assertions **added**, none
   relaxed.
5. `docs/accessibility.md` states no fact the tree contradicts, and
   `docs/changelog.md` carries the entry.

## Exclusions

- No screen-reader or device pass: this cycle is code plus the static checks.
- No new jest suite, no visual regression capture, no Playwright sweep.
- No change to `Backend/`, to the token TTL, or to any security gap.

## Baseline measured before the plan

- `npx expo lint` and `npx tsc --noEmit`: green.
- `npx jest`: 32 suites / 346 tests, green. One run showed two failures in
  `AgreementSheet.test.js` under full parallelism and three isolated re-runs
  were green: pre-existing flake, not caused by this cycle. Not "fixed" here.
- Working tree: five modified files from the previous session (`AGENTS.md`,
  `Backend/README.md`, `docs/audits/check-2026-11-17.md`, `docs/changelog.md`,
  `docs/decisions.md`), committed as block 0 below so the lanes start clean.
