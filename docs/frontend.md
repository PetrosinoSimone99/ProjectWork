# Frontend conventions

UX and accessibility are **normative rules** with their own files:
[`ux.md`](ux.md) (principles, Nielsen heuristics, dark patterns, usability test
protocol, review checklist) and [`accessibility.md`](accessibility.md) (WCAG AA
criteria, assistive technology pass, verification procedure). Both must be read
before designing or reviewing a UI; this file only says where the code goes and
how it is written.

## Stack

Expo SDK 58, React Native 0.88, React 19, expo-router. **JavaScript only**: no
TypeScript files, no `.ts`/`.tsx`. Dependencies are added only when the need is
real; the current set is Expo's plus nothing else.

## Language rules

- **Structure in English**: file names, directories, route paths, exported
  symbols, components, hooks, comments, commit messages, and every local
  identifier that describes *how* the code works (helpers, constants, flags).
- **The internal contract in Italian, one word per concept**: the normalised
  shape (`tipo`, `stato`, `localita`, `descrizione`, `categorie` — examples, not a
  closed list), the return object of the data hooks, and the props that carry a
  row, a state or an action (`coda`, `servizio`, `occupata`, `azioneInCorso`,
  `onApri`, `onAnnulla`). Same concept, same word at every layer it crosses. A
  local that holds a row is English while the prop is Italian, so the crossing is
  an alias at the call site (`coda={queue}`, `occupata={busy}`) — that is the
  boundary, not a collision; `coda` and `queue` for the *same* role is the defect.
- **UI copy in Italian**: everything the user reads, including error messages,
  empty states and accessibility labels.
- Italian names inside `api/` and `services/` that are not contract words
  (`ottieniCatalogo`, `creaSegnalazione`, `hasActiveQueue(code)`) are grandfathered
  and renamed when the file is next touched, never in a sweep. Declared leftovers
  inside the Italian hook contracts: `actionError` in `useAgreements`, and
  `refreshing`/`onRefresh` in `useRefresh` (surfaced again by `useServiceCatalog`) —
  which is why the contract layer above says *data* hooks and not *every* hook.
  They go with their file's next touch. Reasoning:
  [`decisions.md`](decisions.md) D013, D020, D026.

## File and function size

Many small files beat few large ones: 200 to 400 lines is typical, 800 is the
ceiling. Functions stay under 50 lines with early returns and at most four
nesting levels. When a screen grows past that, the stateful part moves into a
hook under `src/hooks/`.

## Naming

`camelCase` for variables and functions, `PascalCase` for components and types,
`UPPER_SNAKE_CASE` for constants, `use*` for hooks, `is/has/should/can` for
boolean locals. A component file exports a component with the same name as the
file. One concept keeps one word per layer: the row local stays English and the
prop stays Italian (`coda={queue}`), which is the boundary, not a collision
(D026).

## States are explicit

Every screen that loads data shows exactly one of:

| State | Rule |
| --- | --- |
| Loading | `LoadingScreen` for the first load; `Skeleton`/`SkeletonLista` where the shape of what is arriving is known; the previous rows stay on screen during a background refresh |
| Empty | `EmptyState` with icon, title, one sentence and an action only when the user can do something |
| Error | `Banner` with the message and a "Riprova" button that repeats the failed request as it was |
| Not available | "coming soon" copy when the endpoint does not exist; never invented data, never a dead button that pretends to work |

A button whose endpoint is missing stays visible but disabled, with a line of
copy explaining it is not available yet. A feature without a backend renders an
empty state, never fake content.

## Data and hooks

- Screens never call `fetch`; they call a hook.
- A hook owns one concern: filters, pagination, retry, focus refresh.
- A focus refresh is a **fallback**, not the only path: the stream (D029) is
  what keeps a list current. A focus read is skipped inside
  `FINESTRA_FRESCHEZZA_MS` (30 s) when a stream frame has already been handled,
  and it never blanks the list — the previous rows stay while `aggiornamento`
  is true. Manual paths (retry, pull-to-refresh, a filter change, a reload after
  an action) ignore the window and always read.
- A paginated list keeps its glued pages across a focus refresh: refreshing
  page 1 does not throw away pages 2..n the user loaded.
- Out-of-order responses never overwrite newer ones: each request carries a
  sequence number and only the latest applies.
- "Load more" appends a copy (`[...current, ...page]`); nothing is mutated.
- The API layer is the only place that knows backend field names; screens read
  the normalised shape. The API modules and their functions are English; the
  normalised objects still use the UI-shape keys the surviving components read
  (`descrizione`, `categorie`, `offerente`, `mansione`, `stato`, `idCategoria`).
  Each key is renamed together with the component that consumes it
  (`docs/decisions.md` D020).
- Home ordering and the remote filter live in the backend: `GET /services`
  sorts by relevance (offers sharing a category with the viewer's own requests
  first, whole catalog, pagination after the sort) and filters with
  `isRemote=true|false`. The app keeps no ordering code — `src/services/relevance.js`
  was deleted together with its test — and the mode selector is a server
  round-trip like the other discrete filters (`docs/decisions.md` D021).
- The agreements tab reads `GET /get-agreements` through `useAgreements` and
  splits the rows with the pure `src/services/agreements.js` (to answer, sent,
  in progress, concluded). Those rules mirror the backend's real lifecycle (the
  creator is born with `response: true`) and are the only place the sections are
  decided: a row that fits no rule is dropped, never guessed into one.
- The three sections of the agreements tab (sent, in progress, concluded) are
  tabs in a row, one visible at a time, each with the real count of its section
  (`0` included: a missing badge would look like a failed load). The bell is a
  floating button in the bottom-right corner and opens its panel **above**
  itself as a `Modal`: a floating button has no room to grow downwards, so an
  inline block there would be clipped or would scroll away with the page.
- One connection to `GET /api/stream` serves the whole app
  (`src/hooks/useEventStream.js`, mounted in `app/_layout.jsx` inside
  `AuthProvider`). A frame is a notification row in the internal shape and means
  **re-read what you are showing**, never "draw this payload": each consumer
  decides with the predicates in `src/api/stream.js` (`affectsChat`,
  `affectsAgreements`, `affectsProfile`, `affectsMatch`) and calls the read it
  already had. No screen opens a connection of its own; that would be one
  connection per screen, and each open stream holds one `php -S` worker.
- The stream is hand-written (`src/api/stream.js`) because `EventSource` cannot
  send an `Authorization` header and the token must not enter a URL: `fetch` +
  `ReadableStream` on the web, incremental `XMLHttpRequest` on native, which has
  neither streaming `fetch` nor `EventSource`. Reconnecting is the normal path,
  not an error: the server closes every connection after 30 s by design,
  a transport fault backs off 1 s → 30 s, a silent socket is closed by a 45 s
  idle watchdog, and a `401` is reported once and never retried. The provider
  keeps the cursor in memory (`after` = last applied id) so a reconnect inside a
  session loses nothing, and it holds no connection while the app is
  backgrounded.
- **What the stream does not reach** (declared, not forgotten): the home catalog,
  another user's public profile and the staff lists. Their tables write no
  notification, so those screens stay on focus and pull-to-refresh. The polling
  that remains is a fallback, not the engine: `UNREAD_POLL_MS` is 120 s and
  `CHAT_POLL_MS` 60 s, and neither overwrites the count the frames carry.

## Theme

Colours, spacing and radii come from `src/theme/tokens.js` through `useTokens()`.
Screens never hard-code a colour: light and dark must both work, and the user
chooses (system, light, dark) from the profile. Animations respect the reduced
motion preference.

## Accessibility and copy

Touch targets are at least 44 pt (`target.min`); interactive elements carry
`accessibilityRole`, `accessibilityLabel` and, where relevant, `accessibilityState`.
Copy says what happened and what the user can do next, in Italian, without
technical details and without emoji. The full rule set, with the pass/fail
procedure and the WCAG criteria each prop answers to, is in
[`accessibility.md`](accessibility.md).

## Validation

Form validation lives in one module (`src/validation/`) with functions that
return the first error message or `null`. Messages are Italian and specific.
Validation covers shape only (required, length, email format, URL points at a
PNG or JPEG); business rules stay on the backend, which is the only authority.

## Pre-push gate

```bash
cd Frontend
npx expo lint
npx tsc --noEmit
```

Both must pass before any push. `tsc` reads JavaScript and catches syntax
errors; it does not type-check JavaScript, so it is a syntax net, not a type
check.

Unit tests run with jest (`npm test`, preset `jest-expo`, no other test library).
The tree holds 42 test suites and 480 tests, all green: nine under `api/`
(`stream` and `client` included), fifteen under `components/`, eight under
`services/`, six under `hooks/` (`useEventStream` included), and one each under
`app/(tabs)/`, `auth/`, `navigation/` and `validation/`.

Coverage is collected only for the five files listed in `collectCoverageFrom`
(`Frontend/package.json`): `services/agreements.js`,
`services/italian-locations.js`, `validation/index.js`,
`hooks/useAgreements.js` and `hooks/useServiceCatalog.js`. On that sample the
run reports 95.71% statements, 90.86% branches, 95.08% functions and 95.86%
lines; per file, statements and branches are `useAgreements` 95.16 / 77.27,
`useServiceCatalog` 90.69 / 89.74, `agreements` 98.5 / 96.62,
`italian-locations` 100 / 100, `validation/index` 100 / 81.57. The figure is a
hand-picked sample, not a claim about the tree: a module outside
`collectCoverageFrom` is not counted at all, so the percentage says nothing
about the code it does not name.

`src/hooks` holds twelve `.js` files and four of them have a suite of their own
(`useAgreements`, `useChat`, `useNotifications`, `useServiceCatalog`). The other
eight have no test: `useCategories`, `useDocumentTitle`, `useReducedMotion`,
`useRefresh`, `useSessionExpiry`, `useUserServices`, `useWebColorScheme` and
`web-chrome`. `useChat` and `useNotifications` are tested but are not in
`collectCoverageFrom`, so their coverage is not reported either.

`npx jest` is **not** part of the gate (D019), and the suite is non-blocking, so
a red test is a signal to fix before pushing, not a reason to weaken an
assertion.
