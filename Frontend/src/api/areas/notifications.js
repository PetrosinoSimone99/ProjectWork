import { apiFetch } from '../client';
import { normalizeNotification, normalizeNotifications } from '../normalizers';

/**
 * Notifications area: `GET /notifications`, `PATCH /notifications/{id}/read`,
 * `DELETE /notifications/{id}`.
 *
 * The backend has no push channel (no Mercure, no SSE): a client learns about a
 * new notification by asking again, which is why the screen polls `GET` and
 * reads `nonLette` from the same answer instead of keeping a counter of its own.
 *
 * The list endpoint rejects **every** query parameter it does not know with
 * `400`, so the only three that travel are the three documented ones:
 * `page` (>= 1), `limit` (1..50) and `unreadOnly` (`true`/`false`).
 */

/** Page size the screens ask for: inside the backend's 1..50 window. */
export const NOTIFICATIONS_PAGE_SIZE = 20;

/** Largest page the backend accepts; asking for more is a `400`, not a clamp. */
export const NOTIFICATIONS_MAX_PAGE_SIZE = 50;

/**
 * GET /notifications — one page plus the unread count.
 * `401` is handled by `client.js` (session expired); a `403` means the account
 * is inactive and reaches the screen as an `ApiError`.
 */
export async function getNotifications(token, options = {}) {
  const {
    page = 1,
    limit = NOTIFICATIONS_PAGE_SIZE,
    unreadOnly = false,
  } = options ?? {};
  const dimensione = Math.min(Math.max(Number(limit) || NOTIFICATIONS_PAGE_SIZE, 1), NOTIFICATIONS_MAX_PAGE_SIZE);
  const pagina = Math.max(Number(page) || 1, 1);
  const query = `page=${pagina}&limit=${dimensione}&unreadOnly=${unreadOnly ? 'true' : 'false'}`;
  return normalizeNotifications(await apiFetch(`notifications?${query}`, { token }));
}

/** PATCH /notifications/{id}/read — returns the updated row, or `null`. */
export async function markNotificationRead(token, notificationId) {
  const response = await apiFetch(`notifications/${Number(notificationId)}/read`, {
    method: 'PATCH',
    token,
  });
  return normalizeNotification(response?.notification);
}

/** DELETE /notifications/{id} — the backend answers `204` with no body. */
export async function deleteNotification(token, notificationId) {
  await apiFetch(`notifications/${Number(notificationId)}`, { method: 'DELETE', token });
}
