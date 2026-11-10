import {
  GENERIC_ERROR_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
  TIMEOUT_ERROR_MESSAGE,
  messageForStatus,
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
