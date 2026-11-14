# Shared evidence brief — Baratto-lo frontend critique (2026-11-12)

Environment, already running. Do not start, restart, or stop anything.

- Web build (Expo Router, react-native-web) on **http://localhost:8081** — the
  only runnable surface inspected. **Native iOS/Android were NOT inspected** (no
  device, no simulator available).
- Backend (Symfony in Docker) on **http://localhost:8000**, seeded with 34 users,
  204 published services, 50 categories. MySQL v2 dump.
- Sessions used: `mario.rossi` / `demo` (regular user, 7 offers, 2 concluded
  agreements), `staff.anna` / `demo` (ROLE_STAFF, 0 offers), plus a logged-out
  state.
- Dev-build caveat: API responses in the Docker dev container take **2–7 s**
  (`/api/profile` measured at 6.5 s). Client timeout is 10 s
  (`Frontend/src/api/client.js:9`). Slow states below are real but their
  duration is a dev-container artifact; the UI behaviour on a slow request is
  not.
- `docs/` is the product's own written system: read `docs/DESIGN.md`,
  `docs/ux.md`, `docs/frontend.md` and `docs/accessibility.md` as the contract
  the app is measured against. `Frontend/src/theme/tokens.js` is the value
  source.

## Screenshots — `docs/audits/screens-2026-11-12/`

| File | What it shows |
| --- | --- |
| desktop-1280-home.png | `/` catalog, loaded, light, 1280x900 |
| desktop-1280-home-error.png | `/` with the timeout banner and its in-banner `Riprova` |
| desktop-1920-home.png | `/` at 1920x1000 (column position, bar position) |
| desktop-1280-home-dark.png | `/` in dark theme at 1280x900 |
| desktop-1280-filters-open / (see mobile) | filter panel open |
| desktop-1280-search-empty.png | `/` after searching `zzzqqq` → 0 results, filter panel open |
| desktop-1280-navmenu.png | web nav popover open (5 destinations) |
| desktop-1280-navmenu-kb.png | same, reached by keyboard |
| desktop-1280-focus.png | focus ring on the tab stop reached after 8 Tabs |
| desktop-1280-service-detail (mobile only) | service detail sheet |
| desktop-1280-agreements.png | `/agreements`, "Inviate" segment |
| desktop-1280-agreements-conclusi.png | `/agreements`, "Conclusi" segment |
| desktop-1280-offer-and-request.png | `/offer-and-request` as a user at the cap (7 offers) |
| desktop-1280-entry-editor.png | `/offer-and-request` as a fresh user: two empty states + two Aggiungi |
| desktop-1280-profile.png | `/profile` |
| desktop-1280-profile-dark.png | `/profile` dark |
| desktop-1280-edit-profile.png | `/edit-profile` |
| desktop-1280-report.png | `/report` (opened cold, no person selected) |
| desktop-1280-staff.png | `/staff` as staff.anna |
| desktop-1280-staff-users.png | `/staff-users` as staff.anna |
| desktop-1280-login.png | `/login` at 1280x900 |
| desktop-1280-register.png | `/register` at 1280x900 |
| mobile-390-home.png | `/` at 390x844 |
| mobile-390-home-dark.png | `/` dark at 390x844 |
| mobile-390-filters-open.png | filter panel expanded at 390x844 |
| mobile-390-service-detail.png | service detail sheet at 390x844 |
| mobile-390x667-service-detail.png | the same sheet at 390x667 (internal scroll, pinned footer) |
| mobile-390-offer-and-request.png | `/offer-and-request` (7 offers) at 390x844 |
| mobile-390-agreements.png | `/agreements` at 390x844 |
| mobile-390-profile-loaded.png | `/profile` at 390x844 |
| mobile-390-edit-profile.png | `/edit-profile` at 390x844 |
| mobile-390-report.png | `/report` at 390x844 |
| mobile-390-match.png | `/match` (declared placeholder) |
| mobile-390-login.png | `/login` at 390x844 |
| mobile-390-register.png | `/register` top at 390x844 |
| mobile-390-register-bottom.png | `/register` scrolled to the foot: "Cosa cerchi" + disabled `Crea account` |
| logged-out-staff-deadend.png | `/staff` while logged out: permanent spinner, no chrome |

## Measured DOM facts (Playwright, this session, light theme unless stated)

- `document.title` is **empty on every route** (`""`). Only `lang="it"` is set.
- No horizontal overflow at 390, 1280 or 1920.
- Heading outline (visible, `aria-level` present):
  - `/` → H1 "Servizi". `/match` → H1 "Match automatico", H2 "Non ancora
    disponibile". `/agreements` → H1 "Accordi" + section H2s.
  - `/profile` → H1 "Mario Rossi", H2 "Il tuo profilo", H2 "Modifica profilo",
    H2 "Aspetto" (initials are no longer a heading).
  - `/edit-profile` → H1 "Modifica profilo", H2 "Immagine del profilo".
  - `/report` → H1 "Segnala alla staff", H2 "Manca la persona da segnalare".
  - `/offer-and-request` (fresh user) → 5 headings, no H1 among the first; the
    screen title "Offro e cerco" is an H1 only after the data loads.
- Touch targets below 44x44: **only the two web chrome-bar buttons**, `Aggiorna`
  101x40 and `Menu` 98x40. Everything else measured >= 44 in both dimensions.
- Focus ring: present and visible on every tab stop (`outline: solid 1.6px
  rgb(31,107,78)`). Tab order on `/` = chrome bar (2) → Filtri → service cards
  (one tab stop each).
- Clickables with no accessible name: 0. `img` without alt: 0.
- Column geometry: at 1280 the content column runs x=297..968 (catalog) and
  x=378..900 (560-measure screens); the web chrome bar runs x=946..1258, y=16..76.
  At 1920 the catalog is x=616..1289 (673 px wide) and the bar is x=1588..1904:
  the bar sits 299 px to the right of the column's right edge.
- The page scrolls inside `main` (`clientHeight` 780 of a 844 viewport at 390);
  the browser scrollbar is drawn at the window edge, not at the column edge.
- Font sizes in computed styles include icon glyph sizes (11–28); text roles are
  `AppText` 28/19/15/13/12/11. Nothing routed through `AppText` was found outside
  the scale.
- Console over the whole session: **0 errors**, 39 warnings — 37 are
  `"shadow*" style props are deprecated`, 1 `props.pointerEvents is deprecated`,
  and 2 `[api] richiesta non raggiunta … signal is aborted` (the 10 s timeout).

## Behaviour verified by driving the app

1. **Login works now.** `Accedi` with valid credentials leaves `/login` and lands
   on `/`; the P0 of the 2026-11-11 critique is closed. The redirect takes ~6 s
   in this environment, and while it does the form looks unchanged.
2. **A logged-out visitor can reach secondary routes by URL.** `/edit-profile`
   redirects to `/login`; `/report` renders its full form; `/staff` and
   `/staff-users` render a permanent "Guardo le segnalazioni…" spinner with **no
   chrome and no back control** and make **no API request at all** (verified: no
   entries in `performance.getEntriesByType('resource')` for `/api/`). The only
   exit is the browser's back button.
3. **Login is a slow, silent wait.** Between tapping `Accedi` and landing on `/`
   the screen shows the same disabled form for ~6 s with no progress state on the
   button.
4. **Search works and the empty state is honest**: `zzzqqq` → `0 di 0 servizi`,
   "Nessun risultato per "zzzqqq"", "Azzera filtri". The empty-state help reads
   "Prova a toglierne uno: "zzzqqq"." (nonsense with a single active filter).
   While the request is in flight the previous count (`20 di 204 servizi`) stays
   on screen under the new "CERCA «ZZZQQQ»" chip.
5. **Segment control on `/agreements` works** and is a `radiogroup` of
   `role=radio` pills with counts; switching it swaps both section title and
   description with no duplicated heading.
6. **`/offer-and-request` as a fresh user** shows, per section: a heading + a
   one-line definition + a primary `Aggiungi`, then an empty state with an icon,
   a title, a 3-line paragraph that repeats the definition and says "Tocca
   «Aggiungi»…". Both sections together fill ~2.6 viewports at 1280.
7. **`/staff` and `/staff-users`** carry a back chevron, a title, a bare link to
   the other screen, then an instructions paragraph in the page header. Left
   edges in one screen: back arrow 390, title 426, link 396, paragraph 378,
   filters 378. `/staff` spends the accent twice (`Tutte` selected + `Ricarica`)
   and its chrome bar shows no `Aggiorna` although the screen owns a refresh.
8. **The service detail sheet** fits 844 and scrolls internally at 667 with the
   primary action pinned. `Segnala` sits inside the scroll area above the
   explanatory caption and above `Invia proposta`.
9. **Filters** at 390: search field + 4 selects (Categoria, Regione, Provincia,
   Modalità) + a 2-line help paragraph + "N filtri attivo · Azzera". Province is
   disabled with "Scegli prima la regione" until a region is chosen. Each control
   applies itself; the search needs `Cerca`.
10. **`/register`** is 2065 px tall at 390 (~2.5 viewports): Nome, Cognome,
    Username, Email, Password, Regione, Provincia, then "Cosa offri" (category +
    150-char "Mansione" + remote checkbox) and "Cosa cerchi" (same). The subtitle
    says "Bastano pochi dati per iniziare a scambiare servizi." The disabled
    `Crea account` explains itself *below* the button. Both description textareas
    expose the same accessible name, "Mansione".
11. **`/profile`**: one card holds identity (initials, name, @username), the data
    rows, the edit row and the theme selector, then a lone `Esci`. The card starts
    16 px from the top of the window; the screen's H1 is the person's name.
12. **Loading is a full-screen replacement on several screens.** `/profile`,
    `/offer-and-request`, `/edit-profile`, `/staff`, `/staff-users` swap the whole
    screen (and the chrome bar) for a spinner + one sentence for 2–7 s; `/` and
    `/agreements` keep header + chrome and show the spinner in the content area.

## Product facts that shape the judgment (from the repo, read)

- A service is **the author's own sentence**, not a titled item
  ("Metto a disposizione esperienza in ripasso di teoria musicale…"). The
  category and the author are the only structured attributes shown.
- Each user is capped at `LIMITE_VOCI = 1` offer and 1 request, but the seed
  gives every demo user 7 offers, so `/offer-and-request` opens with
  "Massimo raggiunto: hai 7 offerte, il massimo è 1. Eliminane 6 per aggiungerne
  un'altra."
- `/match` is a declared placeholder ("Non ancora disponibile") and is the
  **second** destination in the navigation; the agreements lifecycle has no
  backend endpoints yet (`docs/backend-gaps.md`).
- The bell on `/agreements` is the only way to see received proposals.
- `docs/DESIGN.md` states the rules the app is judged by: the accent is spent
  once per screen; one header (`PageHeader`); one card anatomy; one choice
  device; one empty state (title + one sentence + a button only when a real
  action exists); explicit loading/empty/error/loaded states; the header sentence
  says what the screen holds, never how to use it; the web refresh is one control
  in the chrome bar.
