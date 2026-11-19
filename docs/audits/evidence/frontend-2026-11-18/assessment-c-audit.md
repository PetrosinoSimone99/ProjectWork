# Assessment C — `/impeccable audit` technical pass (Baratto-lo frontend)

Date: 2026-11-18
Assessor: Assessment C2 (replacement run; the previous attempt hung inside `audit-shots/web-audit.js`, which this run
did not execute)
Target: `Frontend/src` — app, components, hooks, theme, api, services, validation, navigation
Volume: 27,014 lines including 30 test files; largest component `WebNavMenu.jsx` (605 lines)
Platforms: **Web** (react-native-web 0.21.4 / Expo SDK 58) and **Native** (React Native 0.88.1, iOS + Android)
Mode: **READ-ONLY**. Nothing was fixed; everything is documented for a later pass.
Method: `impeccable/reference/audit.md` (web, 5 dimensions, 0-4) and `impeccable/reference/audit.native.md`
(native, 5 dimensions, 0-4), merged into one de-duplicated findings list.

> **Two honest limitations, stated before any score.**
> 1. There is **no iOS/Android emulator and no physical device on this machine**, and the repo holds no native
>    build artifact (managed Expo — native projects are generated at prebuild). Every native score below is derived
>    from source against `audit.native.md`, `ios.md`, `android.md` and `docs/accessibility.md`. No VoiceOver or
>    TalkBack session, no frame-timing capture, no Dynamic Type render exists.
> 2. All 52 rendered captures in the evidence directory are **browser** renders of react-native-web. Native has
>    been read, not seen.

---

## 1. Audit Health Score — WEB

| # | Dimension | Score (0-4) | Key finding |
| --- | --- | --- | --- |
| 1 | Accessibility | **4** | WCAG 2.2 AA is met in code across the board: `aria-level` headings with per-role defaults (`AppText.jsx:81-82`), `role="main"` / `role="navigation"` / `role="dialog" aria-modal` with a real focus trap, `lang="it"` (`+html.jsx:25`), `aria-invalid` + `aria-describedby` on every field, `aria-disabled`/`aria-busy`, and polite live regions in 8 files. Minor gap: an `EmptyState` that *replaces* an unmounted loading row is not announced (P3-1). |
| 2 | Performance | **3** | Lean dependency set and token-driven styles, but the app's only always-mounted animation runs on the JS driver in all 7 call sites (`WebNavMenu.jsx:176,186,191,200,214,246,258`) and `expo-image` is a declared dependency that nothing imports. |
| 3 | Theming | **4** | `grep` for hex and `rgba(` across every non-test component returns **zero hits**: every colour is a token. Two complete palettes, `border` split from `borderInput` for WCAG 1.4.11, a single `disabled` opacity, and a preference persisted with a pre-paint `ready` gate so the first frame is already in the right theme. |
| 4 | Responsive Design | **4** | Measured: `scrollWidth === clientWidth` at 320, 375 and 412 px on catalog, agreements, profile and notifications; zero controls under 44 px on every screen probed. Three-tier width system (`maxContent 560` / `maxCatalogo 720` / `sogliaLarga 1024`) applied to the scrolling node, not its ancestor. Residual: the 380 px refresh-label collapse (P2-7) and no tablet-width capture beyond the 404 (evidence gap, §9.3). |
| 5 | Implementation Integrity | **4** | `impeccable detect --json Frontend/src` → **exit 0, `[]`**; the same command with `--no-config` → **exit 0, `[]`**. No suppressed anti-patterns are hiding behind inline ignores. Manual context verification agrees: a small named component set over one token module, with the reason for each value written next to it. |
| **Total** | | **19/20** | **Excellent** — minor polish only; the debt in this repo is on the native surface, not the web one |

## 2. Audit Health Score — NATIVE

| # | Dimension | Score (0-4) | Key finding |
| --- | --- | --- | --- |
| 1 | Accessibility (VoiceOver / TalkBack) | **3** | Labels, roles and states are thorough (37 non-test files carry `accessibilityLabel`; every `Pressable` is either labelled or wrapped by a labelled component) and **no `allowFontScaling={false}` and no `maxFontSizeMultiplier` exist anywhere** — Dynamic Type is not defeated. `useReducedMotion` is a real `AccessibilityInfo` subscription, not a media-query mock. The deduction is the single global touch floor: `target.min = 44` (`tokens.js:95`) sits below the **48 dp** Android minimum (P1-4), with no per-platform override and no `hitSlop` on most icon controls. |
| 2 | Performance | **3** | Virtualisation is real where it was thought about (`ServicesSection.jsx:75`, `chat/[agreementId].jsx:291`) and absent where it matters most (`agreements.jsx:271`, `staff-users.jsx:353`). `expo-image` unused means no memory/disk avatar cache. Reanimated 4, worklets and gesture-handler are all installed and all unused. |
| 3 | Appearance & Theming | **4** | Same token system as web plus `Appearance.setColorScheme`, with `'unspecified'` correctly used for "follow system" (the documented RN 0.86+ `null` TurboModule crash), `StatusBar style="auto"` and `expo-system-ui`. `tabBarLabelStyle` deliberately carries no font size so a 200 % text scale cannot clip the label. |
| 4 | Platform Conformance | **2** | The weak dimension. `react-native-gesture-handler` is declared and imported **nowhere**, so no gesture is composed and the iOS back-swipe depends entirely on `react-native-screens` defaults; every animation is the JS `Animated` driver; `DateField` is two different widgets behind `Platform.OS`; `44` instead of `48 dp` on Android. The navigation *shape* is also web-derived — a fixed top-right pill bar (`WebNavMenu`) is the primary IA on web while native gets the stock `Tabs` bar for the same route list. |
| 5 | Adaptivity | **2** | No size-class / window-size-class handling. `layout.sogliaLarga` (1024) is read by `PageHeader.jsx:102` behind `Platform.OS === 'web'`, so on an iPad or an unfolded foldable the app renders the 560 pt phone column centred on a large surface — no second column, no master-detail, no denser grid. Landscape is not locked, and `KeyboardAvoidingView` (`Screen.jsx:183-185`) does set `behavior="padding"` on iOS. |
| **Total** | | **14/20** | **Good** — but Platform Conformance and Adaptivity are what a native release would expose |

**On merging the two totals:** they are not averaged. 19/20 and 14/20 measure two surfaces of one codebase, and the
gap between them *is* the finding: the web build is finished, the native build is correct but thin.

## 3. Implementation Integrity verdict

**WEB — PASS.** `impeccable.cmd detect --json Frontend/src` returns `[]` with exit code 0. Re-running it with
`--no-config` (project detector config, inline `impeccable-disable` comments and `DESIGN.md` context all bypassed)
also returns `[]` — so the clean result is a property of the code, not of the suppression. Manual verification in
context finds nothing the detector missed: `grep` for `#RRGGBB`, `#RGB` and `rgba(` across every non-test component
returns **zero hits**; the component layer is a small named set (`AppText`, `AppButton`, `AppInput`, `AppCheckbox`,
`Card`, `Banner`, `EmptyState`, `ModalShell`, `Screen`, `PageHeader`, `PillBar`, `ToneChip`, `FocusRing`,
`AppIcon`) each with one job, driven by one token module whose every value carries its reason — and, for contrast,
its measured ratio.

**NATIVE — PASS, with conformance debt.** Nothing here reads as a web page pasted into a `View`. `Screen` owns
safe-area insets, keyboard avoidance with per-platform behaviour, pull-to-refresh (explicitly disabled on web where
the gesture means nothing) and the web nav reservation in one place. `Tabs` is the stock expo-router bar with token
colours. `ModalShell` is a genuine modal with `role="dialog"`, `aria-modal`, `tabIndex={-1}`, an Escape handler that
only the topmost panel answers, and first/last focus restoration. The debt is not slop — it is the absence of
platform *polish*: no image cache, no size classes, JS-driver animation, a 44 dp floor on Android, and one
web-shaped IA that native never renders but that shapes the route list.
**Verdict: a React Native app, not a web port — whose native surface is thinner than its web surface.**

## 4. Executive Summary

- **Audit Health Score:** Web **19/20 (Excellent)**, Native **14/20 (Good)**. Reported separately; not averaged.
- **Total issues:** 20 — **P0: 0 · P1: 4 · P2: 10 · P3: 6**.
- **Two evidence corrections made during this audit** (both would have been false positives in a faster pass):
  - The `"h1":[]` reading in `audit-shots/mobile-360.log` is a **script artifact**, not a defect: the probe queried
    `<h1>` elements, while react-native-web renders `accessibilityRole="header"` as `div[role="heading"]
    aria-level="1|2"`. Headings exist and are correctly levelled (`AppText.jsx:81-82`). See §9.4.
  - `"piccoli":"0/0"` in the same log means **zero candidate controls were found**, so that row proves nothing
    about target sizes. The target-size claim in this report rests on the separate, explicit
    `"controls under 44pt -> none"` lines in `mobile/notes.txt`.
- **Top critical issues:**
  1. **`GET /get-agreements` returns every agreement the viewer ever had, and the screen renders them all inside a
     `ScrollView`** (`agreements.jsx:271` inside `Screen.jsx:154`). This is the only unbounded list in the app and
     it accumulates forever, while the two bounded lists (catalog, chat) already use `FlatList`.
  2. **`WebNavMenu` runs all seven of its animations on the JS driver**, and it is mounted on every authenticated
     screen — the single highest-frequency animation in the product competes with the render work it triggers.
  3. **Android touch targets are 44 dp, below the 48 dp platform minimum**, and `target.min` is one global constant
     with no platform branch.
  4. **Native never adapts past phone width**: `sogliaLarga` is web-gated, so tablet and foldable users get a
     centred phone column.
  5. **`expo-image` is paid for in `package.json` and imported nowhere** — three avatar surfaces re-download with no
     memory or disk cache.
- **Recommended next step:** `/impeccable optimize` for the list and image debt, `/impeccable animate` for the
  driver split, `/impeccable adapt` for size classes and the Android floor, then `/impeccable polish` to close.

---

## 5. Findings

Severity: **P0** blocking · **P1** major · **P2** minor · **P3** polish. One entry per issue across both platforms;
the affected platform is stated in each entry.

### P0 — blocking

None. No finding prevents task completion on either platform, and the rendered evidence (52 captures, four viewport
widths, two engines) shows every primary flow — login, catalog, filter, propose, accept, chat, notifications,
profile, staff, report — reaching a usable state.

### P1 — major

#### [P1-1] The one unbounded list is rendered inside a `ScrollView`

- **Location**: `Frontend/src/app/(tabs)/agreements.jsx:203` (`<Screen scroll …>`) → `:271`
  (`bucket.map((accordo) => <AgreementCard … />)`); the scroll body is `Frontend/src/components/Screen.jsx:154`;
  the data comes whole from `listAgreements` (`api/areas/agreements.js:54-57`, documented as "every agreement the
  viewer participates in, in the …" — one response, no pagination) consumed by `hooks/useAgreements.js:72`.
- **Category**: Performance (native), Performance (web)
- **Impact**: Agreements are never deleted — the concluded bucket keeps every finished exchange — so this collection
  grows monotonically with account age. Every visit mounts every card, keeps every card's state alive, and forces
  the `ScrollView` to measure the full content height on each layout pass. The catalog (`ServicesSection.jsx:75`)
  and the chat (`app/chat/[agreementId].jsx:291`) already use `FlatList`, which makes this an oversight rather than
  a house style: the list with no upper bound is the only one without virtualisation. On a two-year-old account this
  is the screen that will jank first, and it is the screen the product's whole value proposition funnels into.
- **Standard**: `audit.native.md` §2 "Unvirtualized lists"; iOS HIG / Android list-recycling guidance for long
  collections.
- **Recommendation**: Convert to `SectionList` over the existing buckets — the smallest diff, and it preserves the
  current grouping, the `SectionTabs` filtering and the `RefreshControl` already wired through `Screen`. Keep the
  bucket header in `renderSectionHeader` so the divider behaviour is unchanged, and keep `bottomSpacing={BELL_SIZE +
  BELL_MARGIN * 2}` (the comment explaining that the floating bell must not cover the last row is worth preserving).
- **Suggested command**: `/impeccable optimize`

#### [P1-2] Every animation in `WebNavMenu` runs on the JS driver

- **Location**: `Frontend/src/components/WebNavMenu.jsx` — `useNativeDriver: false` at `:176`, `:186`, `:191`,
  `:200`, `:214`, `:246`, `:258` (7 call sites, every `Animated.timing`/`Animated.spring` in the file).
- **Category**: Performance (both platforms)
- **Impact**: This is the app's only always-mounted animation and the one users trigger most: open and close the
  navigation. Running it on the JS thread means the panel opens while the JS thread is simultaneously mounting the
  route list, the hover handlers and the roving-focus state — i.e. exactly when frames are scarcest. Two of the
  seven animate only `transform: scale` (`scalaControllo`, `:246`/`:258`) and one only `opacity` (`fadePannello`,
  `:176`), which are legal native-driver targets; the `progressoPannello` height/offset interpolation is the one
  that legitimately needs `false`. The reduced-motion alternative already exists and is correct
  (`useReducedMotion` wired at `:111`), so only the driver is wrong.
- **Standard**: RN guidance — `useNativeDriver: true` for `opacity`/`transform`; `audit.native.md` §2 "main-thread
  jank".
- **Recommendation**: Split the animations: `opacity` and `transform` to `useNativeDriver: true`, the layout
  interpolation left at `false` with a comment saying why (the file's comments already explain the reduced-motion
  branch, so the house style supports this). Better still, express `progressoPannello` as a `translateY` on a
  fixed-height panel — then all seven qualify and `useNativeDriver: false` disappears from the file.
- **Suggested command**: `/impeccable animate`

#### [P1-3] Native has no width adaptation past the phone column

- **Location**: `Frontend/src/theme/tokens.js:153` (`layout = { maxContent: 560, maxCatalogo: 720, sogliaLarga:
  1024 }`); consumed at `components/PageHeader.jsx:102` behind `banda && Platform.OS === 'web' &&
  larghezzaFinestra >= layout.sogliaLarga`; `components/Screen.jsx` applies `colonna(layout.maxContent)`
  unconditionally on both platforms.
- **Category**: Adaptivity (native), Responsive (native)
- **Impact**: On an iPad (768–1366 pt), an Android tablet, or an unfolded foldable, the app renders a 560 pt column
  centred on the large surface: no second column, no master-detail (`agreements` → `chat` is a push, never a
  side-by-side), no larger type ramp, no denser grid. `sogliaLarga` exists as a concept and is a dead token on
  native because of the `Platform.OS === 'web'` guard. For a messaging-shaped product this is the difference
  between "runs on a tablet" and "is a tablet app" — the modal the user will actually be in (chat) is the canonical
  master-detail case and gets the phone treatment.
- **Standard**: `audit.native.md` §5 "Stretched phone layouts: tablet/iPad rendering a scaled-up phone UI instead of
  using size classes"; iOS HIG "Layout / Size classes"; Android `WindowSizeClass`.
- **Recommendation**: Wrap `useWindowDimensions` in a `useSizeClass()` hook returning `compact | regular | expanded`
  off the same `sogliaLarga` number, and use `regular`/`expanded` on both platforms. The highest-value single
  change is a two-pane `agreements` + `chat` layout on `regular` and up; the second is letting `PageHeader` claim its
  gutter band natively once the column is not the page.
- **Suggested command**: `/impeccable adapt`

#### [P1-4] Android touch targets sit at 44 dp, below the 48 dp platform minimum

- **Location**: `Frontend/src/theme/tokens.js:95` — `export const target = { min: 44 };`, documented as "la regola
  di accessibilità CT06 dice che ogni controllo premibile è alto e largo almeno `target.min`" and pinned by
  `docs/accessibility.md:70` ("At least 44 pt here (project rule, stricter than the 24 CSS px minimum)"). Used at
  20+ sites including `AppCheckbox.jsx:39`, `AppInput.jsx:93-94`, `BackButton.jsx:24-25`, `FilterBar.jsx:154,348,
  349,370,371,398,410,411`, `ListSelector.jsx:173,213`, `ModalShell.jsx:338-339`, `PillBar.jsx:69`,
  `ServiceDetailModal.jsx:211`, `TextLink.jsx:35`. `hitSlop` appears only three times (`AppInput.jsx:90`,
  `BackButton.jsx:22`, and `FilterBar.jsx:346` where it is a comment explaining that `hitSlop` was *replaced* by an
  explicit 44).
- **Category**: Accessibility (native), Platform Conformance
- **Impact**: The project floor is stricter than WCAG's 24 CSS px and exactly meets iOS's 44 pt — but Material and
  Android's own guidance is **48 dp**, and a 44 dp target on a 3× density Android device is measurably harder to
  hit than the platform promises. Because the constant is global and single, the shortfall is uniform: every chip,
  every filter control, every modal close is 4 dp under on Android. The comment in `FilterBar.jsx:346` shows this
  was already reasoned about once ("l'icona da 18 con `hitSlop` arrivava a 34"), which makes the 44→48 step the
  natural completion of that same reasoning rather than a new debate.
- **Standard**: Material Design "Touch targets: 48 dp"; `audit.native.md` §1 "Touch targets: below 44 pt (iOS) /
  48 dp (Android)".
- **Recommendation**: Make the token platform-aware — `Platform.select({ android: 48, default: 44 })` — or expose
  `target.min` (44, iOS/WCAG) and `target.android` (48) and have the shared primitives read the right one. Because
  every site already reads the token, this is a one-line change that fixes all 20+ controls at once; that is exactly
  the payoff the token system was built for.
- **Suggested command**: `/impeccable adapt`

### P2 — minor

#### [P2-1] `expo-image` is a paid-for dependency that nothing imports

- **Location**: `Frontend/package.json:18` (`"expo-image": "~58.0.18"`); `grep -rn "expo-image" Frontend/src` → **0
  hits**; the three avatar surfaces import the base component instead — `app/(tabs)/profile.jsx:2` and `:225`,
  `app/edit-profile.jsx:2` and `:434`, `components/ProfileSummary.jsx:2` and `:61`.
- **Category**: Performance (both platforms), Implementation Integrity
- **Impact**: Three user-facing surfaces render a remote avatar with no memory cache, no disk cache, no placeholder,
  no transition and no decode targeting; each mount re-fetches the same bitmap, and on web there is no control over
  `loading`/`decoding`. The components already compute an initials fallback (`ProfileSummary.jsx:65-80`) and handle
  `onError`, so the expensive part of the work is done — only the component is wrong. Shipping a dependency that is
  installed, updated and bundled but never imported is the worst of both worlds: all of its cost, none of its value.
- **Standard**: Not a WCAG violation; `expo-image` is the supported remote-image path for SDK 58.
- **Recommendation**: Swap the three imports to `expo-image`'s `Image` with `cachePolicy="memory-disk"`,
  `contentFit="cover"`, a short `transition`, and the initials block as `placeholder`. If the dependency is
  genuinely unwanted, remove it from `package.json` — but do not leave it declared and unused.
- **Suggested command**: `/impeccable optimize`

#### [P2-2] `staff-users` renders an accumulating page inside a `ScrollView`

- **Location**: `Frontend/src/app/staff-users.jsx:231` (`<Screen scroll withBottomInset={false} …>`) → `:353`
  (`visible.map((user) => …)`, with `accessibilityRole="list"`/`"listitem"` at `:352`/`:354`); the accumulation
  comes from `usePagedList({ carica, dimensione: PAGE_SIZE })` at `:107`.
- **Category**: Performance (native)
- **Impact**: `usePagedList` grows `visible` as the operator pages; rows are never unmounted, so the DOM/native view
  tree grows through the session. Staff screens are used by operators in long sessions, which is exactly the case
  where a non-virtualised list costs the most. Lower urgency than P1-1 because the audience is small and the first
  render is bounded by `PAGE_SIZE`.
- **Standard**: `audit.native.md` §2 "Unvirtualized lists".
- **Recommendation**: Same conversion as P1-1 — `FlatList` with `onEndReached` bound to the existing `carica`, the
  current loading row as `ListFooterComponent`, and the `list`/`listitem` roles preserved on the rows.
- **Suggested command**: `/impeccable optimize`

#### [P2-3] Three animation/gesture dependencies are installed and unused

- **Location**: `Frontend/package.json` — `react-native-reanimated: 4.7.1`, `react-native-worklets: 0.13.0`,
  `react-native-gesture-handler: ~3.3.0`. `grep` over `Frontend/src`: **zero** imports of
  `react-native-gesture-handler`, **zero** `useAnimatedStyle`/`withTiming`/`'worklet'` occurrences. `Animated` from
  `react-native` (JS driver) is the only animation API in the app, used in exactly one file.
- **Category**: Performance (app weight), Implementation Integrity
- **Impact**: Reanimated 4 + worklets is a native build-graph participant; gesture-handler likewise. Carrying all
  three unused means every install pays for them, an SDK bump can break on them, and on web the bundle carries what
  the bundler cannot shake out. It also removes the obvious fix for P1-2 and P1-1 from the table, because the
  better-informed reader assumes the team is not using native-driver animation *yet* — when in fact the API for it
  is already installed and the code simply uses the other one.
- **Standard**: `audit.native.md` §2 "App weight: bloated JS bundle or binary, unused dependencies".
- **Recommendation**: Pick one. Either adopt — Reanimated for the `WebNavMenu` panel and a `Gesture.Pan()` for the
  drawer, which would retire P1-2 outright — or remove all three from `package.json`. The middle state is the only
  wrong answer.
- **Suggested command**: `/impeccable optimize`

#### [P2-4] No `accessibilityHint` or `accessibilityActions` on the row components

- **Location**: `components/AgreementCard.jsx` (labels at `:109`, no hint), `components/QueueCard.jsx`,
  `components/NotificationRow.jsx`, `components/EntryCard.jsx`, `components/ServiceCard.jsx` — `grep -rn
  "accessibilityHint\|accessibilityActions" Frontend/src` returns **0 hits**.
- **Category**: Accessibility (native)
- **Impact**: VoiceOver and TalkBack announce the name and the role but not the consequence. Rows that open a chat,
  that accept a proposal and that delete something all sound the same until the label is spelled out, and the small
  secondary icon inside each row is the only route to the destructive action — a rotor "Actions" menu would give a
  screen-reader user a first-class way to reach it instead of hunting for a 44 dp glyph.
- **Standard**: `audit.native.md` §1 "Missing labels: … state announcements"; iOS HIG "Accessibility / Provide
  hints"; Material "Custom accessibility actions".
- **Recommendation**: Add `accessibilityHint` to the row `Pressable`s in the product's own phrasing ("Apre la chat
  di questo scambio" already exists as a label at `AgreementCard.jsx:109` and can be reused as a hint elsewhere), and
  attach `accessibilityActions` + `onAccessibilityAction` to the same rows, calling the very handlers the icon
  buttons already call.
- **Suggested command**: `/impeccable harden`

#### [P2-5] `DateField` is two different widgets behind one component

- **Location**: `Frontend/src/components/DateField.jsx:54` (`if (Platform.OS === 'web')` → a web `<input
  type="date">` path), `:131` (`if (Platform.OS !== 'ios')`), `:137` (`Platform.OS === 'ios' ? …`).
- **Category**: Platform Conformance
- **Impact**: The date control is the one place where the web and native renders are different widgets rather than
  the same widget laid out differently. That is defensible — a browser date input is the accessible web answer, and
  the two native picker behaviours are genuinely different — but it doubles the surface that must be verified, and
  in this evidence set only the web side has any rendered proof (`75-report-validation-desktop-light.png`,
  `12-register-validation-empty-required.png`); no native date-picker render exists at all.
- **Standard**: `audit.native.md` §4 "Web-shaped controls"; iOS HIG date pickers.
- **Recommendation**: Keep the branch and make it explicit: two named internal components with two documented
  contracts, so the next reader knows there are two behaviours by design. Then assert the native picker's
  label/value announcement in a test, the way `ReportReviewSheet`/`ReportForm` behaviour is already asserted.
- **Suggested command**: `/impeccable document`

#### [P2-6] The web nav bar's refresh loses its word below 380 px

- **Location**: `Frontend/src/components/WebNavMenu.jsx:126-129` — `const etichettaAggiorna = larghezzaFinestra >=
  380;` with the comment that below 380 the word becomes `accessibilityLabel` only.
- **Category**: Responsive Design (web)
- **Impact**: At a 360–375 px browser width the refresh becomes an icon-only control. The accessible name survives
  (so WCAG 2.5.3 is met) but the *visible* label disappears, which means the bar shows three glyphs to a sighted
  user and the smallest web viewport is the least self-explanatory one. Measured at 375 in the `m375w-*` captures.
- **Standard**: WCAG 2.2 SC 2.5.3 (Label in Name) is satisfied via `aria-label`; SC 1.4.4 at a 200 % zoom is where
  the current threshold becomes fragile.
- **Recommendation**: Either keep the word and let the pill wrap to two lines below 380 px (there is vertical room
  and no competing element), or keep the collapse but add a visible tooltip affordance so the glyph is not the only
  cue. Do not lower the threshold without re-measuring the pill's width, since 380 was evidently measured.
- **Suggested command**: `/impeccable adapt`

#### [P2-7] Tab bar sets no `tabBarHideOnKeyboard` and no end-of-list clearance is evidenced

- **Location**: `Frontend/src/app/(tabs)/_layout.jsx:22-40` — `screenOptions` includes `headerShown`,
  `tabBarActiveTintColor`, `tabBarInactiveTintColor`, `tabBarStyle` and `tabBarLabelStyle`, and nothing else;
  `grep` confirms `tabBarHideOnKeyboard` is absent from the repo.
- **Category**: Adaptivity (native), Platform Conformance
- **Impact**: On a form-heavy screen (report, edit-profile, offer-and-request) the bar either floats above the
  keyboard or is pushed, depending on the platform default, and neither behaviour was chosen. Separately, `Screen`
  accepts `withBottomInset` and `bottomSpacing`, which suggests end-of-list clearance is handled — but no capture in
  this evidence set shows a native list scrolled to its end, so "the last row clears the tab bar" is a claim with no
  proof. Recorded because the failure mode (last row permanently under the bar) is common and silent.
- **Standard**: iOS HIG tab bars; Android bottom navigation with `WindowInsets`.
- **Recommendation**: Set `tabBarHideOnKeyboard: true` explicitly (a decision either way beats a platform default),
  then capture one scrolled-to-end list per tab on a device and document the `withBottomInset` contract in
  `docs/frontend.md` so a future change does not quietly remove it.
- **Suggested command**: `/impeccable adapt`

#### [P2-8] The live stream fails under dev CORS and degrades silently

- **Location**: `Frontend/src/api/stream.js:151-190` (`openWithFetch`: `fetch` with `Authorization` + `Accept:
  text/event-stream`, `.catch` → `onError({ status: 0 })`), chained to `hooks/useEventStream.js:136-152`
  (`alGuasto` → `console.warn('[stream] connessione interrotta', …)` guarded by `__DEV__`, then exponential backoff
  capped by `STREAM_BACKOFF_MAX_MS`). Evidence: `mobile/notes.txt` —
  `"pageerror: Fetch API cannot load http://localhost:8000/api/stream?after=35 due to access control checks."`
- **Category**: Implementation Integrity (web runtime)
- **Impact**: The failure *is* handled — the catch fires, state goes `connected: false`, the 120 s poll takes over,
  and the 401 case is correctly not retried. That is good engineering and it is not what this finding is about.
  What the capture shows is that a CORS preflight rejection surfaces to the harness as a page error, so the only
  diagnostic a developer has is a console warning that is suppressed in production builds. The user-visible
  consequence is "notifications are occasionally late", with no signal to anyone that the stream is down.
- **Standard**: `docs/frontend.md` "Never swallow errors; surface them"; `docs/api.md:301` documents the SSE
  contract, so a rejected preflight is an environment mismatch worth pinning.
- **Recommendation**: Confirm the backend exposes `Access-Control-Allow-Origin` for `/api/stream` on the dev origin
  (`Backend/` is read-only for this audit — report to the maintainer, do not edit). On the client, expose
  `connected` in at least one visible place (a quiet status in the notifications panel) so a permanently
  disconnected stream is discoverable without devtools.
- **Suggested command**: `/impeccable harden`

#### [P2-9] `WebNavMenu` is 605 lines with seven responsibilities

- **Location**: `Frontend/src/components/WebNavMenu.jsx` (605 lines — the largest file in `Frontend/src`, 36 % larger
  than the next, `FilterBar.jsx` at 445) plus its companion `Frontend/src/hooks/web-chrome.js` (66 lines).
- **Category**: Implementation Integrity (maintainability)
- **Impact**: One file owns the pill control, the panel, the animation choreography (three `Animated.Value`s plus a
  per-route stagger array), the hover state for three separate targets, the roving ↑/↓ focus, the Escape handling
  and focus restoration, the outside-click dismissal, and the subscription to the published screen chrome. Every
  navigation change touches a file that can break any of seven things, and its animation values (P1-2) sit in the
  same scope as its data flow. The code is correct and heavily commented — this is a structure finding, not a
  defect.
- **Standard**: `docs/frontend.md` single-responsibility module rule and line ceiling.
- **Recommendation**: Split into `WebNavBar` (the pill: app name, refresh, menu control), `WebNavPanel` (the drawer:
  roving focus, Escape, outside click, animation values) and leave `WebNavMenu` as a ~40-line composition that owns
  the `aperto`/`visibile` state. The animation split proposed in P1-2 lands naturally inside `WebNavPanel`.
- **Suggested command**: `/impeccable distill`

#### [P2-10] The chat entry point is conditional, and the evidence set never opened the chat from the UI

- **Location**: `components/AgreementCard.jsx:72-73` (`puoAprireChat = apreLaChat(accordo) &&
  Number.isInteger(accordo.id) && onApriChat !== null`), `services/agreements.js:118-121` (`apreLaChat` returns true
  only for `ACCEPTED` or `COMPLETED`), `app/(tabs)/agreements.jsx:165` (the screen opens on `SECTIONS[0]`, which is
  not the in-progress bucket). Evidence: `mobile/notes.txt` and `audit-shots/mobile-360.log` — two `TimeoutError`s
  waiting for `button /Apri la chat di questo scambio/i` at 320 and 412, and the two captures that exist
  (`m375w-54-chat`, `m412-54-chat-loaded`) reached `/chat/1` by directing the URL.
- **Category**: Implementation Integrity (evidence and testability)
- **Impact**: Corrected during this audit: the label **is** right (`AgreementCard.jsx:109` —
  `accessibilityLabel="Apri la chat di questo scambio"`) and so is the role (`AppButton.jsx:34` —
  `accessibilityRole="button"`). The capture scripts timed out because the control only exists on a bucket that is
  not the default one, so a script that loads `/agreements` and immediately looks for it will never find it. The
  consequence is not a bug but a blind spot: **the chat screen is the least-evidenced surface in the product**, and
  the product's central interaction is the one the harness could not reach. A reviewer or a future audit will hit
  the same wall.
- **Standard**: WCAG 2.2 SC 4.1.2 (Name, Role, Value) — met; this is a process finding.
- **Recommendation**: Make the capture deterministic rather than changing the UI: have the mobile script select the
  in-progress section (`SectionTabs`) before looking for the card, and capture chat at 375 in both engines. Document
  in `docs/frontend.md` that the chat door exists only on `ACCEPTED`/`COMPLETED`, so nobody re-derives this.
- **Suggested command**: `/impeccable document`

### P3 — polish

#### [P3-1] An empty state that replaces a loading row is not announced

- **Location**: `components/EmptyState.jsx` (no live region, no programmatic focus target) rendered by
  `app/(tabs)/agreements.jsx:264` and `:270`, `components/ServicesSection.jsx` (empty branch), and the staff lists;
  the loading row directly above it (`app/(tabs)/agreements.jsx:105-106`, `components/ServicesSection.jsx:104`) *is*
  a polite live region.
- **Category**: Accessibility (both platforms)
- **Impact**: The loading announcement is correct, and then the node carrying it unmounts and is replaced by the
  empty state, which announces nothing. A screen-reader user hears "Carico gli accordi…" and then silence, and must
  re-explore to learn that the result was empty. The primitive is already right in eight other files — this is the
  seam between them.
- **Standard**: WCAG 2.2 SC 4.1.3 (Status Messages, AA).
- **Recommendation**: Give `EmptyState` a `role="status"`/`aria-live="polite"` on its title (or promote the existing
  `RigaCaricamento`/`ServicesSection` result row into a shared `StatusRegion` used for all three states: loading,
  empty, error). One component, eight call sites already patterned for it.
- **Suggested command**: `/impeccable harden`

#### [P3-2] Three different touch floors coexist beside the `target.min` token

- **Location**: `app/(tabs)/agreements.jsx:372` (`minHeight: 20`), `:444` (`minHeight: 22`), `AppInput.jsx:134`
  (`minHeight: 48`), `CategorySelector.jsx:103` / `:141` (48 / 44), `ListSelector.jsx:86` / `:121` (48 / 44),
  `FilterBar.jsx:329` (`minHeight: 50`), `AppButton.jsx:77` (`minHeight: 50`).
- **Category**: Theming / token discipline
- **Impact**: 44, 48 and 50 all appear as "the touch floor" and every one of them passes the accessibility minimum,
  so there is no violation — only three precedents and no rule for the next person choosing "48 or 50?". The token
  is used correctly in 20+ other places, which makes the exceptions read as accidental rather than deliberate.
  Directly entangled with P1-4: whichever way that is resolved, these literals have to follow.
- **Standard**: `docs/DESIGN.md` § Touch (44 px floor); no WCAG issue.
- **Recommendation**: Add `target.comfortable: 48` and `target.primary: 50` to `tokens.js`, each with the reason it
  exists, and replace the literals; rename `minHeight: 20`/`22` to a `badge.min` token so the badge sizes stop
  looking like broken touch targets.
- **Suggested command**: `/impeccable distill`

#### [P3-3] Micro-spacing values of 3, 6 and 10 px sit beside the `space` scale

- **Location**: `theme/tokens.js:97` (`space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }`); inline
  `gap`/`padding` of `3`, `6` and `10` recur in `FilterBar.jsx`, `PillBar.jsx`, `NotificationRow.jsx` and
  `ToneChip.jsx`.
- **Category**: Theming
- **Impact**: Minor and partly intentional — a 1.5 px border is a border, not a spacing step, and a 6 px gap between
  a dot and its label is a different kind of measurement. Recorded only because the token file documents a single
  shape rule and the audit found the rule honoured for radius (fully) and for colour (fully) but not for the
  smallest spacing steps.
- **Standard**: Internal design-system discipline.
- **Recommendation**: Extend `space` with a `xxs: 4` / `hairline` step rather than inventing `3`/`6`/`10` at call
  sites; deliberately exclude `borderWidth` from the token system and say so.
- **Suggested command**: `/impeccable distill`

#### [P3-4] Dark-mode browser chrome is unproven for the one native web control

- **Location**: `hooks/useWebColorScheme.js`, `app/+html.jsx`, `components/DateField.jsx:54` (the web `<input
  type="date">` path).
- **Category**: Theming (web)
- **Impact**: Six light/dark capture pairs (`10-login`, `20-catalog`, `30-service-detail-modal`, `40-match`,
  `50-agreements`, `52-bell-panel`) prove the token layer in both themes — the theming score rests on that. What no
  capture proves is the browser's *own* chrome in dark mode: scrollbars, the text caret, and the calendar popup of
  the native date input. `useWebColorScheme` exists precisely for this, so this is a verification gap rather than a
  suspected bug — but it is the one part of the theming claim that is inferred.
- **Standard**: CSS `color-scheme`; WCAG 1.4.11 for the resulting popup contrast.
- **Recommendation**: Capture `DateField` with its native picker open in dark mode, plus one scrolled container in
  dark mode, so the claim is evidence rather than inference. If `color-scheme` is not reaching the
  `input[type=date]` element specifically, set it there.
- **Suggested command**: `/impeccable audit`

#### [P3-5] No automated accessibility regression test

- **Location**: `Frontend/src/**/__tests__` — 30 test files; `grep` finds no assertion on `accessibilityLabel`,
  `accessibilityRole`, `aria-level` or any live region. The nearest are
  `components/__tests__/AgreementCard.test.js` and `components/__tests__/NotificationsSheet.test.js`, which assert
  behaviour.
- **Category**: Implementation Integrity
- **Impact**: Every accessibility property this audit scored 4 on is currently protected only by reviewer attention.
  The project already has `jest-expo` + `react-test-renderer` configured (`package.json:52-66`), so the cheapest
  possible net — walk the row components and assert the label is present and non-empty, assert the polite region on
  the loading row — is a single test file.
- **Standard**: Internal.
- **Recommendation**: Add `src/components/__tests__/a11y-contract.test.jsx` that renders each row primitive and
  asserts `accessibilityLabel`/`accessibilityRole` are present and non-empty, plus one assertion per live region.
  Cheap, and it freezes the highest-scoring property in this report.
- **Suggested command**: `/impeccable document`

#### [P3-6] `NotificationsSheet` maps its rows inside the modal's scroll body

- **Location**: `components/NotificationsSheet.jsx:117-131` (`elementi.map(...)`); scroll body at
  `components/ModalShell.jsx:359`.
- **Category**: Performance
- **Impact**: Bounded in practice by the backend page size, so no user-visible cost today. Recorded because it is the
  same `.map`-inside-`ScrollView` pattern as P1-1 and P2-2, and if the inbox ever spans more than one page it becomes
  the same problem — better to fix it in the same pass than to rediscover it.
- **Standard**: `audit.native.md` §2.
- **Recommendation**: Fold into the P1-1 virtualisation pass if the notification list ever grows past one page.
- **Suggested command**: `/impeccable optimize`

---

## 6. Patterns & systemic issues

1. **The token layer is genuinely one system, and its exceptions cluster in sizing, not colour.** Colour (`0` raw hex
   or `rgba` in every non-test component), radius (4 named roles, honoured throughout) and disabled-opacity (one
   value, replacing a former 0.55/0.7/0.4 spread) are fully tokenised. The residue is *sizing*: three touch floors
   (44/48/50) and micro-gaps of 3/6/10. The systemic fix is to extend `target` and `space` — not to hunt literals —
   and P1-4 has to be resolved at the token anyway.
2. **Accessibility was designed once, correctly, and then applied per-file.** The pattern is right everywhere it
   appears: `accessibilityLiveRegion` + `aria-live` pair (because react-native-web ignores the former, and the code
   comments say so), `role="list"`/`"listitem"` on collections, `aria-invalid` + `aria-describedby` on fields,
   `aria-disabled`/`aria-busy` beside `accessibilityState`, `accessibilityRole="header"` + `aria-level` with
   per-role defaults. It appears in 8 files. The gap is not knowledge, it is coverage: the one seam that was missed
   is the transition *from* loading *to* empty (P3-1).
3. **Virtualisation follows "new code" rather than "long list".** `FlatList` in the catalog and the chat;
   `ScrollView` + `.map` in agreements (unbounded), staff users (accumulating) and the notifications sheet (bounded).
   The operative rule in practice is "lists written after the refactor use FlatList"; the ones that were revisited
   are the ones that got it (P1-1, P2-2, P3-6).
4. **Native is a first-class target in the code and a second-class one in the evidence.** Safe-area insets,
   `keyboardWillShow`/`keyboardDidShow` per platform, `Appearance.setColorScheme` with `'unspecified'` for
   follow-system, `tabBarLabelStyle` deliberately without a px size, no `allowFontScaling={false}` anywhere — these
   are the marks of someone who knows RN. But there is no emulator, no device capture, no VoiceOver session, no
   Dynamic Type screenshot, and the tablet story is a web-gated token. **The code believes in native more than the
   process does**, and that asymmetry is the root of both native scores.
5. **Every decision carries its reason, and the reasons are dated.** `tokens.js:16` ("dal 5 ottobre 2026"),
   `NotificationsSheet` (closing, not opening, is what marks as read), `tabs/_layout` (200 % text scale),
   `Screen` (why the scrollbar follows the column). This is most of the difference between 4/4 and 2/4 on
   Implementation Integrity, and it is the asset most at risk: the a11y contract test (P3-5) is the cheapest way to
   protect it, because a comment cannot fail a build but a test can.
6. **The one false positive in the inherited evidence is instructive.** `"h1":[]` and `"piccoli":"0/0"` both look
   like failures and are both artifacts of how the probe counted (see §9.4). A measurement that reports "0" without
   also reporting "of how many candidates" is not evidence — worth fixing in the harness before the next audit trusts
   it.

---

## 7. Positive findings

- **`impeccable detect` returns zero findings, twice.** Exit 0 with project config, exit 0 with `--no-config`. No
  suppressed anti-pattern is hiding behind an inline ignore.
- **Zero hard-coded colours.** `grep -rn "#[0-9A-Fa-f]\{3,6\}"` and `rgba(` across all non-test `Frontend/src`
  files: no hits. Theming is not "mostly tokens", it is tokens.
- **Contrast is measured, not asserted.** `tokens.js` states the ratio beside the value — `borderInput: '#84867F'`
  documented as "3.62:1 su surface, 3.36:1 su background (WCAG 1.4.11)" — and records a *corrected regression*:
  the dark `primaryPressed` was `#3E9169` at 4.46:1, "sotto 4.5, WCAG 1.4.3", and was moved to `#42966C` at 4.75:1.
  A token file that knows why each number is what it is, including its own past mistakes, is the rarest thing in an
  audit.
- **The `border` / `borderInput` split is correct and explained** (`tokens.js:16-25`): WCAG 1.4.11 needs ≥ 3:1 for
  the boundary that identifies a control, while a card's border is decorative, so they are two tokens with two
  ratios — instead of one token that fails one of the two jobs.
- **Heading structure exists and is levelled correctly.** `AppText.jsx:81-82` sets `accessibilityRole="header"` plus
  `aria-level`, chosen deliberately because it is "la sola proprietà che react-native-web e il nativo leggono allo
  stesso modo", with `title → 1` and `heading → 2` defaults and a caller override. `EmptyState` titles inherit it.
- **`lang="it"` is set** (`app/+html.jsx:25`) with the WCAG 3.1.1 reference in the comment — easy to forget, present
  here.
- **Landmarks and dialog semantics are real**: `role="main"` on both the scrolling and non-scrolling `Screen` bodies
  (`Screen.jsx:158`, `:177`), `role="navigation"` on the nav panel (`WebNavMenu.jsx:320`), `role="dialog"` +
  `aria-modal` + `tabIndex={-1}` (`ModalShell.jsx:297-300`) with a first/last focus trap and an Escape handler only
  the topmost panel answers.
- **The focus ring is one global rule, from a token, with its failure documented**: `FocusRing.jsx` injects a single
  `:focus-visible` rule and explains that the browser default was 1.17:1 on the dark surface (violating 2.4.7 and
  1.4.11), plus the one intentional exception for the modal container.
- **Live regions are implemented correctly in eight files**, each pairing `accessibilityLiveRegion` with `aria-live`
  *and saying why* (`Banner.jsx:40-45`, `Screen`-adjacent `LoadingScreen.jsx:11-14`, `ServicesSection.jsx:101-104`,
  `SessionExpiryBanner`, `index.jsx:184-188`, `agreements.jsx:105-106`, `staff-users.jsx:292-317`,
  `NotificationsSheet.jsx:94-95`).
- **No font-scaling suppression anywhere**: zero `allowFontScaling={false}`, zero `maxFontSizeMultiplier` in
  `Frontend/src`. Dynamic Type and Android font scale reach the layout unmodified.
- **Text-scale resilience is designed, not accidental**: `tabBarLabelStyle` sets no size ("a scala testo 200% una
  dimensione in pixel la taglia"), and `agreements.jsx:370` uses `minHeight` not `height` so a badge number is not
  clipped at 200 %.
- **`useReducedMotion` is a real hook**: `AccessibilityInfo.isReduceMotionEnabled()`, a `reduceMotionChanged`
  subscription for hot changes, a `false` fallback with a warning on failure, and a docstring that draws the correct
  line between imposed motion and direct manipulation. Honoured in `WebNavMenu`.
- **`Screen` is a real abstraction, not a wrapper**: safe-area insets, keyboard avoidance with per-platform
  `behavior`, pull-to-refresh disabled on web where the gesture is meaningless, the nav reservation derived from a
  token that documents the coupling, and `colonna()` applied to the scrolling node rather than its ancestor — with
  the comment explaining the scrollbar consequence. Five decisions, one file.
- **Web-only code is properly gated.** `tabBar` renders `() => null` on web only; `SUPPORTA_AGGIORNAMENTO` is a
  `Platform` constant; `FocusRing` and `ModalShell` both guard on `Platform.OS !== 'web' || typeof document ===
  'undefined'` so neither can throw under SSR (`+html.jsx`). No web API leaks into a native path.
- **Responsive measurements came back clean.** `scrollWidth === clientWidth` at 320, 375 and 412 px on catalog,
  agreements, profile and notifications; `"controls under 44pt -> none"` on every screen probed; `troncati: 0`,
  `senzaNome: 0`, `caricamento: 0` on the 360 log rows.
- **The 404 is a real 404**: `w1280-90-not-found` reports HTTP 404 with an empty body served by the app shell, so the
  not-found route is routed rather than faked client-side.
- **Test coverage is real for the logic layer** — 30 files, including `usePagedList`, `useEventStream`,
  `useNotifications`, the 429-line `agreements` service, and component tests for `MessageComposer`, `MessageBubble`,
  `NotificationRow` and `NotificationsSheet`.
- **Somebody already lost this argument and won it**: four separate comments exist where a `hitSlop`, a `caption`
  variant and a `variante` prop were *removed* rather than accumulated ("la vecchia prop `variante` … non esiste
  più"). A codebase that deletes its own hedges is a codebase that will absorb the findings in this report.

---

## 8. Recommended Actions

Priority order. `/impeccable polish` is last because it should close a green gate, not open one.

1. **[P1] `/impeccable optimize`** — virtualise `agreements` as a `SectionList` over the existing buckets (P1-1) and
   `staff-users` as a `FlatList` over the existing `usePagedList` (P2-2); swap the three avatar `Image` imports for
   `expo-image` with `cachePolicy="memory-disk"` (P2-1); resolve the three unused animation/gesture dependencies —
   adopt or remove (P2-3).
2. **[P1] `/impeccable animate`** — split the seven `useNativeDriver: false` call sites in `WebNavMenu` so
   `opacity`/`transform` go native (P1-2); if the panel can be a fixed-height `translateY`, all seven qualify and
   the flag disappears.
3. **[P1] `/impeccable adapt`** — `useSizeClass()` from the existing `sogliaLarga` for tablet and foldable on native,
   starting with a two-pane `agreements` + `chat` (P1-3); make `target.min` platform-aware at 48 dp on Android
   (P1-4, one token fixes 20+ controls); then the 380 px refresh label (P2-6) and `tabBarHideOnKeyboard` (P2-7).
4. **[P2] `/impeccable harden`** — `accessibilityHint` + `accessibilityActions` on the row primitives (P2-4); the
   `StatusRegion` primitive that carries the loading → empty transition (P3-1); make a disconnected stream
   discoverable instead of console-only (P2-8).
5. **[P2] `/impeccable distill`** — extend `target` and `space` and retire the 44/48/50 and 3/6/10 literals (P3-2,
   P3-3); split `WebNavMenu` into bar + panel (P2-9).
6. **[P2] `/impeccable document`** — the a11y contract test that freezes the labels and live regions (P3-5); the two
   `DateField` contracts made explicit (P2-5); the "chat door only exists on ACCEPTED/COMPLETED" note that unblocks
   the capture harness (P2-10).
7. **[P3] `/impeccable audit`** — add the dark-mode native-chrome capture (P3-4) and an axe-core pass over the ten
   main routes, so the next theming and a11y scores stop resting on token maths and rendered reading alone.
8. **[last] `/impeccable polish`** — close the pass once the P1s have landed, and re-run `/impeccable audit` to see
   the score move.

You can ask me to run these one at a time, all at once, or in any order you prefer.

Re-run `/impeccable audit` after fixes to see your score improve.

---

## 9. Measurement appendix

### 9.1 Numbers used, with their source

Every number in this report is either a command run in this session or a value read from a named file. Sources are
marked **(run)** for commands executed by this audit and **(file)** for evidence already on disk.

| Measurement | Value | Source |
| --- | --- | --- |
| Detector findings, project config applied | `[]`, exit code **0** | `impeccable.cmd detect --json Frontend/src` **(run)** |
| Detector findings, project config disabled | `[]`, exit code **0** | `impeccable.cmd detect --json --no-config Frontend/src` **(run)** |
| Raw hex / `rgba(` in non-test components | **0 / 0** | `grep -rn "#[0-9A-Fa-f]\{3,6\}" / "rgba(" Frontend/src` **(run)** |
| `allowFontScaling={false}` occurrences | **0** | `grep -rn allowFontScaling Frontend/src` **(run)** |
| `maxFontSizeMultiplier` occurrences | **0** | `grep -rn maxFontSizeMultiplier Frontend/src` **(run)** |
| `react-native-gesture-handler` imports | **0** (declared in `package.json`) | `grep -rn gesture-handler Frontend/src` **(run)** |
| Reanimated worklet usage (`useAnimatedStyle`/`withTiming`) | **0** (declared: `reanimated 4.7.1`, `worklets 0.13.0`) | `grep -rn` **(run)** |
| `expo-image` imports | **0** (declared at `package.json:18`) | `grep -rn expo-image Frontend/src` **(run)** |
| Files importing `Image` from `react-native` | **3** — `profile.jsx:2`, `edit-profile.jsx:2`, `ProfileSummary.jsx:2` | `grep -rn` **(run)** |
| `useNativeDriver: false` call sites | **7** — lines 176, 186, 191, 200, 214, 246, 258 | `components/WebNavMenu.jsx` **(run)** |
| `FlatList` users | **2** — `ServicesSection.jsx:75`, `chat/[agreementId].jsx:291` | `grep -rn FlatList` **(run)** |
| `.map`-inside-`ScrollView` lists | **3** — `agreements.jsx:271`, `staff-users.jsx:353`, `NotificationsSheet.jsx:124` | `grep -rn` **(run)** |
| Agreements response shape | "every agreement the viewer participates in", no pagination | `api/areas/agreements.js:54-57` **(file)** |
| `accessibilityLabel` coverage | **37** non-test files | `grep -rl accessibilityLabel` **(run)** |
| `accessibilityLiveRegion` / `aria-live` coverage | **8** files — `Banner`, `LoadingScreen`, `ServicesSection`, `NotificationsSheet`, `SessionExpiryBanner`, `agreements.jsx`, `index.jsx`, `staff-users.jsx` | `grep -rn aria-live` **(run)** |
| `accessibilityHint` / `accessibilityActions` | **0** | `grep -rn accessibilityHint accessibilityActions` **(run)** |
| `list` / `listitem` roles | **5** files — `ServicesSection`, `EntriesSection`, `PublicationsSection`, `staff.jsx`, `staff-users.jsx` | `grep -rn accessibilityRole="list"` **(run)** |
| Landmark / dialog roles | `role="main"` ×2 (`Screen.jsx:158`, `:177`), `role="navigation"` (`WebNavMenu.jsx:320`), `role="dialog"` + `aria-modal` + `tabIndex={-1}` (`ModalShell.jsx:297-300`) | `grep -rn role=` **(run)** |
| Heading semantics | `accessibilityRole="header"` + `aria-level`, defaults `title→1`, `heading→2` | `components/AppText.jsx:78-84` **(file)** |
| `lang` attribute | `it` | `app/+html.jsx:25` **(file)** |
| Focus-ring contrast failure being fixed | browser default **1.17:1** on `rgb(27,34,29)`; replaced by `2px solid primary` | `components/FocusRing.jsx` **(file)** |
| Documented contrast ratios | `borderInput` light **3.62:1** on surface / **3.36:1** on background; dark **3.35:1** / **3.77:1**; dark `primary` **5.97:1** on `onPrimary`; dark `primaryPressed` **4.75:1** (was **4.46:1**) | `theme/tokens.js:16-58` **(file)** |
| Token values | `radius {16,12,6,999}` `opacity.disabled 0.7` `target.min 44` `space {4,8,12,16,24,32}` `layout {560,720,1024}` | `theme/tokens.js:75,89,95,97,153` **(file)** |
| `target.min` usage sites | **20+** across `AppCheckbox`, `AppInput`, `BackButton`, `FilterBar`, `ListSelector`, `ModalShell`, `PillBar`, `ServiceDetailModal`, `TextLink`, `agreements`, `profile`, `PageHeader` | `grep -rn target.min` **(run)** |
| `hitSlop` usage | **2** live (`AppInput.jsx:90`, `BackButton.jsx:22`) + 1 comment where it was replaced (`FilterBar.jsx:346`) | `grep -rn hitSlop` **(run)** |
| Touch-floor literals beside the token | `20`, `22`, `44`, `48`, `50` | `agreements.jsx:372,444`, `AppInput.jsx:134`, `CategorySelector.jsx:103,141`, `ListSelector.jsx:86,121`, `FilterBar.jsx:329`, `AppButton.jsx:77` **(run)** |
| Horizontal overflow, 320 px (iPhone SE profile) | `scrollWidth 320 / clientWidth 320` — catalog, agreements, notifications | `mobile/notes.txt`, `m375` cluster **(file)** |
| Horizontal overflow, 375 px (WebKit) | `s:375 / c:375` — catalog | `mobile/notes.txt`, `m375w-20-catalog` **(file)** |
| Horizontal overflow, 412 px (Pixel 7) | `412 / 412` — catalog, agreements | `mobile/notes.txt`, `m412` cluster **(file)** |
| Controls under the 44 pt floor | **none** — four explicit `-> none` lines (catalog, agreements, profile, notifications at 320 and 412) | `mobile/notes.txt` **(file)** |
| Small-target candidates found | **0 of 0** on both logged rows — see §9.4, this row proves nothing | `audit-shots/mobile-360.log` **(file)** |
| Overflow / truncation / contrast / unnamed / stuck-loading on the 360 log rows | `overflow 0`, `troncati 0`, `contrasti 0`, `senzaNome 0`, `caricamento 0` | `audit-shots/mobile-360.log` **(file)** |
| `h1` elements in the rendered DOM | `[]` on both rows — **artifact, see §9.4** | `audit-shots/mobile-360.log` **(file)** |
| Chat textarea geometry at 412 | `{"top":676,"h":96,"vh":839,"value":0,"maxLength":1000}` — 163 px of headroom above the keyboard | `mobile/notes.txt`, `m412-54-chat-loaded` **(file)** |
| Chat reachability from the UI | 2 × `TimeoutError` waiting for `button /Apri la chat di questo scambio/i`, at 320 and 412; reached only by direct URL (`/chat/1`) at 375 and 412 | `mobile/notes.txt`, `audit-shots/mobile-360.log` **(file)** → P2-10 |
| 404 route status | HTTP **404**, body empty | `mobile/notes.txt`, `w1280-90-not-found` **(file)** |
| Web CORS rejection on the live stream | 1 × `pageerror … /api/stream?after=35 due to access control checks` at 320 | `mobile/notes.txt` **(file)** → P2-8 |
| Web nav visible-label threshold | `>= 380` px | `components/WebNavMenu.jsx:128` **(file)** → P2-6 |
| `tabBarHideOnKeyboard` | absent from the repo | `grep -rn tabBarHideOnKeyboard Frontend/src` **(run)** → P2-7 |
| Source volume | **27,014** lines incl. **30** test files; largest component `WebNavMenu` **605** lines (next: `FilterBar` 445) | `find … \| xargs wc -l` **(run)** |
| `ModalShell` interactivity | first/last focus trap, Escape scoped to the topmost panel, `role="dialog"` + `aria-modal` | `components/ModalShell.jsx:94-109,214,297-300` **(file)** |

### 9.2 Rendered evidence consulted

- **`mobile/*.png` — 18 real mobile captures.** 375 Chromium (`m375-20-catalog`, `m375-50-agreements`,
  `m375-70-profile`, `m375-71-notifications`), 375 WebKit (`m375w-20-catalog`, `m375w-21-filters-open`,
  `m375w-51-agreements-in-progress`, `m375w-54-chat`, `m375w-70-profile`, `m375w-71-notifications`), 412 Chromium
  (`m412-20-catalog`, `m412-50-agreements`, `m412-51-agreements-in-progress`, `m412-54-chat`,
  `m412-54-chat-loaded`, `m412-70-profile`, `m412-71-notifications`, `m412-71-notifications-loaded`), plus
  `w1280-90-not-found`.
- **Root of this directory — 34 desktop captures, light and dark.** Login (dark + light), register, register
  validation, catalog (dark + light), filters open, empty result, web nav menu open, service detail modal
  (dark + light), catalog keyboard focus, match (dark + light), offer-and-request (light + dark), agreements
  (dark + light), agreements in progress, bell panel (light + dark), agreements concluded, chat, staff, staff users,
  profile, notifications sheet, edit profile, report form, report validation, public profile, 404.
- **`audit-shots/probe.png`, `audit-shots/probe2.png`** — earlier renders.
- **`audit-shots/mobile-360.log`** — the real measurement log, read and used, including its two artifacts (§9.4).
- **`audit-shots/web-audit.js` — deliberately NOT executed.** It is the file that hung the previous run. Sibling
  captures were read instead.
- **`audit-shots/audit-mobile-360-copy.js`** — not executed either; its output log was used.

### 9.3 Per-dimension measurement status

Every dimension is **measured: partial**. Nothing here is a full measurement, and calling any of it complete would
misrepresent the evidence.

| Dimension | Status | What is missing |
| --- | --- | --- |
| **Web — Accessibility** | measured: partial | The heading evidence came from a saved log (and had to be re-read against source to correct it, §9.4); no axe-core or Lighthouse WCAG run was performed, because the bundled detector does not implement WCAG rules for this project; contrast was verified from the token comments and by reading the light/dark capture pairs, **not** by pixel sampling; no NVDA/JAWS/VoiceOver pass and no zoom-to-200 % capture series. Missing: automated scan of the 10 main routes, one real screen-reader session, one 200 % zoom pass. |
| **Web — Performance** | measured: partial | No Lighthouse/WebPageTest trace, no bundle-size measurement, no LCP/INP/CLS. Conclusions rest on source (dependency weight, driver flags, `Image` vs `expo-image`, list strategy, `useMemo`/`useCallback` presence). Missing: `expo export --platform web` bundle report and one production-mode Lighthouse run. |
| **Web — Theming** | measured: partial | Both themes proven from six capture pairs; token discipline proven by a zero-hit hex/`rgba` grep. Missing: browser-native chrome in dark mode — scrollbar, caret, and the `<input type="date">` calendar popup (P3-4). |
| **Web — Responsive** | measured: partial | Overflow and the 44 px floor measured at 320/375/412 across two engines. Missing: tablet web (768/1024/1280 beyond the 404 capture), text-scale/zoom behaviour, and the `chat` screen at narrow widths from the UI (it opened only by direct URL). |
| **Web — Implementation Integrity** | measured: yes (deterministic) | Detector run twice — with and without project config — both `[]`, exit 0; every finding verified in context; the two inherited "failures" in the log re-examined and reclassified as artifacts. This is the one dimension that is actually complete. |
| **Native — Accessibility** | measured: partial | **Source only.** No VoiceOver/TalkBack session, no Xcode Accessibility Inspector, no Dynamic Type render at any accessibility size. Label/role/state coverage counted by `grep` and read in context; announcement behaviour is *inferred from props, never observed*. The 48 dp Android finding is a guideline comparison, not a measured tap test. |
| **Native — Performance** | measured: partial | **Source only.** No frame timing, no startup trace, no memory profile, no image-cache instrumentation. List strategy and image handling are verifiable from source; "how fast it feels" is not measured at all. |
| **Native — Appearance & Theming** | measured: partial | Token system, `Appearance.setColorScheme` and the `'unspecified'` follow-system branch verified in source. The native render in dark mode was **never seen** — all 52 captures are browser renders of react-native-web. |
| **Native — Platform Conformance** | measured: partial | No device and no simulator: back-swipe behaviour, tab-bar metrics, haptics, native picker behaviour and Material theming are all read from code. `android:windowSoftInputMode` and `Info.plist` could not be inspected — this is a managed Expo app, so they are generated at prebuild and do not exist in the repo. |
| **Native — Adaptivity** | measured: partial | No iPad, tablet or foldable render exists. The *absence* of size-class handling is verifiable from source (P1-3); the severity of the resulting layout is inferred. Landscape behaviour is untested. |

**Bottom line of the appendix.** The web numbers in this report are real: a detector run twice and clean both
ways, four viewport widths across two engines, 52 captures read, 30 test files counted, every cited line verified.
The native numbers are source-derived only, because this machine has no iOS or Android emulator and no device. Any
native score in §2 should be re-confirmed on hardware before it is used to block a release or to justify a large
refactor.

### 9.4 Two corrections made to the inherited evidence

Both entries below looked like findings and are not. They are recorded so that a later pass does not inherit them
as truth.

1. **`"h1":[]` is not a missing-heading defect.** The `mobile-360.log` rows report an empty `h1` array, which reads
   as "no headings". It is an artifact of the probe querying `<h1>` elements: `react-native-web` renders
   `accessibilityRole="header"` as `div[role="heading"][aria-level="1"]`, not as an `<h1>`. Source confirms the
   semantics are correct and deliberately levelled (`AppText.jsx:78-84`: `title → 1`, `heading → 2`, overridable by
   the caller, "la sola proprietà che react-native-web e il nativo leggono allo stesso modo"). Valid ARIA, fully
   supported by NVDA, JAWS and VoiceOver. The residual, recorded honestly as P3-1, is that the *transition* into an
   `EmptyState` is silent — which is a different and much smaller thing.
2. **`"piccoli":"0/0"` is not a pass.** A "small targets" counter reporting `0/0` means zero candidates were
   measured, not zero failures: the probe found no elements matching its selector on those rows. That row therefore
   proves nothing about target sizes, and the target-size claim in this report instead rests on the four explicit
   `"controls under 44pt -> none"` lines in `mobile/notes.txt`, which did enumerate candidates. A measurement
   harness that reports a zero without also reporting its denominator will keep producing findings like these; fixing
   that is worth doing before the next audit depends on it.
