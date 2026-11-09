import { API_BASE_URL } from './config';

/**
 * Time limit for a single call, in milliseconds.
 * `fetch` alone can hang forever on a server that does not answer, so the
 * request is aborted here. 10 s is longer than every real call of the project,
 * so it only cuts calls the server is not answering at all.
 */
const REQUEST_TIMEOUT_MS = 10000;

/** The API error: carries the HTTP status and a message ready for the UI. */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * `true` when the called endpoint does **not exist yet** (404/501 on a route
 * that is missing): not a fault, not retryable. Screens show the declared
 * empty state (an `EmptyState` without "Riprova") instead of "error + retry".
 */
export function isEndpointUnavailable(err) {
  return err instanceof ApiError && (err.status === 404 || err.status === 501);
}

/** Handler called when an authenticated request receives 401. */
let onSessionExpired = null;

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

/**
 * The message to show when the response is not ok. Symfony answers
 * `{"error": "<text>"}`; the frontend maps the status, so this text is only a
 * fallback for the screens that do not have their own copy.
 */
function messageFromBody(data) {
  const fallback = 'Qualcosa non ha funzionato. Riprova.';
  if (data === null || typeof data !== 'object') {
    return fallback;
  }
  if (typeof data.error === 'string' && data.error) {
    return data.error;
  }
  if (typeof data.message === 'string' && data.message) {
    return data.message;
  }
  return fallback;
}

/** Shared fetch: base URL, JSON in and out, bearer token, errors as ApiError. */
export async function apiFetch(path, options = {}) {
  const { method = 'GET', body, token } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  let text;
  try {
    response = await fetch(`${API_BASE_URL}/${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    text = await response.text();
  } catch (error) {
    // Two distinct cases: the connection is refused (network absent) or the
    // server does not answer and the timer fires.
    throw new ApiError(
      0,
      error?.name === 'AbortError'
        ? 'Il servizio sta impiegando troppo tempo. Riprova.'
        : 'Qualcosa non ha funzionato. Riprova.',
    );
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    // 401 with a token means the session expired or was revoked.
    if (response.status === 401 && token && onSessionExpired) {
      onSessionExpired();
    }
    throw new ApiError(response.status, messageFromBody(data));
  }

  return data;
}
