import { useEffect } from 'react';
import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';

import * as api from '@/api';
import { setSessionExpiredHandler } from '@/api/client';
import { loadSession, isTokenValid, clearSession, saveSession } from '../token-store';
import { AuthProvider, useAuth } from '../auth-context';

const SESSION_EXPIRED_MESSAGE = 'La sessione è scaduta: accedi di nuovo.';

jest.mock('@/api/client', () => ({
  SESSION_EXPIRED_MESSAGE: 'La sessione è scaduta: accedi di nuovo.',
  setSessionExpiredHandler: jest.fn(),
}));

jest.mock('@/api', () => ({
  login: jest.fn(),
  register: jest.fn(),
}));

jest.mock('../token-store', () => ({
  loadSession: jest.fn(),
  saveSession: jest.fn(() => Promise.resolve()),
  clearSession: jest.fn(() => Promise.resolve()),
  isTokenValid: jest.fn(),
}));

/** The provider's value for the current render, read through the real hook. */
let auth;

function Consumer() {
  const value = useAuth();
  // Written in an effect, not during render: a render must not touch state
  // outside the component, even in a test harness.
  useEffect(() => {
    auth = value;
  }, [value]);
  return <Text>consumer</Text>;
}

async function mountProvider() {
  let renderer;
  await act(async () => {
    renderer = create(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
  });
  return renderer;
}

/** The handler the provider registers for an in-session 401. */
function sessionExpiredHandler() {
  return setSessionExpiredHandler.mock.calls.at(-1)[0];
}

const storedSession = { token: 'expired-token', utente: { username: 'ada' } };

beforeEach(() => {
  jest.clearAllMocks();
  auth = undefined;
  saveSession.mockResolvedValue(undefined);
  clearSession.mockResolvedValue(undefined);
});

it('lands on a silent login when the stored token is no longer valid', async () => {
  loadSession.mockResolvedValue(storedSession);
  isTokenValid.mockReturnValue(false);

  await mountProvider();

  expect(clearSession).toHaveBeenCalledTimes(1);
  expect(auth.token).toBeNull();
  // The expired session is not announced on boot: nothing was interrupted.
  expect(auth.motivoUscita).toBeNull();
});

it('restores a still-valid session without announcing anything', async () => {
  loadSession.mockResolvedValue(storedSession);
  isTokenValid.mockReturnValue(true);

  await mountProvider();

  expect(auth.token).toBe('expired-token');
  expect(auth.motivoUscita).toBeNull();
  expect(clearSession).not.toHaveBeenCalled();
});

it('announces the expiry when an authenticated request answers 401 mid-session', async () => {
  loadSession.mockResolvedValue(storedSession);
  isTokenValid.mockReturnValue(true);
  await mountProvider();

  await act(async () => {
    sessionExpiredHandler()();
  });

  expect(auth.token).toBeNull();
  expect(auth.motivoUscita).toBe(SESSION_EXPIRED_MESSAGE);
});

it('clears the expiry reason after a successful registration', async () => {
  loadSession.mockResolvedValue(storedSession);
  isTokenValid.mockReturnValue(true);
  await mountProvider();
  await act(async () => {
    sessionExpiredHandler()();
  });
  expect(auth.motivoUscita).toBe(SESSION_EXPIRED_MESSAGE);

  api.register.mockResolvedValue({ token: 'new-token', utente: { username: 'ada' } });
  await act(async () => {
    await auth.signUp({ username: 'ada' });
  });

  expect(auth.token).toBe('new-token');
  expect(auth.motivoUscita).toBeNull();
});
