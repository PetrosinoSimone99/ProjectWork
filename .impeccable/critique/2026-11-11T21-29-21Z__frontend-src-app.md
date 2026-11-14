---
target: my entire app frontend ux/ui/design
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
target_identity: "file:C:\\Users\\Andrea\\Desktop\\projects\\ProjectWork\\Frontend\\src\\app"
timestamp: 2026-11-11T21-29-21Z
slug: frontend-src-app
---
# Impeccable critique — Baratto-lo frontend (2026-11-11)

Method: dual-agent (A: reviewer · B: worker per il detector CLI, passaggio browser Playwright eseguito dal parent — i subagent non ereditano i tool MCP/browser in questo harness)
Target: Frontend/src/app (slug frontend-src-app) · modo Operate

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of system status | 2 | Il login riesce e non succede niente: resti su /login con la barra dell'app sopra il form. L'ordinamento personalizzato del catalogo non è mai dichiarato. |
| 2 | Match system / real world | 3 | Italiano di dominio eccellente; leak: "Match". |
| 3 | User control and freedom | 2 | Il vicolo cieco del login non ha uscita. |
| 4 | Consistency and standards | 2 | PageHeader usato da 1 schermata su 11; 7 rotte senza H1; errore disegnato in due modi. |
| 5 | Error prevention | 3 | Validazione prima del submit, primari disabilitati con motivazione, conferma su ogni azione irreversibile. |
| 6 | Recognition rather than recall | 2 | Non vedi perché questi 20 servizi sono i primi; /edit-profile ha bisogno di "Valore attuale: Roma". |
| 7 | Flexibility and efficiency | 2 | Su web le 5 sezioni stanno dietro un menu; nessuna scorciatoia da tastiera. |
| 8 | Aesthetic and minimalist design | 2 | Card filtro da 108px con "Nessun filtro attivo"; 52% del primo viewport mobile è chrome. |
| 9 | Error recovery | 3 | La copy nomina causa e passo successivo; su 4 schermate "Riprova" resta staccato. |
| 10 | Help and documentation | 3 | Aiuto in linea forte; la regola d'ordine non esiste da nessuna parte. |
| **Total** | | **24/40** | **Acceptable (60%) — ma un P0 blocca l'intero prodotto.** |

Nessun n/a: tutti e dieci gli euristici sono applicabili.

## Design specificity

La voce è specifica (un servizio è la frase di una persona, non un item), il layout no: il guscio è card smeraldo + pill + colonna 560. La specificità vive nelle parole e nel foglio di dettaglio; reciprocità e rilevanza non hanno forma visiva.

Scansione deterministica: impeccable detect --json Frontend/src -> [] exit 0, zero finding, zero falsi positivi, nessuna soppressione. Dati statici rilevanti: 0 colori hex fuori da tokens.js, 0 borderRadius inline, 14 opacity letterali, 190 valori numerici di stile (26 borderWidth, 49 size di AppIcon inline, 12 ombre), ModalShell.jsx:24 duplica layout.maxContent 560, 20 costanti locali di animazione in WebNavMenu.

Overlay: injection verificata, detect.js iniettato su /, /profile, /offer-and-request, console "[impeccable] No anti-patterns found" su tutte e tre. Nessuna evidenziazione perché nulla da evidenziare.

## What's working

1. Anatomia della card servizio: frase 19/700 clampata, una riga meta con categoria inline, nome accessibile composto dagli stessi campi.
2. Vocabolario degli stati reale: loading / vuoto-con-filtri / vuoto-senza-filtri / errore distinti e scritti, con l'azione successiva nominata.
3. Segment control di Accordi con conteggi + chip del filtro in sospeso: lo stato su due canali.

## Priority issues

[P0] Accedere non entra nell'app (web). signIn() ok e token salvato, ma router.replace(ritorno) gira solo se ritorno è un percorso interno valido (login.jsx:57-61); il redirect del layout auth è stato rimosso in F58 ((auth)/_layout.jsx:13-19); il root Stack scambia (auth)/(tabs) solo dichiarativamente (_layout.jsx:74-79). Riprodotto due volte in questa sessione (click reale, Invio) oltre alle tre di brief.md. Fix: destinazione di default '/' in login.jsx. Comando: /impeccable harden.

[P1] Blocco titolo migrato su una schermata su undici. PageHeader usato solo da (tabs)/index.jsx; 10 schermate ricompongono a mano lo stesso blocco. AppText default level=2 -> 7 rotte senza H1; su /profile H2 "MR" precede l'H1 del nome (profile.jsx:209 vs :221). Viola DESIGN.md § Composition e § Type e WCAG 1.3.1. Fix: level={1} ai sette call site, accessibilityRole="text" a iniziali e wordmark, migrazione su PageHeader. Comando: /impeccable polish.

[P2] Chrome nella finestra, contenuto in colonna. Banda refresh fuori dallo scroll (Screen.jsx:150-176): bordi destri disallineati (985 vs 968 a 1280), rail della scrollbar sul bordo della card; 82px di banda sopra ogni header -> primo servizio a y=437/844 (52% di chrome); a 1920 colonna 673 con 620px di vuoto e campanella a 332px dalla colonna. Fix: scrollbarGutter stable, refresh nello slot azione di PageHeader sotto 640, una regola per >=1440, card filtro collassata a una riga. Comando: /impeccable layout.

[P2] Famiglie errore/vuoto risdoppiate e canale messaggi muto sul web. Quattro schermate: Banner + Riprova staccato (profile.jsx:164-175, staff-users.jsx:282-291, offer-and-request.jsx:450-460, edit-profile.jsx:317-327) contro quattro con retry in-banner; due specie di vuoto su /staff. Banner.jsx:40 ha solo accessibilityLiveRegion, senza aria-live, mentre LoadingScreen.jsx:12 dichiara la regola opposta; stesso in ServicesSection.jsx:88 e staff-users.jsx:300. Fix: etichettaAzione/onAzione sui quattro banner, EmptyState per il registro, aria-live nei tre siti, primitivo LiveRegion unico. Comando: /impeccable harden.

[P2] La vetrina apre con un rimprovero e la seconda tab è un vicolo cieco. /offer-and-request esordisce con "Massimo raggiunto... Eliminane 6" e 21 bottoni senza primario; /match è la seconda tab ed è una schermata che si scusa; /register promette "Bastano pochi dati" sopra 11 campi e due servizi; la conferma di eliminazione promette il match (offer-and-request.jsx:139-146) che match.jsx nega. Comandi: /impeccable clarify, /impeccable onboard.

## Persona red flags

Sam: nessun H1 su 4 rotte e H2 "MR" prima del nome su /profile; Banner senza aria-live; unico comando di navigazione web 98x40 (WebNavMenu.jsx:497); riga del catalogo annunciata come un bottone unico lunghissimo. Focus ring presente e visibile (outline solid 1.6px).

Casey: primo servizio a y=437/844; cinque sezioni dietro la pill menu (2 tap) con la sezione corrente nominata solo nel popover; proposte ricevute solo dalla campanella su /accordi; la data cambia riga fra card adiacenti.

Jordan: preme Accedi ed è autenticato ma resta sul form di login; /register chiede 11 campi contro la promessa; /match è un vicolo cieco; l'ordine del catalogo sembra casuale.

## Minor observations

1. document.title vuoto su ogni rotta (verificato live); solo lang="it".
2. "Segnala" sta 40px sopra il primario "Invia proposta" nel foglio di dettaglio.
3. Il pozzo "Cosa offre e cerca" dichiara un gap backend nel punto della decisione.
4. DESIGN.md § Type dice caption per le count lines, il conteggio arriva in small.
5. La sessione non è prorogabile benché accessibility.md § 2.2.1 lo chieda; il gap non è in backend-gaps.md.
6. StaffUserCard: "Rendi staff" flex 1 (490px) contro "Sospendi" 130px.
7. Token in localStorage (barattolo.token): fallback web di expo-secure-store, raggiungibile da XSS.
8. ModalShell.jsx:24 ridichiara 560 duplicando layout.maxContent.
9. desktop-dark-agreements.png è una cattura in tema chiaro: parità dark di /accordi non verificata.

## Questions to consider

1. Perché nessuna schermata mostra due frasi una di fronte all'altra, se la frase è l'unica cosa che il prodotto ha e gli altri no?
2. Qual è la cornice: la colonna o la finestra?
3. La registrazione risponde a "pubblica prima" o "guarda prima"?
