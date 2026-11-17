# Mobile audit 360 — 2026-11-17

What this cycle can prove about the **phone** surface from a Windows machine, and
what it explicitly cannot. Written on `30ab4cf`, `andrea-frontend`, against the
Docker stack (`backend` on :8000, MySQL seeded from `barattolo_15112026` +
`seed-demo.sql`) and a fresh `npx expo export --platform web` served by
`npx expo serve dist --port 8083`.

**Method — three legs, in this order:**

1. **Native bundle** — `npx expo start`, then the Metro request for the iOS
   bundle (`node_modules/expo-router/entry.bundle?platform=ios&dev=true`):
   `200`, 6.06 MB. The native module graph resolves with this tree.
2. **Device viewports, driven** — `scripts/audit-mobile-360.js`: WebKit 27.2
   (Safari's own engine) at iPhone 14 Pro (393×852) and iPhone SE (320×568), plus
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
sheet, a chat with two messages, two unread notifications, one `OFFER` queue, one
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
**9 total — 0 × sev4, 1 × sev3, 6 × sev2, 2 × sev1.**

| Dimension | Weight | Findings | Score | Why |
| --- | --- | --- | --- | --- |
| Usability | 30% | F5, F6 (sev2), F7 (sev1) | 8.8 | −(0.5+0.5+0.2) |
| Accessibility | 25% | F4 (sev3), F2, F8 (sev2), F3 (sev1) | 7.3 | −(1.5+0.5+0.5+0.2) |
| States and copy | 15% | none | 10.0 | every empty/loading/error state present, no stuck spinner |
| Design system | 15% | F9 (sev2) | 9.5 | −0.5 |
| Platform and perceived responsiveness | 15% | F1 (sev2) | 9.5 | −0.5 |

**Final score: 8.8 / 10.**

What the score rests on, said plainly: contrast, overflow and touch targets on the
supported widths (375 / 393 / 412) came back clean, and that is not a courtesy —
41 screens × 3 profiles measured, minimum text ratio **5.42:1** in light and dark
alike, no horizontal overflow above 320 px, no clipped label above 320 px. What
costs points is the **date entry** (a text field for a calendar fact) and the
vertical density of the two list surfaces.

---

## 2. Findings

| id | sev | state | area | evidence | criterion | what happens | why it matters | fix | effort |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F4 | 3 | VERIFIED | Agreement sheet, both roles | `Frontend/src/components/AgreementSheet.jsx:16` (`FORMATO = 'AAAA-MM-GG'`), `:137`, `:145`; screenshot `iphone-14-pro/19-accordi-in-corso.png` | WCAG 1.3.5 Identify input purpose; iOS HIG date entry | "Inizio" and "Fine" are free-text fields with the placeholder `AAAA-MM-GG` and **no `inputMode`, no `keyboardType`, no native date picker**. On a phone this opens the alphabetic keyboard and asks the user to type hyphens; iOS autocorrect fights the dashes (the proof Andrea owed us in `native-parity-2026-11-15.md` §5 line 13 is owed precisely because of this) | A date is not a string: the user must produce `2026-12-01` by hand, in a format nobody uses in Italian, on the surface that decides the exchange | Use the platform picker (`@react-native-community/datetimepicker` / `<input type="date">` on web), keep the ISO string only on the wire, show `GG/MM/AAAA` | M |
| F5 | 2 | VERIFIED | Notifications | screenshot `iphone-14-pro/06-notifiche.png`; `docs/api.md` §Notifications | Nielsen 2 (match between system and real world) | Two consecutive `MESSAGGIO` rows read exactly *"Nuovo messaggio da: luca.ferrari"* — same text, same sender, only the minute differs. The payload carries no message preview | The inbox cannot be triaged: to know which message arrived, the user has to open each agreement | Backend gap: expose the message text (or a 60-char preview) on the notification; until then the UI cannot fix it. File as a `backend-gaps` item | M |
| F6 | 2 | VERIFIED | Notifications, agreements | screenshots `iphone-14-pro/06-notifiche.png`, `19-accordi-in-corso.png` | Nielsen 8 (aesthetic and minimalist design) | One notification occupies ~430 px and one agreement sheet ~620 px of a 852 px viewport: the inbox shows **1.5 items per screen**; the gap between the message line and its action row is ~60 px of empty card | "4 da leggere" is invisible above the fold; triage becomes scrolling | Tighten card padding to the `space.md` step and put the action row on the same baseline as the message meta | S |
| F8 | 2 | VERIFIED (web) | Confirm modal | 3 focusable nodes in the DOM with `tabindex="0"` and no accessible name, measured with the delete-confirmation open; `Frontend/src/components/ModalShell.jsx:194-197` (`role="dialog"`, `tabIndex={-1}` is correct) | WCAG 4.1.2 Name, role, value; 2.4.7 Focus visible | Tab lands on three mute nodes before reaching the dialog's buttons: two `role="presentation"` backdrops and one bare `DIV` | A screen-reader user hits three unlabelled stops inside a modal; on native there is no tab order, so the blast radius is the web build | Take the backdrop out of the tab order (`tabIndex={-1}` / `aria-hidden`) in `ModalShell` | S |
| F2 | 2 | VERIFIED | Web nav, every screen | `Frontend/src/components/WebNavMenu.jsx:350`; `misure.json` → `piccoli: [{testo: "Aggiorna i dati della schermata", w: 42, h: 44}]` at 375 and 320 | Apple HIG 44×44 pt | The refresh control is **42 × 44 pt** once the label collapses to the icon at phone widths | 2 pt short of the minimum on the most-tapped icon-only control | Bump the control to 44 × 44 (`target` token) | S |
| F1 | 2 | VERIFIED (320 only) | Edit profile, register | `misure.json` → `iphone-se/07-modifica-profilo`: `INPUT … left 179, right 348` with `innerWidth 320`; at 375 the same input is inside the viewport | WCAG 1.4.10 Reflow | At 320 px CSS an input crosses the right edge by **28 px** and is clipped (no page scroll: `overflow: 0`) | Only on 320 px devices (iPhone SE 1st gen, small Android). Above 320 it is clean | Give the form row a `flexShrink: 1` / smaller `minWidth` | S |
| F9 | 2 | VERIFIED (320 only) | Offer and request | `misure.json` → `iphone-se/03-offro-e-cerco`: `Modifica` 52/60, `Sospendi` 52/62, 4 occurrences | Nielsen 4 (consistency); text clipping | The two entry-card actions lose their last letters at 320 px | A truncated verb reads as a bug, not a style | Shorter labels at narrow widths, or wrap the action row | S |
| F7 | 1 | VERIFIED | Staff guard | screenshot `iphone-14-pro/09-staff.png` | Nielsen 4 | A non-staff account sees «Sezione riservata allo staff» with a primary «Torna al profilo» **and**, further down, a second «← Indietro» | Two exits for the same place, visually unrelated | Drop the secondary back link on this screen | S |
| F3 | 1 | VERIFIED | Register / login footer | `misure.json` → `12-registrati`: `{testo: "Accedi", w: 40, h: 44}` | Apple HIG (informational) | The «Accedi» link is 40 pt wide | Inline text links inside a sentence are generally exempt; recorded for completeness, not as a defect to fix | none | — |

### What came back clean (measured, not assumed)

- **Contrast**: 0 failures across 41 screens × 3 profiles, light and dark. Worst
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
2. **F8 — mute tab stops in the confirm modal** (S): 3 lines in `ModalShell`.
3. **F2 — refresh control 42 → 44 pt** (S).
4. **F6 — card padding in the inbox** (S): one screen gains a whole row.
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
