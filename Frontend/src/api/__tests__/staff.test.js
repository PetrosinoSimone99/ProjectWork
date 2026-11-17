import { normalizeStaffDeletedServices, normalizeStaffOperation } from '../normalizers';
import {
  getStaffOperation,
  getStaffReport,
  listStaffDeletedServices,
  restoreStaffService,
} from '../areas/staff';

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
import { ApiError, apiFetch } from '../client';

/** Una riga di `GET /staff/services/deleted`: servizio + proprietario + data. */
function wireDeletedService(overrides = {}) {
  return {
    id: 42,
    type: 'REQUEST',
    description: 'Ripetizioni di matematica',
    location: 'Bologna (Emilia-Romagna)',
    isRemote: false,
    isSuspended: false,
    createdAt: '2026-11-10T09:00:00+00:00',
    deletedAt: '2026-11-12T08:30:00+00:00',
    categories: [{ id: 5, description: 'Lezioni' }],
    owner: {
      id: 21,
      name: 'Giulia',
      surname: 'Bianchi',
      username: 'giulia.bianchi',
      location: 'Bologna (Emilia-Romagna)',
    },
    ...overrides,
  };
}

const DELETED_ENVELOPE = {
  services: [wireDeletedService()],
  pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
};

const REPORT = {
  id: 8,
  reason: 'Insieme di messaggi offensivi',
  createdAt: '2026-11-11T10:00:00+00:00',
  reporter: { id: 3, name: 'Anna', surname: 'Verdi', username: 'anna.verdi' },
  reportedUser: { id: 4, name: 'Luca', surname: 'Neri', username: 'luca.neri' },
  status: 'IN_REVIEW',
  assignedTo: { id: 1, name: 'Staff', surname: 'One', username: 'staff.one' },
  assignedAt: '2026-11-11T11:00:00+00:00',
  reviewNote: null,
  reviewedBy: null,
  reviewedAt: null,
};

const OPERATION = {
  id: 77,
  actor: { id: 1, username: 'staff.one' },
  action: 'USER_SUSPENDED',
  target: { type: 'USER', id: 4 },
  createdAt: '2026-11-12T07:45:00+00:00',
};

beforeEach(() => {
  apiFetch.mockReset();
});

describe('normalizeStaffDeletedServices', () => {
  it('reads every service with its owner and its deletion date', () => {
    const dati = normalizeStaffDeletedServices(DELETED_ENVELOPE);

    expect(dati.servizi).toHaveLength(1);
    expect(dati.servizi[0]).toMatchObject({
      chiave: 'RICERCA-42',
      id: 42,
      tipo: 'RICERCA',
      mansione: 'Ripetizioni di matematica',
      localita: 'Bologna (Emilia-Romagna)',
      idCategoria: 5,
      categoryIds: [5],
      // La riga wire porta il nome della categoria: la lista staff lo mostra
      // senza chiedere `GET /categories` (che non è una rotta dello staff).
      categoriaNome: 'Lezioni',
      eliminataIl: '2026-11-12T08:30:00+00:00',
    });
    expect(dati.servizi[0].proprietario).toEqual({
      id: 21,
      username: 'giulia.bianchi',
      nome: 'Giulia',
      cognome: 'Bianchi',
    });
    expect(dati.paginazione).toEqual({
      pagina: 1,
      limite: 20,
      elementiTotali: 1,
      pagineTotali: 1,
    });
  });

  it('drops a row that is neither an offer nor a request', () => {
    const dati = normalizeStaffDeletedServices({
      services: [wireDeletedService({ type: 'OTHER' }), wireDeletedService({ id: 43 })],
    });

    expect(dati.servizi).toHaveLength(1);
    expect(dati.servizi[0].id).toBe(43);
  });

  it('answers an empty list, not an unavailable state, for a missing envelope', () => {
    expect(normalizeStaffDeletedServices(undefined)).toMatchObject({ servizi: [] });
    expect(normalizeStaffDeletedServices({ services: [] }).servizi).toEqual([]);
  });
});

describe('listStaffDeletedServices', () => {
  it('asks the endpoint with the default page and the normalised answer', async () => {
    apiFetch.mockResolvedValue(DELETED_ENVELOPE);

    const dati = await listStaffDeletedServices('token-123');

    // Nessun `method` nell'opzioni: la `GET` e' il default di `apiFetch`.
    expect(apiFetch).toHaveBeenCalledWith('staff/services/deleted?page=1&limit=20', {
      token: 'token-123',
    });
    expect(apiFetch.mock.calls[0][1].method).toBeUndefined();
    expect(dati.servizi[0].proprietario.username).toBe('giulia.bianchi');
  });

  it('passes the requested page through the query, limit unchanged', async () => {
    apiFetch.mockResolvedValue(DELETED_ENVELOPE);

    await listStaffDeletedServices('token-123', { page: 2, limit: 20 });

    expect(apiFetch).toHaveBeenCalledWith('staff/services/deleted?page=2&limit=20', {
      token: 'token-123',
    });
  });

  it('keeps an empty answer an empty list', async () => {
    apiFetch.mockResolvedValue({ services: [], pagination: null });

    const dati = await listStaffDeletedServices('token-123');

    expect(dati.servizi).toEqual([]);
    expect(dati.paginazione.elementiTotali).toBeNull();
  });

  it('answers a 403 with the Italian message of the action table', async () => {
    apiFetch.mockRejectedValue(new ApiError(403, 'Forbidden'));

    await expect(listStaffDeletedServices('token-123')).rejects.toMatchObject({
      status: 403,
      message: 'Questa azione non è permessa con il tuo ruolo.',
    });
  });
});

describe('restoreStaffService', () => {
  it('posts to the restore route with no body and normalises the service', async () => {
    apiFetch.mockResolvedValue({ service: wireDeletedService({ deletedAt: null }) });

    const servizio = await restoreStaffService('token-123', 42);

    expect(apiFetch).toHaveBeenCalledWith('staff/services/42/restore', {
      method: 'POST',
      token: 'token-123',
    });
    expect(apiFetch.mock.calls[0][1].body).toBeUndefined();
    expect(servizio).toMatchObject({ id: 42, tipo: 'RICERCA', eliminataIl: null });
  });

  it('answers a 403 with the Italian message of the action table', async () => {
    apiFetch.mockRejectedValue(new ApiError(403, 'Forbidden', 'ROLE_STAFF required'));

    await expect(restoreStaffService('token-123', 42)).rejects.toMatchObject({
      status: 403,
      message: 'Questa azione non è permessa con il tuo ruolo.',
    });
  });
});

describe('getStaffReport', () => {
  it('asks the report route and normalises the `{report}` envelope', async () => {
    apiFetch.mockResolvedValue({ report: REPORT });

    const segnalazione = await getStaffReport('token-123', 8);

    expect(apiFetch).toHaveBeenCalledWith('staff/reports/8', { token: 'token-123' });
    expect(segnalazione).toMatchObject({
      id: 8,
      motivo: 'Insieme di messaggi offensivi',
      stato: 'IN_REVIEW',
      creataIl: '2026-11-11T10:00:00+00:00',
    });
    expect(segnalazione.autore.username).toBe('anna.verdi');
    expect(segnalazione.segnalato.username).toBe('luca.neri');
    expect(segnalazione.assegnataA.username).toBe('staff.one');
  });

  it('reads a bare report when the envelope is already unwrapped', async () => {
    apiFetch.mockResolvedValue(REPORT);

    const segnalazione = await getStaffReport('token-123', 8);

    expect(segnalazione.id).toBe(8);
  });

  it('answers a 403 with the Italian message of the action table', async () => {
    apiFetch.mockRejectedValue(new ApiError(403, 'Forbidden'));

    await expect(getStaffReport('token-123', 8)).rejects.toMatchObject({
      status: 403,
      message: 'Questa azione non è permessa con il tuo ruolo.',
    });
  });

  it('answers a 404 with the Italian message of the action table', async () => {
    apiFetch.mockRejectedValue(new ApiError(404, 'Not Found'));

    await expect(getStaffReport('token-123', 8)).rejects.toMatchObject({
      status: 404,
      message: 'Non trovo quello che cercavi: potrebbe essere stato rimosso.',
    });
  });
});

describe('normalizeStaffOperation', () => {
  it('keeps `before`/`after` when the operation carries them', () => {
    const operazione = normalizeStaffOperation({
      operation: { ...OPERATION, before: { accountStatus: 'ACTIVE' }, after: { accountStatus: 'INACTIVE' } },
    });

    expect(operazione).toMatchObject({
      id: 77,
      azione: 'USER_SUSPENDED',
      bersaglio: 'USER',
      bersaglioId: 4,
      creataIl: '2026-11-12T07:45:00+00:00',
      prima: { accountStatus: 'ACTIVE' },
      dopo: { accountStatus: 'INACTIVE' },
    });
    expect(operazione.staff).toEqual({ id: 1, username: 'staff.one' });
  });

  it('answers `null` for `before`/`after` when they are absent', () => {
    const operazione = normalizeStaffOperation({ operation: OPERATION });

    expect(operazione.prima).toBeNull();
    expect(operazione.dopo).toBeNull();
  });
});

describe('getStaffOperation', () => {
  it('asks the operation route and normalises `{operation}`', async () => {
    apiFetch.mockResolvedValue({ operation: OPERATION });

    const operazione = await getStaffOperation('token-123', 77);

    expect(apiFetch).toHaveBeenCalledWith('staff/operations/77', { token: 'token-123' });
    expect(apiFetch.mock.calls[0][1].method).toBeUndefined();
    expect(operazione).toMatchObject({ id: 77, azione: 'USER_SUSPENDED', bersaglioId: 4 });
    expect(operazione.prima).toBeNull();
    expect(operazione.dopo).toBeNull();
  });

  it('answers a 404 with the Italian message of the action table', async () => {
    apiFetch.mockRejectedValue(new ApiError(404, 'Not Found'));

    await expect(getStaffOperation('token-123', 77)).rejects.toMatchObject({
      status: 404,
      message: 'Non trovo quello che cercavi: potrebbe essere stato rimosso.',
    });
  });
});
