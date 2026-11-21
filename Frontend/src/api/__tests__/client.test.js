import {
  GENERIC_ERROR_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  REQUEST_TIMEOUT_MS,
  SESSION_EXPIRED_MESSAGE,
  TIMEOUT_ERROR_MESSAGE,
  apiFetch,
  messageForStatus,
  setSessionExpiredHandler,
  signalSessionExpired,
} from '../client';

/**
 * The status-to-Italian table of `api/client.js`.
 *
 * These are the strings a user reads when something fails: they must name a
 * cause and a next step, never the server's English text and never the name of
 * an endpoint (audit UX F27, F30, F33).
 */
describe('messageForStatus', () => {
  it('answers a session expiry with the sentence the login screen shows', () => {
    expect(messageForStatus(401)).toBe(SESSION_EXPIRED_MESSAGE);
  });

  it('names both causes a refused call can have instead of guessing one', () => {
    const message = messageForStatus(403);

    // A 403 does not carry its own reason, and this table serves every endpoint:
    // in this product it is an inactive account or a function reserved to other
    // accounts, so the sentence says both and points at who can unblock it.
    expect(message).toContain('non è attivo');
    expect(message).toContain('riservata ad altri account');
    expect(message).toContain('staff');
    expect(message).toMatch(/riprova/i);
    // The old sentence explained it as a generic permission problem.
    expect(message).not.toMatch(/permess/i);
  });

  it('separates a connection failure from a timeout', () => {
    expect(messageForStatus(0)).toBe(NETWORK_ERROR_MESSAGE);
    expect(messageForStatus(0)).not.toBe(TIMEOUT_ERROR_MESSAGE);
    expect(NETWORK_ERROR_MESSAGE).toContain('connessione');
  });

  it('gives a server fault its own sentence instead of the generic one', () => {
    expect(messageForStatus(500)).not.toBe(GENERIC_ERROR_MESSAGE);
    expect(messageForStatus(503)).toBe(messageForStatus(500));
  });

  it('falls back to the shared message for a status it does not know', () => {
    expect(messageForStatus(418)).toBe(GENERIC_ERROR_MESSAGE);
  });

  it('never returns an English or technical sentence', () => {
    for (const status of [0, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504, 418]) {
      const message = messageForStatus(status);
      expect(message).not.toMatch(/token|jwt|endpoint|error/i);
      expect(message.length).toBeGreaterThan(10);
    }
  });

  it('uses the caller fallback when a screen has its own copy', () => {
    expect(messageForStatus(418, 'Testo della schermata.')).toBe('Testo della schermata.');
  });
});

/**
 * `apiFetch` ha due guasti senza stato HTTP e due frasi diverse (audit UX F30):
 * il timeout dell'app e la rete assente. Da Expo SDK 58 il `fetch` globale è
 * quello di Expo (`expo/src/winter/runtime.native.ts`), che annulla la richiesta
 * nativa con un `FetchError` chiamato `Error` e il testo «fetch failed: Fetch
 * request has been canceled»: il nome dell'errore non distingue i due casi, e
 * questi test lo fissano.
 */
describe('apiFetch time budget', () => {
  const fetchOriginale = global.fetch;

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    global.fetch = fetchOriginale;
  });

  it('names the timeout when its own timer aborted the call', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = jest.fn(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            reject(
              Object.assign(new Error('fetch failed: Fetch request has been canceled'), {
                name: 'FetchError',
              })
            );
          });
        })
    );

    const chiamata = apiFetch('staff/users?page=1&limit=20', { token: 'token' });
    const esito = expect(chiamata).rejects.toMatchObject({
      status: 0,
      message: TIMEOUT_ERROR_MESSAGE,
    });
    jest.advanceTimersByTime(REQUEST_TIMEOUT_MS);
    await esito;

    const [, dettaglio] = console.warn.mock.calls[0];
    expect(dettaglio.timeout).toBe(true);
    expect(dettaglio.ms).toBeGreaterThanOrEqual(REQUEST_TIMEOUT_MS);
    expect(dettaglio.path).toBe('staff/users?page=1&limit=20');
  });

  it('names the connection when something else canceled the call', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('fetch failed: Network request failed'))
    );

    await expect(apiFetch('notifications?page=1&limit=1', { token: 'token' })).rejects.toMatchObject(
      { status: 0, message: NETWORK_ERROR_MESSAGE }
    );
  });
});

/**
 * The session expiry lever is shared: `apiFetch` calls it on a `401`, and the
 * stream, which does not go through `apiFetch`, calls this to reach the same
 * handler. Two levers, one handler, so the logout happens once.
 */
describe('ApiError details', () => {
  const fetchOriginale = global.fetch;

  afterEach(() => {
    global.fetch = fetchOriginale;
  });

  it('tiene il corpo della risposta, così la schermata può nominare il campo rifiutato', async () => {
    const corpo = {
      error: 'Required user and service fields are missing or invalid.',
      fields: ['email', 'password'],
    };
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 400,
      text: async () => JSON.stringify(corpo),
    }));

    await expect(apiFetch('auth/register', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 400,
      details: corpo,
    });
  });

  it('lascia `details` vuoto quando la risposta non è JSON', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    }));

    await expect(apiFetch('services')).rejects.toMatchObject({ status: 500, details: null });
  });
});

describe('signalSessionExpired', () => {
  afterEach(() => setSessionExpiredHandler(null));

  it('calls the registered handler', () => {
    const uscita = jest.fn();
    setSessionExpiredHandler(uscita);
    signalSessionExpired();
    expect(uscita).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no screen registered a handler', () => {
    setSessionExpiredHandler(null);
    expect(() => signalSessionExpired()).not.toThrow();
  });
});
