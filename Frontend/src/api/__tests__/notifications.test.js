import { normalizeNotification, normalizeNotifications } from '../normalizers';
import {
  NOTIFICATIONS_MAX_PAGE_SIZE,
  NOTIFICATIONS_PAGE_SIZE,
  deleteNotification,
  getNotifications,
  markNotificationRead,
} from '../areas/notifications';

jest.mock('../client', () => ({
  apiFetch: jest.fn(),
}));

// eslint-disable-next-line import/first
import { apiFetch } from '../client';

/** One row exactly as `GET /notifications` sends it. */
function wireRow(overrides = {}) {
  return {
    id: 7,
    type: 'AGREEMENT_PROPOSAL',
    message: 'Nuova proposta di scambio da @giulia.bianchi.',
    data: { agreementId: 12 },
    createdAt: '2026-11-15T10:00:00+00:00',
    readAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  apiFetch.mockReset();
});

describe('normalizeNotification', () => {
  it('turns a wire row into the shape the screen reads', () => {
    const notification = normalizeNotification(wireRow());

    expect(notification).toEqual({
      id: 7,
      tipo: 'AGREEMENT_PROPOSAL',
      messaggio: 'Nuova proposta di scambio da @giulia.bianchi.',
      dati: { agreementId: 12 },
      creataIl: '2026-11-15T10:00:00+00:00',
      lettaIl: null,
      letta: false,
    });
  });

  it('reads readAt as the boolean a row actually needs', () => {
    const notification = normalizeNotification(wireRow({ readAt: '2026-11-15T11:00:00+00:00' }));

    expect(notification.letta).toBe(true);
    expect(notification.lettaIl).toBe('2026-11-15T11:00:00+00:00');
  });

  it('upper-cases the free-form type, so the scheduler lowercase event matches', () => {
    expect(normalizeNotification(wireRow({ type: 'agreement_completed' })).tipo).toBe(
      'AGREEMENT_COMPLETED',
    );
  });

  it('drops a row without an id instead of drawing an empty one', () => {
    expect(normalizeNotification(wireRow({ id: null }))).toBeNull();
    expect(normalizeNotification(null)).toBeNull();
  });

  it('keeps a missing data object as null rather than an empty one', () => {
    expect(normalizeNotification(wireRow({ data: undefined })).dati).toBeNull();
  });
});

describe('normalizeNotifications', () => {
  it('reads the envelope: list, pagination and unread count', () => {
    const page = normalizeNotifications({
      notifications: [wireRow(), wireRow({ id: 8, readAt: '2026-11-15T11:00:00+00:00' })],
      pagination: { page: 1, limit: 20, totalItems: 2, totalPages: 1 },
      unreadCount: 1,
    });

    expect(page.elementi).toHaveLength(2);
    expect(page.paginazione).toEqual({
      pagina: 1,
      limite: 20,
      elementiTotali: 2,
      pagineTotali: 1,
    });
    expect(page.nonLette).toBe(1);
  });

  it('answers an empty page for an account with no notifications', () => {
    expect(normalizeNotifications({ notifications: [], pagination: {}, unreadCount: 0 })).toEqual({
      elementi: [],
      paginazione: {
        pagina: null,
        limite: null,
        elementiTotali: null,
        pagineTotali: null,
      },
      nonLette: 0,
    });
    expect(normalizeNotifications(undefined).nonLette).toBe(0);
  });
});

describe('notifications area', () => {
  it('asks the list with the three parameters the backend accepts, and nothing else', async () => {
    apiFetch.mockResolvedValue({ notifications: [], pagination: {}, unreadCount: 0 });

    await getNotifications('token-123');

    expect(apiFetch).toHaveBeenCalledWith(
      `notifications?page=1&limit=${NOTIFICATIONS_PAGE_SIZE}&unreadOnly=false`,
      { token: 'token-123' },
    );
  });

  it('passes unreadOnly through when the screen asks for unread rows', async () => {
    apiFetch.mockResolvedValue({ notifications: [], pagination: {}, unreadCount: 4 });

    const page = await getNotifications('token-123', { page: 2, unreadOnly: true });

    expect(apiFetch).toHaveBeenCalledWith(
      `notifications?page=2&limit=${NOTIFICATIONS_PAGE_SIZE}&unreadOnly=true`,
      { token: 'token-123' },
    );
    expect(page.nonLette).toBe(4);
  });

  it('clamps a page size outside the 1..50 window instead of sending a 400', async () => {
    apiFetch.mockResolvedValue({ notifications: [], pagination: {}, unreadCount: 0 });

    await getNotifications('token-123', { limit: 500 });
    await getNotifications('token-123', { limit: 0 });

    expect(apiFetch).toHaveBeenNthCalledWith(
      1,
      `notifications?page=1&limit=${NOTIFICATIONS_MAX_PAGE_SIZE}&unreadOnly=false`,
      { token: 'token-123' },
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      2,
      `notifications?page=1&limit=${NOTIFICATIONS_PAGE_SIZE}&unreadOnly=false`,
      { token: 'token-123' },
    );
  });

  it('marks one notification as read and returns the updated row', async () => {
    apiFetch.mockResolvedValue({
      notification: wireRow({ readAt: '2026-11-15T12:00:00+00:00' }),
    });

    const updated = await markNotificationRead('token-123', 7);

    expect(apiFetch).toHaveBeenCalledWith('notifications/7/read', {
      method: 'PATCH',
      token: 'token-123',
    });
    expect(updated.letta).toBe(true);
  });

  it('deletes one notification without expecting a body', async () => {
    apiFetch.mockResolvedValue(null);

    await deleteNotification('token-123', 7);

    expect(apiFetch).toHaveBeenCalledWith('notifications/7', {
      method: 'DELETE',
      token: 'token-123',
    });
  });
});
