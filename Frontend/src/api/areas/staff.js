import { ApiError, apiFetch } from '../client';
import {
  normalizeStaffOperations,
  normalizeStaffReports,
  normalizeStaffUser,
  normalizeStaffUsers,
} from '../normalizers';

/**
 * Staff area: users, reports and the operations log.
 *
 * Every call here is `403` for a non-staff caller: the UI hides the entry, the
 * backend protects the route, and each action treats `403` as a normal outcome
 * with Italian copy instead of the backend's English text.
 */

/** The statuses the review endpoint accepts (`UserReport::STATUS_*`). */
export const REVIEW_OUTCOMES = ['CONFIRMED', 'REJECTED'];

/** The statuses a report can have (`UserReport::STATUS_*`). */
export const REPORT_STATUSES = ['PENDING', 'IN_REVIEW', 'CONFIRMED', 'REJECTED'];

/** The account statuses the endpoint accepts (`User::STATUS_*`). */
export const USER_STATUSES = ['ACTIVE', 'INACTIVE'];

const ACTION_MESSAGES = {
  400: 'Controlla i dati inseriti: manca qualcosa o non è valido.',
  403: 'Questa azione non è permessa con il tuo ruolo.',
  404: 'Non trovo quello che cercavi: potrebbe essere stato rimosso.',
  409: 'I dati sono cambiati nel frattempo: ricarica e riprova.',
};

/** Rethrows with the Italian message of the table, status otherwise intact. */
async function withActionMessage(call) {
  try {
    return await call;
  } catch (err) {
    if (err instanceof ApiError && ACTION_MESSAGES[err.status]) {
      throw new ApiError(err.status, ACTION_MESSAGES[err.status]);
    }
    throw err;
  }
}

/**
 * The query string of the list endpoints.
 * The backend rejects unknown parameters with a `400`, so only its own names
 * and only the values that are actually set travel.
 */
function buildQuery(filters = {}) {
  const params = { page: filters.page ?? 1, limit: filters.limit ?? 20 };
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'page' || key === 'limit') {
      continue;
    }
    if (value !== null && value !== undefined && value !== '') {
      params[key] = value;
    }
  }
  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
}

/** GET /staff/users?page=&limit=&q=&accountStatus= -> `{utenti, paginazione}`. */
export async function listStaffUsers(token, filters = {}) {
  return normalizeStaffUsers(
    await apiFetch(`staff/users?${buildQuery(filters)}`, { token }),
  );
}

/** GET /staff/users/{id} -> the user, normalised like a list row. */
export async function getStaffUser(token, id) {
  const response = await apiFetch(`staff/users/${Number(id)}`, { token });
  return normalizeStaffUser(response?.user ?? response);
}

/** POST /staff/users/{id}/promote — adds ROLE_STAFF, no body and no role choice. */
export async function promoteStaffUser(token, id) {
  const response = await withActionMessage(
    apiFetch(`staff/users/${Number(id)}/promote`, { method: 'POST', token }),
  );
  return normalizeStaffUser(response?.user ?? response);
}

/** PATCH /staff/users/{id}/status with `{accountStatus}`. */
export async function setStaffUserStatus(token, id, status) {
  const response = await withActionMessage(
    apiFetch(`staff/users/${Number(id)}/status`, {
      method: 'PATCH',
      token,
      body: { accountStatus: status },
    }),
  );
  return normalizeStaffUser(response?.user ?? response);
}

/** GET /staff/reports?page=&limit=&status= -> `{segnalazioni, paginazione}`. */
export async function listStaffReports(token, filters = {}) {
  return normalizeStaffReports(
    await apiFetch(`staff/reports?${buildQuery(filters)}`, { token }),
  );
}

/** POST /staff/reports/{id}/claim — PENDING -> IN_REVIEW, no body. */
export async function claimStaffReport(token, id) {
  const response = await withActionMessage(
    apiFetch(`staff/reports/${Number(id)}/claim`, { method: 'POST', token }),
  );
  return response?.report ?? null;
}

/**
 * PATCH /staff/reports/{id}/review with `{status, reviewNote}`.
 * `status` is `CONFIRMED` or `REJECTED`; the note is 1–2000 characters and is
 * mandatory: it records what the decision was based on.
 */
export async function reviewStaffReport(token, id, { status, reviewNote }) {
  const response = await withActionMessage(
    apiFetch(`staff/reports/${Number(id)}/review`, {
      method: 'PATCH',
      token,
      body: { status, reviewNote: String(reviewNote ?? '').trim() },
    }),
  );
  return response?.report ?? null;
}

/** GET /staff/operations?page=&limit= -> `{operazioni, paginazione}`. */
export async function listStaffOperations(token, filters = {}) {
  return normalizeStaffOperations(
    await apiFetch(`staff/operations?${buildQuery(filters)}`, { token }),
  );
}
