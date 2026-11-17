import { act, create } from 'react-test-renderer';
import { ApiError, NETWORK_ERROR_MESSAGE } from '@/api/client';
import { cancelAgreement, listAgreements, respondToAgreement } from '@/api';
import { useAgreements } from '../useAgreements';

jest.mock('expo-router', () => ({
  // `useFocusEffect` needs a navigator; in this test the screen is always the
  // focused one, so it is an effect that re-runs when its callback changes.
  useFocusEffect: (callback) => require('react').useEffect(callback, [callback]),
}));

jest.mock('@/api', () => ({
  listAgreements: jest.fn(),
  respondToAgreement: jest.fn(),
  cancelAgreement: jest.fn(),
}));

const TOKEN = 'jwt';
const MY_USERNAME = 'andrea';

/** One proposal row in the shape `normalizeAgreementProposal` produces. */
const proposta = (username, risposta) => ({
  username,
  ruolo: 'Provider',
  risposta,
  dataRisposta: null,
});

/** One agreement row in the shape `normalizeAgreement` produces. */
const accordo = (id, stato, proposte) => ({
  id,
  stato,
  creazione: null,
  proposte,
  scheda: null,
  schede: [],
});

/** `PENDING` with my answer still missing: it waits for me. */
const DA_RISPONDERE = accordo(11, 'PENDING', [proposta(MY_USERNAME, null)]);
/** `PENDING` already answered by me: it waits for the counterpart. */
const INVIATO = accordo(12, 'PENDING', [proposta(MY_USERNAME, true)]);
/** `ACCEPTED` with no sheet yet: an exchange in progress, not a closed one. */
const IN_CORSO = accordo(13, 'ACCEPTED', [proposta(MY_USERNAME, true)]);

/** A promise the test resolves when it decides a request answered. */
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Renders the hook and keeps its latest return value where the test reads it. */
function mount(reading) {
  function Probe() {
    Object.assign(reading, useAgreements({ token: TOKEN, myUsername: MY_USERNAME }));
    return null;
  }
  let renderer;
  act(() => {
    renderer = create(<Probe />);
  });
  return renderer;
}

/** Lets every promise already started settle: the mocked calls answer at once. */
async function settle() {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) {
      await Promise.resolve();
    }
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  listAgreements.mockResolvedValue([DA_RISPONDERE, INVIATO, IN_CORSO]);
  respondToAgreement.mockResolvedValue(undefined);
  cancelAgreement.mockResolvedValue(undefined);
});

describe('useAgreements — the list request', () => {
  it('drops a list response that a newer request has superseded', async () => {
    const first = deferred();
    const second = deferred();
    listAgreements.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const reading = {};
    mount(reading);
    await settle();

    act(() => {
      reading.riprova();
    });
    expect(listAgreements).toHaveBeenCalledTimes(2);

    await act(async () => {
      second.resolve([IN_CORSO]);
    });
    expect(reading.accordi).toEqual([IN_CORSO]);

    await act(async () => {
      first.resolve([DA_RISPONDERE]);
    });

    // The older answer arrived last and must not overwrite the newer one.
    expect(reading.accordi).toEqual([IN_CORSO]);
  });

  it('keeps the agreements on screen when a reload fails and says why', async () => {
    const reading = {};
    mount(reading);
    await settle();
    const mostrati = reading.accordi;
    listAgreements.mockRejectedValueOnce(new ApiError(0, NETWORK_ERROR_MESSAGE));

    await act(async () => {
      await reading.onRefresh();
    });

    expect(reading.accordi).toEqual(mostrati);
    expect(reading.errore).toBe(NETWORK_ERROR_MESSAGE);
    expect(reading.refreshing).toBe(false);
  });

  it('leaves classificati null until the first response arrives', async () => {
    const pending = deferred();
    listAgreements.mockReturnValueOnce(pending.promise);
    const reading = {};
    mount(reading);
    await settle();

    expect(reading.accordi).toBeNull();
    expect(reading.classificati).toBeNull();

    await act(async () => {
      pending.resolve([DA_RISPONDERE]);
    });

    expect(reading.classificati).not.toBeNull();
  });

  it('splits the list into the three sections once a response arrives', async () => {
    const reading = {};
    mount(reading);
    await settle();

    expect(reading.classificati.toAnswer.map((a) => a.id)).toEqual([11]);
    expect(reading.classificati.sent.map((a) => a.id)).toEqual([12]);
    expect(reading.classificati.inProgress.map((a) => a.id)).toEqual([13]);
    // Nothing was guessed into the closed history.
    expect(reading.classificati.concluded).toEqual([]);
  });

  it('riprova repeats the list request', async () => {
    const reading = {};
    mount(reading);
    await settle();
    expect(listAgreements).toHaveBeenCalledTimes(1);

    await act(async () => {
      reading.riprova();
    });

    expect(listAgreements).toHaveBeenCalledTimes(2);
    expect(listAgreements).toHaveBeenNthCalledWith(2, TOKEN);
  });
});

describe('useAgreements — the two actions', () => {
  it('names the agreement the action is flying on', async () => {
    const flight = deferred();
    respondToAgreement.mockReturnValueOnce(flight.promise);
    const reading = {};
    mount(reading);
    await settle();

    let inVolo;
    act(() => {
      inVolo = reading.rispondi(7, true);
    });

    expect(reading.azioneInCorso).toEqual({ id: 7, nome: 'accetta' });

    await act(async () => {
      flight.resolve(undefined);
      await inVolo;
    });

    expect(reading.azioneInCorso).toBeNull();
  });

  it('reloads the list after an action that worked and says what happened', async () => {
    const reading = {};
    mount(reading);
    await settle();
    expect(listAgreements).toHaveBeenCalledTimes(1);

    await act(async () => {
      await reading.rispondi(7, true);
    });
    expect(respondToAgreement).toHaveBeenCalledWith(TOKEN, 7, true);
    expect(reading.esito).toBe('Proposta accettata: lo scambio ora è in «In corso».');
    expect(listAgreements).toHaveBeenCalledTimes(2);

    await act(async () => {
      await reading.rispondi(8, false);
    });
    expect(respondToAgreement).toHaveBeenLastCalledWith(TOKEN, 8, false);
    expect(reading.esito).toBe('Proposta rifiutata.');
    expect(listAgreements).toHaveBeenCalledTimes(3);

    await act(async () => {
      await reading.annulla(9);
    });
    expect(cancelAgreement).toHaveBeenCalledWith(TOKEN, 9);
    expect(reading.esito).toBe('Scambio annullato.');
    expect(listAgreements).toHaveBeenCalledTimes(4);
    expect(reading.azioneInCorso).toBeNull();
  });

  it('keeps the list and lands the failure in actionError when an action fails', async () => {
    const reading = {};
    mount(reading);
    await settle();
    const mostrati = reading.accordi;
    respondToAgreement.mockRejectedValueOnce(new ApiError(409, 'Conflitto: aggiorna e riprova.'));

    await act(async () => {
      await reading.rispondi(7, true);
    });

    expect(reading.actionError).toBe('Conflitto: aggiorna e riprova.');
    expect(reading.accordi).toEqual(mostrati);
    expect(reading.esito).toBeNull();
    expect(reading.azioneInCorso).toBeNull();
    // A failed action does not pretend to have changed anything: no reload.
    expect(listAgreements).toHaveBeenCalledTimes(1);
  });

  it('refuses an action without a whole id', async () => {
    const reading = {};
    mount(reading);
    await settle();

    await act(async () => {
      await reading.rispondi(4.5, true);
    });

    expect(respondToAgreement).not.toHaveBeenCalled();
    expect(reading.actionError).toBe(
      'Operazione non disponibile: ricarica la schermata e riprova.',
    );
    expect(reading.azioneInCorso).toBeNull();
    expect(listAgreements).toHaveBeenCalledTimes(1);
  });
});
