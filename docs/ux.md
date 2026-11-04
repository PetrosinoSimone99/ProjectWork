# UX

## Platform surfaces

- **Native mobile** via Expo Go — the primary surface.
- **Web** via `react-native-web` — iteration and reviews. On web the bottom
  tab bar is intentionally hidden: navigation is the dot-menu
  (`MenuNavigazioneWeb` in `app/_layout.jsx`), and every screen with a
  session (secondary routes included) mounts it.
- URL deep links on web are guarded: any session-bearing route redirects to
  `/login` without a token.

## Navigation map

**Target navigation is four tabs.** The code still carries the older five-tab
map until the swipe/chat rework lands; the table marks both states.

| Route | Tab | State | Purpose |
| --- | --- | --- | --- |
| `/loop` | Swipe | target (code: Loop) | Swipe feed; the persistence layer is being redeveloped |
| `/offro-e-cerco` | Cerco e offro | current + target | Own offer and request queues |
| `/chat` | Chat | target (code: secondary screen) | Conversations; the persistence layer is being redeveloped |
| `/profilo` | Profilo | current + target | Profile, credits/token summary |
| `/` | — | removed | Home catalog tab is removed from navigation. No replacement screen is defined yet; the catalog endpoints still exist (see [`api.md`](api.md)) |
| `/accordi` | — | current only | Agreement list; becomes a secondary screen |
| `/login`, `/register` | auth group | current | Public |
| `/accordo`, `/nuovo-accordo`, `/scambi` | secondary | current | Agreement flows |
| `/token` | secondary | current | Token balance and redemption (blocked until the backend rework) |
| `/segnala` | secondary | current | Report a user |
| `/modifica-profilo` | secondary | current | Edit profile |
| `/staff`, `/staff-utenti` | staff-only | current | Moderation surfaces (outside the tab bar) |

Tab titles, icons and paths come **only** from `rotte-tab.js`; web menu and
native tab bar cannot diverge.

**Four tabs, nothing else:** Swipe, Cerco e offro, Chat, Profilo. The catalog
tab is dropped from navigation, not hidden — browsing every published service
is no longer a top-level surface. Where filtering survives (inside "Cerco e
offro" or nowhere) is an open decision; do not build a catalog entry point
until it is settled.

## UX rules (project-agreed)

1. **Every state is explicit.** Loading, empty, error, and success feedback
   are rendered; never an unstyled blank or a silent failure.
2. **Errors are human-phrased**, action-oriented; they never leak stack
   traces, APIs or internal paths.
3. **Destructive flows confirm** (cancel agreement, delete offer/request,
   staff deactivation) — no accidental taps.
4. **One primary action per screen**; secondary actions are visually
   subordinate.
5. **No emoji** in UI copy (root rules). Icons from Ionicons (`@expo/vector-icons`) or
   `@expo/symbols` on iOS.
6. **Demo honesty:** in fake mode the `AVVISO_DEMO` banner is shown — content
   without backend backing is always marked as sample data.
7. **Chat parity:** polling-based new-message check keeps both surfaces
   (mobile/web) current without push infrastructure.
8. **Token visibility:** token balance and expiration are always visible in
   the profile area; redemption flows state the consequence before
   confirming (spend = consume).
9. **Agreement progress is explicit:** accepting, waiting for the other side
   and delivering are separate visible states — never a silent wait. There is
   no group hunt to animate any more, and no search-window countdown.
10. **Staff surfaces are separate** from user navigation — role clarity in
    the navigation model, not just permission checks.

## Design tokens

`src/theme/tokens.js` owns colors, spacing, radii, typography; accessed via
`useTokens()`. The dark/surface layering follows the token set — no ad-hoc
values in components. Changes to tokens are a design decision (record in
decisions.md when they alter the visual identity).
