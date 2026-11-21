import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

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

/** The type the renderer gives a text node: the credit mark is walked over these. */
const TEXT = 'Text';

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
  // From RTL 14 `render` is async: the mount is awaited, not wrapped in `act`.
  await render(<MatchScreen />);
  await flush();
}

/** Every text node the screen draws, in the order it draws them. */
function textNodes() {
  // RTL 14 draws host elements only: `container.queryAll` is what reaches them.
  return screen.container.queryAll((nodo) => nodo.type === TEXT);
}

/**
 * Every button announcing this accessibility label: the drawn nodes with the
 * role and the name, so the components above each of them count once.
 */
function pressables(accessibilityLabel) {
  return screen.queryAllByRole('button', { name: accessibilityLabel });
}

/**
 * The control carrying this accessibility label: the node that is a `button`
 * and announces the name, so the wrapper components above the drawn node are
 * not the ones the assertions read.
 */
function pressable(accessibilityLabel) {
  const node = pressables(accessibilityLabel).at(0);
  expect(node).toBeDefined();
  return node;
}

/** Whether the button announces itself as disabled, on native and on web. */
function isDisabled(accessibilityLabel) {
  const { accessibilityState, 'aria-disabled': ariaDisabled } = pressable(
    accessibilityLabel,
  ).props;
  return accessibilityState?.disabled ?? ariaDisabled;
}

/** Presses the control the way a tap would, then lets the action settle. */
async function press(accessibilityLabel) {
  await fireEvent.press(pressable(accessibilityLabel));
  await flush();
}

/**
 * The handler the control runs on press, taken from the component that
 * received it.
 *
 * `fireEvent.press` dispatches the way the platform does: on a disabled control
 * the tap is refused and never reaches `onPress`. The case below proves the
 * screen's own guard — one action at a time — so the handler has to run anyway.
 * RTL 14 draws host elements only and the `UNSAFE_*ByType` queries that reached
 * the component no longer exist: `unstable_fiber` is the internal API
 * (unstable, and for that reason confined here) RTL itself uses to find it.
 */
function pressHandler(node) {
  for (let fiber = node.unstable_fiber; fiber !== null; fiber = fiber.return) {
    if (typeof fiber.memoizedProps?.onPress === 'function') {
      return fiber.memoizedProps.onPress;
    }
  }
  return null;
}

/**
 * The credit mark as the screen draws it: the row that carries the label and the
 * value, plus the colour each of them is painted with.
 *
 * The row is found by its label and then walked up to the first ancestor holding
 * more than one text — the icon's glyph, the label and the value. The value is
 * the last of them, the label is the one that says so: one number alone is not a
 * mark, so the assertions need both.
 */
function marchioCrediti() {
  const etichetta = textNodes().find(
    (node) => node.props.children === 'Crediti disponibili',
  );
  expect(etichetta).toBeDefined();

  let riga = etichetta.parent;
  while (riga !== null && riga.queryAll((nodo) => nodo.type === TEXT).length < 2) {
    riga = riga.parent;
  }
  expect(riga).not.toBeNull();

  const testi = riga.queryAll((nodo) => nodo.type === TEXT);
  const testoValore = testi[testi.length - 1];
  return {
    etichetta,
    valore: testoValore,
    coloreEtichetta: coloreDi(etichetta),
    coloreValore: coloreDi(testoValore),
  };
}

/** The colour a text node is finally painted with. */
function coloreDi(node) {
  return StyleSheet.flatten(node.props.style ?? {}).color;
}

/** The screen's own sentence for a balance at zero, as it is rendered. */
function fraseDelSaldoZero() {
  const frase = textNodes().find(
    (node) =>
      typeof node.props.children === 'string' &&
      node.props.children.startsWith('Senza crediti la ricerca resta spenta'),
  );
  expect(frase).toBeDefined();
  return frase;
}

/** Every word the screen renders, in order, for the copy assertions. */
function visibleText() {
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
  return collect(screen.toJSON());
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
    await renderMatch();

    expect(isDisabled(BUTTON_OFFER)).toBe(false);
    expect(isDisabled(BUTTON_REQUEST)).toBe(false);
  });

  it('says what a request queue costs, in words, next to the button', async () => {
    await renderMatch();

    expect(visibleText()).toContain('Una coda di ricerca costa un credito.');
  });

  it('creates the queue type the button names', async () => {
    await renderMatch();

    await press(BUTTON_OFFER);
    expect(createQueue).toHaveBeenCalledWith(TOKEN, 'OFFER');

    // The request queue spends a credit, so it starts from the confirmation:
    // the button opens the panel and only the panel creates the queue.
    await press(BUTTON_REQUEST);
    await press(BUTTON_CONFIRM_REQUEST);
    expect(createQueue).toHaveBeenCalledWith(TOKEN, 'REQUEST');
  });

  it('asks before the request queue spends a credit, and spends nothing meanwhile', async () => {
    await renderMatch();

    await press(BUTTON_REQUEST);

    expect(createQueue).not.toHaveBeenCalled();
  });

  it('creates the request queue once when the confirmation is accepted', async () => {
    await renderMatch();

    await press(BUTTON_REQUEST);
    await press(BUTTON_CONFIRM_REQUEST);

    expect(createQueue).toHaveBeenCalledTimes(1);
    expect(createQueue).toHaveBeenCalledWith(TOKEN, 'REQUEST');
  });

  it('closes only the request action at a zero balance, and says why', async () => {
    await renderMatch({ profile: { crediti: 0 } });

    expect(isDisabled(BUTTON_OFFER)).toBe(false);
    expect(isDisabled(BUTTON_REQUEST)).toBe(true);
    expect(visibleText()).toContain('Non hai crediti disponibili.');
  });

  it('closes both actions while a queue is still active', async () => {
    await renderMatch({ queues: [ACTIVE_QUEUE] });

    expect(isDisabled(BUTTON_OFFER)).toBe(true);
    expect(isDisabled(BUTTON_REQUEST)).toBe(true);
    expect(visibleText()).toContain(
      'Hai già una coda attiva: annullala per poterne crearne un’altra.',
    );
  });

  it('does not start a second action while one is in flight', async () => {
    // The create call never answers: the first queue stays in flight for the
    // whole test, which is the only way to observe the guard.
    createQueue.mockReturnValue(new Promise(() => {}));
    await renderMatch();

    await press(BUTTON_OFFER);
    expect(createQueue).toHaveBeenCalledTimes(1);

    // The second press runs the handler itself: the button is already spent, so
    // a tap would be refused before reaching the guard this case is about.
    const onPress = pressHandler(pressable(BUTTON_REQUEST));
    expect(onPress).not.toBeNull();
    await act(async () => {
      onPress();
    });

    expect(createQueue).toHaveBeenCalledTimes(1);
  });

  it('draws no create action while the balance is unknown', async () => {
    // A failed `GET /profile` leaves the credit undecided: the screen says why
    // with its banner instead of guessing what the request action may do.
    await renderMatch({ profile: null });

    expect(pressables(BUTTON_OFFER)).toHaveLength(0);
    expect(pressables(BUTTON_REQUEST)).toHaveLength(0);
  });

  it('draws no credit mark while the balance is unknown', async () => {
    await renderMatch({ profile: null });

    expect(
      textNodes().some((node) => node.props.children === 'Crediti disponibili'),
    ).toBe(false);
  });
});

describe('match — the credit mark', () => {
  it('shows the balance the request confirm names, and one number only', async () => {
    await renderMatch({ profile: { crediti: 1 } });
    const marchio = marchioCrediti();

    expect(marchio.etichetta.props.children).toBe('Crediti disponibili');
    expect(marchio.valore.props.children).toBe('1');

    // The confirm reads the same source (`balance`): two figures on one screen
    // would be two truths.
    await press(BUTTON_REQUEST);
    expect(visibleText()).toContain('Crediti disponibili: 1.');
  });

  it('paints a zero balance in danger and says how to get a credit back', async () => {
    await renderMatch({ profile: { crediti: 0 } });
    const marchio = marchioCrediti();

    expect(marchio.valore.props.children).toBe('0');
    const frase = fraseDelSaldoZero();
    // `t.danger` is the token `tone="danger"` resolves to: the value and the
    // sentence share it, and the label does not.
    expect(marchio.coloreValore).toBe(coloreDi(frase));
    expect(marchio.coloreValore).not.toBe(marchio.coloreEtichetta);
  });
});
