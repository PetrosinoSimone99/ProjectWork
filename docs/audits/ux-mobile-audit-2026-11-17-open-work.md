# Mobile audit — what is left, and the `/ship` prompt to close it

Companion to [`ux-mobile-audit-2026-11-17.md`](ux-mobile-audit-2026-11-17.md).
That file is the record of the audit; this one is the worklist a fix cycle can
pick up, plus the prompt to hand it.

Provenance: audit measured on `30ab4cf` and committed in `8470a64`; written here
at `1a3cf92`, tree clean, `andrea-frontend`. Read the audit's §"Corrections —
after review" before touching any number below: two findings of the original nine
are gone (F6 withdrawn, F8 closed by `7b5d016`), and the remaining ones were
measured on a bundle that predates 18 commits.

---

## 1. What is actually left

| id | sev | effort | where | done when |
| --- | --- | --- | --- | --- |
| **F4** | 3 | M | `Frontend/src/components/AgreementSheet.jsx:16` (`FORMATO='AAAA-MM-GG'`), `:134`/`:137` (`Inizio`), `:142`/`:145` (`Fine`) | Tapping a date opens a native picker; display is `GG/MM/AAAA`; the wire still carries ISO `YYYY-MM-DD`; `periodoValido` ("end after start") still rejects; web has a real fallback, not a silent no-op |
| **F2** | 2 | S | `Frontend/src/components/WebNavMenu.jsx:563` (`styles.controllo`), label collapses under 380 px (`:126`) | The `Aggiorna` control is ≥44×44 in both states; nothing else in the bar moves |
| **F1** | 2 | S | `Frontend/src/app/edit-profile.jsx:335` (the two `flex: 1` field wrappers) | At 320 px the Nome/Cognome inputs stay inside the viewport; at 375+ nothing changes |
| **F9** | 2 | S | `Frontend/src/components/EntryCard.jsx:125-148` (the `Modifica` / `azioneStato` row) | At 320 px both labels are complete; the row keeps ≥44 pt targets |
| **F7** | 1 | S | `Frontend/src/components/StaffAreaGate.jsx:29-37` | The locked staff panel offers exactly one way back |
| **F5** | 2 | M | not frontend: `docs/backend-gaps.md` (new **G27**) | The gap is written down as a backend proposal, with what the inbox cannot do until it lands |
| **F3** | 1 | — | — | no action: an inline text link inside a sentence, exempt by HIG |

Not in this cycle, on purpose: F6 (withdrawn), F8 (closed), and the catalog demo
seed, which is not a frontend defect.

## 2. The re-measure gate (do this first, in the plan's first lane)

F1, F2, F9 and F7 were measured on the static export that predates
`667815a fix: stop truncating button labels at 200% text` (the `dist` still on
disk is from 16:26; the fix landed at 19:18). That commit
removed `numberOfLines={1}` from `AppButton` and made the pill grow on
`minHeight`, so **F9's truncated `Modifica`/`Sospendi` may already be gone** and
F2's control geometry may have shifted. `WebNavMenu.jsx`, `edit-profile.jsx`,
`EntryCard.jsx` and `StaffAreaGate.jsx` themselves are untouched since the audit;
`AgreementSheet.jsx` only got the confirm label in `b71534b`.

Rule for the cycle: **re-measure, then decide.** A finding that no longer
reproduces is *withdrawn in the audit doc with the number that proves it*, never
"fixed" into a change nobody can attribute.

Recipe:

```bash
cd Frontend && npx expo export --platform web        # kill :8083 first: it serves a pre-fix bundle
npx expo serve dist --port 8083
node ../docs/audits/scripts/audit-mobile-360.js      # add --full for the modal states
```

Three traps that cost a full cycle last time:

1. Screenshots are **1179×1980 device px = 393×660 CSS at DPR 3**. Divide by 3
   before comparing a pixel with a CSS length. The card-height fiasco (F6) was
   exactly this.
2. Playwright's `iPhone 14 Pro` viewport is **660** px tall (852 is the screen),
   and `iPhone SE` is **320** px, not 375. 375 was driven separately.
3. `fullPage: true` lies about `position: fixed` chrome, and the dev backend
   answers in 2–4 s per call, so a fixed wait measures the loading state.

## 3. One prompt or several? One prompt, two lanes

Recommendation: **one `/ship` prompt**, two lanes, and F5 as a docs step of the
same cycle. Reasons, in order of weight:

- The four remaining fixes touch **five disjoint files** (`edit-profile.jsx`,
  `WebNavMenu.jsx`, `EntryCard.jsx`, `StaffAreaGate.jsx`, `AgreementSheet.jsx`)
  for a total that is realistically under 40 lines. No lane can invalidate
  another, so parallel work is genuinely safe.
- The expensive part of this cycle is not the edits: it is the export, the
  backend, the harness run and the gate. Splitting into four prompts pays that
  cost four times.
- One cycle = one changelog entry = one commit per logical change. Four separate
  cycles would leave four half-documented sessions for the same audit.
- F5 must **not** be a fix. It is a backend gap; as a standalone prompt it would
  invite an agent to invent a frontend workaround for missing data. Pinned as a
  docs step it cannot drift.
- The one thing that does deserve isolation is **F4**: it is the only copy/UX
  decision in the list (which picker, which format, what web does instead) and
  the only one that can corrupt data if it swaps day and month. It gets its own
  lane, its own tests, and is committed before the sweep.

The alternative — four prompts, one per finding — is defensible only if Andrea
wants four separate review points. It buys nothing else.

## 4. The `/ship` prompt (paste as-is, attach this file)

```
/ship Chiudi il residuo dell'audit mobile 360. Il file allegato
`docs/audits/ux-mobile-audit-2026-11-17-open-work.md` è la lista di lavoro; il
record con le prove è `docs/audits/ux-mobile-audit-2026-11-17.md`, di cui va
letto prima §"Corrections — after review".

Contesto già stabilito, non ri-verificarlo da zero: HEAD è 1a3cf92 su
`andrea-frontend`, tree pulito. F6 è ritirato e F8 è chiuso da 7b5d016: non
riaprirli, non "sistemarli". F3 non ha azione. Il resto è la lista.

Stile: ponytail. Sono quattro fix piccoli e una voce di documentazione, non un
redesign: nessuna schermata va ridisegnata, nessun componente va rinomizzato in
massa, nessuna dipendenza va aggiunta (per F4 `@expo/ui@58.0.28` è già
installato ed espone `./community/datetime-picker`; su web si usa un
`input[type=date]` dietro `Platform.OS === 'web'`).

Ordine imposto:

1. Gate di rimisura, prima di qualsiasi modifica. F1/F2/F7/F9 sono state misurate
   su un export precedente a 667815a, che ha tolto `numberOfLines` da
   `AppButton`: alcune potrebbero non riprodursi. Riesporta (uccidi prima :8083,
   che serve un bundle pre-fix), rilancia
   `docs/audits/scripts/audit-mobile-360.js` e riporta quali sopravvivono. Una
   che non si riproduce si ritira nel documento con il numero che lo prova: non
   si "aggiusta".
2. Lane A — F4, da sola: picker nativo, display `GG/MM/AAAA`, wire ISO
   `YYYY-MM-DD`, `periodoValido` intatto, fallback web vero. Test sul confine
   (la data che entra e la stringa che parte), non sull'aspetto.
3. Lane B — F1, F2, F7, F9: quattro file disgiunti, quattro cambi minimi.
4. F5: una voce nuova in `docs/backend-gaps.md` (l'ultima è G26). Descrive cosa
   il payload non porta e cosa l'inbox non può fare finché non arriva. Nessuna
   riga di frontend.

Vincoli: `Frontend/**` e `docs/**`; `Backend/**` è in sola lettura tranne i file
Docker, e qui non serve. Nessuna credenziale scritta in chiaro fuori da
`docs/setup.md`. Commenti in inglese struttura / italiano contratto (D026). Ogni
UI state resta esplicito (loading, empty, error). Niente emoji, niente footer di
attribuzione AI.

Gate prima di ogni push: `cd Frontend && npx expo lint && npx tsc --noEmit &&
npx jest`. Se rosso non si pusha e non si indeboliscono le asserzioni. Il gate
verde non è type safety: `allowJs` senza `checkJs`.

Commit: uno per cambio logico, Conventional Commits, inglese, corpo solo se c'è
una decisione vera. Il documento dell'audit e `docs/changelog.md` si aggiornano
nello stesso commit del fix che li rende veri.

Alla fine riporta: cosa è stato chiuso, cosa è stato ritirato con il numero,
cosa resta aperto e perché.
```

## 5. Lanes

- **lane-0 (gate, read-only)** — fresh export, harness run, per-finding verdict
  (survives / withdrawn with the measured number). No code writes.
- **lane-A (writer)** — `Frontend/src/components/AgreementSheet.jsx`,
  `Frontend/src/components/AppInput.jsx` (only if it needs an `inputMode` pass-
  through), a possible new `Frontend/src/components/DateField.jsx`,
  `Frontend/src/services/dates.js`, plus tests under
  `Frontend/src/components/__tests__/`.
- **lane-B (writer)** — `Frontend/src/app/edit-profile.jsx`,
  `Frontend/src/components/WebNavMenu.jsx`,
  `Frontend/src/components/EntryCard.jsx`,
  `Frontend/src/components/StaffAreaGate.jsx`, plus their tests.
- **shared (integration lane, last)** — `docs/audits/ux-mobile-audit-2026-11-17.md`
  (verdicts + any withdrawal), `docs/audits/ux-mobile-audit-2026-11-17-open-work.md`
  (this file, marked done or deleted), `docs/changelog.md`, `docs/backend-gaps.md`
  (G27). Never edited concurrently with a writer lane.

`lane-A` and `lane-B` are disjoint by file, so they can run in parallel; the
integration lane runs after both, and it is the only one that touches `docs/`
apart from G27.

## 6. Open decisions for Andrea

1. **F4 shape** — a `DateField` component (English file name, Italian props per
   D026) or the picker inline in `AgreementSheet`? Two call sites today, both on
   the sheet.
2. **F4 web** — a DOM `input[type=date]` (native enough, but a second rendering
   path) or a numeric field with auto-format (one path, less correct)? The native
   picker is the requirement; web is the compromise.
3. **F9's fix** — if it survives the re-measure: shorter labels at narrow widths
   (copy change, needs Italian review) or wrap the action row (layout change,
   taller card)? The audit's own numbers say the row already fits a 660 px
   viewport, so this is a 320 px-only decision.
4. **F2 vs F3 consistency** — F3 is exempted as an inline link while F2 is fixed
   as an icon button. Confirm the line stays where it is: real controls get 44,
   inline text links do not.
