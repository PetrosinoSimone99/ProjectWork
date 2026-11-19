# Assessment B (B2) — Deterministic detector pass

Scope: the Impeccable anti-pattern detector run against the Baratto-lo frontend in two
independent ways — a source CLI scan and a browser injection into the running Expo web
app — plus a synthetic positive control. Evidence collected 2026-11-19 00:02–00:42 local
(evidence directory dated 2026-11-18). All measurements in this report were read from
artifacts already on disk; nothing was re-run, no browser was opened, nothing was
re-injected by this report's author.

Artifact base: `C:/Users/Andrea/AppData/Local/Temp/asb/` (`report.json`, `report2.json` …
`report6.json`, `control.json`, `control.js`, `control-overlay.png`, `scan*.js`,
`inspect.js`, `fonts.js`), detector build `C:/Users/Andrea/AppData/Local/Temp/detect.js`.

---

## 1. Method

### 1.1 What was injected

`detect.js` (3,110,308 bytes) is the generated browser build of the Impeccable
anti-pattern detector. Its own header:

```
Anti-Pattern Browser Detector for Impeccable
Copyright (c) 2026 Paul Bakaus
GENERATED -- do not edit. Source: crates/core/src/browser (rules, WASM) +
browser-bundle/*.js (DOM probe, overlay UI).
```

It was injected into the already-loaded Expo web page as a DOM script node, cache-busted
so a stale copy could never be reused, and tagged so it could be found again in the DOM:

```js
await page.evaluate((u) => {
  const s = document.createElement('script');
  s.src = `${u}?n=${Date.now()}`;
  s.id = 'impeccable-injected';
  document.head.appendChild(s);
}, 'http://localhost:8400/detect.js');
```

After a 3–3.2 s settle, the structured result was read from the page context with
`window.impeccableDetectAsync({ serialize: false })`, and `impeccable` console lines were
captured with a `/impeccable/i` filter on `page.on('console')` (every other `error`-level
message was captured separately as a real console error).

### 1.2 Live-server port

The detector file was served by the Impeccable live server on **port 8400**, recorded in
`.impeccable/live/server.json`:

```json
{"pid":28180,"port":8400,"token":"69052683-91cc-4ec9-ae63-58d8bd83f4ba"}
```

The app under test was the Metro/Expo web dev server on **port 8081**
(`http://localhost:8081`); the Symfony API on `http://localhost:8000/api` supplied the
session tokens.

### 1.3 Mutation preflight (recorded object)

From `report.json`, first pass, before any page was measured:

```json
"preflight": {
  "titleBefore": "Accedi · Baratto-lo",
  "titleAfter": "impeccable-preflight",
  "scriptNode": true,
  "scriptRan": true,
  "localStorageWritable": true
}
```

Read as evidence, not as ceremony: the document title was actually rewritten from
`Accedi · Baratto-lo` to `impeccable-preflight`, so page JS really executes; a script node
was created and it ran; `localStorage` accepts writes, which is what makes the seeded
sessions (below) possible at all. Without this object, an empty scan could mean "the page
is clean" or "nothing ran"; with it, the second explanation is ruled out for the app pages.

### 1.4 Session seeding

Each Playwright context obtained a real token and user from
`POST http://localhost:8000/api/auth/login` and seeded
`localStorage['barattolo.token']` + `localStorage['barattolo.utente']` via
`context.addInitScript`, using `giulia.bianchi` for the user surfaces and `demo.staff` for
`/staff` (`ROLE_STAFF`). Anonymous pages (`/login`) were visited with no seed.

### 1.5 Stop command, and why nothing in the project was touched

```
impeccable live-server stop --keep-inject
```

The overlay went in through the browser, so no project file ever carried the script tag.
`--keep-inject` is the deliberate part: a bare `stop` also runs
`impeccable live-inject --remove` against the project's entry file, which is an edit a
read-only critique must not make. `git status --porcelain` after the pass shows no modified
tracked file at all — only untracked evidence artifacts
(`.impeccable/critique/evidence/frontend-2026-11-18/`, `.impeccable/live/`) and a stray
`login-390.png` at the repo root produced by another pass. `git diff --stat` is empty.
`Frontend/` is byte-identical to the committed tree.

---

## 2. CLI scan (source only)

Command:

```
C:\Users\Andrea\.agents\skills\impeccable\scripts\impeccable.cmd detect --json Frontend/src
```

- **Exit code: 0** (0 = clean, 2 = findings; this run was 0).
- stdout: `[]` (3 bytes). stderr: empty. The command did not fail.
- **Total findings: 0.**
- **Counts per rule: 0 for every rule.** The catalog is
  `impeccable detect --list-rules --quiet` → **62 rule ids** (46 fail-capable + 16 marked
  `(advisory)`), scopes `slop` and `quality`. With an empty result array there is no
  non-zero count to report for any of them.
- **Locations: none.** There is no `file:line` to list, because no finding was emitted.

Suppression is not the explanation for the zero. The project has no `DESIGN.md`, no
`.impeccable/design.json`, no `.impeccable/config.json`, and
`grep -rn "impeccable-disable" Frontend/src` returns nothing — no rule was disabled by
config or by inline ignore comments.

The important qualifier is what this scan actually did, in the CLI's own words when run
without `--json`:

```
156 files scanned with regex matching only (.js, .jsx).
Rules that need a parsed page (tiny-text, low-contrast and other element rules) did not run on them; findings are an undercount, not a clean bill of health.
For the full check, scan the running dev server (npx impeccable detect http://localhost:PORT) or a static site's built .html.
```

So the source scan is a **regex pass over 156 of the 157 files** under `Frontend/src`
(82 `.js`, 74 `.jsx`, 1 `.json`; the JSON is outside the regex matcher's extension set).
Its zero is real but weak: the entire element/geometry half of the rule set was out of
scope, which is precisely why section 3 exists.

---

## 3. Per-page browser findings

### 3.1 Summary matrix

`impeccable` console message on every single page record, verbatim:

```
%c[impeccable] No anti-patterns found. color: #22c55e; font-weight: bold
```

(`%c` is the console formatting directive; the visible text is
`[impeccable] No anti-patterns found.`)

| # | Page | Viewport | Real content at scan time (proof) | impeccable msg | Console errors | Structured `impeccableDetectAsync` | Overlay |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `/` home, authed, desktop | 1280x800 | **no** — 162 chars, "Carico i servizi…" (report2); re-scan **yes**, 1692 chars, "10 di 10 servizi" (report3) | No anti-patterns | none | `[]` | none |
| 2 | `/login`, anonymous, desktop | 1280x800 | **yes** — 172 chars, H1 "Accedi", "Non hai un account? Registrati" | No anti-patterns | none | `[]` | none |
| 3 | `/agreements`, authed, desktop, "In corso" tab | 1280x800 | **yes** — 432 chars, 98 elements, one real agreement row (`ACCETTATO`, `Creata il 17 nov 2026`, `Apri chat`, `Annulla scambio`) | No anti-patterns | none | `[]` | none |
| 4 | `/agreements`, authed, desktop, "Inviate" tab | 1280x800 | **yes, as an empty state** — 298 chars, 85 elements, "Inviate 0 / In corso 1 / Conclusi 0", "Nessuna proposta inviata" | No anti-patterns | none | `[]` | none |
| 5 | `/profile`, authed, desktop | 1280x800 | **yes** — 572 chars, 116 elements, 5 visible H2s | No anti-patterns | none | `[]` | none |
| 6 | `/match`, authed, desktop | 1280x800 | **yes** — 339 chars, 83 elements, queue with `RICERCA` / `IN ATTESA` | No anti-patterns | none | `[]` | none |
| 7 | `/staff`, `ROLE_STAFF`, desktop | 1280x800 | **yes** — 1282 chars, 142 elements, H2 "Servizi eliminati", "Registro delle operazioni" | No anti-patterns | none | `[]` | none |
| 8 | `/` home, authed, mobile | 375x667 | **yes** — 1683 chars, 298 elements, "10 di 10 servizi" and full card text | No anti-patterns | none | `[]` | none |
| 9 | `/match`, authed, mobile | 375x667 | **yes** — 330 chars, 82 elements | No anti-patterns | none | `[]` | none |
| 10 | `/profile`, authed, mobile | 375x667 | **yes** — 563 chars, 115 elements | No anti-patterns | none | `[]` | none |

Ten content-verified page records, six distinct routes, two viewports, **zero findings,
zero overlays, zero console errors, `[]` from the structured API everywhere**.

Notes on the content proofs, because a clean scan of an empty page is worthless:

- **Home desktop, first attempt (162 chars, "Carico i servizi…")** was a page still
  waiting for the API. It was re-scanned only after the row text landed: report3 records
  `textLength 1692`, `firstText` containing the first three service rows
  ("lezioni chimica / CHIMICA / in presenza / Caprese Michelangelo - Arezzo",
  "installazione OS multipli", "lezioni canto"). That is the record that counts.
- **Agreements** needed three attempts. The route is heavy (Metro re-bundles on first
  navigation), and its default tab is empty. The final, usable record is the "In corso"
  tab: 432 chars with a real agreement card.
- **Profile, match, staff, login, and all three mobile records** had their real content
  at scan time on the first try (see `textLength` / `elements` / `visibleH1` /
  `visibleH2` in `report2.json`).

### 3.2 Structured findings detail

Every page returned an empty array from `window.impeccableDetectAsync({ serialize: false })`:
`{"detectArray": [], "detectError": null, "overlay": false}` (report2) and `[]` (report3–6).
`detectError` is `null` on all records, so the empty array is not a swallowed exception —
it is the detector's answer.

### 3.3 One page worth quoting as a hazard, not a finding

`report4.json` captured `/agreements` mid-reload:

```json
"proof": { "title": "", "p": "/agreements", "len": 0, "els": 19, "text": "" },
"messages": [{ "type": "log", "text": "%c[impeccable] No anti-patterns found. ..." }],
"structured": []
```

Title empty, zero characters of text, 19 elements — and the detector still said "No
anti-patterns found." This is the detector doing exactly what it is built to do on an
empty DOM, and it is the single best argument in this report for never reading a clean
result without a content proof. It is recorded here as a methodology hazard; it is not a
finding about the app.

---

## 4. Positive control — the engine is provably working

The central risk in a detector pass is a silent no-op: an engine that never loads, or
loads and never reports, produces the same "clean" output as a genuinely clean app. Two
controls rule this out.

**Control 1 — `control.json` (`control.js`, screenshot `control-overlay.png`).** On
`/login`, after injection and before any synthetic DOM:

```json
"before": { "overlays": 0, "banner": false, "labels": [] }
```

A synthetic host was then appended with a 7 px body paragraph and a purple side-tab
accent, `window.impeccableScanAsync()` was called, and 2 s later the probe read:

```json
"found": ["tiny-text: 7px body text"],
"after": { "overlays": 1, "banner": false, "labels": ["TINY BODY TEXT"] }
```

with the console going from

```
%c[impeccable] No anti-patterns found. color: #22c55e; font-weight: bold
```

to

```
%c[impeccable] 1 anti-pattern found color: oklch(84% 0.19 80.46); font-weight: bold
```

Synthetic violation → `tiny-text: 7px body text` → **1 overlay in the DOM, labelled
`TINY BODY TEXT`, visible in `control-overlay.png`, plus a changed console message.** The
whole chain — rule, finding payload, overlay UI, console reporter — works inside this
browser, at this viewport, on this app's own page.

**Control 2 — `report2.json.control`.** Same page, a richer synthetic host, baseline
versus after: `baselineCount: 0` → `afterCount: 4`, with

```
tiny-text      detail: "7px body text"
low-contrast   detail: "1.7:1 (need 4.5"        (truncated at 120 chars)
gradient-text  detail: "background-cli..."      (truncated)
ai-color-palette detail: "Purple/viol..."       (truncated)
```

Four independent rules fired, one of them a contrast rule that requires real computed
colours — so the detector sees computed styles on this page, not just inline attributes.

**Conclusion.** The engine is provably working, so the clean result on the app is
meaningful: it means "**no rule fired on the real DOM**", not "the detector was a no-op".

**Caveat, stated rather than hidden.** The control in `report6.json` (`scan6.js` variant)
recorded `before` and `after` overlay states that are *identical*

```json
"before": { "impeccableIds": ["impeccable-injected"], "fixedChildren": [], "shadowHosts": ["DIV#error-toast"] },
"after":  { "impeccableIds": ["impeccable-injected"], "fixedChildren": [], "shadowHosts": ["DIV#error-toast"] }
```

i.e. that variant's overlay probe did not observe an overlay and is **inconclusive**. The
conclusive positive control is `control.json`, which counted `overlays: 1` and read the
label text. The two are not in conflict about the engine — only about whether that one
probe looked in the right place at the right moment.

---

## 5. Verdict

**On this app the detector reports CLEAN on 10 content-verified page records (6 routes ×
2 viewports), with 0 findings, 0 overlays, no detector errors, and an empty structured
result on every one — plus a clean source CLI scan (exit 0, 0 findings).**

A clean result of a working engine on real DOM is evidence. Its weight is bounded by the
following.

**What it does prove**

1. On the routes, states and viewports actually scanned, no rule in the 62-rule catalog
   fired: no tiny text, no low contrast, no gradient text, no purple/neon palette, no
   side-tab accent, no nested cards, no flat type hierarchy, no overflow/occlusion, no
   heading-order break, no bouncing easing, and so on.
2. The probe can read this app's styles. Baratto-lo is react-native-web output, and the
   control shows computed-colour rules firing on that same page — so "clean" is not the
   detector being blind to RNW's markup.
3. The ruled-out alternatives are explicit: detection was not disabled by config, not
   disabled by inline ignores, not failing (`detectError: null`), and not a silent no-op
   (preflight + positive control).

**What it does not prove**

1. **Coverage of the app.** Six routes were scanned: `/`, `/login`, `/agreements`,
   `/profile`, `/match`, `/staff`. The routes that were *not* scanned by the detector
   include `/register`, `/offer-and-request`, `/edit-profile`, `/report`, `/staff-users`,
   `/chat/[id]`, `/user/[id]`, `/notifications`, and `+not-found` — and so were every modal
   and panel (service-detail modal, filters sheet, web nav menu, notification/bell panel,
   the tab bar on mobile). A clean result on a third of the surface is a clean result on a
   third of the surface.
2. **States.** Only one non-default state was scanned (the agreements "In corso" tab, plus
   the "Inviate" empty state). Loading, error, validation-error, disabled, focus, hover and
   pressed states were never on screen when the detector looked. Anti-patterns that live in
   those states are invisible to this pass by construction.
3. **Light theme only.** Every report2–6 detector record was taken under Playwright's
   default colour scheme (light); no theme preference was forced. Dark mode was not
   measured by the detector at all.
4. **The CLI source scan.** Its clean output is, verbatim, "an undercount, not a clean bill
   of health" — 156 files matched by regex, with all element rules skipped.
5. **The dev bundle.** Everything was measured against the Metro dev server on 8081, which
   re-bundles per route ("Bundling... app/(tabs)/agreements.jsx" appears in the waiting
   samples). The production/static export (served on 8083 for other passes) and the native
   iOS/Android builds were never scanned.
6. **Design quality.** "No rule fired" is not "no design debt". The palette, hierarchy and
   copy judgements that assessments D/E/F/G make are exactly the class of issue a rule
   catalog cannot see. This report's clean verdict must not be cited as a design verdict.
7. **React-native-web specifics.** RNW renders `div`/`span` with inline flex styles and
   accessibility props rather than conventional CSS classes. Rules keyed on CSS
   conventions (design-token rules, class-shaped side-tab/heuristic rules) have a
   structurally different surface here, and with no `DESIGN.md` present the
   `design-system-*` rules are inert by construction — their silence is not a pass.

---

## 6. False positives and limitations

No false positive was produced in this pass: zero findings on the app, so there is nothing
to defend against. What follows is the list of reasons a *clean* result can still be wrong,
each with its cause.

1. **Empty-DOM clean is indistinguishable from real clean.** Demonstrated, not theorised:
   `report4.json` scanned `/agreements` at `textLength 0` / 19 elements / empty title and
   still logged "No anti-patterns found." Reason: the rules iterate over rendered elements;
   zero elements, zero findings. Mitigation applied: every record in section 3 carries a
   `proof` block, and the two thin first-attempts were re-scanned.
2. **`Times New Roman` is in `fontsInUse` on all nine proof pages and nothing flagged it.**
   Reason: no rule targets a generic serif fallback for UI text — `overused-font` targets a
   named list (Inter, Roboto, Fraunces, Geist, Plus Jakarta Sans, Space Grotesk) and
   `design-system-font` needs a DESIGN.md that does not exist. Whether those nodes are real
   app text or the detector's own measurement/host chrome is unresolved: `fonts.js` printed
   its offender list to stdout only and no artifact was saved, so the offender list is
   unrecorded. Recorded here as **unknown, not as a finding**.
3. **The same `fontsInUse` shows a stack containing `Roboto`** (react-native-web's default
   `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`)
   and `overused-font` did not fire. Reason: the rule evidently keys on the resolved or
   primary family rather than on the mention inside a fallback stack. Consequence: a
   Roboto-looking app would not be caught, and a Roboto-mentioning app is not a violation.
4. **Viewport-dependent rules were sampled once per viewport, at the top of the page.**
   `body-text-viewport-edge`, `first-viewport-column-overflow`, `content-hidden-at-rest` and
   `edge-flush-cards` are sensitive to scroll position and to what is in view; only
   `scrollTo(0, 0)` was measured (1280x800 and 375x667). Reason for the gap: the pass took
   one snapshot per page.
5. **State-dependent rules were never triggerable.** Rules about banners, spinners, error
   panels, open modals or validation messages need those states to exist in the DOM at scan
   time. None did. Reason: the pass navigated and scanned; it did not drive interactions.
6. **Hover / focus / active / transitioned styles are out of reach of a static snapshot.**
   A contrast or occlusion violation that only exists while a pointer rests on a row cannot
   be observed by a one-shot DOM walk. Reason: inherent to the rule model.
7. **The injected overlay perturbs the DOM it measures.** Even with zero findings, the page
   carried `#impeccable-injected` and a `DIV#error-toast` shadow host (visible in
   `report6.json`'s overlay probe on a page with no findings). Reason: the detector ships its
   own UI host. No rule fired on that chrome here, but it is DOM the app did not author.
8. **Advisory findings are silent in JSON.** 16 of 62 rules are advisory and never affect
   the exit code; with `[]` output there is no section distinguishing "no advisory fired"
   from "advisory output suppressed". Reason: the JSON shape for a clean run carries no
   metadata.
9. **`playwright` + injected script means the measured page is not the shipped page.**
   Dev-mode bundle, `__DEV__` true, Metro HMR client active, injected script present.
   Reason: this is the only way to run a DOM detector against RNW without a build step, and
   it is a known, accepted deviation, not a discovery.
10. **Cross-viewport consistency is not a rule.** Nothing checks that the 375x667 and
    1280x800 layouts are the *same* design; ten clean records are ten independent clean
    records. Reason: the catalog models anti-patterns per element, not per breakpoint.

---

## 7. Skipped or failed steps, with reasons

1. **CLI scan of a parsed page — skipped by design.** `detect Frontend/src` is
   regex-only on `.js`/`.jsx`. The parsed-page half was covered by browser injection
   instead. A URL-mode CLI scan (`detect http://localhost:8081`) was **not** run in these
   passes; `--cdp` was not used either.
2. **`/agreements` re-scan failed (report3).** Verbatim:
   `agreements (authed, desktop, data loaded): Error: page still thin after wait: textLength=298`.
   Reason: the default "Inviate" tab is a genuine empty state, so a predicate demanding
   more than 300 characters could never succeed. Superseded by the "In corso" record
   (432 chars) in report6.
3. **`/agreements` proof came back empty (report4).**
   `{"title":"","p":"/agreements","len":0,"els":19,"text":""}`.
   Reason: the page was re-loading/re-bundling (Metro) when the proof was taken. Kept in
   this report only as the empty-page hazard in 3.3, not as design evidence.
4. **`/agreements` never "settled" within 59 s (report5, `settled: false`).** The sample
   series shows `0s 0` → `10s 57` ("Bundling… app/(tabs)/agreements.jsx") → `15s 206` →
   plateau at `298` for 45 straight samples. Reason: the settle predicate was mis-specified
   (it wanted >300 chars and >300 never comes from an empty tab), not a page defect. The
   scan still ran on real DOM and returned `[]`.
5. **`scan7.js` / `scan8.js` produced no artifact.** `report7.json` and `report8.json` do
   not exist on disk, although both scripts write them. Reason recorded in the artifacts:
   the run was aborted mid-flight. Consequence: the extra datapoints those variants would
   have added (mobile `scrollWidth` proof, a mobile control overlay, `serialize: true`
   payloads) are unavailable, and this report uses `report.json` … `report6.json` only.
   The run's own terminating message was a per-shot `page.goto ... Timeout 30000ms
   exceeded` on `http://localhost:8081/`, i.e. the dev server stopped answering, not a
   detector failure.
6. **The `report6` overlay control is inconclusive** (before == after, no overlay observed).
   Reason: not established from the artifacts — the probe ran, found no
   `.impeccable-overlay`, and the run ended. Treated as inconclusive; `control.json` is the
   authoritative control.
7. **Dark theme not scanned.** Reason: no theme preference was forced and Playwright
   defaults to `prefers-color-scheme: light`; the app's theme preference is stored in
   `localStorage`/SecureStore and would have to be seeded. The only dark-theme evidence in
   this audit is the 500 in section 8.
8. **Production and native builds not scanned.** Reason: the detector is a DOM engine; the
   static export on 8083 and the native app on a device expose no DOM for it to walk.
9. **`npx expo lint` and `npx tsc --noEmit` not run.** Reason: this assessment changes no
   source file; the pre-push gate belongs to whatever commit changes code.

---

## 8. Real console errors

**During the detector passes: none.** `consoleErrors: []` / `errs: []` on every record of
`report.json`, `report2.json`, `report3.json`, `report5.json` and `report6.json`. The
detector passes were clean of page errors as well as of findings.

**Outside the detector passes, in the same audit, there is one real 500** — captured by the
dark-theme visual pass (`scripts/pass6.js`), at ~00:42, immediately after
`shot 52-bell-panel-desktop-dark`. Verbatim line from that run log:

```
  [console.error] Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

**Page: `/agreements`, dark theme, at the moment the notifications bell panel is opened.**
The sequence in `pass6.js` is: visit `/agreements` → screenshot → click the button matching
`/propost/` (the notifications bell) → screenshot `52-bell-panel-desktop-dark` → and the 500
lands right there, before the run aborted.

What it means for the audit:

- It is a **backend/API failure surfaced in the UI**, not a design anti-pattern. The
  detector neither reports it nor is supposed to; its clean result on `/agreements` says
  nothing about it, and in fact the light `/agreements` scans never opened that panel at
  all. Nothing in section 5 should be read as "the agreements page is healthy".
- Because the notifications request failed, the **panel's loading / error / empty states
  were never design-reviewed**, and whether the frontend surfaces the failure honestly
  (explicit error state vs. a silent empty list) is unknown. That is a targeted follow-up,
  not a claim.
- It also **truncates the dark-theme evidence set**: the run died at `/agreements`, so
  `/chat`, `/edit-profile` and `/user/[id]` dark shots are missing, and the dark pass was
  abandoned. Any dark-mode conclusion in this critique set is partial for that reason.
- Request URL and response body were not captured — only the console line — so the failing
  endpoint cannot be named from these artifacts. Recorded as a gap, not diagnosed.

Two further console errors appear in that same log and are weaker:

```
  [console.error] Failed to load resource: the server responded with a status of 404 (Not Found)
```

One sits between `shot 75-report-validation-desktop-light` and
`shot 90-not-found-desktop-light`, which makes a 404 plausible (the not-found route or a
missing asset) but unproven; the other appears in a later light pass while the page was
still on "Preparazione di Baratto-lo…" and is unattributed. Both are flagged here so they
are not lost, and neither is used as evidence anywhere in this report.

---

## Appendix — artifact index used

| Artifact | Contains |
| --- | --- |
| `report.json` | pass 1, 8 page records, no content proof; the preflight object; the clean console string |
| `report2.json` | pass 2, 9 page records **with** proof; structured `detectArray`; positive control with 4 findings |
| `report3.json` | home desktop re-scan after data load (1692 chars, clean); the agreements settle failure |
| `report4.json` | agreements proof at 0 chars / 19 elements with a clean detector result (hazard) |
| `report5.json` | agreements 59-sample settle series, plateau at 298 chars, clean |
| `report6.json` | agreements "In corso" tab with a real agreement row (432 chars), clean; overlay probe |
| `control.json` | before 0 overlays → `tiny-text: 7px body text` → after 1 overlay labelled `TINY BODY TEXT` |
| `control-overlay.png` | screenshot of that single overlay on `/login` |
| `control.js`, `scan*.js`, `inspect.js`, `fonts.js` | the scripts that produced the above (method, section 1) |
| `detect.js` | the injected detector build (WASM-backed rules, DOM probe, overlay UI) |
