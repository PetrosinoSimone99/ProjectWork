import {
  dateFromIsoDate,
  formatIsoDate,
  formatIsoDateNumeric,
  formatIsoDateTime,
  isoDateFromDate,
} from '../dates';

/**
 * The two formatters the screens read.
 *
 * The locale is pinned (`it-IT`) so the same row prints the same string on web,
 * Android and iOS; the invalid input path returns `null` so a row is not drawn
 * instead of showing an invented date. These tests exist because the chat
 * bubble leans on `formatIsoDateTime` and nothing covered it.
 */
describe('formatIsoDate', () => {
  it('prints the day in the Italian short month', () => {
    expect(formatIsoDate('2026-11-16T14:03:22+00:00')).toBe('16 nov 2026');
  });

  it('returns null for anything that is not a date', () => {
    expect(formatIsoDate(null)).toBe(null);
    expect(formatIsoDate('')).toBe(null);
    expect(formatIsoDate('   ')).toBe(null);
    expect(formatIsoDate('non-una-data')).toBe(null);
  });
});

describe('formatIsoDateTime', () => {
  it('prints day and minute, so the order inside one day survives', () => {
    const resa = formatIsoDateTime('2026-11-16T14:03:22+00:00');
    // The machine's timezone moves the hour, never the day or the shape.
    expect(resa).toMatch(/^16 nov, \d{2}:\d{2}$/);
  });

  it('returns null for anything that is not a date', () => {
    expect(formatIsoDateTime(null)).toBe(null);
    expect(formatIsoDateTime(undefined)).toBe(null);
    expect(formatIsoDateTime('non-una-data')).toBe(null);
  });
});

/**
 * The boundary of the date field: the day that enters and the day that leaves.
 *
 * The picker hands over a `Date`, the sheet and the wire speak `YYYY-MM-DD`.
 * Everything the reader would notice — a day that moves by one, a day that does
 * not exist — is decided here, so this is what the tests measure, not the
 * field's appearance.
 */
describe('dateFromIsoDate', () => {
  it('reads the ISO day as the same local day, at noon', () => {
    const data = dateFromIsoDate('2026-12-01');
    expect(data.getFullYear()).toBe(2026);
    expect(data.getMonth()).toBe(11);
    expect(data.getDate()).toBe(1);
    expect(data.getHours()).toBe(12);
  });

  it('refuses a day that does not exist instead of rolling it over', () => {
    expect(dateFromIsoDate('2026-02-31')).toBe(null);
    expect(dateFromIsoDate('2027-02-29')).toBe(null);
    expect(dateFromIsoDate('2026-13-01')).toBe(null);
  });

  it('returns null for an empty field and for anything that is not a day', () => {
    expect(dateFromIsoDate('')).toBe(null);
    expect(dateFromIsoDate('   ')).toBe(null);
    expect(dateFromIsoDate(null)).toBe(null);
    expect(dateFromIsoDate('01/12/2026')).toBe(null);
    expect(dateFromIsoDate('2026-12-01T00:00:00+00:00')).toBe(null);
  });
});

describe('isoDateFromDate', () => {
  it('prints the local calendar day, never the UTC one', () => {
    // A local half past midnight is the day before in UTC for any positive
    // offset: the getters are local, `toISOString()` would answer 2025-12-31.
    const notte = new Date(2026, 0, 1, 0, 30, 0);
    expect(isoDateFromDate(notte)).toBe('2026-01-01');
  });

  it('keeps the day the reader picked, through the round trip', () => {
    for (const giorno of ['2026-12-01', '2027-02-28', '2026-01-01', '2026-12-31']) {
      expect(isoDateFromDate(dateFromIsoDate(giorno))).toBe(giorno);
    }
  });

  it('returns null for anything that is not a usable Date', () => {
    expect(isoDateFromDate(null)).toBe(null);
    expect(isoDateFromDate('2026-12-01')).toBe(null);
    expect(isoDateFromDate(new Date(Number.NaN))).toBe(null);
  });
});

describe('formatIsoDateNumeric', () => {
  it('shows the day as GG/MM/AAAA', () => {
    expect(formatIsoDateNumeric('2026-12-01')).toBe('01/12/2026');
    expect(formatIsoDateNumeric('2027-02-28')).toBe('28/02/2027');
  });

  it('returns an empty string when there is no day to show', () => {
    expect(formatIsoDateNumeric('')).toBe('');
    expect(formatIsoDateNumeric(null)).toBe('');
    expect(formatIsoDateNumeric('2026-02-31')).toBe('');
  });
});
