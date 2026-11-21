import { act, renderHook } from '@testing-library/react-native';
import { ApiError, NETWORK_ERROR_MESSAGE } from '@/api/client';
import { cancelAgreement, listAgreements, respondToAgreement } from '@/api';
import { __focusi as focusi } from 'expo-router';
import { FINESTRA_FRESCHEZZA_MS, useAgreements } from '../useAgreements';

jest.mock('expo-router', () => {
  // `useFocusEffect` needs a navigator. Here it is an effect, and the cleanup the
  // hook returns (what a blur runs) is kept so a test can fire the blur without
  // unmounting the component.
  const focusi = [];
  return {
    __focusi: focusi,
    useFocusEffect: (callback) =>
      require('react').useEffect(() => {
        const uscita = callback();
        focusi.push({ callback, uscita });
        return uscita;
      }, [callback]),
  };
});

jest.mock('@/api', () => ({
  listAgreements: jest.fn(),
  respondToAgreement: jest.fn(),
  cancelAgreement: jest.fn(),
}));

// The provider needs a navigator and a network: here the hook only records the
// handler it subscribed with, so a test can hand it one frame inside `act()`.
let mockStreamHandler = null;
jest.mock('@/hooks/useEventStream', () => ({
  useStreamEvent: (handler) => {
    mockStreamHandler = handler;
  },
  useStreamState: () => ({ connected: true, unreadCount: 0, lastId: 1 }),
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
/** `PENDING` already answered by me: it waits for the counterpart.
 *
 * `services/agreements.js:15-16` documents this state as the `sent` bucket, and
 * `api/areas/agreements.js:104-106` says one answer moves the agreement to
 * `ACCEPTED`/`REFUSED`. Both cannot be true with real data; the fixture follows
 * the classifier, which is the piece under test here. Recorded as a residual.
 */
const INVIATO = accordo(12, 'PENDING', [proposta(MY_USERNAME, true)]);
/** `ACCEPTED` with no sheet yet: an exchange in progress, not a closed one. */
const IN_CORSO = accordo(13, 'ACCEPTED', [proposta(MY_USERNAME, true)]);

/** One notification row as the stream hands it over: the type, the data. */
const notifica = (tipo, dati = {}) => ({ tipo, dati });

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
async function mount() {
  // From RTL 14 `renderHook` is async: the mount is awaited, not wrapped in `act`.
  const { result } = await renderHook(() =>
    useAgreements({ token: TOKEN, myUsername: MY_USERNAME }),
  );
  return result;
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
  // A mount of a previous test leaves a dead callback behind; the blur test
  // reads the last one, so the list must start empty.
  focusi.length = 0;
  mockStreamHandler = null;
  listAgreements.mockResolvedValue([DA_RISPONDERE, INVIATO, IN_CORSO]);
  respondToAgreement.mockResolvedValue(undefined);
  cancelAgreement.mockResolvedValue(undefined);
});

describe('useAgreements — the list request', () => {
  it('drops a list response that a newer request has superseded', async () => {
    const first = deferred();
    const second = deferred();
    listAgreements.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const result = await mount();
    await settle();

    await act(async () => {
      result.current.riprova();
    });
    expect(listAgreements).toHaveBeenCalledTimes(2);

    await act(async () => {
      second.resolve([IN_CORSO]);
    });
    expect(result.current.accordi).toEqual([IN_CORSO]);

    await act(async () => {
      first.resolve([DA_RISPONDERE]);
    });

    // The older answer arrived last and must not overwrite the newer one.
    expect(result.current.accordi).toEqual([IN_CORSO]);
  });

  it('drops the response in flight and stops the spinner when the tab is left', async () => {
    const pending = deferred();
    listAgreements.mockReturnValueOnce(pending.promise);
    const result = await mount();
    await settle();
    expect(result.current.caricamento).toBe(true);

    await act(async () => {
      focusi[focusi.length - 1].uscita();
    });
    // Leaving the tab cannot leave a spinner behind for a response nobody wants.
    expect(result.current.caricamento).toBe(false);

    await act(async () => {
      pending.resolve([DA_RISPONDERE]);
    });
    expect(result.current.accordi).toBeNull();
  });

  it('keeps the agreements on screen when a reload fails and says why', async () => {
    const result = await mount();
    await settle();
    const mostrati = result.current.accordi;
    listAgreements.mockRejectedValueOnce(new ApiError(0, NETWORK_ERROR_MESSAGE));

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(result.current.accordi).toEqual(mostrati);
    expect(result.current.errore).toBe(NETWORK_ERROR_MESSAGE);
    expect(result.current.refreshing).toBe(false);
  });

  it('leaves classificati null until the first response arrives', async () => {
    const pending = deferred();
    listAgreements.mockReturnValueOnce(pending.promise);
    const result = await mount();
    await settle();

    expect(result.current.accordi).toBeNull();
    expect(result.current.classificati).toBeNull();

    await act(async () => {
      pending.resolve([DA_RISPONDERE]);
    });

    expect(result.current.classificati.toAnswer).toEqual([DA_RISPONDERE]);
  });

  it('splits the list into the three sections once a response arrives', async () => {
    const result = await mount();
    await settle();

    expect(result.current.classificati.toAnswer.map((a) => a.id)).toEqual([11]);
    expect(result.current.classificati.sent.map((a) => a.id)).toEqual([12]);
    expect(result.current.classificati.inProgress.map((a) => a.id)).toEqual([13]);
    // Nothing was guessed into the closed history.
    expect(result.current.classificati.concluded).toEqual([]);
  });

  it('riprova repeats the list request', async () => {
    const result = await mount();
    await settle();
    expect(listAgreements).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.riprova();
    });

    expect(listAgreements).toHaveBeenCalledTimes(2);
    expect(listAgreements).toHaveBeenNthCalledWith(2, TOKEN);
  });
});

describe('useAgreements — the stream', () => {
  it('reloads the list when a proposal lands', async () => {
    const result = await mount();
    await settle();
    expect(listAgreements).toHaveBeenCalledTimes(1);

    await act(async () => {
      mockStreamHandler(notifica('AGREEMENT_PROPOSAL', { agreementId: 11 }));
    });
    await settle();

    expect(listAgreements).toHaveBeenCalledTimes(2);
    expect(listAgreements).toHaveBeenNthCalledWith(2, TOKEN);
    // The frame carried no row: what the screen draws is the list it re-read.
    expect(result.current.accordi).toEqual([DA_RISPONDERE, INVIATO, IN_CORSO]);
  });

  it('ignores a frame that does not belong to the agreements tab', async () => {
    await mount();
    await settle();

    await act(async () => {
      mockStreamHandler(notifica('CHAT_MESSAGE', { chatId: 7 }));
    });
    await settle();

    expect(listAgreements).toHaveBeenCalledTimes(1);
  });

  it('reloads the list when an agreement completes', async () => {
    await mount();
    await settle();

    // The backend writes `agreement_completed`; the normaliser hands it over
    // upper-cased, which is the spelling the predicate matches.
    await act(async () => {
      mockStreamHandler(notifica('AGREEMENT_COMPLETED', { agreementId: 13 }));
    });
    await settle();

    expect(listAgreements).toHaveBeenCalledTimes(2);
    expect(listAgreements).toHaveBeenNthCalledWith(2, TOKEN);
  });
});

describe('useAgreements — the two actions', () => {
  it('names the agreement the action is flying on', async () => {
    const flight = deferred();
    respondToAgreement.mockReturnValueOnce(flight.promise);
    const result = await mount();
    await settle();

    let inVolo;
    await act(async () => {
      inVolo = result.current.rispondi(7, true);
    });

    expect(result.current.azioneInCorso).toEqual({ id: 7, nome: 'accetta' });

    await act(async () => {
      flight.resolve(undefined);
      await inVolo;
    });

    expect(result.current.azioneInCorso).toBeNull();
  });

  it('reloads the list after an action that worked and says what happened', async () => {
    const result = await mount();
    await settle();
    expect(listAgreements).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.rispondi(7, true);
    });
    expect(respondToAgreement).toHaveBeenCalledWith(TOKEN, 7, true);
    expect(result.current.esito).toBe('Proposta accettata: lo scambio ora è in «In corso».');
    expect(listAgreements).toHaveBeenCalledTimes(2);

    await act(async () => {
      await result.current.rispondi(8, false);
    });
    expect(respondToAgreement).toHaveBeenLastCalledWith(TOKEN, 8, false);
    expect(result.current.esito).toBe('Proposta rifiutata.');
    expect(listAgreements).toHaveBeenCalledTimes(3);

    await act(async () => {
      await result.current.annulla(9);
    });
    expect(cancelAgreement).toHaveBeenCalledWith(TOKEN, 9);
    expect(result.current.esito).toBe('Scambio annullato.');
    expect(listAgreements).toHaveBeenCalledTimes(4);
    expect(result.current.azioneInCorso).toBeNull();
  });

  it('keeps the list and lands the failure in actionError when an action fails', async () => {
    const result = await mount();
    await settle();
    const mostrati = result.current.accordi;
    respondToAgreement.mockRejectedValueOnce(new ApiError(409, 'Conflitto: aggiorna e riprova.'));

    await act(async () => {
      await result.current.rispondi(7, true);
    });

    expect(result.current.actionError).toBe('Conflitto: aggiorna e riprova.');
    expect(result.current.accordi).toEqual(mostrati);
    expect(result.current.esito).toBeNull();
    expect(result.current.azioneInCorso).toBeNull();
    // A failed action does not pretend to have changed anything: no reload.
    expect(listAgreements).toHaveBeenCalledTimes(1);
  });

  it('refuses an action without a whole id', async () => {
    const result = await mount();
    await settle();

    await act(async () => {
      await result.current.rispondi(4.5, true);
    });

    expect(respondToAgreement).not.toHaveBeenCalled();
    expect(result.current.actionError).toBe(
      'Operazione non disponibile: ricarica la schermata e riprova.',
    );
    expect(result.current.azioneInCorso).toBeNull();
    expect(listAgreements).toHaveBeenCalledTimes(1);
  });
});

/** Il ritorno sulla tab: prima il blur, poi la callback di fuoco. */
async function rifocalizza() {
  const fuoco = focusi[focusi.length - 1];
  await act(async () => {
    fuoco.uscita();
    fuoco.callback();
  });
}

describe("useAgreements — il ritorno sulla tab", () => {
  let orologio;
  let spiaOrologio;

  beforeEach(() => {
    orologio = 1000000;
    spiaOrologio = jest.spyOn(Date, 'now').mockImplementation(() => orologio);
  });

  afterEach(() => {
    spiaOrologio.mockRestore();
  });

  it("tiene le righe a schermo: l'attesa è un aggiornamento, non un caricamento", async () => {
    const result = await mount();
    await settle();
    expect(result.current.accordi).toHaveLength(3);

    // Fuori dalla finestra: il ritorno chiede davvero, e la risposta tarda.
    orologio += FINESTRA_FRESCHEZZA_MS + 1;
    const pending = deferred();
    listAgreements.mockReturnValueOnce(pending.promise);

    await rifocalizza();

    expect(listAgreements).toHaveBeenCalledTimes(2);
    // Le righe di prima sono ancora lì, e lo spinner del primo caricamento no.
    expect(result.current.accordi).toHaveLength(3);
    expect(result.current.caricamento).toBe(false);
    expect(result.current.aggiornamento).toBe(true);

    await act(async () => {
      pending.resolve([IN_CORSO]);
    });
    expect(result.current.aggiornamento).toBe(false);
    expect(result.current.accordi).toEqual([IN_CORSO]);
  });

  it('dentro la finestra, con lo stream che ha già parlato, non richiede niente', async () => {
    const result = await mount();
    await settle();

    // Un frame gestito è la prova che lo stream tiene aggiornata la lista.
    await act(async () => {
      mockStreamHandler(notifica('AGREEMENT_RESPONSE', { agreementId: 11 }));
    });
    await settle();
    expect(listAgreements).toHaveBeenCalledTimes(2);

    orologio += 1000;
    await rifocalizza();

    expect(listAgreements).toHaveBeenCalledTimes(2);
    expect(result.current.aggiornamento).toBe(false);
  });

  it('senza nessun frame dello stream la finestra non basta: la lettura si ripete', async () => {
    await mount();
    await settle();
    expect(listAgreements).toHaveBeenCalledTimes(1);

    orologio += 1000;
    await rifocalizza();

    // Uno stream silenzioso non è una prova: la ricarica al focus resta la via.
    expect(listAgreements).toHaveBeenCalledTimes(2);
  });

  it('«Riprova» e il gesto di aggiornamento ignorano la finestra', async () => {
    const result = await mount();
    await settle();
    await act(async () => {
      mockStreamHandler(notifica('AGREEMENT_RESPONSE', { agreementId: 11 }));
    });
    await settle();
    expect(listAgreements).toHaveBeenCalledTimes(2);

    orologio += 1000;
    await act(async () => {
      result.current.riprova();
    });
    expect(listAgreements).toHaveBeenCalledTimes(3);

    await act(async () => {
      await result.current.onRefresh();
    });
    expect(listAgreements).toHaveBeenCalledTimes(4);
  });

  it('una risposta vecchia non sovrascrive quella arrivata dopo il ritorno sulla tab', async () => {
    const lenta = deferred();
    const veloce = deferred();
    const result = await mount();
    await settle();
    expect(listAgreements).toHaveBeenCalledTimes(1);

    listAgreements.mockReturnValueOnce(lenta.promise).mockReturnValueOnce(veloce.promise);
    await act(async () => {
      void result.current.riprova();
    });
    orologio += 1000;
    await rifocalizza();
    expect(listAgreements).toHaveBeenCalledTimes(3);

    await act(async () => {
      veloce.resolve([IN_CORSO]);
    });
    expect(result.current.accordi).toEqual([IN_CORSO]);

    // La richiesta superata arriva adesso: non scrive.
    await act(async () => {
      lenta.resolve([INVIATO]);
    });
    expect(result.current.accordi).toEqual([IN_CORSO]);
  });
});
