import { act, create } from 'react-test-renderer';
import { __push as push } from 'expo-router';

import { useNotifications } from '@/hooks/useNotifications';
import { AppButton } from '../AppButton';
import { NotificationRow } from '../NotificationRow';
import { NotificationsSheet } from '../NotificationsSheet';

/**
 * The panel has one door in and one door out, and four states that never
 * replace each other: a failed read leaves the rows already on screen where
 * they are, with the error banner above them.
 *
 * Reading is the act of closing: while the panel is open nothing is marked, and
 * every exit (the X, the backdrop, Escape, opening an exchange) marks the rows
 * through the same function and then tells the parent to re-read the count.
 *
 * The hook is mocked on purpose (`NotificationsSheet` is the wiring under test,
 * not the fetching) and so are the auth token and the router: the panel reads
 * them, it does not own them. The router's `push` is exported by the mock so a
 * test can assert where the row sends the reader.
 */
jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: jest.fn(),
}));

jest.mock('@/auth/auth-context', () => ({
  useAuth: () => ({ token: 'jwt' }),
}));

jest.mock('expo-router', () => {
  const spingi = jest.fn();
  return {
    __push: spingi,
    useRouter: () => ({ push: spingi }),
  };
});

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
    // The real hook always returns a promise and `chiudi` hangs `.finally` off
    // it, so the default fake resolves instead of returning `undefined`.
    segnaLetteMostrate: jest.fn().mockResolvedValue(undefined),
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

/**
 * The row's open target, pressed the way a tap would. Its accessible name folds
 * the row's own words in, so the label is matched by its prefix.
 */
function premiApriScambio(renderer) {
  const controllo = renderer.root
    .findAll(
      (node) =>
        typeof node.props?.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Apri lo scambio') &&
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

describe('NotificationsSheet — the door out and the read on close', () => {
  it('closes from the one control named «Chiudi le notifiche»', () => {
    const onClose = jest.fn();
    const { renderer } = render({ elementi: [NOTIFICA] }, { onClose });

    premi(renderer, 'Chiudi le notifiche');

    expect(onClose).toHaveBeenCalledTimes(1);
    smonta(renderer);
  });

  it('marks nothing while the panel is open', () => {
    const { renderer, stato } = render({ elementi: [NOTIFICA] });

    expect(stato.segnaLetteMostrate).not.toHaveBeenCalled();
    expect(renderer.root.findAllByType(NotificationRow)[0].props.notifica.letta).toBe(false);
    expect(testi(renderer)).toContain('Non letta');
    smonta(renderer);
  });

  it('marks the rows on close, then asks the parent to re-read the count once', async () => {
    const ordine = [];
    const onClose = jest.fn(() => ordine.push('chiudi'));
    const segnaLetteMostrate = jest.fn(() => {
      ordine.push('segna');
      return Promise.resolve();
    });
    const onLette = jest.fn(() => ordine.push('lette'));
    const { renderer } = render(
      { elementi: [NOTIFICA], segnaLetteMostrate },
      { onClose, onLette },
    );

    premi(renderer, 'Chiudi le notifiche');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(segnaLetteMostrate).toHaveBeenCalledTimes(1);
    // The panel closes at once, so the count is re-read only once the marks
    // have settled — not before the writes have landed.
    expect(onLette).not.toHaveBeenCalled();

    await act(async () => {});

    expect(onLette).toHaveBeenCalledTimes(1);
    expect(ordine).toEqual(['chiudi', 'segna', 'lette']);
    smonta(renderer);
  });

  it('closes and marks before opening the exchange', () => {
    const ordine = [];
    const onClose = jest.fn(() => ordine.push('chiudi'));
    const segnaLetteMostrate = jest.fn(() => {
      ordine.push('segna');
      return Promise.resolve();
    });
    push.mockReset();
    push.mockImplementation(() => ordine.push('apri'));
    const { renderer } = render({ elementi: [NOTIFICA], segnaLetteMostrate }, { onClose });

    premiApriScambio(renderer);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(segnaLetteMostrate).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/agreements');
    // A screen opened under a modal would stay covered: the exchange comes last.
    expect(ordine).toEqual(['chiudi', 'segna', 'apri']);
    smonta(renderer);
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

/**
 * Le parole del pannello: quelle che questo client scrive sono italiane, e la
 * scheda ha un nome solo.
 */
const PAROLE_INGLESI = /\b(the|your|has|been|and|are|was|were|will|you|with|from)\b/i;

describe('NotificationsSheet — la voce del pannello', () => {
  it('chiama «scheda di consegna» ciò che arriva, anche nello stato vuoto', () => {
    const { renderer } = render({ elementi: [] });

    const parole = testi(renderer).join(' ');
    expect(parole).toContain('schede di consegna');
    // Nessuna «scheda» lasciata senza il suo nome per esteso: una parola per
    // un oggetto, o il lettore crede che siano due.
    expect(parole).not.toMatch(/\bsched[ae]\b(?! di consegna)/);
    smonta(renderer);
  });

  it('scrive solo frasi italiane, con le righe e senza', () => {
    const conRighe = render({ elementi: [NOTIFICA] });
    expect(testi(conRighe.renderer).join(' ')).not.toMatch(PAROLE_INGLESI);
    smonta(conRighe.renderer);

    const vuoto = render({ elementi: [] });
    expect(testi(vuoto.renderer).join(' ')).not.toMatch(PAROLE_INGLESI);
    smonta(vuoto.renderer);
  });
});
