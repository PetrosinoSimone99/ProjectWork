import { act, renderHook } from '@testing-library/react-native';
import { __focusi as focusCallbacks } from 'expo-router';
import { getHomeCatalog } from '@/api';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { nuoviFiltri } from '@/services/offer-request';
import { useServiceCatalog, FINESTRA_FRESCHEZZA_MS } from '../useServiceCatalog';

jest.mock('expo-router', () => {
  // `useFocusEffect` needs a navigator. Here it is an effect, and each callback
  // it runs is kept so a test can fire the focus event again when the tab comes
  // back to the foreground.
  const focusi = [];
  return {
    __focusi: focusi,
    useFocusEffect: (callback) =>
      require('react').useEffect(() => {
        focusi.push(callback);
        return callback();
      }, [callback]),
  };
});

// The barrel must declare every symbol the hook imports from it, or the hook
// receives `undefined` for the missing ones.
jest.mock('@/api', () => ({
  getHomeCatalog: jest.fn(),
}));

const TOKEN = 'jwt';
const UTENTE_ID = 5;
const MESSAGGIO_500 = 'Il servizio ha avuto un problema. Riprova tra poco.';

/**
 * One catalog row in the shape `normalizeCatalogOffer` produces: the hook only
 * passes the list through and never reads a field.
 */
const voce = (id) => ({ id, descrizione: `servizio ${id}` });

const paginazione = (pagina, pagineTotali) => ({
  pagina,
  limite: 20,
  elementiTotali: 3,
  pagineTotali,
});

const risposta = (elenco, pagina = 1, pagineTotali = 3) => ({
  elenco,
  paginazione: paginazione(pagina, pagineTotali),
});

/** The requests the hook has started, in the order it started them. */
let richieste;

beforeEach(() => {
  jest.clearAllMocks();
  // The callbacks of the mounts of the tests before this one are dead. Keeping
  // them made `tornaInFocus` fire the previous mount's effect as soon as a
  // test mounted more than once, and nothing failed.
  focusCallbacks.length = 0;
  richieste = [];
  // Every answer waits for the test: that is what makes an out-of-order
  // response (slow one arriving after a newer one) possible to reproduce.
  getHomeCatalog.mockImplementation((token, utenteId, filtri, pagina) => {
    const richiesta = { token, utenteId, filtri, pagina };
    richiesta.promessa = new Promise((risolvi, rifiuta) => {
      richiesta.risolvi = risolvi;
      richiesta.rifiuta = rifiuta;
    });
    richieste.push(richiesta);
    return richiesta.promessa;
  });
});

/**
 * Mounts the hook with the token and the user of the test; `result.current` is
 * its latest return value.
 */
function monta() {
  return renderHook(() => useServiceCatalog({ token: TOKEN, utenteId: UTENTE_ID }));
}

/** Lets the continuations of the promises already resolved run inside `act`. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) {
      await Promise.resolve();
    }
  });
}

/** Answers one request and lets the hook apply (or drop) it. */
async function rispondi(richiesta, dati) {
  richiesta.risolvi(dati);
  await flush();
}

/** Fails one request and lets the hook show the error. */
async function fallisci(richiesta, errore) {
  richiesta.rifiuta(errore);
  await flush();
}

/** Fires the focus event again, the way the tab does when it comes back. */
async function tornaInFocus() {
  const callback = focusCallbacks[focusCallbacks.length - 1];
  await act(async () => {
    callback();
    for (let i = 0; i < 6; i += 1) {
      await Promise.resolve();
    }
  });
}

describe('useServiceCatalog — out-of-order answers', () => {
  it('drops a page response that a filter change has superseded', async () => {
    const { result } = await monta();
    const primoCaricamento = richieste[0];

    await act(async () => {
      result.current.cambiaScelta('idCategoria', 3);
    });
    await rispondi(richieste[1], risposta([voce(3)], 1, 3));
    expect(result.current.servizi).toEqual([voce(3)]);

    // The first page arrives late: it belongs to a request nobody wants anymore.
    await rispondi(primoCaricamento, risposta([voce(1)], 1, 9));

    expect(result.current.servizi).toEqual([voce(3)]);
    expect(result.current.paginazione).toEqual(paginazione(1, 3));
    expect(result.current.filtriApplicati.idCategoria).toBe(3);
  });

  it('keeps the catalog on screen when a reload fails and says why', async () => {
    const { result } = await monta();
    await rispondi(richieste[0], risposta([voce(1)]));
    expect(result.current.servizi).toEqual([voce(1)]);

    let ricarica;
    await act(async () => {
      ricarica = result.current.onRefresh();
      await Promise.resolve();
    });
    expect(richieste).toHaveLength(2);
    expect(richieste[1].pagina).toBe(1);

    await act(async () => {
      richieste[1].rifiuta(new ApiError(500, MESSAGGIO_500));
      await ricarica;
    });

    // A failed reload is a stale datum with a notice, never a screen that empties.
    expect(result.current.servizi).toEqual([voce(1)]);
    expect(result.current.errore).toBe(MESSAGGIO_500);
    expect(result.current.refreshing).toBe(false);
    expect(result.current.caricamento).toBe(false);
  });

  it('a load-more response that arrives after a filter change is discarded', async () => {
    const { result } = await monta();
    await rispondi(richieste[0], risposta([voce(1)], 1, 3));

    await act(async () => {
      result.current.caricaAltri();
    });
    await act(async () => {
      result.current.cambiaScelta('idCategoria', 3);
    });

    await rispondi(richieste[2], risposta([voce(3)], 1, 1));
    // The appending answer arrives late: it must not be glued onto the new list.
    await rispondi(richieste[1], risposta([voce(2)], 2, 3));

    expect(result.current.servizi).toEqual([voce(3)]);
    expect(result.current.paginazione).toEqual(paginazione(1, 1));
    expect(result.current.filtriApplicati.idCategoria).toBe(3);
  });
});

describe('useServiceCatalog — failing requests', () => {
  it('retry repeats the failed request with its filters and page', async () => {
    const { result } = await monta();
    await rispondi(richieste[0], risposta([voce(1)], 1, 2));
    await act(async () => {
      result.current.cambiaScelta('idCategoria', 3);
    });
    await rispondi(richieste[1], risposta([voce(3)], 1, 2));

    await act(async () => {
      result.current.caricaAltri();
    });
    expect(richieste[2].pagina).toBe(2);
    await fallisci(richieste[2], new Error('boom'));
    expect(result.current.erroreAltri).toBe(GENERIC_ERROR_MESSAGE);
    expect(result.current.servizi).toEqual([voce(3)]);

    await act(async () => {
      result.current.riprova();
    });

    // Not the empty page one: the filters and the page that failed, as they were.
    expect(richieste[3].filtri).toEqual({ ...nuoviFiltri(), idCategoria: 3 });
    expect(richieste[3].pagina).toBe(2);

    await rispondi(richieste[3], risposta([voce(4)], 2, 2));
    expect(result.current.servizi).toEqual([voce(3), voce(4)]);
    expect(result.current.erroreAltri).toBe(null);
  });
});

describe('useServiceCatalog — the pages', () => {
  it('load more appends a copy and carries its own page', async () => {
    const { result } = await monta();
    await rispondi(richieste[0], risposta([voce(1)], 1, 3));
    const primaPagina = result.current.servizi;
    expect(primaPagina).toEqual([voce(1)]);

    await act(async () => {
      result.current.caricaAltri();
    });
    expect(richieste[1].pagina).toBe(2);
    expect(richieste[1].filtri).toEqual(nuoviFiltri());
    expect(result.current.caricamentoAltri).toBe(true);

    await rispondi(richieste[1], risposta([voce(2)], 2, 3));

    expect(result.current.servizi).toEqual([voce(1), voce(2)]);
    expect(result.current.servizi).not.toBe(primaPagina);
    expect(primaPagina).toEqual([voce(1)]);
    expect(result.current.paginazione).toEqual(paginazione(2, 3));
    expect(result.current.caricamentoAltri).toBe(false);
  });

  it('load more does nothing when the pagination says there is no next page', async () => {
    const { result } = await monta();

    // Nothing on screen yet: no page to ask the next one from.
    await act(async () => {
      result.current.caricaAltri();
    });
    expect(getHomeCatalog).toHaveBeenCalledTimes(1);

    await rispondi(richieste[0], risposta([voce(1)], 1, 1));
    await act(async () => {
      result.current.caricaAltri();
    });

    expect(getHomeCatalog).toHaveBeenCalledTimes(1);
    expect(result.current.caricamentoAltri).toBe(false);
  });
});

describe('useServiceCatalog — the filters', () => {
  it('a discrete choice asks with the applied filters, not the drafted text', async () => {
    const { result } = await monta();
    await rispondi(richieste[0], risposta([voce(1)]));

    await act(async () => {
      result.current.applicaFiltri('idraulico');
    });
    await rispondi(richieste[1], risposta([voce(1)]));
    expect(result.current.filtriApplicati.testo).toBe('idraulico');

    // Typed and sent, but its answer is still in flight: it is not applied yet.
    await act(async () => {
      result.current.applicaFiltri('fabbro');
    });
    await act(async () => {
      result.current.cambiaScelta('idCategoria', 7);
    });

    // The choice travels with what is on screen ('idraulico'), never with the
    // word still waiting for an answer.
    expect(richieste[3].filtri).toEqual({ ...nuoviFiltri(), testo: 'idraulico', idCategoria: 7 });
    expect(richieste[3].pagina).toBe(1);

    await rispondi(richieste[3], risposta([voce(7)]));
    expect(result.current.filtriApplicati).toEqual({ ...nuoviFiltri(), testo: 'idraulico', idCategoria: 7 });
    expect(result.current.filtri).toEqual({ ...nuoviFiltri(), idCategoria: 7 });
  });

  it('changing the province clears the comune', async () => {
    const { result } = await monta();
    await rispondi(richieste[0], risposta([voce(1)], 1, 3));
    await act(async () => {
      result.current.cambiaScelta('provincia', 'Milano');
    });
    await rispondi(richieste[1], risposta([voce(1)], 1, 3));
    await act(async () => {
      result.current.cambiaScelta('comune', 'Milano');
    });
    await rispondi(richieste[2], risposta([voce(1)], 1, 3));
    expect(result.current.filtriApplicati).toEqual({
      ...nuoviFiltri(),
      provincia: 'Milano',
      comune: 'Milano',
    });

    await act(async () => {
      result.current.cambiaScelta('provincia', 'Torino');
    });

    // The comuni of the old province make no sense in the new one.
    expect(richieste[3].filtri).toEqual({ ...nuoviFiltri(), provincia: 'Torino' });
    expect(result.current.filtri).toEqual({ ...nuoviFiltri(), provincia: 'Torino' });
    // One choice, one request.
    expect(richieste).toHaveLength(4);
  });

  it('remote is a filter like the others', async () => {
    const { result } = await monta();
    await rispondi(richieste[0], risposta([voce(1)], 1, 2));

    await act(async () => {
      result.current.cambiaModalita('REMOTO');
    });

    // A request, not a local re-filter: the backend decides the list.
    expect(richieste[1].filtri).toEqual({ ...nuoviFiltri(), modalita: 'REMOTO' });
    expect(richieste[1].pagina).toBe(1);

    await rispondi(richieste[1], risposta([voce(2)], 1, 2));
    expect(result.current.filtriApplicati.modalita).toBe('REMOTO');
    expect(result.current.filtri.modalita).toBe('REMOTO');
    expect(result.current.servizi).toEqual([voce(2)]);
  });

  it('clearing the filters returns to page one with none applied', async () => {
    const { result } = await monta();
    await rispondi(richieste[0], risposta([voce(1)], 1, 3));
    await act(async () => {
      result.current.cambiaScelta('idCategoria', 5);
    });
    await rispondi(richieste[1], risposta([voce(5)], 1, 3));
    await act(async () => {
      result.current.caricaAltri();
    });
    await rispondi(richieste[2], risposta([voce(6)], 2, 3));
    expect(result.current.servizi).toEqual([voce(5), voce(6)]);

    await act(async () => {
      result.current.azzeraFiltri();
    });

    expect(richieste[3].filtri).toEqual(nuoviFiltri());
    expect(richieste[3].pagina).toBe(1);

    await rispondi(richieste[3], risposta([voce(1), voce(2)], 1, 3));

    // The glued pages are gone: the answer replaces the list, it does not extend it.
    expect(result.current.servizi).toEqual([voce(1), voce(2)]);
    expect(result.current.filtriApplicati).toEqual(nuoviFiltri());
    expect(result.current.filtri).toEqual(nuoviFiltri());
    expect(result.current.paginazione).toEqual(paginazione(1, 3));
  });

  it('the focus reload is skipped while filters are applied', async () => {
    const oraFerma = Date.now();
    const spiaOra = jest.spyOn(Date, 'now').mockReturnValue(oraFerma);
    const oraAvanti = (ms) => spiaOra.mockReturnValue(oraFerma + ms);
    const { result } = await monta();
    await rispondi(richieste[0], risposta([voce(1)]));
    expect(getHomeCatalog).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.cambiaScelta('idCategoria', 4);
    });
    await rispondi(richieste[1], risposta([voce(4)]));

    await tornaInFocus();

    // Filtered results must not disappear under the catalog every time the tab opens.
    expect(getHomeCatalog).toHaveBeenCalledTimes(2);

    await act(async () => {
      result.current.azzeraFiltri();
    });
    await rispondi(richieste[2], risposta([voce(1)]));
    await tornaInFocus();

    // Niente filtri applicati: la rilettura al focus torna, ma solo dopo la
    // finestra di freschezza — dentro la finestra il ritorno sulla tab non
    // ripaga la lettura appena fatta (audit 2026-11-18, prestazione).
    expect(getHomeCatalog).toHaveBeenCalledTimes(3);

    oraAvanti(FINESTRA_FRESCHEZZA_MS + 1);
    await tornaInFocus();

    expect(getHomeCatalog).toHaveBeenCalledTimes(4);
    expect(richieste[3].filtri).toEqual(nuoviFiltri());
    expect(richieste[3].pagina).toBe(1);

    spiaOra.mockRestore();
  });
});
