import { act, create } from 'react-test-renderer';
import { AppState } from 'react-native';
import { getNotifications } from '@/api/areas/notifications';
import { UNREAD_POLL_MS, useUnreadCount } from '../useNotifications';

jest.mock('expo-router', () => ({
  // `useFocusEffect` needs a navigator; in this test the screen is always the
  // focused one, so it is an effect that re-runs when its callback changes.
  useFocusEffect: (callback) => require('react').useEffect(callback, [callback]),
}));

jest.mock('@/api/areas/notifications', () => ({
  getNotifications: jest.fn(),
  markNotificationRead: jest.fn(),
  deleteNotification: jest.fn(),
}));

const TOKEN = 'jwt';

/** One page of notifications is more than the row needs; it reads `nonLette`. */
const risposta = (nonLette) => ({ nonLette, elementi: [] });

/** Renders the hook and keeps its latest return value where the test reads it. */
function render(lettura) {
  function Probe({ token }) {
    Object.assign(lettura, useUnreadCount({ token }));
    return null;
  }
  let renderer;
  act(() => {
    renderer = create(<Probe token={TOKEN} />);
  });
  return renderer;
}

/** Lets the promises of the reads already started settle. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) {
      await Promise.resolve();
    }
  });
}

/**
 * Moves the clock by `intervalli` poll intervals inside `act` and drains the
 * microtasks, so the promise of each tick settles before the assertions.
 */
async function unGiro(intervalli = 1) {
  await act(async () => {
    jest.advanceTimersByTime(UNREAD_POLL_MS * intervalli);
    for (let i = 0; i < 6; i += 1) {
      await Promise.resolve();
    }
  });
}

let onChangeAppState;
let verbale;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  // jest-expo does not set this: without it the tick guard sees an app that is
  // not in the foreground and every poll is silently skipped.
  AppState.currentState = 'active';
  onChangeAppState = undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((tipo, handler) => {
    if (tipo === 'change') {
      onChangeAppState = handler;
    }
    return { remove: jest.fn() };
  });
  verbale = jest.spyOn(console, 'warn').mockImplementation(() => {});
  getNotifications.mockResolvedValue(risposta(2));
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useUnreadCount — the polling of the badge', () => {
  it('moves the badge on its own after one poll interval', async () => {
    const lettura = {};
    render(lettura);
    await flush();
    expect(lettura.nonLette).toBe(2);

    getNotifications.mockResolvedValue(risposta(5));
    await unGiro();

    expect(lettura.nonLette).toBe(5);
    expect(getNotifications).toHaveBeenCalledWith(TOKEN, { limit: 1 });
  });

  it('asks again as soon as the app returns to the foreground', async () => {
    const lettura = {};
    render(lettura);
    await flush();

    AppState.currentState = 'background';
    await unGiro();
    expect(getNotifications).toHaveBeenCalledTimes(1);

    getNotifications.mockResolvedValue(risposta(4));
    await act(async () => {
      onChangeAppState('active');
      for (let i = 0; i < 6; i += 1) {
        await Promise.resolve();
      }
    });

    expect(getNotifications).toHaveBeenCalledTimes(2);
    expect(lettura.nonLette).toBe(4);
  });

  it('does not ask again while the app is in the background', async () => {
    AppState.currentState = 'background';
    const lettura = {};
    render(lettura);
    await flush();
    // The read on entering the screen is not a poll: the guard covers the tick.
    const lettureAllIngresso = getNotifications.mock.calls.length;
    expect(lettureAllIngresso).toBeGreaterThan(0);

    await unGiro(5);

    expect(getNotifications).toHaveBeenCalledTimes(lettureAllIngresso);
  });

  it('stops the timer when the screen is left', async () => {
    const lettura = {};
    const renderer = render(lettura);
    await flush();
    const lettureAllIngresso = getNotifications.mock.calls.length;
    expect(lettureAllIngresso).toBeGreaterThan(0);

    act(() => {
      renderer.unmount();
    });
    await unGiro(4);

    expect(getNotifications).toHaveBeenCalledTimes(lettureAllIngresso);
  });

  it('keeps the row neutral and warns in development when the count cannot be read', async () => {
    const lettura = {};
    render(lettura);
    await flush();
    expect(lettura.nonLette).toBe(2);

    getNotifications.mockRejectedValue(new Error('rete assente'));
    await unGiro();

    expect(lettura.nonLette).toBeNull();
    const messaggi = verbale.mock.calls.map((chiamata) => chiamata[0]);
    expect(
      messaggi.some((messaggio) => typeof messaggio === 'string' && messaggio.startsWith('[notifiche]')),
    ).toBe(true);
  });
});
