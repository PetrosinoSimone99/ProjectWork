import { act, create } from 'react-test-renderer';
import { ApiError } from '@/api/client';
import { usePagedList } from '../usePagedList';

/**
 * `usePagedList`: la pagina 1 sostituisce, le altre si appendono senza
 * ripetere righe, una risposta superata non scrive niente, `haAltre` chiude la
 * lista all'ultima pagina.
 *
 * Il probe rende l'hook e tiene il suo ultimo valore dove il test lo legge: il
 * contratto è quello che torna, non lo stato interno.
 */

/** Una risposta del backend già normalizzata: `{righe, paginazione}`. */
const pagina = (righe, { page = 1, totalPages = 1 } = {}) => ({
  righe,
  paginazione: { pagina: page, limite: 2, elementiTotali: totalPages * 2, pagineTotali: totalPages },
});

/** Il probe: rende l'hook e scrive il suo ultimo valore in `lettura`. */
function Probe({ carica, lettura }) {
  Object.assign(lettura, usePagedList({ carica, dimensione: 2 }));
  return null;
}

/**
 * Monta il probe e torna anche il modo di cambiarne la `carica`, che è quello
 * che cambia davvero quando la schermata cambia ricerca o filtro.
 */
function render(lettura, carica) {
  let renderer;
  act(() => {
    renderer = create(<Probe carica={carica} lettura={lettura} />);
  });
  const aggiorna = (nuovaCarica) =>
    act(() => {
      renderer.update(<Probe carica={nuovaCarica} lettura={lettura} />);
    });
  return { renderer, aggiorna };
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
  const lettura = {};
  render(lettura, carica);

  await act(async () => {
    await lettura.ricarica();
  });
  expect(lettura.voci).toEqual([{ id: 1 }, { id: 2 }]);
  expect(lettura.haAltre).toBe(true);

  await act(async () => {
    await lettura.caricaAltri();
  });
  // La seconda pagina si aggiunge, la prima resta.
  expect(lettura.voci).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
  expect(lettura.paginazione.pagina).toBe(2);
  expect(carica).toHaveBeenLastCalledWith({ page: 2, limit: 2 });
});

it('una riga già letta non si ripete quando la finestra si sposta', async () => {
  const carica = jest
    .fn()
    .mockResolvedValueOnce(pagina([{ id: 1 }, { id: 2 }], { page: 1, totalPages: 2 }))
    .mockResolvedValueOnce(pagina([{ id: 2 }, { id: 3 }], { page: 2, totalPages: 2 }));
  const lettura = {};
  render(lettura, carica);

  await act(async () => {
    await lettura.ricarica();
  });
  await act(async () => {
    await lettura.caricaAltri();
  });

  expect(lettura.voci.map((riga) => riga.id)).toEqual([1, 2, 3]);
});

it("all'ultima pagina haAltre è falso e caricaAltri non chiede niente", async () => {
  const carica = jest.fn().mockResolvedValueOnce(pagina([{ id: 1 }], { page: 2, totalPages: 2 }));
  const lettura = {};
  render(lettura, carica);

  await act(async () => {
    await lettura.ricarica();
  });
  expect(lettura.haAltre).toBe(false);

  await act(async () => {
    await lettura.caricaAltri();
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
  const lettura = {};
  render(lettura, carica);

  await act(async () => {
    await lettura.ricarica();
  });
  // Nessun `await`: la richiesta parte e resta aperta.
  act(() => {
    void lettura.caricaAltri();
  });
  await flush();
  await act(async () => {
    await lettura.ricarica();
  });
  expect(lettura.voci).toEqual([{ id: 9 }]);

  // La pagina vecchia arriva adesso: è superata, non deve toccare niente.
  await act(async () => {
    risolviAppendente();
    await Promise.resolve();
  });
  expect(lettura.voci).toEqual([{ id: 9 }]);
  expect(lettura.paginazione.pagina).toBe(1);
});

it('un errore di rete diventa il messaggio italiano di ApiError', async () => {
  const carica = jest
    .fn()
    .mockRejectedValueOnce(new ApiError(403, 'Questa azione non è permessa con il tuo ruolo.'));
  const lettura = {};
  render(lettura, carica);

  await act(async () => {
    await lettura.ricarica();
  });

  expect(lettura.errore).toBe('Questa azione non è permessa con il tuo ruolo.');
  expect(lettura.erroreNonDisponibile).toBe(false);
  expect(lettura.caricamento).toBe(false);
});

it('un endpoint assente è dichiarato non disponibile, non un guasto', async () => {
  const carica = jest.fn().mockRejectedValueOnce(new ApiError(404, 'Not found.'));
  const lettura = {};
  render(lettura, carica);

  await act(async () => {
    await lettura.ricarica();
  });

  // La schermata mostra «non disponibile» e non un «Riprova» che non può riuscire.
  expect(lettura.erroreNonDisponibile).toBe(true);
  // Il tentativo dopo azzera il giudizio prima di chiedere: un «non disponibile»
  // vecchio non deve restare a schermo mentre la richiesta è in volo.
  await act(async () => {
    await lettura.ricarica();
  });
  expect(lettura.erroreNonDisponibile).toBe(false);
  expect(lettura.errore).toBe(null);
});

it('una ricarica fallita non lascia «Carica altri» a chiedere la pagina dopo', async () => {
  const carica = jest
    .fn()
    .mockResolvedValueOnce(pagina([{ id: 1 }, { id: 2 }], { page: 1, totalPages: 3 }))
    .mockRejectedValueOnce(new ApiError(500, 'Il servizio non risponde.'));
  const lettura = {};
  render(lettura, carica);

  await act(async () => {
    await lettura.ricarica();
  });
  expect(lettura.haAltre).toBe(true);

  await act(async () => {
    await lettura.ricarica();
  });
  // Le righe a schermo sono ancora quelle di prima, ma la finestra descritta in
  // memoria non è più quella richiesta: appendere salterebbe le pagine 1 e 2.
  expect(lettura.haAltre).toBe(false);
  await act(async () => {
    await lettura.caricaAltri();
  });
  expect(carica).toHaveBeenCalledTimes(2);
});

it('cambiata la richiesta, il bottone non appende la pagina della finestra vecchia', async () => {
  const primaRichiesta = jest
    .fn()
    .mockResolvedValueOnce(pagina([{ id: 1 }], { page: 1, totalPages: 2 }));
  const secondaRichiesta = jest.fn().mockResolvedValue(pagina([{ id: 7 }], { page: 1, totalPages: 2 }));
  const lettura = {};
  const { aggiorna } = render(lettura, primaRichiesta);

  await act(async () => {
    await lettura.ricarica();
  });
  expect(lettura.haAltre).toBe(true);

  // La ricerca è cambiata ma la pagina 1 del nuovo insieme non è ancora partita
  // (i 350 ms di debounce): il tocco non deve mescolare i due insiemi.
  aggiorna(secondaRichiesta);
  await act(async () => {
    await lettura.caricaAltri();
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
  const lettura = {};
  const { renderer } = render(lettura, carica);
  const avvisi = jest.spyOn(console, 'error').mockImplementation(() => {});

  act(() => {
    void lettura.ricarica();
  });
  await flush();
  act(() => {
    renderer.unmount();
  });
  await act(async () => {
    risolvi(pagina([{ id: 1 }]));
    await Promise.resolve();
  });

  expect(avvisi).not.toHaveBeenCalled();
  avvisi.mockRestore();
});
