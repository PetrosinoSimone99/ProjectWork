# Assessment E — design-system drift audit (`/impeccable document`, verification-only)

Date: 2026-11-18
Mode: source-level, read-only. No browser, no writes outside this file.
Yardstick: the checklist a generated `DESIGN.md` must satisfy
(`C:/Users/Andrea/.agents/skills/impeccable/reference/document.md`), applied as a
test against the *existing* `docs/DESIGN.md`.
System under test: `docs/DESIGN.md` (the claimed rules), `Frontend/src/theme/tokens.js`,
`Frontend/src/components/AppText.jsx` (the claimed single sources of value),
plus every file in `Frontend/src/components/`, `Frontend/src/app/`,
`Frontend/src/hooks/`, `Frontend/src/theme/`, `Frontend/src/navigation/`.

---

## 1. Verdict

**True with 30 drift points — 0 P0, 5 P1, 13 P2, 12 P3.**

`docs/DESIGN.md` is not stale. Its architecture-level claims (single mechanisms,
single owners, scroll node, band, refresh ownership, type roles, token discipline
for colour and radius) are overwhelmingly *accurate about the code*, and several
are honestly ahead of most codebases: colour literals and radius literals really
are at zero outside the token file, there really is one modal shell, one header
component, one empty-state anatomy, one error banner, and the band maths really
matches `Screen`'s padding.

What the document does **not** survive is the "spent once" colour rule (five
distinct non-action uses of `primary`, two of them filled and shipping today), the
scroll-node rule on exactly one screen (chat), the touch floor on exactly one row
(the staff operations log), and its own "Where to change what" table, which is
wrong in three rows and missing eight owners. One further class of drift matters
more than any single violation: the document's *highest-traffic visual pattern* —
how a selected option, a disabled control, a pressed row, a floating surface and
an accent-as-text command look — is not written down at all, so each of them is
re-invented per component (Section 3).

The file is also **not a `DESIGN.md`** in the spec the `document` pass generates:
no YAML frontmatter, no canonical section names, no `Components` or
`Elevation & Depth` section. It is a rules manifesto that happens to share the
filename. That is a deliberate design choice in the file's own first paragraph
("it restates no value"), and it is defensible — but it means
`/impeccable document` would today report "no tokens found, regenerate", and any
DESIGN.md-aware tooling (Stitch linter, the live panel) sees nothing.

---

## 2. Drift table

Legend: severity P0 blocks the system, P1 breaks a stated hard rule on a shipping
surface, P2 an internal inconsistency or an owner that is not the owner, P3 a
nit/staleness. Commands are from the `impeccable` set.

### Colour

| # | Documented rule | Expected | Actual (file:line) | Sev | Command |
| --- | --- | --- | --- | --- | --- |
| C1 | "The accent is spent once per screen. One filled `primary` element — the screen's primary action" | one filled primary per screen | The auth masthead is a 64 pt **filled `primary` disc** and the submit is a **filled `primary` button** on the same screen — two filled accents on `/login` and on `/register`. `AuthShell.jsx:30-38` (`backgroundColor: t.primary`), submit at `app/(auth)/login.jsx:117`, `app/(auth)/register.jsx:439` | **P1** | colorize |
| C2 | same rule; "Chrome gives it up … a neutral surface bar, not a coloured disc" | no accented chrome | `/agreements` floats a 56 pt **filled `primary` disc** (the proposal bell) over a screen whose only other actions are `secondary`/`danger`: the accent is claimed by chrome, which is the exact pattern `WebNavMenu` retired under F88 (`WebNavMenu.jsx:76-82`). `app/(tabs)/agreements.jsx:419-423` | **P1** | quieter |
| C3 | same rule; the accent is "one filled element **plus the data marks that classify**" | a closed list of accent uses | `primary` is also spent as: inline text (`TextLink.jsx:41`, `FilterBar.jsx:377`, `FilterBar.jsx:417`), a 1 px selection edge (`PillBar.jsx:75`, `ThemeSelector.jsx:51`, `AppCheckbox.jsx:54`), a filled checkbox (`AppCheckbox.jsx:55`), a card's unread edge (`NotificationRow.jsx:174`), native tab tint (`app/(tabs)/_layout.jsx:26`), the web menu's active icon (`WebNavMenu.jsx:456`), and a 28 pt title (`app/(tabs)/profile.jsx:247`). The rule describes none of these, so they cannot be judged — and a new screen can add six more and still read as compliant | **P1** | document |
| C4 | "`border` is decorative; `borderInput` … identifies a **control**" | borderInput only on controls | The empty-state glyph disc is not a control (no press, no role) yet wears the control boundary: `EmptyState.jsx:47-53` (`borderColor: t.borderInput`, `width: 56`). Reads as a tappable button | P3 | shape |
| C5 | Colour role table = the palette | every colour role listed | `ombra` (`tokens.js:104`, `#000000`) is a colour token living outside both palettes, used by three shadow recipes with literal opacities (`WebNavMenu.jsx:54-67`, `app/(tabs)/agreements.jsx:424-428`). Not in the table | P3 | document |
| C6 | "Contrast ratios are declared next to the values they belong to, in `tokens.js`" | declared per role | Only `borderInput`, `primary`, `primaryPressed` declare ratios (`tokens.js:24,47,51-55`). `accentBg/accentText`, `serviceBg/serviceText`, `dangerBg/dangerText`, `successBg/successText`, `overlay` declare none | P3 | document |

### Shape

| # | Documented rule | Expected | Actual (file:line) | Sev | Command |
| --- | --- | --- | --- | --- | --- |
| S1 | "a thing that is pressed is a **pill** whatever its width" | `radius.pill` on pressables | Two pressable families wear the *input* radius: the theme preferences (`ThemeSelector.jsx:49`) and the checkbox row (`AppCheckbox.jsx:41`) | **P2** | shape |
| S2 | "One choice device … `radiogroup`/`radio` on a **pill track**" | one track shape | Same device, two shapes: the agreements sections sit on a `radius.pill` track (`app/(tabs)/agreements.jsx:327-334`) while the theme selector is three separate 12 px tiles (`ThemeSelector.jsx:49`). The document names one shape; the code ships two | **P2** | shape |

### Touch

| # | Documented rule | Expected | Actual (file:line) | Sev | Command |
| --- | --- | --- | --- | --- | --- |
| T1 | "`target.min` is the floor for every pressable in both dimensions" | ≥ 44 pt | The staff operations log rows are pressables of `paddingVertical: space.xs` (4) around a 13 px label — about 26 pt tall, no `minHeight`, no `hitSlop`: `StaffOperationsLog.jsx:115-131` | **P1** | harden |

### Spacing

| # | Documented rule | Expected | Actual (file:line) | Sev | Command |
| --- | --- | --- | --- | --- | --- |
| SP1 | "if a distance is genuinely missing, it is added to `space`, not typed inline" | values on the scale (4/8/12/16/24/32) | Three invented distances: `gap: 2` (`StaffDetailPanels.jsx:25`), `marginTop: 1` (`Banner.jsx:57`, `app/(tabs)/profile.jsx:472`) | P3 | polish |

### Measures and frames

| # | Documented rule | Expected | Actual (file:line) | Sev | Command |
| --- | --- | --- | --- | --- | --- |
| M1 | "**The scroll node is the page, never the column.** … a screen whose scrolling is delegated to a child passes the measure to that child" | measure inside the scroller | The chat screen delegates scrolling to its message `FlatList` but keeps the measure on the `Screen` frame above it — no `colonna()` on the list: `app/chat/[agreementId].jsx:228` (`scroll={false}`) + `291-293` (`<FlatList style={{flex:1}}>`), `Screen.jsx:134-144` (`maxWidth` in the non-scroll branch). On web the list scrolls inside a 560 px box, so the scrollbar is on the column edge and the wheel over the gutters does nothing — the exact F14 defect the document says is closed | **P1** | layout |
| M2 | "**One header.** Every screen's title block is `PageHeader`" | PageHeader | Two full-screen surfaces draw their own: `app/+not-found.jsx:29-36` (`AppText variant="title"` + `marginTop: space.xl`), `AppErrorBoundary.jsx:53-60` (fallback title) | **P2** | polish |
| M3 | "the title, and **one** sentence that says what the screen holds" | — | The sentence is bolded as a ceiling but has no stated floor; 4 of 15 calls omit it: `login.jsx:80`, `(tabs)/profile.jsx:192`, `user/[id].jsx:60`, `chat/[agreementId].jsx:181`. A new screen cannot tell whether it is breaking the rule | **P2** | document |
| M4 | "If a screen needs a new value … the answer is a token … never a literal in the screen" | sizes are roles | Screens and components keep local dimension literals: `BELL_SIZE 56`, `BELL_PANEL_MAX_WIDTH 420`, `BELL_PANEL_HEIGHT_RATIO 0.7` (`agreements.jsx:87-93`), `minHeight: 50` in every button (`AppButton.jsx:77`), `minHeight: 48/96` (`AppInput.jsx:134-135`), `width: 56` and `maxWidth: 300` (`EmptyState.jsx:48,65`), `width: 64`, `maxWidth: 300` (`AuthShell.jsx:31,47`) | P3 | document |

### Type

| # | Documented rule | Expected | Actual (file:line) | Sev | Command |
| --- | --- | --- | --- | --- | --- |
| Y1 | "Prose never wears `caption`"; `label` is "a short label for prose that labels something" | field labels use `label` | The staff detail panel's field labels use `caption` — the role the document created precisely for this case: `StaffDetailPanels.jsx:26` ("Note", "Esito", …) | **P2** | typeset |
| Y2 | caption "belongs to pills and count lines only" | caption inside a pill | The unread status word is `caption` in accent, outside any pill: `NotificationRow.jsx:136,143` | P3 | typeset |
| Y3 | "Anything that is repeated chrome rather than the screen's own title (the wordmark … the avatar's initials) is **not a heading at all**" | no heading role, no depth | The demotion only clears the role; the depth still ships. `AuthShell.jsx:41` and `app/(tabs)/profile.jsx:247` pass `accessibilityRole="text"`, but `AppText.jsx:81-82` emits `aria-level={1}` from the variant regardless of the override | P3 | harden |

### Composition

| # | Documented rule | Expected | Actual (file:line) | Sev | Command |
| --- | --- | --- | --- | --- | --- |
| CP1 | "**One card anatomy.** … at most one trailing action" — and, twelve lines later, "**Trailing actions form a column.**" | one rule, not two | Both cannot hold. The code follows the column: two stacked actions in `AgreementCard.jsx:104-135` ("Apri chat" + "Annulla scambio"), three in `StaffUserCard.jsx:78-109` ("Rendi staff", status, "Sospendi"). The "at most one" clause is followed by nothing | **P2** | distill |
| CP2 | "Reversible actions may share a row; a destructive one keeps a row of its own by rule" | own row | In the proposal panel, "Rifiuta" (irreversible: the proposal is refused) shares one row with "Accetta", both `flex: 1`: `app/(tabs)/agreements.jsx:596-613` | **P2** | layout |
| CP3 | "**One empty state.** Icon when there is one, title, one sentence …" | EmptyState | Four surfaces render a bare sentence instead: `NotificationsSheet.jsx:107` (`INBOX_VUOTA`, one `<AppText>`), `StaffOperationsLog.jsx:100-102` ("Nessuna operazione registrata."), `ListSelector.jsx:192` and `CategorySelector.jsx:209` ("Nessun risultato.") | P3 | polish |

### States

| # | Documented rule | Expected | Actual (file:line) | Sev | Command |
| --- | --- | --- | --- | --- | --- |
| ST1 | "Every state is explicit … an error carries its own retry inside the message that failed" | retry in the failed message | The staff screen's paging error is bare danger text with no retry and no live region (`app/staff.jsx:454-458`, same in `StaffOperationsLog.jsx:158-162`); the home's paging error is a `Banner` whose retry is a *separate* secondary button 8 px below (`app/(tabs)/index.jsx:224-231`) — the exact composition the same screen calls a defect 50 lines earlier (`index.jsx:275-281`) | **P2** | harden |
| ST2 | "A loading surface announces itself through a **polite live region**" | announced | Two loading surfaces are a bare spinner with no text, no label and no live region: `app/(tabs)/offer-and-request.jsx:365-369` and `app/staff.jsx:447-451` | **P2** | harden |
| ST3 | single owner per surface (implied by "one X" everywhere) | one loading row | The loading row exists three times: `LoadingScreen.jsx:6-30`, `RigaCaricamento` (`app/(tabs)/agreements.jsx:97-113`), and a local copy in `NotificationsSheet.jsx:91-105` whose own comment explains that `RigaCaricamento` "belongs to the agreements screen". The document never names an owner, so nobody could have been wrong | P3 | distill |

### Refresh

| # | Documented rule | Expected | Actual (file:line) | Sev | Command |
| --- | --- | --- | --- | --- | --- |
| R1 | "Where to change what": "the web refresh control, and where it sits → `components/Screen.jsx`" | Screen owns the control | `Screen` only *publishes* the pair (`Screen.jsx:103-107` → `hooks/web-chrome.js`); the control is drawn by the bar (`WebNavMenu.jsx:344-375`). The document's own § Refresh says "the bar draws it", so the table contradicts the page it is on | **P2** | document |
| R2 | "a screen that owns a refresh shows it … a screen that has nothing to refresh publishes nothing" | a test for "owns" | Seven screens publish (`agreements`, `index`, `match`, `offer-and-request`, `profile`, `staff`, `staff-users`); `user/[id]` and `chat/[agreementId]` read from the server on focus and publish nothing. Nothing in the document says which of those is a defect | P3 | document |

### Where to change what

| # | Documented rule | Expected | Actual (file:line) | Sev | Command |
| --- | --- | --- | --- | --- | --- |
| W1 | "the card surface → `components/Card.jsx`" | Card owns the card surface | Two components build or override a card surface locally: `NotificationRow.jsx:167-177` overrides `Card`'s `radius.card` with `radius.input` and re-states the border, `UserServicesMiniCard.jsx:79-90` builds its own nested surface (`radius.input`, `t.background`) | **P2** | distill |
| W2 | the table is the owner list | a route to every visual job | Missing owners, all of them visually load-bearing: `AppButton.jsx` (the variant palette, `opacity.disabled`, `minHeight: 50`), `EmptyState.jsx`, `Banner.jsx` (the single error surface), `PillBar.jsx` and the other radio groups, `AppInput.jsx`/`DateField.jsx`, `WebNavMenu.jsx` (the bar's own look), `FocusRing.jsx` (the doc describes its rule but not its file), and the settings-row device `Banda`, which exists only inside `app/(tabs)/profile.jsx:440-462` | **P2** | document |
| W3 | (document format) | a `DESIGN.md` | No YAML frontmatter, no canonical sections (`Colour` not `Colors`, `Shape` not `Shapes`, `Type` not `Typography`, no `Elevation & Depth`, no `Components`, no `Do's and Don'ts`). `document.md`'s Step 1 scan would find the tokens and decline to treat this file as a system document | **P2** | document |

### Browser surfaces

| # | Documented rule | Expected | Actual (file:line) | Sev | Command |
| --- | --- | --- | --- | --- | --- |
| B1 | "the dialog container is **the one element excluded**" | one exclusion | The injected rule excludes *every* `[role="dialog"]`, including a dialog nested inside another (`FocusRing.jsx:43-44`). Correct today by coincidence (the only dialogs are `ModalShell`s), not by the rule | P3 | audit |

### Stale claims (document describes something no file has)

| # | Documented claim | Reality | Sev | Command |
| --- | --- | --- | --- | --- |
| D1 | "`accentBg` / `accentText` … the amber pair: **the token row** and the in-progress state" | There is no token row anywhere in the app. The pair survives only as a status chip (`QueueCard.jsx:23,28`) and `ToneChip`'s accent tone (`ToneChip.jsx:21`) | P3 | document |

---

## 3. Undocumented but real rules (the document is missing them)

These are behaviours the code repeats with conviction and the document never
states, so a new screen has no way to match them and no way to know it is
matching them:

1. **How a selected option looks.** `serviceBg` fill + `serviceText`/`primary`
   words + a **1 px `primary` border** — and *deliberately not* a filled accent,
   because "the accent stays with the screen" (`PillBar.jsx:66-80`,
   `ThemeSelector.jsx:44-58`, `agreements.jsx:327-370`). This is the most
   repeated visual decision in the app and the document's least covered one.
2. **Preexisting accent-as-text.** `tone="primary"` is the language for an inline
   command (`TextLink.jsx:41`) and for a short verb in a field (`FilterBar.jsx:377,
   417`). The accent rule only speaks about filled elements, so "Cerca" and
   "Azzera" sit outside its jurisdiction.
3. **A depth vocabulary.** `ombra` plus exactly three recipes — bar
   (`shadowOpacity 0.12`, radius 8, elevation 3), panel (`0.24`, 24, 8), floating
   bell (`0.28`, 12, 6) — each paired with a 1 px border so the shadow only says
   "above", never "thick" (`WebNavMenu.jsx:52-67`, `agreements.jsx:419-428`).
   There is no Elevation section and one is needed.
4. **The settings row.** `Banda`: full-width row, `space.lg/space.md` padding,
   `border` dividers, `minHeight: target.min` in row mode, 7 uses inside the
   profile (`profile.jsx:440-462`). The document says only "a settings row is not
   a card" — it never says what it is, or that it is a private component that
   should be shared.
5. **The chip anatomy.** `caption` inside a pill, `space.md`/`space.xs` padding,
   `radius.pill`, `alignSelf: 'flex-start'`, colour pair passed by the caller
   (`Card.jsx:20-38`, `ToneChip.jsx`). The document names "a category pill" as an
   accent exemption without ever describing the object.
6. **The pressed and disabled languages.** Press = `t.border` fill on a
   `secondary`/`ghost`/`danger` button or `opacity: 0.7` on a tappable row
   (`AppButton.jsx:44-49`, `ServiceCard.jsx:80`, `QueueCard.jsx:170`,
   `BackButton.jsx:26`); disabled = `opacity.disabled` 0.7, never a grey
   (`tokens.js:89`, used in 4 components). The document has no state-colour rule
   at all, and "pressed" is what a user feels 50 times a session.
7. **The web bar's measurements and what they cost the page.** Height 48,
   `space.lg` from the top and right corner, `fasciaPallinoMenuWeb` = 64 reserved
   below the band threshold (`tokens.js:104-132`, `WebNavMenu.jsx:23`,
   `Screen.jsx:190`), and the session banner's 320 px right padding
   (`app/_layout.jsx:80`). The document describes where the bar sits and the
   column's reserve, but not the bar's own size or the banner's padding.
8. **Focus-ring geometry.** 2 px `primary` outline with `outline-offset: 2px`,
   global, written as CSS from the token (`FocusRing.jsx:42-44`). The document
   says "it has its own rule" without stating it; the 2 px and the offset are the
   only part a new component could get wrong.
9. **Roving hover.** Hover fills with `t.background` (the page colour, not a new
   grey) and press fills with `t.border` (`WebNavMenu.jsx:352`, `AppButton.jsx:44`).
   Two greys, one meaning each, undocumented.

---

## 4. Rules nobody follows (candidates for deletion or rewrite)

| Rule | Evidence that it is not observed | Recommendation |
| --- | --- | --- |
| "**at most one trailing action**" (card anatomy) | `AgreementCard.jsx:104-135` ships two; `StaffUserCard.jsx:78-109` ships three. The following paragraph ("trailing actions form a column") describes what the code actually does and what its comments cite | Delete the clause; keep the column rule |
| "the **token row**" as a use of `accentBg/accentText` | No file renders a token/credit row; the credits figure is plain text (`app/(tabs)/match.jsx:211`). The pair is a status chip | Delete the phrase |
| "A screen with **no primary action has no filled accent**, and that is the rule working" | Unenforceable as written while a masthead disc (`AuthShell.jsx:34`) and a floating bell (`agreements.jsx:423`) are filled accents with no action behind them | Rewrite as "one accent per screen, and it is either the action or the mark — never both", then fix C1/C2 |
| "an error carries its own retry inside the message that failed" | True for load errors (9 sites) and false for the whole class of *action* and *paging* errors (`app/staff.jsx:421,454`, `app/(tabs)/index.jsx:224`, `app/chat/[agreementId].jsx:302`, `app/(tabs)/agreements.jsx:226`), where the retry is the next tap | Scope it: "a **load** error carries its retry inside the message; an action error is retried by repeating the action" |
| "Instructions belong in the empty state" | Followed by `EmptyState` callers, ignored by the four bare-sentence empties (CP3), which is where the instruction is most needed | Keep, but pair it with CP3's enforcement |

---

## 5. The document is doing its job (honoured, with proof)

These rules are true of the code today, repeatedly, including where it was
expensive to be true. This is why the verdict is "true with drift" and not
"materially stale":

| Rule | Proof |
| --- | --- |
| **No colour literal outside the tokens.** | `grep` for `#hex`/`rgb(`/`rgba(` across `components/`, `app/`, `hooks/` returns only `theme/tokens.js`. Zero exceptions |
| **No theme branching to pick a literal.** | The only `=== 'dark'` is inside the token selector (`tokens.js:172`); no component reads the theme scheme |
| **One radius vocabulary, zero literals.** | `grep` for `borderRadius:` not followed by `radius.` returns nothing across `components/` and `app/` |
| **border vs borderInput.** | Every control boundary picked `borderInput` (`AppInput.jsx:128`, `PillBar.jsx:75`, `ThemeSelector.jsx:51`, `AppCheckbox.jsx:54`, `DateField.jsx:75`, `ListSelector.jsx:113`, `agreements.jsx:331`), every decorative edge picked `border` (`Card.jsx:12`, `ModalShell.jsx:307`, `WebNavMenu.jsx:333`, band rule `PageHeader.jsx:125`) |
| **The scroll node is the page.** | 9 of 10 scrolling surfaces put `colonna()` inside the scroller (`Screen.jsx:147-151`, `ServicesSection.jsx:83`); only chat does not (M1) |
| **Touch floor.** | 32 of 33 pressables carry `target.min` in both dimensions, including the sentence-level link (`TextLink.jsx:35`) and both web-bar controls (`WebNavMenu.jsx:566-570`, with a comment naming this very paragraph) |
| **Six type roles, retired roles gone.** | `AppText.jsx:30-35` defines exactly six; no `display`/`subheading` call site remains |
| **Depth follows the role.** | `title → 1`, `heading → 2` defaults (`AppText.jsx:46`), and the only explicit overrides are the two documented cases (`PageHeader.jsx:133`, `ModalShell.jsx:321`) |
| **One header, with `indietro`.** | 15 `PageHeader` calls, 14 screens; no screen draws its own back row — `BackButton` always travels through the prop (chat 232, edit-profile 329, report 86, staff 364, staff-users 235, user/[id] 60) |
| **The band is one component and the maths is real.** | `PageHeader.jsx:99-124` derives the band from `layout.sogliaLarga` and `misura`; `Screen`'s `space.lg` padding makes the band land exactly `space.lg` from the window edge, i.e. on the bar's edge as the document claims. `banda={false}` only on the two centred auth screens |
| **Refresh has one owner chain.** | `Screen` publishes → `hooks/web-chrome` stores → `WebNavMenu` draws, focus-scoped, with cleanup (`Screen.jsx:103-107`); no screen composes a control of its own; no screen publishes with nothing to refresh; the control is `disabled` + spinning + `aria-busy` in flight (`WebNavMenu.jsx:361-373`) |
| **Every modal goes through ModalShell.** | `grep '<Modal'` across `components/` and `app/` returns one hit, inside `ModalShell.jsx:257` |
| **Nested dialog depth and Escape layering.** | `pilaAperta` gives the top panel the Escape (`ModalShell.jsx:199-205`); panel titles are `level={1}` |
| **One empty-state anatomy, no invented actions.** | 17 `EmptyState` calls; the component itself refuses to invent a CTA or an icon (`EmptyState.jsx:34,69-77`) |
| **Browser surfaces from the resolved theme.** | `useWebColorScheme.js:27` written from the stored preference, mounted once (`app/_layout.jsx:52`), with the reason `prefers-color-scheme` was wrong documented at the call site |
| **Focus ring is global and from the token.** | `FocusRing.jsx:42-44`: one `:focus-visible` rule re-written on theme change (same node, same id, `FocusRing.jsx:30-35`), plus the single documented exclusion |
| **Theme is three preferences, resolved once.** | `theme-store.js:8-13`, `theme-context.jsx:23-30`, `useThemeScheme` at the root |

---

## 6. If someone runs `/impeccable document` next

Order of work, cheapest first:

1. **`document`** — rewrite the file in the spec's shape: frontmatter carrying the
   `tokens.js` palettes (hex is already the canonical format), `rounded`, `spacing`,
   `layout` as a breakpoint-ish spacing entry, and the six type roles; canonical
   section names; then the rules that survive, unchanged. Add the nine missing
   owners to "Where to change what" and the nine rules from Section 3.
2. **`colorize`** — decide the accent law once (C1, C2) and write it as a Named
   Rule with the full list from C3.
3. **`layout`** — chat's scroll measure (M1), the bell's action row (CP2).
4. **`harden`** — operations-log touch floor (T1), the two silent spinners (ST2),
   the retry-less paging errors (ST1), the `aria-level` leftover (Y3).
5. **`shape`** — the two pressed-thing radii (S1), one track for radiogroups (S2),
   the borderInput glyph disc (C4).
6. **`polish`**, **`typeset`**, **`distill`** — M2, M4, SP1, CP3, Y1, Y2, ST3, CP1,
   W1.
