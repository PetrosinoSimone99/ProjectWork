import { etichettaTipo, iconaTipo, quandoNotifica } from '../NotificationRow';

/**
 * The row's two pure decisions: which label and icon a backend `type` gets, and
 * how its timestamp reads.
 *
 * The literals come from the backend (`Backend/src/**`, `AgreementManager`,
 * `ChatManager`, `StaffController`, `AgreementEndDateChecker`), copied by hand:
 * a test that parsed the PHP would fail for reasons unrelated to a label.
 */
const TIPI_NOTI = [
  'AGREEMENT_PROPOSAL',
  'AGREEMENT_RESPONSE',
  'AGREEMENT_DETAILS',
  'AGREEMENT_DETAILS_ACCEPTED',
  'AGREEMENT_CANCELLED',
  'AGREEMENT_COMPLETED',
  'CHAT_MESSAGE',
  'MATCH_CREATED',
  'REPORT_CLAIMED',
  'REPORT_REVIEWED',
  'SERVICE_RESTORED',
  'USER_PROMOTED',
  'USER_STATUS_CHANGED',
];

describe('etichettaTipo', () => {
  it('gives every backend type a readable label', () => {
    for (const tipo of TIPI_NOTI) {
      const etichetta = etichettaTipo(tipo);
      expect(typeof etichetta).toBe('string');
      expect(etichetta.length).toBeGreaterThan(0);
      expect(etichetta).not.toBe('Notifica');
    }
  });

  it('falls back to the generic label for a type it has never seen', () => {
    expect(etichettaTipo('SOMETHING_NEW')).toBe('Notifica');
    expect(etichettaTipo(null)).toBe('Notifica');
    expect(etichettaTipo(undefined)).toBe('Notifica');
  });

  it('matches the lower-case type the scheduler writes', () => {
    expect(etichettaTipo('agreement_completed')).toBe('Completato');
  });
});

describe('iconaTipo', () => {
  it('gives every backend type an icon and the bell to the unknown ones', () => {
    for (const tipo of TIPI_NOTI) {
      expect(iconaTipo(tipo)).toMatch(/-outline$/);
    }
    expect(iconaTipo('SOMETHING_NEW')).toBe('notifications-outline');
  });
});

describe('quandoNotifica', () => {
  it('reads the date and the time, so two notifications of the same day differ', () => {
    const quando = quandoNotifica('2026-11-15T10:00:00+00:00');

    expect(quando).toContain('2026');
    expect(quando).toContain(':');
  });

  it('answers null for a missing or unparseable value, so the row draws no date', () => {
    expect(quandoNotifica(null)).toBeNull();
    expect(quandoNotifica('')).toBeNull();
    expect(quandoNotifica('non-una-data')).toBeNull();
  });
});
