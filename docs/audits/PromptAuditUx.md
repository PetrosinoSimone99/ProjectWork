 AUDIT UX + ACCESSIBILITÀ DI BARATTO-LO — sola analisi, nessuna modifica

 Obiettivo

    Valuta l'intera app (Frontend/) contro la rubrica di progetto, produci:
 1. un voto per dimensione e un voto finale, calcolati con la formula qui sotto;
 2. la lista dei finding, ognuno con evidenza (file:riga o screenshot);
 3. i 10 miglioramenti a maggior impatto ordinati per rapporto impatto/sforzo.

    Non è una sessione di fix. Non modificare codice, non aggiungere dipendenze,
    non committare. L'unica scrittura ammessa è l'artefatto di audit (punto 6).

 1. La bibbia (leggila PRIMA, è la rubrica)

 - docs/ux.md — principi, 10 euristiche Nielsen, dark pattern, protocollo di
   test, checklist di review, tabella Status.
 - docs/accessibility.md — POUR, criteri WCAG 2.1 AA applicabili, pass con
   tecnologie assistive, regole di contenuto, procedura di verifica, checklist,
   tabella Status.
 - docs/frontend.md — convenzioni di implementazione (stati, hook, token).
 - docs/overview.md — cosa deve fare il prodotto; docs/api.md e
   docs/backend-gaps.md — cosa è implementabile e cosa no.

    I criteri di valutazione sono SOLO quelli di quei file (più i fatti di
    piattaforma: iOS HIG / Material). Non inventare euristiche nuove e non valutare
    scelte già decise in docs/decisions.md come se fossero errori.

 2. Regole di evidenza (violarle invalida il finding)

 - Ogni finding cita file:riga oppure uno screenshot in screens/.
 - Vietato il finding "mi sembra": se non hai l'evidenza, mettilo in
   "Non verificato" (vedi punto 6), non tra i finding.
 - Distingui sempre: VERIFICATO (letto/eseguito), DEDOTTO (dal codice,
   non eseguito), NON VERIFICABILE (serve uno stato o un dato che non
   esiste). Un finding DEDOTTO non può valere più di severità 2.
 - Un finding = una causa. Dieci schermate che ripetono lo stesso errore sono
   un finding con dieci occorrenze, non dieci finding.
 - Backend/ è in sola lettura: puoi leggere controller e README, non scrivere.

 3. Orchestrazione (parallelismo)

    Usa subagenti read-only in parallelo, una lane per area, compiti non
    sovrapposti. Nessun subagente scrive file, nessuno lancia git in scrittura,
    solo il parent usa il browser (una sola istanza Playwright: niente
    conflitti). Massimo 5 lane contemporanee.

 - lane 1 scout — mappa: rotte, schermate, componenti, hook, dove vivono gli
   stati (loading/empty/error/not-available), quali schermate usano quali
   componenti. Output: indice, non giudizi.
 - lane 2 reviewer — euristiche Nielsen 1-5 e 10 sulle schermate della lane 1.
 - lane 3 reviewer — euristiche Nielsen 6-9 + dark pattern + copy (italiano,
   messaggi d'errore, etichette, coerenza del vocabolario).
 - lane 4 reviewer — accessibilità statica: role/label/state su ogni elemento
   interattivo, target 44 pt, contrasto dei token (calcola i rapporti, non
   fidarti dei commenti), ordine di lettura, lang sul web, live region.
 - lane 5 reviewer — design system e coerenza visiva: uso dei token (nessun
   colore/spaziatura hard-coded), gerarchia visiva, tipografia, raggi, spacing,
   dark/light, motion e reduced motion, coerenza fra schermate simili.
 - Poi evidence-auditor su tutti i finding: conferma o declassa ognuno,
   riapre il file citato, elimina quelli senza evidenza.

 4. Test live (il parent, con il browser)

    Serve l'app in esecuzione: Backend su Docker (porta 8000) e
    cd Frontend && npx expo start --web. Se lo stack non è su, chiedi prima di
    avviarlo; se non parte, dichiara il live come non eseguito e continua statico.

 - Viewport 390x844 (telefono) e 1440x900 (desktop), tema chiaro e scuro.

 - Per ogni schermata: screenshot pieno, poi screenshot delle quattro stati
   (loading, empty, error, non disponibile) dove riesci a provocarli.

 - Giro da sola tastiera: Tab su tutto, focus visibile, Escape su ogni pannello,
   nessun trap, focus restituito al trigger.

 - Testo al 200% (zoom browser 200%): niente troncamenti, niente sovrapposizioni,
   nessun controllo collassato.

 - Reduced motion attivo e entrambi i temi a ogni check.

 - Sessione scaduta: provocala (attesa del token, oppure abort delle richieste
   con page.route per simulare il fallimento) e giudica il popup/banner:
   chiarezza, cosa dice, cosa può fare l'utente, se è annunciato, se il focus ci
   finisce dentro, se si può chiudere, cosa resta sullo schermo dopo.
   Cerca attivamente questo tipo di difetti: modali costruiti male, pannelli che
   scappano dallo schermo, zoom che rompe il layout, pulsanti senza stato
   pressed, doppia azione, stato che si perde al refresh.

 - Credenziali: NON chiederle all'operatore, esistono nel dump demo.
   Utente: username mario.rossi / password demo.
   Staff: username staff.anna / password demo (ruoli USER+STAFF).
   Fonte: Context_and_DB_V2/DEMO_DATABASE.md, docs/setup.md.
   Prima di aprire il browser VERIFICA che funzionino, non assumerlo:
     curl -s -X POST http://localhost:8000/api/auth/login
   -H 'Content-Type: application/json'
   -d '{"username":"mario.rossi","password":"demo"}'

   Se il login fallisce (DB seedato da un altro dump), crea un account con
   POST /api/auth/register (password almeno 8 caratteri) e, solo se serve lo
   staff, php bin/console app:create-staff dentro il container backend.
   Non cancellare né modificare i dati demo esistenti; ogni dato creato
   dall'audit vive in un account throwaway dichiarato nel report.

 - Sessione scaduta: NON modificare il TTL nel backend (config fuori scope).
   Provocala dal browser: sostituisci il token in localStorage
   (barattolo.token) con uno scaduto o corrotto, oppure intercetta le
   richieste con page.route e rispondi 401. Poi giudica cosa succede
   all'utente: cosa vede, cosa può fare, se il focus entra nel pannello, se si
   chiude, se il lavoro in corso si perde, se dopo il re-login torna dove era.

 - Ambiente: puoi avviare tu lo stack (docker compose up -d in Backend/,
   porta 8000) e npx expo start --web: l'operatore è il proprietario del
   Docker e questa sessione è autorizzata a start/stop. Fermalo a fine audit
   solo se lo hai avviato tu, e dillo nel report.

 5. Rubrica e voto (deterministico, non a sentimento)

    Severità: 1 cosmetico · 2 minore (fastidio, esiste un aggiramento) ·
    3 maggiore (il compito è compromesso o un criterio WCAG AA fallisce) ·
    4 bloccante (compito impossibile, perdita di dati, criterio AA critico).

    Punteggio di dimensione: parti da 10 e sottrai
    0.2 × n(sev1) + 0.5 × n(sev2) + 1.5 × n(sev3) + 3 × n(sev4), minimo 0.
    Con almeno un finding di severità 4 la dimensione è cappata a 5.

 ┌─────────────────────────────────────┬──────┬────────────────────────────────────────────────────┐
 │ Dimensione                          │ Peso │ Cosa la muove                                      │
 ├─────────────────────────────────────┼──────┼────────────────────────────────────────────────────┤
 │ Usabilità (euristiche + 6 principi) │ 30%  │ lane 2 e 3                                         │
 ├─────────────────────────────────────┼──────┼────────────────────────────────────────────────────┤
 │ Accessibilità (WCAG AA app)         │ 25%  │ lane 4 + giro live                                 │
 ├─────────────────────────────────────┼──────┼────────────────────────────────────────────────────┤
 │ Stati e copy                        │ 15%  │ le quattro stati, messaggi, vocabolario            │
 ├─────────────────────────────────────┼──────┼────────────────────────────────────────────────────┤
 │ Design system e coerenza visiva     │ 15%  │ lane 5                                             │
 ├─────────────────────────────────────┼──────┼────────────────────────────────────────────────────┤
 │ Piattaforma e reattività percepita  │ 15%  │ convenzioni native, feedback, tap minimi, tastiera │
 └─────────────────────────────────────┴──────┴────────────────────────────────────────────────────┘

    Voto finale = media pesata, una cifra decimale. Scrivi accanto il conteggio dei
    finding per severità: chi legge deve poter rifare il conto.

 6. Formato dell'artefatto

    Scrivi docs/audits/ux-audit-2026-11-10.md (English, come i docs) con:
 1. metodo, ambiente, cosa è stato eseguito e cosa no, data, commit (git rev-parse --short HEAD);
 2. tabella voti (dimensioni, pesi, finding per severità, voto, totale);
 3. tabella finding: id | sev | stato (VERIFICATO/DEDOTTO) | area/schermata | file:riga o screenshot | euristica o criterio (L<n> / WCAG x.y.z) | cosa
    succede | perché è un problema | fix proposto | sforzo S/M/L;
 4. top 10 miglioramenti ordinati per impatto/sforzo, ognuno con il finding che chiude;
 5. "Non verificato" (liste esplicite: cosa servirebbe per verificarlo);
 6. screenshot in docs/audits/screens/.
       Poi: aggiorna le tabelle Status in docs/ux.md e docs/accessibility.md con
       i risultati reali (sostituisci le righe datate 2026-11-10, non aggiungerne di
       nuove), e aggiungi una voce in cima a docs/changelog.md.

 7. Divieti

 - Nessun fix, nessun refactor, nessuna PR, nessun commit del codice.
 - Nessuna severità gonfiata per fare scena, nessun complimento di cortesia:
   se qualcosa è fatto bene dillo in una riga e passa avanti.
 - Nessuna affermazione di conformità non verificata ("siamo AA" richiede il
   giro live, non la lettura del codice).