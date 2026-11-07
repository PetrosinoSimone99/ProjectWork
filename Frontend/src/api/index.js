import { ApiError, apiFetch } from './client';
import {
  normalizzaAccordo,
  normalizzaCatalogo,
  normalizzaCategorie,
  normalizzaEsitoInvio,
  normalizzaEsitoUtenteStaff,
  normalizzaNotifiche,
  normalizzaRispostaAccesso,
  normalizzaSegnalazioneStaff,
  normalizzaSegnalazioniStaff,
  normalizzaUtentiStaff,
  numeroInteroONull,
  queryDaFiltri,
} from './normalizers';
import { aPayloadLetta } from '@/services/notifications';
import { aPayloadChiusura, aPayloadPresaInCarico } from '@/services/staff';
import { aPayloadRuolo, aPayloadStato } from '@/services/staff-users';
import { registraMieVoci } from '@/services/my-entries';

// La superficie pubblica di prima resta quella: le funzioni spostate in
// `normalizers.js` si riesportano da qui, così chi le importava non cambia.
export {
  normalizzaCatalogo,
  normalizzaCategorie,
  normalizzaPubblicazioni,
  normalizzaStatoPubblicazione,
} from './normalizers';

// Le funzioni nuove non ingrossano questo file (P53): si smistano per area in
// `aree/` e da qui si re-espongono solo i nomi, così per le schermate il layer
// resta un punto unico (§3 di `AGENTS.md`). Il prossimo smistamento lascerà
// qui una riga in meno e una export in più, non il contrario.
export { ottieniProfilo, aggiornaProfilo } from './areas/profile';
export {
  aggiornaPubblicazione,
  cambiaStatoPubblicazione,
  creaPubblicazione,
  eliminaPubblicazione,
  ottieniPubblicazioni,
} from './areas/services';

// I finti sono usciti dal codice (decisione del brief): il layer parla solo col
// backend vero e ogni endpoint assente diventa uno stato dichiarato in UI.
// ---------------------------------------------------------------------------
// Accesso — login e registrazione
//
// Regola del titolare (27 settembre 2026): l'app **non dice mai** all'utente
// quale dato è «sbagliato» (username sbagliato? password sbagliata? già in
// uso?). I messaggi del backend, che sono espliciti e in inglese, si riassumono
// in testi generici prima di arrivare alla UI: il dettaglio resta nel log del
// server, non a schermo. I controlli di **forma** della schermata (campo vuoto,
// email malformata, categoria non scelta) restano espliciti: riguardano quello
// che l'utente sta scrivendo, non rivelano niente sugli altri utenti.
// ---------------------------------------------------------------------------

/** Messaggio generico per gli errori dell'accesso senza una mappatura precisa. */
const FALLBACK_ACCESSO = 'Qualcosa non ha funzionato. Riprova.';

/**
 * I messaggi generici dell'accesso, per endpoint e status. Qualunque testo
 * mandi il backend, la UI vede solo questi: niente «username o email già in
 * uso», niente «account inattivo» — decisione del titolare, vedi sopra.
 */
const MESSAGGI_ACCESSO_GENERICI = {
  login: {
    400: 'Credenziali non valide.',
    401: 'Credenziali non valide.',
    403: 'Credenziali non valide.',
  },
  register: {
    400: 'Controlla i dati inseriti: manca qualcosa o non è valido.',
    404: 'Controlla i dati inseriti: manca qualcosa o non è valido.',
    409: "Non è possibile creare l'account con questi dati.",
  },
};

/**
 * Rilancia l'errore dell'accesso con il messaggio generico della tabella.
 * Gli status non mappati (rete assente, timeout, 5xx) passano immutati: già
 * generici perché `client.js` li costruisce da sé.
 */
async function conMessaggioGenerico(chiamata, endpoint) {
  try {
    return await chiamata;
  } catch (err) {
    if (err instanceof ApiError) {
      throw new ApiError(
        err.status,
        MESSAGGI_ACCESSO_GENERICI[endpoint]?.[err.status] ?? FALLBACK_ACCESSO,
      );
    }
    throw err;
  }
}

/**
 * POST /api/auth/login — restituisce il token Bearer per le chiamate autenticate.
 * `{token, user}` (`AuthController.php`) diventa `{token, utente}` con
 * `normalizzaRispostaAccesso`. Gli errori escono **solo generici** (vedi la
 * sezione sopra): il backend distingue 400/401/403, la UI dice «Credenziali
 * non valide.» per tutti.
 */
export async function login(username, password) {
  return normalizzaRispostaAccesso(
    await conMessaggioGenerico(
      apiFetch('auth/login', {
        method: 'POST',
        body: { username, password },
      }),
      'login',
    ),
  );
}

/**
 * POST /api/auth/register — crea l'utente (con località, offerte e ricerche) e lo
 * autentica subito.
 *
 * Il form produce `{nome, cognome, username, email, password, localita, offerte,
 * ricerche}` ma il contratto vuole chiavi inglesi e un'altra forma per le voci:
 * il corpo si costruisce qui, non si manda `input` così com'è.
 *
 * Contratto (`AuthController::validateRegistration` + guida colleghi §3):
 * `location` non vuota, fino a 255 caratteri; `offers` e `requests` ognuna con
 * **almeno una voce**, descrizione 1–255 caratteri e **almeno una categoria** per
 * voce; la stessa categoria non può ripetersi nella stessa sezione (altrimenti
 * 400 — la validazione della schermata lo previene: vedi `register.jsx`).
 *
 * La casella «da remoto» della voce è attiva: il campo `da_remoto` del payload
 * viaggia come booleano `isRemote` nel corpo di ogni voce (il backend lo modella
 * dalla PR #34). `isSuspended` **non** si manda: la registrazione crea voci nuove
 * e pubblicate, il backend mette `false` da solo.
 *
 * Ogni voce porta anche `location`, la **località della persona**: il backend
 * non la copia dal profilo, la mandiamo noi (decisione del 16/10/2026).
 */
export async function register(input) {
  const { nome, cognome, username, email, password, localita, offerte, ricerche } = input ?? {};
  const risposta = await conMessaggioGenerico(
    apiFetch('auth/register', {
      method: 'POST',
      body: {
        name: (nome ?? '').trim(),
        surname: (cognome ?? '').trim(),
        username,
        email,
        password,
        location: (localita ?? '').trim(),
        offers: aCorpoVoci(offerte, localita),
        requests: aCorpoVoci(ricerche, localita),
      },
    }),
    'register',
  );
  // La risposta porta le voci **con i loro id** (`offers`/`requests` di
  // `AuthController`): è la prima sorgente reale del registro delle mie voci.
  registraMieVoci(risposta?.user?.id, risposta);
  return normalizzaRispostaAccesso(risposta);
}

/**
 * Le voci arrivano nella forma interna del modulo
 * (`aPayloadApi`: `{id_categoria, mansione, da_remoto}`) e diventano il corpo del
 * contratto: `{description, categoryIds, isRemote}`. Prima del contratto vero la
 * casella «da remoto» era tradotta in testo nel `description`; ora il backend
 * modella il campo (PR #34) e viaggia come booleano.
 *
 * `isSuspended` **non** si manda: la registrazione crea voci nuove e pubblicate,
 * il backend mette `false` da solo.
 *
 * `location` è la località della persona (`localita`, formato
 * `Provincia (Regione)`): la stessa per ogni voce, perché la località della voce
 * è quella di chi la pubblica. Stringa vuota o spazi → `null` esplicito, come
 * in creazione.
 *
 * `id_categoria` qui è **sempre** un id scelto dalla tendina (la validazione
 * della schermata rifiuta l'invio senza categoria), quindi non serve un ramo
 * `categories` per nome: gli id sono il contratto con il backend.
 */
function aCorpoVoci(voci, localita) {
  return (voci ?? []).map((voce) => ({
    description: String(voce.mansione ?? '').trim(),
    isRemote: voce.da_remoto === true,
    location: (localita ?? '').trim() || null,
    categoryIds: voce.id_categoria === null || voce.id_categoria === undefined ? [] : [voce.id_categoria],
  }));
}

/**
 * GET /api/categories — le categorie, per le tendine di registrazione e di
 * pubblicazione.
 *
 * Contratto: `{categories: [{id, description}]}`
 * (`Backend/src/Controller/MarketplaceController.php`). La rotta è **pubblica
 * per le GET** (`Backend/config/packages/security.yaml`), quindi funziona anche
 * in registrazione, quando `token` è ancora null: le altre schermate passano il
 * token che hanno già e il backend lo ignora.
 */
export async function ottieniCategorie(token) {
  return normalizzaCategorie(await apiFetch('categories', { token }));
}


// ---------------------------------------------------------------------------
// Offro e cerco — le proprie offerte e ricerche
//
// Tutta l'area vive in `aree/servizi.js` (P53): la creazione reale
// (`POST /api/services`), dal 14/10/2026 la lettura reale dell'elenco
// (`GET /api/offers/mine` + `GET /api/requests/mine`, PR #30 e #32) e la
// **modifica** e l'**eliminazione** (`PATCH`/`DELETE` su `/api/offers/{id}` e
// `/api/requests/{id}`). Resta fintato **solo il cambio di stato**: non esiste
// nel contratto. Le si re-espongono sopra, con le altre funzioni di area, così
// gli import delle schermate non cambiano (§3).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Home — il catalogo dei servizi
//
// Endpoint: `GET /api/services` (rotta `api_services_list` di
// `MarketplaceController`): le offerte **attive degli altri** — il backend
// filtra già per tipo, stato account ed esclusione del viewer — con i filtri in
// query (`q`, `categoryIds`, `location`) e la paginazione nella risposta. Il
// parametro `sort` non si manda: il default del backend (`newest`) è quello che
// serve alla home. La normalizzazione della riga vive in `normalizers.js`.
//
// La home **non conosce i dati finti**: il catalogo parla solo col backend vero
// (decisione del titolare, 30 settembre 2026). Con `EXPO_PUBLIC_DATI_FINTI=1`
// la chiamata finisce nella guardia di `client.js` e la home mostra il suo
// stato di errore, non un catalogo inventato.
// ---------------------------------------------------------------------------

/** Righe per pagina del catalogo: il default del backend, dichiarato anche qui. */
const LIMITE_PAGINA_CATALOGO = 20;

/**
 * GET /api/services — il catalogo della home, una pagina per volta.
 * `utenteId` serve a scartare le righe proprie, come fa `ottieniAccordi`.
 * Restituisce `{elenco, paginazione}`: chi chiama decide se può caricare altri.
 */
export async function ottieniCatalogo(token, utenteId, filtri, pagina = 1) {
  return normalizzaCatalogo(
    await apiFetch(`services${queryDaFiltri(filtri, pagina, LIMITE_PAGINA_CATALOGO)}`, { token }),
    utenteId,
  );
}

// ---------------------------------------------------------------------------
// Segnalazioni e notifiche in-app
//
// Endpoint proposto: `segnalazioni.php` (crea, elenco per la staff, chiusura) e
// `notifiche.php` (le proprie). **Non esistono**: con i finti spenti la creazione
// risponde 404, ed è il motivo per cui ogni ramo porta il suo `// TODO(backend)`.
//
// Due decisioni che vivono qui e in nessun altro punto:
// - **l'autore non è nel corpo**: viaggia nel token di accesso, come per tutte le
//   altre scritture (lezione di P03/P05, IDOR). `utenteId` serve solo al ramo
//   finto, che non decodifica il token;
// - **una notifica non è una lettura della segnalazione**: l'utente non vede lo
//   stato della propria segnalazione (decisione del 18 settembre 2026). La
//   notifica arriva quando la staff chiude con un provvedimento, e non arriva se
//   non prende provvedimenti.
// ---------------------------------------------------------------------------

/**
 * POST segnalazioni.php — invia una segnalazione alla staff. Il corpo arriva da
 * `aPayloadSegnalazione` (motivo, descrizione, riferimento e persona segnalata);
 * **chi segnala viene dal token**, mai dal corpo.
 */
export async function creaSegnalazione(token, _utenteId, payload) {
  return normalizzaEsitoInvio(
    await apiFetch('segnalazioni.php', { method: 'POST', token, body: payload }),
  );
}

/**
 * GET notifiche.php — le **proprie** notifiche. `utenteId` serve solo al ramo
 * finto, che non decodifica il token di accesso (come `ottieniToken`).
 */
export async function ottieniNotifiche(token, _utenteId) {
  return normalizzaNotifiche(await apiFetch('notifiche.php', { token }));
}

/**
 * POST notifiche.php `{id}` — segna una notifica come letta. Il `403` (non è mia)
 * e il `404` si mostrano così com'è; l'avviso si chiude comunque, perché è un
 * avviso, non una pratica. `utenteId` serve al ramo finto, come sopra.
 */
export async function segnaNotificaLetta(token, _utenteId, id) {
  const corpo = aPayloadLetta(id);
  await apiFetch('notifiche.php', { method: 'POST', token, body: corpo });
}

/**
 * GET segnalazioni.php?stato=… — le segnalazioni viste dalla **staff**, con
 * l'autore, il segnalato, il riferimento al fatto e lo stato. `stato` è
 * facoltativo: senza, il backend decide (presumibilmente tutte). `utenteId` serve
 * al ramo finto, che non decodifica il token di accesso.
 */
export async function ottieniSegnalazioniStaff(token, _utenteId, stato) {
  const query =
    typeof stato === 'string' && stato.trim() !== ''
      ? `?stato=${encodeURIComponent(stato.trim())}`
      : '';
  return normalizzaSegnalazioniStaff(await apiFetch(`segnalazioni.php${query}`, { token }));
}

/**
 * POST segnalazioni.php `{azione:'prendi_in_carico', id}` — porta la pratica da
 * `OPEN` a `IN_REVIEW`. Il `409` (già presa o chiusa) e il `403` (chi chiama non
 * è staff) si mostrano così come sono: la schermata ricarica e lascia parlare il
 * backend. L'identità viaggia **nel token**, mai nel corpo.
 */
export async function prendiInCaricoSegnalazione(token, _utenteId, id) {
  const corpo = aPayloadPresaInCarico(id);
  const risposta = await apiFetch('segnalazioni.php', { method: 'POST', token, body: corpo });
  return normalizzaSegnalazioneStaff(risposta?.data?.segnalazione);
}

/**
 * POST segnalazioni.php `{azione:'chiudi', id, esiti, id_beneficiario?, nota}` —
 * chiude la pratica con uno o più esiti. `esiti` è una **lista** per permettere le
 * combinazioni decise il 18 settembre 2026; `id_beneficiario` c'è solo con
 * `TOKEN_ASSEGNATO`. La risposta porta la pratica chiusa e, quando il buono è
 * stato creato, il suo `id_token` (per il `Banner` che rimanda a «I miei token»).
 */
export async function chiudiSegnalazione(token, _utenteId, id, esiti, nota, idBeneficiario = null) {
  const corpo = aPayloadChiusura(id, esiti, nota, idBeneficiario);
  const risposta = await apiFetch('segnalazioni.php', { method: 'POST', token, body: corpo });
  return {
    segnalazione: normalizzaSegnalazioneStaff(risposta?.data?.segnalazione),
    idToken: numeroInteroONull(risposta?.data?.id_token ?? risposta?.id_token),
  };
}

// ---------------------------------------------------------------------------
// Utenti dell'area staff — ruoli e stati
//
// Due dei tre endpoint **esistono già**: `userRoleManager.php` e
// `userStatoManager.php` funzionano e rispondono con la busta **piatta**
// `{messaggio, utente}` (la seconda busta del progetto, gestita da `client.js`).
// L'unico pezzo che manca è l'elenco (`utenti.php`, proposto): senza, i due
// manager non hanno interfaccia, ed è il motivo per cui `ottieniUtentiStaff` ha
// il suo `// TODO(backend)`. La ricerca e i filtri della schermata sono
// **locali** (lo dichiara la schermata): il contratto proposto li accetterebbe in
// query string, ma la demo non li usa perché l'elenco è piccolo.
// ---------------------------------------------------------------------------

/**
 * GET utenti.php — l'elenco degli utenti con ruolo e stato, per l'area staff.
 * Con i finti spenti risponde `404` (l'endpoint non esiste): la schermata lo
 * mostra come errore di caricamento, con «Riprova». `utenteId` serve solo al
 * ramo finto, che non decodifica il token di accesso.
 */
export async function ottieniUtentiStaff(token, _utenteId) {
  return normalizzaUtentiStaff(await apiFetch('utenti.php', { token }));
}

/**
 * POST userRoleManager.php `{utente_id, ruolo}` — cambia il ruolo di un altro
 * utente. L'endpoint **esiste**: i `403` delle regole (e il `404` sul bersaglio
 * sparito) arrivano dal backend e si mostrano così come sono. L'identità
 * dell'operatore viaggia **nel token**, mai nel corpo. `utenteId` serve al ramo
 * finto.
 */
export async function cambiaRuoloUtente(token, _utenteId, id, ruolo) {
  const corpo = aPayloadRuolo(id, ruolo);
  const risposta = await apiFetch('userRoleManager.php', { method: 'POST', token, body: corpo });
  return normalizzaEsitoUtenteStaff(risposta);
}

/**
 * POST userStatoManager.php `{utente_id, stato}` — cambia lo stato di un altro
 * utente. Stessa forma della riga precedente; qui la regola in più è che il
 * bersaglio `ADMIN` è vietato anche a un altro `ADMIN` (asimmetria dichiarata tra
 * i due manager).
 */
export async function cambiaStatoUtente(token, _utenteId, id, stato) {
  const corpo = aPayloadStato(id, stato);
  const risposta = await apiFetch('userStatoManager.php', { method: 'POST', token, body: corpo });
  return normalizzaEsitoUtenteStaff(risposta);
}

// ---------------------------------------------------------------------------
// Accordi 1:1 — API/Accordi1_a_1/
//
// La busta di questa cartella è {success, message, data} e gli id viaggiano nel
// corpo per le azioni e nella query string per le letture. Le risposte vengono
// adattate qui (§4 del piano): le schermate non leggono chiavi del backend.
// ---------------------------------------------------------------------------

/** GET Accordi1_a_1/elenco.php — gli accordi dell'utente, normalizzati per la UI. */
export async function ottieniAccordi(token, utenteId) {
  const data = await apiFetch('Accordi1_a_1/elenco.php', { token });
  return (data?.data ?? []).map((accordo) => normalizzaAccordo(accordo, utenteId));
}

/** GET Accordi1_a_1/dettaglio.php?id_accordo= — un accordo, normalizzato per la UI. */
export async function ottieniAccordo(token, idAccordo, utenteId) {
  const data = await apiFetch(
    `Accordi1_a_1/dettaglio.php?id_accordo=${encodeURIComponent(idAccordo)}`,
    { token },
  );
  return normalizzaAccordo(data?.data, utenteId);
}

/**
 * POST Accordi1_a_1/crea.php — propone un accordo 1:1 a un altro utente.
 * Restituisce l'id dell'accordo creato, già come numero: serve alla navigazione
 * verso il dettaglio e un id stringa farebbe fallire i confronti con `===`.
 */
export async function creaAccordo(token, idAltroUtente, durataMia, durataAltro) {
  const data = await apiFetch('Accordi1_a_1/crea.php', {
    method: 'POST',
    token,
    body: {
      id_altro_utente: idAltroUtente,
      durata_mia: durataMia,
      durata_altro: durataAltro,
    },
  });
  return Number(data?.data?.id_accordo);
}

/** Le cinque azioni che condividono corpo `{id_accordo}` e stessa forma di risposta. */
const PERCORSI_AZIONE_ACCORDO = {
  accetta: 'Accordi1_a_1/accetta.php',
  avvia: 'Accordi1_a_1/avvia.php',
  completa: 'Accordi1_a_1/completa.php',
  annulla: 'Accordi1_a_1/annulla.php',
  contesta: 'Accordi1_a_1/contesta.php',
};

/**
 * POST Accordi1_a_1/<azione>.php — un solo corpo per le cinque azioni, un solo
 * esito normalizzato per la schermata:
 * - `messaggio`: il testo del backend (che in questa cartella sta in `message`,
 *   non in `errore`), già pronto da mostrare;
 * - `stato`: lo stato raggiunto, quando il backend lo restituisce.
 */
async function eseguiAzioneAccordo(token, azione, idAccordo) {
  const percorso = PERCORSI_AZIONE_ACCORDO[azione];
  if (!percorso) {
    throw new Error(`Azione su accordo sconosciuta: ${azione}`);
  }
  const data = await apiFetch(percorso, {
    method: 'POST',
    token,
    body: { id_accordo: idAccordo },
  });
  return {
    messaggio: typeof data?.message === 'string' ? data.message : '',
    stato: data?.data?.stato ?? null,
  };
}

/** POST Accordi1_a_1/accetta.php — registra la mia accettazione di una proposta. */
export function accettaAccordo(token, idAccordo) {
  return eseguiAzioneAccordo(token, 'accetta', idAccordo);
}

/** POST Accordi1_a_1/avvia.php — porta in esecuzione un accordo accettato da entrambi. */
export function avviaAccordo(token, idAccordo) {
  return eseguiAzioneAccordo(token, 'avvia', idAccordo);
}

/** POST Accordi1_a_1/completa.php — registra il mio completamento (vedi sopra). */
export function completaAccordo(token, idAccordo) {
  return eseguiAzioneAccordo(token, 'completa', idAccordo);
}

/** POST Accordi1_a_1/annulla.php — chiude un accordo proposto o accettato. */
export function annullaAccordo(token, idAccordo) {
  return eseguiAzioneAccordo(token, 'annulla', idAccordo);
}

/** POST Accordi1_a_1/contesta.php — contesta un accordo in esecuzione. */
export function contestaAccordo(token, idAccordo) {
  return eseguiAzioneAccordo(token, 'contesta', idAccordo);
}

/**
 * Mappa azione -> funzione del layer API, con le stesse chiavi di `AZIONI` in
 * `src/agreements/states.js`: la schermata del dettaglio esegue quello che la logica
 * pura le dice di mostrare, senza uno `switch` sui nomi delle azioni.
 */
export const AZIONI_ACCORDO_API = {
  accetta: accettaAccordo,
  avvia: avviaAccordo,
  completa: completaAccordo,
  annulla: annullaAccordo,
  contesta: contestaAccordo,
};
