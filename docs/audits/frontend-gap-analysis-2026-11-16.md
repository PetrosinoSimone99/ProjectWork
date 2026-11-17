# Frontend gap analysis — 2026-11-16

Full-surface review of `Frontend/` against `Backend/` routes and `docs/`. Written to
be consumed by `/ship` one work item at a time: every entry carries its files, a
verifiable "done" criterion, its size class (S/M/L per `ship.md`) and what blocks
it, if anything.

Method: static reading of all 117 JavaScript files under `Frontend/src` (18.137
lines), cross-checked against every `#[Route]` in `Backend/src/Controller/`. No
product code was modified for this review; the tree has since grown one open
cycle (W5, see below). State at review time:

- Branch `andrea-frontend`: **16 commits ahead** of `origin/andrea-frontend`,
  0 behind; **258 ahead** of `origin/main`, 0 behind (main already merged in
  `153e26b`).
- Gate: `npx expo lint` green; `npx jest` **18 suites / 235 tests green** on the
  committed tree (the W5 cycle this review opened has since landed, `0e22832`
  and the fix after it; `npx tsc --noEmit` is syntax-only (D010).

Tiers follow `docs/ui-triage.md`: **Fact** (read out of the source, with
`path:line`), **Judgment** (a decision on whether the fact is wrong). Nothing
below is a hypothesis dressed as a fact; the three items that *are* hypotheses are
marked as such in section D.

---

## How this file is consumed

One work item per `/ship` run: copy the `Ship:` line of section C, nothing else.
`/ship` always re-triages, writes `docs/briefs/<slug>/plan.md` with its `Lanes:`
section, and **the plan is the truth for that run**; this file only decides what
comes next and what "done" means.

- `Stato:` is the only status field (`TODO` / `DONE` / `N/A`), and it is updated in
the same commit that closes the item. Nothing else here is rewritten afterwards.
- Classes follow `ship.md`: `S` = 1-2 files, no new file, no decision; `M` = 3-10
files or 1-3 h; `L` = multi-part or more than 10 files. **A new file always makes
the task at least `M`.** The `Ship:` line is a hint, not a verdict: `/ship`
re-triages before it plans.
- Block 0 of a run commits this file together with the plan. An uncommitted audit
is not resumable (the same rule `/ship` applies to `plan.md`).
- Items whose class forbids lanes say so; a rename or a repo-wide refactor is
never a lane.
- Every item closes with the repo gate green (`npx expo lint`, `npx tsc --noEmit`,
`npx jest`), docs in the same commit, a `docs/changelog.md` entry, and no
invented data.

---

## A. Backend surface the app never calls (Fact)

Verified by `grep` over `Frontend/src` and by reading the controller routes.
These are not "backend gaps": the routes work today and the app ignores them.

| Route | Source | Frontend |
| --- | --- | --- |
| `GET /chats/agreement/{id}`, `POST /chats/send-message/{chatId}`, `GET /chats/most-recent-message`, `GET /chats/check-new-messages/{id}` | `Backend/src/Controller/ChatController.php:26,49,86,108` | consumed since W1: `src/api/areas/chat.js` wraps all four and `src/app/chat/[agreementId].jsx` drives three — history, send, `check-new-messages` (whose cursor is the displayed id; `most-recent-message` only seeds an empty chat) |
| `GET /staff/services/deleted`, `POST /staff/services/{id}/restore` | `Backend/src/Controller/DeletedServiceController.php:34,52` | no API function in `Frontend/src/api/areas/staff.js`, no UI |
| `GET /staff/operations/{id}` | `Backend/src/Controller/StaffOperationController.php:55` | only the list is consumed (`listStaffOperations`) |
| `GET /staff/reports/{id}` | `Backend/src/Controller/StaffController.php:92` | zero: `StaffReportCard` renders the list row only |
| `GET /users/{id}/services` | `Backend/src/Controller/MarketplaceController.php:22` | consumed, but only inside the service popup (`ServiceDetailModal.jsx:207`) — no profile screen |

`GET /staff/services/deleted` and `POST /staff/services/{id}/restore` are listed in
`docs/api.md:211-216` as existing staff surface, so the documentation already
promises them and the UI does not deliver.

---

## B. Contradictions and defects (Fact + Judgment)

### B1. Copy that promises behaviour the backend does not perform — P1

`match.jsx:69`, the empty state of the Match tab:
«Una coda è un servizio che metti in attesa: il match automatico confronta le code
della tua località.»

The matching runs through `App\Message\QueueId` on the `async` transport, and
nothing consumes that transport in the local stack (`docs/setup.md`, G12's
neighbour: the scheduler has no worker either). A queue created from this tab
never produces a match locally. The sentence states in the present tense a
behaviour the stack does not perform.

Judgment: the sentence is not a lie about the *design*, it is a lie about the
*runtime*. Either it names the condition ("quando il motore di match è attivo …")
or the empty state says what the queue actually does today: it stands in a list
the backend will compare. Copy change, no logic.

### B2. `ServiceDetailModal` docstring contradicts its own code — P2

`ServiceDetailModal.jsx:34-38` still says the "what they offer and look for" block
is the declared gap G3 and that the box says it is not available. Line 207 mounts
`UserServicesMiniCard` with a real call. G3 landed 2026-11-15 (`docs/api.md`).
Judgment: stale docstring, no runtime effect, reads as a wrong statement about the
backend to anyone opening the file next.

### B3. `Screen.jsx` and `_layout.jsx` document a chat screen that does not exist — P2

`Screen.jsx:52` documents "le schermate con una barra ancorata in fondo (chat)" and
`bottomSpacing`; no chat screen existed under `src/app`. Recorded as F3 in
`docs/ui-triage.md`.
Judgment: **closed 2026-11-16 by W1** — the paragraph was kept and is now true:
`src/app/chat/[agreementId].jsx` is a `Screen` with a composer anchored at the
bottom and a reduced `bottomSpacing`, exactly the case it describes.

### B4. `docs/architecture.md` lists a directory that does not exist — P2

`docs/architecture.md:45`: `src/agreements/  agreement state rules (rewritten with
the new model)`. `Frontend/src/agreements` does not exist; the rules live in
`src/services/agreements.js`.
Judgment: a reader who trusts the tree looks in the wrong place.

### B5. `docs/frontend.md` understates the test suite — P2

`docs/frontend.md:120-126` says the suite covers "the pure modules" and that
`collectCoverageFrom` "is limited to those two modules". The JSON lists **three**
(`Frontend/package.json:55-59`), and 17 suites cover `api/`, `auth/`,
`components/` and `navigation/` too. Conversely the real hole is the opposite of
what the doc implies: **11 files in `src/hooks/` have zero tests**, and
`collectCoverageFrom` does not include them, so the reported 99% is measured on a
sample chosen by hand.
Judgment: the document measures the wrong thing and reads as a coverage claim.
W7 (2026-11-17) closed the hooks half of this: `useAgreements.js` and
`useServiceCatalog.js` went from 0% to 95.16%/90.69% statements and are now in
`collectCoverageFrom`. The wording in `docs/frontend.md:120-126` is still wrong
and is W8's to fix — the folder holds eight files with no test of their own, not
eleven, and the JSON lists five files, not two.

### B6. New code is written in Italian, against the repo's own rule — P2

`AGENTS.md` ("All new code is written in English … Italian names may exist only in
legacy modules") and `docs/frontend.md:24-28` ("New code is English from the
start"; D013 grants Italian identifiers only inside `api/` and `services/`, module
by module, as files are rewritten).

The newest code is Italian throughout:

- `app/(tabs)/match.jsx:20` `GATE_NEED_ONE`, `:62` `rimborsaUnCredito`, `:222`
  `codaAttiva`, `:291` `CreateQueueActions({ …, codaAttiva })`
- `components/QueueCard.jsx:71` `QueueCard({ coda, occupata, onAnnulla })`
- `hooks/useAgreements.js` `esegui`, `rispondi`, `azioneInCorso`, `eseguiAzione`
- `hooks/useNotifications.js` `elementi`, `nonLette`, `carica`, `elimina`

Judgment: this is not grandfathered legacy — the match tab and its card were
written on 2026-11-16. Either the rule is amended (D-something that accepts
Italian internals when the domain word is Italian) or the new files are renamed.
Silently having both is the defect. Note for planning: renames are **never** a
`Lanes:` item (`ship.md`: "Mai in lane: rinomine e refactor diffusi"), so W9 runs
single.

### B7. No error boundary on any route — P1

`grep -rn "ErrorBoundary\|componentDidCatch" Frontend/src` returns nothing. A throw
inside any render (a normalizer returning a shape a component does not expect, a
token payload that parses to `null`, a locale API missing on web) unmounts the
tree, and the user gets a blank screen with no way back except a manual reload.
Every data path in this app is explicit about loading/empty/error; the last one is
missing.
Judgment: one 30-line component in the root layout closes the only unhandled class
of failure. **Closed 2026-11-16** by W5 (`src/components/AppErrorBoundary.jsx`,
mounted around the `Stack` in `src/app/_layout.jsx`, `0e22832`).

### B8. 192 KB of location data is loaded on every home open — P1

`services/italian-locations.js:1` imports `./data/province-comuni.json` statically
(192 KB, 8.115 lines: 110 provinces, 7.894 comuni). `FilterBar` imports
`italian-locations`, and `FilterBar` is mounted by the home tab, so the whole
dataset is parsed on first paint for every user, including one who never touches
the location filter. Web builds pay it as download; native pays it as startup
work.
Judgment (measured, corrected 2026-11-16): the picker is **not** the only
consumer. The home tab renders `ServiceCard` → `localitaPerDisplay` →
`analizzaLocalita`, so the dataset is needed at first paint, not when a filter
opens. A `require()` inside an accessor is resolved by Metro at build time: no
byte leaves the chunk and the JSON does not leave the home route's module graph
— only the evaluation moves, by ~1 ms. **`npx expo export -p web` on 2026-11-16:**
the dataset sits in `__common-*.js` (736.675 B) shared by every route; it is
112.357 B minified, 41.591 B gzip; parsing that payload in V8 costs ~1 ms, and
the 110 province names alone weigh 1.225 B. Removing it from the initial payload
needs an async `import()` (async display functions) or dropping the canonical
spelling — both change behaviour. Closed as not worth it: W6, and the reason is
the measurement above.

### B9. Screens above the file-size rule — P3

`docs/frontend.md:35-38` asks for 200–400 lines typical, 800 ceiling, with the
stateful part moved into a hook. Today: `api/normalizers.js` 645,
`app/(tabs)/agreements.jsx` 644, `components/WebNavMenu.jsx` 600,
`app/(tabs)/offer-and-request.jsx` 528, `app/(auth)/register.jsx` 485,
`app/edit-profile.jsx` 476, `components/FilterBar.jsx` 445,
`services/offer-request.js` 439, `app/(tabs)/profile.jsx` 436, `app/staff.jsx` 428,
`app/staff-users.jsx` 406.
Judgment: no ceiling is broken, so this is a maintainability item, not a defect.
Split on the next touch, not before (ponytail).

### B10. Notification rows are not actionable, and the data to make them so is
already in memory — P1

`api/normalizers.js:556` keeps the backend `data` object verbatim
(`dati: { agreementId: 12, … }`), `docs/api.md` shows `data.agreementId` in the
payload, and no component reads `notifica.dati`. `NotificationRow.jsx` offers only
"segna letta" and "elimina". A user reads «Nuova proposta» and has to navigate to
the Accordi tab and find the row by hand.
Judgment: the join key is already normalised and thrown away. This is the cheapest
UX fix in the list.

### B11. A queue linked to an agreement cannot be opened from the queue — P2

`QueueCard` renders «Collegata a uno scambio» as text (`QueueCard.jsx`, the
`agreementId !== null` branch) and offers only "Annulla coda". `agreementId` is on
the row.
Judgment: the one useful action on that row is "go there".

### B12. One silently swallowed error, against the repo's own rule — P3

`hooks/useNotifications.js:166`: `catch {` with `setNonLette(null)` and no log
(`useUnreadCount`). `AGENTS.md` says "Never silently swallow an error — log,
surface, or escalate", and `api/client.js:131` already shows the accepted shape
(`console.warn` under `__DEV__`, message kept for repair, nothing on screen).
Judgment: the *behaviour* is right and documented (the profile row stays neutral);
the *logging* is the deviation. One line, folded into W10.

`Stato: chiuso` (2026-11-17) with W10: `useNotifications.js:192-198` is now
`catch (err)` and warns `[notifiche] conteggio non lette non riuscito` under
`__DEV__`, with the row still `null`.

---

## C. Work items

Ordered by value over effort. `Ship:` gives the class the triage would assign and
a paste-ready invocation; each item is a valid `/ship` brief on its own.

### W1 — Chat on an accepted agreement

`Stato: chiuso` (2026-11-16) — plan:
[`../briefs/w1-chat/plan.md`](../briefs/w1-chat/plan.md) (class `L` by the file
count: 21 touched, 10 new), contract in `plan-brief.md` next to it.

What landed, in the shape the audit asked for: `src/api/areas/chat.js`
(`82b22c0`), the message normaliser and the time formatter (`2cf1273`),
`MessageBubble` + `MessageComposer` (`0eff37d`), the "Apri chat" action on
`ACCEPTED` rows (`a3ee739`), `useChat` with a 15 s focus-only poll (`940f9b7`)
and `/chat/[agreementId]` registered in the `Stack` with `Chat` as its document
title (`ad39bfb`).

Three facts the run corrected against this item:

1. **`send-message` returns no row** — only `{success: {code, message}}`
   (`ChatController.php:49`). There is no message id to reconcile, so there is no
   optimistic bubble: the screen re-reads the history after the `200`.
2. **`check-new-messages` is global**, not per chat (`ChatMessageRepository.php:44-58`:
   `chat IN (:chats)`, `user != :user`, `id > :recentMessageId`). The client uses
   `most-recent-message` as the cursor and filters the answer by `chatId`; the
   user's own messages never come from it.
3. **None of the four routes checks that the caller participates**
   (`ChatManager.php:46` and `:78` read no user against `chat_participants`).
   Written up as `docs/backend-gaps.md` **G24**; the app does not widen the hole
   (only `ACCEPTED` rows of one's own agreements link to the chat) and cannot
   close it.

Two smaller ones: the composer clears the draft only when the send answers
`true`, so a rejected message keeps what was typed; and `useChat` carries the
only untested logic of the item (hooks tests are W7).

Close the last hole in the lifecycle: proposal → agreement → sheet → **chat** →
conclusion. Four authenticated routes exist and are unconsumed (A).

- New: `src/api/areas/chat.js`, `src/hooks/useChat.js`,
  `src/app/chat/[agreementId].jsx`, `src/components/MessageBubble.jsx` (or reuse
  `Card`/`AppText`), tests next to each.
- Edit: `src/api/index.js` (exports), `src/api/normalizers.js` (message row),
  `src/app/_layout.jsx` (route registration), `src/components/AgreementCard.jsx`
  (the "Apri chat" action on `ACCEPTED` rows only), `src/navigation/screen-titles.js`.
- Decisions to lock before coding: polling cadence for
  `GET /chats/check-new-messages/{recentMessageId}` (proposal: 15 s while the
  screen is focused, none on blur), optimistic send vs. refetch, empty state copy,
  what the sheet/chat relationship is (both live on the agreement).
- Done: an accepted agreement opens a chat, a message sent appears after reload,
  the counterpart's message arrives within one poll, loading/empty/error states
  all explicit, `expo lint` + jest green, `docs/api.md` and `docs/changelog.md`
  updated.
- Ship: `M: 8 file (5 nuovi), 5 figli, ~2-3 h` — one writer only, the files are
  interdependent, so no lane → `/ship "chat sull'accordo"`

### W2 — Notifications and queues navigate to their agreement

`Stato: chiuso` (2026-11-16) — landed in `0718c3a` (notification row),
`ca9e098` (queue card) and the review-fix commit that composed the two
accessible names; plan: `docs/briefs/w2-agreement-links/plan.md` (class
`M`, 6 files, 1 new).

What landed: `NotificationRow` wraps its informational block (header row plus
message) in one `Pressable` with `accessibilityRole="button"` and the label
`Apri lo scambio di questa notifica: <tipo, data, messaggio>` when
`Number.isInteger(notifica.dati?.agreementId)`,
otherwise it renders today's markup with no role and no label; `notifications.jsx`
owns `useRouter` and passes `onApri={() => router.push('/agreements')}`.
`QueueCard` does the same for the linked case (`Number.isInteger(coda.agreementId)`,
label `Apri lo scambio collegato a questa coda: <descrizione, categoria, luogo,
stato>`) and `match.jsx` passes the handler.
The action buttons (`Segna come letta`, `Elimina`, `Annulla coda`) and both
`ConfirmModal`s stay **outside** the pressable: on `react-native-web` a press
inside a nested pressable bubbles up, so wrapping the whole card would make the
destructive action navigate too.

What the labels cost, and why they are not fixed strings: a `button` makes its
descendants presentational, so a label like `Apri lo scambio di questa notifica`
silences the message, the type and the date **on exactly the rows that can be
opened** — the same defect `ServiceCard` had as F50. Both names are folded out of
the visible strings, and the tests assert that the composed name carries the row's
own text.

On the id type: `Notification`'s `data` is a Doctrine `json` column and all eight
backend writers (`AgreementManager`, `AgreementEndDateChecker`, `ChatManager`)
pass a PHP `int` or `?int`, so `Number.isInteger` hides no real case — the only
non-int possibility is `null` from `ChatManager`, correctly inert. On the queue
side the same integer predicate guards a key that is always present after
`normalizeQueue`, which does coerce a numeric string (`'7'` → `7`): the guard is
there for a missing or `undefined` value, not to reject the normaliser's own
coercion.

One fact the run corrected against the plan: react-test-renderer exposes a
`Pressable`'s accessibility props on the composite layers *and* the host view, so
"exactly one node with that label and role" counts three. `QueueCard.test.js`
counts rendered host elements only (`pulsantiRenderati`); `NotificationRow.test.js`
asserts the *actionable* node (prefix + role + handler), because a host filter
there would count the same press twice. And the sibling spacing inside the card
comes from the card's own `gap`, which a new wrapper swallows: both pressables
carry `gap: space.sm` plus the house pressed feedback
(`opacity: pressed ? 0.7 : 1`, as in `ServiceCard`) so a linked row is both
spaced and visibly pressable.

Honest limit: no deep link. `/agreements` reads no search params, so the tap
lands on the tab, not on the single agreement — opening it needs param handling
and expand/scroll inside the tab, a second work item.

### W3 — Public profile of another user

`Stato: chiuso` (2026-11-16) — plan:
[`../briefs/w3-public-profile/plan.md`](../briefs/w3-public-profile/plan.md)
(class `L` by the file count: 11 product files, 5 new), contract in
`plan-brief.md` next to it.

What landed: the row group moved out of the mini card into
`src/components/ServiceGroup.jsx` with a `limite` prop (`1ed4fe3`),
`src/components/ProfileSummary.jsx` for the identity block (`a857cc8`),
`src/app/user/[id].jsx` with the route and the `Profilo` document title
(`1393d07`), and the owner row of the service detail made openable through
`onOpenProfile` + the home's push (`136a332`).

Two decisions this item left open, taken before any code: the **agreement side
does not ship** (the rows still carry the counterpart's username only, `G6`; a
username → id lookup would mean paging the whole catalog client-side to invent a
mapping the backend does not offer) and therefore the screen takes an **id
only**. `AgreementCard.jsx` is untouched, and so is `UserServicesMiniCard.jsx`
beyond the extraction.

One fact the run corrected against the plan: the location goes through
`localitaPerDisplay`, because the own-profile screen and every card already
render it that way and one person's place must read the same everywhere. One
defect caught by the review of my own diff: a non-integer id sat on a loading
spinner that no answer could ever end — it now falls into «Profilo non
disponibile», the same state as a person the backend does not know.

The request as written, for the record:

- New: `src/app/user/[id].jsx`, `src/components/ProfileSummary.jsx` (or reuse
  `UserServicesMiniCard` + header), test.
- Edit: `src/app/_layout.jsx` (route), `src/navigation/screen-titles.js`,
  `src/components/ServiceDetailModal.jsx` (owner name → profile),
  `src/components/AgreementCard.jsx` (counterpart → profile, once G6 gives the id;
  before that, resolve by `username` from the proposal rows or leave as text),
  `src/components/UserServicesMiniCard.jsx`.
- Careful: `GET /get-agreements` rows carry **no user id** (G6), so the agreement
  side of this item is only possible if a username → id path exists. Decide
  explicitly: either the profile screen accepts `username` too and the app filters
  `GET /services`, or this item ships only the service-detail entry point.
- Done: from a service detail the owner's profile opens with name, location, bio,
  offers and requests; no invented fields; `404` (inactive/deleted owner) is an
  explicit state; loading/empty/error present.
- Ship: `L: 9 file di prodotto (4 nuovi), 4 lane su 2 ondate, ~1-2 h` → shipped
  as `ad4ceac..136a332`

### W4 — Staff: deleted services and per-report detail

`Stato: chiuso` (2026-11-17) — landed in `d7046c5` (API + tests), `38eff76`
(components) and `83e6396` (screen wiring), all behind the plan in
`docs/briefs/w4-staff-surface/plan.md` (class `M`, 11 files, 4 new).

What landed: the staff area now drives the four endpoints it documented but
never called. `listStaffDeletedServices` reads
`GET /staff/services/deleted` as `{servizi, paginazione}` where every row is
the normalised service plus `proprietario` and `categoriaNome` (the wire row
carries the category name, so the section needs no `GET /categories`);
`restoreStaffService` posts to `/staff/services/{id}/restore` behind a
`ConfirmModal` with `varianteConferma="primary"` — a restore is reversible, and
a red button would say the opposite — and the row leaves the list on the
reload after the success. `getStaffReport` opens the full report (reason,
reporter and reported with usernames, assignment and review trail) with the row
already in memory and a background refresh that degrades to «Dettagli non
aggiornati» instead of an empty panel; `getStaffOperation` gives the log rows a
`before`/`after` panel, which the list endpoint does not carry at all.

Three files were extracted instead of letting the screen pass the ceiling it
was given: `StaffOperationsLog` (rows are `Pressable`, their own F57-style
error states preserved), `StaffDeletedServicesSection` (loading, empty, error,
«Carica altri 20» — `limit` stops at 50, so one page cannot claim to show
themselves all) and `StaffDetailPanels` (both read-only panels). `staff.jsx`
still ends at **588 lines**, not under the 500 the plan wrote: with the three
surfaces in one route (reports, deleted services, log) plus two panels, the
only way under 500 was another component split, and the repo ceiling is 800.
That is a declared deviation, not a silent one — it is the one number this
item misses.

Non-staff behaviour needed no work: the route is registered for every session
and `StaffAreaGate` plus the mapped `403` already refuse it (`staff.jsx:314`).

Tests: 17 in `src/api/__tests__/staff.test.js` with `apiFetch` mocked — URL and
method, the built query, the normalised shape, `403`/`404` in Italian, an empty
answer as an empty list, `before`/`after` null when absent. Three reviewers
(correctness, security and data, brief coherence) read the cycle before the
push: Merge yes, no P0, and the accepted fixes went in `e211683` — stale-detail
guard per row, no load-more during a page-1 reload, dedupe on append, `daRemoto`
read instead of deduced, suspended restores shown as «Sospesa», `403` in
Italian on every call, redacted log keys. Gate: 28 suites / 315 tests,
`expo lint` and `tsc --noEmit` clean.

The request as written, for the record:

- Edit: `src/api/areas/staff.js` (`listStaffDeletedServices`,
  `restoreStaffService`, `getStaffReport`, `getStaffOperation`), `src/api/index.js`,
  `src/app/staff.jsx` (deleted-services section + restore behind `ConfirmModal`),
  `src/components/StaffReportCard.jsx` (open detail), `src/components/` new
  `StaffDeletedServicesSection.jsx` if the screen would pass ~500 lines.
- Done: a staff account sees deleted services across users, restores one and the
  row leaves the list; a report opens its full detail; non-staff never reaches it
  (`403` already mapped); tests for the new API function with mocked responses.
- Ship: `M: 7-8 file (2 nuovi), 4 figli, ~2-3 h` — if `staff.jsx` grows past 500
  lines it splits into two runs: (a) deleted services + restore, (b) report and
  operation detail → `/ship "area staff: servizi cancellati e dettaglio segnalazione"`

### W5 — Global error boundary

`Stato: chiuso` (2026-11-16) — landed in `0e22832` (plan, audit, boundary and
its mount in `_layout.jsx`, `DEBUG` logs removed) plus the follow-up commit that
made the retry test green and wrote this entry. Plan:
`docs/briefs/global-error-boundary/plan.md` (class `M`, 5 files, 2 new).

What landed: `AppErrorBoundary` (class, `getDerivedStateFromError` +
`componentDidCatch`) renders `ErrorFallback` when a route render throws, wraps
**only** the `Stack` in `src/app/_layout.jsx` so the nav menu and the session
banner keep working, `Riprova` resets the state and bumps a `Fragment` key so the
children are remounted, `Torna ai servizi` resets and then `router.replace('/')`,
the container carries `accessibilityRole="alert"`, the copy is Italian with no
technical detail, and the only log is `console.error` under `__DEV__`. Four tests
in `src/components/__tests__/AppErrorBoundary.test.js`.

What the red test taught (worth keeping): the first version of the retry test
used a child that threw on its first render only, and **it never reached the
boundary** — React 19 replays a render that throws at sync priority, so the
replay is the "second attempt" and it succeeded. A render counter is not a crash
condition. The test now throws from a module gate and crashes on
`renderer.update(...)` after the child mounted, so `Riprova` is proven to produce
a **second mount** (`useEffect` mount log 1 → 2), not a repaint.

Honest limit, restated from the plan: the test mounts the boundary itself, so it
does not prove that `_layout.jsx` keeps it mounted. That is the `grep` on the
layout plus the gate, nothing more.

- New: `src/components/AppErrorBoundary.jsx` + test.
- Edit: `src/app/_layout.jsx`.
- Copy: what happened, a "Riprova" that remounts, and a "Torna ai servizi" that
  resets to `/`. No stack trace on screen, the error to `console.error` in dev only.
- Done: a component that throws inside a route renders the fallback instead of a
  blank screen; the fallback is keyboard reachable and announced
  (`accessibilityRole="alert"`); `npx jest` green with no `DEBUG` log left.
- Ship: `M: 5 file (2 nuovi), 2 figli, ~1 h` → `/ship "error boundary globale"`,
  or directly `Esegui: docs/briefs/global-error-boundary/plan.md` (more precise:
  the plan already exists, so it resumes from its first `Stato: TODO`).

### W6 — Lazy-load the province/comune dataset

`Stato: N/A` (2026-11-16) — closed with a measurement, not implemented; see B8
for the numbers. The item's own constraint ("the refactor must not touch
semantics", API shape unchanged) makes the promised win unreachable: a
synchronous `require()` removes nothing from the chunk or from the home route's
module graph, and every other route that renders a location needs the dataset at
first paint. Reopen only if the display contract changes (a location shown
without canonical spelling, or an async formatter), which is a product decision,
not a refactor.

- Edit: `src/services/italian-locations.js` (module accessor that `require`s the
  JSON on first use, keeping the pure API identical), consumers if they import the
  data directly, and the three test files that exercise the module.
- Constraint: the public API of `italian-locations.js` must not change shape, and
  the existing 166-line test file must stay green unmodified apart from an
  optional warm-up call. Behavioural risk is real here: this module is pure and
  well tested, so the refactor must not touch semantics.
- Done: the JSON is absent from the home route's initial bundle (verify by reading
  the module graph, not by intuition), picker still resolves every province and
  comune, tests green.
- Ship: `M: 3 file (0 nuovi), 2 figli, ~1 h` →
  `/ship "caricamento lazy del dataset località"`

### W7 — Tests on the stateful layer

`Stato: chiuso` (2026-11-17) — plan:
[`../briefs/w7-hook-tests/plan.md`](../briefs/w7-hook-tests/plan.md) (class `M`:
three new test files, and the item as written was one file further along than it
knew — `useNotifications.test.js` had already been created by W10).

What landed: 25 tests in three files — `useAgreements.test.js` (9),
`useServiceCatalog.test.js` (11) and `src/app/(tabs)/__tests__/match.test.js` (5,
which renders the screen and presses the two create buttons by their
`accessibilityLabel`). Measured with `npx jest --coverage src/hooks/__tests__`:
**95.16% statements** on `useAgreements.js` (0% before) and **90.69%** on
`useServiceCatalog.js` (0% before), and `Frontend/package.json:55-61` now lists
both hooks in `collectCoverageFrom`. The suite went from 29 suites / 320 tests to
32 / 345, all green; no production file was touched.

Three things the item asked for that did not survive contact with the tree.
(a) `collectCoverageFrom` covers **the two hooks that have tests**, not
`src/hooks/**`: taken literally, 80% on the whole folder needs tests on eight
hooks this cycle did not touch, and a threshold on a folder nobody exercises is a
number, not a guard. (b) The **fourth new file** was `useNotifications.test.js`,
which W10 already created; it was left alone, so `useNotifications.js` (37%
statements) stays out of coverage. (c) **`useAgreements` has no internal
single-flight guard**: `eseguiAzione` (`useAgreements.js:97`) writes
`azioneInCorso` without checking whether it is already set, so "an action is
single-flight" is true only because `agreements.jsx:178,554` disables the
buttons. The tests assert what the hook does — the busy slot names the agreement,
the action reloads the list, a failure lands in `actionError` and keeps the rows
— and the guard was **not** added: that is a behaviour change on two taps, not a
test. Residual for a later item.

- New: `src/hooks/__tests__/useAgreements.test.js`,
  `useServiceCatalog.test.js`, `src/app/(tabs)/__tests__/match.test.js` (via
  `react-test-renderer`, already installed).
- Edit: `Frontend/package.json` `collectCoverageFrom` (the two covered hooks, not
  `src/hooks/**` — see (a) above).
- Target the three rules every hook claims to keep: a stale response never
  overwrites a newer one, a failed reload keeps what is on screen, an action is
  single-flight (see (c): only `match.jsx` carries that guard). `match.jsx`
  deserved its own test for the triple gate (`exactly one service of the type`,
  `hasActiveQueue`, in-flight) and it has one.
- Done: ≥80% statements on the two covered hooks — met, numbers above; tests
  described by behaviour not by number; no assertion relaxed to pass.
- Ship: `M: 5 file (4 nuovi), 2 figli, ~2 h` → `/ship "test sui hook critici"`

### W8 — Documentation drift

`Stato: TODO`

- Edit: `docs/architecture.md:45` (drop or fix `src/agreements/`),
  `docs/frontend.md:120-126` (real coverage story, and say plainly that the hooks
  are untested), `docs/ui-triage.md` (F3 stays open until W1),
  `src/components/ServiceDetailModal.jsx:34-38` and `src/components/Screen.jsx:52`
  (docstrings). Same item also amends `AGENTS.md`'s fake-data paragraph if it is
  still wrong on this branch (it is not: the repo copy at root already says the
  mode is gone — verify before touching).
- Done: no document describes a file, a directory or a coverage figure that the
  tree does not show.
- Ship: `M: 4-5 file (0 nuovi), 0 figli, ~30 min` — the class rises from `S` on the
  file count, not on time: no children, one turn does it →
  `/ship "allineamento documentazione"`

### W9 — English identifiers in the new files (needs a decision first)

`Stato: TODO`

- Edit: `src/app/(tabs)/match.jsx`, `src/components/QueueCard.jsx`,
  `src/hooks/useAgreements.js`, `src/hooks/useNotifications.js`, plus every import
  site and every test that names the old symbols.
- Two honest options, pick one before starting:
  (a) rename to English and keep the rule; (b) amend `AGENTS.md` + D013 with a
  decision that the UI-shape keys and their components stay Italian, and stop
  calling it a violation.
- Done: one of the two is recorded in `docs/decisions.md`, and the code agrees with
  it. Not a `Lanes:` candidate.
- Ship: `M: 6-8 file (0 nuovi), 2 figli, ~1-2 h` →
  `/ship "naming coerente nei file nuovi"`

### W10 — Unread count while the screen is open

`Stato: chiuso` (2026-11-17) — plan:
[`../briefs/w10-unread-polling/plan.md`](../briefs/w10-unread-polling/plan.md)
(class `M` and not `S`: the item asked for a fake-timer assertion and
`useNotifications` had no test file, so the work created one).

What landed, against the three points above: `useUnreadCount` now exports
`UNREAD_POLL_MS` (30 s, not the chat's 15: a badge is not a conversation), keeps
the interval inside `useFocusEffect` so a blur clears it, skips a tick when
`AppState.currentState` is not `'active'`, and reads once more on the `'active'`
transition instead of waiting a whole interval. `profile.jsx` was left untouched:
its copy (`:290-291`) never promised a live row, so there was nothing to correct.
The inbox needed no work — it uses `useNotifications`, so "no polling on the inbox
screen" was already true by construction. The B12 line is closed above.

Two facts the item did not know: `Frontend/src` had **zero** `AppState` hits, so
the guard had no existing helper to reuse; and the failure path stays as
specified — the row goes neutral on a bad count, which is the documented
behaviour and not a regression introduced here. Five tests in
`src/hooks/__tests__/useNotifications.test.js` pin the whole cycle: badge moves,
foreground return reads at once, background sends nothing, blur stops the timer,
a failed count logs and stays neutral.

- Edit: `src/hooks/useNotifications.js` (`useUnreadCount` gets an interval while
  focused, cleared on blur) and `src/app/(tabs)/profile.jsx` if the copy needs to
  say it polls. Same file, same turn: the `catch {}` at
  `useNotifications.js:166` becomes `catch (err)` with a `console.warn` under
  `__DEV__`, like `api/client.js` already does (B12).
- Constraint: no polling when the app is backgrounded (`AppState`), no polling on
  the inbox screen itself where focus-refresh already covers it.
- Done: the badge moves within one interval without touching anything; leaving the
  tab clears the timer (assert with a fake timer test); the failed-count path logs
  in dev and still leaves the row neutral.
- Ship: `S: 2 file (0 nuovi), 0 figli, ~30 min` → `/ship "conteggio non lette in polling"`

---

## D. Blocked by the backend — no frontend work item

Do not plan these; they are already written up in `docs/backend-gaps.md`.

| Gap | What the app cannot do today |
| --- | --- |
| **G15** | Show the credit balance. Four paths move `users.credits`, no route returns it; the match tab can only state the cost in words |
| **G16** | Paginate the inbox. `pagination.totalItems` counts the returned page, so a second page cannot be justified — the app correctly draws no "load more" |
| **G20** | Trust `startDate` on a sheet: the column has `ON UPDATE CURRENT_TIMESTAMP`, so it stores the write time |
| **G23** | Offer the second queue type. One active queue blocks both types, and the refusal is a `500` (`QueueController.php:51` catches `Exception` without importing it — imported only `NotEnoughCreditsException`) |
| **G4 / G5** | Attach the proposal to a service, and keep the two answers independent |
| **G9** | Register without publishing one offer and one request (`AuthController.php:136-140`: `[]` → `null` → `400`) |
| **G12** | See `COMPLETED` written, and any queue-born credit; the scheduler has no worker in the local stack |
| — | Refresh the JWT. One hour, no renewal: the app warns 5 minutes ahead (`useSessionExpiry`) and cannot do better |

**Hypotheses that need a measurement before becoming work items** (from
`docs/ui-triage.md`, still unmeasured): F1/H1 column width `560` at 1280/1920
(`theme/tokens.js`, `Screen.jsx:68-74`); H2 icon off-centre in `AppButton`
(`AppButton.jsx:83`, `marginLeft: -space.xs` in a centred row, 33 call sites);
H3 baseline alignment between two type scales (`AppInput.jsx:115`,
`PageHeader.jsx:44`). Measure at 375/768/1280/1920 in both themes before writing
code, and judge against `docs/DESIGN.md` rather than taste.

---

## E. Suggested run order

| # | Item | Why now |
| --- | --- | --- |
| 1 | ~~W5 error boundary~~ | **done** 2026-11-16: landed in `0e22832` + the fix that made the retry test green |
| 2 | W2 notification/queue links | data already in memory, highest UX return per line |
| 3 | ~~W1 chat~~ | **done** 2026-11-16: plan in `docs/briefs/w1-chat/`, landed in `82b22c0`…`0b0e722` |
| 4 | W3 public profile | closes G3's remaining half, endpoint ready |
| 5 | ~~W6 lazy dataset~~ | **closed N/A** 2026-11-16: measured, the win claimed here does not exist (B8) |
| 6 | ~~W4 staff surface~~ | **done** 2026-11-17: the four documented endpoints are wired, plan in `docs/briefs/w4-staff-surface/` |
| 7 | ~~W10 unread polling~~ | **done** 2026-11-17: the profile badge polls every 30 s while focused, plan in `docs/briefs/w10-unread-polling/` |
| 8 | ~~W7 hook tests~~ | **done** 2026-11-17: 25 tests on the two stateful hooks and the match gate, plan in `docs/briefs/w7-hook-tests/` |
| 9 | W9 naming + W8 docs | last: both touch many files and depend on the decisions above |

Grouping that is safe in one `/ship` run (disjoint files, no shared decisions):
`W5 + W10` (both 2 files, no overlap) and `W2 + W3` **only if** W3 drops the
agreement entry point (both touch `AgreementCard.jsx` otherwise). Everything else
runs on its own; `/ship` will write the `Lanes:` section for each.

Every item closes with the same non-negotiables: pre-push gate green
(`npx expo lint`, `npx tsc --noEmit`, `npx jest`), docs updated in the same commit,
`docs/changelog.md` entry, no `EXPO_PUBLIC_DATI_FINTI`, no invented data, every
loading/empty/error state explicit, UI copy in Italian, identifiers per the
decision taken in W9.
