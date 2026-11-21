import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { __push as push } from 'expo-router';

import { useNotifications } from '@/hooks/useNotifications';
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

/** The panel mounted on the state the case hands it. */
async function monta(extra = {}, props = {}) {
  const stato = statoDelPannello(extra);
  useNotifications.mockReturnValue(stato);
  // Da RTL 14 `render` è asincrono: il montaggio si aspetta, non si avvolge in `act`.
  await render(<NotificationsSheet visible onClose={() => {}} {...props} />);
  return stato;
}

/** The control with this accessible name, pressed the way a tap would. */
async function premi(accessibilityLabel) {
  const controllo = screen.getByLabelText(accessibilityLabel);
  expect(controllo).toBeDefined();
  await fireEvent.press(controllo);
}

/**
 * The row's open target, pressed the way a tap would. Its accessible name folds
 * the row's own words in, so the label is matched by its prefix.
 */
const FILTRO_APRI = /^Apri lo scambio/;

async function premiApriScambio() {
  const controllo = screen.getByLabelText(FILTRO_APRI);
  expect(controllo).toBeDefined();
  await fireEvent.press(controllo);
}

/** The one button carrying that label, as the reader meets it. */
function pulsante(etichetta) {
  return screen.getByRole('button', { name: etichetta });
}

/**
 * Every string the panel renders, so a sentence can be asserted as a whole.
 *
 * Read from the host elements: RTL 14 draws only those, so `container.queryAll`
 * is the documented replacement for the components the text does not reach.
 */
function testi() {
  return screen.container
    .queryAll((node) => typeof node.props?.children === 'string')
    .map((node) => node.props.children);
}

/** One row is on screen for every notification, and each carries its own delete. */
function righeDisegnate() {
  return screen.queryAllByLabelText('Elimina questa notifica');
}

describe('NotificationsSheet — the four states', () => {
  it('says it is loading while the first answer has not arrived', async () => {
    await monta({ elementi: null });

    expect(testi()).toContain('Carico le notifiche…');
  });

  it('shows the error with «Riprova», and the retry reloads once', async () => {
    const ricarica = jest.fn();
    await monta({ elementi: null, errore: ERRORE, ricarica });

    expect(testi()).toContain(ERRORE);
    const riprova = pulsante('Riprova');
    expect(riprova).toBeDefined();

    await fireEvent.press(riprova);
    expect(ricarica).toHaveBeenCalledTimes(1);
  });

  it('says the inbox is empty when the list has been read and holds no row', async () => {
    await monta({ elementi: [] });

    expect(testi().join(' ')).toMatch(/non c.è niente da leggere/i);
    expect(righeDisegnate()).toHaveLength(0);
  });

  it('draws one row per notification and hands it delete with its own id', async () => {
    const elimina = jest.fn();
    await monta({ elementi: [NOTIFICA], elimina });

    // Una riga sola: il suo testo e i suoi due comandi compaiono una volta.
    expect(screen.getAllByText(NOTIFICA.messaggio)).toHaveLength(1);
    expect(righeDisegnate()).toHaveLength(1);
    expect(screen.getAllByLabelText(FILTRO_APRI)).toHaveLength(1);

    // RTL 14 non raggiunge i componenti, quindi il gestore della riga si prova
    // dove il lettore lo tocca: il comando apre la conferma, la conferma arriva
    // al pannello con l'id di quella notifica.
    await premi('Elimina questa notifica');
    await premi('Elimina');
    expect(elimina).toHaveBeenCalledWith(NOTIFICA.id);
  });
});

describe('NotificationsSheet — the door out and the read on close', () => {
  it('closes from the one control named «Chiudi le notifiche»', async () => {
    const onClose = jest.fn();
    await monta({ elementi: [NOTIFICA] }, { onClose });

    await premi('Chiudi le notifiche');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('marks nothing while the panel is open', async () => {
    const stato = await monta({ elementi: [NOTIFICA] });

    expect(stato.segnaLetteMostrate).not.toHaveBeenCalled();
    // La riga disegnata è la notifica non letta così com'è, e lo dice nel nome
    // del comando che la apre: lo stato viaggia con il dato che il pannello ha
    // passato alla riga.
    expect(screen.getByLabelText(FILTRO_APRI).props.accessibilityLabel).toContain('Non letta');
    expect(testi()).toContain('Non letta');
  });

  it('marks the rows on close, then asks the parent to re-read the count once', async () => {
    const ordine = [];
    const onClose = jest.fn(() => ordine.push('chiudi'));
    // Le scritture restano in volo finché il caso non le risolve: è l'unico modo
    // per vedere che il conteggio non si rilegge prima che siano atterrate.
    const scritture = [];
    const segnaLetteMostrate = jest.fn(() => {
      ordine.push('segna');
      return new Promise((risolvi) => scritture.push(risolvi));
    });
    const onLette = jest.fn(() => ordine.push('lette'));
    await monta({ elementi: [NOTIFICA], segnaLetteMostrate }, { onClose, onLette });

    await premi('Chiudi le notifiche');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(segnaLetteMostrate).toHaveBeenCalledTimes(1);
    // The panel closes at once, so the count is re-read only once the marks
    // have settled — not before the writes have landed.
    expect(onLette).not.toHaveBeenCalled();

    await act(async () => {
      scritture.forEach((risolvi) => risolvi());
    });

    expect(onLette).toHaveBeenCalledTimes(1);
    expect(ordine).toEqual(['chiudi', 'segna', 'lette']);
  });

  it('closes and marks before opening the exchange', async () => {
    const ordine = [];
    const onClose = jest.fn(() => ordine.push('chiudi'));
    const segnaLetteMostrate = jest.fn(() => {
      ordine.push('segna');
      return Promise.resolve();
    });
    push.mockReset();
    push.mockImplementation(() => ordine.push('apri'));
    await monta({ elementi: [NOTIFICA], segnaLetteMostrate }, { onClose });

    await premiApriScambio();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(segnaLetteMostrate).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/agreements');
    // A screen opened under a modal would stay covered: the exchange comes last.
    expect(ordine).toEqual(['chiudi', 'segna', 'apri']);
  });
});

describe('NotificationsSheet — the banner does not replace the list', () => {
  it('keeps the rows on screen under an error banner', async () => {
    await monta({ elementi: [NOTIFICA], errore: ERRORE });

    expect(righeDisegnate()).toHaveLength(1);
    expect(testi()).toContain(ERRORE);
    expect(pulsante('Riprova')).toBeDefined();
  });
});

/**
 * Le parole del pannello: quelle che questo client scrive sono italiane, e la
 * scheda ha un nome solo.
 */
const PAROLE_INGLESI = /\b(the|your|has|been|and|are|was|were|will|you|with|from)\b/i;

describe('NotificationsSheet — la voce del pannello', () => {
  it('chiama «scheda di consegna» ciò che arriva, anche nello stato vuoto', async () => {
    await monta({ elementi: [] });

    const parole = testi().join(' ');
    expect(parole).toContain('schede di consegna');
    // Nessuna «scheda» lasciata senza il suo nome per esteso: una parola per
    // un oggetto, o il lettore crede che siano due.
    expect(parole).not.toMatch(/\bsched[ae]\b(?! di consegna)/);
  });

  it('scrive solo frasi italiane, con le righe e senza', async () => {
    await monta({ elementi: [NOTIFICA] });
    expect(testi().join(' ')).not.toMatch(PAROLE_INGLESI);

    await monta({ elementi: [] });
    expect(testi().join(' ')).not.toMatch(PAROLE_INGLESI);
  });
});
