# Plan — approved 2026-11 (post-grilling, post-brief)

Operational plan for `/exec`. `plan-brief.md` is the contract of truth; this file is the
approved execution detail. If they disagree, the brief wins and the writer must ask.

## Tappa 1 — Sync (DONE, commit 69e5fec)

`origin/main` merged into `andrea-frontend`, `AGENTS.md` tracked, branch pushed.

## Tappa 2 — Prune and rename (2 commits)

`refactor: drop dead domain` then `refactor: rename to English`.

### Delete (only if no surviving file imports it — check with grep first)

- Screens: `app/(tabs)/loop.jsx`, `app/accordo.jsx`, `app/nuovo-accordo.jsx`,
  `app/scambi.jsx`, `app/token.jsx`, `app/chat.jsx`, `app/dev/`.
- API: `api/finti/*` (all), `api/aree/catene.js`, `api/aree/loop.js`, `api/aree/token.js`.
- Logic: `servizi/catene.js`, `servizi/candidati.js`, `servizi/token.js`, `accordi/stati.js`.
- Hooks: `useCatene`, `useCandidati`, `useChat`, `useNotifiche`.
- Components: `CardCatena`, `CardCatenaConclusa`, `CardCandidato`, `CardBuono`,
  `CardServizioCatalogo`, `SchedaTrascinabile`, `ElencoMembri`, `SezioneProposte`,
  `SezioneCondizioni`, `AvvisoNotifica`, `AvvisoScadenza`, `ChatComposer`, `MessageBubble`.
- Assets: `react-logo*`, `expo-badge*`, `expo-logo`, `tutorial-web`, `expo.icon/`.

### Keep and rename

| Before | After |
| --- | --- |
| `app/(tabs)/offro-e-cerco.jsx` (`/offro-e-cerco`) | `app/(tabs)/offer-and-request.jsx` (`/offer-and-request`) |
| `app/(tabs)/accordi.jsx` (`/accordi`) | `app/(tabs)/agreements.jsx` (`/agreements`) |
| `app/(tabs)/profilo.jsx` (`/profilo`) | `app/(tabs)/profile.jsx` (`/profile`) |
| `app/modifica-profilo.jsx` | `app/edit-profile.jsx` |
| `app/segnala.jsx` | `app/report.jsx` |
| `app/staff-utenti.jsx` | `app/staff-users.jsx` |
| `api/aree/servizi.js`, `profilo.js` | `api/areas/services.js`, `profile.js` |
| `servizi/offerta-ricerca.js` | `services/offer-request.js` |
| `servizi/mie-voci.js`, `staff.js`, `staff-utenti.js`, `segnalazioni.js`, `aree-italiane.js` | `services/my-entries.js`, `staff.js`, `staff-users.js`, `reports.js`, `italian-regions.js` |
| `navigazione/rotte-tab.js` | `navigation/tab-routes.js` |
| `hooks/useCatalogoServizi.js` | `hooks/useServiceCatalog.js` |
| other `hooks/use*` with Italian names | English equivalents |
| Italian-named `components/*` | English equivalents (same role, same props) |

Tab list becomes five routes in English: `index` (`/`), `match` (`/match`, new empty
container), `offer-and-request`, `agreements`, `profile`. Titles stay Italian:
Servizi, Match, Offro e cerco, Accordi, Profilo. `match.jsx` is created in this tappa as
an empty-state container.

### Trim dead code inside survivors

- `api/barattolo.js`: remove the `USA_DATI_FINTI` branch and every function belonging to
  chains, tokens, swipe, candidates, chat, notifications.
- `api/normalizzazioni.js`: remove normalizers for the dead domain.
- `api/config.js`: remove `USA_DATI_FINTI` and `AVVISO_DEMO`.
- `components/Banner.jsx`: remove the demo case.
- `(tabs)/_layout.jsx` + `tab-routes.js`: five English routes.

### Verification

`npx expo lint` and `npx tsc --noEmit` green; no match for
`catene|catena|token|swipe|candidat|finti|loop` in `Frontend/src`; app boots on web.

## Tappa 3 — Docs (1 commit `docs: rewrite for the five-tab model`)

Nine files plus `docs/backend-gaps.md`; `project-structure.md` absorbed into
`architecture.md`, `ux.md` into `frontend.md`. See brief decision 16 and the table in the
approved plan (contents per file listed there).

## Tappa 4 — First code block (one commit per area)

1. `feat: wire session and shared ui` — `validation/` (Italian messages), `api/barattolo.js`
   limited to real endpoints.
2. `feat: login and registration`.
3. `feat: home catalog with relevance-aware ordering` — `services/relevance.js` (rule of
   brief decision 5, applied to the loaded page, limitation documented).
4. `feat: service detail modal` — disabled "Invia proposta" + "available soon".
5. `feat: manage own services` — create/edit/suspend/delete + Deleted section with restore.
6. `feat: profile editing` — bio, validated photo URL, theme, logout, staff entry.
7. `feat: placeholder sections` — `match.jsx`, `agreements.jsx` with bell and three sections.
8. `test: cover ordering and validation` — jest for `services/relevance.js` and `validation/`,
   separate and non-blocking.

Every point: gate green, no Italian identifiers, explicit loading/empty/error states,
verified on web against the real Docker backend.
