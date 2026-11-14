# DESIGN.md — Baratto-lo

The design system, written as **roles and rules**. It restates no value: every
number, colour and radius lives in [`Frontend/src/theme/tokens.js`](../Frontend/src/theme/tokens.js),
and that file wins over this page whenever the two disagree. The type scale is
the one exception in placement, not in principle — it lives in
[`AppText.jsx`](../Frontend/src/components/AppText.jsx), which is its single
source.

Read this file to know **which** token to reach for; open the file to know what
it currently is.

## Colour

Two palettes, one role set: everything below exists in the light and in the dark
theme under the same name, and a screen never names a theme.

| Role | What it is for |
| --- | --- |
| `background` | the page. What a screen sits on. |
| `surface` | anything raised off the page: cards, panels, the web bar. |
| `border` | **decorative** separation only — a card's edge, a divider. |
| `borderInput` | the boundary that identifies a **control** (field, selector, checkbox, outlined button). Holds the contrast that `border` does not have to. |
| `text` | body and titles. |
| `textSecondary` | the second voice: meta lines, data, hints. Never the only carrier of meaning. |
| `primary` / `primaryPressed` / `onPrimary` | the one primary action of a screen, and its pressed state. |
| `accentBg` / `accentText` | the amber pair: the token row and the in-progress state. |
| `serviceBg` / `serviceText` | the soft green of a data mark (category pill, published state, active nav row). |
| `danger` / `dangerBg` / `dangerText` | destructive actions and failures. |
| `successBg` / `successText` | confirmations. |
| `overlay` | behind a modal panel. |

Two rules that no file may break on its own:

1. **The accent is spent once per screen.** One filled `primary` element — the
   screen's primary action — plus the data marks that classify (a category pill,
   a status chip). Chrome gives it up: the web navigation is a neutral surface
   bar, not a coloured disc. A screen with no primary action has no filled
   accent, and that is the rule working, not a gap.
2. **A border either separates or identifies.** If it identifies a control it
   is `borderInput`; if it only separates two surfaces it is `border`. Using
   the decorative one on a control is a WCAG contrast defect, not a taste
   preference.

Contrast ratios are declared next to the values they belong to, in `tokens.js`.
Nothing here repeats or re-derives them.

## Shape

One radius vocabulary, one use each — `radius.card` for surfaces that hold
content, `radius.input` for fields and the panel rows inside a menu,
`radius.checkbox` for the small square, `radius.pill` for anything a finger
presses (buttons, chips, pills, the web bar).

The rule is role-based, not size-based: a thing that is pressed is a pill
whatever its width; a thing that holds content is a card whatever its height.

## Touch

`target.min` is the floor for every pressable in both dimensions. A control that
cannot reach it is a defect, not a density choice.

That floor is about the box the finger lands on, not the size of the words on
it: a link that lives inside a sentence is still a control, so it carries the
floor even when its text is 13 px (`components/TextLink.jsx`). The same is true
of the two controls inside the web chrome bar.

## Browser surfaces

The scrollbar, the text caret, the native dropdowns and the form controls the
browser paints are part of the page, so they follow the active theme: one
`color-scheme` line on the document, written from the resolved theme rather than
from `prefers-color-scheme`, because the user can choose light on a dark system
(`hooks/useWebColorScheme.js`). The focus ring is the other browser-painted
surface, and it has its own rule (`components/FocusRing.jsx`): the dialog
container is the one element excluded, since `ModalShell` focuses it
programmatically and the ring spent the accent a second time.

## Spacing

One scale (`space`), three beats. The beats are the composition, the steps are
the vocabulary:

| Beat | Where |
| --- | --- |
| between top-level sections | the screen container's own gap |
| between blocks inside a section | the group that holds the blocks |
| inside a card | `Card`'s own padding and gap |

A screen that invents a fourth distance between two blocks is where the rhythm
drifts; if a distance is genuinely missing, it is added to `space`, not typed
inline.

## Measures

Two reading measures exist and both are decisions:

- the **content** measure for forms and reading screens,
- the **catalog** measure for the one surface that is scanned rather than read.

Inside either, every element fills the column. An element with a width of its
own is how a screen ends up with several right edges.

## Type

Six roles, one job each, defined in `AppText`: a screen title, a section or card
title, body, the secondary line, a short label for prose that labels something,
and the uppercase caption that belongs to pills and count lines only. Prose
never wears `caption`. Retired roles are removed from the component, not kept as
aliases.

Headings declare their depth (`aria-level`): the screen title is the root of its
page, a section inside it is one step down, and a panel's title is the root of
its own dialog. A heading without a depth tells assistive technology that
something is a title but not of what.

Depth follows the role, it is not a value each caller repeats: `title` is level
1, `heading` is level 2, and only a caller that genuinely differs (a panel's
title, which roots its own dialog) states `level`. The defaults used to be one
number for every role, which meant every screen that forgot the prop silently
had no first-level title at all — seven of twelve routes were in that state.
Anything that is repeated chrome rather than the screen's own title (the
wordmark on the registration, the avatar's initials) is not a heading at all:
two first-level titles on one page are worse than none.

## Refresh

The pull gesture is native and does not exist on the web. There, a screen that
owns a refresh shows it as **one** control, `Aggiorna`, inside the web chrome
bar next to `Menu` — fixed, above the content and outside the scroll, so it
does not scroll away and every refreshable screen puts it in the same place.

It is neutral: it lives in the neutral bar with no accent of its own, because
refreshing is not the screen's primary action. It takes `target.min`, and while
the request is in flight it is disabled and spinning, so the state is explicit
rather than a second tap on a control that already ran. Native screens keep the
gesture and show no button.

One owner per layer: the screen **publishes** the pair it already receives
(`hooks/web-chrome`), the bar draws it. No screen composes its own refresh
control, and a screen that has nothing to refresh publishes nothing — the bar
then shows its name and the menu alone.

The bar is anchored to the window, not to the column. That is a decision, not
leftover: chrome is one object at one edge, and the content is a column at
another. What the column does pay for is the reserve: when the gap left between
the column's edge and the window's is narrower than the bar
(`larghezzaBarraMenuWeb`), the bar would sit over the column, so the content
starts below it (`Screen`'s `riservaMenuWeb`). Above that width the bar clears
the column and the header starts at the top of the window.

## Composition rules

- **One header.** Every screen's title block is `PageHeader`: an optional
  eyebrow, the title, and **one** sentence that says what the screen holds —
  never how to use it. Instructions belong in the empty state, which is the
  place where someone needs them.
- **One card anatomy.** A headline (the person's own words, allowed a real
  measure of lines), one meta line carrying the data marks inline, and at most
  one trailing action. An identity block or a settings row is not a card.
- **One choice device.** Mutually exclusive choices are `radiogroup`/`radio` on
  a pill track, on one row that scrolls rather than wraps. A preference picker
  is a form control and may look like one; it still declares radio semantics.
- **One empty state.** Icon when there is one, title, one sentence that says
  what would fill the space, and a button **only when a real action exists**. No
  invented actions, no invented glyphs.
- **Trailing actions form a column.** Reversible actions may share a row; a
  destructive one keeps a row of its own by rule. Labels never wrap inside a
  pill, and two confirm commands stack before they would be truncated.
- **Every state is explicit**: loading, empty, error, loaded. A loading surface
  announces itself through a polite live region; an error carries its own retry
  inside the message that failed.

## Theme

Three preferences — sistema, chiaro, scuro — resolved by the app at startup.
Colour choices come from the active token set; a component never branches on the
theme to pick a literal.

## Where to change what

| Change | File |
| --- | --- |
| a colour, radius, spacing step, touch floor, measure | `theme/tokens.js` |
| the opacity of a control that is not available | `theme/tokens.js` (`opacity.disabled`) |
| a type role or its job | `components/AppText.jsx` |
| the card surface | `components/Card.jsx` |
| the screen frame, its measures and its rhythm | `components/Screen.jsx` |
| the web refresh control, and where it sits | `components/Screen.jsx` |
| the title block | `components/PageHeader.jsx` |
| the panel shell | `components/ModalShell.jsx` |
| a link inside a sentence | `components/TextLink.jsx` |
| what a route with no role may see | `components/StaffAreaGate.jsx` |
| the browser tab's name, per route | `navigation/screen-titles.js` |
| the colours the browser paints itself | `hooks/useWebColorScheme.js` |

If a screen needs a new value that is not in this table, the answer is a token
role in `tokens.js` and a line here — never a literal in the screen.
