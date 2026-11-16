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
| `GET /chats/agreement/{id}`, `POST /chats/send-message/{chatId}`, `GET /chats/most-recent-message`, `GET /chats/check-new-messages/{id}` | `Backend/src/Controller/ChatController.php:26,49,86,108` | **zero references** to `chats/` anywhere in `Frontend/src` |
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
`bottomSpacing`; no chat screen exists under `src/app`. Already recorded as F3 in
`docs/ui-triage.md` and still open.
Judgment: keep the paragraph (it will become true with W1) or drop the reference
until then.

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
Judgment: the picker needs the data only when it opens. A `require()` inside the
opening handler (or a per-province split) removes it from the critical path. This
is the clearest single performance win in the project and it needs no backend.

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

---

## C. Work items

Ordered by value over effort. `Ship:` gives the class the triage would assign and
a paste-ready invocation; each item is a valid `/ship` brief on its own.

### W1 — Chat on an accepted agreement

`Stato: TODO`

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

`Stato: chiuso` (2026-11-16) — landed in `0718c3a` (notification row) and
`ca9e098` (queue card), plan: `docs/briefs/w2-agreement-links/plan.md` (class
`M`, 6 files, 1 new).

What landed: `NotificationRow` wraps its informational block (header row plus
message) in one `Pressable` with `accessibilityRole="button"` and the label
`Apri lo scambio di questa notifica` when `Number.isInteger(notifica.dati?.agreementId)`,
otherwise it renders today's markup with no role and no label; `notifications.jsx`
owns `useRouter` and passes `onApri={() => router.push('/agreements')}`.
`QueueCard` does the same for the linked case (`agreementId !== null`, label
`Apri lo scambio collegato a questa coda`) and `match.jsx` passes the handler.
The action buttons (`Segna come letta`, `Elimina`, `Annulla coda`) and both
`ConfirmModal`s stay **outside** the pressable: on `react-native-web` a press
inside a nested pressable bubbles up, so wrapping the whole card would make the
destructive action navigate too. A string id is treated as a backend anomaly —
no coercion, no destination.

Two facts the run corrected against the plan: react-test-renderer exposes a
`Pressable`'s accessibility props on the composite layers *and* the host view,
so "exactly one node with that label and role" counts three; both test files
assert one *rendered host* node instead (see `pulsantiRenderati` in
`QueueCard.test.js`). And the sibling spacing inside the card comes from the
card's own `gap`, which a new wrapper would swallow: both pressables carry
`style={{ gap: space.sm }}` so the linked and unlinked cards stay
pixel-identical.

Honest limit: no deep link. `/agreements` reads no search params, so the tap
lands on the tab, not on the single agreement — opening it needs param handling
and expand/scroll inside the tab, a second work item.

### W3 — Public profile of another user

`Stato: TODO`

The endpoint exists and is normalised (`normalizeUserServices`); only the screen is
missing. Closes the second half of G3: the recipient of a blind proposal must be
able to see who is proposing.

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
- Ship: `M: 6 file (2 nuovi), 2 figli, ~1-2 h` → `/ship "profilo pubblico utente"`

### W4 — Staff: deleted services and per-report detail

`Stato: TODO`

Complete the staff area, which is documented as complete in `docs/api.md:211-216`.

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

`Stato: TODO`

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

`Stato: TODO`

- New: `src/hooks/__tests__/useAgreements.test.js`,
  `useNotifications.test.js`, `useServiceCatalog.test.js`,
  `src/app/(tabs)/__tests__/match.test.js` (via `react-test-renderer`, already
  installed).
- Edit: `Frontend/package.json` `collectCoverageFrom` (add `src/hooks/**`).
- Target the three rules every hook claims to keep: a stale response never
  overwrites a newer one, a failed reload keeps what is on screen, an action is
  single-flight. `match.jsx` deserves its own test for the triple gate
  (`exactly one service of the type`, `hasActiveQueue`, in-flight).
- Done: ≥80% statements on `src/hooks/**`, tests described by behaviour not by
  number, no assertion relaxed to pass.
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

`Stato: TODO`

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
| 3 | W1 chat | the only functional hole in the product lifecycle |
| 4 | W3 public profile | closes G3's remaining half, endpoint ready |
| 5 | W6 lazy dataset | measurable payload win, no backend |
| 6 | W4 staff surface | documentation already promises it |
| 7 | W10 unread polling | small, but it makes the inbox feel alive |
| 8 | W7 hook tests | before W9's renames, so the refactor has a net |
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
