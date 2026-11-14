---
target: my entire app frontend ux/ui/design
total_score: 27
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 6
target_identity: "file:C:\Users\Andrea\Desktop\projects\ProjectWork\Frontend\src\app"
timestamp: 2026-11-13
slug: frontend-src-app
full_report: docs/audits/ux-audit-2026-11-13.md
---

# Impeccable critique — Baratto-lo frontend (2026-11-13)

Method: dual-agent (A: reviewer, design review · B: reviewer, deterministic and
technical evidence). The browser leg ran in the parent (sub-agents do not inherit
the browser MCP in this harness). Full report, with evidence and fixes, lives at
`docs/audits/ux-audit-2026-11-13.md` — this file is the archive snapshot.

Target: `Frontend/src` · mode **Operate** · tree `c3442ba` · evidence
`docs/audits/screens-2026-11-12/`.

## Design Health Score

| # | Heuristic | Score |
|---|-----------|-------|
| 1 | Visibility of system status | 3 |
| 2 | Match system / real world | 3 |
| 3 | User control and freedom | 2 |
| 4 | Consistency and standards | 2 |
| 5 | Error prevention | 3 |
| 6 | Recognition rather than recall | 3 |
| 7 | Flexibility and efficiency | 3 |
| 8 | Aesthetic and minimalist design | 3 |
| 9 | Error recovery | 3 |
| 10 | Help and documentation | 2 |
| **Total** | | **27/40 (68 %) — acceptable** |

No `n/a`: all ten apply to an Operate surface.

## Specificity

Character lives in the leaves (the card headline is the author's sentence; the
detail sheet states the blind proposal at the point of commitment; backend gaps
are prose, not fake UI). The composition is transferable: chrome bar, frame kit,
listing pattern, staff area. The non-profit premise is never stated on screen,
and pairwise exchange has no visual form.

## Deterministic

`impeccable detect --json Frontend/src` -> `[]` exit 0, zero findings, zero
suppressions. 0 hex literals outside `tokens.js`, 0 inline radii, 20/20 contrast
pairs pass AA in both themes (thinnest 3.35:1). Browser overlay not injected: no
authenticated surface reachable (backend down). Live measurement used instead,
which produced F6 (auth links 59x18 and 40x18) and F16 (`document.title` empty).

## Priority issues

- **F1 (P1)** Logged-out `/staff` and `/staff-users` render an endless spinner
  with no exit (`staff.jsx:71-75,190`; `staff-users.jsx:98,210`).
- **F2 (P1)** Dialog left-anchored above 560 px — no `alignItems` on the overlay
  (`ModalShell.jsx:160-170`).
- **F3 (P1)** `PageHeader` used by 1 of 10 screens; the nine ad-hoc headers
  indent the H1 by the back button and put usage instructions in the subtitle
  slot `DESIGN.md` reserves for "what the screen holds".
- **F4 (P1)** `Banner`, `ServicesSection`, `staff-users` declare only
  `accessibilityLiveRegion` — errors are silent on web, on ten routes.
- **F5 (P1)** Web chrome-bar controls are 40 pt with no `hitSlop`
  (`WebNavMenu.jsx:560`) — the only navigation affordance on the web target.
- **F6 (P1)** Auth links 18 pt tall (measured live).
- **F7 (P2)** Retry inside the message on 4 screens, detached on 4 — and on
  `/profile` the detached retry is the primary variant.
- **F8 (P2)** The dialog container receives the global focus ring: a green
  outline around the sheet, accent spent twice.
- **F9 (P2)** Accent spent twice on `/staff`, `/staff-users`, `/agreements`.
- **F10 (P2)** The filter panel never collapses after applying.
- **F11 (P2)** The proposal-sent banner lives in the list header and can land
  off-screen.
- **F12 (P2)** `/offer-and-request` repeats one sentence twice, says "Tocca" on
  desktop, and delivers a hard stop in 13 px grey.
- **F13 (P2)** No client-side role gate on the two staff routes.
- **F14 (P2)** No desktop composition: widest measure 720, two layout modes, no
  surface at width >= 1024; scroll thumb at the column edge, not the window's.
- **F15 (P2)** Token/source hygiene: 5 `fontSize` literals, two disabled
  opacities, 6 duplicated constants, deprecated `shadow*` props, 7 dead
  `variante` call sites, 10 unused exports, 2 corrupted comment lines, 9 files
  over 400 lines.
- **F16 (P2)** `document.title` empty on every route.
- **F17 (P2)** The two auth screens disagree on what the H1 is.
- **F18 (P2)** Two `/register` fields share the accessible name "Mansione".
- **F19 (P2)** Dark theme: unthemed scroll track; surfaces flat (1.19:1 step).

## Retired claim

The dialog **does** trap and restore focus on web — via `react-native-web`'s
`ModalFocusTrap`, not via app code. It is a dependency on an undocumented
internal and it does not exist on native.

## Questions

1. What is browsing for, if a service is one person's sentence and each account
   holds one offer and one request?
2. The premise is that nothing has a price. Why does no screen say so?
3. If "Offro e cerco" is visited twice in a user's lifetime, why is it a
   management dashboard with 21 buttons?
