# Assessment D — `/impeccable optimize` performance pass

Repo: `C:/Users/Andrea/Desktop/projects/ProjectWork` · frontend `Frontend/src`
Date: 2026-11-18 · Mode: read-only measurement and diagnosis, no fixes applied, no app code changed.

## 0. Contention and dev-mode caveat (read this first)

Three other browser assessments were hitting the same Expo dev server and the
same Docker backend while these numbers were taken, and the frontend runs in
**DEV mode** (unminified bundles, dev transform, Fast Refresh, per-route
`?dev=true` bundling). Therefore:

- **Every wall-clock number below (FPS, LCP, content time, per-route bundle
  time) is contaminated and is NOT a production number.** They are reported
  with a "contention sensitivity" column and are used only to rank, never as
  evidence of production cost.
- **Contention-insensitive evidence is prioritised**: request count, payload
  sizes, TTFB-vs-total split, data volumes from the payloads, DOM/element
  counts, list virtualization structure read from source, animation
  properties, polling intervals and their cancellation, dependency/import
  inventory.
- Backend API timings were taken with repeated `curl -w` in **interleaved
  rounds** (7 rounds x 9 endpoints, 0.4 s apart) so rising load is spread
  evenly instead of punishing the last endpoint. Variance inside the run was
  3x–7x, which is itself one of the findings.

## 1. Measured baseline

### 1a. Backend API latency (`curl -w`, 7 samples per endpoint, interleaved)

All against `http://localhost:8000/api`, token from a real
`POST /auth/login` for `giulia.bianchi` (staff endpoints: `demo.staff`).

| Endpoint | median (s) | p95 (s) | min–max (s) | body size | contention sensitivity |
| --- | --- | --- | --- | --- | --- |
| `POST /auth/login` | 5.69 | 28.79 | 2.96–28.79 | 730 B | high (login is the heaviest server path: hashing + JWT sign) |
| `GET /services?page=1&limit=20` | 4.29 | 13.29 | 2.46–13.29 | 4 102 B | high |
| `GET /get-agreements` | 4.44 | 32.92 | 3.32–32.92 | 2 037 B | high (worst p95 of the set) |
| `GET /notifications?page=1&limit=20&unreadOnly=false` | 4.36 | 20.76 | 3.00–20.76 | 502 B | high |
| `GET /profile` | 3.76 | 11.19 | 2.20–11.19 | 193 B | medium |
| `GET /get-queues` | 3.85 | 12.49 | 2.52–12.49 | 249 B | high |
| `GET /categories` | 3.56 | 6.15 | 1.93–6.15 | 2 031 B | medium (spread of 3x on an otherwise trivial payload) |
| `GET /chats/most-recent-message` | 4.01 | 15.27 | 2.47–15.27 | **22 B** | high |
| `GET /chats/agreement/1` | 3.93 | 6.76 | 3.10–6.76 | 330 B | medium |
| `GET /staff/users?page=1&limit=20` | 3.87 | 16.09 | 2.34–16.09 | 2 548 B | high |
| **all samples (n=77)** | **4.01** | **15.27** | 1.93–32.92 | – | – |

Two facts here are **not** contention artefacts, because they are ratios and
not clocks:

1. **TTFB equals total in every single sample** (`time_starttransfer` differs
   from `time_total` by < 2 ms). None of the latency is transfer or payload
   parsing; all of it is spent waiting on the PHP/Symfony side or on PHP-FPM
   queueing. A 22-byte body and a 4 102-byte body cost the same ~4 s.
2. **Latency is payload-independent and load-dependent.** An earlier
   non-interleaved batch got `401`s (44-byte bodies, no business work at all)
   in 1.2 s–16.3 s. A rejected request costs seconds. That is queueing, not
   query cost.

How measured: `curl -s -o body -w "%{http_code} %{time_total} %{size_download}
%{time_starttransfer}"`, 7 rounds x 9 endpoints, medians/p95 computed from the
raw samples (`/tmp/perfd/raw2_*.txt`, bodies kept).

### 1b. Data volumes actually on screen (from the same payloads)

| Surface | Rows returned | Total reported | Notes |
| --- | --- | --- | --- |
| Catalog `/` | 10 offers | 10, 1 page | `pagination.totalItems=10` |
| `/staff-users` | 11 users | 11, 1 page | the "longest list" in this environment is 11 rows |
| `/agreements` | 2 agreements | 2 | |
| notifications sheet | 2 rows | 2 (1 unread) | |
| `/chat/1` | 5 messages | chatId 5 | |

This is the single most important contention-insensitive fact in the whole
pass: **the app's lists are one physical page each.** Any list-rendering
optimisation today moves microseconds.

### 1c. Browser/DOM/resources — dev server, contaminated (partial)

Playwright (own instance, 375x667 and 1280x800, session seeded in
`localStorage`), `PerformanceObserver` for LCP/CLS/longtask installed before
load, `performance.getEntriesByType('resource')` and
`document.getElementsByTagName('*')` after content + 3.5 s.

| Observation | Value | How measured | contention sensitivity |
| --- | --- | --- | --- |
| Route bundles per navigation | 3–4 `.bundle` requests (`entry`, `_layout`, `(tabs)/_layout`, route) | resource timing names | low (structure), high (timings) |
| JS transfer per navigation (dev) | 2 515–3 410 kB | `transferSize` sum of `.bundle` entries | high |
| JS decoded per navigation (dev) | **13 631–18 424 kB** | `decodedBodySize` sum | medium (dev-only by construction) |
| Per-bundle response time (dev) | 4 880–29 772 ms per chunk | resource `duration` | very high (Metro compiling under 4 clients) |
| Time to real content | 22 327–57 013 ms | navigation start → non-"Bundling" body text > 200 chars | very high |
| LCP | 25 420–36 908 ms | LCP `PerformanceObserver` | very high |
| CLS | 0.003 / 0.010 / 0.083 / 0.200 | layout-shift observer, `hadRecentInput` filtered | high (0.200 outlier on `/chat/1` under dev overlay) |
| Long tasks | 63–294 ms max per task, 1–5 tasks | `longtask` observer | high |
| JS heap after settle | 11.8–35.9 MB | `performance.memory.usedJSHeapSize` | high (includes dev tooling) |
| DOM nodes, `/profile` + notifications sheet | **140 nodes, 102 of them `div`** | element census | low |
| DOM nodes, other screens | 19–85 | same | **invalid** — those runs were still on the bundling overlay, not on rendered content |
| Image requests during any run | **0** | resource `initiatorType` census (`link`/`fetch`/`css` only) | low |
| CSS requests | 1 | same | low |

The `/profile` run is the only one that reached real content (screenshot shows
the screen plus the notifications sheet: 140 DOM nodes for screen + sheet is
lean). The other runs never escaped Metro's per-route compile, so I refuse to
report their node counts as screen weights.

## 2. Ranked bottlenecks

Ordered by the evidence number attached to each, not by how fun the fix is.

**B1 — Backend latency dominates perceived speed by an order of magnitude.**
Evidence: median 4.01 s / p95 15.27 s per API call (n=77), TTFB≈total, payload
≤ 4.1 kB. The home screen issues two calls on mount (`/categories` and
`/services`, `useCategories` + `useServiceCatalog`), so the first paint of real
rows waits on the slower of two ~4 s calls; `/agreements` and `/staff-users`
each wait on one. Consequence: warm local use is 4 s of spinner per screen, and
under the same conditions this browser measurements lived in, up to 15–33 s.
Nothing on the client can move this number; the client can only stop showing a
blank spinner while it waits.

**B2 — Every focus re-fires the same slow call, so navigation re-pays B1.**
Evidence: `useFocusEffect` reloads in `useServiceCatalog` (focus reload when no
filters applied), `useAgreements`, `usePagedList` consumers
(`staff-users.jsx:121`), `useChat` initial fetch; each round trip is the 4 s
median above, p95 13–33 s. Consequence: switching tabs and coming back costs
another spinner or another silent 4 s of stale rows; on a slow connection the
user sees a list that looks current but is up to a minute old, with no
indicator that a refresh is in flight.

**B3 — Dev-mode bundle weight makes every dev-time judgement worthless, and the
production number is unmeasured.** Evidence: 13.6–18.4 MB decoded JS and
2.5–3.4 MB transferred per navigation, per-route compile 4.9–29.8 s, LCP
25–37 s. Route-level splitting *does* work (separate `(tabs)/index`,
`match`, `agreements`, `chat/[agreementId]`, `staff-users` chunks were all
observed), so this is a dev-tooling cost, not a shipped cost — but the shipped
cost has never been measured in this repo. Consequence: every performance claim
in the audits (including the good ones) is currently unfalsifiable.

**B4 — Two list screens are not virtualized at all; the two that are use
default windowing.** Evidence from source: `/staff-users` renders every row with
`visible.map(...)` inside a `Screen` `ScrollView`
(`Frontend/src/app/staff-users.jsx:352-354`), `/agreements` does the same
(`Frontend/src/app/(tabs)/agreements.jsx:271`, `:337`, `:526`), while the
catalog (`src/components/ServicesSection.jsx:85`) and chat
(`src/app/chat/[agreementId].jsx:291`) use `FlatList` with **no**
`windowSize`, `initialNumToRender`, `maxToRenderPerBatch`, `getItemLayout` or
`removeClippedSubviews` anywhere in `src`. Consequence today: none (11 rows).
Consequence at 150+ rows: full DOM for every row, every search keystroke in
`/staff-users` re-renders all of them, and every 60 s chat poll re-renders all
message bubbles. This is the one structural gap that will become a real
bottleneck as soon as the seed data stops being demo-sized.

**B5 — No render memoisation anywhere, so B4's re-render cost multiplies.**
Evidence: `React.memo` appears **0 times** in `src/components`, `src/app`,
`src/hooks`; `useMemo` appears 1 time in `components` and 1 in `app`;
`renderItem` closures are recreated every render
(`ServicesSection.jsx:94-98`, `[agreementId].jsx:293`); `ServiceCard`
recomputes the joined accessibility label and re-runs `formatIsoDate` on every
render (`src/components/ServiceCard.jsx:47-70`). Consequence today: nothing
measurable at 10 rows (microseconds per render). Consequence once B4 matters:
N rows x N keystrokes.

**B6 — The only unbounded asset is a user-supplied avatar URL, and
`expo-image` is installed but unused.** Evidence: 3 `<Image>` uses
(`src/app/(tabs)/profile.jsx:225`, `src/app/edit-profile.jsx:434`,
`src/components/ProfileSummary.jsx:61`), all 84x84 rendered from
`{ uri: immagine }` with no width/height metadata, no resize params, no
`expo-image` (0 imports of `expo-image` in `src` despite the dependency), no
`loading="lazy"`. Consequence: one pasted 4000 px phone photo is decoded at
full resolution on every screen that shows the profile; zero cost when the URL
is absent, which is why no image requests appeared in the measurements.

**B7 — Desktop menu animation is JS-driven by construction.**
Evidence: `WebNavMenu.jsx` animates `Animated.Value` x 3 + one per route
(`:137-143`) with `useNativeDriver: false` on all seven `Animated.timing`/
`spring` calls (`:176, :186, :191, :200, :214, :246, :258`). The properties
animated are `opacity` and `transform: translateY/scale` (`:415-430`,
`:467`, `:500`) — correct properties, and no `will-change` anywhere in `src`.
Consequence: menu open/close is an rAF-driven JS animation on the main thread;
unmeasurable here (contention), plausible frame drops on low-end phones, none
expected on desktop. Last, not first, because it is one interaction.

**B8 — Polling is conservative and correctly cancelled (not a bottleneck; kept
here only to record the numbers).** Evidence: chat poll 60 s
(`src/hooks/useChat.js:20`, interval at `:195`), unread poll 120 s
(`src/hooks/useNotifications.js:227`, interval at `:336`), session-expiry tick
30 s (`src/hooks/useSessionExpiry.js:22,66`), stream idle watchdog
(`src/api/stream.js:314`). Every interval is created inside `useFocusEffect`
with `clearInterval` in the cleanup, so a blurred screen stops polling.
Consequence: at most one extra 4 s request per minute per mounted screen —
i.e. ~1% duty cycle of a number that is already the bottleneck.

## 3. Fix directions (no code changed here)

**F1 (for B1/B2) — stop paying the latency in perceived time.**
Where: `src/app/(tabs)/index.jsx` (first-load branch, `listaVuota`),
`src/components/ServicesSection.jsx:83-108` (`ListEmptyComponent`,
`ListFooterComponent`), `src/hooks/useServiceCatalog.js` (focus reload),
`src/app/(tabs)/agreements.jsx`, `src/app/staff-users.jsx:121`.
Direction: skeleton rows of the real card height instead of a centred spinner;
keep the previous rows visible while a focus-triggered reload is in flight and
show a thin in-place indicator; never clear the list on focus. Fire
`/categories` and `/services` in parallel (already parallel — verify) and defer
the non-critical one (categories only feed the filter bar) until after the
first page renders.
Expected gain: perceived first-content of the catalog from ~4 s (warm) to the
frame time of the skeleton — the only number in this report whose improvement
is guaranteed regardless of backend. Risk: low; it changes only empty/loading
states, but those states are the ones the UX audits (F21, F32, F53) pinned
copy and live-region semantics to — the skeleton must keep the
`role="list"`/live-region contract.

**F2 (for B3) — establish a production baseline before any further claim.**
Where: repo-level, not app code: `npx expo export --platform web` then serve
`dist/` on its own port and re-run exactly this measurement script.
Expected gain: an actual LCP/bundle number instead of a 13.6–18.4 MB dev
artefact; unlocks every later decision. Risk: none to the app; costs build time
and one idle port. Not run here (would contend with the running dev server and
take many minutes).

**F3 (for B4) — one virtualization decision, applied twice.**
Where: `src/app/staff-users.jsx:352` (`.map` -> `FlatList`, rows already carry
`accessibilityRole="list"/"listitem"` so the role contract survives) and
`src/app/(tabs)/agreements.jsx:271/337/526` (sectioned rows; `SectionList` or a
flattened `FlatList`). For the two existing `FlatList`s, add `initialNumToRender`
and `windowSize` only if F2 shows a cost.
Expected gain: zero today (11 rows), O(n) DOM and re-render floor removed
before it becomes O(n²) with the staff search debounce
(`staff-users.jsx:117-121`). Risk: medium — `staff-users` relies on the
container `View` for the `gap` rhythm and on `Screen` for scrolling; moving to
`FlatList` means `Screen scroll={false}` and `contentContainerStyle`, exactly
the migration the catalog already documented in `ServicesSection.jsx` (F42).

**F4 (for B5) — memoise only where F3 makes it pay.**
Where: `src/components/ServiceCard.jsx` (wrap in `memo`, hoist the
`nomeAccessibile` computation), `src/components/MessageBubble.jsx`,
`renderItem` at `ServicesSection.jsx:94` and `[agreementId].jsx:293`.
Expected gain: ~0 at 10 rows; proportional to row count after F3. Risk: low,
but `memo` on a card whose `servizio` object is rebuilt by the normaliser on
every fetch (`src/api/normalizers.js`) buys nothing — the memo only pays if the
row identity is stable across the poll/refresh cycles, which needs checking.

**F5 (for B6) — bound the avatar.**
Where: `src/app/(tabs)/profile.jsx:225`, `src/app/edit-profile.jsx:434`,
`src/components/ProfileSummary.jsx:61`.
Direction: `expo-image` with `contentFit`/`cachePolicy` plus a fixed 84/120 px
decode target, or append a resize parameter server-side. Expected gain:
avoids full-resolution decode of arbitrary uploads; zero when no URL. Risk:
low, but `expo-image` on web changes the error path (`onError` currently drives
the `immagineRotta` state) — that state is a documented UX requirement.

**F6 (for B7) — move the menu animation off the JS thread, or prove it
doesn't matter.**
Where: `src/components/WebNavMenu.jsx:172-258`.
Direction: `useNativeDriver: true` for the pure opacity/transform values, or
port the three values to reanimated worklets (reanimated 4.7 and
`react-native-worklets` are already dependencies, installed and unused in
`src`). Expected gain: main-thread time during open/close only; unmeasured.
Risk: medium — reanimated on web is a behaviour change for a menu that already
works; `useNativeDriver: false` may have been deliberate (web has no native
driver, so `true` throws on some RNW versions — verify before changing).

## 4. What I could NOT measure, and why

- **Production bundle size, FCP/LCP, TBT, FPS on a production build** — not
  measured: `npx expo export` would contend with the running dev server and
  take many minutes inside the session window. This is the single biggest gap;
  F2 is the fix.
- **Rendered list-item count vs total data length per screen (virtualization
  proof by observation)** — not measured: every Playwright run except
  `/profile` was still on Metro's "Bundling..." overlay when the wait expired
  (per-route compile 4.9–29.8 s under four concurrent clients), so
  `[role="listitem"]` counts were 0 on screens that do render lists. The
  structural answer was obtained from source instead (B4), and the payload
  totals (10 / 11 / 2 / 5 rows) make the question moot for now.
- **DOM node count for `/`, `/match`, `/agreements`, `/chat/1`,
  `/staff-users`** — not measured (same reason). Only `/profile` reached
  content: 140 nodes.
- **INP / interaction latency** — not measured: no clean window to produce
  interactions without another assessment's load skewing the result.
- **Frame rate during the menu animation** — not measured: dev-mode main
  thread is saturated by Metro; any FPS number would be a measurement of the
  bundler.
- **Cold vs warm backend split** — not measured separately: every sample was
  contended, and the spread (min 1.93 s, max 32.92 s) is dominated by queueing
  rather than by any cold-cache effect I could isolate.
- **Image decode cost** — not measured: none of the seeded profiles carries an
  avatar URL, so zero image requests occurred (`initiatorType` census had only
  `link`, `fetch`, `css`).
- **Memory over time / leak detection** — not measured: heap was sampled once
  per screen (11.8–35.9 MB, dev tooling included); a growth curve needs a
  longer run than the window allowed.

## 5. Do not bother (looks optimizable, isn't, given these measurements)

- **Virtualizing the current lists right now.** 10, 11, 2 and 5 rows. F3 is
  sequencing work for growth, not a fix for a felt problem.
- **`React.memo` sweeps over `ServiceCard`/`MessageBubble`.** Zero measured
  render cost at this data size; 0 `memo` in the codebase is a code-review
  observation, not a bottleneck.
- **Font optimisation.** `src` contains no `useFonts`/`expo-font` call and no
  `fontFamily` other than `'inherit'` (`DateField.jsx:70`); the only webfont is
  the Ionicons glyph font bundled by `@expo/vector-icons`. There is nothing to
  subset or preload.
- **Route-level code splitting.** Already happening: separate
  `entry`/`_layout`/`(tabs)/_layout`/route chunks per navigation were observed
  in resource timing.
- **Pruning `expo-symbols`, `expo-glass-effect`, `expo-device`,
  `expo-web-browser`.** No import of any of them exists in `src`, so they cost
  the web bundle nothing today. Removing them is churn with a native-module
  risk; re-check after F2's export before touching `package.json`.
- **Tightening the polling intervals.** 60 s chat / 120 s unread, both cleared
  on blur; the traffic is ~1% of the cost of a single screen load.
- **CLS work.** 0.003–0.010 on every non-dev-contaminated run; the only 0.200
  reading came from a screen loaded under the dev bundling overlay. Re-measure
  after F2 before spending anything here.
- **`useTokens()` cost.** It is a single ternary on the colour scheme
  (`src/theme/tokens.js:171-173`); 0 allocations worth naming.

## 6. Recommended impeccable commands, in priority order

1. `/impeccable optimize` — re-run this pass against a production export
   (`expo export` + static serve) to replace B3's dev numbers, then land F1
   (skeleton + keep-rows-while-refreshing), which is the only client-side change
   that provably improves perceived speed given a 4 s median backend.
2. `/impeccable harden` — the 4 s median / 15 s p95 reality means loading,
   timeout and retry paths are load-bearing UI, not edge cases; audit them
   against `REQUEST_TIMEOUT_MS` in `src/api/client.js` and the state matrix in
   `docs/frontend.md`.
3. `/impeccable layout` — cast the F3 virtualization decision together with the
   list/`gap`/`Screen` scrolling contract (the catalog already documents this
   migration as F42; the other two screens have not had it).
4. `/impeccable animate` — F6 (menu animation on the JS thread) and a pass over
   which properties are animated versus which only look animated.
5. `/impeccable distill` — trim the `/profile` DOM (140 nodes for one form plus
   a two-row sheet) and the duplicate wrapper layers inside cards, before the
   list work in F3 raises the row count.
6. `/impeccable polish` — final pass once F1/F3/F6 have landed and been
   re-measured.
