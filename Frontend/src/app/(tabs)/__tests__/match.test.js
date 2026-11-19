import { act, create } from 'react-test-renderer';

import MatchScreen from '../match';
import { cancelQueue, createQueue, listQueues, getProfile } from '@/api';

// The screen subscribes through `useStreamEvent`, which is a no-op outside a
// provider: the test holds the handler the screen registered and fires frames
// at it by hand, so the real provider (and its socket) never enters this file.
let streamHandler = null;

jest.mock('@/hooks/useEventStream', () => ({
  useStreamEvent: (handler) => {
    streamHandler = handler;
  },
}));

jest.mock('expo-router', () => ({
  // `useFocusEffect` needs a navigator; in this test the screen is always the
  // focused one, so it is an effect that re-runs when its callback changes.
  useFocusEffect: (callback) => require('react').useEffect(callback, [callback]),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/auth/auth-context', () => ({
  useAuth: () => ({ token: 'jwt' }),
}));

// The barrel is mocked whole: every symbol `match.jsx` imports from it is
// declared here, or the screen would receive `undefined` instead of a mock.
jest.mock('@/api', () => ({
  getProfile: jest.fn(),
  listQueues: jest.fn(),
  createQueue: jest.fn(),
  cancelQueue: jest.fn(),
}));

// `Screen` reads the safe-area insets; the test mounts no `SafeAreaProvider`, so
// the mock answers the zeros the frame would give on a device with no cutout.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 320, height: 640 }),
  initialWindowMetrics: {
    frame: { x: 0, y: 0, width: 320, height: 640 },
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: require('react-native').View,
  SafeAreaInsetsContext: require('react').createContext(null),
}));

const TOKEN = 'jwt';

/** The names the two create buttons announce to assistive technology. */
const BUTTON_OFFER = 'Crea una coda per la tua offerta';
const BUTTON_REQUEST = 'Crea una coda per la tua ricerca';

/** The button that confirms the request queue: the one inside the `ConfirmModal`. */
const BUTTON_CONFIRM_REQUEST = 'Crea la coda di ricerca';

/** One active row of `GET /get-queues`, as the card below the buttons reads it. */
const ACTIVE_QUEUE = {
  id: 42,
  tipo: 'OFFER',
  stato: 'OPEN',
  descrizione: 'Aiuto con i compiti di matematica.',
  categoria: 'Istruzione',
  localita: 'Roma',
  daRemoto: false,
  agreementId: null,
};

/** Lets the promises of one load or one action settle: every mock answers at once. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) {
      await Promise.resolve();
    }
  });
}

/**
 * Hands the screen one notification frame, in the internal shape the stream
 * delivers it, then lets the reload it may start settle.
 */
async function emit(notifica) {
  expect(streamHandler).not.toBeNull();
  await act(async () => {
    streamHandler(notifica);
  });
  await flush();
}

/**
 * Renders the screen the match tab mounts, once both loads have answered.
 *
 * No services are passed any more: the create actions no longer depend on how
 * many entries the account owns (one offer and one request, always), only on
 * the balance and on the active queue.
 */
async function renderMatch({ queues = [], profile = { crediti: 1 } } = {}) {
  getProfile.mockResolvedValue(profile);
  listQueues.mockResolvedValue(queues);
  let renderer;
  act(() => {
    renderer = create(<MatchScreen />);
  });
  await flush();
  return renderer;
}

/** Every pressable carrying this accessibility label. */
function pressables(renderer, accessibilityLabel) {
  return renderer.root.findAll(
    (candidate) =>
      candidate.props?.accessibilityLabel === accessibilityLabel &&
      candidate.props?.accessibilityState !== undefined &&
      typeof candidate.props.onPress === 'function',
  );
}

/**
 * The pressable carrying this accessibility label: the node that also announces
 * the state, so the `AppButton` wrapper above it (which has no
 * `accessibilityState`) is not the one the assertions read.
 */
function pressable(renderer, accessibilityLabel) {
  const node = pressables(renderer, accessibilityLabel).at(0);
  expect(node).toBeDefined();
  return node;
}

/** Whether the button announces itself as disabled, on native and on web. */
function isDisabled(renderer, accessibilityLabel) {
  const { accessibilityState, 'aria-disabled': ariaDisabled } = pressable(
    renderer,
    accessibilityLabel,
  ).props;
  return accessibilityState?.disabled ?? ariaDisabled;
}

/** Presses the control the way a tap would, then lets the action settle. */
async function press(renderer, accessibilityLabel) {
  const button = pressable(renderer, accessibilityLabel);
  await act(async () => {
    button.props.onPress();
  });
}

/** Every word the screen renders, in order, for the copy assertions. */
function visibleText(renderer) {
  const collect = (node) => {
    if (typeof node === 'string') {
      return node;
    }
    if (Array.isArray(node)) {
      return node.map(collect).join('');
    }
    if (!node || typeof node !== 'object') {
      return '';
    }
    return collect(node.children);
  };
  return collect(renderer.toJSON());
}

beforeEach(() => {
  jest.clearAllMocks();
  streamHandler = null;
  createQueue.mockResolvedValue(undefined);
  // `cancel` is not exercised here, but the screen imports it: a mock that
  // answers keeps an unexpected call from hanging the test.
  cancelQueue.mockResolvedValue(undefined);
});

describe('match — the stream', () => {
  it('re-reads queues and balance when a match lands, and nothing else', async () => {
    await renderMatch();
    expect(listQueues).toHaveBeenCalledTimes(1);
    expect(getProfile).toHaveBeenCalledTimes(1);

    // A row about an agreement the user answers is not this screen's business:
    // nothing on the match tab changes until the backend writes the match.
    await emit({ tipo: 'AGREEMENT_PROPOSAL', dati: { agreementId: 7 } });
    expect(listQueues).toHaveBeenCalledTimes(1);

    await emit({ tipo: 'MATCH_CREATED', dati: { agreementId: 7 } });
    expect(listQueues).toHaveBeenCalledTimes(2);
    expect(getProfile).toHaveBeenCalledTimes(2);
  });
});

describe('match — the two create actions', () => {
  it('offers both with no queue and one credit, without asking for a service first', async () => {
    const renderer = await renderMatch();

    expect(isDisabled(renderer, BUTTON_OFFER)).toBe(false);
    expect(isDisabled(renderer, BUTTON_REQUEST)).toBe(false);
  });

  it('says what a request queue costs, in words, next to the button', async () => {
    expect(visibleText(await renderMatch())).toContain('Una coda di ricerca costa un credito.');
  });

  it('creates the queue type the button names', async () => {
    const renderer = await renderMatch();

    await press(renderer, BUTTON_OFFER);
    expect(createQueue).toHaveBeenCalledWith(TOKEN, 'OFFER');

    // The request queue spends a credit, so it starts from the confirmation:
    // the button opens the panel and only the panel creates the queue.
    await press(renderer, BUTTON_REQUEST);
    await press(renderer, BUTTON_CONFIRM_REQUEST);
    expect(createQueue).toHaveBeenCalledWith(TOKEN, 'REQUEST');
  });

  it('asks before the request queue spends a credit, and spends nothing meanwhile', async () => {
    const renderer = await renderMatch();

    await press(renderer, BUTTON_REQUEST);

    expect(createQueue).not.toHaveBeenCalled();
  });

  it('creates the request queue once when the confirmation is accepted', async () => {
    const renderer = await renderMatch();

    await press(renderer, BUTTON_REQUEST);
    await press(renderer, BUTTON_CONFIRM_REQUEST);

    expect(createQueue).toHaveBeenCalledTimes(1);
    expect(createQueue).toHaveBeenCalledWith(TOKEN, 'REQUEST');
  });

  it('closes only the request action at a zero balance, and says why', async () => {
    const renderer = await renderMatch({ profile: { crediti: 0 } });

    expect(isDisabled(renderer, BUTTON_OFFER)).toBe(false);
    expect(isDisabled(renderer, BUTTON_REQUEST)).toBe(true);
    expect(visibleText(renderer)).toContain('Non hai crediti disponibili.');
  });

  it('closes both actions while a queue is still active', async () => {
    const renderer = await renderMatch({ queues: [ACTIVE_QUEUE] });

    expect(isDisabled(renderer, BUTTON_OFFER)).toBe(true);
    expect(isDisabled(renderer, BUTTON_REQUEST)).toBe(true);
    expect(visibleText(renderer)).toContain(
      'Hai già una coda attiva: annullala per poterne crearne un’altra.',
    );
  });

  it('does not start a second action while one is in flight', async () => {
    // The create call never answers: the first queue stays in flight for the
    // whole test, which is the only way to observe the guard.
    createQueue.mockReturnValue(new Promise(() => {}));
    const renderer = await renderMatch();

    await press(renderer, BUTTON_OFFER);
    expect(createQueue).toHaveBeenCalledTimes(1);

    await press(renderer, BUTTON_REQUEST);

    expect(createQueue).toHaveBeenCalledTimes(1);
  });

  it('draws no create action while the balance is unknown', async () => {
    // A failed `GET /profile` leaves the credit undecided: the screen says why
    // with its banner instead of guessing what the request action may do.
    const renderer = await renderMatch({ profile: null });

    expect(pressables(renderer, BUTTON_OFFER)).toHaveLength(0);
    expect(pressables(renderer, BUTTON_REQUEST)).toHaveLength(0);
  });
});
