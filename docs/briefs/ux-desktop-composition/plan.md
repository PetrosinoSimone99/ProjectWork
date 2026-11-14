# Plan — F14: no desktop composition, only a 390 column rendered wide

Class **M**. Source finding: [`docs/audits/ux-audit-2026-11-13.md`](../../audits/ux-audit-2026-11-13.md)
§3 F14. Prior direction record: [`docs/briefs/ux-realignment/direction.md`](../ux-realignment/direction.md)
(the three directions and the trade-off direction A accepted). This file is the
truth for execution; the chat summary is not.

`Stile: lite` for block 1, `Stile: full` for block 3.

## Brief

**Objective.** Close the two halves of F14 that are separable: (i) the real
defect — the wide web frame scrolls *inside* the column, so the scrollbar sits at
the column's edge and the wheel over the gutters does nothing; (ii) the
composition question — decide, once and in writing, what the 300-620 px of
gutter per side are for, and make `docs/DESIGN.md` say what the code does.

**Constraints.**

- Scope: `Frontend/**`, `docs/**`. `Backend/`, `Context_and_DB_V2/`,
  `Archive/` untouched.
- Palette and type frozen: no value in `Frontend/src/theme/tokens.js` changes.
- One writer per tree; git only in the parent.
- One measure source: no screen may re-type 560, 720 or the ≥1024 threshold.
- Branch `andrea-frontend`. `origin/main` is **17 commits ahead** and is **not**
  merged in this cycle (out of scope for F14).

**Closed decisions.**

1. Block 1 is a defect fix, not a composition choice: it ships before the
   direction gate and moves nothing at 390.
2. F19 (the surface/background luminance step) is a token decision and stays out.
3. The duplicated category retry (`register.jsx:426`,
   `offer-and-request.jsx:443`) is P2 consistency and gets its own cycle.
4. Captures for block 3 are produced in a temp directory **outside the repo**
   and listed in the plan; the file count stays inside the M band. If they are
   wanted committed, that is a scope change and it is asked, not assumed.

**Success criteria.**

- The scrollbar of every scrolling screen is at the window's right edge and the
  wheel scrolls it from anywhere over the window.
- At 390 nothing moves by a pixel in either theme.
- Both themes at 390 / 768 / 1280 / 1920 show one decided composition, not a
  centred phone column with dead gutters.
- `docs/DESIGN.md` § Measures describes geometry the code actually has.
- Gate green: `npx expo lint`, `npx tsc --noEmit`, `npx jest`;
  `npx impeccable detect Frontend/src` clean at the end.

**Exclusions.** F19 (token decision), the duplicated retry (own cycle), any
second content pane below 1024, any navigation or interaction change.

## Verified state (read from the tree, not assumed)

| Fact | Where |
| --- | --- |
| Measure for forms/reading is `layout.maxContent = 560`, for the catalog `layout.maxCatalogo = 720` | `Frontend/src/theme/tokens.js:146` |
| `Screen` applies the measure to the **container**: `maxWidth` + `alignSelf: 'center'` on the ScrollView's `contentContainerStyle`, or on the plain `View` when `scroll={false}` | `Frontend/src/components/Screen.jsx:81`, `:126-134` |
| The ScrollView element itself is already window-wide (`style={{flex: 1}}`, no width cap) → scroll screens already scroll the page | `Screen.jsx:145-155` |
| The catalog does **not** use that ScrollView: `scroll={false}`, so the scroll node is `ServicesSection`'s `FlatList`, which is a child of the 720-capped `View` → **the scrollbar is drawn at the column's edge and the gutter is inert**. This is the measured F14 defect | `Frontend/src/app/(tabs)/index.jsx:299-302`, `Frontend/src/components/ServicesSection.jsx:75-78` |
| The catalog is the only screen with a child scroller (`FlatList` appears in `ServicesSection.jsx` only; `index.jsx` mentions it in comments only) | `grep -rn FlatList src` |
| `ServicesSection` is imported by `index.jsx` only | `grep -rn ServicesSection src` |
| `PageHeader` already pulls its back arrow into the gutter by `min(target.min + space.md, (window − 560)/2)` | `PageHeader.jsx:75-76` |
| Widest panel is 560 | `ModalShell.jsx:24` |
| Widest content measure anywhere: 720 → nothing in the app uses a width ≥ 1024 | measured, audit F14 |

**Discrepancy against the brief's file list, stated once.** The expected block 1
files named `hooks/web-chrome.js` and `WebNavMenu.jsx`. Measured: the bar is
`position: fixed` at the window edge and has no relation to the column's scroll
node, so neither needs to change for the defect. The files that do need to change
are the three that own the catalog's geometry (`Screen.jsx`,
`ServicesSection.jsx`, `index.jsx`). `WebNavMenu.jsx` comes back in block 3 if
the chosen direction aligns the bar to the column.

## Blocks

- 1. Move the measure from the scroll node's ancestor into the scroll node: `Screen` keeps the full-window frame (padding, `gap`, `role="main"`, safe area, keyboard) and, when `larga`, stops capping its own width; `ServicesSection`'s `FlatList` becomes the window-wide scroll node and carries the catalog measure in its `contentContainerStyle` (`maxWidth: layout.maxCatalogo`, `alignSelf: 'center'`, the same `space.lg` padding and `space.lg` gap as today, so a card is the same 688 px at 1280 as it is now); `index.jsx` wraps the proposal-sent `Banner` in the same measure so it does not stretch to the window | files: Frontend/src/components/Screen.jsx, Frontend/src/components/ServicesSection.jsx, Frontend/src/app/(tabs)/index.jsx, docs/changelog.md | done: at 1280 and 1920 on `/` the scrollbar is at the window's right edge (was ≈x 975 and ≈x 1300) and a wheel over the gutter scrolls the list; at 390 the catalog, banner and cards are pixel-identical to `9116c1d`; every route rendering `Screen` still has exactly one scroll area (scout inventory in hand); `grep -c "maxCatalogo" src` is one token reference, not a copy; gate green; one commit `fix: scroll the page, not the column, on the wide web frame` | Stato: DONE — measured in chromium at 1280x800 and 1920x900 with a real session: the only scroll node of `/` is `0 → window width`, wheel over the gutter at x = 40 moves `scrollTop` 0 → 400, card `288 → 976` (1280) and `608 → 1296` (1920); at 390x844 the card is `16 → 359`, unchanged; `/profile` and `/agreements` keep their full-window scroller. The measure moved to one place, `colonna()` in `tokens.js`, read by `Screen`, `ServicesSection` and `index.jsx` (so `tokens.js` is now certain, not conditional). Cards at 1280/1920 are 688 wide instead of 673: the 15 px scrollbar used to sit inside the 720 box, now it sits outside it
- 2. **GATE (stop, no code): direction.** One line, three options, one recommendation — (a) *the gutters are used deliberately*: chrome (nav bar, refresh, back arrow, filter summary) aligns to the window edge while content stays on one measure; (b) *two columns at ≥1024*: a list column plus a detail pane / filter rail; (c) *one measure with the page header and its trailing action outside the column*, the header spanning the window while the body stays measured. Recommendation: **(a), implemented as (c) for the page header** — it is the direction `direction.md` already accepted ("One column, one beat" + the borrow from B: at ≥1024 the freed half carries the header's trailing action and the filter summary), it changes no interaction and adds no responsive mode, while (b) reopens the catalog's interaction surface (modal → pane) and is a redesign, not this cycle | files: none | done: Andrea answers `a`, `b` or `c` (or "as recommended") in chat and the answer is written into this file as an amendment before block 3 starts | Stato: DONE — Andrea: "approvato con le tue raccomandazioni" → **(a) as (c) for the header**. Also decided in the same answer: `PRODUCT.md` stays out of scope (`impeccable context` reported `NO_PRODUCT_MD` / `PRODUCT_INIT_REQUIRED`; a root file is outside AGENTS.md's scope), so the visual authority for this cycle is `docs/DESIGN.md` plus the briefs |
- 3. Implement the chosen direction — *contingent on the block 2 answer; the file list below is the (a)/(c) estimate, (b) is re-planned at the gate because it touches the detail flow*: one measure rule in `tokens.js` if the ≥1024 threshold needs a name, `Screen`/`PageHeader`/`WebNavMenu` reading it so the header row, the nav bar and the trailing action sit on the window edge while the body keeps 560/720, and no element carrying a width of its own | files: Frontend/src/theme/tokens.js, Frontend/src/components/Screen.jsx, Frontend/src/components/PageHeader.jsx, Frontend/src/components/WebNavMenu.jsx, docs/DESIGN.md | done: `grep -rnE "\b(560|720|1024)\b" src` finds the values only in `tokens.js` and in comments; `docs/DESIGN.md` § Measures states the rule the code implements, with no value restated; captures at 390 / 768 / 1280 / 1920 in both themes in a temp dir outside the repo, each showing one decided right edge for chrome and one for content; `npx impeccable detect Frontend/src` reports nothing for the touched files; gate green; commits of 2-3 files | Stato: DONE — the band is `PageHeader` leaving the column by the gutter from `layout.sogliaLarga` up, closing with a `border` rule, and the body keeps the measure; `misura` is a parameter (the catalog passes `maxCatalogo`), `banda={false}` on the two auth screens, and the bar's top reserve in `Screen` stops above the same threshold (at 1280 the page used to start 64 pt lower than at 1920). Measured: 1024 band 8→1000 / body 160→848; 1280 band 8→1256 / body 288→976; 1920 band 16→1904 / body 608→1296 (the 8/24 rows are the page box with a reserved classic scrollbar, the 16/16 row without one); 390 and 768 have no band and the title stays on the body edge (16, 32) — nothing moved below the threshold. `WebNavMenu.jsx` needed no change: the bar was already on the window frame. Eight captures (390/768/1280/1920 × light/dark) in `%TEMP%\baratto-desktop-f14`, outside the repo. Values live in `tokens.js` only — with one pre-existing exception, `ModalShell.jsx:24`'s panel cap, which is F15's duplicated-constant finding and not this cycle's; `impeccable detect` clean on `Frontend/src` and on the live page; gate green (jest 97/97)
- 4. Close: fresh-context review on two angles (correctness of the scroll change; consistency with this brief), then the changelog entry for block 3 and the state of every block in this file | files: docs/changelog.md | done: two reviews in hand with P0/P1/P2 and `file:line`, every P0 fixed or explicitly accepted in chat, `git status --porcelain` clean, no block left `TODO` | Stato: DONE — one reviewer, two angles (correctness / brief+docs): angle 1 mergeable with notes, angle 2 blocked on one P1 (DESIGN.md claimed the band reaches the ends of the page box; it is inset `space.lg` inside it, like the bar). Fixed in the same cycle: the P1 wording, the dead second conjunct in `riservaMenuWeb`, the `larga`+`scroll` footgun (the measure now travels with that scroller too), the orphan `sogliaLarga` JSDoc, and the two measurement records that disagreed. Left for Andrea's call, not applied: the `misura` prop has no runtime guard (a wrong call site would widen the band by the difference — documented in the component), `colonna() + padding` is written at two call sites, the band is web-only and unmeasured on a tablet, and the geometry has no automated test — the only evidence is the eight captures outside the tree. `git status` has one foreign change, `AGENTS.md`, edited by someone else during this session and deliberately not committed

## Lanes

`Lanes: single`. No lane qualifies: block 3 depends on the block 2 answer and
block 1 must be committed before block 3 measures anything, so no two parts are
independent. The condition that fails is "no dependency between lanes", not file
disjointness.

Children (cap 2): one `scout` at block 1 (read-only inventory of every scroll
surface and of what the 560 cap is load-bearing for), one `reviewer` at block 4.
Writing is the parent's: one writer, one tree, git in the parent only.

Time: wide fork **~2-3 h**. The count is the verifiable part:
**7 files certainly touched (1 new), up to 9** — `plan.md` (new),
`Screen.jsx`, `ServicesSection.jsx`, `(tabs)/index.jsx`, `changelog.md`,
`DESIGN.md` certain; `PageHeader.jsx` and `tokens.js` conditional on block 3.
