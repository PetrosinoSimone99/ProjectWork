import { ApiError, apiFetch } from '../client';
import {
  normalizeOwnedServices,
  normalizeServiceEnvelope,
  normalizeUserServices,
  toIntegerOrNull,
} from '../normalizers';
import { TIPI_VOCE } from '@/services/offer-request';
import { formattaLocalita } from '@/services/italian-locations';

/**
 * Own services area: the viewer's offers and requests.
 *
 * Real endpoints only: `POST /services`, `GET /offers/mine` +
 * `GET /requests/mine` and `PATCH` on `/offers/{id}` and `/requests/{id}`.
 *
 * Every account holds exactly one offer and one request, both mandatory, so the
 * owner can only modify them: there is no delete, no restore and no suspend
 * call here. The backend answers `409` to `DELETE` and to a status-only `PATCH`
 * (`isSuspended`), and a control that cannot succeed is not drawn. The deleted
 * lists and the staff restore live in `./staff.js`.
 *
 * This file translates the form shape (`tipo`, `mansione`, `idCategoria`,
 * `daRemoto`, `provincia`/`comune`) into the contract shape
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

/** The location of the service as `Comune - Provincia`, or `null`. */
function entryLocation(entry) {
  return formattaLocalita(entry?.comune, entry?.provincia) ?? null;
}

/**
 * The body of `POST /services`: `{type, description, categoryIds, isRemote,
 * location}`. `isSuspended` is not sent — a new service is published and the
 * backend defaults it to `false`.
 */
function toCreateBody(entry) {
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
 * `categoryIds` replaces the whole list, and the form edits one category: a
 * changed selection therefore sends `[idCategoria]` alone. The stored list is
 * preserved — sent whole — only while the visible category was not touched, that
 * is while it still equals the first id of `entry.categoryIds`; picking another
 * category is a deliberate replacement, not a merge (F6). `location` is always
 * present (`null` clears it), and `id`/`type`/`createdAt` are not sent: a field
 * the contract does not allow makes the backend answer `400`. Duplicates are
 * dropped; an id the loaded catalog no longer lists is kept as the server sent
 * it, because pruning against a catalog that may be partial or stale would
 * delete categories the user never touched.
 */
export function toUpdateBody(entry) {
  const categoryId = toIntegerOrNull(entry?.idCategoria);
  if (categoryId === null || categoryId < 1) {
    return null;
  }
  const storedCategoryIds = [
    ...new Set(
      (Array.isArray(entry?.categoryIds) ? entry.categoryIds : [])
        .map((id) => toIntegerOrNull(id))
        .filter((id) => id !== null),
    ),
  ];
  return {
    description: String(entry?.mansione ?? '').trim(),
    categoryIds:
      storedCategoryIds.length > 1 && storedCategoryIds[0] === categoryId
        ? storedCategoryIds
        : [categoryId],
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
 * GET /users/{id}/services — one person's public profile and their services.
 *
 * The service detail asks for it when it opens: it is the only endpoint that
 * returns somebody else's offers and requests, and the mini-card is the only
 * consumer. An `id` that is not a positive integer never reaches the network:
 * the backend would answer `404` and the screen can say the same thing without
 * a round trip.
 */
export async function getUserServices(token, userId) {
  const id = toIntegerOrNull(userId);
  if (id === null || id <= 0) {
    throw new ApiError(400, 'Persona non disponibile.');
  }
  return normalizeUserServices(await apiFetch(`users/${id}/services`, { token }));
}
