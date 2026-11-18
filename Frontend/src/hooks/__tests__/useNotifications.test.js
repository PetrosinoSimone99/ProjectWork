import { act, create } from 'react-test-renderer';
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

/**
 * Same probe for the inbox hook. It returns `setToken` because dropping the
 * session is the only way to reach `segnaLetteMostrate` with rows already on
 * screen, which is the case the token guard exists for.
 */
function renderInbox(lettura, token = TOKEN) {
  function InboxProbe({ token: corrente }) {
    Object.assign(lettura, useNotifications({ token: corrente }));
    return null;
  }
  let renderer;
  act(() => {
    renderer = create(<InboxProbe token={token} />);
  });
  return {
    setToken: (nuovoToken) => {
      act(() => {
        renderer.update(<InboxProbe token={nuovoToken} />);
      });
    },
  };
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

describe('useUnreadCount — the frames are the truth while the stream is up', () => {
  it('shows the count the frame carries and lets no poll answer overwrite it', async () => {
    mockStream.stato = { connected: true, unreadCount: 7, lastId: 12 };
    const lettura = {};
    render(lettura);
    await flush();

    // The read on entering the screen answers 2, the frame carried 7.
    expect(getNotifications).toHaveBeenCalledWith(TOKEN, { limit: 1 });
    expect(lettura.nonLette).toBe(7);

    getNotifications.mockResolvedValue(risposta(2));
    await unGiro();

    // While the frames answer, the tick does not even ask: the poll is the
    // fallback for a stream that is down, not a second reader beside it.
    expect(getNotifications).toHaveBeenCalledTimes(1);
    expect(lettura.nonLette).toBe(7);

    // A manual read — pull-to-refresh, or coming back to the foreground — still
    // asks, and its answer still cannot overwrite the frame's count.
    act(() => {
      void lettura.ricarica();
    });
    await flush();
    expect(getNotifications).toHaveBeenCalledTimes(2);
    expect(lettura.nonLette).toBe(7);
  });

  it('lets the poll answer write the count while the stream is not connected', async () => {
    mockStream.stato = { connected: false, unreadCount: 9, lastId: 12 };
    const lettura = {};
    getNotifications.mockResolvedValue(risposta(1));
    render(lettura);
    await flush();

    expect(lettura.nonLette).toBe(1);

    getNotifications.mockResolvedValue(risposta(3));
    await unGiro();

    expect(lettura.nonLette).toBe(3);
  });
});
describe('useNotifications — a frame re-reads the list', () => {
  it('asks for the rows again when a notification frame arrives', async () => {
    const lettura = {};
    getNotifications.mockResolvedValue(page([row(1, false)], 1));
    renderInbox(lettura);
    await flush();
    expect(lettura.elementi).toEqual([row(1, false)]);
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
    expect(lettura.elementi).toEqual([row(2, false), row(1, false)]);
    expect(lettura.nonLette).toBe(2);
  });
});

describe('useNotifications — the read of the rows the panel showed', () => {
  it('marks every unread row with one request each and drops the count by two', async () => {
    const lettura = {};
    getNotifications.mockResolvedValue(page([row(1, false), row(2, false), row(3, true)], 2));
    markNotificationRead.mockImplementation(async (token, id) => row(id, true));
    renderInbox(lettura);
    await flush();
    expect(lettura.nonLette).toBe(2);

    await act(async () => {
      await lettura.segnaLetteMostrate();
    });

    expect(markNotificationRead).toHaveBeenCalledTimes(2);
    expect(markNotificationRead).toHaveBeenCalledWith(TOKEN, 1);
    expect(markNotificationRead).toHaveBeenCalledWith(TOKEN, 2);
    expect(lettura.elementi).toEqual([row(1, true), row(2, true), row(3, true)]);
    expect(lettura.nonLette).toBe(0);
  });

  it('sends no request and leaves the state alone when every row is already read', async () => {
    const lettura = {};
    getNotifications.mockResolvedValue(page([row(1, true), row(2, true)], 0));
    renderInbox(lettura);
    await flush();

    await act(async () => {
      await lettura.segnaLetteMostrate();
    });

    expect(markNotificationRead).not.toHaveBeenCalled();
    expect(lettura.elementi).toEqual([row(1, true), row(2, true)]);
    expect(lettura.nonLette).toBe(0);
  });

  it('leaves the rejected row unread and drops the count by the successes only', async () => {
    const lettura = {};
    getNotifications.mockResolvedValue(page([row(1, false), row(2, false)], 2));
    markNotificationRead.mockImplementation(async (token, id) => {
      if (id === 2) {
        throw new Error('PATCH rifiutato');
      }
      return row(id, true);
    });
    renderInbox(lettura);
    await flush();

    await act(async () => {
      await lettura.segnaLetteMostrate();
    });

    expect(markNotificationRead).toHaveBeenCalledTimes(2);
    expect(lettura.elementi).toEqual([row(1, true), row(2, false)]);
    expect(lettura.nonLette).toBe(1);
  });

  it('sends no request when the token is gone', async () => {
    const lettura = {};
    getNotifications.mockResolvedValue(page([row(1, false), row(2, false)], 2));
    const sonda = renderInbox(lettura);
    await flush();
    expect(lettura.elementi).toHaveLength(2);

    sonda.setToken(null);
    await act(async () => {
      await lettura.segnaLetteMostrate();
    });

    expect(markNotificationRead).not.toHaveBeenCalled();
    expect(lettura.elementi).toEqual([row(1, false), row(2, false)]);
    expect(lettura.nonLette).toBe(2);
  });
});

describe('useNotifications — reading every page of the inbox', () => {
  it('reads every page the response announces', async () => {
    const lettura = {};
    getNotifications.mockImplementation(async (token, { page: pageNumber } = {}) =>
      pagedResponse([row(pageNumber, false)], 2, pageNumber, 2),
    );
    renderInbox(lettura);
    await flush();

    expect(getNotifications).toHaveBeenCalledTimes(2);
    expect(getNotifications).toHaveBeenCalledWith(TOKEN, { page: 1 });
    expect(getNotifications).toHaveBeenCalledWith(TOKEN, { page: 2 });
    expect(lettura.elementi).toEqual([row(1, false), row(2, false)]);
    expect(lettura.errore).toBeNull();
  });

  it('stops at NOTIFICATIONS_MAX_PAGES', async () => {
    const lettura = {};
    getNotifications.mockImplementation(async (token, { page: pageNumber } = {}) =>
      pagedResponse([row(pageNumber, false)], 9, pageNumber, 9),
    );
    renderInbox(lettura);
    await flush();

    expect(getNotifications).toHaveBeenCalledTimes(NOTIFICATIONS_MAX_PAGES);
    expect(lettura.elementi).toEqual(
      Array.from({ length: NOTIFICATIONS_MAX_PAGES }, (rowOfPage, index) => row(index + 1, false)),
    );
  });

  it('keeps the pages that answered when a later page fails', async () => {
    const lettura = {};
    getNotifications.mockImplementation(async (token, { page: pageNumber } = {}) => {
      if (pageNumber > 1) {
        throw new ApiError(500, 'Errore interno del server');
      }
      return pagedResponse([row(1, false)], 2, pageNumber, 2);
    });
    renderInbox(lettura);
    await flush();

    expect(getNotifications).toHaveBeenCalledTimes(2);
    expect(lettura.errore).toBe('Errore interno del server');
    expect(lettura.elementi).toEqual([row(1, false)]);
    expect(lettura.nonLette).toBe(2);
  });
});
