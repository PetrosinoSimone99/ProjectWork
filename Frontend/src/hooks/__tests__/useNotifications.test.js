import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { getNotifications, markNotificationRead } from '@/api/areas/notifications';
import { ApiError } from '@/api/client';
import {
  NOTIFICATIONS_MAX_PAGES,
  UNREAD_POLL_MS,
  useNotifications,
  useUnreadCount,
} from '../useNotifications';

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

/**
 * No provider in these tests: the frame is handed over by the test and the
 * stream state is what the test declares.
 */
const mockStream = {
  stato: { connected: false, unreadCount: null, lastId: null },
  handler: undefined,
};

jest.mock('@/hooks/useEventStream', () => ({
  useStreamEvent: (handler) => {
    mockStream.handler = handler;
  },
  useStreamState: () => mockStream.stato,
}));

const TOKEN = 'jwt';

/** One page of notifications is more than the row needs; it reads `nonLette`. */
const risposta = (nonLette) => ({ nonLette, elementi: [] });

/** One inbox row as the hook keeps it: only `id` and `letta` move the auto-read. */
const row = (id, letta) => ({ id, tipo: 'MESSAGE', messaggio: null, dati: null, creataIl: null, letta });

/** One page of the inbox that carries rows as well as the count. */
const page = (elementi, nonLette) => ({ elementi, nonLette });

/** One answered page of the inbox: `paginazione.pagineTotali` is what the hook follows. */
const pagedResponse = (rows, nonLette, pageNumber, totalPages) => ({
  elementi: rows,
  nonLette,
  paginazione: {
    pagina: pageNumber,
    pagineTotali: totalPages,
    elementiTotali: totalPages * rows.length,
    limite: totalPages * rows.length,
  },
});

/**
 * Renders the badge hook and returns what `renderHook` gives back: the value
 * the test reads is `result.current`. From RTL 14 the mount is asynchronous,
 * so it is awaited instead of wrapped in `act`.
 */
function renderUnreadCount() {
  return renderHook(() => useUnreadCount({ token: TOKEN }));
}

/**
 * Same mount for the inbox hook. It returns `rerender` because dropping the
 * session is the only way to reach `segnaLetteMostrate` with rows already on
 * screen, which is the case the token guard exists for.
 */
function renderInbox(token = TOKEN) {
  return renderHook(({ token: corrente }) => useNotifications({ token: corrente }), {
    initialProps: { token },
  });
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
  // The stream starts down in every test: a case that wants frames declares it.
  mockStream.stato = { connected: false, unreadCount: null, lastId: null };
  mockStream.handler = undefined;
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
    const { result } = await renderUnreadCount();
    await flush();
    expect(result.current.nonLette).toBe(2);

    getNotifications.mockResolvedValue(risposta(5));
    await unGiro();

    expect(result.current.nonLette).toBe(5);
    expect(getNotifications).toHaveBeenCalledWith(TOKEN, { limit: 1 });
  });

  it('asks again as soon as the app returns to the foreground', async () => {
    const { result } = await renderUnreadCount();
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
    expect(result.current.nonLette).toBe(4);
  });

  it('does not ask again while the app is in the background', async () => {
    AppState.currentState = 'background';
    await renderUnreadCount();
    await flush();
    // The read on entering the screen is not a poll: the guard covers the tick.
    const lettureAllIngresso = getNotifications.mock.calls.length;
    expect(lettureAllIngresso).toBeGreaterThan(0);

    await unGiro(5);

    expect(getNotifications).toHaveBeenCalledTimes(lettureAllIngresso);
  });

  it('stops the timer when the screen is left', async () => {
    const { unmount } = await renderUnreadCount();
    await flush();
    const lettureAllIngresso = getNotifications.mock.calls.length;
    expect(lettureAllIngresso).toBeGreaterThan(0);

    await unmount();
    await unGiro(4);

    expect(getNotifications).toHaveBeenCalledTimes(lettureAllIngresso);
  });

  it('keeps the row neutral and warns in development when the count cannot be read', async () => {
    const { result } = await renderUnreadCount();
    await flush();
    expect(result.current.nonLette).toBe(2);

    getNotifications.mockRejectedValue(new Error('rete assente'));
    await unGiro();

    expect(result.current.nonLette).toBeNull();
    const messaggi = verbale.mock.calls.map((chiamata) => chiamata[0]);
    expect(
      messaggi.some((messaggio) => typeof messaggio === 'string' && messaggio.startsWith('[notifiche]')),
    ).toBe(true);
  });
});

describe('useUnreadCount — the frames are the truth while the stream is up', () => {
  it('shows the count the frame carries and lets no poll answer overwrite it', async () => {
    mockStream.stato = { connected: true, unreadCount: 7, lastId: 12 };
    const { result } = await renderUnreadCount();
    await flush();

    // The read on entering the screen answers 2, the frame carried 7.
    expect(getNotifications).toHaveBeenCalledWith(TOKEN, { limit: 1 });
    expect(result.current.nonLette).toBe(7);

    getNotifications.mockResolvedValue(risposta(2));
    await unGiro();

    // While the frames answer, the tick does not even ask: the poll is the
    // fallback for a stream that is down, not a second reader beside it.
    expect(getNotifications).toHaveBeenCalledTimes(1);
    expect(result.current.nonLette).toBe(7);

    // A manual read — pull-to-refresh, or coming back to the foreground — still
    // asks, and its answer still cannot overwrite the frame's count.
    await act(async () => {
      void result.current.ricarica();
    });
    await flush();
    expect(getNotifications).toHaveBeenCalledTimes(2);
    expect(result.current.nonLette).toBe(7);
  });

  it('lets the poll answer write the count while the stream is not connected', async () => {
    mockStream.stato = { connected: false, unreadCount: 9, lastId: 12 };
    getNotifications.mockResolvedValue(risposta(1));
    const { result } = await renderUnreadCount();
    await flush();

    expect(result.current.nonLette).toBe(1);

    getNotifications.mockResolvedValue(risposta(3));
    await unGiro();

    expect(result.current.nonLette).toBe(3);
  });
});
describe('useNotifications — a frame re-reads the list', () => {
  it('asks for the rows again when a notification frame arrives', async () => {
    getNotifications.mockResolvedValue(page([row(1, false)], 1));
    const { result } = await renderInbox();
    await flush();
    expect(result.current.elementi).toEqual([row(1, false)]);
    const letturePrimaDelFrame = getNotifications.mock.calls.length;
    expect(letturePrimaDelFrame).toBeGreaterThan(0);

    getNotifications.mockResolvedValue(page([row(2, false), row(1, false)], 2));
    await act(async () => {
      mockStream.handler({ tipo: 'MESSAGE', dati: null });
      for (let i = 0; i < 6; i += 1) {
        await Promise.resolve();
      }
    });

    expect(getNotifications).toHaveBeenCalledTimes(letturePrimaDelFrame + 1);
    expect(result.current.elementi).toEqual([row(2, false), row(1, false)]);
    expect(result.current.nonLette).toBe(2);
  });
});

describe('useNotifications — the read of the rows the panel showed', () => {
  it('marks every unread row with one request each and drops the count by two', async () => {
    getNotifications.mockResolvedValue(page([row(1, false), row(2, false), row(3, true)], 2));
    markNotificationRead.mockImplementation(async (token, id) => row(id, true));
    const { result } = await renderInbox();
    await flush();
    expect(result.current.nonLette).toBe(2);

    await act(async () => {
      await result.current.segnaLetteMostrate();
    });

    expect(markNotificationRead).toHaveBeenCalledTimes(2);
    expect(markNotificationRead).toHaveBeenCalledWith(TOKEN, 1);
    expect(markNotificationRead).toHaveBeenCalledWith(TOKEN, 2);
    expect(result.current.elementi).toEqual([row(1, true), row(2, true), row(3, true)]);
    expect(result.current.nonLette).toBe(0);
  });

  it('sends no request and leaves the state alone when every row is already read', async () => {
    getNotifications.mockResolvedValue(page([row(1, true), row(2, true)], 0));
    const { result } = await renderInbox();
    await flush();

    await act(async () => {
      await result.current.segnaLetteMostrate();
    });

    expect(markNotificationRead).not.toHaveBeenCalled();
    expect(result.current.elementi).toEqual([row(1, true), row(2, true)]);
    expect(result.current.nonLette).toBe(0);
  });

  it('leaves the rejected row unread and drops the count by the successes only', async () => {
    getNotifications.mockResolvedValue(page([row(1, false), row(2, false)], 2));
    markNotificationRead.mockImplementation(async (token, id) => {
      if (id === 2) {
        throw new Error('PATCH rifiutato');
      }
      return row(id, true);
    });
    const { result } = await renderInbox();
    await flush();

    await act(async () => {
      await result.current.segnaLetteMostrate();
    });

    expect(markNotificationRead).toHaveBeenCalledTimes(2);
    expect(result.current.elementi).toEqual([row(1, true), row(2, false)]);
    expect(result.current.nonLette).toBe(1);
  });

  it('sends no request when the token is gone', async () => {
    getNotifications.mockResolvedValue(page([row(1, false), row(2, false)], 2));
    const { result, rerender } = await renderInbox();
    await flush();
    expect(result.current.elementi).toHaveLength(2);

    // Togliere la sessione è l'unico modo di arrivare a `segnaLetteMostrate`
    // con righe già a schermo, che è il caso per cui esiste la guardia.
    await rerender({ token: null });
    await act(async () => {
      await result.current.segnaLetteMostrate();
    });

    expect(markNotificationRead).not.toHaveBeenCalled();
    expect(result.current.elementi).toEqual([row(1, false), row(2, false)]);
    expect(result.current.nonLette).toBe(2);
  });
});

describe('useNotifications — reading every page of the inbox', () => {
  it('reads every page the response announces', async () => {
    getNotifications.mockImplementation(async (token, { page: pageNumber } = {}) =>
      pagedResponse([row(pageNumber, false)], 2, pageNumber, 2),
    );
    const { result } = await renderInbox();
    await flush();

    expect(getNotifications).toHaveBeenCalledTimes(2);
    expect(getNotifications).toHaveBeenCalledWith(TOKEN, { page: 1 });
    expect(getNotifications).toHaveBeenCalledWith(TOKEN, { page: 2 });
    expect(result.current.elementi).toEqual([row(1, false), row(2, false)]);
    expect(result.current.errore).toBeNull();
  });

  it('stops at NOTIFICATIONS_MAX_PAGES', async () => {
    getNotifications.mockImplementation(async (token, { page: pageNumber } = {}) =>
      pagedResponse([row(pageNumber, false)], 9, pageNumber, 9),
    );
    const { result } = await renderInbox();
    await flush();

    expect(getNotifications).toHaveBeenCalledTimes(NOTIFICATIONS_MAX_PAGES);
    expect(result.current.elementi).toEqual(
      Array.from({ length: NOTIFICATIONS_MAX_PAGES }, (rowOfPage, index) => row(index + 1, false)),
    );
  });

  it('keeps the pages that answered when a later page fails', async () => {
    getNotifications.mockImplementation(async (token, { page: pageNumber } = {}) => {
      if (pageNumber > 1) {
        throw new ApiError(500, 'Errore interno del server');
      }
      return pagedResponse([row(1, false)], 2, pageNumber, 2);
    });
    const { result } = await renderInbox();
    await flush();

    expect(getNotifications).toHaveBeenCalledTimes(2);
    expect(result.current.errore).toBe('Errore interno del server');
    expect(result.current.elementi).toEqual([row(1, false)]);
    expect(result.current.nonLette).toBe(2);
  });
});
