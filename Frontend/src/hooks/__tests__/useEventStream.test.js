import { act, create } from 'react-test-renderer';
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
function emetti(fn) {
  act(() => {
    fn();
  });
}

/** The handler a subscriber receives, plus the state it renders from. */
function Monta({ onEvento }) {
  const stato = useStreamState();
  useStreamEvent(onEvento);
  Object.assign(lettura.stato, stato);
  return null;
}

const lettura = { stato: {} };

function monta(onEvento) {
  let renderer;
  act(() => {
    renderer = create(
      <EventStreamProvider>
        <Monta onEvento={onEvento} />
      </EventStreamProvider>,
    );
  });
  return renderer;
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
  it('opens exactly one connection for the app, with no cursor on the first try', () => {
    monta(jest.fn());
    expect(startEventStream).toHaveBeenCalledTimes(1);
    expect(ultima().token).toBe('jwt');
    expect(ultima().after).toBeNull();
  });

  it('hands a notification row to every subscriber and keeps the cursor', () => {
    const evento = jest.fn();
    monta(evento);

    emetti(() => ultima().onFrame({ type: 'hello', lastId: 11, nonLette: 2 }));
    expect(lettura.stato).toMatchObject({ connected: true, unreadCount: 2, lastId: 11 });

    emetti(() =>
      ultima().onFrame({
        type: 'notification',
        notifica: riga('CHAT_MESSAGE', { chatId: 3 }),
        nonLette: 3,
        lastId: 12,
      }),
    );
    expect(evento).toHaveBeenCalledTimes(1);
    expect(evento.mock.calls[0][0].tipo).toBe('CHAT_MESSAGE');
    expect(lettura.stato).toMatchObject({ connected: true, unreadCount: 3, lastId: 12 });

    // The server closes at 30 s; the next connection must resume from the cursor.
    emetti(() => ultima().onClose({ reason: 'eof' }));
    act(() => {
      jest.advanceTimersByTime(STREAM_RECONNECT_MS);
    });
    expect(startEventStream).toHaveBeenCalledTimes(2);
    expect(ultima().after).toBe(12);
  });

  it('does not ask for the count again: a frame without one keeps the last', () => {
    monta(jest.fn());
    emetti(() => ultima().onFrame({ type: 'hello', lastId: 1, nonLette: 4 }));
    emetti(() =>
      ultima().onFrame({
        type: 'notification',
        notifica: riga('MATCH_CREATED'),
        nonLette: null,
        lastId: 2,
      }),
    );
    expect(lettura.stato.unreadCount).toBe(4);
  });

  it('backs off on fault, doubles the wait, and a hello resets it', () => {
    monta(jest.fn());

    emetti(() => ultima().onError({ status: 0 }));
    act(() => {
      jest.advanceTimersByTime(STREAM_BACKOFF_MS);
    });
    expect(startEventStream).toHaveBeenCalledTimes(2);

    emetti(() => ultima().onError({ status: 0 }));
    act(() => {
      jest.advanceTimersByTime(STREAM_BACKOFF_MS);
    });
    // The second wait is twice the first: one second was not enough for this one.
    expect(startEventStream).toHaveBeenCalledTimes(2);
    act(() => {
      jest.advanceTimersByTime(STREAM_BACKOFF_MS);
    });
    expect(startEventStream).toHaveBeenCalledTimes(3);

    // A connection that answers resets the wait to the base, not to 4 s.
    emetti(() => ultima().onFrame({ type: 'hello', lastId: 5, nonLette: 0 }));
    emetti(() => ultima().onClose({ reason: 'eof' }));
    act(() => {
      jest.advanceTimersByTime(STREAM_RECONNECT_MS);
    });
    emetti(() => ultima().onError({ status: 0 }));
    act(() => {
      jest.advanceTimersByTime(STREAM_BACKOFF_MS);
    });
    expect(startEventStream).toHaveBeenCalledTimes(5);
  });

  it('stops at the ceiling instead of waiting forever to grow', () => {
    monta(jest.fn());
    for (let i = 0; i < 12; i += 1) {
      emetti(() => ultima().onError({ status: 0 }));
      act(() => {
        jest.advanceTimersByTime(STREAM_BACKOFF_MAX_MS);
      });
    }
    expect(startEventStream).toHaveBeenCalledTimes(13);
    expect(startEventStream.mock.calls.length).toBeGreaterThanOrEqual(13);
  });

  it('does not retry an expired session', () => {
    monta(jest.fn());
    emetti(() => ultima().onError({ status: 401 }));
    act(() => {
      jest.advanceTimersByTime(STREAM_BACKOFF_MAX_MS);
    });
    expect(startEventStream).toHaveBeenCalledTimes(1);
  });

  it('holds no connection while the app is in the background', () => {
    const cambi = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_tipo, handler) => {
      cambi.push(handler);
      return { remove: jest.fn() };
    });
    monta(jest.fn());
    expect(startEventStream).toHaveBeenCalledTimes(1);

    act(() => {
      cambi.forEach((handler) => handler('background'));
    });
    expect(ultima().chiusa).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(STREAM_BACKOFF_MAX_MS * 4);
    });
    expect(startEventStream).toHaveBeenCalledTimes(1);

    act(() => {
      cambi.forEach((handler) => handler('active'));
    });
    expect(startEventStream).toHaveBeenCalledTimes(2);
  });

  it('closes the connection when the session ends', () => {
    const renderer = monta(jest.fn());
    const prima = ultima();
    mockToken = null;
    act(() => {
      renderer.update(
        <EventStreamProvider>
          <Monta onEvento={jest.fn()} />
        </EventStreamProvider>,
      );
    });
    expect(prima.chiusa).toHaveBeenCalledTimes(1);
    expect(lettura.stato).toMatchObject({ connected: false, unreadCount: null });
  });
});

describe('outside a provider', () => {
  it('delivers nothing and reports a neutral state, so a screen still works', () => {
    const evento = jest.fn();
    const letturaLocale = {};
    function Solo({ onEvento }) {
      Object.assign(letturaLocale, useStreamState());
      useStreamEvent(onEvento);
      return null;
    }
    act(() => {
      create(<Solo onEvento={evento} />);
    });
    expect(letturaLocale).toEqual({ connected: false, unreadCount: null, lastId: null });
    expect(evento).not.toHaveBeenCalled();
  });
});
