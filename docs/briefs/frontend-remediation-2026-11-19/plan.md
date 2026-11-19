# Plan — Frontend remediation from the full audit (class L)

## How to resume

- Gate (hard, per step): `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest --bail`.
  Red gate, no commit, no push.
- This file is the truth; the chat is not. `grep '| Stato: TODO' docs/briefs/frontend-remediation-2026-11-19/plan.md`
  and start from the first `TODO` whose condition holds (`N/A` is not work).
- Branch `andrea-frontend`. Push there only, gate green, never `main`, never `--force`.
- Block 0 is the only commit that may exist before any child launches. If block 0 is not in
  HEAD, nothing else runs.
- Findings source, do not re-derive: `docs/audits/full-audit-2026-11-18.md` §3/§4/§7 and
  `docs/audits/evidence/frontend-2026-11-18/assessment-*.md`. The audit's own command per
  step is in the §7 line; run `/impeccable <command>` for that step, not a substitute.
- Traps: (a) P1-5 already shipped — `D028`, `D030`, `AgreementCard.jsx:66-77`; step 7
  verifies, it does not rebuild. (b) `D029` SSE is live, so a focus refetch is a fallback
  and the optimize step decides the policy, it does not rip out polling blindly.
  (c) `AppText` spreads `{...props}` after `aria-level`, which is exactly how the 11 orphans
  are produced. (d) Playwright: two contexts maximum, one route per run, wait past Metro's
  first-visit compile. (e) Never pass `concurrency`; never one subagent call per lane.
- First block after this one: step 1 (harden A) — nothing else unblocks while a screen can
  still eat a 2000-character note.

## Triage

`L: 92 file (13 nuovi, di cui 73 sotto Frontend/ e 4 nuovi di codice), fino a 9 figli per ondata, 15 ondate (14 con figli, la 14 e' del padre), 6-9 ore totali`

## Steps

- 0. Commit the doc set + this contract as the baseline; file the seven assessments and the measurement log under `docs/audits/evidence/` | files: docs/audits/full-audit-2026-11-18.md,docs/audits/full-audit-2026-11-18-ship-prompt.md,docs/audits/evidence/frontend-2026-11-18/assessment-a.md,docs/audits/evidence/frontend-2026-11-18/assessment-b.md,docs/audits/evidence/frontend-2026-11-18/assessment-c-audit.md,docs/audits/evidence/frontend-2026-11-18/assessment-d-perf.md,docs/audits/evidence/frontend-2026-11-18/assessment-e-design-drift.md,docs/audits/evidence/frontend-2026-11-18/assessment-f-harden.md,docs/audits/evidence/frontend-2026-11-18/assessment-g-copy.md,docs/audits/evidence/frontend-2026-11-18/mobile-360.log,docs/changelog.md,docs/briefs/frontend-remediation-2026-11-19/plan-brief.md,docs/briefs/frontend-remediation-2026-11-19/plan.md,.gitignore | done: `git status --porcelain` empty except ignored `.impeccable/`; audit, evidence and contract in HEAD; `login-390.png` gone | Stato: TODO
- 1. harden A — work never dies: draft+return on every form route, chat 404 is terminal, chat send has a ref guard, the mention of the same word is one (`/impeccable harden`) | files: Frontend/src/auth/auth-context.jsx,Frontend/src/auth/__tests__/auth-context.test.js,Frontend/src/app/report.jsx,Frontend/src/components/AgreementFormModal.jsx,Frontend/src/components/__tests__/AgreementFormModal.test.js,Frontend/src/components/MessageComposer.jsx,Frontend/src/components/__tests__/MessageComposer.test.js,Frontend/src/hooks/useChat.js,Frontend/src/hooks/__tests__/useChat.test.js,Frontend/src/app/chat/[agreementId].jsx | done: a 401 mid-session returns to the same route with the typed text; `GET /chats/agreement/999999` shows the terminal empty state with a way out and no retry; two same-frame taps produce one POST (test with a mocked slow `sendMessage`) | Stato: TODO
- 2. harden B — irreversible actions guarded where they are taken (`/impeccable harden`) | files: Frontend/src/app/(tabs)/match.jsx,Frontend/src/app/(tabs)/__tests__/match.test.js,Frontend/src/app/(tabs)/agreements.jsx,Frontend/src/app/staff.jsx | done: `Ricerca` asks first and names cost+balance; a failed accept/refuse inside the bell panel shows the error above the rows; a failed staff save leaves the 2000-character note in the sheet | Stato: TODO
- 3. harden C — the accessibility floor (`/impeccable harden`) | files: Frontend/src/components/AppText.jsx,Frontend/src/components/AppInput.jsx,Frontend/src/components/StaffOperationsLog.jsx,Frontend/src/theme/tokens.js | done: zero `aria-level` on nodes whose role is not `header` (measured on `/` and `/profile`); a validation error is announced on native; staff log rows are >= the per-platform floor (44 iOS / 48 Android) | Stato: TODO
- 4. clarify A — one word for one object, first surfaces: account, entry, catalog (`/impeccable clarify`) | files: Frontend/src/app/(auth)/login.jsx,Frontend/src/app/(auth)/register.jsx,Frontend/src/components/TextLink.jsx,Frontend/src/app/(tabs)/index.jsx,Frontend/src/app/(tabs)/offer-and-request.jsx,Frontend/src/navigation/screen-titles.js,Frontend/src/navigation/__tests__/screen-titles.test.js,Frontend/src/components/EntryCard.jsx,Frontend/src/components/__tests__/EntryCard.test.js,Frontend/src/components/EntryEditor.jsx,Frontend/src/components/__tests__/EntryEditor.test.js,Frontend/src/components/EntriesSection.jsx | done: `Registrati`/`Crea account`/`Crea il tuo profilo` collapse to one phrase; `Mansione` gone; `Ricarica` gone in favour of `Riprova`; no emoji, no `1 di 1` on the entry editor | Stato: TODO
- 5. clarify B — one word for one object, the exchange: sheet, agreement, chat (`/impeccable clarify`) | files: Frontend/src/app/(tabs)/agreements.jsx,Frontend/src/components/AgreementSheet.jsx,Frontend/src/components/__tests__/AgreementSheet.test.js,Frontend/src/components/AgreementFormModal.jsx,Frontend/src/components/__tests__/AgreementFormModal.test.js,Frontend/src/app/chat/[agreementId].jsx,Frontend/src/components/ServiceDetailModal.jsx,Frontend/src/components/__tests__/ServiceDetailModal.test.js,Frontend/src/components/ConfirmModal.jsx | done: `scambio` in every sentence, `scheda di consegna` for the sheet, its button says what it does; the tab label uses the same word; tests assert the final wording | Stato: TODO
- 6. clarify C — high-stakes labels, the seven "Ho capito", the machine voice (`/impeccable clarify`) | files: Frontend/src/app/(tabs)/match.jsx,Frontend/src/app/staff.jsx,Frontend/src/app/staff-users.jsx,Frontend/src/components/Banner.jsx,Frontend/src/components/NotificationsSheet.jsx,Frontend/src/components/__tests__/NotificationsSheet.test.js,Frontend/src/components/UserServicesMiniCard.jsx,Frontend/src/components/__tests__/UserServicesMiniCard.test.js,Frontend/src/components/NotificationRow.jsx,Frontend/src/components/__tests__/NotificationRow.test.js,Frontend/src/components/EmptyState.jsx,Frontend/src/api/client.js,Frontend/src/api/__tests__/client.test.js | done: every label states the outcome, not the object; no "Ho capito" left; no `il server` sentence; the one English notification row is Italian; the clock inside an Italian date set is `it-IT` | Stato: TODO
- 7. shape — verify P1-5 is shipped, then P1-4: the trade is on screen before the decisive tap (`/impeccable shape`) | files: docs/briefs/frontend-remediation-2026-11-19/plan.md,Frontend/src/app/(tabs)/agreements.jsx,Frontend/src/components/AgreementSheet.jsx,Frontend/src/components/__tests__/AgreementSheet.test.js,Frontend/src/components/BarterPair.jsx,Frontend/src/api/normalizers.js | done: signed-off evidence that a `COMPLETED` row offers chat and no cancel, recorded in this file's step 7 note as `N/A` for "build a completion action"; the panel and its confirm name both services and both directions | Stato: TODO
- 8. bolder — draw the directional barter (`/impeccable bolder`) | files: Frontend/src/components/AgreementCard.jsx,Frontend/src/components/__tests__/AgreementCard.test.js,Frontend/src/components/BarterPair.jsx,Frontend/src/app/(tabs)/agreements.jsx,Frontend/src/app/chat/[agreementId].jsx | done: the card reads as who gives what to whom (two labelled columns), `/chat` names the counterpart and the exchange, no layout overflow at 375/412 measured on the running app | Stato: TODO
- 9. layout — the catalog row at 412 and the chat measure (`/impeccable layout`) | files: Frontend/src/components/ServiceCard.jsx,Frontend/src/components/Screen.jsx,Frontend/src/app/chat/[agreementId].jsx,Frontend/src/theme/tokens.js | done: the catalog row has one shape at 412 (meta tokens in a fixed grid, no per-card re-wrapping); the chat scrolls in the measure child, wheel over the gutters scrolls it | Stato: TODO
- 10. distill + colorize/quieter — four-option ceilings and the accent rule (`/impeccable distill`, then `/impeccable colorize`) | files: Frontend/src/components/FilterBar.jsx,Frontend/src/components/PillBar.jsx,Frontend/src/app/staff-users.jsx,Frontend/src/app/staff.jsx,Frontend/src/components/WebNavMenu.jsx,Frontend/src/components/AuthShell.jsx,Frontend/src/app/(auth)/login.jsx,Frontend/src/app/(auth)/register.jsx,Frontend/src/app/(tabs)/agreements.jsx | done: no decision point offers more than four visible options without a second level; the accent is spent once per screen on `/login`, `/register`, `/agreements` (measured: one filled primary per screen) | Stato: TODO
- 11. optimize A — the two unvirtualized lists, and a skeleton instead of a blank spinner (`/impeccable optimize`) | files: Frontend/src/app/(tabs)/agreements.jsx,Frontend/src/app/staff-users.jsx,Frontend/src/components/Skeleton.jsx,Frontend/src/components/Screen.jsx | done: `/agreements` and `/staff-users` scroll a `FlatList` with `windowSize`/`initialNumToRender`/`getItemLayout`; the previous list stays visible on a refetch; loading is a labelled skeleton with a live region | Stato: TODO
- 12. optimize B — media, motion, refetch policy (`/impeccable optimize`) | files: Frontend/src/app/(tabs)/profile.jsx,Frontend/src/app/edit-profile.jsx,Frontend/src/components/ProfileSummary.jsx,Frontend/src/components/__tests__/ProfileSummary.test.js,Frontend/src/components/WebNavMenu.jsx,Frontend/src/components/Avatar.jsx,Frontend/src/hooks/useAgreements.js,Frontend/src/hooks/__tests__/useAgreements.test.js,Frontend/src/hooks/useServiceCatalog.js,Frontend/src/hooks/usePagedList.js,Frontend/src/hooks/useChat.js,Frontend/src/hooks/__tests__/useChat.test.js | done: avatars use `expo-image` with cache+placeholder+sizing; the always-mounted menu animation sets `useNativeDriver: true` where the property allows it (or says why not); a focus refetch is a fallback next to the stream and does not re-pay the 4 s on every tab switch | Stato: TODO
- 13. adapt — tablet size classes (`/impeccable adapt`) | files: Frontend/src/theme/tokens.js,Frontend/src/components/Screen.jsx,Frontend/src/components/PageHeader.jsx,Frontend/src/hooks/useBreakpoint.js | done: one size-class source read by `Screen`/`PageHeader` on every platform (not only `Platform.OS === 'web'`), with a wide variant that uses the width instead of centering the 560 px column; verified at 768 and 1024 on web, native stated as source-only | Stato: TODO
- 14. audit — re-score what changed (`/impeccable audit`) | files: docs/briefs/frontend-remediation-2026-11-19/rescore.md | done: web and native re-scored on the same rubric as the 2026-11-18 audit, no dimension below its previous score, every unmeasured surface named as unmeasured, backend latency named as out of scope | Stato: TODO
- 15. polish + docs — the P3 sweep and DESIGN.md's own defects (`/impeccable polish`) | files: Frontend/src/components/DateField.jsx,Frontend/src/services/dates.js,Frontend/src/services/__tests__/dates.test.js,Frontend/src/auth/token-store.js,Frontend/src/components/NotificationRow.jsx,Frontend/src/components/UserServicesMiniCard.jsx,Frontend/src/app/user/[id].jsx,Frontend/src/components/PageHeader.jsx,Frontend/src/app/(tabs)/index.jsx,Frontend/src/app/(tabs)/profile.jsx,Frontend/src/app/chat/[agreementId].jsx,docs/DESIGN.md,docs/frontend.md,docs/accessibility.md,docs/ui-triage.md,docs/changelog.md | done: `DateField` mounted nowhere and deleted; one apostrophe style; one length rule for emoji; `it-IT` clock everywhere; card surfaces single-owned; DESIGN.md's three wrong table rows and the trailing-action contradiction fixed; changelog entry per block boundary | Stato: TODO

## Lanes

One wave = one `subagent({ tasks: [...] })` call, at most 8 children, one owner per file per
wave. `shared` files are touched by the parent before the wave and committed as its base.

- **Wave 1 (step 1, 6 children)**: A1 `auth-context.jsx`+test; A2 `report.jsx`+`AgreementFormModal.jsx`+test;
  A3 `MessageComposer.jsx`+test; A4 `useChat.js`+test; A5 `chat/[agreementId].jsx`.
  Shared: none. `useChat.js` is A4's alone (404 mapping and the send guard are one file).
- **Wave 2 (step 2, 3 children)**: B1 `match.jsx`+test; B2 `agreements.jsx`; B3 `staff.jsx`.
  Shared: none. B2 owns `agreements.jsx` for the rest of the cycle's waves that touch it.
- **Wave 3 (step 3, 3 children)**: C1 `AppText.jsx`; C2 `AppInput.jsx`; C3 `StaffOperationsLog.jsx`+`tokens.js`.
- **Wave 4 (step 4, 3 children)**: D1 `login.jsx`+`register.jsx`+`TextLink.jsx`; D2 `index.jsx`+`offer-and-request.jsx`;
  D3 `screen-titles.js`+test, `EntryCard.jsx`+test, `EntryEditor.jsx`+test, `EntriesSection.jsx`.
- **Wave 5 (step 5, 3 children)**: E1 `agreements.jsx`+`AgreementSheet.jsx`+test; E2 `AgreementFormModal.jsx`+test,
  `ConfirmModal.jsx`; E3 `chat/[agreementId].jsx`, `ServiceDetailModal.jsx`+test.
- **Wave 6 (step 6, 4 children)**: F1 `match.jsx`+`staff.jsx`; F2 `staff-users.jsx`+`Banner.jsx`+`EmptyState.jsx`;
  F3 `NotificationsSheet.jsx`+test, `NotificationRow.jsx`+test, `UserServicesMiniCard.jsx`+test;
  F4 `api/client.js`+test.
- **Wave 7 (step 7, 2 children)**: G1 `normalizers.js`+`BarterPair.jsx` (new, the trade shape);
  G2 `agreements.jsx`+`AgreementSheet.jsx`+test. Parent writes the `N/A` note for P1-5 in this file.
- **Wave 8 (steps 8-9, 4 children)**: H1 `AgreementCard.jsx`+test+T1's `BarterPair.jsx`; H2 `agreements.jsx`+`chat/[agreementId].jsx`
  (barter in the list and the chat header); H3 `ServiceCard.jsx`+`tokens.js`; H4 `Screen.jsx`+`chat/[agreementId].jsx`
  measure — H2 and H4 collide on the chat screen, so H4 runs in wave 9 instead.
- **Wave 9 (step 9 tail, 2 children)**: I1 `Screen.jsx`+`chat/[agreementId].jsx` (measure only); I2 `ServiceCard.jsx`+`tokens.js`
  (catalog row grid) if wave 8's H3 returned without it.
- **Wave 10 (step 10, 3 children)**: J1 `FilterBar.jsx`+`PillBar.jsx`+`staff-users.jsx`; J2 `staff.jsx`+`WebNavMenu.jsx`;
  J3 `AuthShell.jsx`+`login.jsx`+`register.jsx`+`agreements.jsx` (the accent rule).
- **Wave 11 (step 11, 2 children + 1)**: K1 `agreements.jsx`+`Skeleton.jsx` (new); K2 `staff-users.jsx`+`Screen.jsx`;
  K3 `Skeleton.jsx` review only if K1 and K2 both need the same API — then K1 owns it and K2 waits.
- **Wave 12 (step 12, 4 children)**: L1 `ProfileSummary.jsx`+test+`Avatar.jsx` (new); L2 `profile.jsx`+`edit-profile.jsx`;
  L3 `useAgreements.js`+test, `useServiceCatalog.js`, `usePagedList.js`; L4 `useChat.js`+test, `WebNavMenu.jsx`.
- **Wave 13 (step 13, 2 children)**: M1 `tokens.js`+`hooks/useBreakpoint.js` (new); M2 `Screen.jsx`+`PageHeader.jsx`.
- **Wave 14 (step 14, 0 children)**: parent runs the audit commands; writes `rescore.md`.
- **Wave 15 (step 15, 4 children)**: N1 `DateField.jsx` (delete)+`dates.js`+test; N2 `token-store.js`+`user/[id].jsx`+`PageHeader.jsx`;
  N3 `NotificationRow.jsx`+`UserServicesMiniCard.jsx`+`index.jsx`; N4 docs: `DESIGN.md`, `frontend.md`, `accessibility.md`,
  `ui-triage.md`, `changelog.md`. `shared`: the docs set is N4's alone; the parent writes the changelog line for the block.

## Report per step

Each child returns: files changed, the grep proof for its `done:` line, the gate output, and
anything it could not verify. A step closes `DONE` only with that report in the parent's hand;
`git diff --stat` must match the declared file list before the parent commits.
