/**
 * Date formatting shared by the catalog card and the detail panel.
 *
 * The locale is explicit (`it-IT`) so the string is the same on web, Android
 * and iOS; an invalid or missing date returns `null` and the row is not drawn
 * instead of showing an invented placeholder.
 */
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
