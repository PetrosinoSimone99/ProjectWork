# SSE frontend — il ciclo

Contratto: [`plan-brief.md`](plan-brief.md) (obiettivo, vincoli, decisioni chiuse,
interfaccia). Questo file è il piano: la chat è una sintesi, qui c'è la verità.

Classe **L** — 19 file (7 nuovi), 5 figli + 3 reviewer, ~2-3 h. Stile: `full`.

## How to resume

- Gate, prima di ogni push: `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest`.
  Un solo blocco: `npx jest src/api/__tests__/stream.test.js` (blocco 2),
  `.../__tests__/useEventStream.test.js` (blocco 3).
- Prima di tutto `git status --porcelain`: i file modificati sono il lavoro in
  corso dell'ultimo blocco; si rileggono, non si ricomincia.
- Blocco 0 e 1 = commit (backend SSE già in albero, poi questo contratto).
  Nessun figlio parte prima che esistano.
- Trappola d'ambiente: lo stack Docker serve per la verifica del blocco 7
  (`docker ps` deve vedere `backend-backend-1` healthy sulla 8000). I blocchi 0-6
  non lo toccano.
- Trappola test: `useFocusEffect` va mockato come in
  `src/hooks/__tests__/useChat.test.js:9-14`; senza provider `useStreamEvent` è
  un no-op, quindi i test esistenti passano senza wrapper (e un test che non
  verifica l'evento passerebbe per il motivo sbagliato: i figli devono asserire
  la chiamata di rete dopo il frame).
- Trappola test: `jest.advanceTimersByTime` + promise = serve un giro di
  `await Promise.resolve()` (vedi `unGiro()` in `useChat.test.js:51-59`).
- Trappola RN: `xhr.responseText` cresce solo se `responseType` resta `''`/`text`
  e `xhr.timeout` resta `0`. Nessun timeout della richiesta.
- Primo blocco da eseguire se riprendi: il primo `| Stato: TODO` la cui
  condizione è vera.

## Piano

- 0. Commit del lavoro SSE del backend già in albero (contratto + piano non ancora) | files: Backend/README.md, Backend/compose.yaml, Backend/config/services.yaml, Backend/src/Repository/NotificationRepository.php, Backend/src/Controller/StreamController.php, Backend/src/Service/NotificationEventStream.php, Backend/tests/Functional/RetainedApiTest.php, Backend/tests/Functional/StreamControllerTest.php, Backend/tests/Functional/NotificationEventStreamTest.php, docs/api.md, docs/backend-gaps.md, docs/decisions.md, docs/overview.md, docs/changelog.md | done: commit `feat: push notifications over server-sent events`; `git show --stat` elenca solo quei 14 path; `.impeccable/scratch/` e `critique-login.png` restano non tracciati | Stato: DONE
- 1. Commit del contratto e del piano | files: docs/briefs/sse-frontend/plan-brief.md, docs/briefs/sse-frontend/plan.md | done: commit `docs: the frontend reads the live stream, not a payload`; `grep '| Stato: TODO' docs/briefs/sse-frontend/plan.md` trova i blocchi aperti | Stato: DONE
- 2. Base: parser e client dello stream + segnale di sessione scaduta | files: Frontend/src/api/client.js, Frontend/src/api/stream.js, Frontend/src/api/__tests__/stream.test.js | done: `npx jest src/api/__tests__/stream.test.js` verde (chunk spezzato a metà riga e a metà frame, riga `:` ignorata, `id:` che avanza il cursore, `data:` multiplo, `type` in maiuscolo, `after` solo se il cursore esiste, 401 → `signalSessionExpired` una volta); commit `feat: a hand-written SSE client the token can ride` | Stato: DONE
- 3. Base: provider e hook di sottoscrizione, montati nel root layout | files: Frontend/src/hooks/useEventStream.js, Frontend/src/hooks/__tests__/useEventStream.test.js, Frontend/src/app/_layout.jsx | done: test verde (frame → handler, chiusura server → riconnessione immediata, guasto → backoff con tetto, 401 → nessun retry, background → chiusura e ritorno → connessione, unmount → chiusura); `_layout.jsx` monta `<EventStreamProvider>` dentro `AuthProvider`; `npx expo lint` verde; commit `feat: one stream per app, opened by the root layout` | Stato: DONE
- 4. Ondata: cinque consumatori, un figlio per file, file disgiunti | files: Frontend/src/hooks/useNotifications.js, Frontend/src/hooks/__tests__/useNotifications.test.js, Frontend/src/hooks/useChat.js, Frontend/src/hooks/__tests__/useChat.test.js, Frontend/src/hooks/useAgreements.js, Frontend/src/hooks/__tests__/useAgreements.test.js, Frontend/src/app/(tabs)/match.jsx, Frontend/src/app/(tabs)/__tests__/match.test.js, Frontend/src/app/(tabs)/profile.jsx | done: ogni suite toccata verde; `git diff --stat` corrisponde ai file dichiarati; `npx jest` verde con 34 suite; commit a confini logici (2-3 file: notifiche, chat+accordi, match+profilo) | Stato: TODO
- 5. Docs: mapping consumatori, limiti dichiarati, changelog; commento stantio «no push channel» in `api/areas/notifications.js` | files: Frontend/src/api/areas/notifications.js, docs/api.md, docs/frontend.md, docs/overview.md, docs/changelog.md | done: `api.md` § Frontend mapping notes elenca i cinque consumatori e i tre fuori scope; `frontend.md` § Data and hooks dice che i frame sono «rileggi», non payload; `overview.md` non dice più «non collegata»; changelog con i numeri del gate; commit `docs: the app is connected to the stream, and what stays on focus reads` | Stato: TODO
- 6. Review a contesto fresco, tre angoli, un modello per angolo | files: nessuno (sola lettura) | done: verdetti P0/P1/P2 con file:riga; P0/P1 accettati corretti in resume dello stesso run oppure dichiarati; Merge verdict scritto | Stato: TODO
- 7. Verifica dal vivo: due sessioni + caduta del backend | files: nessuno (nessuna modifica; eventuali fix tornano ai blocchi 2-4) | done: (a) A scrive in chat, B vede il messaggio senza toccare nulla; (b) badge non lette che si muove da solo in B; (c) accordo proposto da A che compare in B; (d) `docker compose stop backend` e `start` → entro un ciclo l'app riceve di nuovo eventi senza reload; tutte e quattro registrate in `docs/changelog.md` | Stato: TODO
- 8. Push su `andrea-frontend` | files: nessuno | done: gate verde, `git status --porcelain` pulito, `git log origin/andrea-frontend..HEAD` coerente, push fatto e nessun commit su `main` | Stato: TODO

## Lanes

- **Base (padre, blocchi 2-3)**, file `shared` di tutti: `api/client.js`,
  `api/stream.js`, `hooks/useEventStream.js`, `app/_layout.jsx` e i due test.
  Committata come radice: nessuna lane parte prima.
- **Lane 1 — notifiche**: `hooks/useNotifications.js`,
  `hooks/__tests__/useNotifications.test.js`.
- **Lane 2 — chat**: `hooks/useChat.js`, `hooks/__tests__/useChat.test.js`.
- **Lane 3 — accordi**: `hooks/useAgreements.js`,
  `hooks/__tests__/useAgreements.test.js`.
- **Lane 4 — match**: `app/(tabs)/match.jsx`,
  `app/(tabs)/__tests__/match.test.js`.
- **Lane 5 — profilo**: `app/(tabs)/profile.jsx`.
- **Integrazione (padre, blocchi 5, 7, 8)**: docs, `api/areas/notifications.js`,
  verifica live, push. Le lane 1-5 sono disgiunte e parallele: ultima più lunga
  del merge + gate (~20 s in locale).
