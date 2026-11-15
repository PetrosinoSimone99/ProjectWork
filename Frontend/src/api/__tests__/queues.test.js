import { normalizeQueue, normalizeQueues } from '../normalizers';

/**
 * `GET /get-queues` normalisation.
 *
 * The shape is `{queues: [{id, queueType, queueStatus, location,
 * serviceDescription, serviceCategory, serviceRemote, agreementId}]}`
 * (`docs/api.md`, `ServiceQueueDTO`). The two things the UI must not guess:
 * the wire words stay wire words (upper-cased only), and a row without an id
 * cannot be cancelled, so it never reaches the screen.
 */
const RIGA = {
  id: 7,
  queueType: 'REQUEST',
  queueStatus: 'OPEN',
  location: 'Milano (Lombardia)',
  serviceDescription: 'Ripasso di teoria musicale',
  serviceCategory: 'Musica',
  serviceRemote: false,
  agreementId: null,
};

describe('normalizeQueue', () => {
  it('keeps the wire words and the row fields, upper-cased once', () => {
    expect(normalizeQueue(RIGA)).toEqual({
      id: 7,
      tipo: 'REQUEST',
      stato: 'OPEN',
      localita: 'Milano (Lombardia)',
      descrizione: 'Ripasso di teoria musicale',
      categoria: 'Musica',
      daRemoto: false,
      agreementId: null,
    });
  });

  it('drops a row without an id, because it could never be cancelled', () => {
    expect(normalizeQueue({ ...RIGA, id: null })).toBeNull();
    expect(normalizeQueue({ ...RIGA, id: undefined })).toBeNull();
  });

  it('returns null for a malformed row instead of throwing', () => {
    expect(normalizeQueue(null)).toBeNull();
    expect(normalizeQueue('not a row')).toBeNull();
  });

  it('turns a missing category, location or remote flag into null, not into a guess', () => {
    const spoglia = normalizeQueue({
      id: 8,
      queueType: 'OFFER',
      queueStatus: 'IN_PROGRESS',
      agreementId: 12,
    });
    expect(spoglia.categoria).toBeNull();
    expect(spoglia.localita).toBeNull();
    expect(spoglia.descrizione).toBeNull();
    expect(spoglia.daRemoto).toBeNull();
    expect(spoglia.agreementId).toBe(12);
  });

  it('reads a queue already attached to an agreement', () => {
    expect(normalizeQueue({ ...RIGA, queueStatus: 'CLOSED', agreementId: 3 }).agreementId).toBe(3);
  });
});

describe('normalizeQueues', () => {
  it('reads response.queues and keeps the order the backend sent', () => {
    const elenco = normalizeQueues({
      queues: [RIGA, { ...RIGA, id: 9, queueType: 'OFFER' }],
    });
    expect(elenco.map((coda) => coda.id)).toEqual([7, 9]);
    expect(elenco.map((coda) => coda.tipo)).toEqual(['REQUEST', 'OFFER']);
  });

  it('returns an empty list for a missing or malformed envelope, never a throw', () => {
    expect(normalizeQueues(undefined)).toEqual([]);
    expect(normalizeQueues({})).toEqual([]);
    expect(normalizeQueues({ queues: 'nope' })).toEqual([]);
  });

  it('filters the rows it cannot act on without dropping the good ones', () => {
    const elenco = normalizeQueues({ queues: [RIGA, { queueType: 'OFFER' }, null] });
    expect(elenco).toHaveLength(1);
    expect(elenco[0].id).toBe(7);
  });
});
