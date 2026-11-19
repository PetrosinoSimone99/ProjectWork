# plan-brief — Frontend remediation from the full audit

Source of findings: `docs/audits/full-audit-2026-11-18.md` (§3 corrections, §4 priority
list, §7 prescribed order) and the raw assessments under
`.impeccable/critique/evidence/frontend-2026-11-18/`. Nothing in §3/§4/§7 is re-derived
here; the plan consumes them in the order §7 gives.

**Class L.** Branch `andrea-frontend` only. `Backend/` read-only. Docker exception files
untouched unless the stack is started.

## Objective

Take the audit's eleven P1s and the P2/P3 material §7 groups them with, from "found" to
"closed on the running app", in the order the audit prescribes, without regressing the
screens the audit scored 19/20 on web.

## Constraints

- Structure English, contract Italian (D026). No identifier renamed in a sweep; UI copy
  is rewritten, identifiers keep their names until their file is next touched.
- No fake data, no invented endpoint, no client-side clock deciding completion.
- Every step: `cd Frontend && npx expo lint && npx tsc --noEmit` plus `npx jest` on the
  tests the step touches; docs updated in the same commit as the change.
- Playwright: never more than two live contexts. One route per run, waits long enough for
  Metro's first-visit compile (a blank body before ~15 s is the dev server, not the app).
- Push at each block boundary on `andrea-frontend`, gate green. Never `main`, never
  `--force`, no AI-attribution footers.

## Closed decisions (from the audit and the repo, not open questions)

1. **The order is §7's, verbatim**: harden → clarify → shape → bolder/layout/distill/
   quieter → optimize → adapt → audit → polish. Each step removes the reason the next one
   looks broken.
2. **The two rejected findings stay rejected.** No 404 fix (Metro's first-visit compile),
   no heading-structure fix (levels are correct on every measured route). The real residue
   is `aria-level` emitted on 11 nodes whose role is not `header`.
3. **Backend latency is out of scope and is stated, not hidden.** The client may replace a
   blank spinner with a skeleton and may stop re-paying the 4 s on every focus; it may not
   present the wait as instant in the demo.
4. **Unmeasured surfaces are measured before they are touched**: dark `/chat`,
   `/edit-profile`, `/user/<id>`, the notifications panel's loading/error/empty states, and
   every native surface. A step that touches one without measuring says so in its report;
   it does not claim a review that did not happen.
5. **P1-5 is already shipped** (`D028` confirmation ends the exchange, `D030` keeps the
   chat on `COMPLETED`, `AgreementCard.jsx:66-77`). The audit's "no completion path" was
   true at audit time and is false at HEAD. The shape step verifies it and marks it `N/A`
   instead of rebuilding it.

## Success criteria

- The eleven P1s are either closed on the running app with evidence, or explicitly `N/A`
  with the evidence that closed them elsewhere.
- `Riprova` / `Ricarica`, `Ricerca` / `Richiesta`, `scheda` / `accordo`, `1 di 1`,
  "Ho capito" and `il server` are each one word or gone from UI copy.
- No irreversible action (credit spend, accept/refuse, cancel) without its cost on screen
  and its failure visible where the action was taken.
- `/agreements` and `/staff-users` scroll a `FlatList`, avatars go through `expo-image`,
  the always-mounted menu animation runs on the native driver.
- Web re-scored by `/impeccable audit`: no dimension below its 2026-11-18 score; the
  audit's native caveat still stated wherever native was not measured.
- `docs/DESIGN.md`'s three wrong table rows and its "one trailing action" contradiction
  fixed; `docs/changelog.md` carries one entry per block boundary.

## Exclusions

- The 404 route, the heading structure, and the backend's response time (see above).
- Native runtime verification: no emulator or device exists on this machine, so every
  native claim is a source claim and says so.
- Anything in `Archive/`, `Context_and_DB_V2/`, or `Backend/**`.

## Open decisions — the lock carried with this plan

Each one changes what gets written; each has my recommendation. A yes to the plan is a yes
to the recommendations unless you replace one.

1. **The dirty tree becomes block 0.** Commit `docs/audits/full-audit-2026-11-18.md`, its
   ship prompt, the seven assessment reports (+ measurement log) moved to
   `docs/audits/evidence/frontend-2026-11-18/`, the already-edited `docs/changelog.md`, and
   this brief+plan. Add `.impeccable/` to `.gitignore` (tool state plus 51 captures,
   ~1.9 MB: the markdown is the readable evidence, the PNGs are reproducible). Delete the
   stray root `login-390.png` (a duplicate of `00-login-desktop.png`). This is the only
   root-file edit in the cycle.
   *Recommended: yes.*

2. **P1-5 is marked `N/A` after a verification probe, not rebuilt.** Evidence already in
   the tree: `D028` (confirmation writes `end_date`, completes the row, closes the queue,
   moves the credit), `D030` (`Apri chat` on `COMPLETED`), `AgreementCard.jsx:66-77`,
   commits `88dbc56`/`9eb34dd`. The shape step re-checks it on the running app and moves
   on to P1-4.
   *Recommended: yes.*

3. **One word per object in copy.** `scambio` is the object in every sentence and in the tab
   label; `richiesta` is the queue a user asks for; `scheda di consegna` is the sheet, and
   its button says what it does (`Invia la scheda`), not the noun; `descrizione` replaces
   `Mansione`. Code identifiers keep the D026 contract terms (`accordo`, `coda`,
   `servizio`) and are renamed only when a file is next touched.
   *Recommended: yes.*

4. **`Riprova` is the single recovery word; `Ricarica` disappears.** It appears in ~20
   files and ~8 tests: a string rename, not an identifier rename, so D026's no-sweep rule
   does not apply. Same for the seven "Ho capito" banners: each becomes the action it
   actually performs (`Chiudi`, or nothing when it performs nothing).
   *Recommended: yes.*

5. **All seven steps run in one cycle, tonight, with no intermediate stop.** Deadline is the
   next morning, so the order stays §7's and the cycle does not pause after step 4: optimize,
   adapt, audit and polish land in the same session, each with its own commit and gate. The
   only remaining stop is a red gate that cannot be fixed without changing the brief.
   *Closed: do everything in one cycle.*
