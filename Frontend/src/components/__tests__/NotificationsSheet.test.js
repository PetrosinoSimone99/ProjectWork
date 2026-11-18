import { act, create } from 'react-test-renderer';

import { useNotifications } from '@/hooks/useNotifications';
import { AppButton } from '../AppButton';
import { NotificationRow } from '../NotificationRow';
import { NotificationsSheet } from '../NotificationsSheet';

/**
 * The panel has one door in and one door out, and four states that never
 * replace each other: a failed read leaves the rows already on screen where
 * they are, with the error banner above them.
 *
 * The hook is mocked on purpose (`NotificationsSheet` is the wiring under test,
 * not the fetching) and so are the auth token and the router: the panel reads
 * them, it does not own them.
 */
jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: jest.fn(),
}));

jest.mock('@/auth/auth-context', () => ({
  useAuth: () => ({ token: 'jwt' }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const NOTIFICA = {
  id: 11,
  tipo: 'AGREEMENT_PROPOSAL',
  messaggio: 'Mario ha proposto uno scambio.',
  creataIl: '2026-11-15T10:00:00+00:00',
  letta: false,
  dati: { agreementId: 3 },
};

const ERRORE = 'Non riesco a leggere le notifiche: controlla la rete e riprova.';

/** The hook's return value with only the keys the case cares about moved. */
function statoDelPannello(extra = {}) {
  return {
    elementi: null,
    caricamento: false,
    errore: null,
    azioneInCorso: null,
    ricarica: jest.fn(),
    elimina: jest.fn(),
    segnaVisibiliLette: jest.fn(),
    ...extra,
  };
}

function render(extra = {}, props = {}) {
  const stato = statoDelPannello(extra);
  useNotifications.mockReturnValue(stato);
  let renderer;
  act(() => {
    renderer = create(<NotificationsSheet visible onClose={() => {}} {...props} />);
  });
  return { renderer, stato };
}

/** Unmount inside `act`: the real shell schedules an accessibility focus. */
function smonta(renderer) {
  act(() => {
    renderer.unmount();
  });
}

/** The control with this accessible name, pressed the way a tap would. */
function premi(renderer, accessibilityLabel) {
  const controllo = renderer.root
    .findAll(
      (node) =>
        node.props?.accessibilityLabel === accessibilityLabel &&
        typeof node.props.onPress === 'function',
    )
    .at(0);
  expect(controllo).toBeDefined();
  act(() => {
    controllo.props.onPress();
  });
}

/** The one button carrying that label, as the reader meets it. */
function pulsante(renderer, etichetta) {
  return renderer.root.findAllByType(AppButton).find((nodo) => nodo.props.label === etichetta);
}

/** Every string the panel renders, so a sentence can be asserted as a whole. */
function testi(renderer) {
  return renderer.root
    .findAll((node) => typeof node.props?.children === 'string')
    .map((node) => node.props.children);
}

describe('NotificationsSheet — the four states', () => {
  it('says it is loading while the first answer has not arrived', () => {
    const { renderer } = render({ elementi: null });

    expect(testi(renderer)).toContain('Carico le notifiche…');
    smonta(renderer);
  });

  it('shows the error with «Riprova», and the retry reloads once', () => {
    const ricarica = jest.fn();
    const { renderer } = render({ elementi: null, errore: ERRORE, ricarica });

    expect(testi(renderer)).toContain(ERRORE);
    const riprova = pulsante(renderer, 'Riprova');
    expect(riprova).toBeDefined();

    act(() => {
      riprova.props.onPress();
    });
    expect(ricarica).toHaveBeenCalledTimes(1);
    smonta(renderer);
  });

  it('says the inbox is empty when the list has been read and holds no row', () => {
    const { renderer } = render({ elementi: [] });

    expect(testi(renderer).join(' ')).toMatch(/non c.è niente da leggere/i);
    expect(renderer.root.findAllByType(NotificationRow)).toHaveLength(0);
    smonta(renderer);
  });

  it('draws one row per notification and hands it delete with its own id', () => {
    const elimina = jest.fn();
    const { renderer } = render({ elementi: [NOTIFICA], elimina });

    const righe = renderer.root.findAllByType(NotificationRow);
    expect(righe).toHaveLength(1);
    expect(righe[0].props.notifica).toBe(NOTIFICA);
    expect(typeof righe[0].props.onElimina).toBe('function');

    act(() => {
      righe[0].props.onElimina();
    });
    expect(elimina).toHaveBeenCalledWith(NOTIFICA.id);
    smonta(renderer);
  });
});

describe('NotificationsSheet — the door out and the auto-read', () => {
  it('closes from the one control named «Chiudi le notifiche»', () => {
    const onClose = jest.fn();
    const { renderer } = render({ elementi: [NOTIFICA] }, { onClose });

    premi(renderer, 'Chiudi le notifiche');

    expect(onClose).toHaveBeenCalledTimes(1);
    smonta(renderer);
  });

  it('marks the visible rows read when the panel opens, and only then', () => {
    const { renderer, stato } = render({ elementi: [NOTIFICA] });
    expect(stato.segnaVisibiliLette).toHaveBeenCalledTimes(1);
    smonta(renderer);

    const chiuso = render({ elementi: [NOTIFICA] }, { visible: false });
    expect(chiuso.stato.segnaVisibiliLette).not.toHaveBeenCalled();
    smonta(chiuso.renderer);
  });
});

describe('NotificationsSheet — the banner does not replace the list', () => {
  it('keeps the rows on screen under an error banner', () => {
    const { renderer } = render({ elementi: [NOTIFICA], errore: ERRORE });

    expect(renderer.root.findAllByType(NotificationRow)).toHaveLength(1);
    expect(testi(renderer)).toContain(ERRORE);
    expect(pulsante(renderer, 'Riprova')).toBeDefined();
    smonta(renderer);
  });
});
