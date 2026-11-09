/**
 * Date formatting shared by the catalog card and the detail panel.
 *
 * The locale is explicit (`it-IT`) so the string is the same on web, Android
 * and iOS; an invalid or missing date returns `null` and the row is not drawn
 * instead of showing an invented placeholder.
 */
export function formatIsoDate(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}
