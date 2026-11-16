# Brief — W1: chat sull'accordo accettato

Un contratto di una pagina. Il piano eseguibile sta in
[`plan.md`](plan.md). Voce sorgente:
[`../../audits/frontend-gap-analysis-2026-11-16.md`](../../audits/frontend-gap-analysis-2026-11-16.md)
§C W1 (riga 214). Branch: `andrea-frontend`, albero pulito al momento del piano.
Stile: `full`. Un solo campo di stato: `Stato:`.

## Obiettivo

Chiudere l'ultimo buco del ciclo di vita: proposta -> accordo -> scheda ->
**chat** -> conclusione. Quattro rotte di chat esistono nel backend e nessuna
riga di `Frontend/src` le nomina. A lavoro finito: da una riga `ACCEPTED` della
tab accordi si apre la chat di quell'accordo, lo storico si legge, si invia un
messaggio, quello della controparte arriva al giro di polling successivo, e i
tre stati (caricamento, vuoto, errore) sono espliciti.

## Vincoli

- `Backend/**` e `Context_and_DB_V2/**` in sola lettura: qui si leggono e si
  citano, non si toccano.
- Gate prima del push: `npx expo lint`, `npx tsc --noEmit`, `npx jest` (gate
  attuale sul ramo: lint e tsc silenziosi, jest 19 suite / 240 test / 13,6 s).
- Push solo su `andrea-frontend`, mai su `main`.
- Copy UI in italiano, identificatori in inglese, nessun emoji, nessun colore
  letterale (token dal tema), niente dati inventati.
- Documentazione nello stesso commit del codice che descrive.

## Fatti verificati (letti, non ipotizzati)

- `Backend/src/Controller/ChatController.php:26` — `GET /chats/agreement/{agreementId}`
  risponde `{chatId, messages: [ChatMessageDTO…]}`; la chat **viene creata** se
  non esiste (`ChatManager::getOrCreateChat`, `ChatManager.php:46`).
- `ChatController.php:49` — `POST /chats/send-message/{chatId}` con `{message}`
  risponde `{success: {code: 200, message: 'Message sent successfully'}}`:
  **nessuna riga di ritorno**, nessun id del messaggio appena scritto.
- `ChatController.php:108` — `GET /chats/check-new-messages/{recentMessageId}`
  restituisce i nuovi messaggi di **tutte** le chat dell'utente, non di una:
  `ChatMessageRepository.php:44-58` filtra `cm.chat IN (:chats)`, `cm.user !=
  :user`, `cm.id > :recentMessageId`, ordine `creationDate ASC`. Il client deve
  filtrare per `chatId`; i propri messaggi non tornano mai da questa rotta.
- `Backend/src/DTO/ChatMessageDTO.php` — i campi serializzati sono `id`,
  `chatId`, `username`, `message`, `creationDate` (ISO 8601).
- `ChatManager.php:78` — `sendMessage` non valida il testo: `ChatMessage` non ha
  vincoli (`Entity/ChatMessage.php:28-32`), la colonna è `text`
  (`Context_and_DB_V2/barattolo_15112026.sql:104`). Un messaggio vuoto o enorme
  è accettato dal backend: il limite è nostro.
- **Nessuna rotta di chat verifica che il chiamante sia partecipante**
  (`ChatManager.php:46` e `:78`: né `getOrCreateChat` né `sendMessage` leggono
  l'utente del JWT contro i partecipanti). Non è un difetto nostro e non si
  corregge qui: va scritto in `docs/backend-gaps.md`.
- `Frontend/src/api/normalizers.js` non ha alcun normalizzatore di messaggio;
  `Frontend/src/services/dates.js` formatta solo la data (`formatIsoDate`), non
  l'ora.
- `Frontend/src/navigation/screen-titles.js:49-53` confronta percorsi **esatti**:
  `/chat/7` oggi cadrebbe sul solo nome del prodotto.
- `Frontend/src/app/_layout.jsx:92-97` elenca a mano le rotte fuori tab: senza
  una riga lì la schermata esiste ma non è raggiungibile con una sessione attiva.
- `Frontend/src/components/Screen.jsx:52` documenta già `bottomSpacing` per "le
  schermate con una barra ancorata in fondo (chat)": questa voce rende vera quella
  frase (chiude F3 di `docs/ui-triage.md:22`).
- `Frontend/src/components/AgreementCard.jsx:150-186` — il blocco azioni oggi ha
  solo "Annulla scambio", mostrato su `ACCEPTED` con `onCancel` presente.

## Decisioni chiuse

1. **Rotta separata `/chat/[agreementId]`, non un pannello dentro la scheda.**
   Un composer con la tastiera ancorata in fondo non vive dentro una card
   dentro una tab che scorre. Lo `Stack` la elenca come le altre rotte secondarie.
2. **Polling 15 s mentre la schermata è a fuoco, zero su blur.** Il backend non
   ha push: l'unica freschezza è chiedere. 15 s è il numero proposto dall'audit;
   il timer si spegne in `blur` e non esiste `setInterval` fuori da `useFocusEffect`.
3. **Niente bolla ottimistica: invio, poi rilettura.** `send-message` non torna
   la riga scritta, quindi una bolla locale non avrebbe id da riconciliare e
   potrebbe duplicarsi. Il composer mostra lo stato di invio; al 200 si ricarica
   lo storico e la bolla vera appare.
4. **Il "nuovo" arriva solo dagli altri.** `check-new-messages` esclude i propri
   messaggi: chi scrive da un altro dispositivo vede il proprio messaggio alla
   successiva rilettura completa, non dal polling. Va detto nel docstring, non
   mascherato.
5. **Limite di testo nostro: 1000 caratteri**, rifiutati prima della chiamata
   con la frase "Il messaggio è troppo lungo (massimo 1000 caratteri).". Il
   backend non ha vincoli; il limite è la nostra guardia, non una regola sua.
6. **Testo vuoto o di soli spazi non parte**: bottone disabilitato, nessuna
   chiamata. Il backend accetterebbe una stringa vuota.
7. **Solo accordi `ACCEPTED` mostrano "Apri chat".** Anche se la rotta del
   backend crea la chat per qualunque agreement id, il ciclo di vita prevede la
   chat dopo l'accettazione: la card non offre ciò che il prodotto non promette.
8. **La card resta senza router**: riceve `onApriChat`; `(tabs)/agreements.jsx`
   possiede `router.push`.
9. **Il difetto di autorizzazione del backend si documenta, non si aggira**:
   nuova voce in `docs/backend-gaps.md`, e la schermata resta raggiungibile solo
   dalla riga `ACCEPTED`.

## Criteri di successo

- Da una riga `ACCEPTED` si apre la chat di **quell'** accordo.
- Un messaggio inviato compare dopo la rilettura; quello della controparte entro
  un giro di polling (15 s) mentre la schermata è a fuoco.
- Caricamento, vuoto ed errore hanno ognuno la propria faccia; un errore di
  invio non cancella lo storico già a schermo.
- Gate verde (`expo lint`, `tsc --noEmit`, `jest`) e review a contesto fresco
  senza P0.
- `docs/api.md` non dice più "the frontend has no chat screen";
  `docs/backend-gaps.md` porta la voce nuova; `docs/ui-triage.md` F3 chiuso;
  `docs/changelog.md` e la voce W1 dell'audit aggiornati.

## Esclusioni

- Nessuna chat di gruppo, nessun allegato, nessun "sta scrivendo".
- Nessun conteggio non letto per chat (è W10, un altro file).
- Nessun fix alle rotte backend: sola lettura.
- Nessun refactor dei componenti esistenti oltre la riga "Apri chat".
- `docs/ui-triage.md` F3 e `docs/frontend.md` W8 restano di W8 quando parlano
  d'altro; qui si chiude solo F3, perché diventa vero.
