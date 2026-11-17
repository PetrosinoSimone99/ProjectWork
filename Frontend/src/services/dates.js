/**
 * Date formatting shared by the catalog card, the detail panel and the date
 * field of the agreement sheet.
 *
 * The locale is explicit (`it-IT`) so the string is the same on web, Android
 * and iOS; an invalid or missing date returns `null` and the row is not drawn
 * instead of showing an invented placeholder.
 *
 * The three helpers at the bottom are the field's boundary: the form state and
 * the wire carry `YYYY-MM-DD`, the field shows `GG/MM/AAAA`, and the platform
 * picker works on a `Date`. Nothing here reads the clock and nothing invents a
 * time: only the calendar day crosses.
 */

/** Two digits, zero-padded: the shape both directions print. */
function pad2(value) {
  return String(value).padStart(2, '0');
}

/** Parsed date or `null`: the single guard the two formatters share. */
function isoDateOrNull(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatIsoDate(value) {
  const date = isoDateOrNull(value);
  return date === null
    ? null
    : date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Day and minute for a row whose moment matters (a chat message): the date
 * alone hides the order inside one day, the time alone hides the day.
 */
export function formatIsoDateTime(value) {
  const date = isoDateOrNull(value);
  return date === null
    ? null
    : date.toLocaleString('it-IT', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
}

/**
 * One `YYYY-MM-DD` day as a local `Date` at noon, or `null` when the string is
 * not a real calendar day (`2026-02-31` must not become 3 March).
 *
 * Noon, not midnight: an hour of daylight saving never moves the day, and the
 * picker then reads back the same day it was given. The round trip through the
 * local getters is also what rejects a day that does not exist.
 */
export function dateFromIsoDate(value) {
  const testo = typeof value === 'string' ? value.trim() : '';
  const pezzi = /^(\d{4})-(\d{2})-(\d{2})$/.exec(testo);
  if (pezzi === null) {
    return null;
  }
  const anno = Number(pezzi[1]);
  const mese = Number(pezzi[2]);
  const giorno = Number(pezzi[3]);
  const data = new Date(anno, mese - 1, giorno, 12, 0, 0, 0);
  return data.getFullYear() === anno && data.getMonth() + 1 === mese && data.getDate() === giorno
    ? data
    : null;
}

/**
 * The local calendar day of `data` as `YYYY-MM-DD`, `null` when it is not a
 * valid `Date`.
 *
 * The getters are the local ones on purpose: `toISOString()` prints UTC, so a
 * local midnight east of UTC would leave as the day before and the reader would
 * store a date they never chose.
 */
export function isoDateFromDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return null;
  }
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

/**
 * The day the field shows, `01/12/2026`, or `''` for an empty and for an
 * unusable value: the field then falls back to its `GG/MM/AAAA` placeholder
 * instead of printing a date nobody entered.
 */
export function formatIsoDateNumeric(value) {
  const data = dateFromIsoDate(value);
  return data === null ? '' : `${pad2(data.getDate())}/${pad2(data.getMonth() + 1)}/${data.getFullYear()}`;
}
