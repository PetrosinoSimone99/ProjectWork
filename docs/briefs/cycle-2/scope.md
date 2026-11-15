# Scope — ciclo 2

Nota di scope, non un piano: il piano nasce dentro il ciclo (`docs/briefs/<slug>/plan.md`)
una volta chiuse le domande di lock. Qui restano le cose da non perdere.

Precedente: [`../sync-15112026/plan.md`](../sync-15112026/plan.md) — ciclo 1 chiuso,
10 blocchi `DONE`, 2 `N/A` per decisione.

## Obiettivo

Finire quello che il backend `barattolo_15112026` rende possibile, chiudere il
debito di design che il ciclo 1 ha dichiarato, e **portare la superficie nativa
allo stesso livello di verifica di quella web**.

## A — Debito di design (da `docs/audits/ux-audit-2026-11-15.md`, §2)

| # | Cosa | Perché |
| --- | --- | --- |
| A1 | "Elimina" su una notifica passa da `ConfirmModal`, e il rosso smette di essere il controllo più rumoroso della riga | il resto dell'app conferma ogni azione irreversibile (`AgreementCard`, `report.jsx`); oggi un tocco distrugge senza ritorno |
| A2 | La mini-card "Cosa offre e cerca" non ripete il servizio aperto e mostra una riga per servizio (`numberOfLines={1}`) | oggi stampa fino a sei paragrafi dentro un modale, e il primo è il servizio che stai leggendo |
| A3 | Le non-lette si distinguono con bordo/indicatore `primary`, non con l'intera card su `serviceBg` | `DESIGN.md` riserva `serviceBg` ai data mark: con 15 righe non lette la schermata diventa un muro verde |
| A4 | (economico) la frase sull'aggiornamento si dice una volta sola; nel profilo il conteggio non lette è un `Chip`, non una cifra nuda | due P2 dell'audit, 10 minuti |

## B — Parità della superficie nativa (Expo Go 58)

"Funzionante come il web" significa, operativamente:

| # | Cosa si verifica | Come |
| --- | --- | --- |
| B1 | il bundle iOS e Android compila con le modifiche del ciclo | `npx expo export --platform ios` e `--platform android`, `npx expo-doctor` 20/20 |
| B2 | nessun ramo `Platform.OS` rotto e nessuna API solo-web usata fuori dal web | lettura mirata di `_layout.jsx`, `(tabs)/_layout.jsx`, `Screen`, `PageHeader`, `WebNavMenu`, più le schermate nuove |
| B3 | i gesti che il web non ha funzionano davvero: pull-to-refresh nativo (ora cablato in inbox e profilo), tab bar a cinque voci, safe area, tastiera nei form | codice + prova su device |
| B4 | il tema scuro regge le schermate nuove | `useTokens`, catture dark su web se il device non è disponibile |
| B5 | una checklist per Andrea, una riga per prova, dentro il piano | il device è l'unica cosa che l'agente non può fare |

## C — Code, match e crediti (backend pronto)

- `POST /create-service-queue` (`queueType`), `POST /cancel-queue/{id}`, `GET /get-queues`; `/match` oggi è un segnaposto.
- Una coda `REQUEST` costa un credito: `400 {error: "Not enough credits"}`.
- **Il saldo non è esposto da nessuna rotta** (`backend-gaps.md` G15): la UI mostra il costo a parole e non inventa una cifra. Se serve il numero, è una richiesta al backend, non un calcolo del client.
- Il matchmaker gira su `async`: senza worker le code restano `OPEN` (`setup.md`). Nel ciclo si documenta il comando e si verifica con un consumo secco, non con un servizio permanente.

## D — Scheda dell'accordo (send + accept)

Le rotte esistono (`send-agreement-details`, `accept-agreement-details`) ma le righe di
`GET /get-agreements` non portano gli id necessari (`backend-gaps.md` G6): prima di
costruire un modulo si decide se è fattibile con ciò che il backend restituisce. Se non
lo è, il gap resta dichiarato e la schermata continua a dire "Scheda non compilata".

## Vincoli

- `AGENTS.md`: backend e `Context_and_DB_V2` in sola lettura; eccezione Docker
  (`Backend/compose.yaml`, `Backend/docker/`) con nota nel changelog.
- Gate prima di ogni push: `npx expo lint`, `npx tsc --noEmit`, `npx jest`.
- Push libero su `andrea-frontend`, **mai** su `main` senza autorizzazione esplicita.
- Docs aggiornate nello stesso ciclo; ogni blocco `DONE` solo con una prova.

## Fuori scope

Chat UI, accettazione delle segnalazioni lato utente, rinomine e refactor diffusi,
qualunque fix al codice del backend (si segnala in `backend-gaps.md`).
