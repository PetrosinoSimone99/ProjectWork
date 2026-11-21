import { act, renderHook } from '@testing-library/react-native';
import { ApiError } from '@/api/client';
import { FINESTRA_FRESCHEZZA_MS, usePagedList } from '../usePagedList';

/**
 * `usePagedList`: la pagina 1 sostituisce, le altre si appendono senza
 * ripetere righe, una risposta superata non scrive niente, `haAltre` chiude la
 * lista all'ultima pagina.
 *
 * Il test monta l'hook con `renderHook` e legge `result.current`: il contratto
 * è quello che torna, non lo stato interno. Da RTL 14 il montaggio è
 * asincrono, quindi si aspetta.
 */

/** Una risposta del backend già normalizzata: `{righe, paginazione}`. */
const pagina = (righe, { page = 1, totalPages = 1 } = {}) => ({
  righe,
  paginazione: { pagina: page, limite: 2, elementiTotali: totalPages * 2, pagineTotali: totalPages },
});

/**
 * Monta l'hook e torna anche il modo di cambiarne la `carica`, che è quello
 * che cambia davvero quando la schermata cambia ricerca o filtro.
 */
function renderPagedList(carica) {
  return renderHook(({ carica: corrente }) => usePagedList({ carica: corrente, dimensione: 2 }), {
    initialProps: { carica },
  });
}

/** Lascia atterrare le promesse già partite. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) {
      await Promise.resolve();
    }
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('la pagina nuova sostituisce e la successiva si appende', async () => {
  const carica = jest
    .fn()
    .mockResolvedValueOnce(pagina([{ id: 1 }, { id: 2 }], { page: 1, totalPages: 3 }))
    .mockResolvedValueOnce(pagina([{ id: 3 }, { id: 4 }], { page: 2, totalPages: 3 }));
  const { result } = await renderPagedList(carica);

  await act(async () => {
    await result.current.ricarica();
  });
  expect(result.current.voci).toEqual([{ id: 1 }, { id: 2 }]);
  expect(result.current.haAltre).toBe(true);

  await act(async () => {
    await result.current.caricaAltri();
  });
  // La seconda pagina si aggiunge, la prima resta.
  expect(result.current.voci).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
  expect(result.current.paginazione.pagina).toBe(2);
  expect(carica).toHaveBeenLastCalledWith({ page: 2, limit: 2 });
});

it('una riga già letta non si ripete quando la finestra si sposta', async () => {
  const carica = jest
    .fn()
    .mockResolvedValueOnce(pagina([{ id: 1 }, { id: 2 }], { page: 1, totalPages: 2 }))
    .mockResolvedValueOnce(pagina([{ id: 2 }, { id: 3 }], { page: 2, totalPages: 2 }));
  const { result } = await renderPagedList(carica);

  await act(async () => {
    await result.current.ricarica();
  });
  await act(async () => {
    await result.current.caricaAltri();
  });

  expect(result.current.voci.map((riga) => riga.id)).toEqual([1, 2, 3]);
});

it("all'ultima pagina haAltre è falso e caricaAltri non chiede niente", async () => {
  const carica = jest.fn().mockResolvedValueOnce(pagina([{ id: 1 }], { page: 2, totalPages: 2 }));
  const { result } = await renderPagedList(carica);

  await act(async () => {
    await result.current.ricarica();
  });
  expect(result.current.haAltre).toBe(false);

  await act(async () => {
    await result.current.caricaAltri();
  });
  expect(carica).toHaveBeenCalledTimes(1);
});

it('una risposta superata da una ricarica non si appende alla lista nuova', async () => {
  let risolviAppendente;
  const carica = jest
    .fn()
    // page 1 della prima ricarica
    .mockResolvedValueOnce(pagina([{ id: 1 }, { id: 2 }], { page: 1, totalPages: 2 }))
    // l'appendente resta in volo finché il test non lo scioglie
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          risolviAppendente = () =>
            resolve(pagina([{ id: 3 }, { id: 4 }], { page: 2, totalPages: 2 }));
        }),
    )
    // la ricarica che la supera
    .mockResolvedValueOnce(pagina([{ id: 9 }], { page: 1, totalPages: 2 }));
  const { result } = await renderPagedList(carica);

  await act(async () => {
    await result.current.ricarica();
  });
  // Nessun `await`: la richiesta parte e resta aperta.
  await act(async () => {
    void result.current.caricaAltri();
  });
  await flush();
  await act(async () => {
    await result.current.ricarica();
  });
  expect(result.current.voci).toEqual([{ id: 9 }]);

  // La pagina vecchia arriva adesso: è superata, non deve toccare niente.
  await act(async () => {
    risolviAppendente();
    await Promise.resolve();
  });
  expect(result.current.voci).toEqual([{ id: 9 }]);
  expect(result.current.paginazione.pagina).toBe(1);
});

it('un errore di rete diventa il messaggio italiano di ApiError', async () => {
  const carica = jest
    .fn()
    .mockRejectedValueOnce(new ApiError(403, 'Questa azione non è permessa con il tuo ruolo.'));
  const { result } = await renderPagedList(carica);

  await act(async () => {
    await result.current.ricarica();
  });

  expect(result.current.errore).toBe('Questa azione non è permessa con il tuo ruolo.');
  expect(result.current.erroreNonDisponibile).toBe(false);
  expect(result.current.caricamento).toBe(false);
});

it('un endpoint assente è dichiarato non disponibile, non un guasto', async () => {
  const carica = jest.fn().mockRejectedValueOnce(new ApiError(404, 'Not found.'));
  const { result } = await renderPagedList(carica);

  await act(async () => {
    await result.current.ricarica();
  });

  // La schermata mostra «non disponibile» e non un «Riprova» che non può riuscire.
  expect(result.current.erroreNonDisponibile).toBe(true);
  // Il tentativo dopo azzera il giudizio prima di chiedere: un «non disponibile»
  // vecchio non deve restare a schermo mentre la richiesta è in volo.
  await act(async () => {
    await result.current.ricarica();
  });
  expect(result.current.erroreNonDisponibile).toBe(false);
  expect(result.current.errore).toBe(null);
});

it('una ricarica fallita non lascia «Carica altri» a chiedere la pagina dopo', async () => {
  const carica = jest
    .fn()
    .mockResolvedValueOnce(pagina([{ id: 1 }, { id: 2 }], { page: 1, totalPages: 3 }))
    .mockRejectedValueOnce(new ApiError(500, 'Il servizio non risponde.'));
  const { result } = await renderPagedList(carica);

  await act(async () => {
    await result.current.ricarica();
  });
  expect(result.current.haAltre).toBe(true);

  await act(async () => {
    await result.current.ricarica();
  });
  // Le righe a schermo sono ancora quelle di prima, ma la finestra descritta in
  // memoria non è più quella richiesta: appendere salterebbe le pagine 1 e 2.
  expect(result.current.haAltre).toBe(false);
  await act(async () => {
    await result.current.caricaAltri();
  });
  expect(carica).toHaveBeenCalledTimes(2);
});

it('cambiata la richiesta, il bottone non appende la pagina della finestra vecchia', async () => {
  const primaRichiesta = jest
    .fn()
    .mockResolvedValueOnce(pagina([{ id: 1 }], { page: 1, totalPages: 2 }));
  const secondaRichiesta = jest.fn().mockResolvedValue(pagina([{ id: 7 }], { page: 1, totalPages: 2 }));
  const { result, rerender } = await renderPagedList(primaRichiesta);

  await act(async () => {
    await result.current.ricarica();
  });
  expect(result.current.haAltre).toBe(true);

  // La ricerca è cambiata ma la pagina 1 del nuovo insieme non è ancora partita
  // (i 350 ms di debounce): il tocco non deve mescolare i due insiemi.
  await rerender({ carica: secondaRichiesta });
  await act(async () => {
    await result.current.caricaAltri();
  });

  expect(secondaRichiesta).not.toHaveBeenCalled();
  expect(primaRichiesta).toHaveBeenCalledTimes(1);
});

it('una risposta che arriva dopo lo smontaggio non scrive niente', async () => {
  let risolvi;
  const carica = jest.fn().mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        risolvi = resolve;
      }),
  );
  const { result, unmount } = await renderPagedList(carica);
  const avvisi = jest.spyOn(console, 'error').mockImplementation(() => {});

  await act(async () => {
    void result.current.ricarica();
  });
  await flush();
  await unmount();
  await act(async () => {
    risolvi(pagina([{ id: 1 }]));
    await Promise.resolve();
  });

  expect(avvisi).not.toHaveBeenCalled();
  avvisi.mockRestore();
});

describe('usePagedList — il ritorno sulla schermata', () => {
  let orologio;
  let spiaOrologio;

  beforeEach(() => {
    orologio = 1000000;
    spiaOrologio = jest.spyOn(Date, 'now').mockImplementation(() => orologio);
  });

  afterEach(() => {
    spiaOrologio.mockRestore();
  });

  it('dentro la finestra il ritorno non ripete la chiamata', async () => {
    const carica = jest
      .fn()
      .mockResolvedValueOnce(pagina([{ id: 1 }, { id: 2 }], { page: 1, totalPages: 1 }));
    const { result } = await renderPagedList(carica);

    await act(async () => {
      await result.current.ricarica();
    });
    orologio += 1000;
    await act(async () => {
      await result.current.aggiornaAlFocus();
    });

    expect(carica).toHaveBeenCalledTimes(1);
    expect(result.current.voci).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('passata la finestra rilegge e non svuota le righe a schermo', async () => {
    let risolvi;
    const carica = jest
      .fn()
      .mockResolvedValueOnce(pagina([{ id: 1 }, { id: 2 }], { page: 1, totalPages: 1 }))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            risolvi = resolve;
          }),
      );
    const { result } = await renderPagedList(carica);

    await act(async () => {
      await result.current.ricarica();
    });
    orologio += FINESTRA_FRESCHEZZA_MS + 1;
    await act(async () => {
      void result.current.aggiornaAlFocus();
    });
    await flush();

    // Le righe restano, e la rilettura si dichiara in `aggiornamento`.
    expect(result.current.voci).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.current.caricamento).toBe(false);
    expect(result.current.aggiornamento).toBe(true);

    await act(async () => {
      risolvi(pagina([{ id: 9 }], { page: 1, totalPages: 1 }));
      await Promise.resolve();
    });
    expect(result.current.aggiornamento).toBe(false);
    expect(result.current.voci).toEqual([{ id: 9 }]);
  });

  it('la ricarica manuale ignora la finestra: «Riprova» chiede sempre', async () => {
    const carica = jest
      .fn()
      .mockResolvedValue(pagina([{ id: 1 }, { id: 2 }], { page: 1, totalPages: 1 }));
    const { result } = await renderPagedList(carica);

    await act(async () => {
      await result.current.ricarica();
    });
    orologio += 1000;
    await act(async () => {
      await result.current.ricarica();
    });

    expect(carica).toHaveBeenCalledTimes(2);
  });

  it('con pagine incollate il ritorno non torna a pagina 1', async () => {
    const carica = jest
      .fn()
      .mockResolvedValueOnce(pagina([{ id: 1 }, { id: 2 }], { page: 1, totalPages: 2 }))
      .mockResolvedValueOnce(pagina([{ id: 3 }, { id: 4 }], { page: 2, totalPages: 2 }));
    const { result } = await renderPagedList(carica);

    await act(async () => {
      await result.current.ricarica();
    });
    await act(async () => {
      await result.current.caricaAltri();
    });
    orologio += FINESTRA_FRESCHEZZA_MS + 1;
    await act(async () => {
      await result.current.aggiornaAlFocus();
    });

    // La finestra caricata con «Carica altri» è quello che l'utente ha chiesto:
    // un ritorno sulla schermata non la butta via.
    expect(carica).toHaveBeenCalledTimes(2);
    expect(result.current.paginazione.pagina).toBe(2);
    expect(result.current.voci.map((riga) => riga.id)).toEqual([1, 2, 3, 4]);
  });

  it('una risposta superata non scrive niente dopo il ritorno sulla schermata', async () => {
    let risolviLenta;
    const carica = jest
      .fn()
      .mockResolvedValueOnce(pagina([{ id: 1 }, { id: 2 }], { page: 1, totalPages: 1 }))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            risolviLenta = resolve;
          }),
      )
      .mockResolvedValueOnce(pagina([{ id: 9 }], { page: 1, totalPages: 1 }));
    const { result } = await renderPagedList(carica);

    await act(async () => {
      await result.current.ricarica();
    });
    orologio += FINESTRA_FRESCHEZZA_MS + 1;
    await act(async () => {
      void result.current.ricarica();
    });
    await flush();
    await act(async () => {
      await result.current.aggiornaAlFocus();
    });
    expect(result.current.voci).toEqual([{ id: 9 }]);

    await act(async () => {
      risolviLenta(pagina([{ id: 1 }, { id: 2 }], { page: 1, totalPages: 1 }));
      await Promise.resolve();
    });
    expect(result.current.voci).toEqual([{ id: 9 }]);
  });
});
