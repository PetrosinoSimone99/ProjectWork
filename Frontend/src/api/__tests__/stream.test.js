import {
  STREAM_IDLE_MS,
  affectsAgreements,
  affectsChat,
  affectsMatch,
  affectsProfile,
  parseEventStream,
  startEventStream,
  streamUrl,
} from '../stream';
import { API_BASE_URL } from '../config';
import * as client from '../client';

/** One notification frame exactly as the backend writes it. */
function notificationFrame(id, type, data = {}, unreadCount = 1) {
  return [
    'event: notification',
    `id: ${id}`,
    `data: ${JSON.stringify({ notification: { id, type, message: 'x', data, readAt: null }, unreadCount })}`,
    '',
    '',
  ].join('\n');
}

/** Lets the promise chain of a mocked transport settle. */
async function flush(volte = 10) {
  for (let i = 0; i < volte; i += 1) {
    await Promise.resolve();
  }
}

/** A `fetch` whose body is a reader over the chunks the test names. */
function fetchWithChunks(chunks) {
  const queue = [...chunks];
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: () =>
          Promise.resolve(
            queue.length > 0 ? { value: chunksToBytes(queue.shift()), done: false } : { done: true },
          ),
      }),
    },
  });
}

function chunksToBytes(testo) {
  return new TextEncoder().encode(testo);
}

/** A global `XMLHttpRequest` whose progress the test drives by hand. */
class FakeXhr {
  constructor() {
    this.headers = {};
    this.responseText = '';
    this.status = 200;
    this.aborted = false;
    FakeXhr.last = this;
  }

  open(method, url) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(nome, valore) {
    this.headers[nome] = valore;
  }

  send() {
    this.sent = true;
  }

  abort() {
    this.aborted = true;
  }

  /** One network progress event with everything received so far. */
  progress(testoCompleto) {
    this.responseText = testoCompleto;
    this.onprogress();
  }
}

describe('parseEventStream', () => {
  it('holds a frame split mid field until the blank line arrives', () => {
    const primo = parseEventStream('', 'event: notific');
    expect(primo.frames).toEqual([]);

    const secondo = parseEventStream(primo.rest, 'ation\nid: 7\ndata: {"a":1}\n\n');
    expect(secondo.frames).toEqual([{ event: 'notification', id: '7', data: '{"a":1}' }]);
    expect(secondo.rest).toBe('');
  });

  it('holds a frame split between data lines and rejoins them', () => {
    const primo = parseEventStream('', 'event: notification\ndata: {"notifica');
    expect(primo.frames).toEqual([]);

    const secondo = parseEventStream(primo.rest, 'tion":{}}\n\n');
    expect(secondo.frames).toEqual([
      { event: 'notification', id: null, data: '{"notification":{}}' },
    ]);
  });

  it('ignores comment frames, which is what keeps a quiet minute alive', () => {
    const { frames } = parseEventStream('', ': ping\n\n: ping\n\n');
    expect(frames).toEqual([]);
  });

  it('joins multiple data lines with a newline, as the event-stream format says', () => {
    const { frames } = parseEventStream('', 'data: uno\ndata: due\n\n');
    expect(frames).toEqual([{ event: 'message', id: null, data: 'uno\ndue' }]);
  });

  it('accepts CRLF line endings', () => {
    const { frames } = parseEventStream('', 'event: hello\r\ndata: {"lastId":3}\r\n\r\n');
    expect(frames).toEqual([{ event: 'hello', id: null, data: '{"lastId":3}' }]);
  });
});

describe('streamUrl', () => {
  it('omits the cursor when the client has none, which is the live edge', () => {
    expect(streamUrl(null)).toBe(`${API_BASE_URL}/stream`);
    expect(streamUrl(undefined)).toBe(`${API_BASE_URL}/stream`);
  });

  it('sends a zero cursor, because replaying the inbox is a legal answer', () => {
    expect(streamUrl(0)).toBe(`${API_BASE_URL}/stream?after=0`);
  });

  it('drops anything that is not a non-negative integer instead of sending it', () => {
    expect(streamUrl('x')).toBe(`${API_BASE_URL}/stream`);
    expect(streamUrl(-1)).toBe(`${API_BASE_URL}/stream`);
  });
});

describe('startEventStream on the web', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('sends the token in the header and never in the URL', async () => {
    global.fetch = fetchWithChunks([]);
    const stream = startEventStream({
      token: 'jwt',
      after: 4,
      platform: 'web',
      onFrame: jest.fn(),
      onClose: jest.fn(),
      onError: jest.fn(),
    });

    const [url, opzioni] = global.fetch.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/stream?after=4`);
    expect(url).not.toContain('jwt');
    expect(opzioni.headers.Authorization).toBe('Bearer jwt');
    stream.close();
  });

  it('answers hello and then one notification per row, with the cursor moved', async () => {
    global.fetch = fetchWithChunks([
      'event: hello\ndata: {"lastId":41,"unreadCount":2}\n\n',
      notificationFrame(42, 'agreement_completed', { agreementId: 9 }, 3),
    ]);
    const frame = jest.fn();
    const onClose = jest.fn();
    startEventStream({
      token: 'jwt',
      platform: 'web',
      onFrame: frame,
      onClose,
      onError: jest.fn(),
    });
    await flush();

    expect(frame).toHaveBeenNthCalledWith(1, { type: 'hello', lastId: 41, nonLette: 2 });
    const notifica = frame.mock.calls[1][0];
    expect(notifica.type).toBe('notification');
    expect(notifica.lastId).toBe(42);
    expect(notifica.nonLette).toBe(3);
    // The scheduler writes the type in lower case; the row still reaches the
    // screens in the internal upper-case shape.
    expect(notifica.notifica.tipo).toBe('AGREEMENT_COMPLETED');
    expect(notifica.notifica.dati).toEqual({ agreementId: 9 });
    expect(onClose).toHaveBeenCalledWith({ reason: 'eof' });
  });

  it('reports an expired session once and closes instead of retrying', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    const sessione = jest.spyOn(client, 'signalSessionExpired').mockImplementation(() => {});
    const onError = jest.fn();
    startEventStream({
      token: 'jwt',
      platform: 'web',
      onFrame: jest.fn(),
      onClose: jest.fn(),
      onError,
    });
    await flush();

    expect(sessione).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith({ status: 401 });
  });

  it('treats a silent connection as dead after the idle window', async () => {
    jest.useFakeTimers();
    const reader = { read: () => new Promise(() => {}) };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: { getReader: () => reader },
    });
    const onClose = jest.fn();
    const stream = startEventStream({
      token: 'jwt',
      platform: 'web',
      onFrame: jest.fn(),
      onClose,
      onError: jest.fn(),
    });
    await flush();

    jest.advanceTimersByTime(STREAM_IDLE_MS - 1);
    expect(onClose).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onClose).toHaveBeenCalledWith({ reason: 'idle' });
    stream.close();
  });
});

describe('startEventStream on native', () => {
  const originalXhr = global.XMLHttpRequest;

  beforeEach(() => {
    global.XMLHttpRequest = FakeXhr;
  });

  afterEach(() => {
    global.XMLHttpRequest = originalXhr;
    jest.useRealTimers();
  });

  it('reads only the bytes that arrived since the last progress event', () => {
    const frame = jest.fn();
    const xhr = startEventStream({
      token: 'jwt',
      platform: 'ios',
      onFrame: frame,
      onClose: jest.fn(),
      onError: jest.fn(),
    });

    const richiesta = FakeXhr.last;
    expect(richiesta.method).toBe('GET');
    expect(richiesta.headers.Authorization).toBe('Bearer jwt');
    expect(richiesta.timeout).toBe(0);

    richiesta.progress('event: hello\ndata: {"lastId":5,"unreadCount":0}\n\n');
    expect(frame).toHaveBeenCalledTimes(1);

    // The second progress carries the whole text again: the first frame must
    // not be delivered twice.
    richiesta.progress(
      'event: hello\ndata: {"lastId":5,"unreadCount":0}\n\n' +
        notificationFrame(6, 'CHAT_MESSAGE', { chatId: 3 }, 1),
    );
    expect(frame).toHaveBeenCalledTimes(2);
    expect(frame.mock.calls[1][0].notifica.tipo).toBe('CHAT_MESSAGE');
    xhr.close();
  });

  it('reports the status of a refused connection', () => {
    const onError = jest.fn();
    const sessione = jest.spyOn(client, 'signalSessionExpired').mockImplementation(() => {});
    startEventStream({
      token: 'jwt',
      platform: 'android',
      onFrame: jest.fn(),
      onClose: jest.fn(),
      onError,
    });

    const richiesta = FakeXhr.last;
    richiesta.status = 401;
    richiesta.onload();

    expect(sessione).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith({ status: 401 });
    sessione.mockRestore();
  });
});

describe('the predicates a consumer uses', () => {
  const riga = (tipo, dati = {}) => ({ id: 1, tipo, dati });

  it('sends every agreement event to the agreements tab', () => {
    for (const tipo of [
      'AGREEMENT_PROPOSAL',
      'AGREEMENT_RESPONSE',
      'AGREEMENT_DETAILS',
      'AGREEMENT_DETAILS_ACCEPTED',
      'AGREEMENT_CANCELLED',
      'AGREEMENT_COMPLETED',
    ]) {
      expect(affectsAgreements(riga(tipo))).toBe(true);
    }
    expect(affectsAgreements(riga('CHAT_MESSAGE'))).toBe(false);
  });

  it('sends a message only to the chat that carries its id', () => {
    expect(affectsChat(riga('CHAT_MESSAGE', { chatId: 7 }), 7)).toBe(true);
    expect(affectsChat(riga('CHAT_MESSAGE', { chatId: '7' }), 7)).toBe(true);
    expect(affectsChat(riga('CHAT_MESSAGE', { chatId: 8 }), 7)).toBe(false);
    expect(affectsChat(riga('AGREEMENT_PROPOSAL', { chatId: 7 }), 7)).toBe(false);
    // The chat id exists only after the first history read.
    expect(affectsChat(riga('CHAT_MESSAGE', { chatId: 7 }), null)).toBe(false);
  });

  it('separates the profile events from the rest', () => {
    for (const tipo of ['USER_PROMOTED', 'USER_STATUS_CHANGED', 'SERVICE_RESTORED']) {
      expect(affectsProfile(riga(tipo))).toBe(true);
    }
    expect(affectsProfile(riga('MATCH_CREATED'))).toBe(false);
  });

  it('recognises a queue match', () => {
    expect(affectsMatch(riga('MATCH_CREATED'))).toBe(true);
    expect(affectsMatch(riga('AGREEMENT_PROPOSAL'))).toBe(false);
    expect(affectsMatch(null)).toBe(false);
  });
});
