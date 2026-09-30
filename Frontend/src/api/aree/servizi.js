import { ApiError, apiFetch } from '../client';
import { USA_DATI_FINTI } from '../config';
import { normalizzaServizio } from '../normalizzazioni';
import * as fintiServizi from '../finti/servizi';
import { aPayloadPubblicazione, TIPI_VOCE } from '@/servizi/offerta-ricerca';

/**
 * Area «Offro e cerco»: la **creazione** di una voce via `POST /api/services`
 * (primo smistamento dell'area, decide il piano del passo 2, P53).
 *
 * Il backend nuovo offre **solo la creazione**: non esiste un endpoint che
 * restituisca le proprie voci, quindi elenco, modifica, cambio stato ed
 * eliminazione restano nel deposito finto di `api/finti/servizi.js`
 * (`barattolo.js` conserva le loro funzioni, fintate, con il `TODO(backend)`).
 *
 * Per §3 di `AGENTS.md`: questo file traduce forma interna ↔ contratto, le
 * schermate non vedono mai i nomi del backend. La normalizzazione della voce
 * dell'**elenco** resta in `normalizzazioni.js` (la usano anche i finti).
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
  return normalizzaServizioCreato(
    await conMessaggioGenerico(
      apiFetch('services', { method: 'POST', token, body: corpo }),
    ),
  );
}
