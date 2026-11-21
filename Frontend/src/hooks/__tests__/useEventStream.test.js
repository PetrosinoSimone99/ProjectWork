import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { startEventStream } from '@/api/stream';
import {
  EventStreamProvider,
  STREAM_BACKOFF_MAX_MS,
  STREAM_BACKOFF_MS,
  STREAM_RECONNECT_MS,
  useStreamEvent,
  useStreamState,
} from '../useEventStream';

/**
 * The provider is the only place a connection is opened, so the test drives the
 * connection through the mocked factory: every opened stream is kept here with
 * the callbacks the provider passed, and a test fires frames and closures by
 * hand.
 */
const aperte = [];

jest.mock('@/api/stream', () => ({
  startEventStream: jest.fn((opzioni) => {
    const chiusa = jest.fn();
    aperte.push({ ...opzioni, chiusa });
    return { close: chiusa };
  }),
}));

let mockToken = 'jwt';
jest.mock('@/auth/auth-context', () => ({
  useAuth: () => ({ token: mockToken }),
}));

/** The last stream the provider opened. */
const ultima = () => aperte[aperte.length - 1];

/** One notification row in the internal shape, as `api/stream.js` delivers it. */
const riga = (tipo, dati = {}) => ({
  id: 9,
  tipo,
  messaggio: 'x',
  dati,
  creataIl: null,
  letta: false,
});

/** Frames and closures arrive outside React's own events. */
async function emetti(fn) {
  await act(async () => {
    fn();
  });
}

/** The handler a subscriber receives, plus the state it renders from. */
function useStatoStream(onEvento) {
  const stato = useStreamState();
  useStreamEvent(onEvento);
  return stato;
}

/** Mounts one subscriber inside the provider; `result.current` is the state it renders from. */
function monta(onEvento) {
  return renderHook(() => useStatoStream(onEvento), { wrapper: EventStreamProvider });
}

beforeEach(() => {
  aperte.length = 0;
  mockToken = 'jwt';
  startEventStream.mockClear();
  AppState.currentState = 'active';
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('EventStreamProvider', () => {
  it('opens exactly one connection for the app, with no cursor on the first try', async () => {
    await monta(jest.fn());
    expect(startEventStream).toHaveBeenCalledTimes(1);
    expect(ultima().token).toBe('jwt');
    expect(ultima().after).toBeNull();
  });

  it('hands a notification row to every subscriber and keeps the cursor', async () => {
    const evento = jest.fn();
    const { result } = await monta(evento);

    await emetti(() => ultima().onFrame({ type: 'hello', lastId: 11, nonLette: 2 }));
    expect(result.current).toMatchObject({ connected: true, unreadCount: 2, lastId: 11 });

    await emetti(() =>
      ultima().onFrame({
        type: 'notification',
        notifica: riga('CHAT_MESSAGE', { chatId: 3 }),
        nonLette: 3,
        lastId: 12,
      }),
    );
    expect(evento).toHaveBeenCalledTimes(1);
    expect(evento.mock.calls[0][0].tipo).toBe('CHAT_MESSAGE');
    expect(result.current).toMatchObject({ connected: true, unreadCount: 3, lastId: 12 });

    // The server closes at 30 s; the next connection must resume from the cursor.
    await emetti(() => ultima().onClose({ reason: 'eof' }));
    await act(async () => {
      jest.advanceTimersByTime(STREAM_RECONNECT_MS);
    });
    expect(startEventStream).toHaveBeenCalledTimes(2);
    expect(ultima().after).toBe(12);
  });

  it('keeps the stream reported as up across the planned close', async () => {
    const { result } = await monta(jest.fn());
    await emetti(() => ultima().onFrame({ type: 'hello', lastId: 4, nonLette: 5 }));

    // The 30 s close is the server doing its job. Reporting it as down would
    // hand the badge its two-minute-old poll answer twice a minute.
    await emetti(() => ultima().onClose({ reason: 'eof' }));
    expect(result.current).toMatchObject({ connected: true, unreadCount: 5, lastId: 4 });
  });

  it('advances the cursor over a frame it cannot draw, and delivers nothing', async () => {
    const evento = jest.fn();
    const { result } = await monta(evento);
    await emetti(() => ultima().onFrame({ type: 'hello', lastId: 4, nonLette: 5 }));

    await emetti(() => ultima().onFrame({ type: 'cursor', lastId: 9 }));
    expect(evento).not.toHaveBeenCalled();
    expect(result.current.lastId).toBe(9);

    await emetti(() => ultima().onClose({ reason: 'eof' }));
    await act(async () => {
      jest.advanceTimersByTime(STREAM_RECONNECT_MS);
    });
    expect(ultima().after).toBe(9);
  });

  it('does not ask for the count again: a frame without one keeps the last', async () => {
    const { result } = await monta(jest.fn());
    await emetti(() => ultima().onFrame({ type: 'hello', lastId: 1, nonLette: 4 }));
    await emetti(() =>
      ultima().onFrame({
        type: 'notification',
        notifica: riga('MATCH_CREATED'),
        nonLette: null,
        lastId: 2,
      }),
    );
    expect(result.current.unreadCount).toBe(4);
  });

  it('backs off on fault, doubles the wait, and a hello resets it', async () => {
    await monta(jest.fn());

    await emetti(() => ultima().onError({ status: 0 }));
    await act(async () => {
      jest.advanceTimersByTime(STREAM_BACKOFF_MS);
    });
    expect(startEventStream).toHaveBeenCalledTimes(2);

    await emetti(() => ultima().onError({ status: 0 }));
    await act(async () => {
      jest.advanceTimersByTime(STREAM_BACKOFF_MS);
    });
    // The second wait is twice the first: one second was not enough for this one.
    expect(startEventStream).toHaveBeenCalledTimes(2);
    await act(async () => {
      jest.advanceTimersByTime(STREAM_BACKOFF_MS);
    });
    expect(startEventStream).toHaveBeenCalledTimes(3);

    // A connection that answers resets the wait to the base, not to 4 s.
    await emetti(() => ultima().onFrame({ type: 'hello', lastId: 5, nonLette: 0 }));
    await emetti(() => ultima().onClose({ reason: 'eof' }));
    await act(async () => {
      jest.advanceTimersByTime(STREAM_RECONNECT_MS);
    });
    await emetti(() => ultima().onError({ status: 0 }));
    await act(async () => {
      jest.advanceTimersByTime(STREAM_BACKOFF_MS);
    });
    expect(startEventStream).toHaveBeenCalledTimes(5);
  });

  it('stops at the ceiling instead of waiting forever to grow', async () => {
    await monta(jest.fn());
    for (let i = 0; i < 12; i += 1) {
      await emetti(() => ultima().onError({ status: 0 }));
      await act(async () => {
        jest.advanceTimersByTime(STREAM_BACKOFF_MAX_MS);
      });
    }
    expect(startEventStream).toHaveBeenCalledTimes(13);
    expect(startEventStream.mock.calls.length).toBeGreaterThanOrEqual(13);
  });

  it('does not retry an expired session', async () => {
    await monta(jest.fn());
    await emetti(() => ultima().onError({ status: 401 }));
    await act(async () => {
      jest.advanceTimersByTime(STREAM_BACKOFF_MAX_MS);
    });
    expect(startEventStream).toHaveBeenCalledTimes(1);
  });

  it('holds no connection while the app is in the background', async () => {
    const cambi = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_tipo, handler) => {
      cambi.push(handler);
      return { remove: jest.fn() };
    });
    await monta(jest.fn());
    expect(startEventStream).toHaveBeenCalledTimes(1);

    await act(async () => {
      cambi.forEach((handler) => handler('background'));
    });
    expect(ultima().chiusa).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(STREAM_BACKOFF_MAX_MS * 4);
    });
    expect(startEventStream).toHaveBeenCalledTimes(1);

    await act(async () => {
      cambi.forEach((handler) => handler('active'));
    });
    expect(startEventStream).toHaveBeenCalledTimes(2);
  });

  it('closes the connection when the session ends', async () => {
    const { result, rerender } = await monta(jest.fn());
    const prima = ultima();
    mockToken = null;
    await rerender();
    expect(prima.chiusa).toHaveBeenCalledTimes(1);
    expect(result.current).toMatchObject({ connected: false, unreadCount: null });
  });
});

describe('outside a provider', () => {
  it('delivers nothing and reports a neutral state, so a screen still works', async () => {
    const evento = jest.fn();
    const { result } = await renderHook(() => useStatoStream(evento));

    expect(result.current).toEqual({ connected: false, unreadCount: null, lastId: null });
    expect(evento).not.toHaveBeenCalled();
  });
});
