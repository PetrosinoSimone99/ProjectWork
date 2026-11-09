import { ApiError, apiFetch } from '../client';
import {
  normalizeOwnedServices,
  normalizeServiceEnvelope,
  toIntegerOrNull,
} from '../normalizers';
import { STATI_PUBBLICAZIONE, TIPI_VOCE } from '@/services/offer-request';
import { formattaLocalita } from '@/services/italian-regions';

/**
 * Own services area: the viewer's offers and requests.
 *
 * Real endpoints only: `POST /services`, `GET /offers/mine` +
 * `GET /requests/mine`, `PATCH`/`DELETE` on `/offers/{id}` and `/requests/{id}`,
 * the deleted lists and the restore calls. Suspension is the `isSuspended` flag
 * through `PATCH`, which is why there is no separate endpoint for it.
 *
 * This file translates the form shape (`tipo`, `mansione`, `idCategoria`,
 * `daRemoto`, `provincia`/`regione`) into the contract shape
 * (`type`, `description`, `categoryIds`, `isRemote`, `location`); the screens
 * never see a backend key.
 */

const INVALID_INPUT_MESSAGE = 'Controlla i dati inseriti: manca qualcosa o non è valido.';

const CREATION_MESSAGES = {
  400: INVALID_INPUT_MESSAGE,
  404: INVALID_INPUT_MESSAGE,
};

/** A rejected write on an existing service: the copy changes with the action. */
const SERVICE_MESSAGES = {
  400: INVALID_INPUT_MESSAGE,
  403: 'Il tuo account non è attivo: non puoi gestire le tue voci.',
  404: 'Non trovo più questa voce: potrebbe essere stata eliminata.',
};

const CONFLICT_UPDATE =
  'Questa voce è usata in una proposta o in uno scambio: non si può modificare finché dura.';
const CONFLICT_DELETE =
  'Questa voce è usata in una proposta o in uno scambio: non si può eliminare finché dura.';
const CONFLICT_STATUS =
  'Questa voce è usata in una proposta o in uno scambio: non si può sospendere né ripubblicare finché dura.';

/** Rethrows with the Italian message of the table, other statuses untouched. */
async function withMessage(call, messages = CREATION_MESSAGES) {
  try {
    return await call;
  } catch (err) {
    if (err instanceof ApiError && messages[err.status]) {
      throw new ApiError(err.status, messages[err.status]);
    }
    throw err;
  }
}

/** `OFFERTA`/`RICERCA` into `OFFER`/`REQUEST`; anything else cannot travel. */
function contractType(type) {
  if (type === TIPI_VOCE.OFFERTA) {
    return 'OFFER';
  }
  if (type === TIPI_VOCE.RICERCA) {
    return 'REQUEST';
  }
  return null;
}

/** The route of one service: `offers/{id}` or `requests/{id}`. */
function serviceRoute(type, id) {
  const validId = toIntegerOrNull(id);
  if (validId === null || validId < 1) {
    return null;
  }
  if (type === TIPI_VOCE.OFFERTA) {
    return `offers/${validId}`;
  }
  if (type === TIPI_VOCE.RICERCA) {
    return `requests/${validId}`;
  }
  return null;
}

/** The location of the service as `Provincia (Regione)`, or `null`. */
function entryLocation(entry) {
  return formattaLocalita(entry?.provincia, entry?.regione) ?? null;
}

/**
 * The body of `POST /services`: `{type, description, categoryIds, isRemote,
 * location}`. `isSuspended` is not sent — a new service is published and the
 * backend defaults it to `false`.
 */
export function toCreateBody(entry) {
  return {
    type: contractType(entry?.tipo),
    description: String(entry?.mansione ?? '').trim(),
    categoryIds:
      entry?.idCategoria === null || entry?.idCategoria === undefined
        ? []
        : [entry.idCategoria],
    isRemote: entry?.daRemoto === true,
    location: entryLocation(entry),
  };
}

/**
 * The body of a `PATCH` on one service: the same editable fields.
 * `categoryIds` replaces the whole list, `location` is always present (`null`
 * clears it), and `id`/`type`/`createdAt` are not sent: a field the contract
 * does not allow makes the backend answer `400`.
 */
export function toUpdateBody(entry) {
  const categoryId = toIntegerOrNull(entry?.idCategoria);
  if (categoryId === null || categoryId < 1) {
    return null;
  }
  return {
    description: String(entry?.mansione ?? '').trim(),
    categoryIds: [categoryId],
    isRemote: entry?.daRemoto === true,
    location: entryLocation(entry),
  };
}

/**
 * GET /offers/mine + GET /requests/mine — the viewer's own services in a single
 * list, newest first. An empty answer is not an error: it becomes an empty
 * list, never the "not available" state.
 */
export async function listMyServices(token) {
  const [offers, requests] = await Promise.all([
    apiFetch('offers/mine', { token }),
    apiFetch('requests/mine', { token }),
  ]);
  return normalizeOwnedServices(offers, requests);
}

/**
 * GET /requests/mine — only the viewer's requests.
 * The home needs their categories to rank the catalog (`services/relevance.js`),
 * and asking for the request list alone avoids loading the offers as well.
 */
export async function listMyRequests(token) {
  return normalizeOwnedServices(null, await apiFetch('requests/mine', { token }));
}

/**
 * GET /offers/deleted + GET /requests/deleted — the viewer's soft-deleted
 * services, with `deletedAt`. Same shape as `listMyServices`, plus
 * `eliminataIl`.
 */
export async function listDeletedServices(token) {
  const [offers, requests] = await Promise.all([
    apiFetch('offers/deleted', { token }),
    apiFetch('requests/deleted', { token }),
  ]);
  return normalizeOwnedServices(offers, requests);
}

/**
 * POST /services — publishes a new service. The guard on the body is
 * defensive: the screen validates first and disables submit without a
 * category, so no real flow reaches here without type and description.
 */
export async function createService(token, entry) {
  const body = toCreateBody(entry);
  if (!body.type || !body.description || body.categoryIds.length === 0) {
    throw new ApiError(400, INVALID_INPUT_MESSAGE);
  }
  return normalizeServiceEnvelope(
    await withMessage(apiFetch('services', { method: 'POST', token, body })),
  );
}

/** PATCH /offers/{id} or PATCH /requests/{id} — description, category, mode, location. */
export async function updateService(token, entry) {
  const route = serviceRoute(entry?.tipo, entry?.id);
  const body = toUpdateBody(entry);
  if (!route || !body || !body.description) {
    throw new ApiError(400, INVALID_INPUT_MESSAGE);
  }
  return normalizeServiceEnvelope(
    await withMessage(apiFetch(route, { method: 'PATCH', token, body }), {
      ...SERVICE_MESSAGES,
      409: CONFLICT_UPDATE,
    }),
  );
}

/**
 * PATCH /offers/{id} or PATCH /requests/{id} with `{isSuspended}` only: the
 * partial update leaves the other fields as they are. A suspended service stays
 * in the owner's list and disappears from the home.
 */
export async function setServiceSuspended(token, entry) {
  const route = serviceRoute(entry?.tipo, entry?.id);
  if (!route) {
    throw new ApiError(400, INVALID_INPUT_MESSAGE);
  }
  const body = { isSuspended: entry?.stato === STATI_PUBBLICAZIONE.SOSPESA };
  return normalizeServiceEnvelope(
    await withMessage(apiFetch(route, { method: 'PATCH', token, body }), {
      ...SERVICE_MESSAGES,
      409: CONFLICT_STATUS,
    }),
  );
}

/** DELETE /offers/{id} or DELETE /requests/{id} — soft delete, `204`, no body. */
export async function deleteService(token, entry) {
  const route = serviceRoute(entry?.tipo, entry?.id);
  if (!route) {
    throw new ApiError(400, INVALID_INPUT_MESSAGE);
  }
  await withMessage(apiFetch(route, { method: 'DELETE', token }), {
    ...SERVICE_MESSAGES,
    409: CONFLICT_DELETE,
  });
}

/** POST /offers/{id}/restore or POST /requests/{id}/restore — brings it back. */
export async function restoreService(token, entry) {
  const route = serviceRoute(entry?.tipo, entry?.id);
  if (!route) {
    throw new ApiError(400, INVALID_INPUT_MESSAGE);
  }
  return normalizeServiceEnvelope(
    await withMessage(
      apiFetch(`${route}/restore`, { method: 'POST', token }),
      SERVICE_MESSAGES,
    ),
  );
}
