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
