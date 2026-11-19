# Assessment F — `/impeccable harden` (production robustness)

Read-only pass over `Frontend/src`. No file was modified except this one. No
browser was driven, no server or container was started or stopped. Live checks
were `curl` reads against the already-running backend on `127.0.0.1:8000` plus a
single `POST /auth/login` with the seeded `demo.staff` account to obtain a token
for read-only probes.

Method: the checklist in
`C:/Users/Andrea/.agents/skills/impeccable/reference/harden.md` (extreme inputs,
error scenarios, i18n, text overflow, validation boundaries, concurrency,
accessibility resilience, performance resilience), applied screen by screen and
overlay by overlay against the request contract in `docs/api.md` and the
residual limits in `docs/backend-ledger.md` (note: `docs/backend-gaps.md` does not
exist in this repo; `docs/backend-ledger.md` is the file the task means, and it
declares **no open gap** — so §8 of the brief is answered from the ledger's
"Residual limits" plus what the code actually dead-ends on).

Everything is source-level evidence unless it says "verified live".

---

## 1. Robustness score

**3 / 4** — the error, empty and loading vocabulary is genuinely disciplined
(every API failure is mapped to Italian copy in `src/api`, every list separates
"not loaded yet" from "loaded and empty", every read guards against out-of-order
responses), but four production failure paths still lose work or lie to the
user: a retry offered for a `404` that can never succeed, typed work destroyed
by a mid-session `401` outside `edit-profile`, a double-send window in the chat,
and a failed accept/refuse inside the bell panel that reports nothing because its
banner renders behind the panel.

---

## 2. Findings

Legend: **P1** = will hurt a real user in the demo or in the first week;
**P2** = real, narrower blast radius; **P3** = hardening polish or declared
limit that should at least be said out loud.

| # | P | Issue | Screens / components (file:line) | Failure scenario | What the user sees | Why it matters | Concrete hardening direction | Command |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H1 | P1 | A `404` is offered a `Riprova` that can never succeed | `hooks/useChat.js:111-118` (mapping), `app/chat/[agreementId].jsx:263-272` (Banner + retry) | Agreement deleted/cancelled server-side, or a stale `/chat/12` link; `GET /chats/agreement/999999` answers `404 {"error":"Chat not found."}` (verified live) | "Non trovo più questo accordo: potrebbe essere stato cancellato." next to a **Riprova** button that re-fires the same 404 forever | The app already owns the right state (`isEndpointUnavailable`, `api/client.js:66-72`) and uses it in `usePagedList` only; a retry loop is a dead end that looks like a bug | Map `404` to a terminal `EmptyState` ("questo scambio non esiste più", action = back to `/agreements`), no retry; keep retry for `0/5xx` only | harden |
| H2 | P1 | A mid-session `401` destroys typed work on every screen except `edit-profile` | `auth/auth-context.jsx:80-92` (handler clears session), `app/edit-profile.jsx:53-71,181-192` (the only draft that survives), `app/report.jsx:52`, `components/MessageComposer.jsx:23`, `components/AgreementFormModal.jsx:66-70` | Token expires (1 h, no renewal) while the user is writing a report, a chat message, an agreement sheet, or an entry | Login screen with "La sessione è scaduta: accedi di nuovo."; the text is gone, and `ritorno` is never set except by `edit-profile.jsx:191` | This is exactly the F26 class the repo already fixed for one screen; the rest still lose the work and do not come back to where they were | Generalise the mechanism: a small `useDraftGuard` (in-memory, per-username) + `ritorno` from every route that holds a form; the login already honours `ritorno` (`app/(auth)/login.jsx:66-69`) | harden |
| H3 | P1 | Chat send has no in-flight guard, so a double tap sends twice | `hooks/useChat.js:203-230`, `components/MessageComposer.jsx:25,31-37` | Two taps (or Enter twice on web) inside the same render frame, before `inviando` re-renders the button as busy | Two identical messages in the conversation, one of which the sender did not mean | `send-message` returns only an acknowledgement (`api/areas/chat.js:132-143`), so nothing can reconcile or dedupe; a duplicate in a negotiation is read as the other person being spammed | Guard with a ref inside `invia` (`if (inviatoRef.current) return false`) in addition to the state; the composer already keeps the draft on failure | harden |
| H4 | P1 | A failed accept/refuse inside the bell panel reports nothing | `app/(tabs)/agreements.jsx:226` (banner in the screen body), `:299-303` (panel receives the list error only, not `actionError`) | 409 (already answered elsewhere), 403 (inactive account), or a network drop while the user confirms "Accetta" in the panel | The panel stays open, the row stays, no message anywhere: the tap looks like a no-op, and the user taps again | Accepting is irreversible; an action that silently fails makes the user repeat an irreversible decision | Pass `actionError` into `BellPanel` and render it inside the panel above the rows; the panel already knows how to show an inline error banner | harden |
| H5 | P1 | One tap spends a credit, with no confirmation | `app/(tabs)/match.jsx:132-148` (`create('REQUEST')`), `:250-270` (cost copy only) | User taps "Ricerca" to see what happens; `POST /create-service-queue` debits one credit inside the same transaction (`Backend/src/Manager/ServiceQueueManager.php`) | The queue is created and the balance drops; the only remedy is cancelling (which refunds) — but nothing asked | Every other irreversible action in the app is behind `ConfirmModal`; this is the one that moves a balance, and it is the one with no confirmation | A `ConfirmModal` naming the cost and the current balance (the screen already reads `profile.crediti`), primary variant, label "Crea la coda" | harden |
| H6 | P1 | The staff review note is destroyed by a failed save | `app/staff.jsx:214-235` (`setConfirm(null)` at `:230`), contrasted with the deliberate restore at `:536-543` | 409 (another staff member reviewed first), 403, or a network error while closing a report | An error banner, the review sheet gone, the 2000-character note and the chosen outcome lost | The screen already decided that "No, torna indietro" must restore the draft; a failure path that does not is the same loss with no way back | In the `catch`, restore `setReview(confirm)` (exactly what `onAnnulla` does) before showing the banner | harden |
| H7 | P2 | `403` is explained as a permission problem, but its only cause is an inactive account | `api/client.js:36`, seen on profile, catalog, agreements, chat, match, offer-and-request, staff; honest copy exists only for service writes (`api/areas/services.js:36`) | Staff suspends the account while the user is in the app (this page is pushed live through `USER_STATUS_CHANGED`) | "Non hai i permessi per questa operazione." on a screen that used to work, with no next step | The backend says `403 {"error":"This account is inactive."}` (`Backend/src/EventSubscriber/ActiveAccountSubscriber.php:38`); the user is told a fact about a role they do not have and cannot act on it | A `403` copy (or a per-screen branch like `user/[id]` already does) that says "il tuo account non è attivo: rivolgiti alla staff", plus the "Esci" path | clarify |
| H8 | P2 | No connectivity awareness at all | `api/client.js:9-44,135-158`; no `NetInfo`, no `navigator.onLine` anywhere in `src` | Phone loses signal, or the dev server is stopped, in a shop with flaky Wi-Fi | The same generic banner as a 500: "Non riesco a raggiungere il servizio: controlla la connessione e riprova." | With no reconnect hook the user must press "Riprova" on every screen manually; there is no "sei offline" state, and nothing retries when the connection comes back | Keep `ApiError(0)` but add one connectivity listener at the shell: offline badge in `app/_layout.jsx`, and one automatic retry of the focused screen on `online` | harden |
| H9 | P2 | A storage failure breaks login after the token was already issued | `auth/token-store.js:12-22` (`localStorage.setItem` unwrapped), `auth/auth-context.jsx:87,95` (`await saveSession` before `setSession`) | Safari private mode, storage quota, or a browser that blocks storage | "Qualcosa non ha funzionato. Riprova." on a login that actually succeeded | The user retries and can hit the login throttle (`429`, five attempts per username/IP); the app looks broken for a reason it can survive | Wrap the storage adapter so a write failure degrades to an in-memory session plus one honest line ("resterai collegato solo finché la scheda resta aperta"), never a login failure | harden |
| H10 | P2 | Refreshing the page loses a dirty form (web) | `app/(tabs)/offer-and-request.jsx:100-110` (`form` in state), `app/report.jsx:52-58`, `app/edit-profile.jsx:76-96` (only 401 drafts survive), `app/chat/[agreementId].jsx:100` (composer state inside `MessageComposer`) | User types an entry or a report and presses F5, or the tab is restored after a crash | The form is gone; no warning was shown | On the web the refresh/close gesture is one keystroke away, and this app is demoed on the web | A `beforeunload` guard while a dirty form is mounted, and/or the same in-memory draft store as H2 | harden |
| H11 | P2 | Validation errors are not announced on native and focus is not moved to the first failure | `components/AppInput.jsx:60-112` (`aria-invalid`/`aria-describedby` are web-only; the error `AppText` has no live region), callers: `app/report.jsx:60-70`, `app/edit-profile.jsx:255-270`, `app/(auth)/register.jsx:262-268` | VoiceOver/TalkBack user taps "Salva" with a missing field | Nothing is announced; the message is drawn under a field that may be off-screen | The error surface is reachable by sight only; the audit already fixed the *web* half (F14) and left the native half | `accessibilityLiveRegion="polite"` + `aria-live` on the error `AppText`, `accessibilityHint` linking field to error, and a focus/`accessibilityFocus` move to the first invalid field on submit | harden |
| H12 | P2 | The "person to report is missing" empty state's only action is `router.back()` | `app/report.jsx:88-96`, `components/BackButton.jsx:21` (same pattern on every secondary route) | A bookmarked or pasted `/report` (no params, no history), or `/user/abc` | "Manca la persona da segnalare" with a "Torna indietro" that does nothing on a fresh tab | A button that cannot act is the same defect class as F01/F07 the repo has been fixing | `router.canGoBack() ? back() : replace('/')` (or `/agreements`), in `BackButton` and in the two empty states that call `back()` directly | harden |
| H13 | P2 | Success and error banners that cannot be dismissed, against the F46 rule | `app/(tabs)/match.jsx:222-224` (`outcome` and `actionError` have no `etichettaAzione`), `app/staff.jsx:410-421` (`message`, `actionError`) | Queue created or cancelled, then the user stays on the tab | "Coda annullata: … Il credito della coda è tornato disponibile." stays on screen and reads as if it just happened again | The rest of the app made every outcome dismissible on purpose; two screens kept the old shape | Add "Ho capito" to the success banner and keep the error banner tied to its action (retry where one exists) | polish |
| H14 | P2 | The unread badge can stay above zero with nothing to read, and auto-read failures are invisible | `hooks/useNotifications.js:23-30` (`NOTIFICATIONS_MAX_PAGES = 5`), `:181-206` (per-row `PATCH` failures only `console.warn`) | Account with more than 100 notifications and unread rows beyond page 5; or every `PATCH read` failing | Badge says "3 da leggere", the panel shows only read rows, closing it does not clear the badge | A number the user cannot satisfy is a permanent invitation to keep opening an empty inbox; the failure is swallowed although `AGENTS.md` says to surface errors | Keep the cap but tell the truth in the panel ("ci sono altre notifiche da leggere oltre le prime 100") and surface a failed auto-read as a row state, not a console line | clarify |
| H15 | P2 | Consequence of cancelling an exchange is stated only on the queue side | `components/AgreementCard.jsx:130-141` vs `components/QueueCard.jsx:74-84` | Cancelling an `ACCEPTED` exchange born from a queue also closes the queue and moves a credit (`Backend/src/Manager/AgreementManager.php:181-196`, verified) | "Lo scambio con @X diventa annullato: non potrà più essere completato." — nothing about the queue or the credit | The queue card promises the credit back, the agreement card stays silent about the same money; two confirmations for one action, one of them incomplete | Add the queue/credit sentence to the agreement confirmation when the row is queue-born (the normalised agreement already carries `fromQueue`) | clarify |
| H16 | P3 | Per-user state is not cleared when the token changes, only on unmount | `hooks/useChat.js:82-88`, `hooks/useAgreements.js:90-101` (`esegui` keeps `accordi`), `hooks/useNotifications.js:96-186` | Somebody signs out and back in as another account without the tab unmounting (a future change, or a remount ordering change) | Up to one render of the previous account's rows | Today it is masked by the `Stack` swap in `app/_layout.jsx:100-110`; the guard is one line per hook | Key the state on `token` (or reset inside the effect that already depends on it) | harden |
| H17 | P3 | A chat open while the app is backgrounded can stay stale | `hooks/useChat.js:190-199` (interval inside `useFocusEffect`, no `AppState`) | User switches to WhatsApp for ten minutes and comes back to the chat | New messages may take up to `CHAT_POLL_MS` (60 s) to appear, while the badge updated instantly | The badge and the stream already wake on `AppState`; the chat is the one live surface that does not | Add the same `AppState` listener used in `useUnreadCount` (`hooks/useNotifications.js:333-343`) | harden |
| H18 | P3 | Unbounded lists outside the paged ones | `app/(tabs)/agreements.jsx:271-285` (every agreement, one unpaged `GET`), `app/user/[id].jsx:110-125`, `components/NotificationsSheet.jsx:113-130` (100 rows in a `ScrollView`), `components/ListSelector.jsx:41-46` + `services/data/province-comuni.json` (312 comuni, recomputed on every render of `FilterBar`/`EntryForm`, non-virtualised) | A heavy account (500 agreements) or a 312-row comune list on a low-end phone | Slow first paint, janky scrolling in the selector panel | Not reachable on the seed (7 agreements), reachable in a real month | Virtualise or cap the agreements list; memoise `comuniPerProvincia` per province | optimize |
| H19 | P3 | The entry-description cap (150) disagrees with the contract (255) and carries a TODO | `services/offer-request.js:18-22,215-217` vs `docs/api.md` "`description` up to 255 characters" | A user tries to write a 200-character description | The form refuses at 150 with no way to know the server would have accepted it | Two sources of truth for the same limit; when the DB column is confirmed the number has to change in one place anyway | Read the limit from the contract (or at least reconcile the two numbers and delete the TODO) | typeset |
| H20 | P3 | Length counting mixes UTF-16 units and code points | `services/offer-request.js:215` (`.length`), `services/staff.js:88` (`.length`) vs `validation/index.js:24-26,58` (`[...text].length`), and `maxLength` on every `AppInput` | A description or note written with emoji | The counter and the cap stop at roughly half the code points the server accepts | Emoji-heavy text is the common case for this product's audience | Use `countCharacters` everywhere the copy states a limit | harden |
| H21 | P3 | The catalog search field has no length cap | `components/FilterBar.jsx:322-336` | Paste 5 000 characters into the search pill | A very long query travels in the URL and is repeated in the empty-state title | Nothing breaks loudly, but a huge `q` is a server-side cost and an unusable heading | `maxLength` on the search input and a truncated echo in the empty state | harden |
| H22 | P3 | Session-expiry clock uses the device locale while every other date is `it-IT` | `auth/token-store.js:73-78` vs `services/dates.js:33,44` | Device set to English | "La sessione scade alle 5:20 PM." while every other date reads Italian | One formatting rule per concept (the repo's own D026 spirit) | `toLocaleTimeString('it-IT', …)`, one implementation used by banner and profile | typeset |
| H23 | P3 | `isTokenValid` depends on `globalThis.atob` accepting unpadded base64url | `auth/token-store.js:53-66` | An engine whose `atob` is strict about padding | `tokenExpiresAt` returns `null`, `isTokenValid` is false, and every start silently drops the session (no message by design, `auth/auth-context.jsx:38-52`) | Not observed on RN 0.88 here, and it fails "safe" (logout) — but the failure is invisible and would read as "the app forgets me" | Pad and normalise the payload explicitly before decoding, and accept `atob` absence as "cannot read expiry" rather than "expired" | harden |
| H24 | P3 | `DateField.jsx` is mounted nowhere | `components/DateField.jsx` | — | — | A date-input component sits in `src/components` with no consumer, in a product whose only dates are read-only backend facts | Delete it, or keep it with a note that the agreement sheet deliberately has no date input | distill |
| H25 | P3 | The Match create actions disappear when the profile read fails | `app/(tabs)/match.jsx:211-220` | `GET /profile` fails while `GET /get-queues` succeeds | The credit line and both creation buttons vanish; only a banner remains | `Promise.allSettled` was chosen so one answer does not throw away the other, and then the UI hides the usable half behind the failed one | Render the two buttons when the queue list is known; only the credit-dependent one needs the balance, and its own reason line already exists | harden |

### Notes on the P1s

- **H1** is the only place where the app offers a retry it knows cannot work:
  `isEndpointUnavailable(err)` exists for exactly this and is consulted by
  `usePagedList` alone. `app/user/[id].jsx` already models the right behaviour
  (`404` → `EmptyState`, no action) and can be copied.
- **H2** and **H10** are the same defect at two time scales: the app has no
  notion of "unsaved work lives here". `edit-profile` proves the pattern works
  (`bozzaInterrotta`, owner-scoped, in memory); the fix is to promote it, not to
  invent a second one.
- **H3**, **H4**, **H5** and **H6** are all "an irreversible thing happens on one
  tap and the feedback is missing or the work is lost". The repo already has the
  vocabulary: `ConfirmModal`, `azioneInCorso`, `esito`. The gaps are wiring, not
  design.
- **H5** deserves a word on honesty: the copy "Una coda di ricerca costa un
  credito." is correct and visible; the problem is the missing confirmation
  step, not the wording.

---

## 3. Four-state matrix

`ok` = the state exists and says something true. `GAP` = the state is missing or
misleading, with the nearest thing the user actually sees.

### Routes

| Route | Loading | Empty | Error | Loaded | Notes |
| --- | --- | --- | --- | --- | --- |
| `/` Servizi | ok (`index.jsx:186-206`, live region) | ok (two variants: with and without filters) | ok (Banner + retry inside the header; rows kept) | ok | Categories failing is a third, separate state (`FilterBar`) and it degrades correctly |
| `/match` | ok (`match.jsx:191`) | ok (`:200-206`) | ok for the list; **GAP** for the profile: credit line and both create buttons disappear (`:211-220`) | ok | Success/error banners not dismissible (H13) |
| `/offer-and-request` | ok (full screen only on first load) | ok per section (`PublicationsSection:183-190`) | ok (Banner + retry; sections refuse to draw "you published nothing" while the list failed) | ok | Categories failing is its own card with retry; saving keeps the typed text |
| `/agreements` | ok per section and in the bell panel | ok per section, distinct copy per section | ok (Banner + retry); **GAP** inside the bell panel: action failures render behind the panel (H4) | ok | Counts are `null` until data arrives, never an invented zero |
| `/profile` | ok | n/a (bio absent is stated as "Nessuna bio.") | ok (Banner + retry); **GAP** on `403`: generic permission copy (H7) | ok | Broken profile image is an explicit state (`:252-258`) |
| `/edit-profile` | ok | n/a | ok for load and for save (form kept) | ok | **GAP**: after a failed load the form is empty and editable, so a blind save can clear a field |
| `/chat/[agreementId]` | ok (`LoadingScreen` before the first answer) | ok (empty conversation, different copy when closed) | ok for history and for send (draft kept); **GAP**: retry on `404` (H1) | ok | Closed exchange replaces the composer with the read-only fact and a way out |
| `/user/[id]` | ok | ok ("Nessuna pubblicazione" above a summary) | ok, and `404`/`403` are two different sentences with no retry | ok | The model to copy for H1 |
| `/report` | n/a (no read) | ok (missing params) | ok (Banner + retry inside the confirm) | ok (success card replaces the form) | **GAP**: the empty state's action is `router.back()` (H12); no session guard, so an expired session unmounts the screen and drops the typed reason (H2) |
| `/staff` | ok (full screen only until the first page) | ok per list, with filter-aware copy | ok per list; endpoint-unavailable is a state of its own (operations log) | ok | **GAP**: review note lost on failure (H6) |
| `/staff-users` | ok | ok, with server-vs-local filter distinction | ok for the list and for "load more" | ok | Count row reads the payload total |
| `/login` | ok (button busy) | n/a | ok (one generic message by design) | n/a | The expiry reason is shown here (F25) — and only here |
| `/register` | ok | n/a | ok (banner above the button; per-field errors) | n/a | A `400` cannot name a field (`docs` TODO on the backend side) |
| `+not-found` | n/a | ok | n/a | ok | Recovery respects session state |

### Overlays

| Overlay | Loading | Empty | Error | Loaded | Notes |
| --- | --- | --- | --- | --- | --- |
| `ServiceDetailModal` | n/a (pure props) | n/a | ok inline for the proposal (`:330-340`) | ok | "Segnala" and "Invia proposta" disable themselves when the owner id is missing, with a reason line — the right pattern |
| `UserServicesMiniCard` (inside the detail) | ok | ok | ok: `404`, `403` and a real failure are three different sentences | ok | Best-in-class example of H7 done properly |
| `NotificationsSheet` | ok (live region, `NotificationsSheet:88-104`) | ok | ok (Banner + retry above the rows) | ok | Delete is confirmed; auto-read on close is invisible (H14) |
| `BellPanel` (proposte ricevute) | ok | ok | ok for the list; **GAP** for accept/refuse (H4) | ok | Accept/refuse behind `ConfirmModal` with honest copy |
| `ConfirmModal` (generic) | n/a | n/a | n/a (the caller owns the error) | ok | Stacked-panel Escape handling is correct |
| `AgreementFormModal` ("Crea accordo") | n/a | n/a | ok (field-level, panel stays open, text kept) | ok | Closes only after `onInvia` resolves |
| `AgreementSheet` read/confirm | n/a | ok (missing sheet draws nothing) | ok inline ("Non è stato possibile confermare la scheda") | ok | Both confirmations state that the action is final |
| `ReportReviewSheet` + confirm | n/a | ok (outcome unset is a validation error) | **GAP** on submit failure: the draft is dropped (H6) | ok | `onAnnulla` restores the draft; the failure path does not |
| Staff report detail / operation detail | ok (`RefreshNotice`) | n/a | ok ("Dettagli non aggiornati" + retry, list row kept) | ok | The right "stale but readable" shape |
| `CategorySelector` / `ListSelector` panels | ok (four field states: loading/ready/empty/error) | ok ("Nessun risultato.") | ok (field text: "Categorie non disponibili", field disabled) | ok | A selector that cannot work is disabled and says why |
| Restore / suspend / promote confirms | n/a | n/a | ok (banner on the screen behind, sheet closed) | ok | Note: closing the sheet on failure is fine here because nothing typed is lost |
| `FilterBar` panel (inline) | partial: "Sto caricando le categorie…" while the catalog keeps working | ok | ok (categories failing does not break text/location filters) | ok | The only place where a degraded dependency is explicitly allowed to degrade |
| `SessionExpiryBanner` | n/a | n/a | n/a | ok (announced, no fake action) | Informational by decision; it is the visible half of H2 |

---

## 4. Top 5 to fix before shipping (ordered)

1. **H2 — do not lose typed work on a mid-session `401`.** The token lives one
   hour and cannot be renewed, so the expiry is not an edge case: it is a
   scheduled event during any long session. Promote the `edit-profile` draft +
   `ritorno` mechanism to report, chat, agreement sheet and entry forms. This is
   the only finding that destroys user-generated content outright.
2. **H1 — stop offering retries that cannot succeed.** One branch in
   `useChat`/`chat/[agreementId]` and one in the agreements panel; the terminal
   `404` state already exists elsewhere in the codebase. Cheap, and it removes the
   most visible "the app is broken" symptom a demo can produce.
3. **H4 + H6 — make irreversible actions report their failures where the user
   is looking.** The bell panel must show `actionError` inside itself; the staff
   review `catch` must restore the draft. Both are one-line-ish fixes with a
   large honesty payoff.
4. **H5 — confirm the credit spend.** One `ConfirmModal` on the "Ricerca" queue,
   naming the cost and the balance. It is the only action in the product that
   moves money and the only irreversible one without a confirmation.
5. **H3 — close the double-send window.** A ref guard in `useChat.invia`; a
   duplicate message in a negotiation is worse than a duplicate row, and the
   composer's render-time gate cannot protect a same-frame double tap.

Then, in the same hardening cycle if time allows: **H7** (the `403` sentence) and
**H8** (offline) — both are copy-plus-one-listener work that makes every other
failure legible.

---

## 5. What is genuinely solid and should not be touched

- **The error vocabulary in `src/api`.** Every status is mapped to one Italian
  sentence with a cause and a way out (`api/client.js:24-60`); the server's
  English text is kept in `ApiError.raw` for the log and never reaches a screen.
  Per-area tables (`agreements`, `staff`, `chat`, `queues`, `services`, auth)
  override only the statuses they can actually produce. This is the single reason
  the app already scores 3 and not 2.
- **Loading vs loaded-and-empty.** Every list keeps `null` as "we have not read
  it yet" (`useAgreements`, `useNotifications`, `usePagedList`,
  `useServiceCatalog`, `useUserServices`) and refuses to draw a zero it has not
  seen. Counts in the agreements tabs and the bell badge are `null` until an
  answer arrives — do not "simplify" that to `0`.
- **Out-of-order and unmount guards.** `requestSeqRef` in every read hook plus
  the deliberate `finally` handling in the two `useFocusEffect` cleanups
  (`useAgreements:74-90`, `useServiceCatalog:145-160`) is a subtle, correct
  pattern that is easy to break in a refactor. Same for the "one request at a
  time, plus at most one queued" rule in `useNotifications:96-150`.
- **No optimistic writes anywhere.** Every mutation re-reads its list instead of
  drawing a state the server has not confirmed (`useChat`, `useAgreements`,
  `useNotifications`, `report`, `offer-and-request`). There is therefore nothing
  to roll back — a property worth protecting.
- **Confirmation before irreversible actions** is the house rule and is honoured
  on agreements (accept, refuse, cancel, sheet confirm, sheet refuse), queue
  cancel (with honest per-case copy), staff review, staff restore, staff suspend,
  report submit and notification delete. H5 is the single exception.
- **The stream's lifecycle.** One connection per app, cursor owned by the client,
  backoff with a ceiling, no retry on `401`, no connection while backgrounded,
  idle watchdog independent of the 10 s `apiFetch` timeout, and frames treated as
  "re-read", never as payloads (`api/stream.js`, `hooks/useEventStream.js`). The
  per-consumer predicates keep screens from knowing about each other.
- **`ModalShell`.** Focus moved in and restored, Tab trapped, Escape closing only
  the top of a stack, non-dismissable while a call is in flight, body-only
  scrolling at 85 % height. This is the accessibility surface most apps get
  wrong; here it is one implementation used by every panel.
- **`Screen`, `Banner`, `EmptyState`, `AppButton`, `AppInput`.** One shape each,
  live regions on the error and loading surfaces, `aria-*` mirrored beside
  `accessibilityState` for web, 44 pt targets, no fixed widths on text.

---

## How this was verified

- Full read of `src/api/**` (client, config, stream, normalisers, all 7 area
  modules), `src/auth/**`, all of `src/hooks/**`, `src/services/**` (agreement
  classification, offer/request rules, staff rules, validation), every file in
  `src/app/**`, and the components named in the tables.
- Live `curl` probes on the already-running stack (no start/stop):
  - `GET /api/profile` without a token → `401 {"code":401,"message":"JWT Token not found"}`
  - `GET /api/profile` with a garbage token → `401 {"code":401,"message":"Invalid JWT Token"}`
  - `GET /api/notifications?foo=1` (token) → `400 {"error":"The request contains an unknown query parameter."}`
  - `GET /api/staff/users?role=BOGUS` (token) → `400 {"error":"Role must be USER or STAFF."}`
  - `GET /api/users/999999/services` (token) → `404 {"error":"User not found."}`
  - `GET /api/chats/agreement/999999` (token) → `404 {"error":"Chat not found."}` (evidence for H1)
  - `GET /api/get-queues` (token) → `200` with `queues: []`-shaped payload, so the
    `404 → []` special case in `api/areas/queues.js:44-49` is now dead but
    harmless
  - `OPTIONS /api/profile` with an `Origin` → `204` with the CORS headers, so the
    web preflight path is intact
- Not verified, and stated as such: anything that needs a browser, a device or
  a native engine (rendered overflow at 200 % zoom, VoiceOver/TalkBack
  announcements of H11, `SecureStore` behaviour of H9 on native,
  `globalThis.atob` strictness of H23, `AppState` behaviour of H17).
- Environment note, low confidence: in this sandbox `http://localhost:8000` timed
  out while `http://127.0.0.1:8000` answered immediately, with both stacks
  listening. It did not reproduce as an app problem (`api/config.js` derives the
  host from `window.location.hostname` on web and from the dev-server host on
  native), but it is worth remembering before blaming the app for a hung request
  during a demo.

---

## Backend gaps that surface as user-facing dead ends (brief §8)

`docs/backend-ledger.md` declares **no open gap** (every G id is closed,
superseded or retracted), so there is no screen left with a button that waits for
an endpoint that does not exist. What remains are the ledger's own "Residual
limits", and each one costs the user something:

| Residual limit | Where it is felt | What the user cannot do |
| --- | --- | --- |
| No bulk "mark all read" (`PATCH /notifications/{id}/read` only) | closing the inbox fires one `PATCH` per unread row | with 100+ unread rows, closing the panel is slow and partially fails silently (H14) |
| The inbox reads at most 5 pages (`NOTIFICATIONS_MAX_PAGES`) | profile badge | a badge above zero that nothing on screen can explain or clear (H14) |
| No pagination on `GET /get-agreements` | agreements tab | a heavy account renders every row at once (H18) |
| The stream carries only tables that write a notification | catalog, public profile, staff lists | those screens only refresh on focus/pull; nothing tells the user the data is a snapshot |
| No token renewal | every screen, at the 1 h mark | the session ends and work in progress is lost (H2); the banner can only announce it |
| `POST /create-service-queue` charges a credit with no eligibility query (`G15` superseded, `canRequestQueue` gone) | Match tab | the spend cannot be previewed server-side; the client confirms from `profile.credits` alone (H5) |
| `POST /cancel-queue` answers `200` even when nothing happened (`G21`, idempotent) | Match tab | a cancel that did nothing looks like success; the list reload is the only truth |
| `409` on a status-only `PATCH` or any `DELETE` of an own service | not reachable from the UI (the controls are not drawn) | nothing — correctly handled by not offering the action |
