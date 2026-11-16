import { formatIsoDate, formatIsoDateTime } from '../dates';

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
