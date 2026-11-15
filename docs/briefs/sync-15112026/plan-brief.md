# Brief — sincronizzazione con `origin/main` (24 commit, dump `barattolo_15112026`)

Classe: **L** · Stile: `full` · Data: 2026-11-15 · Branch di lavoro: `andrea-frontend`

## Obiettivo

Portare `andrea-frontend` al livello di `origin/main` (notifiche, code/matchmaker,
crediti, `GET /api/users/{id}/services`, auth completa su `/api`, nuovo dump),
adattare il frontend a ciò che cambia sul filo, sbloccare le due UI che il
backend ora permette (inbox notifiche, mini-card servizi utente), aggiornare il
progetto a **Expo SDK 58** (device Expo Go 58.0.0 su iOS) e chiudere con
l'audit di design come nel ciclo precedente.

## Fatti verificati (non assunzioni)

- `origin/main` è avanti 24 commit (`11cffda..76a3fc4`), 62 file, `+3497/−97`;
  `Frontend/` **non** è fra i file toccati → merge senza conflitti sul nostro codice.
- `origin/andrea-frontend` **non** è cambiato: siamo avanti 4 commit, da pushare.
- `security.yaml` ora impone `IS_AUTHENTICATED_FULLY` su `^/api` (pubbliche solo
  `/api/auth/**` e `GET /api/categories`); `ActiveAccountSubscriber` risponde 403
  sugli account inattivi.
- `AgreementStatus` guadagna `CANCELLED` e `COMPLETED`; `ServiceQueue` porta
  `QueueStatus OPEN|IN_PROGRESS|CLOSED` e `QueueType OFFER|REQUEST`.
- Notifiche: solo polling (`GET /api/notifications`, `PATCH /{id}/read`,
  `DELETE /{id}`); nessun Mercure/SSE/push.
- Il DB **non** ha colonne `region`/`province`: `users.location varchar(255)`,
  `services.location varchar(255)`, `service_queues.location varchar(100)`.
  Il frontend serializza `Provincia (Regione)` (`italian-regions.js:172`) e la
  rilegge (`:187`): modello **già allineato**, nessun adattamento obbligatorio.
- `barattolo_15112026.sql` è **solo struttura** (0 `INSERT`); il demo dump ne ha
  705 (50 categorie, 30 utenti `demo`). `Backend/compose.yaml` monta ancora il
  dump vecchio → il DB locale non ha `notifications`, `service_queues`, `credits`.
- SDK 58 (da `bundledNativeModules.json` sdk-58 + API versioni Expo): `expo ~58.0.25`,
  React 19.3.0, RN 0.88.1, gesture-handler ~3.3.0 (major), reanimated 4.7.1,
  safe-area-context ~5.11.1, screens ~4.30.1, worklets 0.13.0, expo-router ~58.0.31.

## Decisioni chiuse (dal lock con Andrea)

1. **Merge** di `origin/main` dentro `andrea-frontend` come primo passo, merge
   commit, nessun rebase. Push di `andrea-frontend` consentito; `main` no.
2. **Dati locali**: struttura dal dump nuovo + seed demo ricostruito in
   `Backend/docker/seed-demo.sql` (categorie, utenti `demo`, servizi), montato
   dopo lo schema. Riguarda solo l'eccezione Docker, riportato in `docs/changelog.md`.
3. **Scope di questo ciclo**: fix `CANCELLED/COMPLETED`, SDK 58, inbox notifiche,
   mini-card servizi utente. Code/match/crediti restano il ciclo successivo ma il
   piano li nomina come blocco `N/A` oggi, così non si perdono.
4. **Ordine**: merge → dati locali / SDK 58 → adattamenti frontend → UI nuove →
   docs → audit di design → review. SDK 58 isolato in un commit suo.
5. **Design**: `impeccable critique` + audit su **tutto** il frontend, con le due
   superfici valutate separatamente (web = cornice telefono; Expo Go = tab bar in
   basso, **mai** il menu a tendina del web).

## Criteri di successo

- `npx expo lint` e `npx tsc --noEmit` verdi (nel senso che `AGENTS.md` documenta:
  niente type-check sui `.js`).
- `npm test` verde, con test nuovi per gli stati d'accordo e il normalizer notifiche.
- App che parte su **Expo Go 58.0.0** (iOS, device) e su `npx expo start --web`.
- Accordi `CANCELLED` e `COMPLETED` visibili in "Concluse", con etichetta.
- Inbox notifiche: lista, non-lette, segna-come-letta, elimina, stati loading/empty/error.
- Mini-card servizi utente nel modale servizio con i suoi stati.
- Stack Docker ripartito da zero col dump nuovo + seed demo: 50 categorie, utenti `demo` funzionanti.
- `docs/api.md`, `docs/backend-gaps.md`, `docs/database.md`, `docs/setup.md`,
  `docs/changelog.md` aggiornati nello stesso ciclo.

## Esclusioni

- Nessuna scrittura fuori da `Frontend/`, `docs/` e dall'eccezione Docker
  (`Backend/compose.yaml`, `Backend/docker/`). Nessun fix al backend: i problemi
  trovati nel codice pushato si documentano in `docs/backend-gaps.md` e si
  segnalano al maintainer.
- Nessun push su `main`.
- Code/matchmaker, crediti e accettazione dettagli accordo: **non** in questo ciclo.
- Nessun refactor diffuso, nessuna rinomina.
