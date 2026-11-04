# Frontend

## Stack

- **React Native 0.86 + Expo 57** (`baratto-lo-app`), TypeScript-aware JSX
  (`tsconfig.json`).
- **expo-router** for navigation (`src/app` file tree).
- `react-native-web` for the web surface; `expo-secure-store` for the JWT;
  `@expo/ui`, `@expo/vector-icons`, `react-native-reanimated` for UI work.
- Lint: `npx expo lint` (flat eslint config). Type check: `npx tsc --noEmit`.
  Both must be green before any push (root `AGENTS.md` pre-push gate).

## Layer map

| Layer | Location | Rule |
| --- | --- | --- |
| Screens / routing | `src/app/**` | Render + route; no fetch logic |
| Network boundary | `src/api/client.js`, `barattolo.js` | Only place aware of endpoints; also the **only** fake-vs-real switch (`USA_DATI_FINTI` from `config.js`) |
| Normalization | `src/api/normalizzazioni.js` | Backend payload → view model; field renames are handled here, never in components |
| Domain logic | `src/accordi/stati.js` et al. | Pure functions, no React, fully unit-testable |
| Session | `src/auth/auth-context.jsx`, `token-store.js` | JWT in `expo-secure-store`; session flag drives route guards |
| Theme | `src/theme/tokens.js` + context/store | One token source; components read via `useTokens()`, no raw colors |
| Navigation source | `src/navigazione/rotte-tab.js` | Names/titles/icons for tab bar and web menu — one list, two consumers |
| Reusable UI | `src/components/**` | `App` prefix for primitives (`AppButton`, `AppInput`, `AppText`), domain widgets named by role |

## Environment and modes

- `EXPO_PUBLIC_API_PORT` (dev) or `EXPO_PUBLIC_API_URL` (tunnel/build) — see
  [setup.md](setup.md); Metro port collision is detected with an explicit
  error.
- Fake/demo mode: `EXPO_PUBLIC_DATI_FINTI=1`. Canned data lives in
  `src/api/finti/`; the demo banner string is `AVVISO_DEMO` in `config.js`.
  When active, no network call happens — this is by design and must remain
  the single toggle (decisions.md D002).

## Patterns in use

- **Explicit states everywhere:** each screen renders its loading, empty and
  error states explicitly. A fetch error is never swallowed silently; it
  becomes a visible message tied to the failed operation.
- **Pure-logic segregation:** swappable business rules (agreement state
  machine etc.) live in plain modules (`stati.js`), keeping screens thin and
  reviewable.
- **Guarded routes on web:** `(tabs)/_layout.jsx` redirects to `/login` when
  no session exists — the browser URL alone must never grant access.
- **Single naming source:** tab bar and web menu derive from `rotte-tab.js`;
  duplication there is a review blocker.
- **Normalized API payloads:** components consume view models, not raw JSON.

## Code style decisions (changeable via decisions.md — not frozen here, but agreed now)

- **English in code:** new files, identifiers, comments and test names are
  English. Legacy Italian names (`accordi`, `finti`, `normalizzazioni`,
  `rotte-tab`, users of `stati.js`) are grandfathered and get renamed when a
  module is touched as part of scheduled work, not piecemeal.
- UI copy **user-facing text is Italian** (product language); that is copy,
  not code, so it is untouched by D001.
- Components: PascalCase files naming exactly what they render; hooks keep
  `use*` naming and stay in `use*` hooks or are colocated only if screen-
  specific (shared hooks would go to a `src/hooks/` — none yet).
- Styling via `theme/tokens.js` only; no inline hex; spacing/typography from
  the token set.
- Keep functions small and single-purpose (no screens > ~400 lines; split
  into widgets when a screen starts owning flows).
- No emoji in code, logs, or UI copy (root rules); icons come from
  `@expo/vector-icons` (+ `@expo/symbols` on iOS).
- No `dangerouslySetInnerHTML` equivalent, no `eval`, no secret in code:
  backend URL comes from env config only.

## Testing the frontend

- **Expo Go** on a physical device during daily work; **web** for quick
  iteration (`npx expo start --web`).
- **Playwright** drives the web surface for the AI agents' final review of a
  change (auth gate, tab navigation, empty/error states, demo banner).
- Logic modules (`stati.js`) are candidates for pure unit tests once a test
  runner is introduced — currently the pre-push gate is lint + typecheck.
