import { act, create } from 'react-test-renderer';
import {
  getAgreementChat,
  getMostRecentMessageId,
  getNewChatMessages,
} from '@/api/areas/chat';
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

/** Renders the hook and keeps its latest return value where the test reads it. */
function monta(lettura) {
  function Probe({ token, agreementId }) {
    Object.assign(lettura, useChat({ token, agreementId }));
    return null;
  }
  let renderer;
  act(() => {
    renderer = create(<Probe token={TOKEN} agreementId={AGREEMENT_ID} />);
  });
  return renderer;
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
    const lettura = {};
    monta(lettura);
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
    const lettura = {};
    monta(lettura);
    await act(async () => {
      await Promise.resolve();
    });
    getNewChatMessages.mockResolvedValue([messaggio(12)]);

    await unGiro();

    expect(getAgreementChat).toHaveBeenCalledTimes(2);
  });

  it('ignores a new message that belongs to another chat', async () => {
    const lettura = {};
    monta(lettura);
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
    const lettura = {};
    monta(lettura);
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
    const lettura = {};
    const renderer = monta(lettura);
    await act(async () => {
      await Promise.resolve();
    });
    expect(getNewChatMessages).toHaveBeenCalledTimes(0);

    act(() => {
      renderer.unmount();
    });
    jest.advanceTimersByTime(CHAT_POLL_MS * 4);

    expect(getNewChatMessages).toHaveBeenCalledTimes(0);
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
    const lettura = {};
    monta(lettura);
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
    const lettura = {};
    monta(lettura);
    await act(async () => {
      await Promise.resolve();
    });

    await unFrame(frameChatMessage(ALTRA_CHAT));

    expect(getNewChatMessages).not.toHaveBeenCalled();
    expect(getAgreementChat).toHaveBeenCalledTimes(1);
  });

  it('ignores a frame of another type', async () => {
    const lettura = {};
    monta(lettura);
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
    const lettura = {};
    monta(lettura);
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
