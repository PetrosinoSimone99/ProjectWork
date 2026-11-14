# Shared evidence brief — Baratto-lo frontend critique (2026-11-11)

Environment, already running. Do not start, restart, or stop anything.

- Web build (Expo Router, react-native-web): http://localhost:8081 — this is the
  only runnable surface here. Native iOS/Android were NOT inspected (no device,
  no simulator available).
- Backend (Symfony, Docker): http://localhost:8000 — seeded with 34 users,
  197 published services, 50 categories.
- Sessions in the browser: `mario.rossi` / `demo` (regular user),
  `staff.anna` / `demo` (staff). Already logged in as `mario.rossi`.
- Known defect, reproduced 3 times: clicking `Accedi` with valid credentials
  returns 200 and stores the token, but the URL stays `/login` and the login
  form stays on screen. Navigating to `/` manually shows the authenticated app.
  Screenshot: `evidence/mobile-light-after-login-stuck.png`.

## Screenshots (all in `.impeccable/critique/evidence/`)

| File | What it shows |
| --- | --- |
| desktop-light-login.png | /login at 1280x900 |
| desktop-light-register.png | /register at 1280x900 (full page) |
| desktop-1920-home.png | / at 1920x1000 |
| desktop-light-home.png | / (catalog) at 1280x900 |
| desktop-light-offer-and-request.png | /offer-and-request at 1280x900 |
| desktop-light-agreements.png | /agreements at 1280x900 |
| desktop-light-profile.png | /profile at 1280x900 (captured while loading) |
| desktop-light-edit-profile.png | /edit-profile at 1280x900 |
| desktop-light-report.png | /report at 1280x900 |
| desktop-light-staff.png | /staff (staff role) at 1280x900 |
| desktop-light-staff-users.png | /staff-users (staff role) at 1280x900 |
| mobile-light-home.png | / at 390x844 |
| mobile-light-home-filters.png | / with the filter panel expanded, 390x844 |
| mobile-light-service-detail.png | service detail sheet open, 390x844 |
| mobile-light-navmenu.png | web nav menu open, 390x844 |
| mobile-light-offer-and-request.png | /offer-and-request at 390x844 |
| mobile-light-agreements.png | /agreements at 390x844 |
| mobile-light-profile.png | /profile at 390x844 |
| mobile-light-match.png | /match (placeholder screen) at 390x844 |
| mobile-dark-home.png | / in the dark theme at 390x844 |
| mobile-dark-profile.png | /profile in the dark theme at 390x844 |
| desktop-dark-home.png | / in the dark theme at 1280x900 |
| desktop-dark-profile.png | /profile in the dark theme at 1280x900 |
| mobile-light-after-login-stuck.png | the post-login defect above |

## Measured DOM facts (Playwright, light theme, logged in as mario.rossi)

- `document.title` is **empty on every route** (`""`). Only `lang="it"` is set.
- No horizontal overflow at 390, 1280 or 1920 (scrollWidth == viewport).
- Heading outlines:
  - `/` → one `H1` "Servizi".
  - `/agreements` → one `H1` "Accordi".
  - `/profile` → `H2` "MR" (avatar initials) **before** `H1` "Mario Rossi", then
    `H2` "Il tuo profilo", `H2` "Modifica profilo", `H2` "Aspetto".
  - `/match`, `/offer-and-request`, `/edit-profile`, `/report` → **no H1 at all**
    (sections start at `H2`).
- Touch targets below 44x44: only the web nav bar button (98x40, height 40).
  Everything else measured >= 44.
- Clickables with no accessible name: 0 on every route.
- `img` without alt: 0.
- Distinct computed font sizes per route: 11, 13, 14, 15, 16, 17, 18, 20, 24, 26
  (base body is 15). 14/16/17/20/24/26 are not in the AppText scale
  (11/12/13/15/19/28).
- Content column at 1920 on `/`: 673 px wide, starting at x=616 (~620 px of empty
  space on each side).
- Console (dev build, all routes): 0 errors; one warning
  `"shadow*" style props are deprecated. Use "boxShadow".`
  Prior sessions also logged `Unexpected text node: . A text node cannot be a
  child of a <View>.` and `Password field is not contained in a form` (Chromium).

## Design-system facts (from the repo, verified by reading)

- `docs/DESIGN.md` is the written system; `Frontend/src/theme/tokens.js` is the
  value source; `Frontend/src/components/*` are the primitives:
  `Screen`, `PageHeader`, `Card`, `AppText`, `AppButton`, `AppInput`,
  `EmptyState`, `ModalShell`, `Banner`, `PillBar`.
- Product: services are **not items with names**, they are the author's own
  sentences ("Metto a disposizione esperienza in ripasso di teoria musicale...").
- Each user is capped at `LIMITE_VOCI = 1` offer and 1 request, but the seed
  data gives every demo user 7 offers. `/offer-and-request` therefore opens with
  the warning "Massimo raggiunto: hai 7 offerte, il massimo è 1. Eliminane 6 per
  aggiungerne un'altra." (visual: `desktop-light-offer-and-request.png`).
- The agreements lifecycle (proposal → agreement → chat → agreement sheet) has
  no backend endpoints yet; `/match` and parts of `/agreements` are placeholders
  by design (`docs/overview.md`, `docs/backend-gaps.md`).
