# Brief — residual mobile audit 360 (contract)

Worklist: [`audits/ux-mobile-audit-2026-11-17-open-work.md`](../../audits/ux-mobile-audit-2026-11-17-open-work.md).
Record with the evidence: [`audits/ux-mobile-audit-2026-11-17.md`](../../audits/ux-mobile-audit-2026-11-17.md)
(read §"Corrections — after review" first). Plan: [`plan.md`](plan.md).

## Objective

Close what the 2026-11-17 mobile audit left open on the phone surface: one real
date picker (F4), four small layout/target fixes (F1, F2, F7, F9 — each only if
it still reproduces on today's bundle), and one backend-gap entry for the
notification preview (F5). No redesign, no renaming sweep, no new dependency.

## Closed decisions

| # | Decision |
| --- | --- |
| D1 | **Re-measure before fixing.** F1/F2/F7/F9 were measured on a bundle older than `667815a fix: stop truncating button labels at 200% text`. A finding that no longer reproduces is **withdrawn in the audit record with the number that proves it**, never "fixed" into an unattributable change. |
| D2 | **F4 is one lane, alone**, committed before the sweep: native picker, display `GG/MM/AAAA`, wire stays ISO `YYYY-MM-DD`, `periodoValido` untouched, web gets a real `input[type=date]` behind `Platform.OS === 'web'`. |
| D3 | **F4 shape**: a new `Frontend/src/components/DateField.jsx` (English file name, Italian props per D026), used by the two date rows of `AgreementSheet`. Not the picker inline in the sheet. |
| D4 | **F5 is documentation, not a fix**: one new section `G27` in `docs/backend-gaps.md`. Zero frontend lines — a frontend workaround for missing data is exactly what a standalone prompt would invite. |
| D5 | **Where the fix lives**: frontend fixes stay inside the four files named by the worklist. Shared contracts (`services/dates.js`) take new pure helpers only; no test in the component tree for the picker's appearance, tests go on the boundary (the date that enters, the string that leaves). |
| D6 | **F9 if it survives**: layout (the two reversible commands wrap instead of truncating), not shorter copy — the copy is the product's vocabulary and would need an Italian review. |
| D7 | **The worklist survives the cycle**: `-open-work.md` is kept and closed with one outcome line per finding, because it is the file a reader lands on and it holds the re-measure numbers per finding. |

## Constraints

- Write scope: `Frontend/**` and `docs/**`. `Backend/**` read-only (the Docker
  files are an exception that this cycle does not need).
- No credentials outside `docs/setup.md`. No emoji, no AI-attribution footers.
- Comments: structure in English, contract in Italian (D026). Every UI state
  explicit (loading, empty, error).
- Gate before any push: `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest`.
  Red gate stops the push; assertions are never weakened.
- The green gate is not type safety: `allowJs` without `checkJs`.

## Success criteria

1. Every finding in the record has one verdict: closed by <commit>, withdrawn
   with the measured number, or open with a reason.
2. A date is entered with the platform picker on native and with a real
   `input[type=date]` on web; the wire still carries `YYYY-MM-DD`; an end before
   the start is still rejected before the call.
3. `npx jest` covers the date boundary conversions (ISO in / ISO out, and the
   local-timezone case that would shift a day).
4. Lint, typecheck and tests green; work pushed to `andrea-frontend` only.

## Exclusions

F6 (withdrawn), F8 (closed by `7b5d016`), F3 (inline text link, exempt by HIG),
the catalog demo seed (not a frontend defect), `main`, and any file outside the
five named by the worklist plus the docs.
