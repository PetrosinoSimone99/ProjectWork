# Mobile audit 360 — 2026-11-17

What this cycle can prove about the **phone** surface from a Windows machine, and
what it explicitly cannot. Written on `30ab4cf`, `andrea-frontend`, against the
Docker stack (`backend` on :8000, MySQL seeded from `barattolo_15112026` +
`seed-demo.sql`) and a fresh `npx expo export --platform web` served by
`npx expo serve dist --port 8083`.

## Corrections — after review

Measured on `30ab4cf`, corrected at `1a3cf92`. Four figures of the first version
of this record were wrong; each one is fixed inline below, and the correction
says what the artefact actually shows.

- **F6 is withdrawn.** The card height was read in device pixels, not CSS
  pixels: `06-notifiche.png` is 1179×1980 at DPR 3, so one notification is
  **144 CSS px** tall with a **153 px** pitch, and the viewport that was driven
  is **660 px**, not 852. One screen shows **three complete cards plus the top
  of a fourth**, and «4 da leggere» is the first line under the title. The
  premise of the finding does not hold.
- **F8 was misattributed, and is closed.** Re-measured with the same
  confirmation open: of the three unnamed stops, **two are
  `react-native-web`'s `ModalFocusTrap` brackets** (`role="presentation"`,
  `tabindex="0"`, 0 px tall) and **one** is this project's backdrop — not three
  backdrops. A fourth measurement the finding did not report: the eight controls
  of the page *behind* the dialog were tabbable too. `7b5d016`, after this
  audit, traps Tab inside the panel and gives focus back to the trigger, so none
  of the three is reachable any more.
- **«41 screens × 3 profiles»** were **51 measurements**: 25 at iPhone 14 Pro,
  13 at iPhone SE, 13 at Pixel 7.
- **«iPhone 14 Pro (393×852)»** is the device screen; the driven viewport is
  393×**660** (`screen` vs `viewport` in Playwright's descriptor, DPR 3).

Screenshots in `screens-mobile-2026-11-17/` are 1179×1980 because of that DPR:
**divide by 3 before comparing a pixel to a CSS length.**

The worklist that follows from this record — what is still open, and the prompt
that closes it — is
[`ux-mobile-audit-2026-11-17-open-work.md`](ux-mobile-audit-2026-11-17-open-work.md).

## The fix cycle — outcome, later the same day

The worklist was **re-measured before any fix**, on a fresh
`npx expo export --platform web` of `bc94e08` (so `667815a`'s `AppButton` change
was in the bundle), with the same harness and the same demo data: 51
measurements, three profiles. Numbers in
[`screens-mobile-2026-11-17-remisura/misure.json`](screens-mobile-2026-11-17-remisura/misure.json);
only the capture that carries a verdict a number cannot — the two exits on
`/staff` — was kept, the rest of that run is numbers.

After the fixes the same harness ran again on the fixed tree, same data:
[`screens-mobile-2026-11-17-remisura-dopo/misure.json`](screens-mobile-2026-11-17-remisura-dopo/misure.json),
**49** of the 51 measurements (two iPhone 14 Pro modal states —
`22-notifiche-conferma-elimina`, `23-voce-editor` — lost to a harness timeout on
the `accordi: filtro e scheda` step; neither carries a verdict). Every number
below is a before/after pair from those two files, and each pair is on the same
screen, so the difference is the change and not the data.

| id | outcome | evidence |
| --- | --- | --- |
| F4 | **closed** by `7c4a760` | web: the sheet renders exactly two `input[type=date]`, `aria-label` «Inizio» and «Fine», and the browser paints its own date skeleton; native: the iOS bundle still exports, which is what proves the picker's import resolves in the native graph. What a thing this big cannot show is the picker on a phone — §4 of this record says so |
| F2 | **closed** by `5edfd46` | the catalog at 320 px reports **0** controls under 44 in `13` (was 1: the refresh control at 42×44); 393 was already clean and stays clean |
| F1 | **closed** by `391a8de` | `/edit-profile` and `/register` at 320 px: **0** elements cross the viewport (was `INPUT` left 179 / right 348 on `innerWidth` 320, on both screens) |
| F7 | **closed** by `6d84820` | `/staff` with a non-staff account: **2** interactive nodes — the nav menu and «Torna al profilo»; was 3, the pair of captures is committed in both run directories |
| F9 | **withdrawn** | the same `/offro-e-cerco` screen at 320 px, with the same **8** interactive nodes: `troncati: []`, against the four truncations this record measured (`Modifica` 52/60, `Sospendi` 52/62, twice). `667815a` removed the one-line clamp: no fix was needed, so none was made |
| F5 | **open, filed as G27** | `backend-gaps.md` G27 states what the payload does not carry and what the inbox cannot do until it does. No frontend change was possible, and none was made |

One thing the worklist got wrong, corrected by the re-measure: F1's offender is
not the profile form's row but the `INPUT` inside `AppInput`, and `/register`
fails with the same numbers. The fix therefore went to the shared field.

With F4, F1, F2, F7 and F8 closed and F6/F9 withdrawn, the rubric of §1 on
today's tree reads Usability **9.5** (F5), Accessibility **9.8** (F3 only, and
it is informational), Design system **10**, Platform **10**: **9.8 / 10**.

---

**Method — three legs, in this order:**

1. **Native bundle** — `npx expo start`, then the Metro request for the iOS
   bundle (`node_modules/expo-router/entry.bundle?platform=ios&dev=true`):
   `200`, 6.06 MB. The native module graph resolves with this tree.
2. **Device viewports, driven** — `scripts/audit-mobile-360.js`: WebKit 27.2
   (Safari's own engine) at iPhone 14 Pro (393×660 viewport, DPR 3) and iPhone SE
   (320×568), plus
   Chromium at Pixel 7 (412×915). Ten static routes plus the eleven dynamic /
   modal states reachable by tapping. Per screen the script measures, in the
   live DOM: horizontal overflow, elements that cross the viewport edge, clipped
   text, real colour-contrast ratios against the effective background, touch
   targets under 44 pt, unnamed focusable nodes, leftover "Carico…" states, and
   **touch occlusion** (`elementFromPoint` at the centre of every control: is
   something else on top of it?).
3. **Targeted re-tests** — 375×667 (the narrowest phone still in support) and
   320×667 for the three measurements that only fail on small widths; a
   programmatic check on the confirm modal for unnamed tab stops.

Data for the full states was created through the API on the demo accounts
(`giulia.bianchi` ↔ `luca.ferrari`: one `ACCEPTED` agreement with a compiled
sheet, a chat with two messages, four unread notifications, one `OFFER` queue, one
open report). Screenshots: [`screens-mobile-2026-11-17/`](screens-mobile-2026-11-17/),
raw numbers in its `misure.json`.

**Method note that invalidates a shortcut.** `fullPage: true` screenshots with
`position: fixed` chrome place that chrome at the *viewport's* offset, not the
document's: a full-page shot of a scrolled screen shows the floating nav and the
notifications FAB sitting on top of content they never touch at runtime. Two
suspected overlaps (nav over the profile's first row, FAB over the agreement
sheet's date field) were **retracted** by the occlusion measurement: 0 occluded
controls on `/agreements` (scrolled), `/notifications`, `/profile`, `/match`.

---

## 1. Scores

Severity rubric and weights are `PromptAuditUx.md` §5. Findings by severity:
**9 recorded — 0 × sev4, 1 × sev3, 6 × sev2, 2 × sev1; 1 withdrawn (F6), so 8
stand.**

| Dimension | Weight | Findings | Score | Why |
| --- | --- | --- | --- | --- |
| Usability | 30% | F5 (sev2), F7 (sev1) | 9.3 | −(0.5+0.2) |
| Accessibility | 25% | F4 (sev3), F2, F8 (sev2), F3 (sev1) | 7.3 | −(1.5+0.5+0.5+0.2) |
| States and copy | 15% | none | 10.0 | every empty/loading/error state present, no stuck spinner |
| Design system | 15% | F9 (sev2) | 9.5 | −0.5 |
| Platform and perceived responsiveness | 15% | F1 (sev2) | 9.5 | −0.5 |

**Final score: 9.0 / 10** (8.8 before F6 was withdrawn). F8 is counted here as
it stood when measured; `7b5d016` closed it afterwards, so on today's tree
Accessibility reads 7.8 and the total 9.1.

What the score rests on, said plainly: contrast, overflow and touch targets on the
supported widths (375 / 393 / 412) came back clean, and that is not a courtesy —
51 measurements across 3 profiles, minimum text ratio **5.42:1** in light and
dark alike, no horizontal overflow above 320 px, no clipped label above 320 px.
What costs points is the **date entry** (a text field for a calendar fact) and
**F5** (an inbox whose message rows cannot be told apart).

---

## 2. Findings

| id | sev | state | area | evidence | criterion | what happens | why it matters | fix | effort |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F4 | 3 | **CLOSED** by `7c4a760` | Agreement sheet, both roles | `Frontend/src/components/AgreementSheet.jsx:16` (`FORMATO = 'AAAA-MM-GG'`), `:137`, `:145`; screenshot `iphone-14-pro/19-accordi-in-corso.png` | WCAG 1.3.5 Identify input purpose; iOS HIG date entry | "Inizio" and "Fine" are free-text fields with the placeholder `AAAA-MM-GG` and **no `inputMode`, no `keyboardType`, no native date picker**. On a phone this opens the alphabetic keyboard and asks the user to type hyphens; iOS autocorrect fights the dashes (the proof Andrea owed us in `native-parity-2026-11-15.md` §5 line 13 is owed precisely because of this) | A date is not a string: the user must produce `2026-12-01` by hand, in a format nobody uses in Italian, on the surface that decides the exchange | Use the platform picker (`@expo/ui/community/datetime-picker`, already installed / `<input type="date">` on web), keep the ISO string only on the wire, show `GG/MM/AAAA` | M |
| F5 | 2 | OPEN — filed as G27 | Notifications | screenshot `iphone-14-pro/06-notifiche.png`; `docs/api.md` §Notifications | Nielsen 2 (match between system and real world) | Two consecutive `MESSAGGIO` rows read exactly *"Nuovo messaggio da: luca.ferrari"* — same text, same sender, only the minute differs. The payload carries no message preview | The inbox cannot be triaged: to know which message arrived, the user has to open each agreement | Backend gap: expose the message text (or a 60-char preview) on the notification; until then the UI cannot fix it. File as a `backend-gaps` item | M |
| ~~F6~~ | — | **WITHDRAWN** | Notifications | `iphone-14-pro/06-notifiche.png`, re-measured at 1179×1980 / DPR 3 | — | One card is **144 CSS px** on a **153 px** pitch in a **660 px** viewport: 3 complete cards and the top of a fourth per screen, with «4 da leggere» as the first line under the title. The first version read the height in device pixels (432) and the screen as 852 | It does not: the frozen number was an artefact of the capture, not of the layout | none — the inbox is dense enough; if anything the card has room | — |
| F8 | 2 | **CLOSED** by `7b5d016` | Confirm modal | Re-measured on the audited build with the confirmation open: 14 nodes carry `tabindex="0"` — 8 page controls behind the dialog, 2 `role="presentation"` brackets of `react-native-web`'s `ModalFocusTrap` (0 px tall), 1 backdrop with `aria-hidden`, 3 dialog controls. At audit time `ModalShell.jsx:194` was `role="dialog"` and `:197` `tabIndex={-1}` | WCAG 4.1.2 Name, role, value; 2.4.7 Focus visible | The three unnamed stops were **library internals plus one backdrop**, not three backdrops; and the page behind the dialog was still tabbable, which the first version did not report | Fixed after this audit: `7b5d016` traps Tab inside the panel (`keepTabInside`) and returns focus to the trigger, so neither the brackets nor the backdrop are reachable by keyboard, and the page behind is no longer in the path | none — done; the two library brackets cannot be reached from `ModalShell` props, and they are out of the accessibility tree (`role="none"`) | — |
| F2 | 2 | **CLOSED** by `5edfd46` | Web nav, every screen | `Frontend/src/components/WebNavMenu.jsx:350`; `misure.json` → `piccoli: [{testo: "Aggiorna i dati della schermata", w: 42, h: 44}]` at 375 and 320 | Apple HIG 44×44 pt | The refresh control is **42 × 44 pt** once the label collapses to the icon at phone widths | 2 pt short of the minimum on the most-tapped icon-only control | Bump the control to 44 × 44 (`target` token) | S |
| F1 | 2 | **CLOSED** by `391a8de` | Edit profile, register | `misure.json` → `iphone-se/07-modifica-profilo`: `INPUT … left 179, right 348` with `innerWidth 320`; at 375 the same input is inside the viewport | WCAG 1.4.10 Reflow | At 320 px CSS an input crosses the right edge by **28 px** and is clipped (no page scroll: `overflow: 0`) | Only on 320 px devices (iPhone SE 1st gen, small Android). Above 320 it is clean | Give the form row a `flexShrink: 1` / smaller `minWidth` | S |
| F9 | 2 | **WITHDRAWN** | Offer and request | `misure.json` → `iphone-se/03-offro-e-cerco`: `Modifica` 52/60, `Sospendi` 52/62, 4 occurrences | Nielsen 4 (consistency); text clipping | The two entry-card actions lose their last letters at 320 px | A truncated verb reads as a bug, not a style | Shorter labels at narrow widths, or wrap the action row | S |
| F7 | 1 | **CLOSED** by `6d84820` | Staff guard | screenshot `iphone-14-pro/09-staff.png` | Nielsen 4 | A non-staff account sees «Sezione riservata allo staff» with a primary «Torna al profilo» **and**, further down, a second «← Indietro» | Two exits for the same place, visually unrelated | Drop the secondary back link on this screen | S |
| F3 | 1 | VERIFIED | Register / login footer | `misure.json` → `12-registrati`: `{testo: "Accedi", w: 40, h: 44}` | Apple HIG (informational) | The «Accedi» link is 40 pt wide | Inline text links inside a sentence are generally exempt; recorded for completeness, not as a defect to fix | none | — |

### What came back clean (measured, not assumed)

- **Contrast**: 0 failures across 51 measurements × 3 profiles, light and dark. Worst
  text in the app is `rgb(93, 102, 95)` on `rgb(243, 245, 241)` = **5.42:1**
  (AA needs 4.5 at 13 px).
- **Horizontal overflow**: 0 at 375, 393 and 412; the only offender is F1 at 320.
- **Touch occlusion**: 0 controls covered by the fixed nav or the floating
  notifications button on `/agreements`, `/notifications`, `/profile`, `/match`.
- **States**: every surface that fetches shows its loading line and then a
  finished state; no "Carico…" left on screen after the data arrives; the empty
  states (`Nessuna coda attiva`, `Nessuna proposta inviata`, `Nessuna notifica`)
  are real designed states with icon, title and explanation.
- **Auth guard**: `/staff` with a non-staff account renders the locked panel and
  a route back, not a raw 403. The 403 in the console is the backend answering
  correctly.
- **Dark theme**: same 0 contrast failures; the theme selector shows the active
  choice with a border plus tint, not colour alone.
- **iOS bundle**: compiles (6.06 MB dev bundle).

---

## 3. Top 10 by impact/effort

1. **F4 — native date entry** (M): the only finding that costs real user effort
   every single exchange.
2. ~~**F8 — mute tab stops in the confirm modal**~~ **closed** by `7b5d016`:
   the Tab trap and the focus return made them unreachable. No action.
3. **F2 — refresh control 42 → 44 pt** (S).
4. ~~**F6 — card padding in the inbox**~~ **withdrawn**: the card is 144 CSS
   px, three fit on a screen (see Corrections). No action.
5. **F7 — second back link on the staff guard** (S).
6. **F1 — input overflow at 320 px** (S).
7. **F9 — truncated `Modifica`/`Sospendi` at 320 px** (S).
8. **F5 — notification preview** (M, backend): until it lands, the inbox stays
   untriageable for message notifications.
9. **Catalog demo data** — `@fhjwgag`, `@sassonesa`, two identical «ripetizioni
   chimica» rows: not a frontend defect, but it is what a reviewer sees first.
   Clean the seed before any demo.
10. **F3** — informational, no action.

---

## 4. Not verified — and what would verify it

| Claim | Why it is not verified here | What would verify it |
| --- | --- | --- |
| Native safe area (notch, home indicator) | WebKit viewport has no `env(safe-area-inset-*)` values | iPhone with Expo Go, or a Mac simulator |
| Native keyboard behaviour (fields above the keyboard, autocorrect vs dashes) | No native keyboard exists in a browser | Device, `docs/audits/native-parity-2026-11-15.md` §5 lines 13–15 |
| Pull-to-refresh, swipe-back, sheet gestures | Native gesture stack, absent from react-native-web | Device |
| VoiceOver order and announcements | No native a11y tree | Device or Accessibility Inspector |
| Native bottom tab bar (5 tabs, unclipped) | On web the tab bar is replaced by `WebNavMenu` by design | Device |
| Real performance on a phone (bundle parse, list scroll, cold start) | Desktop CPU | Device, or a profiled release build |
| Time to first content on device | The dev backend answers in 2–4 s per call (PHP dev server + debug), which dominates everything measured here | A release build against a warmed backend |
| 200% text zoom, keyboard-only tour, expired session | Not run in this cycle | A full `PromptAuditUx.md` pass |

**Andrea's two-minute list (no screenshots, answer "ok" or "broken"):** open Expo
Go on `exp://<pc-ip>:8081`, then — (1) the five tabs are all visible and none is
clipped; (2) open Match, pull down: spinner appears and the row stays; (3) open
Agreements → «In corso»: the sheet's two date fields are both visible with the
keyboard open; (4) type `01122026` in «Inizio»: does it mangle the dashes?;
(5) dark theme from the system switch: no white card on a black page; (6) the
first card sits below the notch and the last above the home indicator.
