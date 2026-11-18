# SSE frontend — brief

Classe **L**. 19 file (7 nuovi: `api/stream.js`, `hooks/useEventStream.js`, i due test,
`plan-brief.md`, `plan.md`), 5 figli di scrittura + 3 reviewer, ~2-3 h di orologio.
Stile: `full`. Ramo `andrea-frontend`; mai `main`.

## Obiettivo

Una sola connessione per app a `GET /api/stream`, aperta nel root layout dentro
`AuthProvider`, che rende l'app real-time: ogni frame `notification` significa
«rileggi ciò che stai mostrando», non «disegna questo payload».

## Fatti verificati (non ipotesi)

- `Frontend/src/api/client.js:12` `REQUEST_TIMEOUT_MS = 10000`: **non** si applica
  allo stream (decisione chiusa 2 del task).
- `Frontend/src/api/client.js:96-148` `apiFetch` non espone streaming: serve un
  client a mano, e il 401 va segnalato a mano (`setSessionExpiredHandler` è
  privato al modulo).
- `EventSource` non è usabile: non manda `Authorization`, e il token non deve
  finire nell'URL (`docs/decisions.md` D029).
- `useUnreadCount` (`hooks/useNotifications.js:214`) ha `UNREAD_POLL_MS = 30000`;
  `useChat` (`hooks/useChat.js:15`) ha `CHAT_POLL_MS = 15000`. Sono gli unici due
  timer di rete dell'app: `grep -rn "setInterval" Frontend/src` → solo questi.
- `NotificationsSheet` è montato **solo mentre è aperto**
  (`app/(tabs)/profile.jsx:395-402`): `useNotifications` che si sottoscrive allo
  stream *è* il «rileggi la lista quando il pannello è aperto», senza plumbing.
- `normalizeNotification` (`api/normalizers.js:618-636`) produce già la forma
  interna (`tipo` in maiuscolo, `dati`). Il frame porta `notification` con la
  stessa forma della riga di `GET /notifications`: si riusa lo stesso normaliser.
- Stack vivo adesso: `backend-backend-1 (healthy)`, 8000 raggiungibile; `curl
  /api/stream` con JWT demo → `event: hello` + `{"lastId":35,"unreadCount":1}`;
  `?after=x` → `400`; `OPTIONS` con `Access-Control-Request-Headers: authorization`
  → `204`; `Access-Control-Allow-Origin: *` sulla 200. Nessun blocco CORS sul web.
- Gate: `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest` (il task
  aggiunge `jest` alla regola D019). `node_modules` presente.

## Vincoli

- `Backend/**`, `Context_and_DB_V2/**`: sola lettura. Nessuna rotta nuova, nessuna
  dipendenza nuova (`package.json` non si tocca).
- Una connessione per app: il provider sta in `app/_layout.jsx`, dentro
  `AuthProvider`. Nessun hook di schermata apre connessioni.
- D026: struttura inglese (`startEventStream`, `parseEventStream`), contratto
  interno italiano (`notifica`, `dati`, `tipo`, e i `nonLette` esistenti). Nessuna
  rinomina a tappeto.
- Ogni consumatore ha un handler suo e non rinegozia il formato: riceve la riga
  normalizzata e decide con i predicati di `api/stream.js`.
- Fuori stream non si tocca niente: le schermate continuano a leggere le proprie
  GET (forme normalizzate esistenti).
- Nessuna tabella, nessun emoji, nessun segreto.

## Decisioni chiuse (lock — approvabili così come sono)

1. **Il polling resta, rallentato.** `UNREAD_POLL_MS` 30000 → **120000**;
   `CHAT_POLL_MS` 15000 → **60000**. Motivo verificabile: su `php -S` una SSE che
   cade deve degradare, non lasciare muta una schermata; e su nativo la lettura
   incrementale di XHR è la parte più fragile della catena. I valori restano
   esportati e i test li importano, quindi il rallentamento è verificabile.
2. **Cursore in memoria, nessuna persistenza.** `after` = ultimo id applicato in
   questa sessione del provider; primo connect senza `after` = live edge, come
   da contratto. Un remount copre il buco con le letture su focus che restano.
   Alternativa scartata: persistere il cursore in SecureStore (scrittura a ogni
   frame, valore stantio dopo un logout).
3. **App in background = connessione chiusa.** `AppState !== 'active'` chiude;
   il ritorno in primo piano riconnette subito. Motivo: ogni connessione tiene
   un worker `php -S` (`PHP_CLI_SERVER_WORKERS=12`) e in background non c'è
   schermata da aggiornare.
4. **Conteggio non lette: i frame sono la verità mentre si è connessi; il poll
   scrive solo a connessione assente.** Un poll partito prima di un frame
   scriverebbe un numero vecchio: `useUnreadCount` legge
   `useStreamState().unreadCount` e richiede il poll solo quando
   `connected === false` (più il caso `null`, primo avvio). Una sola verità, il
   server.
5. **Watchdog di inattività a 45 s.** Nessun byte per 45 s (tre `: ping` mancati,
   heartbeat 15 s) = connessione morta: si chiude e si riconnette. La chiusura
   normale del server (30 s) non è un guasto: la riconnessione è immediata
   (0 ms). Un guasto di trasporto usa backoff 1 s → 2 s → 4 s … tetto 30 s,
   azzerato da un `hello` ricevuto. `401` → una sola chiamata a
   `signalSessionExpired()` e nessun nuovo tentativo.

## Interfaccia che i figli devono usare (non inventare)

```js
// src/api/stream.js  (base, scritta dal padre)
export const STREAM_IDLE_MS = 45000;
export function parseEventStream(buffer, chunk);   // -> { frames, rest }
export function startEventStream({ token, after, onFrame, onClose, onError });
export function affectsAgreements(notifica);
export function affectsChat(notifica, chatId);
export function affectsProfile(notifica);
export function affectsMatch(notifica);

// src/hooks/useEventStream.js  (base, scritta dal padre)
export function EventStreamProvider({ children });
export function useStreamEvent(handler);  // handler(notifica) su ogni frame notification
export function useStreamState();         // { connected, unreadCount, lastId }
```

Fuori dal provider `useStreamEvent` è un no-op e `useStreamState` risponde
`{connected:false, unreadCount:null, lastId:null}`: i test esistenti restano verdi
senza wrapper.

## Criteri di successo

- Due sessioni reali: A scrive in chat, B vede il messaggio senza toccare nulla;
  il badge non lette si muove da solo; la proposta di A compare in B.
- Caduta: backend fermato e riavviato → l'app riconnette da sola e torna a
  ricevere (nessun tocco, nessun ricaricamento pagina).
- Gate verde e albero pulito sul ramo `andrea-frontend`.

## Esclusioni (limiti dichiarati nei docs)

- Catalogo home (`useServiceCatalog`), profilo pubblico di terzi, liste staff:
  il backend non emette notifiche per quelle tabelle → restano su
  focus/pull-to-refresh. Va scritto in `docs/api.md` e `docs/frontend.md`.
- Nessun indicatore di stato della connessione in UI, nessun banner «real-time
  spento»: il degrado è il polling rallentato.
- Nessuna riconciliazione del cursore dopo un remount (punto 2 del lock).
- `git add -A` vietato; `.impeccable/scratch/` e `critique-login.png` non sono
  miei e restano non tracciati.
