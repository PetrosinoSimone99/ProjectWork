# Brief — UX score >= 8 (remediation of `docs/audits/ux-audit-2026-11-10.md`)

**Stile: full**

## Objective

Close the 43 findings of the 2026-11-10 UX and accessibility audit so that the
app scores **>= 8.0 / 10** under the rubric and formula of
[`docs/audits/PromptAuditUx.md`](../../audits/PromptAuditUx.md), and leave the
audit trail (re-measured score, finding-by-finding evidence, Status tables,
changelog) inside the same commits as the code.

## Why "all 43" and not "the top 10"

The score is linear in the *count* of open findings:

`dimension = 10 − (0.2·n1 + 0.5·n2 + 1.5·n3 + 3·n4)`, weighted
30 / 25 / 15 / 15 / 15, with a severity-4 finding capping its dimension at 5.

Baseline 3.6 (usability 0.8, accessibility 2.8, states and copy 1.2, design
system 8.1, platform 8.5). To clear 8.0 the plan must leave **zero severity 3
and 4 findings** and at most ~4 severity 2 findings overall. Closing the ten
"best ratio" items of §4 does not get there; closing everything does, with
margin.

## Constraints (non-negotiable)

1. `Frontend/` only for code. `Backend/**`, `Context_and_DB_V2/**`, `Archive/`
   untouched. No new dependency: `package.json` unchanged.
2. Pre-push gate stays `npx expo lint` + `npx tsc --noEmit` (green today), plus
   `npx jest` (37/37 green today). Every block leaves all three green.
3. Code and copy in English identifiers / Italian UI copy, no emoji, no
   AI-attribution footers. Conventional Commits, one logical change per commit.
4. Every fix cites the finding id it closes in its commit body, plus the
   `docs/ux.md` / `docs/accessibility.md` checklist lines it satisfies
   (D022 requires this).
5. No finding is "closed" by weakening an assertion, an a11y role or a copy
   rule; a fix that cannot be verified is recorded as open in the re-audit.
6. `docs/audits/ux-audit-2026-11-10.md` is the baseline and is **not**
   rewritten; the re-measurement goes into a new file next to it.

## Decisions taken (Lock, 2026-11-10)

- **D1 scope** — close all 43 findings (F01-F43), not only the top 10.
- **D2 modal shell** — one new `src/components/ModalShell.jsx` (backdrop hidden
  from AT, focus moved in on open, Escape closes on web, header title + X,
  footer actions, 44 pt close) adopted by the six existing modal hosts:
  `ServiceDetailModal`, `ConfirmModal`, `CategorySelector`, `ListSelector`, the
  agreements bell panel, the staff review sheet. Closes F15, F16, F38 in one
  place instead of six.
- **D3 virtualisation** — `FlatList` for the home catalog and for the two staff
  lists. `Screen` gains a non-scrolling variant so a screen can own its list.
- **D4 form swap** — confirm-before-discard when a form is dirty, not four
  independent form slots (smaller diff, removes the data loss).
- **D5 measurement** — the score is re-measured with the formula of
  `PromptAuditUx.md`, finding by finding, from code evidence plus the cheap
  runtime web checks (Escape focus live region `lang` contrast recomputed).
  The full Docker stack plus a second live walk is explicitly **not** part of
  this session; whatever needs a device or a backend state stays in the
  "not verified" table, as in the baseline audit.

## Success criteria

1. `npx expo lint`, `npx tsc --noEmit`, `npx jest` green on the final commit.
2. A new `docs/audits/ux-remediation-2026-11-10.md` lists all 43 findings with
   `closed` / `open` and, for each closed one, the `file:line` that proves it;
   it recomputes the five dimensions and the weighted total with the same
   formula and shows the arithmetic.
3. The recomputed total is `>= 8.0` with at most 4 open severity-2 findings and
   no open severity 3 or 4.
4. `docs/ux.md` and `docs/accessibility.md` `Status` tables reflect the new
   measured state (rows dated 2026-11-10 replaced, not appended; the "holds"
   claims that were false — 44 pt targets, every field named, live region
   complete — are now true or restated).
5. `docs/changelog.md` has one new top entry, `docs/decisions.md` gains a
   decision record only if a durable choice was made (the modal shell and the
   list virtualisation qualify).
6. Base tree committed before any lane starts: the pre-existing dirt
   (`docs/ux.md`, `docs/accessibility.md`, `docs/decisions.md` D022,
   `docs/README.md`, `docs/frontend.md`, `Frontend/src/app/(tabs)/agreements.jsx`,
   `docs/audits/**`) is on `andrea-frontend` as its own commits.

## Exclusions

- No second full live audit with Docker + Playwright against the seeded
  database (D5). Runtime web checks are limited to what the dev server answers
  without the backend.
- No VoiceOver/TalkBack pass, no native dynamic-type pass, no device pass:
  those stay in the "not verified" table with what would verify them.
- No redesign of the information architecture, no new screen, no new endpoint,
  no backend change (`docs/backend-gaps.md` stands).
- F40 stays a recorded cost, not a rewrite: the web nav keeps the menu, it only
  learns to show the active section.
