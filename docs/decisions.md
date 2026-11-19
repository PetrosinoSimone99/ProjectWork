# Decisions

ADR-light log: one numbered entry per decision, appended (never rewritten).
Format: date — decision — context — consequences. Reversal = new entry that
supersedes.

---

**D001 — 2025 (pre-dated, team charter) — Code language: English.**
Code (identifiers, comments, new files, test names) is English; UI copy is
product language (Italian). Legacy Italian-named frontend modules are
grandfathered and renamed opportunistically. (source: `Context_and_DB_V2/new_user_stories_v2.md`,
`baratto-context.md` "Scelte tecniche confermate"; AGENTS.md.)

**D002 — 2025 — Fake-data mode is a single switch. (Superseded by D011.)**
`USA_DATI_FINTI` in `src/api/config.js` (env `EXPO_PUBLIC_DATI_FINTI`) is the
only fake-vs-real decision point, consumed in `src/api/barattolo.js`. The
demo banner is generic and hides technical details.
*Consequences:* components and screens stay backend-agnostic; fake mode
always shows the banner; no parallel API paths. (source: `src/api/config.js` docs).
The whole mechanism was removed on 2026-11-07, see D011.

**D003 — 2025-11-03 — Branch sync via merge, never rebase.**
Published branches are shared history; `git merge origin/main` into
`andrea-frontend` is the sync operation (matches the existing history).
*Consequences:* straightforward conflict history; no history rewrite.

**D004 — 2025-11-03 — MySQL 8.0 over Postgres in Docker Desktop stack.**
`Backend/compose.yaml`'s old Postgres skeleton is replaced by `mysql:8.0`;
dump compatibility (utf8mb4, MySQL dialect) and backend examples required it.
*Consequences:* first boot imports `barattolo_v2_18102026_token_redemptions.sql`;
`serverVersion=8.0` in `DATABASE_URL`; Postgres configs must not return.

**D005 — 2025-11-03 — Backend PHP served from a dev-only container.**
`Backend/docker/Dockerfile` (php:8.4-cli + intl/zip/pdo_mysql + composer)
replaces host-based MAMP/Laragon setups in the team's local flow, backend
service fixed at host port 8000.
*Consequences:* single dev stack under Docker Desktop; production image
strategy stays out of scope for this repo.

**D006 — 2025-11-03 — Frontend pre-push gate: expo lint + tsc.**
`npx expo lint` and `npx tsc --noEmit` must pass before any push; unit tests
enter the gate when a test runner lands.
*Consequences:* no red push; no intentionally weakened checks.

**D007 — 2025-11-03 — docs/api.md is frontend-facing only.**
It documents the endpoints the frontend consumes, with pointers to canonical
backend sources; must be re-verified whenever a session touches APIs.
*Consequences:* no duplicated API reference; reliance on
`Context_and_DB_V2/API docs/` as truth.

**D008 — 2025-11-03 — Docker exception inside the backend write-block.**
Andrea (frontend owner) is allowed to edit only `Backend/compose.yaml`,
`compose.override.yaml` and `Backend/docker/` because Docker Desktop is her
owned subsystem; every change is reported in changelog so the backend owner
stays informed.
*Consequences:* narrow, auditable exception; the rest of `Backend/` remains
untouchable.

**D009 — 2025-11-03 — Code style rules documented in frontend docs, not AGENTS.**
Style (component naming, token discipline, file size) lives in
[frontend.md](frontend.md) since it is negotiable; the AGENTS file holds only
the non-negotiable workflow boundary rules.

---

**D010 — 2026-11-07 — JavaScript only, no TypeScript migration.**
The frontend stays on `.js`/`.jsx`. `npx tsc --noEmit` remains in the gate but
checks **syntax only** (`allowJs` without `checkJs`, verified with a scratch
fixture): it catches a missing brace, not a wrong field name.
*Consequences:* `expo lint` is the real pre-push check; type safety is not
expected from the toolchain and must not be assumed in review.

**D011 — 2026-11-07 — The fake-data layer is gone.**
`src/api/finti/`, `USA_DATI_FINTI`, the demo banner, the guard in
`api/client.js` and the automatic tour were deleted. The app talks to the real
backend only; a missing endpoint renders an explicit "not available" state.
*Consequences:* no screen can show invented content; development needs the
Docker stack running; the demo mode no longer exists as a product surface.

**D012 — 2026-11-07 — Deletions are decided by measured reachability.**
Before deleting the dead domain, a resolver walked the import graph from the
fifteen app entry points. 23 files were unreachable and removed; afterwards
75 files are reachable and 0 are orphaned.
*Consequences:* renames and deletions can be re-verified at any time; a file
that nothing imports is a bug (or pending work), not a candidate to keep.

**D013 — 2026-11-07 — Rename scope: files, routes, exported symbols first.**
Directories, file names, route paths and exported component/hook/constant names
are English. Camel-case function and variable names inside `api/` and
`services/` are still Italian and are renamed module by module as those files
are rewritten against the real endpoints.
*Consequences:* the diff stays reviewable; the outstanding Italian identifiers
live only where the code is about to be replaced anyway.

**D014 — 2026-11-07 — No data-fetching library.**
The existing hook pattern (loading, error, pagination guard, retry, focus
refresh) stays. No TanStack Query, no global cache.
*Consequences:* one hook per screen concern; stale responses cannot overwrite
newer ones; the cost is repetitive code in each hook.

**D015 — 2026-11-07 — Form validation is hand-written.**
One module (`src/validation/`) with functions returning the first Italian error
message, instead of adding zod. This is a conscious deviation from the
schema-based validation line in the global rules: four forms with simple shape
rules do not justify a new dependency.
*Consequences:* validation messages stay in one place and in Italian; a new form
must reuse the module instead of writing its own checks.

**D016 — 2026-11-07 — An agreement concludes at its end date.**
No `COMPLETED` status is added to the schema. The agreement is concluded when
the agreed `end_date` has passed; a service that is not delivered becomes
`CONTESTED` and goes to staff.
*Consequences:* no schema change; the chat becomes inaccessible at conclusion;
a service delivered earlier cannot be closed early without a new decision.
*Superseded in part:* `COMPLETED` **is** in the reference schema today
(`barattolo_15112026.sql`) and the end-date scheduler writes it; what still
misses is the worker that runs the scheduler (`backend-ledger.md` G12).

**D017 — 2026-11-07 — The chat is reachable only through an accepted agreement.**
The legacy chat endpoints (keyed by proposals that no longer exist) are not
called; the old chat screen and its components were deleted. The chat will be
built on the agreement id.
*Consequences:* no chat surface until the backend exposes G8 in
`backend-ledger.md`; the design decisions (bubbles, composer, sheet inside the
chat) are kept in this documentation, not in dead code.
*Status:* G8 landed 2026-11-15 and the screen exists since W1 (2026-11-16,
`Frontend/src/app/chat/[agreementId].jsx`). "Accepted agreement only" is a UI rule,
not an enforced one: the backend checks the token but not participation
(`backend-ledger.md` G24).

**D018 — 2026-11-07 — Documentation set: nine files plus the gap list.**
`project-structure.md` was absorbed into `architecture.md` and `ux.md` into
`frontend.md`; `backend-ledger.md` is new and holds the requests to the backend.
*Consequences:* one file per job; the gap list is the artefact handed to the
backend maintainer.
*Superseded by D022:* `ux.md` and `accessibility.md` are separate normative files
again, and the set is fourteen files today (`docs/README.md`).

**D019 — 2026-11-09 — Jest (jest-expo) covers the pure modules, outside the gate.**
`jest` + `jest-expo` (and the peer packages they need: `@react-native/jest-preset`,
`react-test-renderer`, plus an explicit `typescript` because the gate calls it)
are dev dependencies. Tests cover `src/services/relevance.js` and
`src/validation/` only; `npm test` runs them.
*Context:* the first code block introduced pure logic worth pinning, and the
brief allowed jest as the only new dependency. `typescript` was already required
by the documented gate but was not declared, so `npx tsc` could fetch an
unrelated package.
*Consequences:* tests are non-blocking for now; coverage is limited to those two
modules; component tests and a test runner for screens remain out of scope.

**D020 — 2026-11-09 — API layer returns the UI shape, in Italian keys, until the consumer is rewritten.**
The rewritten `src/api/**` modules and their functions are English (names,
parameters, comments), but the normalised objects keep the keys the surviving
components already read (`descrizione`, `categorie`, `offerente`, `mansione`,
`stato`). Renaming happens with the component that consumes the shape, not
before (same rule as D001 for opportunistic renames).
*Consequences:* one shape at a time in the app; `docs/frontend.md` documents the
Italian UI-shape keys; a rename that lands on one side only is a defect.

**D021 — 2026-11-09 — Relevance ordering and the remote filter belong to the backend.**
The backend sorts the whole catalog by the categories of the viewer's own
requests **before** pagination and accepts `isRemote=true|false`. The frontend had
replicated both: `src/services/relevance.js` reordered the loaded page, the mode
filter dropped rows already in memory, and an extra `GET /requests/mine` ran on
every home open.
*Consequences:* `relevance.js` and its test are deleted, the catalog hook performs
one request per filter change, the mode selector sends `isRemote`, and the two
"only among the rows already loaded" disclaimers are gone because they were no
longer true. No `sort` is sent: the backend accepts only `newest`/`oldest`. A
multi-category home filter stays out of scope until requested — the backend
already accepts `categoryIds[]`, so it is a UI decision, not a gap. The jest
coverage set moves from `relevance.js` to `src/services/agreements.js`; D019
stays as written, as an appended log does.

**D022 — 2026-11-10 — UX and accessibility become two normative documents.**
The course material on usability (ISO 9241-11, the six principles, the ten
Nielsen heuristics, dark patterns and DSA art. 25, the four design phases, the
usability test protocol) and on digital accessibility (POUR, the WCAG 2.1 AA
criteria that apply to a React Native app with a web build, assistive technology
pass, content rules, non-web documents) is distilled into `docs/ux.md` and
`docs/accessibility.md`, both normative with MUST/SHOULD language.
*Context:* D018 had absorbed a previous `ux.md` into `frontend.md`; the material
is now larger than a conventions file and is used at two different moments
(design review, accessibility audit). Partly supersets D018, which stays as
written. WCAG 2.1 AA is adopted as the target even though no legal obligation is
triggered: Baratto-lo is neither a public body nor above the EAA thresholds.
*Consequences:* precedence is `AGENTS.md` > these docs and `frontend.md` >
`impeccable`/`design-taste-frontend`, so a design skill never overrides the
project; a screen/component change must state in its commit which checklist
lines were verified and list the failures as known gaps; the pre-push gate is
unchanged (no accessibility linter added, that is a separate decision with a new
dependency); `docs/README.md` and `docs/frontend.md` link the two files.

**D023 — 2026-11-10 — One modal shell, and lists that own their scrolling.**
Every panel (service detail, confirmation, category selector, province/comune
selectors, agreements bell, staff review sheet) now goes through
`src/components/ModalShell.jsx`: it binds Escape on the web build, moves the focus
into the panel on open, keeps the backdrop out of the assistive tree and draws
header, close and footer in one place. Data screens with a growing collection
render a `FlatList` themselves and mount it under `Screen scroll={false}`.
*Context:* the audit of the same day found four different ways to dismiss the same
kind of panel, Escape closing nothing on the web, focus starting outside the
dialog and a full-screen backdrop announced as a button (F15, F16, F38); and a
catalog that grew inside one `ScrollView` (F42). Six one-off fixes would have
reproduced the four patterns with six slightly different behaviours.
*Consequences:* a new panel MUST use `ModalShell` instead of `<Modal>` directly,
and a panel that needs a nested dialog renders `ConfirmModal` as its sibling, not
inside it; a screen whose collection can grow MUST own its list and set
`Screen scroll={false}`. The catalog follows both rules; the two staff lists still
follow the second one only when they start appending pages (recorded as open in
the remediation file). `ConfirmModal`'s public props did not change, so the call
sites did not have to.
*On naming:* the shell's props are Italian (`titolo`, `chiudibile`,
`etichettaChiudi`) while its module-level constants are English
(`LARGHEZZA_MASSIMA` is the exception and predates this note). The rule in
`AGENTS.md` asks for English in new code; inside this repo the React prop
vocabulary is Italian end to end (`ConfirmModal`, `PillBar`, `Banner` all take
Italian props), and a shell that spoke English while its six hosts did not would
be the inconsistency. **New cross-module exports and constants are English**
(`GENERIC_ERROR_MESSAGE`, `SESSION_EXPIRED_MESSAGE`, `messageForStatus`,
`NETWORK_ERROR_MESSAGE`); **React props follow the component they belong to**.
This note exists because the review flagged the mix.

**D024 — 2026-11-16 — A location is `Comune - Provincia`, and regione is gone.**
The backend never had a region column: `users.location`, `services.location` and
`service_queues.location` are single varchars and `ServiceQueueRepository`
matches the queue's location with **exact equality**. The team that owns the
backend shipped `province-comuni.json` (110 provinces, 7.894 comuni) and the
product wants a comune, so the frontend stops at the province and descends one
level: every picker asks Provincia then Comune, and the composed string becomes
`Comune - Provincia` (`Roma - Roma`, `Sesto San Giovanni - Milano`).
*Consequences:* one module owns the format
(`Frontend/src/services/italian-locations.js`: compose, parse, display) and the
dataset is a verbatim read-only copy of `Context_and_DB_V2/province-comuni.json`
inside the app; the parser splits on the **last** separator because one comune
name contains it (`Tripi - Abakainon`), and accepts a comune only inside its own
province; a value written before this format (`Milano (Lombardia)`) parses to
null and is displayed verbatim, so editing a profile asks for a fresh pick
instead of guessing; the demo seed was regenerated by registering accounts
through the app, so the stored rows are exactly what the client composes.

**D025 — 2026-11-16 — One queue at a time, because the server says so.**
Upstream `4c90ccd` put a guard at the head of
`ServiceQueueManager::createServiceQueue`: while the account holds a queue whose
status is not `CLOSED`, a second create throws, and the throw is an untyped
`\Exception` the controller cannot catch (`backend-ledger.md` G13), so a client
reads a `500`. The guard counts **both** types together, which contradicts the
product rule this repo follows — one offer and one request per account.
*Decision:* the app follows the server, not the rule: with one active queue the
`match` tab disables **both** create actions and says «Hai già una coda attiva:
annullala per poterne crearne un’altra.» (`Frontend/src/services/queues.js` →
`hasActiveQueue`, `app/(tabs)/match.jsx` → `CreateQueueActions`). Showing one
button that is guaranteed to fail is worse than a rule that is narrower than the
product wants.
*Consequences:* the second queue type is unreachable in the app until the
backend keys the guard on `queueType` and answers a `409` instead of a `500`
(`backend-ledger.md` G23); when that lands, this decision is superseded — the gate
becomes one per type and the copy points at the other type instead of at the
cancel button. Nothing else in the app changes: `GET /get-queues` already
excludes `CLOSED` rows, so "active" and "listed" are the same set and the gate
needs no extra request.

**D026 — 2026-11-17 — Two layers of naming: English structure, Italian contract.**
D001 and D013 ask for English identifiers, but the tree has never worked that way
at its boundary layers. The object-returning hooks are Italian from their
first commit (`accordi`, `caricamento`, `errore`, `rispondi`, `azioneInCorso` in
`useAgreements`; `elementi`, `nonLette`, `ricarica`, `segnaLetta` in
`useNotifications`; `useServiceCatalog`, `useUserServices` and `useSessionExpiry`
the same), the component props are Italian (`occupata` on `AgreementSheet` and
`QueueCard`, `onAnnulla` on every confirmation surface, `titolo`/`messaggio` on
`ConfirmModal`, the row props below), and
`api/normalizers.js:10-12` documents the Italian UI shape as the single contract
every screen reads. The defect the 2026-11-16 audit found in B6 is not that
Italian exists. B6 read the same row as `queue` in one function of `match.jsx` and
as `coda` at its call site as a collision; measured against the rest of the tree it
is the boundary described below, a local against a prop. What was really
inconsistent is smaller: the helpers and flags invented inside the new files were
Italian (`rimborsaUnCredito`, `confermaAnnullamento`, `apribile`, `etichettaApri`,
`bloccoInformativo`, `codaAttiva`) while their neighbours in the same files were
English.
*Decision:* two layers, one vocabulary.
(1) **Structure is English**: file names, directories, route paths, exported
symbols, comments, commit messages, and every local identifier that describes
*how* the code works — helpers, constants, flags (`busy`, `canOpen`, `openLabel`,
`refundsCredit`).
(2) **The internal contract is Italian**, with the same word at every layer it
crosses: the normalised shape (`tipo`, `stato`, `localita`, `descrizione`,
`categoria`, `daRemoto`, `nonLette` — examples, not a closed list), the return
object of the data hooks, and the
props that carry that shape, that state or that action: the row props (`coda`,
`servizio`, `accordo`, `notifica`, `voce`) and the state and action props
(`occupata`, `azioneInCorso`, `onApri`, `onAnnulla`, `onLetta`). Renaming a
contract word at one layer only — `occupata` to `busy` in one card while three
other components keep `occupata` — is the defect, not the Italian. A local that
holds a row stays English while the prop stays Italian, so the boundary crossing
is an alias at the call site (`coda={queue}`, `occupata={busy}`); a flag or a
helper invented inside a file is English (`busy`, `activeQueue`, `refundsCredit`,
`canOpen`, `openLabel`, `infoBlock`, `failure`, `outcomeQueues`), and so is a
module constant or a test fixture (`QUEUE`, `OFFER_SERVICE`).
*Consequences:* W9 renames nothing inside the hooks — their contract is legal and
shared with the screens that consume it — and nothing on the prop boundary: it
renames the Italian helpers and flags of the four new files and their tests, which
makes `AGENTS.md`, `docs/frontend.md` and the code state the same rule.
No sweep: an Italian name that is not a contract word is renamed when its file is
next touched, which is D013's mechanism unchanged. Declared leftovers inside the
Italian contracts: `actionError` in `useAgreements`, and
`refreshing`/`onRefresh` in `useRefresh` (surfaced again by `useServiceCatalog`),
which is why rule (2) says *data* hooks and not *every* hook. `services/queues.js`
keeps `hasActiveQueue(code)` with its `coda` callback for the same reason — that
folder is D013 territory. All of them go with their file's next touch. D013 stays
as history and is read through this entry.


## D027 — Essential workflow corrections (2026-11-18)

User-confirmed rules supersede the earlier directional-only overview and the
proposed one-queue-per-type change: direct swaps retain two offers/two sheets;
queue deliveries have one sheet. Each owner has one non-deleted service per
type and one active queue total. Request queues require a previously completed
offer queue and a credit. Missing keyword dictionaries use category/mode/location
matching. Services at registration are optional. Suspension retains the service
slot and history; accepted agreements continue, but new matches are excluded.
The backend, not a client clock, decides completion. Historical chat is readable
by participants; only accepted agreements allow messages.


## D028 — 2026-11-19 — The sheet is written once, and its confirmation ends the exchange

Supersedes the D027 rules it contradicts: request eligibility after an offered
delivery, optional services at registration, two sheets filled one per
participant, and completion decided only by the scheduler.

- **Reciprocal proposal.** When a `PENDING` agreement already exists with the
  caller as beneficiary for the same two services, `create-exchange-agreement`
  accepts that agreement instead of creating a second one and answers
  `autoAccepted: true`. Two people proposing to each other can no longer end up
  with one side accepted and the other still waiting.
- **One sheet per agreement.** `send-agreement-details` takes
  `{agreementId, notes}`: `start_date` is written by the backend at acceptance,
  `end_date` at confirmation, `from_remote` comes from the sender's own service.
  The first participant who sends the sheet locks the round — the other can only
  confirm or refuse it, because all they add is their agreement on the details.
- **Confirmation ends the exchange.** `accept-agreement-details` writes
  `end_date`, marks the row completed, moves the agreement to `COMPLETED`,
  performs the provider credit and queue closing of `from_queue` agreements, and
  notifies **both** participants with the details. The scheduler keeps its path
  but can never complete an exchange agreement, whose second sheet stays
  `UNCOMPILED` by design.
- **One offer and one request per account.** Registration requires exactly one of
  each; the owner edits them and cannot suspend or delete them (`409`). With both
  mandatory, removing one would lock the account out of the app. Staff restore
  stays.
- **One credit, one queue.** A request queue costs one credit and nothing else.

*Consequences:* `QueueEligibility` is removed, `GET /profile` no longer exposes
`canRequestQueue`, and the "Eliminati" section and the owner-side suspend/delete
controls disappear from the app. `Backend/` was edited in this ship under the
owner's explicit per-ship permission, reported in `changelog.md` for the backend
maintainer.

## D029 — 2026-11-20 — Real time is Server-Sent Events over the notifications table

The app was refresh-driven: every screen read once on focus, the unread badge
polled every 30 s and the open chat every 15 s, because the backend had no push
channel. The fix is one route, not a broker.

- **SSE, not Mercure, not a socket server.** `GET /api/stream` keeps one
  authenticated request open and writes `text/event-stream` frames
  (`api.md#live-stream-server-sent-events`). No new dependency on either side:
  the backend polls the notifications table it already writes, the client reads
  the bytes with `fetch` (web) or `XMLHttpRequest` (native).
- **One event type: `notification`.** A chat message already writes a
  `CHAT_MESSAGE` row carrying `chatId` and the text, so messages, agreements,
  matches and staff events all arrive through the same frame. A second stream
  for chat was rejected: two cursors, two reconnects, two failure modes.
- **The cursor is the client's.** Frames carry an `id:`; reconnecting with it
  replays exactly what was missed. Without a cursor the stream starts at the
  newest row — the live edge, never a silent backfill of the whole inbox.
- **The connection is bounded.** Thirty seconds, then the client reconnects.
  A php worker serves one request at a time and the dev stack runs `php -S`
  with a fixed worker pool; an endless stream would starve it. The cost is a
  reconnect every 30 s, which is cheaper than an exhausted pool.
- **The token stays in the header.** `EventSource` cannot send an
  `Authorization` header, so the client is hand-written instead of the browser
  API: no `access_token` in the URL, no one-shot ticket table, and the same JWT
  extractor as every other route.

*Consequences:* the polling in `useUnreadCount` and `useChat` becomes a fallback
rather than the only path; `Backend/` was edited in this ship under the owner's
explicit per-ship permission, reported in `changelog.md` for the backend
maintainer. The stream is per process, not per app server: multiple php workers
each answer their own request, so no shared state is needed.

## D030 — 2026-11-21 — A concluded exchange keeps its way into the chat

D028 made the confirmation end the exchange, so a delivered agreement moves
straight from `ACCEPTED` to `COMPLETED`. The card only offered "Apri chat" on
`ACCEPTED` rows (W1 decision 7), which left the finished exchange — the one with
a real history and a written sheet — reachable by URL alone.

- **"Apri chat" on `ACCEPTED` and `COMPLETED`.** The chat is the record of what
  happened, so the entry point outlives the exchange. The screen already handles
  a closed agreement: history readable, composer replaced by the conclusion and
  the way back.
- **Nothing wider.** `PENDING`, `REFUSED`, `CANCELLED` and `CONTESTED` keep their
  row without an entry: `GET /chats/agreement/{id}` creates the chat when it is
  missing (`ChatManager::getOrCreateChat`), and an empty conversation for a
  proposal nobody accepted is noise rather than history.
- **The closed chat says the fact once, and says it to both.** The line under
  the header no longer repeats "lo scambio non è in corso" on top of the
  conclusion block; the empty state stops inviting the first message where
  nothing can be sent; and the conclusion date is read from the confirmed row
  with the viewer's own row as fallback, because `end_date` is written on the
  sender's sheet — reading the counterpart's alone showed the date to whoever
  confirmed and hid it from whoever sent.

*Consequences:* `AgreementCard`'s gate and its test change; `backend-ledger.md` is
untouched because no route changed.

## D031 — 2026-11-21 — Jest joins the pre-push gate; PHPUnit stays out

D019 put `jest` outside the gate when the suite covered two pure modules and
was cheap to skip. The suite now holds 47 files and 568 tests over the API
layer, the hooks and every component, so the gate was running two steps that
cannot fail on behaviour: `tsc --noEmit` parses syntax and imports only
(`allowJs` without `checkJs`).

- **`npx jest` is a gate step.** Twenty seconds, no Docker, no fixture, and a
  failing test names something this side owns.
- **PHPUnit is not.** Three runs, about seven minutes, Docker up, and two MySQL
  test databases that do not exist on a fresh machine (`barattolo_test`,
  `workflow_checks_test`). A gate that goes red on a prerequisite would teach
  `--no-verify`, and a failure would sit in `Backend/`, which the frontend side
  may not edit. The three commands stay documented in `docs/setup.md` and are
  run when a frontend change depends on a backend endpoint.

*Context:* on 2026-11-21 the backend suite was executed for the first time on
this machine and needed two missing databases created before it could answer.
That is not a precondition a pre-push hook can carry.

*Consequences:* the gate grows to three steps and roughly twenty extra seconds
per push; D019 stays as written, as an appended log.
