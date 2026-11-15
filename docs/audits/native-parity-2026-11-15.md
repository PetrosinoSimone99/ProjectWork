# Native parity — 2026-11-15 (cycle 2)

What this cycle can prove about the Expo Go surface **without a device**, and
what is owed to Andrea's phone. The rule of the cycle: no mobile claim without a
proof. Written on `9d1936c`, tree clean, against the Docker stack running
`barattolo_15112026` + `Backend/docker/seed-demo.sql`.

**Method.** Three legs, in this order:

1. **Bundles** — `npx expo export --platform ios` and `--platform android` on the
   final tree, plus `npx expo-doctor`.
2. **Source** — every `Platform.OS` / `Platform.select` branch in `Frontend/src`
   read line by line, with a verdict: does the native side get a real behaviour,
   or does it silently get nothing?
3. **Web, driven** — the exported web build served by `npx expo serve dist`, driven
   by Playwright (`scripts/cycle2-web.js`) against the real backend: light and
   dark, the three surfaces this cycle touched. Captures and raw numbers in
   [`screens-2026-11-15-cycle2/`](screens-2026-11-15-cycle2/).

The device is the fourth leg and it is not the agent's to run: see §5.

---

## 1. The bundles compile

| Check | Result |
| --- | --- |
| `npx expo export --platform ios` | exit 0, `entry-*.hbc` 3.3 MB |
| `npx expo export --platform android` | exit 0, `entry-*.hbc` 3.6 MB |
| `npx expo-doctor` | **20/20 checks passed**, no issues |
| `npx jest` | 15 suites, 180 tests |
| `npx tsc --noEmit` | exit 0 |
| `npx expo lint` | exit 0 |

A bundle is not a running app: it proves the SDK 58 module graph resolves for both
platforms with this cycle's code (new imports included: `AppCheckbox`, `AppInput`
inside `AgreementSheet`, the queue area). It does not prove layout, gestures or
safe areas.

## 2. Every `Platform.OS` branch, with a verdict

Twenty-two code sites (plus one comment in `PageHeader.jsx` that documents a
branch the audits removed); the table below merges `Screen.jsx:25-26` into one
row. The question asked of each is not "does it type-check" but
"what happens on a phone": a web-only branch that leaks into native would be a
silent no-op, which is the failure this leg exists to catch.

| Site | Branch | Native behaviour | Verdict |
| --- | --- | --- | --- |
| `api/config.js:16` | `Platform.OS === 'android' ? 10.0.2.2 : localhost` | emulator loopback for Android, `localhost` for iOS | correct, dev-only |
| `api/config.js:52` | `Platform.OS === 'web'` reads `window.location.hostname` | guarded, native keeps the port rule | ok |
| `api/config.js:63` | `Platform.OS === 'android' && senzaNome` | Android emulator host | ok |
| `app/(tabs)/_layout.jsx:23` | `tabBar={web ? () => null : undefined}` | native gets the default tab bar | code-correct; the five tabs are **unproven on the device** (§5.1) |
| `app/_layout.jsx:77` | `paddingRight: web ? barWidth : space.lg` | native keeps the standard gutter | ok |
| `auth/token-store.js:12` | `web ? localStorage : SecureStore` | native uses SecureStore | ok |
| `components/FocusRing.jsx:33` | `web` + `document` guard | native injects no CSS | ok (native has its own focus model) |
| `components/ModalShell.jsx:114` | `web` Escape listener | native relies on `onRequestClose` | ok |
| `components/ModalShell.jsx:141` | `web` focus / native `setAccessibilityFocus` | native moves the a11y focus | ok |
| `components/PageHeader.jsx:102` | web band above `sogliaLarga` | native never draws the band | ok |
| `components/Screen.jsx:23` | `SUPPORTA_AGGIORNAMENTO = !web` | native gets `RefreshControl` | ok, pull-to-refresh stays native |
| `components/Screen.jsx:25-26` | `ios ? keyboardWillShow : keyboardDidShow` | iOS fires before the animation, Android after | ok, deliberate |
| `components/Screen.jsx:75` | web publishes refresh to the chrome bar | native ignores | ok |
| `components/Screen.jsx:91` | web reserves the menu strip | native adds nothing | ok |
| `components/Screen.jsx:100` | `!web` returns from the focus effect | native does not publish | ok |
| `components/Screen.jsx:185` | `KeyboardAvoidingView behavior: ios ? padding : undefined` | iOS pads, Android relies on `adjustResize` | ok |
| `components/ServicesSection.jsx:61` | `!web` gates `RefreshControl` | native list refreshes | ok |
| `components/WebNavMenu.jsx:112` | `isWeb` guard on the whole component | native renders nothing | ok, mounted everywhere but inert |
| `hooks/useDocumentTitle.js:14` | web only | native no-ops | ok |
| `hooks/useWebColorScheme.js:24` | web only (`color-scheme` on `<html>`) | native uses the OS scheme | ok |
| `theme/theme-store.js:20` | `web ? localStorage : SecureStore` | native persists the choice | ok |

No branch gives native a silent no-op where it needs a behaviour, and no web API
(`document`, `window`, `localStorage`) is reached on native without a guard: see
the inventory below.

### Web APIs and where they are reachable

`document`, `window`, `localStorage`, `navigator` appear in nine files. Each one
is behind `Platform.OS !== 'web'` **and** `typeof document === 'undefined'`
(`FocusRing`, `ModalShell`, `useDocumentTitle`, `useWebColorScheme`) or inside a
`web`-only storage branch (`token-store`, `theme-store`, `api/config`). The two
exceptions are `WebNavMenu` (mounted on every platform at `app/_layout.jsx:65`,
but its body is guarded by `isWeb` for the DOM listeners it installs) and
`navigation/screen-titles.js` (a pure map, no DOM).

## 3. Web, driven (light and dark) — the numbers

The same code, exported for web, at the phone width the audits use (390) plus the
page width (1440). Raw output: `screens-2026-11-15-cycle2/measurements.txt`.

| Check | Measured |
| --- | --- |
| Match tab, credit line | present, once: «Una coda di ricerca costa un credito.» |
| Match tab, create gate | `Offerta` enabled for an account with exactly one offer; the REQUEST button follows the same rule |
| Match tab, create → list → cancel | queue created (`Coda di offerta creata.`), row drawn, cancel goes through `ConfirmModal`, then `Coda annullata: …` |
| Inbox, unread marker | 2 unread rows, one 8 px dot each; card fill stays `surface`, border `primary` |
| Inbox, refresh sentence | 1 occurrence (header only) |
| Agreement card, sheet | 1 sheet block on the accepted agreement («La tua scheda», «Fino al 5 dic 2026», mode, «Scheda confermata.», and the line that says the start is not stored — G20) |
| Dark theme | `document.documentElement.style.colorScheme === 'dark'`; unread dot `rgb(78, 169, 127)`; every token pair legible in the captures |
| Horizontal overflow at 390 | `scrollWidth === innerWidth === 390` |
| Horizontal overflow at 1440 | `scrollWidth === innerWidth === 1440` |
| Touch targets at 390 (inbox, dark) | 7 targets, **0 under 44 px** |
| Visible `h1` per screen | `["Notifiche"]`, `["Accordi"]` — see the finding below for `["Servizi","Match"]` |

Captures: `01-match-light`, `02-match-created`, `03-match-cancel-confirm`,
`04-profile-light`, `05-inbox-light`, `06-agreements-sheet-light`,
`07-profile-dark`, `08-match-dark`, `09-agreements-dark`, `10-inbox-dark`,
`11-match-1440-dark`.

### Findings from this leg

**P2 — the web stack keeps the previous screen in the DOM.** Measured on `/match`
after entering from `/`: two `h1` elements are *visible* (`checkVisibility` with
opacity), «Servizi» and «Match», at the same box (`x16 y80 358×34`), and neither
is `aria-hidden`. A screen reader sees two headings and two `main` regions for one
screen. Pre-existing (the stack behaves the same on every tab), not introduced by
this cycle, and out of scope here: recorded for the accessibility pass. The
earlier audits measured one `h1` because they opened routes directly.

**Environment, not a defect.** The backend answers in 2.0–2.6 s when warm, and the
first call after a restart reached 7.8 s; the client's timeout is 10 s. Two
captures in the first run came out while the app was still on «Caricamento…» for
this reason, which is why the script now waits for the loaded state and not for
the frame. On a cold stack the first screen after a restart can show the timeout
message; documented in `docs/setup.md`.

**G20 — `agreement_details.start_date` cannot hold a date.** The column is
`timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP` in the reference dump
(`Context_and_DB_V2/barattolo_15112026.sql`), so the `UPDATE` that
`send-agreement-details` writes for the two dates stores `end_date` and resets
`start_date` to the moment of the write. Measured: payload `startDate:
2026-12-01` → row `start_date = 2026-11-15 20:34:16`, `end_date = 2026-12-05`. The
card renders both dates as the API returns them, so the start shown is the update
time until the column is fixed. Filed in `docs/backend-gaps.md`.

## 4. What this pass does not prove

- Layout, gestures and safe areas on a real iOS/Android surface: the bundles
  compile, the branches are correct, but nothing here rendered native pixels.
- Pull-to-refresh as a gesture (the code path is `RefreshControl` on native, wired
  in the inbox, the profile, the catalog and now the match tab; the gesture itself
  is untested).
- Keyboard behaviour in the new sheet form (two text fields) on a small screen.
- The tab bar with five entries on a 360 dp device and its safe-area insets.
- VoiceOver / TalkBack announcements of the new chips, dots and badges.
- The queue flows against a phone: every queue proof in this document is web.

## 5. Checklist for Andrea — one line per proof

The agent cannot run these. Each line is a proof to execute, not a claim.

1. `npx expo start`, open Expo Go 58.0.0, log in as `coda.demo` / `demo`: the
   bottom bar shows the five tabs, none clipped, and the active one is green.
2. Match tab: the two create buttons are enabled (this account has exactly one
   offer and one request) and «Una coda di ricerca costa un credito.» is visible.
3. Match tab: create `Offerta` → the row appears with type/status chips, category,
   location; pull down on the list → the native spinner appears and the row stays.
4. Match tab: «Annulla coda» → the confirmation opens with the buttons stacked;
   confirm → the row leaves and the success banner names it.
5. Match tab with an account that has **no** request published: the `Ricerca`
   button is disabled and says «Per una coda di ricerca ti serve un servizio
   pubblicato in «Offro e cerco».»
6. Profile → Notifiche: unread rows carry the green border and the dot, the card
   stays white/black (no green fill) in both themes.
7. Notifiche: «Elimina» → the panel opens; «No, torna indietro» leaves the row.
8. Notifiche: pull down → the native spinner appears and the list refreshes.
9. Profile: pull down → the profile data and the unread chip move together.
10. Stop the backend (`docker compose stop backend`), pull down on the inbox: a
    `Banner` appears and the rows already on screen stay.
11. Catalog → open a service: «Cosa offre e cerca» shows one line per service and
    does not repeat the service you are reading.
12. Agreements → In corso: the accepted agreement shows «La tua scheda» with the
    dates; «Annulla scambio» keeps its red outline.
13. Sheet form on a phone with the keyboard open: both date fields stay visible
    above the keyboard, and typing `AAAA-MM-GG` is possible without autocorrect
    mangling the dashes.
14. Dark theme from the system switch (not the app selector): every new surface
    follows, no white card on a black page.
15. Safe area on a notched phone: the first card is below the notch, the last is
    above the home indicator.
