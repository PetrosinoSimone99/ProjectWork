import {
  GENERIC_ERROR_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
  TIMEOUT_ERROR_MESSAGE,
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
 * The session expiry lever is shared: `apiFetch` calls it on a `401`, and the
 * stream, which does not go through `apiFetch`, calls this to reach the same
 * handler. Two levers, one handler, so the logout happens once.
 */
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
