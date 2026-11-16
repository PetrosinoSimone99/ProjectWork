# Piano — W2: notifiche e code navigabili verso l'accordo

Contract: this file (brief at the head, plan below). Style: `full`.
Source item: [`../../audits/frontend-gap-analysis-2026-11-16.md`](../../audits/frontend-gap-analysis-2026-11-16.md) §C W2 (line 238).
Branch: `andrea-frontend` (tree clean, 0 behind `origin/main`, 18 ahead of
`origin/andrea-frontend` at plan time).
One state field only: `Stato:`.

## Brief

**Obiettivo.** Two surfaces already hold the `agreementId` of the exchange they
talk about and throw it away: the notifications inbox
(`normalizeNotification` keeps the backend `data` object verbatim, so
`notifica.dati.agreementId` is there) and the queue cards (`normalizeQueue`
carries `agreementId` and the card already prints "Collegata a uno scambio").
W2 makes that id act: a tap on such a row lands on `/agreements`. A row with no
id stays exactly as it is today, inert, and nothing invents a destination.

**Vincoli.** `AGENTS.md` scope (`Backend/**` read-only — resolved below by
reading only); gate before push (`npx expo lint`, `npx tsc --noEmit`,
`npx jest`); push only to `andrea-frontend`; docs in the same commit as the code
they document; components stay "data and callbacks only" (no router inside
`NotificationRow` / `QueueCard`); Italian UI copy, no emoji, no literal colours.

**Fatti verificati (letti, non ipotizzati).**

- `Frontend/src/api/normalizers.js:538-560` — `normalizeNotification` keeps
  `dati: row.data` verbatim and comments that it "carries `agreementId`".
  `Frontend/src/api/__tests__/notifications.test.js:42` asserts `dati: { agreementId: 12 }`.
- `Backend/src/Manager/AgreementManager.php:98,111,196,225`,
  `Backend/src/Schedule/AgreementEndDateChecker.php:46`,
  `Backend/src/Manager/ChatManager.php:98` write `['agreementId' => …getId()]` —
  a PHP `int`, so the JSON value is a number: `Number.isInteger` is the right
  predicate and a string id is a backend anomaly, not a case to coerce.
- `Frontend/src/api/normalizers.js:633` — `normalizeQueue` already yields
  `agreementId: toIntegerOrNull(row.agreementId)`; `QueueCard.jsx:127` already
  renders "Collegata a uno scambio" on `coda.agreementId !== null`.
- `/agreements` exists as a tab route (`Frontend/src/app/(tabs)/agreements.jsx`)
  and reads **no** search params today (`no useLocalSearchParams` in that file).
- `NotificationRow` is 160 lines, `QueueCard` 157, `notifications.jsx` 93,
  `match.jsx` 339: every file is far under the 800-line ceiling, and the edits
  are additive (a `Pressable` wrapper + one prop each).

**Decisioni chiuse (lock, with the recommendation — confirmed or corrected
before code starts).**

1. **Target: `/agreements`, no id in the URL.** The tab reads no params, so
   `router.push({ pathname: '/agreements', params: { agreementId } })` would be
   a silently ignored param — worse than none. Opening the exact agreement needs
   param handling + expand/scroll inside the tab: a second work item, not this
   one. *(Recommended: yes — matches W2's own "done": "lands on `/agreements`".)*
2. **The `Pressable` covers the informational block, not the whole card.** The
   action buttons (`Segna come letta`, `Elimina`, `Annulla coda`) stay outside
   it: on `react-native-web` a click inside a nested `Pressable` bubbles to the
   outer one, so wrapping the card would make "Elimina" also navigate.
   *(Recommended: yes — smallest safe shape.)*
3. **Callback contract: `onApri`, components stay router-free.** The screens own
   `useRouter` and pass `onApri`; the row decides pressability from its own data
   (the same rule `ServiceCard` uses for `servizio.id`). Labels are fixed here so
   the two lanes cannot diverge: notification `Apri lo scambio di questa notifica`,
   queue `Apri lo scambio collegato a questa coda`.
   *(Recommended: yes — keeps both components testable without a router mock.)*
4. **Pressability predicate.** Notification: `Number.isInteger(notifica.dati?.agreementId)`.
   Queue: `coda.agreementId !== null` (already normalised, same condition as the
   existing "Collegata a uno scambio" line). No coercion, no string fallback.
   *(Recommended: yes.)*
5. **`QueueCard.test.js` as a new file.** The audit's `Ship:` line says
   "0 nuovi" because it only counted `NotificationRow.test.js`; the queue half of
   W2's done criterion has no test file today, and a lane cannot verify itself
   through a screen (no screen tests exist in this repo). *(Recommended: yes —
   1 new file makes the run 6 product files, still `M`.)*

**Criteri di successo.** (a) tapping a notification whose `data.agreementId` is an
integer lands on `/agreements`; (b) a row without it renders no button, no role,
and is announced as plain text; (c) the same from a queue card whose
`agreementId` is not `null`; (d) the three action buttons never navigate;
(e) `npx expo lint`, `npx tsc --noEmit`, `npx jest` green on the final tree;
(f) changelog entry + W2 `Stato: DONE` in the same commit.

**Esclusioni.** No deep link to a single agreement (needs tab param support, its
own item); no auto "mark as read" on tap; no chat entry point (W1); no change to
the normalisers; no new route; `docs/frontend.md` unchanged (the accessibility
rule there already covers role/label/state).

---

## How to resume

1. `git status --porcelain` first — modified files are the work in progress, not
   a reason to restart.
2. `grep '| Stato: TODO' docs/briefs/w2-agreement-links/plan.md` and start at the
   first `TODO` whose condition holds (`N/A` is not a block).
3. Gate, all three, from `Frontend/`: `npx expo lint`, `npx tsc --noEmit`,
   `npx jest`. Trap: `tsc --noEmit` is syntax-only (`allowJs` without `checkJs`,
   D010) — a green tsc is not type safety; the jest tests are the real net.
4. Trap: `jest` uses `jest-expo` + `testMatch: **/__tests__/**/*.test.js`, and the
   existing row tests render with `react-test-renderer` (`act` + `create`), not
   `@testing-library`. Follow `__tests__/NotificationRow.test.js` exactly.
5. Trap: never `git add -A`; commit only the paths named in the step.
6. First block to run: **1** (lane A) — the notification half is the one W2's
   "done" states first, and lane B depends on the same label convention only.

---

## Piano

- 0. Commit this plan as the contract | files: docs/briefs/w2-agreement-links/plan.md | done: `git show --stat HEAD` lists exactly that file and nothing else | Stato: DONE — `9207d24`, 140 lines, that file only
- 1. Lane A — the notification row becomes a button when `dati.agreementId` is an integer (Pressable around the header + message block, `accessibilityRole="button"`, label `Apri lo scambio di questa notifica`, `onApri` prop), and `notifications.jsx` passes `onApri={() => router.push('/agreements')}` | files: Frontend/src/components/NotificationRow.jsx,Frontend/src/app/notifications.jsx | done: `grep -n "onApri" ` finds the prop in the row and the caller in the screen; no `expo-router` import added to the component | Stato: DONE — `0718c3a`; predicate `Number.isInteger(notifica.dati?.agreementId) && typeof onApri === 'function'`, `Pressable` import only, `expo-router` grep in the component = 0
- 2. Lane A — the tests: an integer id gives exactly one pressable with that label whose press calls `onApri`; a missing/`null`/string id gives no such pressable and no role | files: Frontend/src/components/__tests__/NotificationRow.test.js | done: `cd Frontend && npx jest NotificationRow` green with the two new cases listed by name | Stato: DONE — `0718c3a`; 11 tests in the file. Correction: react-test-renderer re-exposes a `Pressable`'s a11y props on the composite layers and the host view, so "exactly one node" counts three: the case asserts one *actionable* node (label + role + handler)
- 3. Lane B — the queue card becomes a button when `agreementId !== null` (Pressable around the descriptor/chip/place block, label `Apri lo scambio collegato a questa coda`, `onApri` prop), and `match.jsx` passes `onApri={() => router.push('/agreements')}` while `Annulla coda` stays outside the Pressable | files: Frontend/src/components/QueueCard.jsx,Frontend/src/app/(tabs)/match.jsx | done: `grep -n "onApri"` finds both; the `ConfirmModal` path is unchanged | Stato: DONE — `ca9e098`; the cancel button and its modal sit outside the `Pressable`; the wrapper carries `style={{ gap: space.sm }}` because a new wrapper swallows the card's own `gap` (the plan forgot the spacing)
- 4. Lane B — `__tests__/QueueCard.test.js` (new): linked card exposes one button with the queue label calling `onApri`; unlinked card exposes none; `Annulla coda` never calls `onApri` | files: Frontend/src/components/__tests__/QueueCard.test.js | done: `cd Frontend && npx jest QueueCard` green (conditional on lock 5; `N/A` if the answer is no) | Stato: DONE — `ca9e098`; lock 5 answered yes; 3 cases, and the count is taken over rendered host elements only (`pulsantiRenderati`)
- 5. Commit lane A at its own boundary | files: the three paths of steps 1-2 | done: `git show --stat HEAD` matches those paths | Stato: DONE — `0718c3a`, exactly the three paths
- 6. Commit lane B at its own boundary | files: the three paths of steps 3-4 | done: `git show --stat HEAD` matches those paths | Stato: DONE — `ca9e098`, exactly the three paths (2 modified + the new test)
- 7. Docs in the same commit as the change they document: changelog entry (session start deltas, what landed, why, touched) and W2 `Stato: DONE` in the audit | files: docs/changelog.md,docs/audits/frontend-gap-analysis-2026-11-16.md | done: `grep -n "Stato: DONE" docs/audits/frontend-gap-analysis-2026-11-16.md` includes line 240's item; changelog head is the new entry | Stato: DONE — W2 is `Stato: chiuso` (2026-11-16) with both shas; the changelog head is the W2 entry
- 8. Gate on the final tree | files: none | done: `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest` all green, suite count reported in the changelog | Stato: DONE — re-run on the final tree after `59f3f00`: `expo lint` 0, `tsc --noEmit` 0, `jest` 19 suites / 240 tests (first run on the lane tree was the same 19/240)
- 9. Fresh-context review before the push | files: none | done: correctness / data+security / brief fit, P0/P1/P2 with `file:line`, a merge verdict; accepted fixes land in a commit before the push | Stato: DONE — two fresh-context reviewers, verdicts `MERGE WITH FIXES` and `MERGE`, no P0. The one P1 they agreed on (a fixed label silences the row's text for assistive tech, the F50 class) and the P2s worth closing (integer predicate on the queue half, pressed feedback, two doc sentences that said more than the code) are in `59f3f00`; the rest are recorded as accepted-open above
- 10. Push to the working branch only | files: none | done: `git status -sb` shows `andrea-frontend` 0 ahead of `origin/andrea-frontend`; `origin/main` untouched | Stato: TODO


### Correzioni dopo la review (2026-11-16)

Le due etichette fissate nel lock 3 non sono più stringhe fisse, e la review è il
motivo. Un `Pressable` con `accessibilityRole="button"` rende presentazionali i
suoi discendenti: con `Apri lo scambio di questa notifica` come unico nome, il
messaggio, il tipo e la data smettevano di essere annunciati **proprio sulle
righe apribili** — lo stesso difetto che `ServiceCard` ha chiuso come F50. Il nome
ora si compone dalle stringhe visibili (`Apri lo scambio di questa notifica:
<tipo, data, messaggio>`, `Apri lo scambio collegato a questa coda: <descrizione,
categoria, luogo, stato>`), e i test lo verificano.

Il lock 4 prevedeva `coda.agreementId !== null`; è diventato
`Number.isInteger(coda.agreementId)`, simmetrico alla metà notifiche, perché una
chiave assente sarebbe `undefined` e `!== null` la tratterebbe come collegata.
Comportamento identico oggi (`normalizeQueue` scrive sempre la chiave), foro
chiuso per il chiamante di domani.

Aggiunto anche il feedback di pressione della casa
(`opacity: pressed ? 0.7 : 1`, la forma di `ServiceCard`): senza, su nativo una
riga apribile era indistinguibile da una inerte.

---

### Lanes

- **lane A** (steps 1-2): `Frontend/src/components/NotificationRow.jsx`,
  `Frontend/src/app/notifications.jsx`,
  `Frontend/src/components/__tests__/NotificationRow.test.js`.
- **lane B** (steps 3-4): `Frontend/src/components/QueueCard.jsx`,
  `Frontend/src/app/(tabs)/match.jsx`,
  `Frontend/src/components/__tests__/QueueCard.test.js`.
- **shared** (father only, before or after the lanes): `docs/changelog.md`,
  `docs/audits/frontend-gap-analysis-2026-11-16.md`, this plan.
- No shared **code** file: the two lanes touch disjoint files and share only the
  convention fixed in lock 3. Shared tree, git forbidden to the children, the
  father commits steps 5-7.
- Not parallel-safe: nothing else in W2. W3 would overlap `AgreementCard.jsx`
  only if it took the agreement entry point, which it does not.

---

## Triage

`M: 6 file (1 nuovo), 2 figli, ~45-60 min` (audit estimated 4 files / 45 min;
the queue test file and the two extra screen edits move it to 6). Stop: 1
(plan + lock, this message).
