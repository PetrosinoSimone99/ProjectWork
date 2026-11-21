import { act, renderHook } from '@testing-library/react-native';
import {
  getAgreementChat,
  getMostRecentMessageId,
  getNewChatMessages,
  sendChatMessage,
} from '@/api/areas/chat';
import { ApiError } from '@/api/client';
import { CHAT_POLL_MS, useChat } from '../useChat';

jest.mock('expo-router', () => ({
  // `useFocusEffect` needs a navigator; in this test the screen is always the
  // focused one, so it is an effect that re-runs when its callback changes.
  useFocusEffect: (callback) => require('react').useEffect(callback, [callback]),
}));

jest.mock('@/api/areas/chat', () => ({
  getAgreementChat: jest.fn(),
  getMostRecentMessageId: jest.fn(),
  getNewChatMessages: jest.fn(),
  sendChatMessage: jest.fn(),
  MESSAGE_MAX_LENGTH: 1000,
  MESSAGE_TOO_LONG: 'Il messaggio è troppo lungo (massimo 1000 caratteri).',
}));

// The provider lives in the root layout and is not mounted here: the mock hands
// the handler to the test, which fires frames the way the stream would.
let mockStreamHandler = null;

jest.mock('@/hooks/useEventStream', () => ({
  useStreamEvent: (handler) => {
    mockStreamHandler = handler;
  },
  useStreamState: () => ({ connected: true, unreadCount: 0, lastId: 1 }),
}));

const TOKEN = 'jwt';
const AGREEMENT_ID = 42;
const CHAT_ID = 7;
const ALTRA_CHAT = 99;

const messaggio = (id, chatId = CHAT_ID) => ({
  id,
  chatId,
  autore: 'giulia',
  testo: `m${id}`,
  inviatoIl: '2026-11-16T10:00:00+00:00',
});

/**
 * Mounts the hook with the token and the agreement of the test; `result.current`
 * is its latest return value.
 */
function montaChat() {
  return renderHook(() => useChat({ token: TOKEN, agreementId: AGREEMENT_ID }));
}

/** Lets every promise of one poll settle: the mocked calls resolve immediately. */
async function unGiro() {
  await act(async () => {
    jest.advanceTimersByTime(CHAT_POLL_MS);
    for (let i = 0; i < 6; i += 1) {
      await Promise.resolve();
    }
  });
}

/** Lets the first read and every promise it starts settle. */
async function unCarica() {
  await act(async () => {
    for (let i = 0; i < 8; i += 1) {
      await Promise.resolve();
    }
  });
}

/** Lets one frame and every promise it starts settle. */
async function unFrame(notifica) {
  await act(async () => {
    mockStreamHandler(notifica);
    for (let i = 0; i < 8; i += 1) {
      await Promise.resolve();
    }
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockStreamHandler = null;
  getAgreementChat.mockResolvedValue({ chatId: CHAT_ID, messaggi: [messaggio(7), messaggio(9)] });
  getMostRecentMessageId.mockResolvedValue(9);
  getNewChatMessages.mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useChat — the polling cursor', () => {
  it('asks beyond the newest message it already shows', async () => {
    await montaChat();
    await act(async () => {
      await Promise.resolve();
    });

    await unGiro();

    // The whole point: the cursor is the displayed id, not a freshly fetched
    // "most recent", which would make the answer empty by construction.
    expect(getNewChatMessages).toHaveBeenCalledWith(TOKEN, 9);
    expect(getMostRecentMessageId).not.toHaveBeenCalled();
    expect(getAgreementChat).toHaveBeenCalledTimes(1);
  });

  it('re-reads the history when the counterpart wrote in this chat', async () => {
    await montaChat();
    await act(async () => {
      await Promise.resolve();
    });
    getNewChatMessages.mockResolvedValue([messaggio(12)]);

    await unGiro();

    expect(getAgreementChat).toHaveBeenCalledTimes(2);
  });

  it('ignores a new message that belongs to another chat', async () => {
    await montaChat();
    await act(async () => {
      await Promise.resolve();
    });
    getNewChatMessages.mockResolvedValue([messaggio(12, ALTRA_CHAT)]);

    await unGiro();

    expect(getAgreementChat).toHaveBeenCalledTimes(1);
  });

  it('seeds an empty chat once, then polls from that id', async () => {
    getAgreementChat.mockResolvedValue({ chatId: CHAT_ID, messaggi: [] });
    getMostRecentMessageId.mockResolvedValue(30);
    await montaChat();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await unGiro();
    await unGiro();

    expect(getMostRecentMessageId).toHaveBeenCalledTimes(1);
    expect(getNewChatMessages).toHaveBeenNthCalledWith(1, TOKEN, 30);
    expect(getNewChatMessages).toHaveBeenNthCalledWith(2, TOKEN, 30);
  });

  it('stops the timer when the screen is left', async () => {
    const { unmount } = await montaChat();
    await act(async () => {
      await Promise.resolve();
    });
    expect(getNewChatMessages).toHaveBeenCalledTimes(0);

    await unmount();
    jest.advanceTimersByTime(CHAT_POLL_MS * 4);

    expect(getNewChatMessages).toHaveBeenCalledTimes(0);
  });
});

describe('useChat — an agreement that no longer exists', () => {
  it('maps a 404 to `nonTrovata`, leaves `errore` null and does not retry', async () => {
    getAgreementChat.mockRejectedValue(
      new ApiError(404, 'Non trovo più questo accordo: potrebbe essere stato cancellato.'),
    );
    const { result } = await montaChat();
    await unCarica();

    // Terminale: nessuna frase d'errore da riprovare, uno stato da cui uscire.
    expect(result.current.nonTrovata).toBe(true);
    expect(result.current.errore).toBeNull();
    expect(result.current.caricamento).toBe(false);

    // Nessun ritentativo da solo: senza `chatId` il poll non parte, e la
    // lettura resta una sola.
    await unGiro();

    expect(getAgreementChat).toHaveBeenCalledTimes(1);
    expect(getNewChatMessages).not.toHaveBeenCalled();
    expect(result.current.errore).toBeNull();
  });

  it('turns `nonTrovata` back off when a read succeeds', async () => {
    getAgreementChat.mockRejectedValueOnce(new ApiError(404, 'Non trovo più questo accordo.'));
    const { result } = await montaChat();
    await unCarica();
    expect(result.current.nonTrovata).toBe(true);

    await act(async () => {
      await result.current.ricarica();
    });

    expect(result.current.nonTrovata).toBe(false);
    expect(result.current.errore).toBeNull();
    expect(result.current.chatId).toBe(CHAT_ID);
  });

  it('keeps `errore` and the retry path when the read fails with a 500', async () => {
    const guasto = new ApiError(500, 'Il server non ha restituito la chat: riprova.');
    getAgreementChat.mockRejectedValueOnce(guasto);
    const { result } = await montaChat();
    await unCarica();

    expect(result.current.nonTrovata).toBe(false);
    expect(result.current.errore).toBe(guasto.message);

    // Il `Riprova` dello schermo passa da `ricarica`: la strada resta aperta.
    await act(async () => {
      await result.current.ricarica();
    });

    expect(getAgreementChat).toHaveBeenCalledTimes(2);
    expect(result.current.errore).toBeNull();
    expect(result.current.nonTrovata).toBe(false);
    expect(result.current.chatId).toBe(CHAT_ID);
  });

  it('leaves a network failure on `errore`, not on `nonTrovata`', async () => {
    getAgreementChat.mockRejectedValueOnce(new ApiError(0, 'Non riesco a raggiungere il servizio.'));
    const { result } = await montaChat();
    await unCarica();

    expect(result.current.nonTrovata).toBe(false);
    expect(result.current.errore).toBe('Non riesco a raggiungere il servizio.');
  });
});

describe('useChat — the send guard', () => {
  it('posts once for two calls in the same frame', async () => {
    let concludi;
    sendChatMessage.mockReturnValue(
      new Promise((resolve) => {
        concludi = resolve;
      }),
    );
    const { result } = await montaChat();
    await unCarica();

    let primo;
    let secondo;
    await act(async () => {
      primo = result.current.invia('ci vediamo domani');
      secondo = result.current.invia('ci vediamo domani');
    });

    // Il ref, non lo stato: nel frame nessuno dei due ha ancora ri-renderizzato.
    expect(sendChatMessage).toHaveBeenCalledTimes(1);
    expect(sendChatMessage).toHaveBeenCalledWith(TOKEN, CHAT_ID, 'ci vediamo domani');

    await act(async () => {
      concludi(true);
      for (let i = 0; i < 8; i += 1) {
        await Promise.resolve();
      }
    });

    await expect(primo).resolves.toBe(true);
    await expect(secondo).resolves.toBe(false);
    expect(result.current.inviando).toBe(false);
  });

  it('sends again once the first send has resolved', async () => {
    sendChatMessage.mockResolvedValue(true);
    const { result } = await montaChat();
    await unCarica();

    let primo;
    await act(async () => {
      primo = await result.current.invia('uno');
    });
    expect(primo).toBe(true);

    let secondo;
    await act(async () => {
      secondo = await result.current.invia('due');
    });

    // Il ref si è riabbassato nel `finally`: il messaggio dopo non è bloccato.
    expect(secondo).toBe(true);
    expect(sendChatMessage).toHaveBeenCalledTimes(2);
    expect(sendChatMessage).toHaveBeenNthCalledWith(2, TOKEN, CHAT_ID, 'due');
  });
});

/** One `CHAT_MESSAGE` row, as the provider hands it over (`normalizeNotification`). */
function frameChatMessage(chatId, id = 40) {
  return { id, tipo: 'CHAT_MESSAGE', messaggio: 'nuovo', dati: { chatId } };
}

describe('useChat — the stream', () => {
  it('keeps the fallback at one minute', () => {
    expect(CHAT_POLL_MS).toBe(60000);
  });

  it('asks for the new messages as soon as a frame of this chat arrives', async () => {
    await montaChat();
    await act(async () => {
      await Promise.resolve();
    });
    expect(getAgreementChat).toHaveBeenCalledTimes(1);
    getNewChatMessages.mockResolvedValue([messaggio(12)]);

    await unFrame(frameChatMessage(CHAT_ID));

    // The same probe the timer runs, with the same cursor: the frame does not
    // invent a second path to the history.
    expect(getNewChatMessages).toHaveBeenCalledWith(TOKEN, 9);
    expect(getAgreementChat).toHaveBeenCalledTimes(2);
  });

  it('ignores a frame of another chat', async () => {
    await montaChat();
    await act(async () => {
      await Promise.resolve();
    });

    await unFrame(frameChatMessage(ALTRA_CHAT));

    expect(getNewChatMessages).not.toHaveBeenCalled();
    expect(getAgreementChat).toHaveBeenCalledTimes(1);
  });

  it('ignores a frame of another type', async () => {
    await montaChat();
    await act(async () => {
      await Promise.resolve();
    });

    await unFrame({ id: 41, tipo: 'AGREEMENT_PROPOSAL', dati: { chatId: CHAT_ID } });

    expect(getNewChatMessages).not.toHaveBeenCalled();
    expect(getAgreementChat).toHaveBeenCalledTimes(1);
  });

  it('does nothing with a frame that arrives before the chat id exists', async () => {
    let risolvi;
    getAgreementChat.mockReturnValue(
      new Promise((resolve) => {
        risolvi = resolve;
      }),
    );
    await montaChat();
    await act(async () => {
      await Promise.resolve();
    });

    await unFrame(frameChatMessage(CHAT_ID));

    expect(getNewChatMessages).not.toHaveBeenCalled();

    await act(async () => {
      risolvi({ chatId: CHAT_ID, messaggi: [messaggio(7), messaggio(9)] });
      for (let i = 0; i < 6; i += 1) {
        await Promise.resolve();
      }
    });

    await unFrame(frameChatMessage(CHAT_ID));

    expect(getNewChatMessages).toHaveBeenCalledWith(TOKEN, 9);
  });
});
