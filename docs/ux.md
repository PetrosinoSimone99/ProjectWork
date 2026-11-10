# UX rules: usability, heuristics, design process

Normative rules for designing, reviewing and testing the experience of
Baratto-lo. Written from the UX and accessibility course material (September
and October 2026 sessions: usability, usable interfaces, digital
accessibility), reduced to what binds this repository.

## Status and authority

This file is **normative**, like `AGENTS.md`: `MUST`, `MUST NOT` and `SHOULD`
mean what they usually mean. It is not advice, and it is not optional when a
design skill is loaded.

**When it MUST be read:**

- before designing or redesigning a screen, a flow or a component;
- before loading `impeccable`, `design-taste-frontend` or any other visual
  skill (see precedence below);
- before reviewing UI quality, before a usability test, and before declaring a
  UI task done;
- before changing `src/theme/tokens.js`, copy or navigation.

**Precedence when rules disagree:**

1. `AGENTS.md` (workflow and file scope).
2. This file, [`accessibility.md`](accessibility.md) and
   [`frontend.md`](frontend.md).
3. Design skills (`impeccable`, `design-taste-frontend`) and any taste advice.

A skill never overrides the project. `design-taste-frontend` targets marketing
and landing pages: Baratto-lo has no such surface today, so of that skill only
the browser inspection loop is usable here. `impeccable` is useful for craft
(hierarchy, motion, states), not for changing the design language: colours,
spacing and radii come from the tokens.

**Not covered here:** component and hook conventions (`frontend.md`), data
shapes (`api.md`), accessibility conformance (`accessibility.md`).

## Definitions we adopt

**Usability (ISO 9241-11)** — the effectiveness, efficiency and satisfaction
with which given users reach given goals in a given context of use. It is a
measurable property of the interaction, not an aesthetic judgement.

**Usability (AgID, digital)** — how easily and satisfactorily users relate to
an interface. The more the analysis behind the design matches the expectations
of the person using the system, the more usable it is.

**Accessibility** — the ability of computer systems to deliver services and
information usable without discrimination, including by people who need
assistive technology or particular configurations (Legge 4/2004, art. 2).

**Utility is not usability.** A system that can do what the user needs but
cannot be reached through its own interface is a failed system, and so is one
that is easy to use but does the wrong thing. Both hold at the same time.

**UX is a circular process**, not a phase: needs analysis, behaviour study,
prototyping, development, testing, and back to analysis.

**We do not design "accessible" for disabled people only.** We build better
products, so that anyone — including people with disabilities — can use them
correctly and with satisfaction. The law is the floor, not the aim.

## Six principles of an effective interface

Every screen is reviewed against these six. The third column is the failure
signature to look for during review.

| Principle | What it means in Baratto-lo | Fails when |
| --- | --- | --- |
| Clarity | The user understands at first glance where they are, what they can do, what to tap. Clarity is a form of respect. | A screen needs a sentence of explanation to be understood; two actions look equally primary |
| Consistency | Visual and behavioural patterns repeat across the five tabs: same chip for the same state, same confirm sheet for the same irreversible action, same empty state shape. | The same concept is drawn two ways; a control behaves differently in two screens |
| Feedback | Every user action produces a visible answer within a frame. A system that does not communicate is read as broken. | A tap leaves the screen unchanged; a save completes silently; a failure looks like a slow load |
| Visual hierarchy | Not all elements are equal. Layout, colour, size and spacing guide the eye to the next action. | Everything is bold; the primary action competes with three secondary ones |
| Accessibility | Usable regardless of visual, motor or cognitive ability, at 200% text size, with a screen reader, from the keyboard. | See [`accessibility.md`](accessibility.md) |
| Efficiency | The goal is reached in the fewest steps that keep the user in control. | A flow asks for data already known; a filter resets on every return |

## The ten heuristics of Nielsen, applied

The heuristic evaluation is done by walking each screen and answering the
"how we verify" column. An uncovered heuristic on a changed screen is a
finding, not a matter of taste.

| # | Heuristic | Baratto-lo requirement | How we verify |
| --- | --- | --- | --- |
| 1 | Visibility of system status | The app always says what it is doing: loading, saving, sent, expired session, count of results, which filter is active. | Every async action shows an in-frame state; a slow network (throttled) never leaves a dead screen |
| 2 | Match between system and the real world | Product language is Italian and from the exchange domain ("offerta", "richiesta", "accordo", "segnalazione"), never internal names or endpoint words. | Copy review: no identifier, no field name, no English, no jargon in UI text |
| 3 | User control and freedom | Every flow has a way back that does not destroy work: cancel, close, dismiss on backdrop, undo where the platform allows it. | Each modal and each form has an exit; no flow traps the user with no way out before the last step |
| 4 | Consistency and standards | Platform conventions first (tabs, back gesture, pull to refresh, keyboard handling), then project conventions (tokens, chip tones, `Banner` for errors). | Same action, same label and same place across screens; nothing invented per screen |
| 5 | Error prevention | Constraints before messages: disabled submit until valid, confirm before irreversible actions (accept an agreement, delete an entry, send a report), no free-text where a list exists. | The happy path cannot produce an invalid request; irreversible actions have a confirmation step |
| 6 | Recognition rather than recall | Choices are visible, not remembered: labels on tabs, active filter chip visible, categories shown as chips, no codes to type. | No step requires remembering a value from a previous screen |
| 7 | Flexibility and efficiency of use | The frequent path is short: the catalog opens on the relevant default, filters are one tap, the staff list is searchable rather than scrolled. | Count the taps for the two most frequent tasks; a frequent task takes more than three taps only with a reason |
| 8 | Aesthetic and minimalist design | One primary action per screen, no decoration that carries information, no text explaining the interface instead of labelling it. | Every element earns its place: remove it and the task still works? Then it goes |
| 9 | Help users recognise, diagnose and recover from errors | Errors say what happened and what to do next, in Italian, without codes; the retry repeats the failed request as it was. | Force each error state (invented temporary failure is not allowed: a debug-only branch); the message names the next action |
| 10 | Help and documentation | Where the model is not obvious (what an agreement implies, what a token/credit means, what staff can see), a short inline explanation exists at the point of doubt. | Every non-obvious rule has its line of copy on the screen that needs it, not in a separate help page |

## Dark patterns: refused by design

A dark pattern is an interface built to mislead the user about the meaning of
their own actions. The key is intention: it is not a design mistake, it is a
choice made to maximise a metric (sign-ups, sales, retention) at the expense of
the user. Since 17 February 2024, article 25 of the European Digital Services
Act explicitly forbids them on online interfaces.

Baratto-lo has no conversion metric to defend, so no dark pattern is ever an
acceptable trade-off: it is a defect. The patterns to refuse, named:

- **Confirmshaming** — copy that makes declining feel shameful ("No, preferisco
  non trovare scambi").
- **Roach motel** — easy to enter, hard to leave (delete account, leave an
  agreement, unsubscribe from notifications).
- **Forced action** — access to a feature conditioned on an unrelated action.
- **Preselected consent** — optional data sharing or notifications already on.
- **Hidden costs or conditions** — anything material revealed on the last step.
- **False urgency** — invented deadlines or scarcity; a real deadline is stated
  once, in plain words.
- **Nagging** — repeated prompts for the same thing after a clear refusal.
- **Privacy zuckering** — asking for data the feature does not need.

## Measuring usability

Three dimensions, all three measured in a test (see below):

- **Effectiveness** — the degree to which the person completes the operations
  correctly and completely. Measure: task success rate.
- **Efficiency** — the resources spent to reach the goal. Measure: time on
  task, number of wrong turns.
- **Subjective satisfaction** — the hardest and the most decisive: a system can
  work well and still be unpleasant. Includes aesthetics and relational
  quality. Measure: a single ease question (1-7) plus the quotes.

The seven usability factors become review questions, one line each:
intuitivity of the design (is the structure self-evident?), ease of learning
(can a first-timer do the basics?), efficiency of use (fast once familiar?),
memorability (usable after a month away?), error frequency and severity (how
often and how badly?), subjective satisfaction (effort or pleasure?).

## The four phases, applied here

1. **Research and analysis.** Personas, empathy map, journey map, interviews.
   In this repository the input is
   `Context_and_DB_V2/new_user_stories_v2.md`; the artefacts of a feature live
   in `docs/briefs/<feature>/` and MUST name the user they serve (offerer,
   requester, staff) before the first wireframe.
2. **Information architecture.** Sitemap and user flow before screens. The
   five tabs are fixed (`navigation/tab-routes.js`); a new surface is a
   decision, not a screen added on the way.
3. **Prototyping.** Paper sketch, then wireframe in the brief, then the real
   screen with tokens. A wireframe is judged on weight and placement, never on
   colour.
4. **Test and validation.** Usability test (below). An A/B test only when there
   is a real question about a variant, never about taste. Heatmaps and
   click-tracking are **out of scope**: the app ships no analytics, so visual
   analytics cannot be cited as a source.

## Usability test protocol

Repeatable, cheap, and run before a screen is declared done.

| Step | Rule |
| --- | --- |
| When | From the prototype stage, on any new flow, and after a large change to an existing one |
| Participants | 3 to 5 per round, never a team member, chosen from the users of that flow |
| Objective | One sentence, written before the test ("capire se un utente trova e apre il dettaglio di un'offerta") |
| Tasks | Each task states the start, the goal and the success criterion; no task names the control to use |
| Execution | Think-aloud, moderator silent, no help for the first 30 seconds, hesitation noted with a timestamp |
| Analysis | Per task: success/failure, time, errors with severity 1 (cosmetic) to 4 (blocker), and the quote that explains it |
| Report | `docs/briefs/<feature>/usability-<date>.md`: objective, participants, tasks, results, severity list, decisions taken |
| Follow-through | A severity 3 or 4 finding blocks the release of that screen until fixed or explicitly accepted in `decisions.md` |

## Review checklist

Run before calling a UI change done. A screen or component change states in its
commit which lines were checked, and lists the ones that fail as known gaps.

- [ ] One primary action on the screen; secondary actions are visibly secondary.
- [ ] Loading, empty, error and not-available states exist and are distinct.
- [ ] Every async action gives feedback in the frame where it happened.
- [ ] The active filter, the current tab and the current section are visible at a glance.
- [ ] Every label and every message is Italian, specific, and says what to do next.
- [ ] No irreversible action without a confirmation step.
- [ ] Every exit exists: cancel, close, back, dismiss.
- [ ] The two most frequent tasks take the fewest taps the flow allows.
- [ ] Nothing in the screen needs a remembered value from a previous screen.
- [ ] No element is there for decoration only.
- [ ] No dark pattern from the list above.
- [ ] Contrast, labels, target size, keyboard and 200% text pass: see
      [`accessibility.md`](accessibility.md) checklist.

## Status of the app against these rules

Audited on **2026-11-10** against the running app (browser walk on web, both
viewports and both themes) and by reading `Frontend/src`, then **re-measured on
the same day after the remediation**: every claim below is counted in
[`audits/ux-audit-2026-11-10.md`](audits/ux-audit-2026-11-10.md) (the baseline,
3.6/10) and in
[`audits/ux-remediation-2026-11-10.md`](audits/ux-remediation-2026-11-10.md)
(the second reading, 9.9/10), where the finding ids are the evidence. The
re-measurement is a code reading with the gate green and, for anything that needs
a running screen, it says so instead of claiming it.

| Rule | Status |
| --- | --- |
| Explicit loading, empty, error and not-available states | Holds: `LoadingScreen`, `EmptyState` with its three variants, `Banner` + "Riprova", and the "not available" copy are present and distinct on every data screen, and the two exceptions the first audit found are closed: the operations log says why it is unavailable and offers a retry (`staff.jsx`), and "SERVIZI · N di M" comes from the pagination payload (`ServicesSection.jsx`, F32, F34) |
| One place per state vocabulary (chip tones) | Holds: `ToneChip` maps semantic tones; state is carried by text, not colour alone. The account state has one name and one verb pair — "Sospeso", "Sospendi"/"Riattiva" — and "Esamina e chiudi" replaced the "Chiudi" that opened a review (F31) |
| Tokens only, no hard-coded colours in components | Holds: no hex or `rgba()` literal outside `src/theme/tokens.js`, and the four `borderRadius: 999` plus the off-scale spacing literals now use `radius.pill` and `space.*` (F39) |
| Touch target at least 44 pt | Holds: pills, the checkbox row, the icon-only buttons and the modal close are all `target.min` (`PillBar.jsx`, `AppCheckbox.jsx`, `FilterBar.jsx`, `EntryEditor.jsx`, `ModalShell.jsx`, F17). Not re-measured with a finger on a device: the rule is satisfied in code |
| Screen-reader labels on every interactive element | Holds in code: `AppInput` forwards its visible label, links the error with `nativeID`/`aria-describedby` and marks the field invalid (F14); everything else already carried role, label and state. The assistive-technology pass that would confirm the announcement is still not run (accessibility.md §Status) |
| Feedback on async changes | Holds for the actions the audit named: one polite live region carries the catalog count and each appended page (F21), accept/refuse/cancel on the agreements tab end with a success banner (F43), and a profile save confirms itself on return (F35). What a screen reader actually says is unverified |
| Error states can be forced for review | Holds now, for everything except the four states that need invented data: 401 can be forced with `page.route` or a forged token, errors with a route answering 500, and both were walked. A debug-only branch is still absent by design |
| Two most frequent tasks measured in taps | Measured: open a service and send a proposal is 2 taps natively (3 from another tab, 4 on web where the tabs are behind the menu); create an offer is 5 taps, 6-7 on web, of which 2 are the category modal that now has the same search field as `ListSelector` (F41). Both counts are at the floor or justified |
| Usability test protocol executed | Gap: no test has been run yet, no personas artefact exists; the review above is an expert heuristic evaluation, not a test with users |
| Wireframe stage before code | Gap: briefs exist for two features, but no wireframe stage is recorded |
