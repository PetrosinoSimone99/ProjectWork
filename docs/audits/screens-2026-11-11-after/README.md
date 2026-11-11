# Screens after block 4b/4c — 2026-11-11

Captures of the same states and viewports as
[`../screens-2026-11-11/`](../screens-2026-11-11/), taken after the
implementation of the direction (`docs/briefs/ux-realignment/direction.md`) and
of wave 2. Same file names as the before set where the state exists there, so a
pair is a name match: open the two files side by side.

## Pairs

| Before | After | What the pair is meant to show |
| --- | --- | --- |
| `02-home-mobile-light.png` | `02-home-mobile-light.png` | the catalog on one column: page header, one meta line per card, category inline (F80, F82, F89, F93) |
| `20-home-360-light.png` | `20-home-360-light.png` | the same at 360: three-line headline, no clipped sentence at two |
| `11-home-mobile-dark.png` | `11-home-mobile-dark.png` | the same in dark: palette untouched, the bar neutral |
| `23-home-1280-light.png` | `23-home-1280-light.png` | one frame at 1280: filter bar, count line and cards end on the same edge (F80) |
| `07-service-detail-modal-mobile-light.png` | `07-service-detail-modal-mobile-light.png` | the panel: body scrolls, the primary action stays (F70) |
| `06-profile-mobile-light.png` | `06-profile-mobile-light.png` | the type scale with the retired roles folded (F47), one empty-state anatomy |
| `05-agreements-mobile-light.png` | `05-agreements-mobile-light.png` | the three sections as a radio track (F55) |
| `18-staff-reports-mobile-light.png` | `18-staff-reports-mobile-light.png` | status pills on one scroll row (F85), radio semantics |
| `19-staff-users-mobile-light.png` | `19-staff-users-mobile-light.png` | the users list with the role and status tracks |
| — | `19b-staff-users-1280-light.png` | the same at 1280; the before set has no staff-users desktop capture |

## Environment and method

- Real backend (`backend-backend-1` on port 8000), real web build
  (`npx expo start --web`, port 8081). **No fake-data mode exists** (D011).
- Logins: `mario.rossi` / `demo` for the user screens, `staff.anna` / `demo` for
  the staff area — the catalog and `/staff/users` are permission-scoped, and a
  non-staff session answers 403 on the users list by design.
- Viewports 390×844, 360×800, 1280×800. Theme set through
  `localStorage['barattolo.tema']` (`chiaro` / `scuro`) and a reload:
  `emulateMedia({ colorScheme })` alone does not move it.
- The app re-fetches once the session resolves, so a capture taken on a fixed
  timeout catches the spinner; every shot here waited for network idle twice and
  then asserted that no loading line was on screen.

## Console

Zero errors. One warning repeated: `"shadow*" style props are deprecated. Use
"boxShadow".` It comes from react-native-web reacting to the `shadow*` family
that the app already used before this cycle (the panel and bar shadows); the
cycle changed a shadow's opacity and radius, not the API it is declared with.
Recorded rather than fixed: swapping to `boxShadow` is a dependency-level change
and belongs to a cycle that is allowed to touch the shadow vocabulary.

## What is not captured here

The states in the block-5 list that need data the demo dump does not hold:
a seeded incoming proposal (agreements bell panel), the limit-reached lines,
the session-expired banner, the confirm dialogs. They are semantic changes only
(roles, live regions, stacking) and were verified on the DOM instead of on a
picture: `/` renders exactly one `role="main"`, one `role="navigation"`, one
heading at `aria-level="1"` and one polite live region; `/agreements` renders a
`radiogroup` with three `radio` children, exactly one `aria-checked="true"`, and
no `tab`/`tablist` left in the tree.
