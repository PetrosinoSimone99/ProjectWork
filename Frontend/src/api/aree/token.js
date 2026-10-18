import { ApiError, apiFetch } from '../client';
import { numeroInteroONull, testoONull } from '../normalizzazioni';

/**
 * Area «Buoni»: il contratto reale dei token di compensazione
 * (`GET /api/tokens`, `POST /api/tokens/{id}/reserve`,
 * `POST /api/token-redemptions/{id}/receipt` e `/cancel`, PR #38 —
 * `docs/20-contratti-api/catene.md` § «L'utilizzo di un buono su un servizio»).
 *
 * Nome da non confondere: nel progetto «token» significa già il **token di
 * accesso** (`auth/token-store.js`, il Bearer di ogni chiamata). Qui è un'altra
 * cosa — il buono che dà diritto a **un servizio qualsiasi gratis**. I nomi
 * restano distinti: `token` nei parametri di rete è sempre quello di accesso,
 * mentre il buono è «buono» nella forma normalizzata. L'identità dell'utente
 * viaggia **solo** nel JWT: nessuna funzione di questa area prende un
 * `utenteId`.
 *
 * Nasce come gli altri file di `aree/`: la conversione forma interna ↔
 * contratto vive **qui**, mai nelle schermate (§3 di `AGENTS.md`), e
 * `barattolo.js` re-espone i nomi. Il normalizzatore del buono è **uno** e
 * serve anche «Scambi» (via `aree/catene.js`, che qui lo importa): i primi sei
 * campi della forma (`chiave, id, idCatena, emessoIl, scadeIl, scaduto`) sono
 * quelli già letti da `CardCatenaConclusa.jsx` e `scambi.jsx`.
 *
 * Le date restano **stringhe del backend**, nessuna scadenza si ricalcola nel
 * frontend: `expired` è il booleano del server. Uno stato (`status`) ignoto
 * passa **grezzo** alla UI, mai tradotto a caso.
 */

/** Uno stato del contratto (`AVAILABLE`, `RESERVED`, …) nella forma interna: grezzo, ma ripulito. */
function statoDi(valore) {
  if (typeof valore !== 'string') {
    return null;
  }
  const pulito = valore.trim().toUpperCase();
  return pulito === '' ? null : pulito;
}

/**
 * Un buono di compensazione (`GET /api/tokens`) nella forma della UI. Le date
 * restano stringhe del backend; `scaduto` è il booleano **calcolato dal
 * server** — il frontend non ricalcola scadenze. I buoni importati dal dump
 * possono avere `chainId` e `issuedAt` nulli: restano nulli, la UI lo sa. Una
 * riga senza `id` non si può mostrare né usare in un'azione: si scarta.
 */
export function normalizzaBuono(riga) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const id = numeroInteroONull(riga.id);
  if (id === null) {
    return null;
  }
  return {
    chiave: `buono-${id}`,
    id,
    idCatena: numeroInteroONull(riga.chainId),
    emessoIl: testoONull(riga.issuedAt),
    scadeIl: testoONull(riga.expiresAt),
    scaduto: riga.expired === true,
    stato: statoDi(riga.status),
    idServizio: numeroInteroONull(riga.serviceId),
    idRiscatto: numeroInteroONull(riga.redemptionId),
    spesoIl: testoONull(riga.spentAt),
  };
}

/** L'elenco dei buoni: `{"tokens": [...]}`. */
export function normalizzaElencoBuoni(risposta) {
  const elenco = risposta?.tokens;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map(normalizzaBuono).filter(Boolean);
}

/**
 * Un riscatto (`token-redemptions`: la pratica che lega il buono all'offerta
 * impegnata) nella forma della UI. `stato` resta grezzo (`PENDING`,
 * `ACCEPTED`, `CANCELLED`, `COMPLETED`): lo interpreta la logica di
 * `servizi/token.js`, non il layer di rete.
 */
export function normalizzaRiscatto(riga) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const id = numeroInteroONull(riga.id);
  if (id === null) {
    return null;
  }
  return {
    chiave: `riscatto-${id}`,
    id,
    idBuono: numeroInteroONull(riga.tokenId),
    idServizio: numeroInteroONull(riga.serviceId),
    idDestinatario: numeroInteroONull(riga.recipientId),
    idFornitore: numeroInteroONull(riga.providerId),
    stato: statoDi(riga.status),
    creatoIl: testoONull(riga.createdAt),
    accettatoIl: testoONull(riga.acceptedAt),
    chiusoIl: testoONull(riga.closedAt),
  };
}

/** L'elenco dei riscatti: `{"redemptions": [...]}`. */
export function normalizzaElencoRiscatti(risposta) {
  const elenco = risposta?.redemptions;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map(normalizzaRiscatto).filter(Boolean);
}

/** La coppia `{buono, riscatto}` che le tre scritture del contratto restituiscono. */
function coppiaDaRisposta(risposta) {
  return {
    buono: normalizzaBuono(risposta?.token),
    riscatto: normalizzaRiscatto(risposta?.redemption),
  };
}

// ---------------------------------------------------------------------------
// Le cinque funzioni del contratto
// ---------------------------------------------------------------------------

/** GET /api/tokens — tutti i **propri** buoni, staff e catene, anche scaduti. */
export async function ottieniBuoni(token) {
  return normalizzaElencoBuoni(await apiFetch('tokens', { token }));
}

/** GET /api/token-redemptions — le proprie partecipazioni ai riscatti. */
export async function ottieniRiscatti(token) {
  return normalizzaElencoRiscatti(await apiFetch('token-redemptions', { token }));
}

/**
 * POST /api/tokens/{id}/reserve `{serviceId}` — impegna un buono `AVAILABLE`
 * su un'**offerta di un altro utente** (un servizio proprio o una ricerca
 * `REQUEST` risponde `400`). Non idempotente: un `409` (buono o offerta non
 * disponibili, transizione incompatibile) si mostra com'è e si rilegge.
 */
export async function impegnaBuono(token, idBuono, idServizio) {
  const idBuonoValido = numeroInteroONull(idBuono);
  const idServizioValido = numeroInteroONull(idServizio);
  if (idBuonoValido === null || idServizioValido === null) {
    throw new ApiError(400, 'Scegli un buono e un servizio prima di impegnare.');
  }
  return coppiaDaRisposta(
    await apiFetch(`tokens/${idBuonoValido}/reserve`, {
      method: 'POST',
      token,
      body: { serviceId: idServizioValido },
    }),
  );
}

/**
 * POST /api/token-redemptions/{id}/receipt — «Ho ricevuto il servizio»: il
 * buono va a `SPENT` con `spentAt`. Corpo **nessuno**; ripetuta risponde `200`
 * ed è idempotente.
 */
export async function confermaRicezioneBuono(token, idRiscatto) {
  const idValido = numeroInteroONull(idRiscatto);
  if (idValido === null) {
    throw new ApiError(404, 'Questo impegno non esiste più: ho ricaricato l\'elenco.');
  }
  return coppiaDaRisposta(
    await apiFetch(`token-redemptions/${idValido}/receipt`, { method: 'POST', token }),
  );
}

/**
 * POST /api/token-redemptions/{id}/cancel — annulla l'impegno: il riscatto va
 * a `CANCELLED` e buono e offerta tornano `AVAILABLE`. Corpo **nessuno**; il
 * `409` su un riscatto già chiuso si mostra com'è e si rilegge.
 */
export async function annullaRiscatto(token, idRiscatto) {
  const idValido = numeroInteroONull(idRiscatto);
  if (idValido === null) {
    throw new ApiError(404, 'Questo impegno non esiste più: ho ricaricato l\'elenco.');
  }
  return coppiaDaRisposta(
    await apiFetch(`token-redemptions/${idValido}/cancel`, { method: 'POST', token }),
  );
}
