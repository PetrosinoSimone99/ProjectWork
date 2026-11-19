import { API_BASE_URL } from './config';

/**
 * Time limit for a single call, in milliseconds.
 *
 * `fetch` alone can hang forever on a server that does not answer, so the
 * request is aborted here. The budget is 25 s and was 10 s: the first PHP
 * worker to serve a route pays 5-8 s on this stack (`docs/setup.md`), the
 * staff screen asks four endpoints at once, and at 10 s those bursts were cut
 * mid-flight — the screen reported an unreachable service while the server was
 * answering (`docs/changelog.md`, 2026-11-19).
 */
export const REQUEST_TIMEOUT_MS = 25000;

/**
 * Le parole che l'app dice quando non ha niente di più preciso da dire.
 *
 * Stanno qui e non in venti schermate (audit UX F33): una riga da correggere,
 * una sola voce da tradurre, e nessun posto dove il testo resti quello vecchio.
 */
export const GENERIC_ERROR_MESSAGE = 'Qualcosa non ha funzionato. Riprova.';
export const NETWORK_ERROR_MESSAGE =
  'Non riesco a raggiungere il servizio: controlla la connessione e riprova.';
export const TIMEOUT_ERROR_MESSAGE = 'Il servizio sta impiegando troppo tempo. Riprova.';
export const SESSION_EXPIRED_MESSAGE = 'La sessione è scaduta: accedi di nuovo.';

/**
 * Lo stato HTTP diventa una frase italiana con una causa e una via d'uscita.
 *
 * Prima passava il testo del backend — «Invalid JWT Token», in inglese e con il
 * nome dell'endpoint dentro (audit UX F27) — oppure una frase unica per ogni
 * guasto, dalla connessione assente al 500 (F30). Il testo del server non si
 * butta: resta in `ApiError.raw` e nel log, dove serve a chi ripara, non a chi
 * legge.
 */
const STATUS_MESSAGES = {
  400: 'La richiesta non è valida: controlla i dati e riprova.',
  401: SESSION_EXPIRED_MESSAGE,
  // Un `403` non dice da solo quale regola lo ha prodotto, e questa tabella
  // serve ogni endpoint: nel prodotto può essere l'account inattivo oppure una
  // funzione riservata ad altri account. La frase nomina le due cause invece di
  // indovinarne una sola, e dice a chi chiedere.
  403: 'Non puoi fare questa operazione: il tuo account non è attivo, oppure questa funzione è riservata ad altri account. Chiedi allo staff di verificare il tuo account, poi riprova.',
  404: 'Questo contenuto non esiste più.',
  409: 'L’operazione è in conflitto con lo stato attuale: aggiorna e riprova.',
  422: 'Alcuni dati non sono validi: controlla i campi e riprova.',
  429: 'Troppe richieste in poco tempo: aspetta un momento e riprova.',
  500: 'Il servizio ha avuto un problema. Riprova tra poco.',
  502: 'Il servizio ha avuto un problema. Riprova tra poco.',
  503: 'Il servizio ha avuto un problema. Riprova tra poco.',
  504: 'Il servizio ha avuto un problema. Riprova tra poco.',
};

/** Il messaggio italiano per uno stato HTTP; `0` è il guasto di rete. */
export function messageForStatus(status, fallback = GENERIC_ERROR_MESSAGE) {
  if (status === 0) {
    return NETWORK_ERROR_MESSAGE;
  }
  return STATUS_MESSAGES[status] ?? fallback;
}

/** The API error: carries the HTTP status and a message ready for the UI. */
export class ApiError extends Error {
  constructor(status, message, raw = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    /** Il testo originale del server, per il log: mai per lo schermo. */
    this.raw = raw;
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
 * Segnala che la sessione non è più valida a chi la possiede.
 *
 * `apiFetch` lo fa da sé su un `401` con token. Lo stream (`api/stream.js`) non
 * passa da `apiFetch` — tiene la richiesta aperta e legge i byte — quindi ha
 * bisogno della stessa leva senza duplicare il gestore: qui il gestore resta uno
 * solo, registrato da `AuthProvider`.
 */
export function signalSessionExpired() {
  if (onSessionExpired) {
    onSessionExpired();
  }
}

/** Il testo del server, solo per il log: `{"error": …}` oppure `{"message": …}`. */
function rawMessageFromBody(data) {
  if (data === null || typeof data !== 'object') {
    return null;
  }
  if (typeof data.error === 'string' && data.error) {
    return data.error;
  }
  if (typeof data.message === 'string' && data.message) {
    return data.message;
  }
  return null;
}

/** Shared fetch: base URL, JSON in and out, bearer token, errors as ApiError. */
export async function apiFetch(path, options = {}) {
  const { method = 'GET', body, token } = options;

  const controller = new AbortController();
  // Chi ha annullato lo sa solo questo file: nessun `fetch` lo dice in modo
  // affidabile (vedi il `catch` qui sotto), quindi il timer lo annota.
  let timedOut = false;
  const startedAt = Date.now();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

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
    // Tre guasti diversi, tre frasi diverse: il timeout ha già la sua, la rete
    // assente non è «riprova» ma «guarda la connessione» (audit UX F30).
    //
    // Il timeout lo dice `timedOut`, non il nome dell'errore. Da Expo SDK 58
    // `globalThis.fetch` è quello di Expo (`expo/src/winter/runtime.native.ts`)
    // e un abort esce come `FetchError` con `name === 'Error'` e il testo
    // «fetch failed: Fetch request has been canceled»: la vecchia prova su
    // `AbortError` non scattava mai, e ogni timeout si presentava come
    // connessione assente.
    const messaggio = timedOut ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE;
    if (typeof __DEV__ === 'undefined' || __DEV__) {
      console.warn('[api] richiesta non raggiunta', {
        method,
        path,
        ms: Date.now() - startedAt,
        timeout: timedOut,
        detail: error?.message,
      });
    }
    throw new ApiError(0, messaggio, error?.message ?? null);
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
    const raw = rawMessageFromBody(data);
    // 401 con un token allegato significa sessione scaduta o revocata.
    if (response.status === 401 && token && onSessionExpired) {
      onSessionExpired();
    }
    if (typeof __DEV__ === 'undefined' || __DEV__) {
      console.warn('[api] risposta non ok', { method, path, status: response.status, raw });
    }
    throw new ApiError(response.status, messageForStatus(response.status), raw);
  }

  return data;
}
