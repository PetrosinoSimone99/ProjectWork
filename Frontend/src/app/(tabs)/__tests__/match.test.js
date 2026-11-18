import { act, create } from 'react-test-renderer';

import MatchScreen from '../match';
import { cancelQueue, createQueue, listMyServices, listQueues, getProfile } from '@/api';

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
  listMyServices: jest.fn(),
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

/** One row of `listMyServices`: only `tipo` takes part in the gate. */
const OFFER_SERVICE = { id: 11, tipo: 'OFFERTA' };
const REQUEST_SERVICE = { id: 12, tipo: 'RICERCA' };

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

/** Renders the screen the match tab mounts, once both loads have answered. */
async function renderMatch({ queues = [], services = [], profile = { crediti: 1, puoAccodareRicerca: true } } = {}) {
  getProfile.mockResolvedValue(profile);
  listQueues.mockResolvedValue(queues);
  listMyServices.mockResolvedValue(services);
  let renderer;
  act(() => {
    renderer = create(<MatchScreen />);
  });
  await flush();
  return renderer;
}

/**
 * The pressable carrying this accessibility label: the node that also announces
 * the state, so the `AppButton` wrapper above it (which has no
 * `accessibilityState`) is not the one the assertions read.
 */
function pressable(renderer, accessibilityLabel) {
  const node = renderer.root
    .findAll(
      (candidate) =>
        candidate.props?.accessibilityLabel === accessibilityLabel &&
        candidate.props?.accessibilityState !== undefined &&
        typeof candidate.props.onPress === 'function',
    )
    .at(0);
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
  createQueue.mockResolvedValue(undefined);
  // `cancel` is not exercised here, but the screen imports it: a mock that
  // answers keeps an unexpected call from hanging the test.
  cancelQueue.mockResolvedValue(undefined);
});

describe('match — the create-queue gate', () => {
  it('enables a create button only when the account has exactly one service of that type', async () => {
    // One offer and no request: only the offer queue has a single service for
    // `POST /create-service-queue` to find.
    const singleOffer = await renderMatch({ services: [OFFER_SERVICE] });

    expect(isDisabled(singleOffer, BUTTON_OFFER)).toBe(false);
    expect(isDisabled(singleOffer, BUTTON_REQUEST)).toBe(true);

    const oneServicePerType = await renderMatch({
      services: [OFFER_SERVICE, REQUEST_SERVICE],
    });

    expect(isDisabled(oneServicePerType, BUTTON_OFFER)).toBe(false);
    expect(isDisabled(oneServicePerType, BUTTON_REQUEST)).toBe(false);
  });

  it('says why the button is disabled when there is no service of that type', async () => {
    const renderer = await renderMatch({ services: [] });

    expect(isDisabled(renderer, BUTTON_OFFER)).toBe(true);
    expect(isDisabled(renderer, BUTTON_REQUEST)).toBe(true);

    const text = visibleText(renderer);
    expect(text).toContain(
      'Per una coda di offerta ti serve un servizio pubblicato in «Offro e cerco».',
    );
    expect(text).toContain(
      'Per una coda di ricerca ti serve un servizio pubblicato in «Offro e cerco».',
    );
  });

  it('says how many services of that type exist when there is more than one', async () => {
    const renderer = await renderMatch({
      services: [OFFER_SERVICE, { id: 13, tipo: 'OFFERTA' }],
    });

    expect(isDisabled(renderer, BUTTON_OFFER)).toBe(true);
    // The count is named: two rows of the same type are a `500` on the route
    // (`backend-gaps.md` G19), not a button that could be pressed.
    expect(visibleText(renderer)).toContain(
      'Hai 2 servizi di questo tipo: il server crea una coda di offerta solo se ne hai uno (limite noto).',
    );
  });

  it('closes both create buttons while a queue is still active', async () => {
    // One service of each type would enable both buttons on their own, so only
    // the active queue can be what closes them.
    const renderer = await renderMatch({
      queues: [ACTIVE_QUEUE],
      services: [OFFER_SERVICE, REQUEST_SERVICE],
    });

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
    const renderer = await renderMatch({
      services: [OFFER_SERVICE, REQUEST_SERVICE],
    });

    await press(renderer, BUTTON_OFFER);
    expect(createQueue).toHaveBeenCalledTimes(1);
    expect(createQueue).toHaveBeenCalledWith(TOKEN, 'OFFER');

    await press(renderer, BUTTON_REQUEST);

    expect(createQueue).toHaveBeenCalledTimes(1);
  });
});


describe('request eligibility', () => {
  it('requires a completed offered service even when a credit exists', async () => {
    const renderer = await renderMatch({ services: [OFFER_SERVICE, REQUEST_SERVICE], profile: { crediti: 1, puoAccodareRicerca: false } });
    expect(isDisabled(renderer, BUTTON_OFFER)).toBe(false);
    expect(isDisabled(renderer, BUTTON_REQUEST)).toBe(true);
    expect(visibleText(renderer)).toContain('Completa prima una prestazione tramite coda di offerta.');
  });
  it('does not enqueue suspended offers', async () => {
    const renderer = await renderMatch({ services: [{ ...OFFER_SERVICE, stato: 'SOSPESA' }] });
    expect(isDisabled(renderer, BUTTON_OFFER)).toBe(true);
  });
});
