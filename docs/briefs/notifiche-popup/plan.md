# Notifiche come pannello (web + mobile)

## How to resume

- Gate (hard): `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest`. Red gate, no commit.
- This file is the truth; the chat is not. `grep '| Stato: TODO' docs/briefs/notifiche-popup/plan.md`
  and start from the first `TODO` whose condition holds (`N/A` is not work).
- Working branch: `andrea-frontend`. Push only here, never `main`. `Backend/` read-only.
- Block 0: the tree is dirty with the cycle-3 closure docs of the `wiring-audit` brief. Commit them
  first, or lane work starts on top of someone else's uncommitted state.
- Trap: the reference pattern is `BellPanel` in `Frontend/src/app/(tabs)/agreements.jsx:491-622`
  (a `ModalShell` + explicit branches), **not** a component invented from scratch. The panel here is
  **centered** (`align="center"`, the `ModalShell` default), not anchored to the bottom.
- Trap: `RigaCaricamento` (`agreements.jsx:95`) is local to that file. The panel gets its own small
  loading row; do not export it from the agreements screen.
- Trap: the backend has **no bulk read endpoint** — `PATCH /notifications/{id}/read` marks one row.
  Auto-read is one request per unread row of the loaded page, and `useNotifications` must expose one
  call that does the loop, because `azioneInCorso` only allows one action at a time.
- First block after this one: wave 1 (five lanes in one `subagent({tasks:[...]})` call).

Stile: full

## Brief

**Objective.** Le notifiche si aprono come pannello modale **centrato** sopra il profilo, su web e su
mobile, con lo stesso involucro delle «Proposte ricevute» degli accordi: chiusura con X, con Escape e
con un tocco fuori, focus dentro il pannello. La rotta `/notifications` sparisce. E le notifiche non
si segnano più lette a mano: quando l'utente apre il pannello, le righe che vede diventano lette da
sole, e il pulsante «Segna come letta» non esiste più.

**Constraints.** `Frontend/` scrivibile, `Backend/` read-only. Struttura in inglese, contratto e copy
in italiano (D026). Nessun endpoint nuovo, nessun `Backend/` toccato, nessun emoji. Un solo campo di
stato: `Stato:`. Un file, un padrone: `profile.jsx` è del padre, nessun figlio lo apre.

**Closed decisions.**

1. **La rotta muore.** Si cancellano `Frontend/src/app/notifications.jsx`, lo `Stack.Screen` in
   `_layout.jsx:94` (più il commento a `_layout.jsx:40` che la nomina) e la voce `'/notifications'` in
   `screen-titles.js:29`. Dopo la modifica `grep -rn "push('/notifications')" Frontend/src` non trova
   nulla: una porta sola, il pannello. Un vecchio link diretto cade sulla 404.
2. **Una porta sola: la banda del profilo.** Nessuna campanella fluttuante sul profilo (seconda entrata
   e secondo conteggio nella stessa schermata). La banda `Notifiche` (`profile.jsx:270-310`) passa da
   `router.push` a stato locale `pannelloAperto`.
3. **Pannello centrato.** `ModalShell` con `align="center"`, `larghezzaMassima` di default (560) e
   l'85 % di altezza massima: X, Escape e tocco fuori sono già il contratto di `ModalShell` (nessuna
   riga nuova per la chiusura). Il corpo del pannello è la lista; titolo «Notifiche».
4. **Il pannello si possiede da sé i dati.** Contratto pinnato, niente da rinegoziare:
   `NotificationsSheet({ visible, onClose })` — `visible` bool obbligatorio, `onClose` funzione
   obbligatoria. Dentro: `useAuth()` per il token, `useNotifications({ token })` per lista e stato,
   `useRouter()` per aprire lo scambio. Nessun altro prop: `visible`/`onClose` sono i nomi che ogni
   pannello dell'app già usa (`ModalShell`, `ConfirmModal`).
5. **Auto-lettura: le righe visibili si segnano da sole all'apertura.** `useNotifications` perde
   `segnaLetta` e guadagna `segnaVisibiliLette()`: raccoglie gli id non letti di `elementi`, chiama
   `markNotificationRead` per ognuno con `Promise.allSettled`, applica in stato solo le risposte
   arrivate e scala `nonLette` del numero di successi. Il pannello la chiama in un `useEffect` su
   `visible` + `elementi === null → non ancora`: la seconda esecuzione trova zero righe non lette e
   non manda richieste, quindi non serve un `ref` di ciclo di apertura. **Un `PATCH` fallito non
   disegna un banner**: la riga resta col pallino e con la parola «Non letta», cioè lo stato dice la
   verità del backend; il fallimento si annota in sviluppo (`logInSviluppo`, già nel file) perché non
   è un'azione dell'utente da interrompere. **Aggiunto dopo la review (2026-11-18):** le righe segnate
   sono quelle della pagina (fino a 20), non solo le quattro che stanno nel viewport — «aprire» è il
   gesto, e il backend non ha un «segna non letta» con cui tornare indietro, quindi è una conseguenza
   accettata e va detta, non nascosta; il pannello però si monta **solo mentre è aperto**, così un
   profilo visitato e mai aperto non scarica la lista, e l'effect rigira quando cambia `elementi`
   (una riga arrivata da «Riprova» si segna, una `PATCH` fallita si ritenta una volta) fermandosi
   sempre su un giro senza righe non lette.
6. **`NotificationRow` perde il comando, non il dato.** Spariscono `onLetta`, il ramo `lettaInCorso`
   e il pulsante «Segna come letta»; restano la parola «Non letta», il pallino, il bordo accento e
   «Elimina» con la sua conferma. Il pannello non passa `onLetta` a nessuno.
7. **Aprire uno scambio chiude prima il pannello.** Il `onApri` della riga fa `onClose()` e poi
   `router.push('/agreements')`: una schermata che si apre sotto un modale resta coperta. Il deep link
   alla singola notifica resta fuori (audit C1, ciclo 4).
8. **Il conteggio non si duplica e non si congela.** La banda continua a leggere `useUnreadCount`
   (`profile.jsx:52`); il `onClose` che il padre passa al pannello chiude **e** chiama `ricarica` del
   conteggio, così il badge non aspetta i 30 s di `UNREAD_POLL_MS`. Dentro il pannello il numero non si
   ripete: mentre l'auto-lettura scende, un numero nella descrizione cambierebbe sotto gli occhi.
   **Corretto il 2026-11-18:** G16 è ritirato (revisione backend, `backend-gaps.md` §Closed and
   retracted) — `totalItems` è il totale vero e la pagina 2 è raggiungibile, quindi «pagina 1 e basta»
   è una scelta nostra, non un limite. Conseguenza accettata in questo ciclo: oltre le 20 righe della
   prima pagina il badge può restare sopra zero dopo un'apertura, perché quelle righe non sono mai
   state mostrate. Leggere anche la pagina 2 per azzerarlo è un blocco a sé (fuori da questo ciclo, da
   proporre separatamente), non un contatore locale.

**Success criteria.** (a) `grep -rn "push('/notifications')" Frontend/src` vuoto; nessun
`Stack.Screen name="notifications"`; `''/notifications''` fuori da `screen-titles.js`. (b) Nel profilo,
premere la banda apre un dialogo **centrato** senza cambiare rotta; X, Escape e tocco fuori lo
chiudono. (c) Il pannello disegna quattro stati espliciti: riga di caricamento, frase di lista vuota,
`Banner` + «Riprova», righe con `NotificationRow`. (d) Aprendo il pannello con due righe non lette
partono due `PATCH`, le righe perdono «Non letta» e `nonLette` scende di due; `grep -rn "Segna come
letta" Frontend/src` è vuoto. (e) `npx expo lint`, `npx tsc --noEmit`, `npx jest` verdi. (f)
`docs/changelog.md`, `docs/architecture.md:61`, `docs/overview.md:30,41`, `docs/api.md` §Notifications
aggiornati nello stesso commit che rimuove la rotta.

**Out of scope.** Il deep link all'accordo della notifica (C1, ciclo 4 dell'audit `wiring-audit`);
l'anteprima del testo dei messaggi (gap G27); un endpoint di lettura massiva (non esiste: non si
inventa); la scheda `AGREEMENT_DETAILS` come pannello a sé; `useUnreadCount`; qualsiasi file sotto
`Backend/`.

## Steps

- 1. Commit the pending cycle-3 closure docs as the cycle base | files: `docs/briefs/wiring-audit-2026-11-17/audit.md`, `docs/briefs/wiring-audit-2026-11-17/plan.md`, `docs/changelog.md` | done: the three files are committed on `andrea-frontend` and `git status --porcelain` lists only the untracked `critique-login.png` | Stato: DONE
- 2. Commit this plan before any child runs | files: `docs/briefs/notifiche-popup/plan.md` | done: the commit exists on `andrea-frontend` and the working tree shows only `critique-login.png` | Stato: DONE
- 3. Wave 1, lane A — the panel component | files: `Frontend/src/components/NotificationsSheet.jsx` (new) | done: `NotificationsSheet({visible, onClose})` renders a `ModalShell` with `align="center"`, titolo «Notifiche», its own loading row, the empty sentence, the `Banner` + «Riprova», the `NotificationRow` list, and it calls `segnaVisibiliLette` once when `visible` turns true with rows on screen | Stato: DONE
- 4. Wave 1, lane B — auto-read in the hook | files: `Frontend/src/hooks/useNotifications.js` | done: `segnaLetta` and its `'letta'` action name are gone, `segnaVisibiliLette` marks every unread row of `elementi` with one `PATCH` each, applies the returned rows, decrements `nonLette` by the successes, and counts nothing on a failure | Stato: DONE
- 5. Wave 1, lane C — the row loses the command | files: `Frontend/src/components/NotificationRow.jsx` | done: `grep "onLetta\|Segna come letta"` is empty, the row still renders the dot, «Non letta», the type chip, the date, the message, the open label and «Elimina» with its confirm | Stato: DONE
- 6. Wave 1, lane D — take the route down | files: `Frontend/src/app/notifications.jsx` (deleted), `Frontend/src/app/_layout.jsx` | done: the file is gone, `_layout.jsx` has no `Stack.Screen name="notifications"` and the comment at line 40 no longer names a screen that does not exist | Stato: DONE
- 7. Wave 1, lane E — the document title entry | files: `Frontend/src/navigation/screen-titles.js` | done: `'/notifications'` is out of `TITOLI_SECONDARI`, the surrounding comment still reads correctly, `src/navigation/__tests__/screen-titles.test.js` green | Stato: DONE
- 8. Wave 1, parent — wire the band to the panel | files: `Frontend/src/app/(tabs)/profile.jsx` | done: the band's `onPress` flips local state instead of pushing a route; `<NotificationsSheet visible={...} onClose={...} />` is rendered once, and that `onClose` closes and calls the unread count's `ricarica`; the comment above the band no longer says the inbox is a separate screen | Stato: DONE
- 9. Wave 2, lane F — test the panel's branches | files: `Frontend/src/components/__tests__/NotificationsSheet.test.js` (new) | done: with `useNotifications` mocked, the test asserts the loading text when `elementi === null`, the empty sentence when `[]`, the error `Banner` plus «Riprova», one rendered row when there is a notification, and that «Chiudi le notifiche» calls `onClose` | Stato: DONE
- 10. Wave 2, lane G — test the auto-read | files: `Frontend/src/hooks/__tests__/useNotifications.test.js` | done: with two unread rows `segnaVisibiliLette` calls `markNotificationRead` twice, the state ends with both rows read, `nonLette` drops by two, and a rejected call leaves that row unread with `nonLette` decremented only by the successes | Stato: DONE
- 11. Verify no test still asserts the removed command | files: `Frontend/src/components/__tests__/NotificationRow.test.js` | done: `grep -c "Segna come letta\|onLetta"` is 0 and the file is green untouched — if a test does assert it, the removal of the assertion is justified in the commit body | Stato: DONE
- 12. Close the cycle: docs | files: `docs/changelog.md`, `docs/architecture.md`, `docs/overview.md`, `docs/api.md` | done: the changelog entry names the panel, the auto-read and the removed route (plus the page-1-only note, G16 retracted), `architecture.md:61` no longer lists `/notifications`, `overview.md` says the inbox is a panel in the profile, `api.md` §Notifications says the rows shown are marked read on open; full gate green in the same commit | Stato: DONE

## Lanes

Wave 1, one `subagent({ tasks: [...] })` call, shared tree, children never run `git`, parent commits:

- Lane A — step 3: `Frontend/src/components/NotificationsSheet.jsx` (new). Consumes the pinned
  `segnaVisibiliLette` name; the hook arrives in the same wave.
- Lane B — step 4: `Frontend/src/hooks/useNotifications.js`.
- Lane C — step 5: `Frontend/src/components/NotificationRow.jsx`.
- Lane D — step 6: `Frontend/src/app/notifications.jsx` (delete), `Frontend/src/app/_layout.jsx`.
- Lane E — step 7: `Frontend/src/navigation/screen-titles.js`.
- Parent in the same wave — step 8: `Frontend/src/app/(tabs)/profile.jsx` (consumes lane A's pinned
  contract; no child may open it).

Wave 2, after wave 1 is committed:

- Lane F — step 9: `Frontend/src/components/__tests__/NotificationsSheet.test.js` (new, needs lane A on
  disk).
- Lane G — step 10: `Frontend/src/hooks/__tests__/useNotifications.test.js` (needs lane B on disk).
- Parent in the same wave — steps 11-12: `docs/changelog.md`, `docs/architecture.md`,
  `docs/overview.md`, `docs/api.md`.

Shared / parent-owned (never two children at once): `Frontend/src/app/(tabs)/profile.jsx`,
`docs/changelog.md`, `docs/architecture.md`, `docs/overview.md`, `docs/api.md`.
