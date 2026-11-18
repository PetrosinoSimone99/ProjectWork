/**
 * The pure half of the queue surface: the Italian labels for the wire words
 * and the local gate that keeps a create call from reaching a backend that
 * would answer a `500` instead of a `409`. No network here — the API layer owns
 * that (`src/api/areas/queues.js`).
 *
 * There used to be a second gate here: the account had to own **exactly one**
 * service of the queue's type (`backend-ledger.md` G13, G19). Every account now
 * holds one offer and one request, both mandatory, so that count is always one
 * and the gate could never say anything the product rule did not already
 * guarantee. What is left is the one server fact the app still has to model on
 * its own: one active queue at a time.
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

/**
 * Whether one of these queues is still active, i.e. blocks a further create.
 *
 * Backend `4c90ccd` put a guard at the head of
 * `ServiceQueueManager::createServiceQueue`: while the account holds a queue
 * whose status is not `CLOSED`, the route throws
 * `User already has an active queue.` — a plain `\Exception` that the
 * controller cannot catch (`backend-ledger.md` G13), so the client would read a
 * `500`. The guard counts **both** queue types together (`backend-ledger.md`
 * G23), which is exactly the product rule: one credit, one queue at a time, of
 * one type.
 *
 * `GET /get-queues` already excludes `CLOSED` rows
 * (`ServiceQueueRepository::getServiceQueuesByUser`), so on real data this is
 * `queues.length > 0`; the status is still checked so the predicate stays true
 * if the route ever starts returning history. Fails closed: a list that is not
 * a list is "no queue".
 */
export function hasActiveQueue(code) {
  if (!Array.isArray(code)) {
    return false;
  }
  return code.some((coda) => coda?.stato !== 'CLOSED');
}
