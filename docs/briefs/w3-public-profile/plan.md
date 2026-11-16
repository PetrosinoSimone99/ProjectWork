# Piano — W3: profilo pubblico di un'altra persona

Contratto: [`plan-brief.md`](plan-brief.md) (obiettivo, fatti verificati,
decisioni chiuse, criteri, esclusioni). Questo file è il piano eseguibile.
Stile: `full`. Voce sorgente:
[`../../audits/frontend-gap-analysis-2026-11-16.md`](../../audits/frontend-gap-analysis-2026-11-16.md)
§W3. Branch: `andrea-frontend`. Un solo campo di stato: `Stato:`.

## How to resume

1. `git status --porcelain`: se ci sono file modificati, quelli **sono** il
   blocco in corso — si rileggono e si continua, non si ricomincia.
2. `grep '| Stato: TODO' docs/briefs/w3-public-profile/plan.md` (col pipe:
   senza, il pattern pesca anche i `done:`). Si parte dal primo TODO con
   condizione vera; `N/A` non è un blocco da fare.
3. Trappola d'ambiente: la frontend gira sull'host, non in Docker
   (`npx expo start`); l'API risponde su `EXPO_PUBLIC_API_PORT` (8000). Gate:
   `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest` — baseline
   misurata per sottrazione dal gate finale (27 suite / 294 test meno le 2
   suite e i 9 test aggiunti qui): **25 suite / 285 test** — il 19/240 del piano
   era il gate di W2, invecchiato da W1.
4. Trappola di rotta: il file `src/app/user/[id].jsx` **non** è raggiungibile
   finché non compare nello `Stack` di `src/app/_layout.jsx` (blocco 6); il nome
   nello `Stack` è `user/[id]`.
5. Trappola di riuso: `useUserServices` è già scritto e distingue `404`
   (`mancante`) da `403` (`vietato`). La schermata non rifà la rete: legge i suoi
   campi e disegna cinque stati.
6. Trappola di lane: `UserServicesMiniCard.jsx` ha **un solo padrone per
   ondata** (ondata 1, lane A). Nessun altro figlio apre quel file.
7. Primo blocco dopo la ripresa: il primo `Stato: TODO` dei blocchi 1-10, con la
   ondata dichiarata in `Lanes:` (ondata 1 = blocchi 1-3, ondata 2 = 4-8).
8. Un blocco `DONE` si verifica sul gate del repo a quel commit, non
   sull'albero con modifiche in corso.
9. `git add` solo dei path toccati. `Backend/**`, `Context_and_DB_V2/**` e
   `Archive/**` mai.

## Passi

- 0. Commit contratto + piano | files: docs/briefs/w3-public-profile/plan-brief.md,docs/briefs/w3-public-profile/plan.md | done: `git show --stat HEAD` elenca esattamente quei due path | Stato: DONE — `ad4ceac`, due file, 147 righe
- 1. Lane A (ondata 1) — estrarre il gruppo di righe in `ServiceGroup.jsx` con prop `limite` (default 3, `null` = nessun taglio: righe `- descrizione`, intestazione icona+titolo, contatore «e N altre» solo quando c'è taglio) e farlo importare da `UserServicesMiniCard.jsx`, che passa `limite={RIGHE_VISIBILI}` e tiene `otherServices` dov'è | files: Frontend/src/components/ServiceGroup.jsx,Frontend/src/components/UserServicesMiniCard.jsx | done: `grep -n "ServiceGroup" Frontend/src/components/UserServicesMiniCard.jsx` trova l'import, `grep -n "function Gruppo" Frontend/src/components/UserServicesMiniCard.jsx` = 0, `npx jest UserServicesMiniCard` verde e invariato | Stato: DONE — `1ed4fe3`; import a riga 6, uso a riga 131, `function Gruppo` = 0, i 4 casi di `otherServices` invariati
- 2. Lane A (ondata 1) — `ServiceGroup.test.js` (nuovo): con `limite` assente mostra al più 3 righe e il contatore, con `limite={null}` mostra tutte le righe e nessun contatore, lista vuota/assente non disegna niente | files: Frontend/src/components/__tests__/ServiceGroup.test.js | done: `cd Frontend && npx jest ServiceGroup` verde, i tre casi elencati per nome | Stato: DONE — `1ed4fe3`; taglio a 3 con «e 2 altre», `limite={null}` = 5 righe senza contatore, `[]`/`undefined` = `null`
- 3. Lane A (ondata 1) — commit della lane | files: i tre path dei blocchi 1-2 | done: `git show --stat HEAD` corrisponde a quei path | Stato: DONE — `1ed4fe3`, 3 path
- 4. Lane B (ondata 1) — `ProfileSummary.jsx` (nuovo): identità della persona da `utente` normalizzato — immagine quando `immagineProfilo` c'è (iniziali come ripiego e riga d'errore quando l'immagine non carica, come `src/app/(tabs)/profile.jsx`), nome+cognome, `@username`, località, bio. Nessun campo inventato: campo assente = nessuna riga. Solo dati, nessuno stato di rete | files: Frontend/src/components/ProfileSummary.jsx | done: `grep -n "127.0.0.1\|http" Frontend/src/components/ProfileSummary.jsx` = 0; il componente non importa `@/api/*` | Stato: DONE — `a857cc8`; correzione del padre: la località passa da `localitaPerDisplay`, come `(tabs)/profile.jsx` e le card (il piano la voleva grezza)
- 5. Lane B (ondata 1) — `ProfileSummary.test.js` (nuovo): nome e cognome composti, `@username` presente, ogni campo assente sparisce senza segnaposto, immagine rotta mostra le iniziali e la riga d'errore | files: Frontend/src/components/__tests__/ProfileSummary.test.js | done: `npx jest ProfileSummary` verde | Stato: DONE — `a857cc8`; 5 casi
- 6. Lane B (ondata 1) — commit della lane | files: i due path dei blocchi 4-5 | done: `git show --stat HEAD` corrisponde a quei path | Stato: DONE — `a857cc8`, 2 path
- 7. Lane C (ondata 2) — schermata `/user/[id]`: `useLocalSearchParams` → id, `useAuth` → token, `useUserServices`; `PageHeader titolo="Profilo" indietro={<BackButton />}`; cinque stati (caricamento, `mancante` 404, `vietato` 403, errore con «Riprova», vuoto con `EmptyState` senza azione) e, quando i dati ci sono, `ProfileSummary` + due `ServiceGroup` senza taglio (Offre / Cerca) | files: Frontend/src/app/user/[id].jsx | done: `grep -n "EmptyState\|mancante\|vietato\|riprova" Frontend/src/app/user/[id].jsx` trova i cinque rami; `grep -n "getUserServices" ` = 0 (la rete passa dalla hook) | Stato: DONE — `1393d07`; correzione del padre: un id non intero restava su `LoadingScreen` per sempre, ora cade in «Profilo non disponibile»
- 8. Lane C (ondata 2) — registrare la rotta e il titolo: `<Stack.Screen name="user/[id]" />` in `_layout.jsx` accanto a `chat/[agreementId]`, voce `{ prefisso: '/user/', titolo: 'Profilo' }` in `TITOLI_CON_ID`, caso `/user/7` nel test dei titoli | files: Frontend/src/app/_layout.jsx,Frontend/src/navigation/screen-titles.js,Frontend/src/navigation/__tests__/screen-titles.test.js | done: `cd Frontend && npx jest screen-titles` verde con il caso `/user/7` → `Profilo · Baratto-lo` | Stato: DONE — `1393d07`; caso `/user/7` nuovo nel test
- 9. Lane C (ondata 2) — commit della lane | files: i quattro path dei blocchi 7-8 | done: `git show --stat HEAD` corrisponde a quei path | Stato: DONE — `1393d07`, 4 path
- 10. Lane D (ondata 2) — punto d'ingresso dal dettaglio servizio: `ServiceDetailModal` accetta `onOpenProfile(persona)` e la riga «Pubblicato da» diventa un `Pressable` con `accessibilityRole="button"` e nome accessibile composto (nome + `@username`, come prescrive la lezione F50), solo quando `Number.isInteger(owner.id)` e il callback c'è; `src/app/(tabs)/index.jsx` passa `onOpenProfile={(persona) => router.push(\`/user/${persona.id}\`)}` | files: Frontend/src/components/ServiceDetailModal.jsx,Frontend/src/app/(tabs)/index.jsx | done: `grep -n "onOpenProfile" ` trova il prop e il chiamante; senza `owner.id` la riga resta testo, non un bottone | Stato: DONE — `136a332`; `useRouter` era già importato nella home; corretto anche il paragrafo di testata del modale che dava la G3 ancora aperta
- 11. Lane D (ondata 2) — commit della lane | files: i due path del blocco 10 | done: `git show --stat HEAD` corrisponde a quei path | Stato: DONE — `136a332`, 2 path
- 12. Documentazione nello stesso ciclo: voce in `docs/changelog.md` (cosa è atterrato, perché, path toccati, conteggio suite) e `Stato: chiuso` su W3 nell'audit, con le due voci di G3 dichiarate chiuse e il residuo (nessun ingresso dal lato accordi, G6) | files: docs/changelog.md,docs/audits/frontend-gap-analysis-2026-11-16.md | done: la testa del changelog è la voce di W3; `grep -n "W3" -A 3 docs/audits/frontend-gap-analysis-2026-11-16.md` mostra lo stato chiuso | Stato: DONE — voce di changelog + `Stato: chiuso` con i quattro sha e le due decisioni di lock
- 13. Gate sull'albero finale | files: nessuno | done: `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest` tutti verdi, conteggio suite riportato nel changelog | Stato: DONE — lint 0, `tsc --noEmit` exit 0, jest **27 suite / 298 test**
- 14. Review a contesto fresco, tre angoli e un modello per angolo: correttezza `deepseek-v4.1-flash`, sicurezza e dati `deepseek-v4.1-flash`, coerenza col brief `glm-5.3-flash`; P0/P1/P2 con `file:linea` e verdetto di merge; le fix accettate atterrano in un commit prima del push | files: nessuno | done: tre verdetti riportati, nessun P0 aperto | Stato: DONE — `MERGE WITH FIXES` (correttezza), `MERGE WITH FIXES` (sicurezza e dati), `MERGE` (coerenza col brief); nessun P0 aperto. Le fix accettate sono nel commit di review-fix: chiusura del pannello prima del push (P0), `righe` su `ServiceGroup` (P1), `target.min` sulla riga-bottone (P1), e quattro P2 da una riga ciascuno
- 15. Push sul branch di lavoro | files: nessuno | done: `git status -sb` mostra `andrea-frontend` allineato a `origin/andrea-frontend`, `origin/main` non toccato | Stato: TODO

## Lanes:

Ondata 1 (parallela, `concurrency: 2`) — i due moduli che la schermata dell'ondata 2
importa, nessun file in comune:

- **Lane A** — `Frontend/src/components/ServiceGroup.jsx`,
  `Frontend/src/components/__tests__/ServiceGroup.test.js`,
  `Frontend/src/components/UserServicesMiniCard.jsx` (blocchi 1-3)
- **Lane B** — `Frontend/src/components/ProfileSummary.jsx`,
  `Frontend/src/components/__tests__/ProfileSummary.test.js` (blocchi 4-6)

Ondata 2 (parallela, `concurrency: 2`) — consumatori, file fra loro disgiunti:

- **Lane C** — `Frontend/src/app/user/[id].jsx`, `Frontend/src/app/_layout.jsx`,
  `Frontend/src/navigation/screen-titles.js`,
  `Frontend/src/navigation/__tests__/screen-titles.test.js` (blocchi 7-9)
- **Lane D** — `Frontend/src/components/ServiceDetailModal.jsx`,
  `Frontend/src/app/(tabs)/index.jsx` (blocchi 10-11)

`shared`: nessuno. `docs/changelog.md` e l'audit li scrive il padre (blocco 12),
dopo l'ultimo commit di lane; gate, review e push sono del padre.
