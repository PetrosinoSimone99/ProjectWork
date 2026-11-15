import { ApiError, apiFetch } from '../client';
import { normalizeQueues } from '../normalizers';

/**
 * Service queues area: `GET /get-queues`, `POST /create-service-queue`,
 * `POST /cancel-queue/{id}`.
 *
 * Two backend facts decide the shape of this layer:
 *
 * - `GET /get-queues` answers `404` when the account has no queue
 *   (`QueueController::getQueues` runs `if (!$queuesDTO)`), so a `404` here
 *   means "the list is empty" and becomes `[]`, not an error the screen would
 *   have to explain.
 * - `POST /create-service-queue` maps **any** string other than `OFFER` to
 *   `REQUEST` (`ServiceQueueManager::createServiceQueue`) and spends a credit
 *   for it before the account's services are looked up, so the `queueType`
 *   guard runs before the network call, never after.
 */

/** What the app says when the account has no credit left for a queue. */
export const INSUFFICIENT_CREDITS_MESSAGE =
  'Crediti insufficienti: una coda di ricerca costa un credito e il saldo è a zero in app.';

/** Copy for a body the backend would reject — or that we reject for it. */
const INVALID_INPUT_MESSAGE = 'Controlla i dati inseriti: manca qualcosa o non è valido.';

/** Copy for `401` on create: without a usable session there is no queue. */
const NOT_AUTHENTICATED_MESSAGE = 'Devi accedere per usare le code.';

/** The backend body of `NotEnoughCreditsException` (`QueueController`). */
const NOT_ENOUGH_CREDITS_RAW = 'Not enough credits';

/**
 * GET /get-queues — the viewer's own queues.
 *
 * A `404` is the backend's "list is empty" answer, not a missing route: it
 * becomes `[]`. Every other error keeps its `ApiError` for the screen.
 */
export async function listQueues(token) {
  try {
    return normalizeQueues(await apiFetch('get-queues', { token }));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return [];
    }
    throw err;
  }
}

/**
 * POST /create-service-queue — one queue of the given type.
 *
 * `tipo` must be exactly `OFFER` or `REQUEST`: any other string would be
 * coerced to `REQUEST` by the backend and spend a credit for nothing, so an
 * unknown type is refused here, before the request is made. On the way back,
 * `400 {"error": "Not enough credits"}` becomes the exported copy (the raw
 * English text is for the log, never for the screen), every other `400` the
 * generic invalid-input copy and `401` the copy for a session the backend
 * refuses.
 */
export async function createQueue(token, tipo) {
  if (tipo !== 'OFFER' && tipo !== 'REQUEST') {
    throw new ApiError(400, INVALID_INPUT_MESSAGE);
  }
  try {
    await apiFetch('create-service-queue', {
      method: 'POST',
      token,
      body: { queueType: tipo },
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) {
      throw new ApiError(
        400,
        err.raw === NOT_ENOUGH_CREDITS_RAW ? INSUFFICIENT_CREDITS_MESSAGE : INVALID_INPUT_MESSAGE,
      );
    }
    if (err instanceof ApiError && err.status === 401) {
      throw new ApiError(401, NOT_AUTHENTICATED_MESSAGE);
    }
    throw err;
  }
}

/**
 * POST /cancel-queue/{id} — closes a queue (and, when it is attached to an
 * agreement, that agreement too: `ServiceQueueManager::cancelServiceQueue`).
 *
 * The id travels in the path, so it is checked here: a non-integer or a
 * non-positive id is refused before the request instead of asking the route
 * to fail however it prefers.
 *
 * There is **no status to translate on the way back**: the route answers `200`
 * even when nothing happened (unknown id, another account's queue, an already
 * closed one — the manager only acts on a match and the controller always
 * answers success, `backend-gaps.md` G21). A `404` cannot come from a valid id,
 * so none is mapped here; the screen's list is what tells the reader the state.
 */
export async function cancelQueue(token, id) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, INVALID_INPUT_MESSAGE);
  }
  await apiFetch(`cancel-queue/${id}`, { method: 'POST', token });
}
