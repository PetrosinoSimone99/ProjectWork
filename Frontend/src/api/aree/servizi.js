import { ApiError, apiFetch } from '../client';
import { USA_DATI_FINTI } from '../config';
import {
  normalizzaPubblicazioni,
  normalizzaServizio,
  normalizzaStatoPubblicazione,
  numeroInteroONull,
} from '../normalizzazioni';
import * as fintiServizi from '../finti/servizi';
import {
  aPayloadAggiornamento,
  aPayloadPubblicazione,
  TIPI_VOCE,
} from '@/servizi/offerta-ricerca';
import { aggiungiMiaVoce } from '@/servizi/mie-voci';

/**
 * Area «Offro e cerco»: la **creazione** di una voce via `POST /api/services`
 * (primo smistamento dell'area, decide il piano del passo 2, P53), dal
 * 14/10/2026 anche la **lettura** dell'elenco delle voci proprie
 * (`GET /api/offers/mine` + `GET /api/requests/mine`, PR #30 e #32).
 * Modifica e cambio stato ed eliminazione restano fintate (pezzo 02 del piano
 * *offro-e-cerco-reale* per i primi due): le quattro funzioni dell'area se ne
 * vanno qui (pattern P53), con il ramo finto identico a prima — la demo non
 * si tocca.
 *
 * Per §3 di `AGENTS.md`: questo file traduce forma interna ↔ contratto, le
 * schermate non vedono mai i nomi del backend. `normalizzazioni.js` resta la
 * casa della **forma vecchia** (quella del finto `servizi.php`, la usano i
 * rami finti): la forma **vera** dell'elenco si normalizza qui sotto, accanto
 * a `normalizzaServizioCreato` che già tratta questa forma.
 */

/** Messaggio generico per gli errori di input della creazione (regola del 27/09/2026). */
const MESSAGGIO_INPUT_NON_VALIDO =
  'Controlla i dati inseriti: manca qualcosa o non è valido.';

/**
 * Rilancia l'errore della creazione con il messaggio generico per `400` e
 * `404` (input invalido, categoria inesistente): qualunque testo mandi il
 * backend, la UI vede solo questo. Gli altri status (rete assente, timeout,
 * 5xx, e il `401` che gestisce da solo `client.js`) passano immutati, già
 * generici perché il messaggio lo costruisce `client.js`.
 */
async function conMessaggioGenerico(chiamata) {
  try {
    return await chiamata;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 400 || err.status === 404)) {
      throw new ApiError(err.status, MESSAGGIO_INPUT_NON_VALIDO);
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
 * corpo del contratto: `{type, description, categoryIds}`. Stesso criterio di
 * `aCorpoVoci` in `barattolo.js` per la registrazione, ma dell'area: qui la
 * categoria è una sola e il tipo viaggia nel corpo, non nelle sezioni.
 *
 * La conversione sta **qui e non nella schermata** (§3): il form non sa niente
 * del backend. `da_remoto` e `localita` non viaggiano: il contratto non li
 * modella (vedi il commento di `aCorpoVoci`).
 */
function aCorpoCreazione(voce) {
  return {
    type: tipoContratto(voce?.tipo),
    description: String(voce?.mansione ?? '').trim(),
    categoryIds: voce?.idCategoria === null || voce?.idCategoria === undefined ? [] : [voce.idCategoria],
  };
}

/**
 * La busta `{service: {...}}` del backend nella forma interna della voce
 * creata: `{id, tipo, descrizione, categorie, data}` — le chiavi che la UI
 * conosce già (`tipo` nelle due parole italiane, `categorie` come `{id, nome}`).
 * Una risposta senza `service` non si inventa: esce `null`.
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
  };
}

/** Stato con cui il vecchio deposito finto segna la voce togliuta: non si mostra. */
const STATO_ELIMINATA = 'ELIMINATA';

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
 * copia. `daRemoto` e `localita` restano vuoti: il contratto non li salva
 * (`POST` e `PATCH` ammettono solo
 * `type/description/categoryIds`) e alla modifica i selettori partono vuoti
 * (decisione del titolare, 14/10/2026; segnalazione ai colleghi al pezzo 05).
 * Lo **stato** di pubblicazione non esiste nel contratto: resta «Pubblicata»
 * e la UI nasconderà chip e «Sospendi» nel ramo reale (pezzo 04).
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
  const stato = normalizzaStatoPubblicazione(undefined);
  if (stato === STATO_ELIMINATA) {
    return null;
  }
  return {
    chiave: `${tipo}-${id}`,
    tipo,
    id,
    idCategoria: numeroInteroONull(riga.categories?.[0]?.id),
    mansione: typeof riga.description === 'string' ? riga.description : '',
    daRemoto: false,
    localita: '',
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

/** POST servizi.php azione "aggiorna" — modifica categoria, mansione, remoto, località. */
export async function aggiornaPubblicazione(token, utenteId, voce) {
  const corpo = aPayloadAggiornamento(voce);
  if (USA_DATI_FINTI) {
    // TODO(backend): POST servizi.php {azione:'aggiorna', id, …}.
    return normalizzaServizio(
      fintiServizi.aggiornaServizio(utenteId, voce.id, voce.tipo, corpo),
    );
  }
  // TODO(backend): PATCH /api/offers/{id} e PATCH /api/requests/{id} — il ramo
  // vero arriva nel pezzo 02 del piano (descrizione e categorie si
  // sostituiscono, il resto del form si scarta). Finché non c'è si fallisce in
  // modo esplicito: niente rotte inventate (§4 di AGENTS.md); con il vecchio
  // ramo su `servizi.php` il `404` arriva lo stesso, ma da una rotta che non
  // esiste e senza un messaggio nostro.
  throw new ApiError(400, MESSAGGIO_INPUT_NON_VALIDO);
}

/** POST servizi.php azione "stato" — sospende o ripubblica una voce. */
export async function cambiaStatoPubblicazione(token, utenteId, id, tipo, stato) {
  if (USA_DATI_FINTI) {
    // TODO(backend): POST servizi.php {azione:'stato', id, tipo, stato}.
    return normalizzaServizio(fintiServizi.cambiaStatoServizio(utenteId, id, tipo, stato));
  }
  // Lo stato di pubblicazione **non esiste nel contratto** (decisione del
  // titolare, 14/10/2026): nessun ramo vero. Il pezzo 04 nasconde l'azione
  // nella schermata; qui si fallisce esplicitamente invece che colpire una
  // rotta inesistente (§4).
  throw new ApiError(400, MESSAGGIO_INPUT_NON_VALIDO);
}

/**
 * POST servizi.php azione "elimina" — toglie la voce.
 * Cancellazione definitiva o rimozione logica la deciderà il `DELETE` vero
 * (pezzo 02); per la UI il risultato è lo stesso: la voce non c'è più.
 */
export async function eliminaPubblicazione(token, utenteId, id, tipo) {
  if (USA_DATI_FINTI) {
    // TODO(backend): POST servizi.php {azione:'elimina', id, tipo}.
    fintiServizi.eliminaServizio(utenteId, id, tipo);
    return;
  }
  // TODO(backend): DELETE /api/offers/{id} e DELETE /api/requests/{id}
  // (pezzo 02); come sopra, niente rotte inventate finché il ramo vero non
  // ha la sua funzione (§4).
  throw new ApiError(400, MESSAGGIO_INPUT_NON_VALIDO);
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
