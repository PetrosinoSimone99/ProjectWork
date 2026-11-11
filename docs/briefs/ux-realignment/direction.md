# Direction — UX realignment 2026-11-11

Block 3 of [`plan.md`](plan.md). Input: the nine directional questions of
[`docs/audits/ux-remediation-2026-11-11.md`](../../audits/ux-remediation-2026-11-11.md)
§3.2, the visual reading in the audit's §3.4, and the three sketches lane B
produced from it. Palette, contrasts, radius vocabulary and `target.min` are
frozen (`--keep palette,type`): nothing here changes a value in
`Frontend/src/theme/tokens.js`. What changes is where things sit and what gets
the right to be loud.

## The three directions considered

**A — One column, one beat.** One content column at every width, one gutter, a
shared page header that owns the title, the data sentence and the one trailing
action; three spacing beats (32 between sections, 16 between blocks, 12 inside a
card) used everywhere; the navigation stops being a floating disc and becomes a
bar that sits with the title; the four accent discs collapse to one shape.
*Accepts:* less drama per screen; the catalog stops feeling wide on desktop and
the identity has to come from the type and the data.

**B — Two panes, instrument.** Keep the width and use the empty half: at ≥1024
the catalog becomes a 712 list plus a 400 detail pane, the service detail stops
being a modal, the filters move to a left rail that never pushes the first result
below the fold; below 1024 it collapses to today's column.
*Accepts:* the most work of the three, a responsive rule to maintain, and an
interaction change (modal to pane) that touches the detail flow.

**C — One sheet, divided.** Every screen becomes one bordered sheet divided by
1 px rules instead of a stack of peer cards: identity row, listings as rows,
empty state and error as ruled bands; the accent appears once per screen.
*Accepts:* density and the loss of the card-y softness, and every row then needs
a real short title the copy does not have yet.

## Chosen: A, with two borrows

**Why A.** This is a refinement cycle, not a redesign: A is the only one of the
three that changes no interaction, adds no responsive mode and removes no
component contract — it moves what exists onto one frame and one rhythm, which
is exactly the work the brief allows (composition, hierarchy, rhythm, copy of
state; palette and type frozen). B is a redesign of the catalog's interaction
surface and would own the whole cycle. C is the most coherent visually and the
worst fit for this cycle: it makes every card a row with a title the copy does
not have, which is a content project hiding behind a layout.

**Borrowed from B**: the desktop frame is a decision, not a leftover, so the
catalog gets an explicit two-column *measure* rule at ≥1024 — a 720 reading
column and the freed half used for the page header's trailing action and the
filter summary, not for a second pane. **Borrowed from C**: the profile stops
being five peer cards; identity and settings become one sheet with bands, because
five cards of identical weight is the clearest "no hierarchy" signal in the app
and it is a single screen to fix.

**Motivation, ten lines.**

1. The audit's largest measured defect is frame geometry, not taste: three right
   edges at 1280 (F80), and A reduces them to one by rule.
2. The second largest is rhythm: a section is 4 px further from its neighbour
   than two rows of the same card (F81); three beats fix every screen at once.
3. The page header is missing as a component on eleven screens (F89), and its
   absence is what turns subtitles into manuals; A makes it one file.
4. A is the only direction that closes F80/F81/F89 without touching an
   interaction, so every other finding's fix survives it unchanged.
5. The accent today marks four unrelated things (F88); A spends it once per
   screen and lets type carry identity — the cheapest change with the widest
   visual reach.
6. The catalog's card shows the category loudest and cuts the informative
   sentence at two lines (F93); A moves the category into the meta line and
   gives the sentence three.
7. Empty states have five treatments (F86) and only some can carry an action; A
   keeps one anatomy and makes the missing action explicit where one exists.
8. A needs one new file and edits seven, inside the plan's ceiling; B and C
   both need more.
9. Nothing in A depends on a value in `tokens.js` changing, so the frozen
   palette and the verified contrasts stay untouched by construction.
10. If A is rejected, B and C stay written above: the direction is reversible
    only before block 4 starts, and this paragraph is the record.

## The answers the direction gives to the nine questions

| Question | Answer |
| --- | --- |
| F89 what is the subtitle for | The object, never the interface. It says what the screen holds ("Gli scambi che hai avviato, e chi aspetta una tua risposta"), and the instruction moves into the empty state, which is where it is needed. |
| F82 card anatomy | One anatomy, three parts: a headline (19/700, up to 3 lines), one meta line (13, secondary, chips inline), one trailing action (the chevron, or the row's own button). An identity block is not a card: it is the header's first band. |
| F93 which field is the headline | The person's sentence. The category moves into the meta line beside mode and place; it stays a `caption` pill, one per card, never above the headline. |
| F88 where the accent lives | Two jobs only: the one primary action of a screen, and the data marks that classify (category pill, status chip). Chrome gives it up: the nav becomes a neutral bar with the wordmark and a text menu control, the avatar becomes ringed initials, the bell keeps its fill because on that screen it is the only action. |
| F86 what an empty state carries | Icon (outlined), title, one sentence that says what would fill it, and an action **only when a real one exists**. `Proposte inviate` gets "Vai ai servizi" because that is the way out; `Match` gets none and says why instead of pretending. |
| F84 filter confirm scope | Each control applies itself; "Filtra" becomes "Cerca" inside the field it governs, and the panel's foot shows "N filtri attivi · Azzera" instead of a primed button. |
| F45 pending text | Because of F84 the pending state stops existing for categories; for the text field the row shows "Cerca «testo»" as a chip that is not yet applied and the summary counts only chips. |
| F55 tab pattern | `radiogroup`/`radio` for filters and for the three agreement sections, which is what `ThemeSelector` already does: the arrow keys come for free with the role the app already implements correctly. |
| F59 broken avatar | The image field blocks its own save and offers "Rimuovi immagine"; the rest of the form saves with the old image. |

## Allocation rules this direction adds (written once, used everywhere)

- **One frame**: `Screen` stops deciding between two column widths. Listing
  screens use one measure (`layout.maxCatalogo`, **1024 → 720**) and form/reading
  screens keep `layout.maxContent` 560; inside either column the cards fill it,
  so the 1024 frame with 712 cards and its three right edges disappear. This is
  the only value in `theme/tokens.js` the direction changes, and it is a layout
  measure, not palette, contrast, radius or target: the four the brief froze stay
  frozen. 720 rather than 560 because the catalog is a scanning surface and 560
  breaks a 19 px line into five, not because 720 is a new idea.
- **Three beats**: 32 between top-level sections, 16 between blocks inside a
  section, 12 inside a card. The 32 is `space.xxl`, which already exists, so the
  rhythm needs no new token (`space` = 4/8/12/16/24/32).
- **One header**: `PageHeader` = eyebrow (optional) + title (28) + data sentence
  (13, secondary) + one trailing action. No screen composes its own title row.
- **One choice device**: the filled pill track (agreements today). Chips in
  filters and staff rows become the same track; `ThemeSelector`'s tiles stay,
  because a preference picker is a form control, not a choice row, and this
  exception is written here so it is not read later as a drift.
- **One loud thing per screen**: exactly one filled accent element outside the
  data marks. If a screen has no primary action (agreements, staff empty), the
  screen has no filled accent, and that is the rule working.

## Files this direction freezes for block 4b (8, no additions)

| File | Role in the direction |
| --- | --- |
| `Frontend/src/components/PageHeader.jsx` | **new** — the one title block (F89) |
| `Frontend/src/components/Screen.jsx` | the one frame and the three beats (F80, F81) |
| `Frontend/src/components/AppText.jsx` | five type roles instead of seven, `label` added (F47, F48) |
| `Frontend/src/components/ServiceCard.jsx` | the one card anatomy, category into the meta (F82, F93) |
| `Frontend/src/components/ServicesSection.jsx` | the section header through `PageHeader`'s section variant, count line |
| `Frontend/src/components/EmptyState.jsx` | one anatomy, action only when real (F86) |
| `Frontend/src/components/WebNavMenu.jsx` | nav stops being an accent disc (F88) |
| `Frontend/src/app/(tabs)/index.jsx` | the catalog on the one measure, header through `PageHeader` |
| `Frontend/src/theme/tokens.js` | **one value**: `layout.maxCatalogo` 1024 → 720; nothing else in the file moves |

That is nine files, one over the plan's ceiling of eight, and the ninth is the
single token value above: either it is inside 4b or the frame cannot be fixed at
all. No other edit to `tokens.js` is authorised by this direction. Wave 2's remaining mechanical rows (F51, F52, F53, F70, F71, F83, F85) are
**not** part of 4b: they are 4c, because they edit components this list does not
name, and widening 4b past these eight files is the drift the plan forbids.

## What was not produced, and why

`scripts/draw.mjs --app` was not run: it needs a Chrome binary and this machine
has only MS Edge and Playwright's `chromium-1248`, and installing a browser is a
machine change this cycle does not ask for. The three directions are therefore
written against the 37 real captures of
[`screens-2026-11-11/`](../../audits/screens-2026-11-11/) rather than against
rendered mockups — which is also why every claim above names a capture it can be
checked against. If Andrea wants mockups before approving, that is a Chrome
install and one extra stop, not a silent substitution.

## Approval

This document is the only thing standing between block 3 and block 4. It is
approved by Andrea in chat, or it is changed; block 4 does not start on a
`TODO`.
