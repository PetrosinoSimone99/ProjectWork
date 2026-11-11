# Screens — final verification, 2026-11-11 (cycle 2)

Five captures of the states this cycle changed, at 390×844, light theme
(`localStorage['barattolo.tema'] = 'chiaro'`), web build
`EXPO_PUBLIC_API_PORT` → `http://localhost:8000`, Metro on 8081. Taken with the
**`browser` MCP server** (Edge channel), not `playwright`: that server wants a
Chrome binary this machine does not have.

Every capture was taken after **two** `networkidle` waits and an assertion that
no loading line (`/Carico|Guardo/`) was on screen, per the plan's environment
note 7. The catalog needed one extra step: the first request after a container
boot times out on the single-threaded PHP dev server, so the screen showed its
own "Il servizio sta impiegando troppo tempo" banner and **Riprova** was pressed
before the capture.

| This cycle | Before (same state) | What changed |
| --- | --- | --- |
| `01-home-390-light.png` | `../screens-2026-11-11/02-home-mobile-light.png` | the filter card reads «Filtri» + chevron and the always-visible foot says «Nessun filtro attivo»; the count left the collapsed row (F45/F84) |
| `02-offer-and-request-390-light.png` | `../screens-2026-11-11/04-offer-request-mobile-light.png` | the account holds 7 offers and keeps them: no add control, and the line reads «Massimo raggiunto: hai 7 offerte, il massimo è 1. Eliminane 6 per aggiungerne un'altra.» (product rule, F92) |
| `03-profile-390-light.png` | `../screens-2026-11-11/06-profile-mobile-light.png` | one sheet divided by 1px rules instead of five peer cards; identity, data, «Modifica profilo», «Aspetto», session line; no «Area staff» for a plain user |
| `04-register-390-light.png` | `../screens-2026-11-11/10-register-mobile-light.png` | the shared auth masthead (F90), one editor per type, and no «Aggiungi un'altra» control anywhere on the screen |
| `05-filters-open-390-light.png` | `../screens-2026-11-11/34-filters-open-390-light.png` | the primed «Filtra» button is gone: «Cerca» sits inside the field, `yoga` typed and not submitted shows as the amber chip «Cerca «yoga»», and the foot still says «Nessun filtro attivo» |

## What the session asserted, not just photographed

Read off the live DOM after the captures above:

1. Typing `yoga` without submitting leaves the foot at «Nessun filtro attivo»
   and renders the chip (F45).
2. Pressing «Cerca» moves the foot to «1 filtro attivo», drops the chip, shows
   «Azzera», and the catalog answers «3 di 3 servizi» (F84).
3. «Azzera» returns the foot to «Nessun filtro attivo» and the catalog to
   «20 di 197 servizi».
4. Registration lists no button whose label contains «Aggiungi»: with one voice
   per type the affordance is not rendered (product rule).
5. `staff.anna` sees «Registro delle operazioni · Nessuna operazione registrata»:
   the demo database holds no staff operations, so F61's vocabulary is verified
   against the backend constants and not against a live line. Writing one would
   have modified demo data, which this cycle forbids.

## Console

`browser_console_messages` over the session: **1 error, 4 warnings**.

- the error is `net::ERR_EMPTY_RESPONSE` on `POST /api/auth/login`, produced
  while the backend container was still booting its PHP server — the retry after
  boot returned 200 and the session carried a token;
- warnings: the pre-existing `"shadow*" style props are deprecated` (already
  recorded by cycle 1), one `[DOM] Password field is not contained in a form`
  from the browser, and `[api] richiesta non raggiunta {method: GET, path:
  services?page=1&limit=20, detail: signal is aborted without reason}` — the
  app's own timeout path, which is the banner the capture shows.

No `react-native-web` overlay appeared in the error state: that is the evidence
F94 closes on. No new warning was introduced by this cycle.

## F74, measured rather than assumed

Same page, same session, two fields, 22 and 10 real `keydown`s with a
`requestAnimationFrame` probe on each key and a `MutationObserver` on the
20-row list:

| Where the typing happens | Frame latency per key (dev build) | DOM mutations inside the list |
| --- | --- | --- |
| `Modifica profilo`, field «Nome» (control) | 23–31 ms, worst 31 ms | none |
| catalog filter field (the finding) | 49–73 ms, worst 73 ms | 67 over 11 keys, ~6 per key |

The catalog's own list therefore does re-render on every keystroke, at roughly
three times the cost of typing into an unrelated form field, and the frame
budget (16 ms) is exceeded in both cases because this is the dev bundle with
React Compiler optimisations off. The number is a dev-build number; the
comparison between the two rows is what makes it attributable.

---

## Cycle 3 — the web refresh action, and F74 measured again

Three captures, added here rather than rewriting the five above. Same viewport
(390×844), same theme (`localStorage['barattolo.tema'] = 'chiaro'`), same
method: two `networkidle` waits, then an assertion that no `/Carico|Guardo/` is
on screen. The `browser` MCP server (Edge), never `playwright`.

| New capture | Reference | What it shows |
| --- | --- | --- |
| `06-home-390-light-refresh.png` | `01-home-390-light.png` | the «Aggiorna» control above the header, trailing-aligned, neutral `secondary` pill — one on the screen, `minHeight` 50 px, transparent background (F72) |
| `07-filters-typed-390-before.png` | `05-filters-open-390-light.png` | the pre-fix build (`52f386b` in a worktree on 8082): `yoga` typed and unsubmitted, the amber chip «Cerca «yoga»», the foot still «Nessun filtro attivo» |
| `08-filters-typed-390-after.png` | `07-filters-typed-390-before.png` | the same state with the fix: the same chip and the same untouched foot, but the typing no longer reaches the catalog's state (F74) |

### What the cycle-3 session asserted, not just photographed

Read off the live DOM at 390, light, `mario.rossi`:

1. Exactly one control whose accessible name starts with «Aggiorna» is on the
   home, and its box is the touch floor (50 px) with no fill: the accent belongs
   to a screen's primary action and a refresh is not one.
2. Typing `yoga` without submitting renders the chip «Cerca «yoga»» and leaves
   the foot at «Nessun filtro attivo» — the count still speaks about applied
   filters only.
3. «Cerca» applies: the foot moves to «1 filtro attivo», the chip disappears,
   and the catalog answers «3 di 3 servizi».
4. Enter applies too, with the same three effects, **when it arrives after the
   last keystroke has been rendered**. Pressing it in the same tick as the last
   character applies the previous value; that race is pre-existing — the pre-fix
   build loses it identically — and it is recorded in
   [`../ux-remediation-2026-11-11.md`](../ux-remediation-2026-11-11.md) §11
   rather than fixed inside this cycle.
5. The staff-side vocabulary of F61 is verified by unit test, not on screen: the
   demo log still holds no operations, and writing one would modify demo data.

### Console

**0 errors, 1 warning** over the cycle-3 session: the pre-existing
`"shadow*" style props are deprecated` line that every capture since cycle 1
carries. The `ERR_EMPTY_RESPONSE` of cycle 2 did not recur: the backend container
was already warm, and the login was polled for a token instead of waited for a
fixed time.

### F74, measured before and after

Same page, same session, two servers of the same tree: `8082` runs `52f386b` in
a git worktree (the pre-fix build), `8081` runs the working tree with the fix.
22 real `keydown`s through `pressSequentially`, a `requestAnimationFrame` probe
on each key, a `MutationObserver` on the 20-row list, and the «Nome» field of
«Modifica profilo» as the control.

| Where the typing happens | Per-key frame latency | Mutations inside the rows |
| --- | --- | --- |
| «Nome» in «Modifica profilo» (control) | 7–20.8 ms, median 11.6 | none (no list on that screen) |
| catalog filter field, **before** the fix | 16.6–37.6 ms, median 25.3 | 0 |
| catalog filter field, **after** the fix | 7.6–21.8 ms, median **10.3** | 0 |

Two things this measurement corrected, both written into the remediation row:

- **The absolute number drifts between sessions.** Cycle 2 measured 49–73 ms per
  key on the same pre-fix code that today measures 16.6–37.6 ms: the dev bundle
  is not a stable instrument, so only a same-session comparison against the
  control is attributable. The finding stands (the field cost roughly twice the
  control, today and then) and the fix removes it (median 10.3 against the
  control's 11.6).
- **The «~6 mutations per key» were the filter card's own churn**, not the
  rows: the observer watched the list's whole subtree, and the header (the chip,
  the field, the count line) lives inside it. Counting the rows alone gives zero
  mutations both before and after, because a React re-render that produces the
  same DOM writes nothing. The cost was work, not DOM — which is exactly why the
  frame probe is the metric here and the mutation count is not.
