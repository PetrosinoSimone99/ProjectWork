import {
  ETICHETTE_STATO,
  ETICHETTE_TIPO,
  etichettaStatoCoda,
  etichettaTipoCoda,
  serviziDelTipo,
} from '../queues';
import {
  INSUFFICIENT_CREDITS_MESSAGE,
  cancelQueue,
  createQueue,
  listQueues,
} from '../../api/areas/queues';

/**
 * Queue labels, the local create gate, and the three calls of
 * `src/api/areas/queues.js`.
 *
 * The API tests run against the **real** `client.js` with `global.fetch`
 * mocked: the copy under test is chosen from the HTTP status and from the
 * server body (`raw`), so mocking `apiFetch` itself would test nothing. The
 * sentinel case is `cancelQueue` with a bad id: it must reject before any
 * request exists (`global.fetch` never called).
 */

const TOKEN = 'test-token';
const INVALID_INPUT_MESSAGE = 'Controlla i dati inseriti: manca qualcosa o non è valido.';

/** A `Response`-shaped object: `client.js` reads `ok`, `status` and `text()`. */
function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

/** One row of `GET /get-queues`, exactly as `ServiceQueueDTO` sends it. */
function wireQueue(overrides = {}) {
  return {
    id: 7,
    queueType: 'OFFER',
    queueStatus: 'OPEN',
    location: null,
    serviceDescription: 'Ripasso di teoria musicale',
    serviceCategory: 'Musica',
    serviceRemote: false,
    agreementId: null,
    ...overrides,
  };
}

beforeEach(() => {
  global.fetch = jest.fn();
  // `client.js` logs every non-ok answer in dev; the tests assert on the
  // thrown `ApiError` instead, so the noise would only hide a real failure.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('queue labels', () => {
  it('maps the two wire types to the Italian labels', () => {
    expect(ETICHETTE_TIPO).toEqual({ OFFER: 'Offerta', REQUEST: 'Ricerca' });
    expect(etichettaTipoCoda('OFFER')).toBe('Offerta');
    expect(etichettaTipoCoda('REQUEST')).toBe('Ricerca');
  });

  it('maps the three wire statuses to the Italian labels', () => {
    expect(ETICHETTE_STATO).toEqual({
      OPEN: 'In attesa',
      IN_PROGRESS: 'In corso',
      CLOSED: 'Chiusa',
    });
    expect(etichettaStatoCoda('OPEN')).toBe('In attesa');
    expect(etichettaStatoCoda('IN_PROGRESS')).toBe('In corso');
    expect(etichettaStatoCoda('CLOSED')).toBe('Chiusa');
  });

  it('falls back to a neutral word for an unknown or missing type', () => {
    expect(etichettaTipoCoda('SOMETHING_ELSE')).toBe('Tipo non indicato');
    expect(etichettaTipoCoda(null)).toBe('Tipo non indicato');
    expect(etichettaTipoCoda(undefined)).toBe('Tipo non indicato');
  });

  it('falls back to a neutral word for an unknown or missing status', () => {
    expect(etichettaStatoCoda('SOMETHING_ELSE')).toBe('Stato non indicato');
    expect(etichettaStatoCoda(null)).toBe('Stato non indicato');
    expect(etichettaStatoCoda(undefined)).toBe('Stato non indicato');
  });
});

describe('serviziDelTipo', () => {
  const SERVIZI = [
    { chiave: 'OFFERTA-1', tipo: 'OFFERTA', id: 1 },
    { chiave: 'RICERCA-2', tipo: 'RICERCA', id: 2 },
  ];

  it('returns the rows of the requested type, so the caller can count them', () => {
    expect(serviziDelTipo(SERVIZI, 'OFFER')).toEqual([SERVIZI[0]]);
    expect(serviziDelTipo(SERVIZI, 'REQUEST')).toEqual([SERVIZI[1]]);
  });

  it('returns every row of that type, which is how the caller learns it cannot create a queue', () => {
    const due = [SERVIZI[0], { ...SERVIZI[0], chiave: 'OFFERTA-3', id: 3 }];

    expect(serviziDelTipo(due, 'OFFER')).toHaveLength(2);
  });

  it('returns [] for an empty list or for a type with no row', () => {
    expect(serviziDelTipo([], 'OFFER')).toEqual([]);
    expect(serviziDelTipo([SERVIZI[1]], 'OFFER')).toEqual([]);
    expect(serviziDelTipo(SERVIZI, 'CLOSED')).toEqual([]);
  });

  it('fails closed on a wrong-case queue type', () => {
    expect(serviziDelTipo(SERVIZI, 'offer')).toEqual([]);
    expect(serviziDelTipo(SERVIZI, 'Request')).toEqual([]);
  });

  it('fails closed when the list is not a list', () => {
    expect(serviziDelTipo(null, 'OFFER')).toEqual([]);
    expect(serviziDelTipo(undefined, 'OFFER')).toEqual([]);
  });

  it('never mutates the input list', () => {
    const copia = SERVIZI.map((voce) => ({ ...voce }));

    serviziDelTipo(SERVIZI, 'OFFER');

    expect(SERVIZI).toEqual(copia);
  });
});

describe('listQueues', () => {
  it('reads a 404 on get-queues as an empty list', async () => {
    global.fetch.mockResolvedValue(
      jsonResponse(404, { error: 'Service queues not found' }),
    );

    await expect(listQueues(TOKEN)).resolves.toEqual([]);
  });

  it('normalises the rows of a 200 answer', async () => {
    global.fetch.mockResolvedValue(
      jsonResponse(200, { queues: [wireQueue({ queueType: 'REQUEST', agreementId: 12 })] }),
    );

    await expect(listQueues(TOKEN)).resolves.toEqual([
      {
        id: 7,
        tipo: 'REQUEST',
        stato: 'OPEN',
        localita: null,
        descrizione: 'Ripasso di teoria musicale',
        categoria: 'Musica',
        daRemoto: false,
        agreementId: 12,
      },
    ]);
    const [url] = global.fetch.mock.calls[0];
    expect(String(url).endsWith('/get-queues')).toBe(true);
  });

  it('rethrows any error that is not the empty-list 404', async () => {
    global.fetch.mockResolvedValue(jsonResponse(500, { error: 'Internal server error' }));

    await expect(listQueues(TOKEN)).rejects.toMatchObject({ status: 500 });
  });
});

describe('createQueue', () => {
  it('refuses an unknown queue type before the network', async () => {
    await expect(createQueue(TOKEN, 'offer')).rejects.toMatchObject({
      status: 400,
      message: INVALID_INPUT_MESSAGE,
    });
    await expect(createQueue(TOKEN, 'SOMETHING_ELSE')).rejects.toMatchObject({ status: 400 });
    await expect(createQueue(TOKEN, null)).rejects.toMatchObject({ status: 400 });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('posts {queueType} for a valid type', async () => {
    global.fetch.mockResolvedValue(
      jsonResponse(201, { message: 'Service queue created successfully' }),
    );

    await createQueue(TOKEN, 'REQUEST');

    const [url, options] = global.fetch.mock.calls[0];
    expect(String(url).endsWith('/create-service-queue')).toBe(true);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ queueType: 'REQUEST' });
  });

  it('maps "Not enough credits" to the exported copy', async () => {
    global.fetch.mockResolvedValue(jsonResponse(400, { error: 'Not enough credits' }));

    await expect(createQueue(TOKEN, 'REQUEST')).rejects.toMatchObject({
      status: 400,
      message: INSUFFICIENT_CREDITS_MESSAGE,
    });
  });

  it('maps any other 400 to the invalid-input copy', async () => {
    global.fetch.mockResolvedValue(jsonResponse(400, { error: 'Missing parameter: queueType' }));

    await expect(createQueue(TOKEN, 'OFFER')).rejects.toMatchObject({
      status: 400,
      message: INVALID_INPUT_MESSAGE,
    });
  });

  it('maps a 401 to the copy for a session the backend refuses', async () => {
    global.fetch.mockResolvedValue(jsonResponse(401, { error: 'User not authenticated' }));

    await expect(createQueue(TOKEN, 'OFFER')).rejects.toMatchObject({
      status: 401,
      message: 'Devi accedere per usare le code.',
    });
  });
});

describe('cancelQueue', () => {
  it('rejects a non-integer or non-positive id without calling fetch', async () => {
    await expect(cancelQueue(TOKEN, '7')).rejects.toMatchObject({
      status: 400,
      message: INVALID_INPUT_MESSAGE,
    });
    await expect(cancelQueue(TOKEN, 2.5)).rejects.toMatchObject({ status: 400 });
    await expect(cancelQueue(TOKEN, 0)).rejects.toMatchObject({ status: 400 });
    await expect(cancelQueue(TOKEN, -3)).rejects.toMatchObject({ status: 400 });
    await expect(cancelQueue(TOKEN, null)).rejects.toMatchObject({ status: 400 });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('posts to cancel-queue/{id} for a valid id', async () => {
    global.fetch.mockResolvedValue(
      jsonResponse(200, { message: 'Service queue cancelled successfully' }),
    );

    await cancelQueue(TOKEN, 7);

    const [url, options] = global.fetch.mock.calls[0];
    expect(String(url).endsWith('/cancel-queue/7')).toBe(true);
    expect(options.method).toBe('POST');
  });

  it('maps a 404 to the copy for a queue that is already gone', async () => {
    global.fetch.mockResolvedValue(jsonResponse(404, { error: 'Queue not found' }));

    await expect(cancelQueue(TOKEN, 7)).rejects.toMatchObject({
      status: 404,
      message: 'Non trovo più questa coda: potrebbe essere già chiusa.',
    });
  });
});
