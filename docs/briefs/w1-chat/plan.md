# Piano — W1: chat sull'accordo accettato

Contratto: [`plan-brief.md`](plan-brief.md) (obiettivo, vincoli, fatti, decisioni
chiuse, criteri, esclusioni). Questo file è il piano eseguibile. Stile: `full`.
Voce sorgente: [`../../audits/frontend-gap-analysis-2026-11-16.md`](../../audits/frontend-gap-analysis-2026-11-16.md)
§C W1. Branch: `andrea-frontend`. Un solo campo di stato: `Stato:`.

## How to resume

1. `git status --porcelain`: se ci sono file modificati, quelli **sono** il
   blocco in corso — si rileggono e si continua, non si ricomincia.
2. `grep '| Stato: TODO' docs/briefs/w1-chat/plan.md` (col pipe: senza, il
   pattern pesca anche i `done:`). Si parte dal primo TODO con condizione vera;
   `N/A` non è un blocco da fare.
3. Trappola d'ambiente: la frontend gira sull'host, non in Docker
   (`npx expo start`); l'API risponde su `EXPO_PUBLIC_API_PORT` (8000). Gate:
   `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest` — oggi tutto
   verde (19 suite, 240 test, ~14 s).
4. Trappola di rotta: una schermata nuova sotto `src/app` **non** è
   raggiungibile finché non compare in `src/app/_layout.jsx` (blocco 8); il nome
   nello `Stack` è `chat/[agreementId]`.
5. Trappola di contratto: `POST /chats/send-message/{chatId}` non torna il
   messaggio scritto (blocco 3 del brief). Niente bolla ottimistica.
6. Trappola di rotta API: `check-new-messages` è globale su tutte le chat
   dell'utente e non include i propri messaggi: si filtra per `chatId`.
7. Primo blocco dopo la ripresa: il primo `Stato: TODO` dei blocchi 1-13, con
   la ondata dichiarata in `Lanes:` (ondata 1 = blocchi 2-6, ondata 2 = 9-10).
8. Il gate di ogni blocco è il gate del repo; un blocco `DONE` si verifica su un
   `git worktree add` di quel commit, non sull'albero con modifiche in corso.
9. `git add` solo dei path toccati (`Backend/` e `Context_and_DB_V2/` mai).
10. `Lanes:` in fondo: chi scrive cosa e quali file restano al padre.

## Blocchi

- 0. Committa contratto e piano; nessun figlio parte prima | files: docs/briefs/w1-chat/plan-brief.md,docs/briefs/w1-chat/plan.md | done: `git log -1 --stat` mostra i due file, `git status --porcelain` vuoto | Stato: TODO
- 1. Base condivisa (padre, prima delle lane): `normalizeChatHistory({chatId, messages})` -> `{chatId, messaggi: [{id, chatId, autore, testo, inviatoIl}]}` (ordine cronologico, righe senza id scartate) e `formatIsoDateTime` accanto a `formatIsoDate` | files: Frontend/src/api/normalizers.js,Frontend/src/services/dates.js | done: `node -e`/jest su `normalizeChatHistory` con payload DTO reale e `formatIsoDateTime('2026-11-16T14:03:22+00:00')` -> `16 nov, 15:03` in fuso locale, `npx jest` verde, commit | Stato: TODO
- 2. Lane 1 — area API chat: 4 chiamate (`getAgreementChat`, `sendChatMessage`, `getMostRecentMessageId`, `getNewChatMessages`) con la tabella di copy italiana per 400/401/404/500, corpo `{message}` e nessun `Number()` su id assenti | files: Frontend/src/api/areas/chat.js,Frontend/src/api/__tests__/chat.test.js | done: test dell'area verde sui 4 endpoint (URL, metodo, token, corpo, mapping 400/401/404/500 e riga malformata ignorata), nessun testo inglese del backend che arriva allo schermo | Stato: TODO
- 3. Lane 2 — bolla messaggio: proprio vs controparte (lato, allineamento, token del tema), autore e ora leggibili, testo lungo che va a capo senza rompere la riga | files: Frontend/src/components/MessageBubble.jsx,Frontend/src/components/__tests__/MessageBubble.test.js | done: test che distingue il messaggio proprio da quello altrui e mostra l'ora; zero colori letterali nel file (`grep -n "#" ` vuoto) | Stato: TODO
- 4. Lane 3 — composer: `TextInput` multilinea + bottone "Invia"; disabilitato se testo vuoto/di soli spazi o `inviando` o `chatId` assente; 1000 caratteri con rifiuto esplicito prima della chiamata | files: Frontend/src/components/MessageComposer.jsx,Frontend/src/components/__tests__/MessageComposer.test.js | done: test su vuoto (nessuna chiamata), troppo lungo (frase di rifiuto), invio riuscito (testo ripulito e svuotato), invio in corso (bottone in loading) | Stato: TODO
- 5. Lane 4 — `AgreementCard`: azione "Apri chat" (icona `chatbubble-ellipses-outline`, `accessibilityLabel` "Apri la chat di questo scambio") solo su `ACCEPTED` + id intero + `onApriChat` presente; nessun router dentro la card | files: Frontend/src/components/AgreementCard.jsx | done: il blocco azioni non cambia sugli altri stati; `npx jest src/components/__tests__/AgreementSheet.test.js` verde e lint verde | Stato: TODO
- 6. Lane 5 — `(tabs)/agreements.jsx` passa `onApriChat`: `router.push('/chat/' + accordo.id)` solo per le righe accettate | files: Frontend/src/app/(tabs)/agreements.jsx | done: lint + tsc verdi, la prop arriva solo sulle righe `ACCEPTED` | Stato: TODO
- 7. Padre — export dell'area in `api/index.js` (dopo il blocco 2) | files: Frontend/src/api/index.js | done: i 4 nomi esportati, `npx tsc --noEmit` verde | Stato: TODO
- 8. Padre — rotta e titolo: `<Stack.Screen name="chat/[agreementId]" />` con sessione attiva, e `screen-titles.js` che riconosce il prefisso `/chat/<id>` con il titolo `Chat` | files: Frontend/src/app/_layout.jsx,Frontend/src/navigation/screen-titles.js | done: `titoloDocumento('/chat/7')` -> `Chat · Baratto-lo`, `titoloDocumento('/chat')` invariato, tsc verde | Stato: TODO
- 9. On data 2 — `useChat({token, agreementId, myUsername})`: storico su focus, polling 15 s su focus e **nessun** timer su blur, filtraggio per `chatId`, `invia(testo)` -> `Promise<boolean>` con rilettura dopo il 200, errori separati (`errore` di lettura, `erroreInvio` di scrittura) | files: Frontend/src/hooks/useChat.js | done: lint + tsc verdi, il timer vive dentro `useFocusEffect` e la sua cleanup lo spegne (`grep -n "setInterval" ` una sola occorrenza) | Stato: TODO
- 10. On data 2 — schermata `/chat/[agreementId]`: `Screen` con `bottomSpacing` ridotto, header con la controparte, `FlatList` di `MessageBubble`, composer ancorato in fondo; quattro facce: prima lettura (`LoadingScreen`), vuoto (`EmptyState`, copy di decisione 3 del brief), errore (`Banner` + Riprova tenendo i messaggi già a schermo), invio fallito (`Banner` sopra il composer senza perdere il testo digitato) | files: Frontend/src/app/chat/[agreementId].jsx | done: lint + tsc verdi, i quattro stati esistono nel file e nessuno inventa un conteggio (`grep -n "length" ` non produce numeri inventati) | Stato: TODO
- 11. Gate e review a contesto fresco (correttezza / sicurezza e dati / coerenza col brief), P0-P1-P2 con file:riga e verdict | files: — | done: lint + tsc + jest verdi sul commit corrente e la review riporta verdict `merge` senza P0 | Stato: TODO
- 12. Documentazione nella stessa chiusura: `docs/api.md` (la sezione Chat dice cosa fa lo schermo), `docs/backend-gaps.md` (voce nuova: nessuna rotta di chat verifica il partecipante), `docs/ui-triage.md` F3 chiuso con il motivo, `docs/changelog.md` (sessione W1), voce W1 dell'audit a `Stato: chiuso` con ciò che il run ha corretto | files: docs/api.md,docs/backend-gaps.md,docs/ui-triage.md,docs/changelog.md,docs/audits/frontend-gap-analysis-2026-11-16.md | done: `grep -rn "no chat screen\|nessuna chat" docs/` non trova più la frase; F3 non è più aperto; G-voce nuova presente | Stato: TODO
- 13. Push su `andrea-frontend` a chiusura, albero pulito e gate verde, mai su `main` | files: — | done: `git status --porcelain` vuoto, `git log origin/andrea-frontend..HEAD --oneline` vuoto dopo il push | Stato: TODO

## Lanes

Ondata 1 (una chiamata `subagent({tasks: [...]})`, `concurrency: 6`; ogni lane
riceve i PATH `docs/briefs/w1-chat/plan-brief.md` e `docs/briefs/w1-chat/plan.md`,
mai un riassunto inline):

- `api-chat` — blocchi 2 · files: `Frontend/src/api/areas/chat.js`,
  `Frontend/src/api/__tests__/chat.test.js`
- `bubble` — blocco 3 · files: `Frontend/src/components/MessageBubble.jsx`,
  `Frontend/src/components/__tests__/MessageBubble.test.js`
- `composer` — blocco 4 · files: `Frontend/src/components/MessageComposer.jsx`,
  `Frontend/src/components/__tests__/MessageComposer.test.js`
- `card` — blocco 5 · files: `Frontend/src/components/AgreementCard.jsx`
- `tab-accordi` — blocco 6 · files: `Frontend/src/app/(tabs)/agreements.jsx`

Ondata 2 (dopo il commit della prima e dopo i blocchi 7-8 del padre):

- `hook-chat` — blocco 9 · files: `Frontend/src/hooks/useChat.js`
- `screen-chat` — blocco 10 · files:
  `Frontend/src/app/chat/[agreementId].jsx`

`shared` (solo il padre, mai un figlio):

- prima delle lane: `Frontend/src/api/normalizers.js`,
  `Frontend/src/services/dates.js` (blocco 1)
- fra le due ondate: `Frontend/src/api/index.js` (blocco 7),
  `Frontend/src/app/_layout.jsx` + `Frontend/src/navigation/screen-titles.js`
  (blocco 8)
- chiusura: tutti i file di `docs/` (blocco 12) e il piano stesso

Contratto stabile fra le ondate, così le lane non divergono:

- normalizzatore: `normalizeChatHistory({chatId, messages})` ->
  `{chatId: number|null, messaggi: Array<{id, chatId, autore, testo, inviatoIl}>}`
- hook: `{chatId, messaggi, caricamento, errore, inviando, erroreInvio,
  invia(testo), ricarica}`; `messaggi` è `null` prima della prima risposta
- card: prop `onApriChat` (`null` di default), bottone solo su `ACCEPTED`
- API: `getAgreementChat(token, agreementId)`,
  `sendChatMessage(token, chatId, message)`,
  `getMostRecentMessageId(token)`, `getNewChatMessages(token, recentMessageId)`

Nessun figlio committa (albero condiviso, file disgiunti, git al padre).
