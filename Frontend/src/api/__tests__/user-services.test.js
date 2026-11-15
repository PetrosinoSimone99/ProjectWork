import { normalizeUserServices } from '../normalizers';
import { getUserServices } from '../areas/services';

jest.mock('../client', () => ({
  ApiError: class ApiError extends Error {
    constructor(status, message, detail = null) {
      super(message);
      this.status = status;
      this.detail = detail;
    }
  },
  apiFetch: jest.fn(),
}));

// eslint-disable-next-line import/first
import { apiFetch } from '../client';

/** One row exactly as `GET /users/{id}/services` sends it. */
function wireService(overrides = {}) {
  return {
    id: 12,
    type: 'OFFER',
    description: 'Riparazione biciclette',
    location: 'Milano (Lombardia)',
    isRemote: false,
    isSuspended: false,
    createdAt: '2026-11-10T09:00:00+00:00',
    categories: [{ id: 3, description: 'Riparazioni' }],
    ...overrides,
  };
}

const ENVELOPE = {
  user: {
    id: 7,
    name: 'Mario',
    surname: 'Rossi',
    username: 'mario.rossi',
    location: 'Milano (Lombardia)',
    bio: null,
    profileImageUrl: null,
  },
  offers: [wireService()],
  requests: [wireService({ id: 13, type: 'REQUEST', description: 'Lezioni di chitarra' })],
};

beforeEach(() => {
  apiFetch.mockReset();
});

describe('normalizeUserServices', () => {
  it('reads the envelope into the person and their two lists', () => {
    const dati = normalizeUserServices(ENVELOPE);

    expect(dati.utente).toEqual({
      id: 7,
      username: 'mario.rossi',
      nome: 'Mario',
      cognome: 'Rossi',
      localita: 'Milano (Lombardia)',
      bio: null,
      immagineProfilo: null,
    });
    expect(dati.offerte).toHaveLength(1);
    expect(dati.richieste).toHaveLength(1);
    expect(dati.offerte[0]).toMatchObject({
      id: 12,
      tipo: 'OFFER',
      descrizione: 'Riparazione biciclette',
      daRemoto: false,
    });
    expect(dati.richieste[0].tipo).toBe('REQUEST');
  });

  it('gives every row the envelope person as its owner, so the card does not refetch', () => {
    const dati = normalizeUserServices(ENVELOPE);

    expect(dati.offerte[0].offerente.username).toBe('mario.rossi');
    expect(dati.richieste[0].offerente.id).toBe(7);
  });

  it('drops a row without a description and answers empty lists for a missing envelope', () => {
    expect(normalizeUserServices({ ...ENVELOPE, offers: [wireService({ description: '' })] }).offerte).toEqual(
      [],
    );
    expect(normalizeUserServices(undefined)).toMatchObject({ offerte: [], richieste: [] });
  });
});

describe('getUserServices', () => {
  it('asks the endpoint with the id and returns the normalised envelope', async () => {
    apiFetch.mockResolvedValue(ENVELOPE);

    const dati = await getUserServices('token-123', 7);

    expect(apiFetch).toHaveBeenCalledWith('users/7/services', { token: 'token-123' });
    expect(dati.utente.username).toBe('mario.rossi');
  });

  it('never sends an id that is not a positive integer', async () => {
    await expect(getUserServices('token-123', null)).rejects.toMatchObject({ status: 400 });
    await expect(getUserServices('token-123', 0)).rejects.toMatchObject({ status: 400 });
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
