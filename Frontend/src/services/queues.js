import { TIPI_VOCE } from '@/services/offer-request';

/**
 * The pure half of the queue surface: the Italian labels for the wire words
 * and the local gate that keeps a create call from reaching a backend that
 * would fatal on it. No network here — the API layer owns that
 * (`src/api/areas/queues.js`).
 */

/** Wire queue type (`QueueType`) -> Italian label. */
export const QUEUE_TYPE_LABELS = {
  OFFER: 'Offerta',
  REQUEST: 'Ricerca',
};

/** Wire queue status (`QueueStatus`) -> Italian label. */
export const QUEUE_STATUS_LABELS = {
  OPEN: 'In attesa',
  IN_PROGRESS: 'In corso',
  CLOSED: 'Chiusa',
};

/** Fallbacks for a missing or unknown wire value: neutral, never a guess. */
const TIPO_NON_DISPONIBILE = 'Tipo non indicato';
const STATO_NON_DISPONIBILE = 'Stato non indicato';

/** The label of a queue type, or a neutral word when the value is unknown. */
export function queueTypeLabel(tipo) {
  return QUEUE_TYPE_LABELS[tipo] ?? TIPO_NON_DISPONIBILE;
}

/** The label of a queue status, or a neutral word when the value is unknown. */
export function queueStatusLabel(stato) {
  return QUEUE_STATUS_LABELS[stato] ?? STATO_NON_DISPONIBILE;
}

/** Queue type -> the viewer's own service kind (`TIPI_VOCE`). */
const TIPO_SERVIZIO = {
  OFFER: TIPI_VOCE.OFFERTA,
  REQUEST: TIPI_VOCE.RICERCA,
};

/**
 * The account's own services of the queue's type, newest first — the gate on
 * both create buttons.
 *
 * Backend facts that decide the rule (`ServiceQueueManager::createServiceQueue`,
 * `ServiceRepository::getUserServiceByType`):
 *
 * - the lookup ends with `getOneOrNullResult()`, so **two** services of the
 *   same type make Doctrine throw `NonUniqueResultException`, which escapes to
 *   the framework error handler as a `500` (the controller's `catch (Exception)`
 *   never matches: `backend-gaps.md` G13) — and for a `REQUEST` queue the
 *   credit is spent **before** that lookup (measured: the demo accounts have
 *   several services of each type, so the route cannot create a queue for them
 *   at all, `backend-gaps.md` G19);
 * - no service of that type makes the same lookup return `null` and the queue
 *   constructor throw an uncaught `TypeError`, also not a `400` the app could
 *   translate.
 *
 * So the caller may create a queue only when this list has exactly one row.
 * The helper fails closed: an unknown queue type, a list that is not a list, or
 * rows with an unexpected `tipo` all give `[]`.
 *
 * `servizi` is the list `listMyServices` returns: rows carry `tipo` as
 * `TIPI_VOCE.OFFERTA` / `TIPI_VOCE.RICERCA` (`normalizeOwnedService`).
 */
export function servicesOfQueueType(servizi, tipoCoda) {
  const tipoServizio = TIPO_SERVIZIO[tipoCoda];
  if (tipoServizio === undefined || !Array.isArray(servizi)) {
    return [];
  }
  return servizi.filter((voce) => voce?.tipo === tipoServizio);
}
