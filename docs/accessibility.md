# Accessibility rules: the app and its documents

Normative rules for digital accessibility in Baratto-lo. Companion to
[`ux.md`](ux.md): that file covers usability and the design process, this one
covers the part the law and the standards fix.

## Status and authority

Normative, same weight as `AGENTS.md` and [`ux.md`](ux.md). It MUST be read
before writing or changing any interactive UI, before a UX review, and before
shipping a document (PDF, report, slide deck) that the team delivers.

Implementation conventions for the same subjects (which prop, which component,
which token) live in [`frontend.md`](frontend.md); this file says what must
hold, not where the code goes.

## Why, and what legally binds us

The motive is not compliance. The code gives the function a body, but the form
is what lets that function be used for its purpose: the form it takes can never
be discriminating. Still, the frame exists and it is worth knowing:

| Source | What it establishes |
| --- | --- |
| Legge 9 gennaio 2004, n. 4 (Legge Stanca) | Definition of accessibility (art. 2); equality of access to digital services; accessibility requirements are a preference in public procurement, and public bodies cannot sign contracts for sites that do not meet them |
| Legge 3 marzo 2009, n. 18 | Italy ratifies the UN Convention on the Rights of Persons with Disabilities; art. 9 requires access to information and communication systems and technologies |
| DL 18 ottobre 2012, n. 179 (art. 9) | Amends Legge 4/2004, gives AgID its role, requires accessible documents and staff training |
| Direttiva (UE) 2016/2102, DLGS 106/2018 | Web and mobile applications of public bodies must be "perceivable, operable, understandable and robust"; the technical norm is EN 301 549; introduces accessibility statement, complaint procedure, monitoring |
| Direttiva (UE) 2019/882 — European Accessibility Act, DLGS 82/2022 | Moves the duty from the provider to the product/service; from June 2025 no inaccessible product may enter the EU market (in Italy already from 2022 for public bodies and for large companies) |
| UNI CEI EN 301 549 | The technical standard: functional accessibility requirements for ICT products and services |
| WCAG 2.1 / 2.2 (W3C, WAI) | The technical criteria; AgID states that WCAG 2.1 level AA equals points 9.1 to 9.4 of EN 301 549 |

**What applies to us.** Baratto-lo is a university project and a non-profit
platform: it is neither a public body nor a company above the EAA thresholds
(10 employees and 2 million turnover from June 2025; no micro-enterprises). No
obligation is triggered today. **We adopt WCAG 2.1 level AA as the target
anyway**, and 2.2 where it is free (target size, focus not obscured), because
the norm is the floor and the product is for the general public.

## The four requirements (POUR)

| Requirement | What it means | Where it lands in this project |
| --- | --- | --- |
| Perceivable | Content is presented in ways users can perceive: sufficient contrast, text alternatives, no information carried by colour alone | Tokens with documented contrast, `accessibilityLabel` on meaningful images, `ToneChip` carrying text |
| Operable | Interfaces work through a variety of inputs: touch, keyboard, switch, assistive devices | Targets at least 44 pt, focus visible on web, no keyboard trap, no gesture as the only way |
| Understandable | Information and operation are comprehensible: plain language, predictable behaviour, error prevention | Italian copy, one label per action, confirmation before irreversible actions |
| Robust | Content is reliably interpreted by a wide range of user agents, assistive technology included | Real semantic roles on the web build, live regions, standard components instead of custom drawings |

## Criteria that bind this app

Grouped by principle, only the level AA criteria that apply to a React Native
app with a web build. Column three is the mechanism; column four is the failure
signature.

| Criterion | Requirement | Mechanism | Fails when |
| --- | --- | --- | --- |
| 1.1.1 Non-text content | Meaningful images have a text alternative; decorative ones are hidden | `accessibilityLabel` on `<Image>`, `accessibilityElementsHidden` for decoration | An `<Image>` with no label; a label that repeats the caption |
| 1.3.1 Info and relationships | Roles and structure are exposed, not only drawn | `accessibilityRole` (`button`, `header`, `tab`, `tablist`, `link`, `checkbox`), real `Text` inside, no fake buttons made of `View` | A tappable `View` announced as plain text |
| 1.3.2 Meaningful sequence | Reading order matches visual order | DOM order on web, child order in native | Absolute positioning that changes the announced sequence |
| 1.4.1 Use of colour | Colour is never the only carrier of information | Text or icon next to the colour | A state readable only by chip colour; a link distinguished only by colour |
| 1.4.3 Contrast (minimum) | 4.5:1 for text, 3:1 for large text | Token pairs documented and checked in light and dark | A new colour added by hand instead of a token |
| 1.4.4 Resize text | Text scales to 200% without loss of content or function | Dynamic type honoured; no fixed height that clips | A 44 pt control with a fixed height and two lines of text inside |
| 1.4.11 Non-text contrast | 3:1 for the boundary that identifies a control | `borderInput` token rule (see `tokens.js`) | A control whose only boundary is a 1.1:1 line |
| 1.4.13 Content on hover or focus | Web-only: dismissible, hoverable, persistent | Panels open to the side, close on Escape or outside tap | A tooltip that disappears before it can be read |
| 2.1.1 Keyboard | Web build fully operable from the keyboard | `Pressable` mapped to focusable elements, no `onPress` on `View` | An action reachable only by touch |
| 2.1.2 No keyboard trap | Focus can always leave | Modals restore focus to the trigger on close | A modal that swallows Tab |
| 2.2.1 Timing adjustable | Session expiry is announced and extendable | `SessionExpiryBanner` warns before the session drops | A silent logout in the middle of a form |
| 2.4.3 Focus order | Focus follows a meaningful order | DOM order, trigger before the panel it opens | Focus jumping to the top on every filter change |
| 2.4.7 Focus visible | Focus indicator always visible | `FocusRing` injects a 2 px token-coloured `:focus-visible` outline | A custom outline removed for looks |
| 2.5.5 / 2.5.8 Target size | At least 44 pt here (project rule, stricter than the 24 CSS px minimum) | `target.min` from the tokens | An icon button at 20 pt with no `hitSlop` |
| 3.1.1 Language of page | The page declares Italian | `lang="it"` on the web shell | A browser reading Italian copy with an English voice |
| 3.2.3 Consistent navigation | The same navigation in the same place | Fixed five-tab structure (`navigation/tab-routes.js`) | A tab that moves or renames between screens |
| 3.2.4 Consistent identification | The same action has the same label | One vocabulary in the copy: "Invia", "Accetta", "Rifiuta", "Segnala" | "Salva" in one form and "Conferma" in another for the same act |
| 3.3.1 Error identification | Errors are described in text | `src/validation/` returns the first specific Italian message | A red border alone |
| 3.3.2 Labels or instructions | Every field has a visible label, not a placeholder | `AppInput` label prop | A field identified only by placeholder |
| 3.3.3 Error suggestion | The message says how to fix it | Validation messages name the rule | "Campo non valido" |
| 3.3.4 Error prevention | Irreversible actions are confirmed or reversible | Confirmation sheet before accepting an agreement, deleting an entry, sending a report | Accepting an agreement on a single tap |
| 4.1.2 Name, role, value | Assistive technology gets all three | `accessibilityRole` + `accessibilityLabel` + `accessibilityState` | A toggle announced with no on/off state |
| 4.1.3 Status messages | Async results are announced without moving focus | `accessibilityLiveRegion="polite"` | A save that succeeds silently |

## Assistive technology we test with

At least one pass per screen, on the real build:

- **VoiceOver** on iOS (Expo Go on a physical device) and **TalkBack** on
  Android: swipe through the screen and listen for the reading order.
- **Keyboard only** on the web build: Tab through the whole screen, Escape from
  every panel, no trap, focus always visible.
- **Text at 200%**: system font scale at maximum, no clipped label, no control
  collapsed.
- **Reduced motion** on: animations settle instead of moving.
- **Both themes** at every check: light and dark are separate contrast cases.

## Content rules (app and documents)

The same rules govern UI copy, documentation and any PDF the team delivers.

- Text: short and clear, inverted pyramid (conclusion first), short sentences
  (under 25 words), paragraphs of at most three sentences, double line spacing
  where a text is long, left-aligned with a ragged right edge, bold used often,
  underline reserved for links, styles applied in the right sequence.
- Links and buttons: the user must be able to predict where the action leads
  before activating it. Never "clicca qui", never a raw URL as the label; the
  label names the destination. In the app the same rule applies to buttons:
  "Accetta l'accordo", not "OK".
- Lists: use real lists for enumerations, never dashes or numbers typed at the
  start of a line.
- Tables: only to represent data, never to lay out content; always a header row,
  a title and a description. In a PDF, build the table in the editor and export
  it, do not paste a table into a body field.
- Images: never an image without a text alternative. The alt text must still
  make sense if the image is gone; it is short and translates the
  communicative sense, not the pixels ("sportivo che corre" describes the
  picture; the product name, the shoe model and the surface belong to the alt
  only if that is what the sentence needs to convey). Decorative images are
  hidden from screen readers explicitly, not left unlabelled.
- Pasted content: never paste text from Word or LibreOffice into a body field;
  paste through a plain-text editor and format again with the editor's styles.
- Copy language: Italian for everything the user reads, English for code.

## Verification procedure

Per screen, in this order, recording pass or fail per step.

1. Read every label aloud as if the control were not there: does it still say
   what it does? Pass if the answer is yes for all of them.
2. Walk the screen with VoiceOver, then TalkBack: order matches the visual
   order, every control announces role and state, decorative elements are
   silent.
3. Keyboard-only on the web build: reach every action, visible focus on each
   stop, Escape closes every panel, focus returns to the trigger.
4. Set the system font scale to maximum: no truncation, no overlap, no control
   below 44 pt after scaling.
5. Toggle reduced motion and both themes.
6. Check contrast for every text and control pair introduced or changed: 4.5:1
   text, 3:1 large text and control boundaries. Report the computed value next
   to the token, as `tokens.js` already does.
7. Force the four states (loading, empty, error, not available) and repeat
   steps 2 to 5 on the error state, which is the one usually skipped.

## Non-web documents (appendix)

Applies to every PDF, report and slide deck the team delivers. Not part of the
app.

For a PDF to be accessible: it must be real text, not an image of text; the
structure must be tagged (headings, subheadings, lists); the reading order must
be clear; every graphic element, link and form field needs a text alternative;
navigation aids must exist beyond links (headers, table descriptions); the
document must be qualified with title and description; fonts must allow the
conversion of characters into text.

Workflow: build the original document accessibly, verify its accessibility,
convert to PDF, only then publish.

| Aspect | Rule |
| --- | --- |
| Format | PDF/A (`a` level carries the document structure, `u` level guarantees Unicode mapping) when the document is meant to be archived |
| Styles | Use the editor's styles in the right sequence (h1, h2, h3, then paragraphs); never simulate headings with bold text or spacing |
| Language | Set the document language to Italian; fill title, description and keywords |
| Alignment | Always ragged right; never align with the space bar (use tabulation) |
| Font | Sans-serif, real text, sizes from the styles |
| Images and charts | Alt text always, caption when useful, charts simple and never the only source of the information; never rely on colours alone |
| Tables | Simple, no nesting, data only, header row on the first row |
| Links | The link text names the destination, never a raw URL, never "clicca qui", never an image used as a link |
| Verification | Check online with MAUVE, or locally with PAVE / PAC 2024 / Acrobat Pro |

## Checklist

Run with the [`ux.md`](ux.md) checklist before a UI change is called done.

- [ ] Every interactive element announces role, label and state.
- [ ] Every meaningful image has an alt text; decorative ones are hidden.
- [ ] Reading order equals visual order, verified with a screen reader.
- [ ] Web build operable from the keyboard, focus always visible, no trap.
- [ ] Text at 200% does not clip or overlap.
- [ ] Contrast: 4.5:1 text, 3:1 large text and control boundaries, both themes.
- [ ] No information carried by colour alone.
- [ ] Targets at least 44 pt.
- [ ] Async results announced; session expiry warned and extendable.
- [ ] Irreversible actions confirmed.
- [ ] Error messages name the cause and the fix.
- [ ] Delivered documents: real text, tags, alt texts, header rows, Italian
      language set, verified with MAUVE or PAC.

## Status of the app against these rules

Audited on **2026-11-10** against the running app (Chromium through Playwright,
dev server on port 8081, API on 8000, viewports 390×844 and 1440×900, light and
dark, keyboard walk, 200% reflow, 401 forced with `page.route`) and by reading
`Frontend/src`. Every status below is counted in
[`audits/ux-audit-2026-11-10.md`](audits/ux-audit-2026-11-10.md); the finding
ids are the evidence. Accessibility scored 2.8/10 on that rubric (2 severity-3,
8 severity-2, 1 severity-1 finding). This is not a conformance claim: VoiceOver,
TalkBack and native dynamic type were not exercised (no device in the session).

| Criterion | Status |
| --- | --- |
| 1.1.1, 4.1.2 Roles and labels | Partial: buttons, toggles, tabs, radios, selectors and both images carry role, label and state (verified in the accessibility tree), and there are no fake buttons. **Form fields do not**: `AppInput` never gives its `TextInput` an accessible name and never links its error (`AppInput.jsx:31-70`, F14, verified in the DOM). Decorative `Ionicons` are not explicitly hidden (F22, deduced). Screen titles are not headings and the card collections are not lists (F19) |
| 1.4.3, 1.4.11 Contrast | Holds except one pair: every text and boundary pair was recomputed from the tokens in both themes and passes (`borderInput` 3.62/3.36 light, 3.35/3.77 dark; body text 16.05/13.97), but `onPrimary` on `primaryPressed` in the dark theme is **4.46:1** (`tokens.js:53`, F18). The disabled primary button sits at 1.66:1, exempt under the inactive-component exception but used as the app's way of saying "not available" (F24) |
| 2.4.7 Focus visible | Holds: `FocusRing` injects the 2 px token outline globally; measured `outline: solid 1.6px rgb(31,107,78)` on every stop of the home keyboard walk, and no component removes it |
| 2.5.5, 2.5.8 Target size | **Does not hold** against the project's 44 pt rule: pills 34 pt, checkbox row 30 pt, icon-only "✕" 34 pt, detail close pill 38 pt (F17). All are still above the 24 CSS px AA minimum of 2.5.8 |
| 4.1.3 Status messages | Partial: the `Banner` is a real `aria-live="polite"` region on the web build (measured), so API errors and confirmations are announced. Not announced: the catalog count after a filter change and the appended page (F21), and the inline field errors, which are neither announced nor linked to their input (F14) |
| 1.4.4 Resize text | Partial on the web build: at 200% there is no clipping, no overlap and no horizontal overflow (measured at a 195×422 CSS viewport), and no `maxFontSizeMultiplier` cap exists. Open on native: three text containers use a fixed `height` instead of `minHeight` and would clip under dynamic type (`WebNavMenu.jsx:444-445`, `agreements.jsx:344-345,415-416`, F23) — not exercised on a device |
| 2.1.1, 2.1.2, 2.4.3 Keyboard and focus order | Partial, now walked: Tab reaches every action in visual order, focus is visible on every stop, and focus is trapped once inside a dialog. **Escape closes nothing** except `WebNavMenu` (F15); focus is **not moved into** a dialog on open and the full-screen backdrop is an announced button mid-sequence (F16). Focus return to the trigger was verified on the service detail only |
| 3.1.1 Language of page | **Does not hold**: no `lang` anywhere — `app.json` has no `web.lang`, no `+html` template exists, `document.documentElement.lang` is never set (F20) |
| Automated check | Gap: no linter or test asserts these rules; conformance rests on the manual procedure above |
