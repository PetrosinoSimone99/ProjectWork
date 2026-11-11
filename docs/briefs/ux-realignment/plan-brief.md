# Brief — UX realignment 2026-11-11

## Objective

One refinement cycle over `Frontend/`: audit the current build, split what is
mechanical from what is directional, decide the visual direction, implement it,
verify with Playwright, close with docs. No new feature, no new dependency, no
new font.

## Constraints (closed by Andrea, not reopenable)

1. `DESIGN.md` is **derived** from `Frontend/src/theme/tokens.js`. Documentation
   only, zero duplicated values. If the two disagree, `tokens.js` wins.
2. Existing tokens (palette, contrasts, radius, `target.min`) do not change:
   already verified (WCAG ratios are declared in the file and were recomputed by
   audit 2026-11-10). The work is composition, hierarchy, rhythm, state copy.
3. Style changes go through `tokens.js` and shared components, never inline per
   screen.
4. No new dependency. No new typeface from Google Fonts.
5. Playwright verifies the web build; native stays on Expo Go on device
   (explicitly out of this cycle).
6. The duplicated plus (`PublicationsSection.jsx:114-115`) is its own block,
   category S, fixed and committed before anything else.

## Lock answers (this session)

1. **Refinement, not redesign.** Confirmed by the evidence: the baseline audit
   scored `Design system and visual coherence` 8.1/10 and the remediation closed
   42 of 43 findings, re-scoring 9.9/10. Tokens are verified; composition is
   what remains.
2. **`tsc --noEmit` stays in the gate, honestly labelled.** Measured on this
   tree: `npx tsc --noEmit` clean in 5.2 s, `npx expo lint` clean in 11.7 s.
   `tsconfig.json` includes `**/*.js`/`**/*.jsx` and `expo/tsconfig.base` sets
   `allowJs: true` with no `checkJs`, and no file carries `// @ts-check`. So it
   gates syntax and unresolved imports, not types. Keep it (it is free), do not
   claim it type-checks JS.
3. **Yes: Andrea approves the direction before implementation.** Block 3 ends
   with one chosen direction motivated in 10 lines; block 4 does not start
   without "approvato".
4. **Gap found in the block order, needs Andrea's word.** Mechanical findings
   have no execution block: if block 1 produces no directional findings, blocks
   3 and 4 are cancelled and the mechanical ones stay documented-but-unfixed.
   Recommendation: when blocks 3-4 are cancelled, block 4 survives as
   "mechanical fixes only" (`4'`), so the cycle does not close with a list of
   unwritten one-line fixes. Written into the plan as a conditional block.

## Facts measured this session

- Branch `andrea-frontend`, tree clean, 0 behind `origin/andrea-frontend`,
  14 ahead. Versus `origin/main`: 3 commits behind, 143 ahead. Those 3 commits
  touch only `Backend/config/packages/security.yaml` and
  `Backend/src/Controller/ChatController.php`: zero Frontend impact. **No merge
  performed** (AGENTS.md: report and ask). Recommendation: merge after block 6,
  as its own commit, on Andrea's word.
- 16 files in `src/app`: 11 screens (login, register, home, match,
  offer-and-request, agreements, profile, edit-profile, report, staff,
  staff-users) + 4 layouts + `+not-found`. `src/components`: 34 components,
  4 963 lines. `src/theme/tokens.js`: 115 lines.
- Baseline to beat, same formula and dimensions as `docs/audits/ux-audit-2026-11-10.md`
  §2: 3.6/10 cold, 9.9/10 after remediation, F42 open by decision (staff lists
  are not virtualised).
- Environment: `date` 2026-11-11, Node v24.22.1, Playwright MCP connected with
  `chromium-1248` in `%LOCALAPPDATA%\ms-playwright`. No Chrome at the default
  path: `draw.mjs --app` may not find a binary (see block 3 fallback).
- Path correction: the impeccable launcher is
  `C:\Users\Andrea\.agents\skills\impeccable\scripts\impeccable.cmd`; the
  `.pi/skills/impeccable/...` path from the request does not exist.

## Success criteria

- No CTA renders two plus signs.
- One audit file, comparable row by row with 2026-11-10, with every finding
  carrying `file:line` and an evidence status.
- Every finding classified mechanical or directional, mechanical ones with the
  fix written out, directional ones with the design question they pose.
- Direction chosen from 3, motivated in 10 lines, palette and type unchanged.
- Touched screens pass lint; the diff introduces no style outside tokens and
  shared components.
- Before/after screenshots on the same states and viewports, console without
  new RN-web warnings.

## Exclusions

`Backend/`, `Context_and_DB_V2/`, `Archive/` untouched (read-only). No root file
edit. No native-device work. No new dependency, no font swap, no token palette
change. No push to `main`. No `git add -A`.

---

## Cycle 2 — contract (2026-11-11)

### Objective

Ship the five items cycle 1 answered but never wrote, and apply one product rule
decided by Andrea: **at most one offer and one request per user, not five and
five**, in the single client-side constant that owns the cap. No new feature, no
new dependency, no new font, no token value moved.

### Counted, not guessed

19 files touched, **7 of them new**: 11 modified code files + 1 new component
(`AuthShell.jsx`), 4 modified docs, 1 new capture README, 5 new PNGs. Class L,
5 children, 1 stop (this plan).

### Facts measured this session (2026-11-11)

- Branch `andrea-frontend`, tree clean but for the untracked `.playwright-mcp/`
  log directory (never to be committed). Versus `origin/andrea-frontend`: 0
  behind, 39 ahead. Versus `origin/main`: 3 behind (Backend only, zero Frontend
  impact), 168 ahead. **No merge performed** — it stays a separate commit on
  Andrea's word.
- Environment already up: `backend-backend-1` and `backend-database-1` on port
  8000, something already listening on 8081 (the web build is re-verified before
  the captures, not assumed).
- `grep -rn "LIMITE_VOCI" Backend/` returns nothing: **the cap is client-side,
  today as it was with five.** No server enforcement is added by this cycle.
- Suspended voices already occupy a place: `(tabs)/offer-and-request.jsx:207-208`
  splits by `tipo` only, never by `stato`, so `limiteRaggiunto` counts a
  `SOSPESA` row. The rule "suspending does not free a slot" holds by existing
  behaviour; the copy stops implying otherwise.
- The `limit` sent by the staff lists is fixed and single-page
  (`staff.jsx:80-84`, `staff-users.jsx:106`), and `docs/api.md:48-51` documents
  pagination with a maximum `limit`. That is F73's answer, measured in the tree.

### Closed decisions (not reopenable)

1. The cap is `Frontend/src/services/offer-request.js`'s `LIMITE_VOCI = 1`: one
   knob, it applies per type, and the lists and their caps stay separate.
2. `Backend/` is not touched and no server enforcement is invented.
3. Rows a user already has are never deleted: accounts above the cap keep their
   rows, the cap only blocks additions, and the sentence says how to get back to
   one.
4. Affordances that add a voice disappear when the voice exists, in
   `EntriesSection`, `PublicationsSection` and `EntryEditor`'s comment.
5. Palette, contrasts, radius vocabulary and `target.min` stay frozen: every
   surface goes through `tokens.js` and shared components.
6. Every UI state explicit, no swallowed errors, no emoji.

### Lock — five questions, with the recommendation each one gets

Answered "approvato" = all five recommendations adopted. Any single "no" is a
one-word change to this brief, not a new cycle.

1. **F72 (web has no refresh).** Recommendation: **defer, close `N/A`** with the
   condition rewritten — "reopens when a web refresh affordance gets a placement
   rule in `PageHeader` covering all four pull-to-refresh screens". Reason: it is
   the only wave-3 item that would add an affordance, it changes four screens
   plus a shared component, and a new control deserves its own composition
   decision rather than a tail-end addition.
2. **The filter count in two places.** Recommendation: **one count, in the
   always-visible foot** («N filtri attivi · Azzera»); the collapsed row says
   «Filtri» only and keeps the expand/collapse role. Reason: the panel's own
   cycle closed F92 because a number printed twice contradicts itself.
3. **The over-cap sentence with a cap of 1.** The contract keeps the existing
   branch; with a cap of 1 "eliminane una delle N" is wrong, because from 3 you
   must remove two. Recommendation: `Massimo raggiunto: hai 3 offerte, il massimo
   è 1. Eliminane 2 per aggiungerne un'altra.` — same branch, correct arithmetic,
   plural from the count.
4. **F59's race.** A broken URL typed and saved before the preview's `onError`
   fires would still travel. Recommendation: accept the window and state it —
   the shape check still runs, the URL is dropped on every save made after the
   preview has failed, and blocking the save until the image settles would add a
   pending state to a button that has nothing to do with images.
5. **What the profile sheet contains.** Recommendation: identity band, the data
   rows, «Modifica profilo», «Area staff» (role only), «Aspetto» and the session
   line as its last band; **«Esci» stays outside the sheet** as a ghost button.
   Reason: an exit is not a setting, and the audit's F08 already demoted it once.

### Success criteria

- `grep -rn "'Filtra'" Frontend/src` is empty; typing without Enter shows the
  pending chip and leaves the applied count untouched.
- A broken image URL plus a changed name persists the name and not the image.
- The auth masthead exists in one file; the login form is centred.
- `grep -c '<Card'` on the profile screen is 1; staff row only for a staff role.
- `LIMITE_VOCI = 1` derives every string; no UI says «1 offerte»; nothing says 5.
- Wave 3 carries, per finding, either a commit or `N/A` with a rewritten
  condition and the evidence that produced it — never `TODO`.
- Five captures at 390 with two `networkidle` and no `/Carico|Guardo/` on screen.

### Exclusions

No scope widening: a point that needs a file outside the lists above is declared
and closed `N/A`, not silently added. `Backend/`, `Context_and_DB_V2/`,
`Archive/` read-only. No merge of `origin/main`. No push to `main`.

