# Full UX / UI / design audit — Baratto-lo frontend

**Date:** 2026-11-18 (evidence collected 23:50 → 01:15 local)
**Scope:** the entire frontend, web and native, every route, overlay, popup, state,
widget and flow.
**Verdict in one line:** a disciplined, token-driven system with genuinely few defects
and **no verified P0**; what limits it is composition (the product's own object — a
directional barter — is never drawn), a vocabulary that names one thing several ways,
and four production failure paths that lose work or lie.

---

## 0. How this audit was produced

Seven independent passes, each isolated from the others so that no pass anchored
another's judgment. The parent session then verified the claims that decided the
verdict (see §3, **Corrections**, which is the most important section in this file).

| Pass | Command | What it covered | Report |
| --- | --- | --- | --- |
| A | `/impeccable critique` | Design review: all 14 routes, overlays, states, light + dark, 375 / 412 / 1280 widths. Nielsen, cognitive load, emotional journey, personas. | `assessment-a.md` (467 lines) |
| B | `/impeccable detect` | Deterministic anti-pattern detector: CLI scan + browser injection + synthetic positive control | `assessment-b.md` (492 lines) |
| C | `/impeccable audit` | Technical audit, two surfaces: web and native. 5 dimensions each, 0-4. | `assessment-c-audit.md` (555 lines) |
| D | `/impeccable optimize` | Measured performance baseline: API latency, payloads, list virtualization, render/animation debt | `assessment-d-perf.md` (338 lines) |
| E | `/impeccable document` (verify-only) | Design-system drift: is `docs/DESIGN.md` still true about the code | `assessment-e-design-drift.md` |
| F | `/impeccable harden` | Production robustness: error paths, destructive actions, concurrency, i18n of failure | `assessment-f-harden.md` |
| G | `/impeccable clarify` | Every user-visible Italian string: vocabulary, labels, error copy, empty states | `assessment-g-copy.md` |

All seven reports live in
`.impeccable/critique/evidence/frontend-2026-11-18/`, together with **51 screenshots**
(32 desktop light + dark, 19 mobile) and the measurement logs. The seven reports and the
mobile measurement log are committed at
`docs/audits/evidence/frontend-2026-11-18/`; the screenshots stay in the tool directory
captures only, reproducible from `smoke.js` and `audit-shots/*.js`.

**Environment:** Expo dev server (`:8081`) against the real Docker backend (`:8000`),
seeded demo accounts (`giulia.bianchi` 0 credits with an OPEN queue, `demo.staff`,
`luca.ferrari`, …), password `demo1234`. Dev mode, unminified bundle, three browser
passes concurrently — see §3 for what that invalidates.

---

## 1. Scores at a glance

| Dimension | Score | Band | Source |
| --- | --- | --- | --- |
| Nielsen heuristics (10, web) | **23 / 40** | Acceptable | A |
| Cognitive load (8-item checklist) | **6 / 8 fail** | High load | A |
| Technical audit, web | **19 / 20** | Excellent | C |
| Technical audit, native | **14 / 20** | Good | C |
| Copy quality | **3 / 4** | Good | G |
| Production robustness | **3 / 4** | Good | F |
| Detector (anti-patterns) | **clean** on every scanned page | — | B |
| Design-system drift | **30 points** (0 P0, 5 P1) | Document holds | E |
| Backend latency (median / p95) | **4.01 s / 15.27 s** per call | Dominant cost | D |

Nielsen breakdown (A): status 3, real world 2, control 3, consistency 2, prevention 3,
recognition 2, efficiency 2, minimalism 3, error recovery 2, help 2. Nothing scores
0-1: **there is no broken screen**; the weakest are language, recognition of the
exchange, efficiency, and help.

Technical breakdown (C): web — accessibility **4**, performance 3, theming **4**,
responsive **4**, implementation integrity **4**. Native — accessibility 3, performance 3,
theming **4**, platform conformance 2, adaptivity 2. The web build is finished; the gap
between 19/20 and 14/20 *is* the finding: **the native surface is correct but thin**, and
platform conformance plus tablet adaptivity are the two dimensions pulling it down.

---

## 2. What is genuinely good (do not "fix" these)

1. **The token layer is real.** `tokens.js` is the single source: no hard-coded colour
   or radius was found outside it in the audited tree, both palettes exist for every
   role, contrast ratios are declared next to the values, and `border` is honestly
   split from `borderInput` (a distinction most design systems never make). C scored
   theming 4/4 on both surfaces.
2. **Error copy is mapped, not leaked.** Every API status is translated to an Italian
   sentence per area (`api/client.js`, `api/areas/*`), backend English and enum values
   never reach the screen, there are **zero** exclamation marks and no emoji. G called
   this "unusually disciplined for a project of this age".
3. **Destructive actions are guarded.** `ConfirmModal` precedes accept, refuse, cancel,
   report and every staff action, each naming the person and the consequence; the one
   exception is the credit spend (§4, P1-3), and that is exactly why it stands out.
4. **The state vocabulary is explicit.** Every list distinguishes "not loaded yet" from
   "loaded and empty", every read guards against out-of-order responses, and the
   loading/empty/error/loaded quartet is present almost everywhere (F's matrix found the
   gaps, which are few).
5. **Focus and keyboard work on web.** A visible focus ring, a focus trap in modals,
   `PageHeader` back control, and `31-catalog-keyboard-focus` shows a card reachable by
   Tab.

---

## 3. Corrections — claims this audit REJECTS after verification

This section exists because two of the most alarming findings in the passes were wrong.
Both were verified live by the parent session against the running app; the numbers below
are reproducible.

### 3.1 REJECTED: "the 404 route renders a blank page" (was P0, pass A)

A reported the not-found route serving only an unresolved spinner, with a blank white
page, and called it the audit's only P0. **It is a dev-mode artifact.** Measured:

| Probe | Result |
| --- | --- |
| First `GET /rotta-che-non-esiste`, at 5 s | empty body — Metro is compiling `app/+not-found.jsx` on first visit |
| Same page at 15 s | `"Pagina non trovata \| Il collegamento che hai aperto non corrisponde a nessuna schermata dell'app. Si può riprendere da dove funziona. \| Torna al login"`, one working button |
| Console | one `404` for the document, which is the correct HTTP status for the route |

The route is correct, its copy is correct, and the button works. A's evidence was real —
it simply waited too little for a first-visit route compile, the same reason several
desktop captures and every `m412-*` capture showed Metro's overlay instead of the app.

**Consequence:** the audit has **no verified P0**. One residual question stays open and is
cheap to close: A also cited the static export (`dist/+not-found.html`). Verify once on a
production build (`npx expo export` then serve `dist/`) before closing the topic. Until
then this is P3, "verify on prod build", not a bug.

### 3.2 REJECTED: "no programmatic heading structure on web" (raised as P1, settled as an artifact)

C measured `h1: []` on a saved probe log and momentarily concluded screen-reader users get
no document outline; C then caught its own artifact before closing the run (its final web
accessibility score is 4/4, and its §9.4 explains the mistake). The parent session
re-verified it independently. **The probe queried the wrong node type**: `react-native-web` maps
`accessibilityRole="header"` to `role="heading"` + `aria-level`, and `AppText.jsx:81-82`
sets both. Measured live, per route:

| Route | h1 | h2 | `role="heading"` | Levels found |
| --- | --- | --- | --- | --- |
| `/login` | 1 | 0 | 1 | `1\|Accedi` |
| `/` (catalog) | 1 | 0 | 1 | `1\|Servizi` |
| `/agreements` | 1 | 2 | 3 | `1\|Accordi`, `2\|Proposte inviate`, `2\|Nessuna proposta inviata` |
| `/profile` | 1 | 5 | 6 | `1\|Profilo`, then `2\|…` per section |

The hierarchy is correct, including depth. **What is real** is the residue: `aria-level`
is emitted on nodes whose role was overridden to text, so the attribute carries no role
and is ignored by assistive technology. Measured: **10 nodes on the catalog** (the service
card titles) and **1 on `/profile`** (the avatar initials `GB` — precisely the case
`docs/DESIGN.md` says must not be a heading). That is **P3, invalid ARIA residue**, not a
missing outline, and the fix is to stop emitting `aria-level` when the role is not
`header` (`AppText.jsx:81-82`).

### 3.3 QUALIFIED: "the detector reports clean" (pass B)

Real, and provable: the browser pass found zero findings on 8 pages, and the synthetic
positive control proves the engine fires (4 independent rules, one a contrast rule using
real computed style). But B's own caveat must be carried forward: on the **CLI** scan of
JSX sources the page-dependent half of the 62-rule catalog does not run, so the CLI's
`0` is real but weak. **The clean result means "no rule fired on the real DOM", not "the
detector was a no-op" — and not "there is nothing to fix here".**

### 3.4 QUALIFIED: every web performance number (pass D)

D measured in dev mode with three browsers running at once. Its ranking is therefore
built on **contention-insensitive** evidence (TTFB vs total, payload sizes, data volumes,
source structure), and it says so. Two headline numbers are nevertheless trustworthy
because they are server-side: median **4.01 s** and p95 **15.27 s** per API call over
n=77 interleaved samples, with TTFB ≈ total in every sample (< 2 ms delta) — the latency
is server queueing, not transfer. The dev bundle (13.6-18.4 MB decoded, LCP 25-37 s) is a
**dev-tooling cost**, not a shipped one; the shipped number has never been measured in
this repo, and that is itself a finding.

---

## 4. Priority list (merged, de-duplicated)

Severity: **P0** blocks a task · **P1** will hurt a real user in the first week · **P2**
real but narrower · **P3** polish. Counts: **P0: 0 · P1: 11 · P2: ~30 · P3: ~30** across
the seven passes.

### P1 — fix before the next demo

| # | Issue | Where | Why it matters | Fix | Command |
| --- | --- | --- | --- | --- | --- |
| 1 | **A mid-session `401` destroys typed work** on every screen except `edit-profile`. Token lives 1 h with no renewal, so this is a scheduled event, not an edge case. | `auth/auth-context.jsx:80-92`; forms in `app/report.jsx:52`, `MessageComposer.jsx:23`, `AgreementFormModal.jsx:66-70` | The only finding that destroys user-generated content. Text is gone and the app does not return where it was (`ritorno` is set only by `edit-profile.jsx:191`). | Promote the existing draft+return mechanism to every route that holds a form. | `harden` |
| 2 | **A failed accept/refuse inside the bell panel reports nothing.** The panel receives the list error, never `actionError`. | `app/(tabs)/agreements.jsx:226` (banner in the body), `:299-303` (panel props) | Accepting is irreversible; a silent failure makes the user repeat an irreversible decision. | Pass `actionError` into the panel and render it above the rows. | `harden` |
| 3 | **One tap spends a credit with no confirmation.** The `Ricerca` button creates the queue and debits a credit inside the same transaction. | `app/(tabs)/match.jsx:132-148`, `:250-270` | The only action in the product that moves money, and the only irreversible one with no `ConfirmModal`. Compounded by the P1 label below. | `ConfirmModal` naming the cost and the balance (the screen already reads `profile.crediti`). | `harden` |
| 4 | **The decisive action is taken blind.** The proposal panel shows a handle and a date; the two services being exchanged are not on screen, and the confirm repeats the person, not the trade. | `app/(tabs)/agreements.jsx:596-613` (+ panel rows) | The single most consequential tap in a barter product is taken without seeing the barter. | Show both services and both directions inside the panel and the confirmation. | `clarify` |
| 5 | **A successful exchange has no completion path.** An `ACCEPTED` agreement's only doors are `Apri chat` and `Annulla scambio`. | `AgreementCard.jsx:104-135`, `app/(tabs)/agreements.jsx:51` | The product's happy ending does not exist; the only exit from a good exchange is destruction. | Provide a completion action and reflect it in the card. Needs a product decision + backend check first. | `shape` |
| 6 | **A `404` is offered a `Riprova` that can never succeed** (verified live: `GET /chats/agreement/999999` → `404 {"error":"Chat not found."}`). | `hooks/useChat.js:111-118`, `app/chat/[agreementId].jsx:263-272` | A retry loop that looks like a bug, in the screen a demo reaches most. The terminal state already exists in the codebase. | Map `404` to `EmptyState` with a navigation action, no retry; keep retry for `0/5xx`. | `harden` |
| 7 | **The staff review note is destroyed by a failed save** (409/403/network): the sheet closes and the 2000-character note is lost. | `app/staff.jsx:214-235` vs the deliberate restore at `:536-543` | Irreversible documentation loss, with no way back. | In the `catch`, restore `setReview(confirm)` before showing the banner. | `harden` |
| 8 | **Chat send has no in-flight guard**: a same-frame double tap sends twice, and `send-message` returns only an acknowledgement so nothing reconciles. | `hooks/useChat.js:203-230`, `MessageComposer.jsx:25,31-37` | A duplicate message in a negotiation reads as spamming the other person. | Ref guard inside `invia` in addition to the state. | `harden` |
| 9 | **Touch target below the floor**: the staff operations log rows are ~26 pt tall, no `minHeight`, no `hitSlop`. Separately, the global floor itself is `target.min = 44` (`tokens.js:95`), which is below the **48 dp** Android minimum, with no per-platform override. | `StaffOperationsLog.jsx:115-131`; `tokens.js:95` | Violates the project's own `target.min` rule, WCAG 2.5.8, and the Android platform minimum on the platform Andrea demos least but the audience uses most. | `minHeight: target.min` (or `hitSlop`) on the log rows; a per-platform floor (`44` iOS / `48` Android). | `harden` |
| 10 | **The accent is spent twice on `/login` and `/register`** (a filled primary disc in the masthead *and* a filled primary submit) and **claimed by chrome** on `/agreements` (a filled primary bell disc floating over a screen whose only other actions are secondary). | `AuthShell.jsx:30-38` + `login.jsx:117`, `register.jsx:439`; `app/(tabs)/agreements.jsx:419-423` | The rule "the accent is spent once per screen" is the system's signature; breaking it on the two first screens a user sees is what makes an interface look assembled rather than designed. | Neutral masthead; the accent belongs to the primary action. | `colorize` / `quieter` |
| 11 | **The chat scrolls in the wrong node on web**: the measure stays on `Screen` above the `FlatList`, so the scrollbar sits on the column edge and the wheel over the gutters does nothing. | `app/chat/[agreementId].jsx:228`, `:291-293`, `Screen.jsx:134-144` | The exact F14 defect `DESIGN.md` declares closed, reopened on the most-used screen. | Pass the measure to the scrolling child. | `layout` |

### P2 — the next pass

#### Design and composition (A, E)
- Every screen is the same composition: header band + stack of 16 px cards + full-width
  pills. Nothing draws the product's own object — a **pairwise, directional barter**: an
  agreement renders as `@giulia.bianchi: Aiuto compiti…` / `@demo.staff: Revisione…`, which
  reads like a chat transcript with no direction (who gives what to whom), and `/chat`
  names neither the counterpart nor the exchange. → `bolder`.
- The catalog row carries five meta tokens; at 412 they re-wrap into a different shape per
  card (4 lines, then 2, then 3), destroying the scan rhythm exactly where scanning
  matters. → `layout`.
- Decision points above four options: catalog filters = 5 (at 375 they stack and push the
  results below the fold), staff-users = 7, staff root = 5 status pills + two unrelated
  sections, web menu = 5. → `distill` / `layout`.
- Two notification surfaces with different names and anatomy (the floating bell "Proposte
  ricevute" and the `Notifiche` sheet), the same inbox reachable from one and not the
  other. → `distill`.
- `/user/[id]` drops `PageHeader`, cards and the meta line for a raw bulleted list. → `polish`.
- Copy explains the interface in three places (the two-line filter legend, the pagination
  note in staff filters, the theme note on profile). → `clarify`.
- Every action is the same full-width pill, so `Apri chat` and `Annulla scambio` carry
  identical weight. → `polish`.

#### Vocabulary (G — 8 P1 findings, this is the biggest single cluster)
- One thing, several names: `Ricerca` / `Richiesta`; the delivery sheet is `scheda` and
  `accordo` (and its own button is a bare noun `Accordo`); the exchange is `scambio` in
  prose and `accordo` in the tab; `Mansione` where every other surface says `descrizione`;
  `Carica altri 20` (number in copy) next to the catalog's `Carica altri`; `Riprova` (8×)
  and `Ricarica` (2×) for the same recovery; `Crea account` / `Crea il tuo profilo` /
  `Registrati` for one act.
- Seven success/info banners are dismissed by **"Ho capito"**, a button that performs no
  action and says the user understood something nobody asked.
- Five high-stakes labels state the object instead of the outcome (`Offerta` / `Ricerca`
  on the screen that spends a credit; `Accordo` for a panel that is written).
- `1 di 1` beside `Cosa offro` / `Cosa cerco`: a ratio with no unit that is always `1 di 1`.
- `Qualcosa non ha funzionato. Riprova.` is the fallback for every non-`ApiError` throw, so
  it is the visible message in more states than it should be.
- `il server non ha accettato la scheda` — the machine talking about itself; `segnalalo`
  names no channel.
- English leaks: one notification row ("Your report has been reviewed and confirmed."), and
  an `01:11 AM` clock inside an otherwise Italian date set.

#### Accessibility (C, F)
- 11 orphan `aria-level` attributes (10 catalog card titles, 1 avatar) — §3.2.
- Validation errors are not announced on native and focus does not move to the first
  invalid field: `AppInput.jsx:60-112` handles `aria-invalid`/`aria-describedby` for web
  only, and the error `AppText` has no live region. → `harden`.
- Two loading surfaces are a bare spinner with no label and no live region:
  `offer-and-request.jsx:365-369`, `staff.jsx:447-451`.
- `403` is explained as a permission problem when its only cause is an inactive account
  (`api/client.js:36`); honest copy exists only for service writes.
- No connectivity awareness anywhere: no `NetInfo`, no `navigator.onLine`; losing signal
  shows the same banner as a 500 and nothing retries on reconnect.
- A storage failure breaks login *after* the token was already issued
  (`auth/token-store.js:12-22`), which can then hit the login throttle.

#### Performance (C, D)
- **The backend is the product's perceived speed**: median 4.01 s, p95 15.27 s per call
  (worst: `/get-agreements` p95 32.9 s, `/auth/login` 28.8 s). Nothing client-side changes
  this; the client can only stop showing a blank spinner while it waits (skeletons, keep
  the previous list visible on focus refetch).
- **Every focus re-fires the slow call**, so tab switching re-pays the 4 s: `useFocusEffect`
  in `useServiceCatalog`, `useAgreements`, `usePagedList` consumers, `useChat`.
- **`/agreements` and `/staff-users` are not virtualized at all** (`.map` inside `Screen`'s
  `ScrollView`); the two existing `FlatList`s set no `windowSize`, `initialNumToRender`,
  `maxToRenderPerBatch`, `getItemLayout` or `removeClippedSubviews`.
- **`expo-image` is installed, paid for, and never imported**: avatars go through the
  react-native `Image` in `profile.jsx`, `edit-profile.jsx`, `ProfileSummary.jsx` — no
  cache, no placeholder, no decode sizing, no lazy loading on web. C also found that
  **reanimated 4, worklets and gesture-handler are installed and entirely unused**.
- **`WebNavMenu` animates on the JS driver in 7 places** (`useNativeDriver: false`),
  including pure `opacity`/`transform` ones, and it is the app's only always-mounted
  animation.
- Zero `React.memo` in `src` (matters only after the two lists above).
- The shipped bundle has never been measured: no production number exists in the repo.

#### Native (C — the two weakest dimensions)
- **Platform conformance 2/4**: `react-native-gesture-handler` is a dependency with zero
  imports, so the iOS back-swipe relies solely on `react-native-screens` defaults;
  `DateField` branches to a web `<input type="date">` shape on web and per-platform pickers
  on native; the whole navigation IA is web-shaped.
- **Adaptivity 2/4**: `layout.sogliaLarga` is read by `PageHeader` behind
  `Platform.OS === 'web'` only, so an iPad or Android tablet renders the 560 px phone
  column centred on a large surface, with no size-class or master-detail variant.

### P3 — polish
- `PageHeader`'s one-sentence subtitle has a ceiling but no floor: 4 of 15 calls omit it
  (`login.jsx:80`, `profile.jsx:192`, `user/[id].jsx:60`, `chat/[agreementId].jsx:181`).
- `AGENTS.md`-level trivia worth one sweep: curly vs straight apostrophe (`’` in ~15
  strings, `'` in ~40); `DateField.jsx` mounted nowhere; the entry-description cap (150)
  disagrees with the API contract (255) and carries a TODO; length counting mixes UTF-16
  units and code points (`.length` vs `[...text].length`), so emoji-heavy text stops at
  half the code points the server accepts; the catalog search field has no `maxLength`.
- The session-expiry clock uses the device locale while every other date is `it-IT`
  (`token-store.js:73-78`), so an English device reads `5:20 PM`.
- The unread badge can stay above zero with nothing to read (5-page cap) and auto-read
  failures are only `console.warn`ed.
- Two components build or override a card surface locally (`NotificationRow.jsx:167-177`,
  `UserServicesMiniCard.jsx:79-90`), against the `Card` owner rule.
- `DESIGN.md`'s own "Where to change what" table is wrong in 3 rows and missing 8 owners;
  its "at most one trailing action" clause contradicts its own "trailing actions form a
  column" twelve lines later. Both are documentation defects, not code defects.

---

## 5. Coverage matrix — what was actually exercised

| Route / surface | Web light | Web dark | Mobile 375 / 412 | Native source |
| --- | --- | --- | --- | --- |
| `/login` | yes | yes | — | yes |
| `/register` + validation | yes | — | — | yes |
| `/` catalog | yes | yes | yes (375 Chromium + WebKit, 412) | yes |
| Filters open / empty result / web menu | yes | — | yes (375 WebKit) | yes |
| Service detail modal + keyboard focus | yes | yes | — | yes |
| `/match` | yes | yes | — | yes |
| `/offer-and-request` | yes | yes | — | yes |
| `/agreements` (list, in corso, conclusi, bell panel) | yes | partial | yes | yes |
| `/chat/<id>` | yes | **no** | yes (375 WebKit, 412 loaded) | yes |
| `/profile` + notifications sheet | yes | — | yes (375 + 412) | yes |
| `/edit-profile` | yes | **no** | — | yes |
| `/report` + validation | yes | — | — | yes |
| `/staff`, `/staff-users` | yes | — | — | yes |
| `/user/<id>` | yes | **no** | — | yes |
| `+not-found` (404) | verified live, renders | — | notes | yes |

**Not covered, with the reason:**
- **A tablet-width capture beyond the 404**: C measured overflow at 320 / 375 / 412 and found
  none (`scrollWidth === clientWidth` on catalog, agreements, profile, notifications) with
  **zero controls under 44 px**, but no ≥ 768 capture exists — which is why native adaptivity
  is scored from source, not seen.
- **Native rendering, gestures, VoiceOver/TalkBack, Dynamic Type at large sizes, keyboard
  insets on a real device**: no emulator or device exists on this machine. The native
  dimension was audited **from source only** — which is why C's native scores are honest
  but not measured.
- **Dark theme on `/chat`, `/edit-profile`, `/user/<id>`**: the dark pass aborted when the
  notifications request returned a 500 (§6).
- **The notifications panel's loading/error/empty states**: never observed, same 500.
- **Production build performance** (LCP, bundle size, FPS): never measured in this repo.
  Every number in D is dev-mode and contaminated; its ranking is built on
  contention-insensitive evidence instead.
- **`impeccable detect`'s page-dependent rules on JSX sources**: they do not run in CLI
  mode by design; the browser pass covered that half on 8 pages.

---

## 6. Open question worth one probe

**A real 500 was captured at ~00:42** on `/agreements`, dark theme, the moment the
notifications bell panel was opened:

```text
[console.error] Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

It is a backend failure surfaced in the UI, not a design anti-pattern, and the endpoint
could not be named from the console line alone. Two consequences: the panel's honest
error handling is **unknown** (does it show an error state or a silent empty list?), and
`docs/backend-ledger.md` G23 documents a `500` for exactly this class on the queue path —
worth checking whether they are the same defect. Reproduce with one Playwright run that
captures the request URL and response body.

---

## 7. Prescribed order for the improvement session

The order is not cosmetic: each step removes the reason the next one looks broken.

1. **`/impeccable harden`** — the four failure paths that lose work (P1-1, P1-2, P1-6,
   P1-7), the double-send (P1-8), the credit confirmation (P1-3), the touch floor (P1-9),
   the `aria-level` residue and the native error announcement. Rationale: a design pass on
   top of a screen that silently eats a 2000-character note is decoration.
2. **`/impeccable clarify`** — the vocabulary cluster and the high-stakes labels (G's 8
   P1s), the banners dismissed by "Ho capito", the `1 di 1` counter, the `il server` copy.
   Do this second because the next step rewrites surfaces and the new copy must be the
   final wording, not a redraft after.
3. **`/impeccable shape`** — P1-5, the missing completion path for a successful exchange,
   plus P1-4 (seeing the trade before accepting). This is a product decision, not a
   style pass: it decides what an agreement *is*, and every later visual change depends on
   the answer.
4. **`/impeccable bolder`** — the composition: draw the directional barter (two columns,
   who offers / who asks, on the card, in the panel, in the confirm), then
   **`/impeccable layout`** for the catalog row at 412 and the chat measure (P1-11),
   **`/impeccable distill`** for the >4-option decision points and the two notification
   surfaces, **`/impeccable quieter`** or **`colorize`** for the accent rule (P1-10).
5. **`/impeccable optimize`** — only after the lists are decided: virtualization for
   `/agreements` and `/staff-users`, `expo-image` for avatars, native driver for the menu,
   the focus-refetch policy, skeletons instead of a blank spinner. The backend's 4 s is
   out of scope for the frontend and must be stated in the demo, not hidden.
6. **`/impeccable adapt`** — tablet size classes for native (C's adaptivity 2/4), then
   **`/impeccable audit`** again to re-score web and native.
7. **`/impeccable polish`** — last: the P3 sweep (apostrophes, `DateField` removal, the
   150/255 limit, the `it-IT` clock, the card-surface owners) and `DESIGN.md`'s own three
   wrong table rows.

Do **not** re-run `/impeccable critique` before step 3 lands: its lowest scores (recognition
2, efficiency 2, minimalism 3) are structural, not cosmetic, and a polish pass would raise
the number without changing the reason.

---

## 8. Evidence index

Committed copy of the seven reports and the measurement log:
`docs/audits/evidence/frontend-2026-11-18/`. The captures below stay in the tool
directory and are not versioned.

```text
.impeccable/critique/evidence/frontend-2026-11-18/
├── assessment-a.md            467 lines  design review, Nielsen, personas
├── assessment-b.md            492 lines  detector, positive control, verdict
├── assessment-c-audit.md      555 lines  web 17/20, native 14/20
├── assessment-d-perf.md       338 lines  measured baseline, ranked bottlenecks
├── assessment-e-design-drift.md         30 drift points vs DESIGN.md
├── assessment-f-harden.md               25 findings, four-state matrix
├── assessment-g-copy.md                 copy findings + replacements
├── *.png                      32        desktop light + dark
├── mobile/*.png               19       375 Chromium, 375 WebKit, 412 Chromium
└── audit-shots/mobile-360.log            overflow / target / contrast measurements
```

---

## 9. Session housekeeping

During this session two Pi settings were raised to run seven assessments in parallel, then
returned to their intended values (`ship-dev/MASTER-HANDOFF.md` §2 is the authority):

- `~/.pi/agent/extensions/subagent/config.json` → `maxSubagentSpawnsPerRun`: raised to 12
  for the fan-out, now **8** (handoff decision 13, 2026-11-19 — not 4, which was the
  value before that decision).
- `~/.pi/agent/settings.json` → `subagents.parallel.concurrency`: raised to 9, now back to
  **6**.

Two facts worth carrying into the next session: these settings are read at process start,
so nothing written here was testable from inside this session; and `checkpointBeforeDeadlineMs`
(300 000) does **not** rescue a child stopped inside a long tool call — the working
remedy is `{action:"stop"}` plus a replacement run, which this session needed twice.
