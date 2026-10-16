import { ApiError, apiFetch } from '../client';
import { USA_DATI_FINTI } from '../config';
import {
  normalizzaPubblicazioni,
  normalizzaServizio,
  numeroInteroONull,
} from '../normalizzazioni';
import * as fintiServizi from '../finti/servizi';
import {
  aPayloadAggiornamento,
  aPayloadPubblicazione,
  STATI_PUBBLICAZIONE,
  TIPI_VOCE,
} from '@/servizi/offerta-ricerca';
import { aggiungiMiaVoce } from '@/servizi/mie-voci';
import { formattaLocalita } from '@/servizi/aree-italiane';

/**
 * Area «Offro e cerco»: la **creazione** di una voce via `POST /api/services`
 * (primo smistamento dell'area, decide il piano del passo 2, P53), dal
 * 14/10/2026 anche la **lettura** dell'elenco delle voci proprie
 * (`GET /api/offers/mine` + `GET /api/requests/mine`, PR #30 e #32) e, dal
 * 14/10/2026, la **modifica** e l'**eliminazione** (`PATCH`/`DELETE` su
 * `/api/offers/{id}` e `/api/requests/{id}`, PR #30 e #32) e, dal 15/10/2026
 * (PR #34), anche il **cambio di stato** (`isSuspended` nel `PATCH`). Le quattro
 * funzioni dell'area se ne vanno qui (pattern P53), con il ramo finto identico
 * a prima — la demo non si tocca.
 *
 * Per §3 di `AGENTS.md`: questo file traduce forma interna ↔ contratto, le
 * schermate non vedono mai i nomi del backend. `normalizzazioni.js` resta la
 * casa della **forma vecchia** (quella del finto `servizi.php`, la usano i
 * rami finti): la forma **vera** dell'elenco si normalizza qui sotto, accanto
 * a `normalizzaServizioCreato` che già tratta questa forma.
 */

/** Messaggio generico per gli errori di input (regola del 27/09/2026). */
const MESSAGGIO_INPUT_NON_VALIDO =
  'Controlla i dati inseriti: manca qualcosa o non è valido.';

/** La creazione traduce `400` e `404` (input invalido, categoria inesistente) nello stesso testo. */
const MESSAGGI_CREAZIONE = {
  400: MESSAGGIO_INPUT_NON_VALIDO,
  404: MESSAGGIO_INPUT_NON_VALIDO,
};

/**
 * La modifica e l'eliminazione hanno messaggi propri (14/10/2026): §3, la UI
 * non mostra mai l'inglese del backend. Il `409` non sta qui perché il testo
 * cambia fra modifica ed eliminazione: si aggiunge al momento della chiamata.
 * Il `403` è l'account inattivo, l'unico caso in cui la scrittura è respinta
 * per lo stato dell'utente e non per la voce.
 */
const MESSAGGI_GESTIONE_VOCE = {
  400: MESSAGGIO_INPUT_NON_VALIDO,
  403: 'Il tuo account non è attivo: non puoi gestire le tue voci.',
  404: 'Non trovo più questa voce: potrebbe essere stata eliminata.',
};

const MESSAGGIO_409_MODIFICA =
  'Questa voce è usata in una proposta o in uno scambio: non si può modificare finché dura.';
const MESSAGGIO_409_ELIMINA =
  'Questa voce è usata in una proposta o in uno scambio: non si può eliminare finché dura.';
const MESSAGGIO_409_STATO =
  'Questa voce è usata in una proposta o in uno scambio: non si può sospendere né ripubblicare finché dura.';

/**
 * Rilancia l'errore di una scrittura sostituendo il testo del backend con
 * quello della mappa passata: qualunque testo mandi il backend, la UI vede il
 * nostro. Gli status fuori mappa (rete assente, timeout, 5xx, e il `401` che
 * gestisce da solo `client.js`) passano immutati, già generici perché il
 * messaggio lo costruisce `client.js`.
 */
async function conMessaggioGenerico(chiamata, messaggi = MESSAGGI_CREAZIONE) {
  try {
    return await chiamata;
  } catch (err) {
    if (err instanceof ApiError && messaggi[err.status]) {
      throw new ApiError(err.status, messaggi[err.status]);
    }
    throw err;
  }
}

/**
 * Il tipo interno della voce (`'OFFERTA'|'RICERCA'`) nel valore che il
 * contratto vuole (`'OFFER'|'REQUEST'`). Uno tipo sconosciuto non si manda in
 * rete: `null`, e la guardia sotto rifiuta l'invio.
 */
function tipoContratto(tipo) {
  if (tipo === TIPI_VOCE.OFFERTA) {
    return 'OFFER';
  }
  if (tipo === TIPI_VOCE.RICERCA) {
    return 'REQUEST';
  }
  return null;
}

/**
 * La voce del form (forma interna, `{tipo, idCategoria, mansione, …}`) nel
 * corpo del contratto: `{type, description, categoryIds, isRemote, location}`.
 * Stesso
 * criterio di `aCorpoVoci` in `barattolo.js` per la registrazione, ma
 * dell'area: qui la categoria è una sola e il tipo viaggia nel corpo, non
 * nelle sezioni.
 *
 * La conversione sta **qui e non nella schermata** (§3): il form non sa niente
 * del backend. `daRemoto` viaggia come `isRemote` (il contratto lo modella dal
 * 14/10/2026); `location` viaggia come `"Provincia (Regione)"` costruita dalla
 * coppia `regione`/`provincia` della voce (dal 16/10/2026, PR #37: il backend
 * la salva — problema 29 chiuso), o `null` se manca qualcosa. `isSuspended`
 * non si manda: la creazione dal form è sempre pubblicata (il backend mette
 * `false`).
 */
// Esportata solo per i controlli a terminale (pezzo 01 del piano 16/10/2026).
export function aCorpoCreazione(voce) {
  return {
    type: tipoContratto(voce?.tipo),
    description: String(voce?.mansione ?? '').trim(),
    categoryIds: voce?.idCategoria === null || voce?.idCategoria === undefined ? [] : [voce.idCategoria],
    isRemote: voce?.daRemoto === true,
    location: formattaLocalita(voce?.provincia, voce?.regione) ?? null,
  };
}

/**
 * La voce del form nella **modifica**: le cose che il contratto ammette,
 * `{description, categoryIds, isRemote, location}`. `categoryIds`
 * **sostituisce**
 * l'intera lista, per questo una voce porta la sua sola categoria; `id`,
 * `type` e `createdAt` non si mandano — non si cambiano, e un campo in più fa
 * `400`. `isSuspended` non si manda: lo stato si cambia con l'azione dedicata,
 * e il PATCH parziale lascia intatto ciò che non si manda.
 *
 * `location` è **sempre presente** nel corpo (stringa `"Provincia (Regione)"`
 * o `null`): nel `PATCH` la chiave omessa lascia il valore attuale, il `null`
 * esplicito lo cancella — così il PATCH è deterministico, ciò che il form
 * mostra è ciò che il backend salva, e selettori svuotati cancellano la
 * località (dal 16/10/2026, PR #37).
 *
 * Una categoria mancante o non intera positiva è un errore di chi chiama, non
 * del server: la schermata valida prima di arrivare qui, quindi la si rifiuta
 * con lo stesso `400` generico invece di far rispondere il backend. `null` =
 * non inviare.
 */
// Esportata solo per i controlli a terminale (pezzo 01 del piano 16/10/2026).
export function aCorpoAggiornamento(voce) {
  const idCategoria = numeroInteroONull(voce?.idCategoria);
  if (idCategoria === null || idCategoria < 1) {
    return null;
  }
  return {
    description: String(voce?.mansione ?? '').trim(),
    categoryIds: [idCategoria],
    isRemote: voce?.daRemoto === true,
    location: formattaLocalita(voce?.provincia, voce?.regione) ?? null,
  };
}

/**
 * La rotta della voce nel contratto: `offers/{id}` per l'offerta,
 * `requests/{id}` per la ricerca. Un tipo sconosciuto o un id non intero
 * positivo non scelgono una rotta: `null`, e chi chiama rifiuta l'invio.
 */
function rottaVoce(tipo, id) {
  const idValido = numeroInteroONull(id);
  if (idValido === null || idValido < 1) {
    return null;
  }
  if (tipo === TIPI_VOCE.OFFERTA) {
    return `offers/${idValido}`;
  }
  if (tipo === TIPI_VOCE.RICERCA) {
    return `requests/${idValido}`;
  }
  return null;
}

/**
 * La busta `{service: {...}}` del backend nella forma interna della voce
 * creata: `{id, tipo, descrizione, categorie, data, daRemoto, localita}` —
 * le chiavi che la UI conosce già (`tipo` nelle due parole italiane,
 * `categorie` come `{id, nome}`); `localita` arriva da `location` (dal
 * 16/10/2026, PR #37). Una risposta senza `service` non si inventa: esce
 * `null`.
 * `toApiArray` non porta `createdAt`, quindi `data` resta `null`: è così, non
 * si inventa una data.
 */
export function normalizzaServizioCreato(risposta) {
  const servizio = risposta?.service;
  if (!servizio || typeof servizio !== 'object') {
    return null;
  }
  const tipo =
    servizio.type === 'OFFER'
      ? TIPI_VOCE.OFFERTA
      : servizio.type === 'REQUEST'
        ? TIPI_VOCE.RICERCA
        : null;
  return {
    id: typeof servizio.id === 'number' ? servizio.id : null,
    tipo,
    descrizione: typeof servizio.description === 'string' ? servizio.description : '',
    categorie: (Array.isArray(servizio.categories) ? servizio.categories : []).map((categoria) => ({
      id: typeof categoria?.id === 'number' ? categoria.id : null,
      nome: typeof categoria?.description === 'string' ? categoria.description : '',
    })),
    data: typeof servizio.createdAt === 'string' ? servizio.createdAt : null,
    daRemoto: servizio.isRemote === true,
    localita: typeof servizio.location === 'string' ? servizio.location : '',
  };
}

/**
 * Una riga dell'elenco reale (`GET /api/offers/mine`, `GET /api/requests/mine`)
 * nella forma della voce della UI: le **stesse chiavi** di
 * `normalizzaPubblicazione` di `normalizzazioni.js` (le sezioni della
 * schermata filtrano per `tipo` e la scheda legge `idCategoria`/`mansione`).
 *
 * La mappa della forma: `type → tipo`, `description → mansione`,
 * `categories[0].id → idCategoria` (una voce porta una categoria sola); e
 * `chiave` segue lo stesso criterio (`${tipo}-${id}`) di
 * `normalizzaPubblicazione`. `createdAt` alla scheda non serve e non si
 * copia. `daRemoto` arriva da `isRemote` (lo modella dal 14/10/2026);
 * `localita` arriva da `location` (dal 16/10/2026, PR #37: il backend la
 * salva, problema 29 chiuso) e alla modifica alimenta i selettori
 * regione/provincia (`analizzaLocalita` la rilegge in `offro-e-cerco.jsx`).
 * Lo **stato** di pubblicazione arriva da `isSuspended` (PR #34): sospesa solo
 * quando il booleano è `true`, pubblicata in ogni altro caso.
 *
 * Una riga senza `id` intero o con `type` sconosciuto non si può mostrare:
 * `null`, come già fa `normalizzaPubblicazione` per la forma vecchia.
 */
export function normalizzaVocePropria(riga) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const tipo =
    riga.type === 'OFFER'
      ? TIPI_VOCE.OFFERTA
      : riga.type === 'REQUEST'
        ? TIPI_VOCE.RICERCA
        : null;
  const id = numeroInteroONull(riga.id);
  if (tipo === null || id === null) {
    return null;
  }
  const stato = riga.isSuspended === true ? STATI_PUBBLICAZIONE.SOSPESA : STATI_PUBBLICAZIONE.PUBBLICATA;
  return {
    chiave: `${tipo}-${id}`,
    tipo,
    id,
    idCategoria: numeroInteroONull(riga.categories?.[0]?.id),
    mansione: typeof riga.description === 'string' ? riga.description : '',
    daRemoto: riga.isRemote === true,
    localita: typeof riga.location === 'string' ? riga.location : '',
    stato,
  };
}

/**
 * Le due buste dell'elenco — `{offers: […]}` e/o `{requests: […]}` — in una
 * **lista sola** di voci: nel contratto sono due rotte, nella schermata è un
 * elenco che poi divide per `tipo`. Le righe non mostrabili si scartano.
 * Niente riordinatura: l'ordine è quello del backend, dalla più recente
 * (`createdAt` poi `id`).
 */
export function normalizzaVociProprie(rispostaOfferte, rispostaRichieste) {
  const righe = [
    ...(Array.isArray(rispostaOfferte?.offers) ? rispostaOfferte.offers : []),
    ...(Array.isArray(rispostaRichieste?.requests) ? rispostaRichieste.requests : []),
  ];
  return righe.map(normalizzaVocePropria).filter(Boolean);
}

/**
 * GET /api/offers/mine + GET /api/requests/mine — l'elenco delle **mie** voci,
 * offerte e ricerche.
 *
 * Due rotte distinte nel contratto, un elenco solo per la schermata: la
 * `Promise.all` le fa partire insieme e il `401` di token assente/scaduto lo
 * gestisce già `client.js` (logout e ritorno al login). **Un elenco vuoto non
 * è un errore**: `{offers: []}` e `{requests: []}` diventano liste vuote della
 * stessa forma — mai la variante «non disponibile» della schermata.
 *
 * `utenteId` serve **solo** al ramo finto, come nella creazione: il finto non
 * decodifica il token di accesso. Con i finti spenti nessun ramo tocca un
 * `servizi.php` (rotta che non esiste: il vecchio ramo vero del deposito va
 * tolto; la sottrazione dal codice segue nel pezzo 02).
 */
export async function ottieniPubblicazioni(token, utenteId) {
  if (USA_DATI_FINTI) {
    // TODO(backend): GET servizi.php → {success, message, data:{servizi:[…]}}.
    return normalizzaPubblicazioni(fintiServizi.ottieniServizi(utenteId));
  }
  const [rispostaOfferte, rispostaRichieste] = await Promise.all([
    apiFetch('offers/mine', { token }),
    apiFetch('requests/mine', { token }),
  ]);
  return normalizzaVociProprie(rispostaOfferte, rispostaRichieste);
}

/**
 * PATCH /api/offers/{id} o PATCH /api/requests/{id} — modifica descrizione e
 * categorie di una voce propria (contratto reale dal 13/10/2026, PR #30 e #32).
 *
 * La risposta `{offer}`/`{request}` torna normalizzata con
 * `normalizzaVocePropria`, la stessa forma dell'elenco: alla schermata serve la
 * riga aggiornata, non la busta. Il `409` («voce usata in una proposta o in uno
 * scambio») ha il suo testo in `MESSAGGIO_409_MODIFICA`. `utenteId` serve solo
 * al ramo finto, che non decodifica il token.
 */
export async function aggiornaPubblicazione(token, utenteId, voce) {
  if (USA_DATI_FINTI) {
    // TODO(backend): POST servizi.php {azione:'aggiorna', id, …}.
    return normalizzaServizio(
      fintiServizi.aggiornaServizio(
        utenteId,
        voce.id,
        voce.tipo,
        aPayloadAggiornamento(voce),
      ),
    );
  }
  const rotta = rottaVoce(voce?.tipo, voce?.id);
  const corpo = aCorpoAggiornamento(voce);
  if (!rotta || !corpo || !corpo.description) {
    throw new ApiError(400, MESSAGGIO_INPUT_NON_VALIDO);
  }
  const risposta = await conMessaggioGenerico(apiFetch(rotta, { method: 'PATCH', token, body: corpo }), {
    ...MESSAGGI_GESTIONE_VOCE,
    409: MESSAGGIO_409_MODIFICA,
  });
  return normalizzaVocePropria(risposta?.offer ?? risposta?.request);
}

/**
 * PATCH /api/offers/{id} o PATCH /api/requests/{id} — il **cambio di stato** di
 * una voce propria (pubblica/sospesa, reale dal 15/10/2026, PR #34): il corpo
 * porta solo `isSuspended`, perché il PATCH parziale lascia intatto ciò che non
 * si manda. La risposta `{offer}`/`{request}` torna normalizzata con
 * `normalizzaVocePropria`, la stessa forma dell'elenco: alla schermata serve la
 * riga aggiornata, non la busta. Il `409` («voce usata in una proposta o in uno
 * scambio») ha il suo testo in `MESSAGGIO_409_STATO`. `utenteId` serve solo al
 * ramo finto, che non decodifica il token.
 */
export async function cambiaStatoPubblicazione(token, utenteId, id, tipo, stato) {
  if (USA_DATI_FINTI) {
    // TODO(backend): POST servizi.php {azione:'stato', id, tipo, stato}.
    return normalizzaServizio(fintiServizi.cambiaStatoServizio(utenteId, id, tipo, stato));
  }
  const rotta = rottaVoce(tipo, id);
  if (!rotta) {
    throw new ApiError(400, MESSAGGIO_INPUT_NON_VALIDO);
  }
  const risposta = await conMessaggioGenerico(
    apiFetch(rotta, {
      method: 'PATCH',
      token,
      body: { isSuspended: stato === STATI_PUBBLICAZIONE.SOSPESA },
    }),
    { ...MESSAGGI_GESTIONE_VOCE, 409: MESSAGGIO_409_STATO },
  );
  return normalizzaVocePropria(risposta?.offer ?? risposta?.request);
}

/**
 * DELETE /api/offers/{id} o DELETE /api/requests/{id} — toglie una voce propria
 * (contratto reale dal 13/10/2026, PR #30 e #32). Il `204` non porta corpo: la
 * funzione non restituisce niente, la voce non c'è più. Il `409` («voce usata
 * in una proposta o in uno scambio») ha il suo testo in `MESSAGGIO_409_ELIMINA`.
 */
export async function eliminaPubblicazione(token, utenteId, id, tipo) {
  if (USA_DATI_FINTI) {
    // TODO(backend): POST servizi.php {azione:'elimina', id, tipo}.
    fintiServizi.eliminaServizio(utenteId, id, tipo);
    return;
  }
  const rotta = rottaVoce(tipo, id);
  if (!rotta) {
    throw new ApiError(400, MESSAGGIO_INPUT_NON_VALIDO);
  }
  await conMessaggioGenerico(apiFetch(rotta, { method: 'DELETE', token }), {
    ...MESSAGGI_GESTIONE_VOCE,
    409: MESSAGGIO_409_ELIMINA,
  });
}

/**
 * POST /api/services — pubblica una **nuova** voce.
 *
 * Con i finti accesi la creazione resta fintata (comportamento demo invariato,
 * vincolo 5 del piano): il corpo passa da `aPayloadPubblicazione`, la forma del
 * deposito finto; `utenteId` serve **solo** a quel ramo, perché il finto non
 * decodifica il token di accesso. Con i finti spenti l'identità viaggia nel
 * token e la risposta `201 {service:{…}}` esce normalizzata.
 *
 * La guardia sul corpo è difensiva: la schermata valida già (`validaVoce`) e
 * disabilita l'invio senza categoria, quindi nessun flusso reale arriva qui
 * senza `type` o `description`.
 */
export async function creaPubblicazione(token, utenteId, voce) {
  if (USA_DATI_FINTI) {
    // TODO(backend): POST servizi.php con la riga creata e il suo id nella risposta.
    return normalizzaServizio(fintiServizi.creaServizio(utenteId, aPayloadPubblicazione(voce)));
  }

  const corpo = aCorpoCreazione(voce);
  if (!corpo.type || !corpo.description || corpo.categoryIds.length === 0) {
    // 400 come lo manderebbe il backend per un corpo incompleto, con il
    // messaggio generico già pronto per la UI.
    throw new ApiError(400, MESSAGGIO_INPUT_NON_VALIDO);
  }
  const voceCreata = normalizzaServizioCreato(
    await conMessaggioGenerico(
      apiFetch('services', { method: 'POST', token, body: corpo }),
    ),
  );
  // La risposta porta la voce **con il suo id** (`service` del contratto): è
  // una sorgente reale del registro delle mie voci (vincolo 14 del piano
  // 05-catene). Con i finti attivi non si alimenta: niente id veri.
  if (voceCreata?.id !== null && voceCreata?.id !== undefined) {
    aggiungiMiaVoce(utenteId, {
      id: voceCreata.id,
      description: voceCreata.descrizione,
      categories: voceCreata.categorie.map((categoria) => ({ id: categoria.id })),
    }, voceCreata.tipo ?? voce?.tipo);
  }
  return voceCreata;
}
