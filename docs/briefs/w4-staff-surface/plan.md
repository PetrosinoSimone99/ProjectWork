# W4 — Area staff: servizi eliminati e dettaglio segnalazione

Classe: **M** — 10 file (3 nuovi), 4 figli, 1 stop (questo piano). Stile: `full`.
Fonte: `docs/audits/frontend-gap-analysis-2026-11-16.md:375-391` (W4), elenco run
`…:558`. Sessione: `git fetch origin` → `andrea-frontend` 0 avanti / 0 indietro
rispetto a `origin/andrea-frontend`; 292 avanti, 0 indietro rispetto a
`origin/main`. Nessun merge.

## Contratto

**Obiettivo.** L'area staff fa quello che `docs/api.md:211-216` promette già:
vedere i servizi eliminati di tutti gli utenti e ripristinarne uno, aprire il
dettaglio completo di una segnalazione e di una voce del registro operazioni.
Oggi il frontend non chiama quattro endpoint documentati
(`GET /staff/services/deleted`, `POST /staff/services/{id}/restore`,
`GET /staff/reports/{id}`, `GET /staff/operations/{id}`): verificato con
`grep -rn "staff/services\|getStaffReport\|getStaffOperation" Frontend/src` → 0 hit.

**Vincoli.**

- `Backend/**` e `Context_and_DB_V2/**` in sola lettura: il contratto è già
  scritto (`Backend/src/Controller/DeletedServiceController.php:34,52` e
  `DATABASE_AND_API_GUIDE.md:536` per il dettaglio segnalazione, `:899-928` per
  l'operazione). Nessuna modifica al backend.
- Forme wire verificate, non ipotizzate:
  - `GET /staff/services/deleted?page=&limit=` (max 50) → `{services:[...],
    pagination:{page,limit,totalItems,totalPages}}`; ogni riga è
    `Service::toOwnedServiceApiArray()` **più** `owner` (`toPublicApiArray()`) e
    `deletedAt` (`DeletedServiceController.php:100-110`).
  - `POST /staff/services/{id}/restore`, corpo vuoto → `{service:{…,owner}}`.
  - `GET /staff/reports/{id}` → `{report:{…}}`, stessa forma di una riga di
    lista (`DATABASE_AND_API_GUIDE.md:597-615`).
  - `GET /staff/operations/{id}` → `{operation:{id,actor,action,target,before,
    after,createdAt}}` (`:922-934`); `before`/`after` esistono **solo** qui,
    la lista non li porta.
- `403` è già un esito normale (`ACTION_MESSAGES[403]`, `StaffAreaGate`): la
  schermata e la rotta sono già protette, non-staff non arriva alla sezione.
  Nessun lavoro nuovo su questo, dichiarato per non fingere una copertura.
- Ogni sezione porta il **proprio** esito (lezione F57): un guasto dei servizi
  eliminati non riscrive il significato del registro e viceversa.
- Identificatori nuovi in inglese (naming delle funzioni, parametri, stati);
  chiavi di forma UI in italiano come tutti gli altri normalizzatori esistenti
  (W9 non è ancora passato). Copy UI in italiano, nessun emoji, nessun colore
  letterale: token da `space`/`useTokens`.
- `staff.jsx` oggi è 428 righe; il limite di questo item è ~500. Il registro
  operazioni esce in un componente suo, così la schermata resta sotto soglia.
- Niente rete reale nei test: `apiFetch` è mockato come negli altri test d'area.

**Decisioni chiuse** (risposte alle 5 domande del lock).

1. **Servizi eliminati — filtro e paginazione**: nessun filtro (`userId`/`type`
   restano nel contratto ma non hanno UI), prima pagina da 20, «Carica altri 20»
   che appende la pagina successiva finché `page < totalPages`. Ogni riga mostra
   tipo, descrizione, categoria, località/remoto, proprietario e data di
   eliminazione. Motivazione: `limit` massimo 50, quindi una pagina sola non può
   promettere "tutti"; e un proprietario è l'unico dato che distingue le righe.
2. **Dettaglio segnalazione — fonte dei dati**: il pannello si apre subito con la
   riga già in memoria, poi rilegge `getStaffReport` per aggiornare assegnazione
   e chiusura; se la rilettura fallisce il pannello resta leggibile con una riga
   «Dettagli non aggiornati» e il suo retry. Motivazione: l'endpoint esiste ed è
   quello che l'audit elenca, ma far aspettare uno spinner per dati già a schermo
   sarebbe un passo indietro.
3. **Dettaglio operazione — `getStaffOperation`**: sì. Toccare una riga del
   registro apre un pannello con attore, azione, bersaglio, data e
   `before`/`after` come coppie chiave→valore; le chiavi restano quelle del
   backend (non esiste una mappa italiana) e i valori booleani/data sono resi
   leggibili. Stati espliciti: caricamento, errore con retry, 404.
4. **Forma delle righe e nomi**: si riusa `normalizeOwnedService` e si aggiunge
   `proprietario: normalizePerson(owner)` in un nuovo
   `normalizeStaffDeletedServices(response, fallbackDeletedAt?)` dentro
   `normalizers.js`: `normalizePerson` è privata del modulo, quindi il nuovo
   normalizzatore vive lì e non in `areas/staff.js`. `restoreStaffService` riusa
   `normalizeServiceEnvelope` perché la risposta è `{service:…}`.
5. **Ordine della schermata**: header → «Utenti» → sezione «Servizi eliminati» →
   barra di stato + lista segnalazioni → registro operazioni. I servizi eliminati
   sono un lavoro a sé e non devono stare sotto un registro lungo; le
   segnalazioni restano la ragione principale della schermata e restano sopra il
   registro.

**Criteri di successo.**

- Un account staff vede i servizi eliminati di utenti diversi, ne ripristina uno
  dietro `ConfirmModal` e la riga esce dall'elenco al reload; un errore di
  ripristino non svuota la lista.
- Una segnalazione apre il dettaglio completo (motivo intero, autore e segnalato
  con username, date, assegnazione, nota, revisore) e una voce del registro apre
  il suo `before`/`after`.
- `src/api/__tests__/staff.test.js` copre le quattro funzioni nuove con
  `apiFetch` mockato: URL e metodo esatti, query costruita, forma normalizzata,
  `403` → messaggio italiano, risposta vuota → lista vuota (non "non
  disponibile").
- Gate verde: `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest`.
- `docs/changelog.md` con la voce di sessione e W4 chiusa nell'audit, **nello
  stesso commit** del codice che le dà ragione.

**Esclusioni.**

- Nessun filtro per utente o tipo nella UI, nessun conteggio di pagine
  cliccabile, nessuna vista dedicata per riga (solo espansione del pannello).
- Nessuna modifica a `Backend/**`, nessuna rinomina (W9), nessun tocco a
  `docs/api.md` se non per una riga di stato se serve.
- Nessun ritocco al percorso non-staff: `StaffAreaGate` + `403` mappato bastano.

## Piano

- 0. Committare contratto e piano | files: docs/briefs/w4-staff-surface/plan.md | done: `git log -1 --name-only` mostra il piano, albero pulito | Stato: DONE — `375db79`
- 1. Aggiungere le quattro chiamate API con i loro messaggi d'errore | files: Frontend/src/api/areas/staff.js, Frontend/src/api/normalizers.js, Frontend/src/api/index.js | done: `grep -n "listStaffDeletedServices\|restoreStaffService\|getStaffReport\|getStaffOperation" Frontend/src/api/{index.js,areas/staff.js}` trova definizione ed export; `node -e` non serve, il gate di lint/tsc copre | Stato: TODO
- 2. Scrivere il test delle quattro funzioni con `apiFetch` mockato | files: Frontend/src/api/__tests__/staff.test.js | done: `npx jest src/api/__tests__/staff.test.js` verde; casi: URL+metodo, query, normalizzazione, 403 italiano, risposta vuota | Stato: TODO
- 3. Estrarre il registro operazioni in un componente con righe premibili e stati propri | files: Frontend/src/components/StaffOperationsLog.jsx | done: il componente esporta `StaffOperationsLog`, nessun colore letterale, `staff.jsx` non contiene più la funzione `OperationsLog` | Stato: TODO
- 4. Scrivere la sezione dei servizi eliminati con ripristino dietro conferma | files: Frontend/src/components/StaffDeletedServicesSection.jsx, Frontend/src/components/StaffReportCard.jsx | done: la sezione esporta `StaffDeletedServicesSection` con caricamento/vuoto/errore espliciti; la card espone l'apertura del dettaglio | Stato: TODO
- 5. Cablare la schermata: sezione eliminati, pannello dettaglio segnalazione, pannello dettaglio operazione | files: Frontend/src/app/staff.jsx | done: `/staff` rende le tre superfici, `wc -l` < 500, `npx expo lint` e `npx tsc --noEmit` verdi | Stato: TODO
- 6. Documentazione: voce di changelog, W4 chiusa nell'audit | files: docs/changelog.md, docs/audits/frontend-gap-analysis-2026-11-16.md | done: changelog in testa datato 2026-11-17 con i commit del ciclo; W4 `Stato: chiuso` con cosa è atterrato | Stato: TODO
- 7. Gate completo e review a contesto fresco (correttezza+sicurezza/dati, coerenza col brief) | files: - | done: lint + tsc + jest verdi; verdetto Merge con P0/P1/P2 su file:linea | Stato: TODO

## How to resume

Gate: `cd Frontend && npx expo lint && npx tsc --noEmit && npx jest` (niente test
prima del passo 2; `tsc --noEmit` non type-checka i `.js`, non leggerlo come
sicurezza di tipi). Primo blocco da fare: il primo `Stato: TODO` con condizione
vera, cioè `grep '| Stato: TODO' docs/briefs/w4-staff-surface/plan.md`.
Trappole d'ambiente: `Frontend/` gira sull'host, il backend in Docker su :8000 —
i test qui non toccano la rete, `apiFetch` è mockato. Non leggere `.env*`.
`normalizePerson` è privata di `normalizers.js`: chi la vuole da fuori ha sbagliato
file. `StaffReportCard` riceve già `report` normalizzato: il pannello di dettaglio
non deve inventare campi, solo mostrare quelli che `normalizeStaffReport` produce.
Committa solo i path toccati (mai `git add -A`) e aggiorna lo `Stato:` nello stesso
turno del commit.

## Lanes

- **Ondata 1, in parallelo (una sola chiamata `subagent({tasks:[…]})`):**
  - `api` — `Frontend/src/api/areas/staff.js`, `Frontend/src/api/normalizers.js`,
    `Frontend/src/api/index.js`, `Frontend/src/api/__tests__/staff.test.js`.
    Passi 1-2.
  - `ui` — `Frontend/src/components/StaffOperationsLog.jsx`,
    `Frontend/src/components/StaffDeletedServicesSection.jsx`,
    `Frontend/src/components/StaffReportCard.jsx`. Passi 3-4. Legge le forme
    chiuse nel contratto (righe: `{…normalizeOwnedService, proprietario,
    eliminataIl}`; operazione dettaglio: `{before, after}`), non aspetta `api`.
- **Ondata 2, padre (unico writer):** `Frontend/src/app/staff.jsx` (passo 5).
  Dipende da entrambe le lane e le chiude insieme.
- **shared / padre in coda:** `docs/changelog.md`,
  `docs/audits/frontend-gap-analysis-2026-11-16.md` (passo 6) — servono i commit
  delle lane, quindi non viaggiano in parallelo.
- Review: due `reviewer` a contesto fresco su `git diff` del ciclo (deepseek per
  correttezza e sicurezza/dati, glm per coerenza col brief), dopo il passo 6.
