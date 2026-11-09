import { ApiError, apiFetch } from './client';
import {
  normalizeAuthResponse,
  normalizeCatalog,
  normalizeCategories,
  normalizeUserReport,
} from './normalizers';
import { filtriDaQuery } from '@/services/offer-request';

/**
 * The API surface the screens consume. One entry point (§3 of `AGENTS.md`),
 * split by area in `areas/` when an area grows: the screens never see backend
 * field names and never build a request body.
 *
 * Only endpoints that exist in the backend **today** live here. What the
 * product needs and the backend lacks is a declared state in the UI plus a
 * request in `docs/backend-gaps.md` — never a call to a route that would 404.
 * The removed legacy routes (`segnalazioni.php`, `notifiche.php`,
 * `utenti.php`, `userRoleManager.php`, `userStatoManager.php`,
 * `Accordi1_a_1/*`) are gone with their screens' fake branches.
 */

export { ApiError, apiFetch, isEndpointUnavailable, setSessionExpiredHandler } from './client';
export {
  normalizeCatalog,
  normalizeCategories,
  normalizePagination,
} from './normalizers';
export { getProfile, updateProfile } from './areas/profile';
export {
  createService,
  deleteService,
  listDeletedServices,
  listMyRequests,
  listMyServices,
  restoreService,
  setServiceSuspended,
  updateService,
} from './areas/services';
export {
  claimStaffReport,
  getStaffUser,
  listStaffOperations,
  listStaffReports,
  listStaffUsers,
  promoteStaffUser,
  reviewStaffReport,
  setStaffUserStatus,
} from './areas/staff.js';

// ---------------------------------------------------------------------------
// Access — login and registration
//
// The owner's rule (27 September 2026): the app **never tells the user which
// datum is wrong** (wrong username? wrong password? already taken?). The
// backend messages, explicit and in English, are collapsed into generic copy
// before reaching the UI; the detail stays in the server log. The **shape**
// checks of the form (empty field, malformed e-mail, missing category) stay
// explicit: they concern what the user is typing, not other accounts.
// ---------------------------------------------------------------------------

/** Generic message for access errors with no precise mapping. */
const ACCESS_FALLBACK = 'Qualcosa non ha funzionato. Riprova.';

const ACCESS_MESSAGES = {
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

/** Rethrows an access error with the generic message of the table. */
async function withGenericMessage(call, endpoint) {
  try {
    return await call;
  } catch (err) {
    if (err instanceof ApiError) {
      throw new ApiError(
        err.status,
        ACCESS_MESSAGES[endpoint]?.[err.status] ?? ACCESS_FALLBACK,
      );
    }
    throw err;
  }
}

/**
 * POST /auth/login -> `{token, utente}`.
 * `{token, user}` (`AuthController::login`) is normalised here; every 400/401/403
 * becomes "Credenziali non valide.".
 */
export async function login(username, password) {
  return normalizeAuthResponse(
    await withGenericMessage(
      apiFetch('auth/login', { method: 'POST', body: { username, password } }),
      'login',
    ),
  );
}

/**
 * POST /auth/register -> `{token, utente}` plus the created services.
 *
 * `input` is already in English and already in contract shape:
 * `{name, surname, username, email, password, location, offers, requests}`
 * where each entry is `{description, categoryIds, isRemote}`.
 *
 * `location` is the person's location, and it travels on every service too:
 * the backend does not copy it from the profile, so a service created at
 * registration would otherwise carry no location at all. `isSuspended` is not
 * sent: new services are published and the backend defaults it to `false`.
 */
export async function register(input) {
  const location = (input?.location ?? '').trim();
  const body = {
    name: (input?.name ?? '').trim(),
    surname: (input?.surname ?? '').trim(),
    username: input?.username,
    email: input?.email,
    password: input?.password,
    location,
    offers: toServiceBodies(input?.offers, location),
    requests: toServiceBodies(input?.requests, location),
  };
  return normalizeAuthResponse(
    await withGenericMessage(
      apiFetch('auth/register', { method: 'POST', body }),
      'register',
    ),
  );
}

/** The registration entries in the contract shape of a service. */
function toServiceBodies(entries, location) {
  return (entries ?? []).map((entry) => ({
    description: String(entry?.description ?? '').trim(),
    isRemote: entry?.isRemote === true,
    location: location || null,
    categoryIds: Array.isArray(entry?.categoryIds) ? entry.categoryIds : [],
  }));
}

/**
 * GET /categories — public for GET (`security.yaml`), so it also works during
 * registration, before a token exists.
 */
export async function getCategories(token) {
  return normalizeCategories(await apiFetch('categories', { token }));
}

/** Rows per catalog page: the backend default, declared here as well. */
const CATALOG_PAGE_SIZE = 20;

/**
 * GET /services — the home catalog, one page at a time.
 * `viewerId` lets the normaliser drop the viewer's own rows (a client
 * decision, not only a query one). Returns `{elenco, paginazione}`.
 *
 * `sort` is **not** sent: the backend default (`newest`) is the order the page
 * needs, and `sort=relevance` is rejected today (`docs/backend-gaps.md` G1).
 */
export async function getHomeCatalog(token, viewerId, filters, page = 1) {
  const params = {
    ...filtriDaQuery(filters),
    page,
    limit: CATALOG_PAGE_SIZE,
  };
  const query = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return normalizeCatalog(
    await apiFetch(`services?${query}`, { token }),
    viewerId,
  );
}

/** Italian copy for the four answers `POST /reports` can give. */
const REPORT_MESSAGES = {
  400: 'Controlla i dati inseriti: il motivo è obbligatorio e non puoi segnalare te stesso.',
  404: 'Non trovo questa persona: potrebbe avere cancellato l’account.',
  409: 'Hai già segnalato questa persona: non puoi segnalarla due volte.',
};

/**
 * POST /reports — reports another user. The author always comes from the JWT;
 * `reason` is 1–2000 characters and is the only free text the endpoint accepts.
 * `409` means the pair already reported each other, `400` a self-report or an
 * invalid reason, `404` a missing user: each becomes its own Italian message
 * instead of the backend English text.
 */
export async function createUserReport(token, { reportedUserId, reason }) {
  try {
    return normalizeUserReport(
      await apiFetch('reports', {
        method: 'POST',
        token,
        body: { reportedUserId: Number(reportedUserId), reason: String(reason ?? '').trim() },
      }),
    );
  } catch (err) {
    if (err instanceof ApiError && REPORT_MESSAGES[err.status]) {
      throw new ApiError(err.status, REPORT_MESSAGES[err.status]);
    }
    throw err;
  }
}
