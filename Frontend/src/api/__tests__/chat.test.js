import { SESSION_EXPIRED_MESSAGE, messageForStatus } from '../client';
import {
  getAgreementChat,
  getNewChatMessages,
  getMostRecentMessageId,
  sendChatMessage,
} from '../areas/chat';

/**
 * The four chat calls of `api/areas/chat.js`.
 *
 * The suite pins the wire contract the screens rely on: the exact path and
 * method of each route, the bearer token on every request, the `{message}`
 * JSON body of the send, and the Italian copy each failing status becomes.
 * The network is mocked at `fetch` (like `agreements.test.js`), so the real
 * `client.js` runs and the assertions see the headers and the body the server
 * would receive. The backend answers in English: no English text may reach
 * the message the screen shows.
 */

const TOKEN = 'token-123';

/** A `Response`-shaped object: `client.js` reads `ok`, `status` and `text()`. */
function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

/** One row exactly as `ChatMessageDTO` serialises it. */
function wireMessage(overrides = {}) {
  return {
    id: 21,
    chatId: 7,
    username: 'mario.rossi',
    message: 'Ciao, ti va uno scambio?',
    creationDate: '2026-11-16T14:03:22+00:00',
    ...overrides,
  };
}

/** The URL and options of the last intercepted request. */
function lastRequest() {
  const calls = global.fetch.mock.calls;
  const [url, options] = calls[calls.length - 1];
  return { url: String(url), options };
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, {}));
});

describe('getAgreementChat', () => {
  it('reads the history of one agreement with the bearer token and no body', async () => {
    global.fetch.mockResolvedValue(
      jsonResponse(200, { chatId: 7, messages: [wireMessage()] }),
    );

    // The router hands the agreement id over as a string.
    const storico = await getAgreementChat(TOKEN, '7');

    const { url, options } = lastRequest();
    expect(url.endsWith('/chats/agreement/7')).toBe(true);
    expect(options.method).toBe('GET');
    expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(options.body).toBeUndefined();
    expect(storico).toEqual({
      chatId: 7,
      messaggi: [
        {
          id: 21,
          chatId: 7,
          autore: 'mario.rossi',
          testo: 'Ciao, ti va uno scambio?',
          inviatoIl: '2026-11-16T14:03:22+00:00',
        },
      ],
    });
  });

  it('drops the malformed rows of the history instead of drawing empty bubbles', async () => {
    global.fetch.mockResolvedValue(
      jsonResponse(200, {
        chatId: 7,
        messages: [
          wireMessage({ id: null }),
          wireMessage({ message: undefined }),
          wireMessage({ id: 22, message: 'A dopo!' }),
        ],
      }),
    );

    const storico = await getAgreementChat(TOKEN, 7);

    expect(storico.messaggi).toEqual([
      {
        id: 22,
        chatId: 7,
        autore: 'mario.rossi',
        testo: 'A dopo!',
        inviatoIl: '2026-11-16T14:03:22+00:00',
      },
    ]);
  });

  it('turns a 400 into the sentence about the missing agreement data', async () => {
    global.fetch.mockResolvedValue(jsonResponse(400, { error: 'Invalid chat' }));

    // client.js logged the English text before the rewrite: the error the
    // screen catches carries only the status and the Italian sentence.
    await expect(getAgreementChat(TOKEN, 7)).rejects.toMatchObject({
      status: 400,
      message: "Non posso aprire questa chat: manca un dato dell'accordo.",
      raw: null,
    });
  });

  it('turns a 404 into the sentence about an agreement that is gone', async () => {
    global.fetch.mockResolvedValue(jsonResponse(404, { error: 'Not found' }));

    await expect(getAgreementChat(TOKEN, 7)).rejects.toMatchObject({
      status: 404,
      message: 'Non trovo più questo accordo: potrebbe essere stato cancellato.',
    });
  });

  it('turns a 500 into the sentence about a failed read', async () => {
    global.fetch.mockResolvedValue(jsonResponse(500, { error: 'Internal server error' }));

    await expect(getAgreementChat(TOKEN, 7)).rejects.toMatchObject({
      status: 500,
      message: "Il server non ha restituito la chat: riprova. E se l'errore resta segnalalo.",
    });
  });
});

describe('sendChatMessage', () => {
  it('posts the message as JSON to the chat path with the bearer token', async () => {
    global.fetch.mockResolvedValue(
      jsonResponse(200, { success: { code: 200, message: 'Message sent successfully' } }),
    );

    // The acknowledgement carries no row: the caller only learns it was accepted.
    const inviato = await sendChatMessage(TOKEN, 3, 'Ti va uno scambio?');

    const { url, options } = lastRequest();
    expect(url.endsWith('/chats/send-message/3')).toBe(true);
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ message: 'Ti va uno scambio?' });
    expect(inviato).toBe(true);
  });

  it('turns a 400 into the sentence about the refused text', async () => {
    global.fetch.mockResolvedValue(jsonResponse(400, { error: 'Invalid chat' }));

    await expect(sendChatMessage(TOKEN, 3, 'Ciao')).rejects.toMatchObject({
      status: 400,
      message: 'Non posso inviare questo testo: controlla il messaggio.',
    });
  });

  it('turns a 404 into the sentence about a chat that is gone', async () => {
    global.fetch.mockResolvedValue(jsonResponse(404, { error: 'Not found' }));

    await expect(sendChatMessage(TOKEN, 3, 'Ciao')).rejects.toMatchObject({
      status: 404,
      message: 'Non trovo più questa chat: ricarica e riprova.',
    });
  });

  it('turns a 500 into the sentence about a failed write', async () => {
    global.fetch.mockResolvedValue(jsonResponse(500, { error: 'Write failed' }));

    await expect(sendChatMessage(TOKEN, 3, 'Ciao')).rejects.toMatchObject({
      status: 500,
      message: "Il server non ha accettato il messaggio: riprova, e se l'errore resta segnalalo.",
    });
  });
});

describe('getMostRecentMessageId', () => {
  it('reads the polling cursor with the bearer token and no body', async () => {
    global.fetch.mockResolvedValue(jsonResponse(200, { chatMessageId: 42 }));

    const cursor = await getMostRecentMessageId(TOKEN);

    const { url, options } = lastRequest();
    expect(url.endsWith('/chats/most-recent-message')).toBe(true);
    expect(options.method).toBe('GET');
    expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(options.body).toBeUndefined();
    expect(cursor).toBe(42);
  });

  it('answers null when the user received no message yet, not the cursor 0', async () => {
    global.fetch.mockResolvedValue(jsonResponse(200, { chatMessageId: null }));

    await expect(getMostRecentMessageId(TOKEN)).resolves.toBeNull();
  });
});

describe('getNewChatMessages', () => {
  it('asks the global route and keeps only the rows the UI can draw', async () => {
    global.fetch.mockResolvedValue(
      jsonResponse(200, [
        wireMessage({ id: 30, message: 'Arrivo tra un attimo.' }),
        wireMessage({ id: null }),
        wireMessage({ message: undefined }),
      ]),
    );

    const nuovi = await getNewChatMessages(TOKEN, 42);

    const { url, options } = lastRequest();
    expect(url.endsWith('/chats/check-new-messages/42')).toBe(true);
    expect(options.method).toBe('GET');
    expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(options.body).toBeUndefined();
    expect(nuovi).toEqual([
      {
        id: 30,
        chatId: 7,
        autore: 'mario.rossi',
        testo: 'Arrivo tra un attimo.',
        inviatoIl: '2026-11-16T14:03:22+00:00',
      },
    ]);
  });

  it('answers an empty list when the route returns no rows', async () => {
    global.fetch.mockResolvedValue(jsonResponse(200, []));
    await expect(getNewChatMessages(TOKEN, 42)).resolves.toEqual([]);

    global.fetch.mockResolvedValue(jsonResponse(200, null));
    await expect(getNewChatMessages(TOKEN, 42)).resolves.toEqual([]);
  });
});

describe('status mapping of the polling calls', () => {
  it('keeps the Italian statuses of client.js, with the English text in raw', async () => {
    for (const status of [400, 404, 500]) {
      global.fetch.mockResolvedValue(
        jsonResponse(status, { error: 'An unexpected error occurred: bad cursor' }),
      );

      await expect(getMostRecentMessageId(TOKEN)).rejects.toMatchObject({
        status,
        message: messageForStatus(status),
        raw: 'An unexpected error occurred: bad cursor',
      });
      await expect(getNewChatMessages(TOKEN, 42)).rejects.toMatchObject({
        status,
        message: messageForStatus(status),
        raw: 'An unexpected error occurred: bad cursor',
      });
    }
  });
});

describe('401', () => {
  it('keeps the session sentence of client.js: no chat copy duplicates it', async () => {
    global.fetch.mockResolvedValue(jsonResponse(401, { error: 'Invalid JWT Token' }));

    await expect(getAgreementChat(TOKEN, 7)).rejects.toMatchObject({
      status: 401,
      message: SESSION_EXPIRED_MESSAGE,
    });
    await expect(sendChatMessage(TOKEN, 3, 'Ciao')).rejects.toMatchObject({
      status: 401,
      message: SESSION_EXPIRED_MESSAGE,
    });
  });
});
