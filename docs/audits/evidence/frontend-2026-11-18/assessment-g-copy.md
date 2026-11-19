# Assessment G — `/impeccable clarify`: UX copy, labels, error messages

**Repo:** `C:/Users/Andrea/Desktop/projects/ProjectWork`
**Scope read:** every user-visible Italian string in `Frontend/src` — `app/` (all 12 routes), `components/` (49), `services/`, `hooks/`, `validation/`, `api/areas/` + `api/client.js` error tables, `navigation/`.
**Method:** `~/.agents/skills/impeccable/reference/clarify.md` applied against the vocabulary contract in `AGENTS.md` (one word per concept, structure English / contract Italian) and `docs/DESIGN.md` (`PageHeader`: one sentence that says **what** the screen holds, never how to use it).
**Constraints honoured:** source-level only, read-only, no git, no edits outside this file.

---

## 1. Verdict — 3 / 4

Copy here is unusually disciplined for a project of this age: zero exclamation marks, zero emoji, no "clicca qui", no `OK`/`Conferma`/`Invia` generic confirms, backend English and enum values are mapped to Italian sentences, and most destructive flows already name the consequence before the tap. What keeps it at 3 and not 4 is vocabulary, not tone: the same object is called **Ricerca** and **Richiesta**, the delivery sheet is called **scheda** and **accordo** (and its own button is a bare noun, `Accordo`), "the exchange" is **scambio** in prose and **accordo** in the tab, and five high-stakes labels state the object instead of the outcome.

---

## 2. Findings

Priority: **P1** = a user decides, spends, or loses something on wrong information · **P2** = friction, ambiguity, or wrong register · **P3** = polish.

### Global — the words the whole app borrows

| P | file:line | current string | problem | proposed replacement | command |
| --- | --- | --- | --- | --- | --- |
| P2 | `api/client.js:17` (used in 12 screens) | `Qualcosa non ha funzionato. Riprova.` | Last-resort fallback: names nothing, so it can be acted on only by blind retry. Acceptable as a floor, but it is currently reached by every non-`ApiError` throw (e.g. `match.jsx:94`, `chat/[agreementId].jsx:117`), so it is the visible message in more states than it should be. | `Non sono riuscito a completare l'operazione. Riprova.` and, per surface, prefer the specific sentence (`Non ho potuto creare la coda`, `Non ho potuto aprire la chat`). | clarify |
| P2 | `api/areas/agreements.js:12`, `api/areas/chat.js:61`, `api/areas/chat.js:72`, `app/edit-profile.jsx:41`, `components/UserServicesMiniCard.jsx:109` | `Il server non ha accettato la scheda: riprova, e se l'errore resta segnalalo.` / `…il server non lo mostra a un account inattivo.` | "il server" is the machine talking about itself. Nobody outside the team can act on "the server"; and "segnalalo" names no channel, so the recovery it promises does not exist. | `La scheda non è stata accettata: riprova.` · `La chat non si è caricata: riprova.` · `Il messaggio non è partito: riprova.` · `L'indirizzo dell'immagine non è valido: controlla che cominci con https:// e che porti a un'immagine.` · `Il tuo account non è attivo, quindi non vedi le pubblicazioni degli altri: chiedi alla staff di riattivarlo.` | clarify |
| P2 | `api/areas/queues.js:21-22` | `Crediti insufficienti: una coda di ricerca costa un credito e il saldo è a zero in app.` | "in app" — as opposed to where? The qualifier exists for the developer (there is no balance endpoint), not for the reader. | `Crediti insufficienti: una coda di ricerca costa un credito e il tuo saldo è a zero.` | clarify |
| P2 | `app/(tabs)/index.jsx:213` vs `app/(tabs)/index.jsx:279`, `app/staff.jsx:438` | `Ricarica` / `Riprova` / `Ricarica` | Two verbs for one recovery gesture. `Riprova` is used 8× for a failed request, `Ricarica` 2× for the same failure. | One word: `Riprova` everywhere the previous attempt failed; keep `Aggiorna` only for the web chrome control (`components/WebNavMenu.jsx:350`), which is a different act. | clarify |
| P2 | `app/staff.jsx:462`, `app/staff-users.jsx:371`, `components/StaffDeletedServicesSection.jsx:153`, `components/StaffOperationsLog.jsx:161` | `Carica altri 20` | The page size is hard-coded in copy while the source of truth is `STAFF_PAGE_SIZE = 20` (`app/staff.jsx:52`); the visible label says "20" and the accessible name says "venti", so the same number is spelled two ways. The catalog says plain `Carica altri` (`app/(tabs)/index.jsx:226`). | `Carica altri` (visible) + `Carica altri risultati` (accessible), or `Carica altri 20` in both channels with the number interpolated from the constant. | clarify |
| P2 | `app/(tabs)/index.jsx:345`, `app/(tabs)/offer-and-request.jsx:314`, `app/(tabs)/profile.jsx:197`, `app/(tabs)/agreements.jsx:232`, `app/staff.jsx:416`, `app/staff-users.jsx:332`, `app/(auth)/login.jsx:86` | `etichettaAzione="Ho capito"` | Seven success/info banners are dismissed by a **button that performs no action** and says the user has understood something they were never asked about. It also competes with the real action inside the same banner. | Drop the button and give `Banner` a close (X) with accessible name `Chiudi l'avviso`; if a button must stay, `Chiudi`. | distill |
| P3 | `api/client.js:44` vs `components/AgreementFormModal.jsx:21` etc. | `L’operazione è in conflitto…` (curly) vs `l'errore` (straight) | Both apostrophes live in the same product; `’` appears in ~15 strings, `'` in ~40. | Pick `’` for prose, `'` only inside code/identifiers, and normalise on next touch of each file. | polish |

### Access — login and registration

| P | file:line | current string | problem | proposed replacement | command |
| --- | --- | --- | --- | --- | --- |
| P2 | `app/(auth)/register.jsx:325` | `Bastano pochi dati per iniziare a scambiare servizi.` | Factually false: the form asks for name, surname, username, email, password, provincia, comune **plus** an offer and a request. Also a promotional line where the header owes a "what this screen holds". | `I tuoi dati, la tua offerta e la tua ricerca: con queste entri nel match.` | clarify |
| P2 | `app/(auth)/register.jsx:448` | `Per attivare il pulsante completa i dati obbligatori, comprese la tua offerta e la tua ricerca.` | Explains a disabled control instead of naming what is missing, and invents a "required" marker that the form never displays on any field (no field is marked required, no field is marked optional — `docs/DESIGN.md` has no rule for it either). | Enumerate the gaps: `Manca: la categoria e la descrizione della tua offerta.` (built from the existing `validaAnagrafica`/`validaVociRegistrazione` result). | clarify |
| P2 | `app/(auth)/register.jsx:407` | `La vedono le persone che ti contattano.` | Pronoun with no antecedent in the paragraph — the nearest feminine noun is "Provincia"/"località", and the sentence sits under **Comune**. | `La località la vedono le persone che ti contattano.` | clarify |
| P2 | `app/(auth)/register.jsx:440` vs `:322` vs `app/(auth)/login.jsx:131` | `Crea account` / `Crea il tuo profilo` / `Registrati` | Three names for one act, and the screen title and its own primary button disagree ("profilo" vs "account"). | Title `Crea il tuo profilo` (keep), button `Crea il profilo`, link `Registrati` (keep — a link is a different register). | clarify |
| P3 | `app/(auth)/login.jsx:76,90` | `Username` / `Password` | English nouns inside Italian sentences (`Inserisci l'username.`). Kept as-is by a deliberate call, but it is the only place where an English word is a form label. | Acceptable; if touched, `Nome utente` / `Password`. | polish |

### Home catalog

| P | file:line | current string | problem | proposed replacement | command |
| --- | --- | --- | --- | --- | --- |
| P2 | `components/FilterBar.jsx:260-263` | `Nessuna scelta: tutti i servizi. Provincia e comune restringono la località, la modalità l'ambito («Tutti» non restringe).` | Documentation prose inside the UI. "l'ambito" is a word this product never defines, and the "«Tutti» non restringe" parenthetical exists to correct the previous clause — a sentence that has to correct itself is not readable. | `Senza filtri vedi tutti i servizi. Provincia e comune cambiano il luogo, la modalità cambia come si svolge.` | clarify |
| P2 | `components/FilterBar.jsx:246` | label `Modalità` with options `Tutti` / `Solo da remoto` / `Solo in presenza` | "Modalità" names the axis, not the fact; the app's own name for this fact is "da remoto / in presenza" (`services/offer-request.js:296`). | label `Come si svolge`; options `Tutte` / `Solo da remoto` / `Solo in presenza`. | clarify |
| P3 | `components/FilterBar.jsx:333` | `Azzera` | Verb with no object; the accessible name (`Azzera tutti i filtri`) is right, the visible one is not. | `Azzera i filtri` | clarify |
| P3 | `components/ServicesSection.jsx:71` | `3 di 12 servizi · pagina 1 di 2` | Two counters for one fact ("3 di 12" already implies the page split), and "3 di 12 servizi" reads as a quantity of a whole rather than "3 loaded". | `12 servizi · 3 mostrati` and drop `pagina N di M` (the pager already sits at the foot). | typeset |
| Good | `app/(tabs)/index.jsx:167`, `:211-214`, `:26-31` | `Carico i servizi…` / `Nessun servizio attivo` / `Quando qualcuno pubblica un servizio, lo troverai qui: per ora nessuno ne ha pubblicati.` / the area-filter note | Specific loading name, an empty state that says what would fill the space and offers one real action (`Ricarica`), and an honest note about pre-16/10 rows. Nothing to change except `Ricarica` → `Riprova` for consistency. | — | — |

### Offro e cerco (own publications)

| P | file:line | current string | problem | proposed replacement | command |
| --- | --- | --- | --- | --- | --- |
| P1 | `services/offer-request.js:172-174` | `1 di 1` (rendered beside `Cosa offro` / `Cosa cerco`) | A ratio with no unit and no referent. Under a rule of exactly one item per type it is always `1 di 1`, so the line carries no information at all. | Hide the counter when `voci.length === LIMITE_VOCI`; otherwise `1 offerta su 1 consentita`. | clarify |
| P2 | `components/EntryEditor.jsx:95` | label `Mansione` | HR jargon for the free-text description of a service; the same datum is called `descrizione` in the catalog, in the detail panel, in the sheet and in the chat (`ServiceCard.jsx:88`, `ServiceDetailModal.jsx:141`, `AgreementSheet.jsx:102`). | `Descrizione` (and `Descrivi la mansione.` → `Descrivi il servizio.` in `services/offer-request.js:213`; `Mansione non indicata` → `Descrizione non indicata`). | clarify |
| P2 | `components/EntryForm.jsx:90` and `:103` | placeholder `Tutte le province` / `Tutti i comuni` | Filter wording on a create/edit form: "tutte le province" answers a question nobody asked while filling a publication, and it reads as an applied filter rather than a prompt. The same component pair uses `Scegli la provincia` in registration. | `Scegli la provincia` / `Scegli il comune` (and `Tutti i comuni` → `Scegli il comune` when the province is set). | clarify |
| P2 | `components/EntryForm.jsx:111-114` | `La località è facoltativa e si completa scegliendo il comune: nel profilo appare come Comune - Provincia.` | Two errors in one line: it says "nel profilo" while the value appears on the **service card** and in the catalog, and it calls the location optional on a screen whose registration twin makes it mandatory. | `Se scegli anche il comune, la località del servizio sarà «Comune - Provincia».` | clarify |
| P2 | `components/PublicationsSection.jsx:31` and `:43` | `Seleziona «Aggiungi» per iniziare.` | Tells the reader to press a control that may be disabled (categories not ready) and that disappears once the entry exists, instead of saying what would fill the space. "Seleziona" is a pointer gesture. | `Qui comparirà l'offerta che pubblichi: cosa sai fare e in che modo.` (and the mirror for `Cosa cerco`). | clarify |
| P2 | `components/PublicationsSection.jsx:25-26` | `Sono i servizi che sai fare: con la categoria giusta gli altri ti trovano nella home.` | "nella home" leaks the navigation model and an English word; "con la categoria giusta" is an instruction. | `I servizi che sai fare, con la categoria con cui gli altri ti trovano.` | clarify |
| P2 | `components/PublicationsSection.jsx:38` | `Sono le cose che ti servono: dicono al sistema chi può scambiare con te.` | "al sistema" — the machine again; and the second clause describes the backend, not the benefit. | `Le cose che ti servono: dicono agli altri cosa possono offrirti in cambio.` | clarify |
| P2 | `services/offer-request.js:216` | `Massimo 150 caratteri.` | Names neither field nor the current count, and is the only validator phrased as a bare fragment; the module's other messages say `La descrizione può avere al massimo N caratteri.` (`validation/index.js:54`) or `La password deve avere almeno 8 caratteri.` | `La descrizione può avere al massimo 150 caratteri: ora sono {n}.` | clarify |
| P2 | `app/(tabs)/offer-and-request.jsx:59-60` | `Modifica salvata.` | The confirmation of editing an **offer** or a **research** says neither which one nor what changed — while its sibling branch says `Offerta pubblicata.` | `Offerta aggiornata.` / `Ricerca aggiornata.` (reuse the same `nome` already computed on line 55). | clarify |
| P3 | `components/PublicationsSection.jsx:24,37` vs `components/EntryEditor.jsx:50,54` | `Cosa offro` / `Cosa cerco` vs `Cosa offri` / `Cosa cerchi` | The same two sections change grammatical person between two screens (first person on my own list, second person in the form). | Second person in both: `Cosa offri` / `Cosa cerchi`. | clarify |

### Match (queues and credits)

| P | file:line | current string | problem | proposed replacement | command |
| --- | --- | --- | --- | --- | --- |
| P1 | `app/(tabs)/match.jsx:262` and `:272` | button labels `Offerta` / `Ricerca` (accessible: `Crea una coda per la tua offerta` / `…ricerca`) | A noun does not say what pressing does — and this is the screen where the search button **spends a credit**. Visible label and screen-reader name also say different things. | `Crea coda di offerta` / `Crea coda di ricerca`, with the accessible name identical to the visible label. | clarify |
| P2 | `app/(tabs)/match.jsx:47-48` | `Una coda è un servizio che metti in attesa: il match automatico confronterà le tue code con quelle della tua località. Creane una con i due pulsanti qui sotto.` | Contains a definition, a promise about the matchmaking, and a positional instruction ("i due pulsanti qui sotto") that is false whenever the profile call failed — the buttons render only with `profile !== null` (`:213`). | `Una coda mette in attesa un tuo servizio: il match la confronta con le code della tua località.` (drop the positional clause; the buttons are directly below, or absent, and the empty state survives both). | clarify |
| P2 | `app/(tabs)/match.jsx:142` | `Coda di offerta creata.` / `Coda di ricerca creata.` | Fine as far as it goes, but it never says the search queue just spent a credit — the cost is stated **before** the tap (`:22`) and the refund is stated on cancel (`:168`), so the charge itself has no confirmation. | `Coda di ricerca creata: un credito è stato speso.` / `Coda di offerta creata.` | clarify |
| Good | `app/(tabs)/match.jsx:29`, `components/QueueCard.jsx:69-74` | `Hai già una coda attiva: annullala per poterne crearne un'altra.` / the three cancel consequences (agreement goes too, credit returns) | Textbook: the reason a control is off, and three consequences for three different cases, each naming what disappears. Leave. | — | — |

### Accordi

| P | file:line | current string | problem | proposed replacement | command |
| --- | --- | --- | --- | --- | --- |
| P1 | `app/(tabs)/agreements.jsx:71-73` | `Quando una proposta viene accettata, lo scambio compare qui: da qui apri la chat, e la scheda dell'accordo si scrive dentro la chat.` | The empty state of "In corso" spends two clauses on navigation instructions and none on what the space will hold; "si scrive dentro la chat" is also wrong for the reader — the sheet is written from a button (`Crea accordo`), not from the conversation. | `Qui compaiono gli scambi accettati: chi, cosa, e la chat per accordarvi sui dettagli.` | clarify |
| P1 | `app/(tabs)/agreements.jsx:256-262` | title `Caricamento non riuscito`, description `Gli accordi di questa sezione non sono arrivati: usa «Riprova» in alto.` | The retry lives in a different element, several blocks above; the message tells the reader to go find it, and repeats the banner's fact. `docs/DESIGN.md` asks the error to carry its own retry. | `Gli accordi non sono arrivati.` + `etichettaAzione="Riprova"` / `onAzione={riprova}` on the `EmptyState` (the prop already exists). | clarify |
| P1 | `components/AgreementCard.jsx:129-133` | `Lo scambio con @x diventa annullato: non potrà più essere completato.` | "diventa annullato" is not Italian for this act; and the sentence never says whether the chat and the sheet survive, which is the reader's actual question. | `Annullando, lo scambio con @x si chiude: non si potrà più completare. La chat e la scheda restano leggibili.` (verify the last clause against D028/D030 before shipping). | harden |
| P1 | `app/(tabs)/agreements.jsx:608` | `Accettando, lo scambio con @x diventa un accordo in corso: da qui non puoi più cambiare risposta.` | Names the object twice with two words in one sentence ("lo scambio … diventa un accordo") — the reader cannot tell whether those are two things. | `Accettando, lo scambio con @x passa in «In corso»: la risposta non si può più cambiare.` | clarify |
| P2 | `app/(tabs)/agreements.jsx:74-75, 79, 137` | tab `Conclusi` + section title `Conclusi` + accessible `Conclusi: 2 accordi` | The tab and the heading under it are the same word, so the heading adds nothing; the sibling tabs are `Inviate` vs `Proposte inviate` and `In corso` vs `Accordi in corso` — three different relationships between tab and title. | tab `Conclusi`, title `Accordi conclusi`; tab `Inviate`, title `Proposte inviate`; tab `In corso`, title `Accordi in corso`. | clarify |
| P2 | `app/(tabs)/agreements.jsx:82` | `Gli accordi rifiutati, annullati o scaduti restano qui; uno scambio accettato e già scaduto si può ancora annullare.` | Two names for the object in one sentence, plus a conditional that only applies to a subset the reader cannot identify. | `Restano qui gli accordi rifiutati, annullati o scaduti. Un accordo scaduto ma non ancora chiuso si può annullare.` | clarify |
| P3 | `app/(tabs)/agreements.jsx:542` and `components/AgreementCard.jsx:97` | `Controparte non disponibile` | "Controparte" is contract language, used nowhere else in the product; the app's own word is "la persona"/"l'altra persona" (`chat/[agreementId].jsx:208`). | `L'altra persona non è disponibile` | clarify |

### Chat e scheda dell'accordo

| P | file:line | current string | problem | proposed replacement | command |
| --- | --- | --- | --- | --- | --- |
| P1 | `app/chat/[agreementId].jsx:253` | button label `Accordo` (and `Crea accordo` while no sheet exists) | `Accordo` states a noun that already names the tab and the object; it does not say that pressing opens a panel. `Crea accordo` says it creates an accordo while it creates a **scheda** — the panel's own footer says `Invia la scheda`. | `Leggi la scheda` / `Scrivi la scheda` | clarify |
| P1 | `components/AgreementFormModal.jsx:93` and `app/chat/[agreementId].jsx:338` | panel titles `Crea accordo` / `L'accordo` | Two titles for two states of the same panel, and neither is the thing the panel holds (a sheet with dates, the service, and one free description). | `Scheda dell'accordo` for both states, and let the submit button carry the verb (`Invia la scheda`, already correct). | clarify |
| P2 | `app/chat/[agreementId].jsx:31` | `Messaggi dello scambio: accordatevi qui sui dettagli.` | The only subtitle in the app that reads as an instruction; it also repeats what the composer is for. | `I messaggi dello scambio con @{controparte}.` (the screen already knows the name — `:231` uses it in the sibling branch). | clarify |
| P2 | `app/chat/[agreementId].jsx:339` | `Le date e il servizio li ha scritti il sistema: qui restano da leggere, e da confermare se tocca a te.` | "il sistema", plus a how-to ("da leggere, e da confermare") on a panel whose content already says it. | `Le date e il servizio li ha scritti Baratto-lo; la descrizione è scritta da chi ha inviato la scheda.` — or drop the line. | distill |
| P2 | `app/chat/[agreementId].jsx:37-38` | `La scheda la scrive chi ha proposto lo scambio: la vedi qui appena arriva, e allora tocca a te confermarla.` | Three clauses to say "it is not yours to write yet", and it promises a state the reader cannot verify. | `La scheda la scrive chi ha proposto lo scambio: quando arriva, tocca a te confermarla.` | clarify |
| P2 | `components/AgreementFormModal.jsx:19` | `Scrivi la descrizione dell'accordo: è l'unica cosa che manca.` | "dell'accordo" while the field belongs to the **scheda**; and the API layer uses a different sentence for the same rule (`'Scrivi la descrizione dell'accordo: da 1 a 500 caratteri.'`, `api/areas/agreements.js:15`). | `Scrivi la descrizione della scheda: da 1 a 500 caratteri.` (one string, reused by both layers). | clarify |
| P2 | `components/AgreementFormModal.jsx:134` | `Servizio non disponibile: la scheda dirà comunque la descrizione che scrivi qui.` | "comunque" is doing the work of an explanation that never arrives, and the sentence reassures about a state the reader did not ask about. | `Il servizio non è disponibile: la scheda riporterà solo la descrizione che scrivi qui.` | clarify |
| Good | `components/AgreementSheet.jsx:150,168`, `app/(tabs)/agreements.jsx:604-615` | `Confermando, lo scambio si chiude alle date indicate e non si può ritirare.` / `La conferma è definitiva: non si può ritirare.` / `Accetta la proposta` / `Rifiuta la proposta` | Consequence stated before the control, the confirm button repeats the verb of the panel that opened it. This is the standard the rest of the app should match. | — | — |

### Segnala alla staff

| P | file:line | current string | problem | proposed replacement | command |
| --- | --- | --- | --- | --- | --- |
| P2 | `app/report.jsx:96-100` | `Questa schermata si apre dal dettaglio di un servizio, che porta con sé la persona da segnalare. Riapri la segnalazione da lì.` | Written for the developer: it explains how the route receives its parameter. The reader only needs the way back. | `Per segnalare qualcuno, apri uno dei suoi servizi e scegli «Segnala».` | clarify |
| P2 | `app/report.jsx:106-114` | heading `Segnalazione inviata` + Banner `La staff esaminerà la segnalazione.` + `Non riceverai un avviso nell'app quando la staff la esamina. La segnalazione non si può ritirare.` | One fact told three times, one of them inside a success banner that is not a transient notification. | Heading `Segnalazione inviata`; one line: `La staff la esaminerà, ma non riceverai un avviso qui nell'app. Non si può ritirare.` | distill |
| Good | `app/report.jsx:144,155-168` | `Una segnalazione per persona: non puoi segnalare due volte la stessa persona.` / `La segnalazione su X arriva alla staff e non si può ritirare.` / accessible `Invia la segnalazione alla staff su X` | Eligibility before submission, consequence before the tap, accessible name that survives out of context. Leave. | — | — |

### Area staff

| P | file:line | current string | problem | proposed replacement | command |
| --- | --- | --- | --- | --- | --- |
| P1 | `app/staff-users.jsx:397-406` + `services/staff-users.js:110` | title `Sospendere questo account?`, message `Cambiare lo stato di Mario Rossi da Attivo a Sospeso.` | The action removes the person's access to the whole platform and the confirmation never says so — it reports a status transition. Compare the promotion on the same screen, which does name the consequence (`:107`: `potrà esaminare le segnalazioni`). | `Sospendere l'account di Mario Rossi: non potrà più accedere né scambiare finché non lo riattivi.` | harden |
| P1 | `app/staff.jsx:527-533` and `:534` | `…Esito: ${statusLabel(outcome)}\nNota: …` and `Chiudi come «Conferma la segnalazione»` | The confirm borrows the **imperative choice label** (`services/staff.js:25-28`) where the outcome noun belongs, producing `Chiudi come «Conferma la segnalazione»` — ungrammatical, and "Esito: Conferma la segnalazione" reads as an instruction rather than a result. | `Esito: Confermata` / `Respinta` (i.e. `REPORT_STATUS_LABELS`, `services/reports.js:19-24`), and `Chiudi come «Confermata»`. | clarify |
| P2 | `services/staff-users.js:115` | `Il ruolo filtra tutto l'elenco, prima della paginazione.` | Internal implementation detail shown to staff as a helpful note. | `Il filtro per ruolo vale su tutti gli utenti, non solo su quelli già caricati.` | clarify |
| P2 | `components/StaffStatusBar.jsx:30` | `Non c'è nessuna segnalazione «in esame».` | Filters say `Aperte`/`In esame`/`Confermate`/`Respinte` (plural); the sentence quotes the singular adjective in guillemets, so the two never match. For `PENDING` it renders `«aperta»` while the pill says `Aperte`. | One sentence per filter: `Non c'è nessuna segnalazione aperta.` / `…in esame.` / `…confermata.` / `…respinta.` | clarify |
| P2 | `components/StaffReportCard.jsx:76` and `app/staff.jsx:533` | `Pratica chiusa: non ci sono azioni da fare.` / `Dopo la chiusura la pratica non si riapre.` | "pratica" is a third word for "segnalazione", used only on two lines of the same workflow. | `Segnalazione chiusa: non ci sono azioni da fare.` / `Dopo la chiusura la segnalazione non si riapre.` | clarify |
| P3 | `app/staff.jsx:368` | nav button `Utenti` (sibling `Segnalazioni`, `app/staff-users.jsx:239`) | The two staff screens navigate to each other through buttons labelled with the *other* screen's title — understandable, but the accessible names drift (`Apri gli utenti dell'area staff`). | Visible `Utenti` / `Segnalazioni` (keep); accessible `Apri l'elenco degli utenti` / `Apri l'elenco delle segnalazioni`. | clarify |
| Good | `components/StaffReportCard.jsx:88-116`, `app/user/[id].jsx:82` | `Prendi in carico` / `Esamina e chiudi` / `In esame da un altro membro dello staff.` / `Rivolgiti alla staff per riattivarlo.` | Verb labels, a reason for the missing action, and the product's own word for the team. Leave. | — | — |

### Profilo e modifica profilo

| P | file:line | current string | problem | proposed replacement | command |
| --- | --- | --- | --- | --- | --- |
| P2 | `app/(tabs)/profile.jsx:282` | heading `Il tuo profilo` inside the screen `Profilo` | The heading repeats the screen title inside a band that also holds the identity block above it. | `I tuoi dati` (the word the registration card already uses, `register.jsx:332`). | clarify |
| P2 | `app/(tabs)/profile.jsx:196` | `Modifiche salvate.` | Which modifications? After a redirect from a form with five fields, the confirmation names none. | `Profilo aggiornato.` | clarify |
| P2 | `app/(tabs)/profile.jsx` (PageHeader, `:193`) and `app/user/[id].jsx:66` | `PageHeader titolo="Profilo"` — no `frase` | The only two screens without the one sentence `docs/DESIGN.md` requires; every other screen has one. | profile: `Chi sei, cosa hai pubblicato e come ti raggiungono gli altri.` · public profile: `Chi è questa persona e cosa ha pubblicato.` | shape |
| P3 | `app/edit-profile.jsx:415` vs `validation/index.js:82-91` | label `URL dell'immagine`, errors `L'indirizzo dell'immagine deve iniziare con https://.` | Two names for the same value inside one card. | `Indirizzo dell'immagine` (label), keeping the existing error strings. | clarify |
| P3 | `app/(tabs)/profile.jsx:298` | `Nessuna bio.` | A value with a full stop in a field that reads `Bio: Nessuna bio.` — a sentence where the rest of the band shows data. | `Non hai ancora scritto una presentazione.` or drop the row. | clarify |
| P3 | `app/(tabs)/profile.jsx:326` vs `:345` | `Apri le notifiche` / `Apri la schermata Modifica profilo` | The two rows of the same card use two models for their accessible name ("what it opens" vs "where it goes"). | `Apri le notifiche` / `Apri Modifica profilo` | clarify |
| Good | `app/(tabs)/profile.jsx:300,383`, `app/edit-profile.jsx:479-481` and `:498-503`, `components/ConfirmModal.jsx:44` | `Sessione valida fino alle …` / `Il ruolo non è un'etichetta…` (Staff chip) / `Non salvo un indirizzo dell'immagine che non si carica.` / default `No, torna indietro` | State, not instruction; no internal enum on screen; the dismiss label can never be confused with the destructive confirm. Leave. | — | — |

---

## 3. Vocabulary — one word per concept

Canonical term on the left; every variant below is a real string in `Frontend/src`.

| Canonical | Variants found |
| --- | --- |
| **Ricerca** (the second type of service) | `Richiesta` — `components/AgreementSheet.jsx:19`, `components/AgreementFormModal.jsx:22` · `Cerca` (group title) — `components/UserServicesMiniCard.jsx:36`, `app/user/[id].jsx:113` · `ricerche`/`Ricerca` elsewhere (correct): `services/queues.js:19`, `components/EntryCard.jsx:45`, `components/StaffDeletedServicesSection.jsx:107` |
| **Offerta** | `Offre` (group title) — `components/UserServicesMiniCard.jsx:35`, `app/user/[id].jsx:106` |
| **Descrizione** (the free text of a service) | `Mansione` — `components/EntryEditor.jsx:95,99`, `components/EntryCard.jsx:64`, `components/StaffDeletedServicesSection.jsx:89`, `services/offer-request.js:213` · `note` rendered as `Descrizione` — `components/AgreementSheet.jsx:102` (fine) |
| **Accordo** (the record) | `scambio` naming the record — `components/AgreementCard.jsx:131,132`, `app/(tabs)/agreements.jsx:608`, `hooks/useAgreements.js:21,23`, `app/chat/[agreementId].jsx:283,284,310,311`, `components/QueueCard.jsx:69`, `app/(tabs)/index.jsx:337,338` · `Controparte` — `app/(tabs)/agreements.jsx:536`, `components/AgreementCard.jsx:97` |
| **Scheda (dell'accordo)** (the delivery sheet) | `accordo` used for the sheet — `app/chat/[agreementId].jsx:253,338`, `components/AgreementFormModal.jsx:93` · `scheda` (correct) — `components/AgreementSheet.jsx:110,140`, `app/chat/[agreementId].jsx:34,340` |
| **Segnalazione** | `pratica` — `components/StaffReportCard.jsx:76`, `app/staff.jsx:531` |
| **Staff** | `chi amministra il progetto` — `components/StaffAreaGate.jsx:31` · `membro dello staff` (`StaffReportCard.jsx:116`) is fine · `amministrazione` — none, good |
| **Persona** (a human in user-facing prose) | `utente` — `app/(tabs)/profile.jsx:160`, `services/offer-request.js:307` (fallback names) · `account` where the login is meant — `app/user/[id].jsx:80`, `app/staff-users.jsx:234` (acceptable) · `Utente` as a role chip — `services/staff-users.js:22` |
| **Credito** | `token` — `services/staff.js:109,111,112` (`Token creato`, `Scadenza del token cambiata`, `Token eliminato`) in the operations log; a session token shown to staff as a domain object |
| **Categoria non indicata** | `Categoria non disponibile` — `components/EntryCard.jsx:93`, `components/ServiceCard.jsx:57`, `components/ServiceDetailModal.jsx:189`, `components/StaffDeletedServicesSection.jsx:122` · `Categoria non indicata` — `components/QueueCard.jsx:109,132` |
| **Stato non indicato** | `Stato non disponibile` — `components/AgreementCard.jsx:58` · `Stato sconosciuto` — `components/EntryCard.jsx:73`, `components/StaffUserCard.jsx:66`, `components/StaffReportCard.jsx:46`, `components/StaffDetailPanels.jsx:71` · `Tipo non indicato` — `services/queues.js:28` |
| **In attesa** (nothing has happened yet) | `Aperta` — `services/reports.js:20` (report `PENDING`) vs `In attesa` — `services/queues.js:23`, `components/AgreementCard.jsx:45` |
| **Riprova** (retry after a failure) | `Ricarica` — `app/(tabs)/index.jsx:213`, `app/staff.jsx:438` |
| **Carica altri** | `Carica altri 20` — `app/staff.jsx:462`, `app/staff-users.jsx:371`, `components/StaffDeletedServicesSection.jsx:153`, `components/StaffOperationsLog.jsx:161` |
| **Crea il profilo** (registration) | `Crea account` — `app/(auth)/register.jsx:440` · `Registrati` — `app/(auth)/login.jsx:131` |
| **Indirizzo dell'immagine** | `URL dell'immagine` — `app/edit-profile.jsx:415` |
| **Tema** (three values) | `Sistema` / `Chiaro` / `Scuro` — consistent (`components/ThemeSelector.jsx:11-13`), and the band that explains them says "L'opzione Sistema segue il tema del dispositivo" (`profile.jsx:384-385`) — same words. Good |

---

## 4. Screens whose subtitle explains *how* instead of *what*

`docs/DESIGN.md` (Composition rules, «One header»): the sentence under the title says what the screen holds; instructions belong in the empty state.

| Screen | file:line | current | why it is a how |
| --- | --- | --- | --- |
| Chat | `app/chat/[agreementId].jsx:31` | `Messaggi dello scambio: accordatevi qui sui dettagli.` | "accordatevi qui" is an instruction; the subtitle could name the counterpart instead. |
| Utenti (staff) | `app/staff-users.jsx:234` | `Rendi staff un utente o sospendi il suo account.` | Two imperatives describing the two buttons. The gate for the same route already has the right sentence (`Gli account del progetto: chi è staff, chi è attivo e chi è sospeso.`, `:216`). |
| Crea il tuo profilo | `app/(auth)/register.jsx:325` | `Bastano pochi dati per iniziare a scambiare servizi.` | Neither what nor how: a promise, and a false one. |
| Scheda dell'accordo (panel) | `app/chat/[agreementId].jsx:339` | `Le date e il servizio li ha scritti il sistema: qui restano da leggere, e da confermare se tocca a te.` | "da leggere, e da confermare" is usage. |
| Crea accordo (panel) | `components/AgreementFormModal.jsx:97` | `Le date e il servizio sono già scritti: aggiungi i dettagli pratici dello scambio.` | Imperative instruction for the field below. |
| Offro e cerco | `app/(tabs)/offer-and-request.jsx:55-56` | `Le tue offerte e le tue ricerche: una per tipo, sempre presenti. Qui le correggi quando cambiano.` | The first sentence is right; the second is how-to and could go. |
| Profilo | `app/(tabs)/profile.jsx:194` | *(none)* | No subtitle at all, against DESIGN. |
| Profilo (public) | `app/user/[id].jsx:66` | *(none)* | No subtitle at all, against DESIGN. |

Correct by contrast: `Servizi` (`index.jsx:251-252`), `Match` (`match.jsx:189`), `Accordi` (`agreements.jsx:212`), `Modifica profilo` (`edit-profile.jsx:328`), `Segnala alla staff` (`report.jsx:85`), `Area staff` (`staff.jsx:363`).

---

## 5. Top 5 fixes by user impact

1. **`app/staff-users.jsx:397-406` + `services/staff-users.js:110`** — the suspension confirmation must say that access is removed. Today the most consequential irreversible action in the app reports a status transition. (`harden`)
2. **`app/(tabs)/match.jsx:262,272`** — `Offerta` / `Ricerca` become `Crea coda di offerta` / `Crea coda di ricerca`, and the visible label matches the accessible name. This is the product's core loop and the only place a credit is spent; a noun cannot describe a charge. (`clarify`)
3. **`Richiesta` → `Ricerca`** in `components/AgreementSheet.jsx:19` and `components/AgreementFormModal.jsx:22`. Two files, two strings, and the last place where the product's second type has a second name — which matters most in the sheet, where the reader decides whether the described service is theirs. (`clarify`)
4. **The accordo/scheda collapse in the chat**: `Accordo` (`chat:253`) → `Leggi la scheda`, `Crea accordo` → `Scrivi la scheda`, panel titles `L'accordo`/`Crea accordo` → `Scheda dell'accordo`. One noun for the record, one for the sheet, verbs on the buttons. (`clarify`)
5. **Remove the machine from the sentences**: five strings say `il server` / `il sistema` / `lo mostra` and two promise `segnalalo` with no channel. (`clarify`) — cheapest of the five and the one that most changes how trustworthy the product reads.

---

## 6. Copy that is already good — leave it alone

- **Destructive confirmations that name the object, the consequence, and repeat the verb**: `components/QueueCard.jsx:66-75` (three different consequences for three cases), `components/AgreementSheet.jsx:147-176`, `app/(tabs)/agreements.jsx:601-616` (`Accetta la proposta` / `Rifiuta la proposta`), `app/report.jsx:172-184`, `app/edit-profile.jsx:479-481` and `:498-503`, `components/ConfirmModal.jsx:44` (`No, torna indietro` can never be mistaken for the destructive command).
- **Accessible names that survive out of context**: `components/ServiceCard.jsx:76`, `components/QueueCard.jsx:107`, `components/NotificationRow.jsx:111`, `app/report.jsx:168`, `components/StaffUserCard.jsx:96`, `components/WebNavMenu.jsx:384` (menu + current section), `app/(tabs)/agreements.jsx:135` (bell with the count). Every repeated row is distinguishable by name.
- **Empty states that say what would fill them and offer only a real action**: `app/(tabs)/index.jsx:209-214`, `components/StaffDeletedServicesSection.jsx:78-81`, `components/StaffOperationsLog.jsx:73-79` (`Registro non disponibile` naming what still works), `components/EmptyState.jsx` (one anatomy, no invented CTA).
- **The vocabulary that already holds one word for one concept and one voice**: `services/reports.js` statuses (`Aperta`/`In esame`/`Confermata`/`Respinta`), `services/queues.js` (`Offerta`/`Ricerca`, `In attesa`/`In corso`/`Chiusa`), `services/agreements.js` `REVIEW_LABELS` as choice pills, `ThemeSelector` (`Sistema`/`Chiaro`/`Scuro`), and the honest loading lines that name the real operation (`Carico i servizi…`, `Carico le tue pubblicazioni…`, `Guardo le segnalazioni…`, `Cerco fra tutti gli utenti…`).
- **The register**: zero exclamation marks, zero emoji, no "clicca qui", no corporate filler, Italian that a native speaker wrote (including the tu-form throughout, used consistently — there is no stray `Lei` anywhere except the verb `Le` and `La` pronouns).

---

## 7. Coverage and limits of this pass

- Read in full: all 12 routes in `app/`, all `components/` with user-visible strings, `services/offer-request.js|queues.js|agreements.js|reports.js|staff.js|staff-users.js`, `validation/index.js`, `api/client.js`, `api/areas/{agreements,chat,queues,services,staff,profile}.js`, `navigation/{tab-routes,screen-titles}.js`, `hooks/{useAgreements,useChat,useServiceCatalog,useUserServices}.js`.
- Not judged, deliberately: backend-originated copy in `Backend/**` (read-only), the `docs/` prose, and every English source comment — comments are structure, not copy.
- Not verified at runtime (source-level pass only, dev server saturated): whether `Banner`'s `Ho capito` and the `EmptyState` CTA truncate at 360 px with these replacement strings, and whether the agreements cancel/purge behaviour behind the proposed "chat and sheet remain readable" clause is the one D028/D030 actually implements. Both are flagged inline above rather than assumed.
- No browser was used; every string above is quoted verbatim from source with its `file:line`.
