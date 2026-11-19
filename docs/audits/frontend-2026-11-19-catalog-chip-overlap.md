# Finding — the category chip leaves its column and covers the mode icon

**Date:** 2026-11-19 (measured 08:14-08:24 local)
**Found by:** step 1c of `docs/briefs/frontend-remediation-2026-11-19/residuals.md`
**Severity:** P2 — real, narrow, and it only shows where the catalog is read on the
narrowest surface; nothing is lost or blocked, but the one row that carries the meta
scan rhythm reads as a collision.
**Status:** open. Not fixed in the measuring session: `residuals.md` forbids fixing a
finding found by a measurement inside the file that found it.

---

## 1. What is on screen

In the catalog card, the first data row carries the category chip on the left and the
mode (`in presenza` / `da remoto`, icon + word) on the right. When the category label is
long, the chip does not shrink to its column: it keeps the width of its own text and is
painted over the mode icon, so the icon sits on top of the chip's rounded right end.

Measured on the production web export (`npx expo export --platform web`, served on
`:8090`) against the Docker backend on `:8000`, signed in as `demo.staff`, one Playwright
context, 11 cards in the list (`11 di 11 servizi`).

| Width | Card | Chip right edge | Mode icon left edge | Overlap |
| --- | --- | --- | --- | --- |
| 375 | `Assistenza computer` (×3 cards) | 208 px | 172 px | **36 px** |
| 375 | `Cucina vegetariana` | 198 px | 172 px | **26 px** |
| 375 | `Cura delle piante` | 183 px | 172 px | **11 px** |
| 412 | `Assistenza computer` (×3 cards) | 208 px | 190 px | **17 px** |
| 412 | `Cucina vegetariana` | 198 px | 190 px | **8 px** |
| 412 | every other card (7) | ≤ 170 px | 190 px | none |
| 768 | all 11 cards | ≤ 224 px | 368 px | none (≥ 144 px clear) |
| 1024 | all 11 cards | ≤ 224 px | 368 px | none (≥ 144 px clear) |

The chip's right edge is **208 px at 375 and at 412**: the chip keeps the width of its
own text (175 px from the card's inner edge at x = 33) in both classes, so it cannot be
made to fit by the narrower column, and the overlap grows as the column shrinks.

Screenshots (`Frontend/android`-independent, taken from the running web export):
`residual-1c-412-card-chip.png` (one card, the collision visible on the chip's right
end), `residual-1c-412-catalogo.png`, `residual-1c-375-catalogo.png`.

## 2. Where

- `Frontend/src/components/ServiceCard.jsx` — the data grid, row 1: `stileRigaDati` /
  `stileCellaSinistra` / the `Chip` wrapped in `<View style={{ maxWidth: '100%' }}>` whose
  `AppText` carries `variant="caption"`, `numberOfLines={1}` and `flexShrink: 1`.
- The chip itself: `Chip` in `Frontend/src/components/Card.jsx`.

The source's own comment on the row says every cell is one line with ellipsis and that
the row is always the same shape. The metaline shape is in fact correct — measured 3 rows
on 11 of 11 cards at 375, 412, 768 and 1024 — but the *horizontal* containment the same
comment claims is not: the chip's text is not clipped and the chip's box is not held
inside its half-row.

## 3. Why it matters

- It is the only place in the card where two meta values touch: the row is the scanning
  grid, and a collision reads as a rendering bug in the screen a demo opens first.
- The chip is where the *category* lands, and `Assistenza computer` is a real seeded
  category: this is not a synthetic label built to break the layout.
- The word `in presenza` is still readable (text left edge is right of the chip in every
  case), but the icon that distinguishes remote from in-person is the one covered, and
  the icon is the only non-textual signal in the row.

## 4. What a fix has to satisfy (verification criterion)

- At 375 and 412, for every card in the catalog, the chip's right edge is **≤ the mode
  cell's left edge** (no positive overlap), with the same rule measured on the rendered
  boxes, not inferred.
- The chip still shows one line and still truncates with an ellipsis instead of dropping
  the whole label; the full category list stays in the card's accessible name (it already
  does — `ServiceCard`'s `nomeAccessibile`).
- The three meta rows stay three at 412 (the shape this session measured as fixed must not
  regress while the row's horizontal containment is repaired).
- `scrollWidth === clientWidth` at 375, 412, 768, 1024 on `/`.
- The fix touches `ServiceCard.jsx` (and `Card.jsx` only if the chip's own padding must
  become a prop); no token changes if the row can be repaired by containment alone.

## 5. How it was measured (reproducible)

Playwright, one context, the static export on `:8090`:

```js
// for every [role=listitem] of the catalog main
const chip = /* the painted chip: uppercase innerText, rounded, non-transparent bg */;
const glifi = /* PUA-glyph elements (`\uE000-\uF8FF`) vertically inside the chip band */;
overlap = chip.getBoundingClientRect().right - Math.min(...glifi.map(r => r.left));
```

`PUA` (private use area) is what `@expo/vector-icons` renders for the row icons; the
filter is what separates the mode icon from the chevron at the card's right edge.
