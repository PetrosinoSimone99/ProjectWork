/**
 * The user report: statuses, labels and the reason rule.
 *
 * `POST /reports` creates a report with a free-text reason; the staff list and
 * review work on the four statuses of `UserReport::STATUS_*`. The author always
 * comes from the JWT, never from the body, and the app never shows the report's
 * status back to the reporting user: the endpoint that would is not exposed.
 */

/** The four statuses of `UserReport::STATUS_*`. */
export const REPORT_STATUS = {
  PENDING: 'PENDING',
  IN_REVIEW: 'IN_REVIEW',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
};

/** Italian labels; a status we do not know is shown raw, never translated. */
export const REPORT_STATUS_LABELS = {
  [REPORT_STATUS.PENDING]: 'Aperta',
  [REPORT_STATUS.IN_REVIEW]: 'In esame',
  [REPORT_STATUS.CONFIRMED]: 'Confermata',
  [REPORT_STATUS.REJECTED]: 'Respinta',
};

/** Chip tones: pending neutral, in review amber, closed green or red. */
const REPORT_STATUS_TONES = {
  [REPORT_STATUS.PENDING]: 'info',
  [REPORT_STATUS.IN_REVIEW]: 'accent',
  [REPORT_STATUS.CONFIRMED]: 'success',
  [REPORT_STATUS.REJECTED]: 'danger',
};

/** A status in the single upper-case form the UI compares against. */
function statusKey(status) {
  return typeof status === 'string' ? status.trim().toUpperCase() : '';
}

/** The label of a status; unknown values stay as they are. */
export function statusLabel(status) {
  const key = statusKey(status);
  if (key === '') {
    return null;
  }
  return REPORT_STATUS_LABELS[key] ?? key;
}

/** The chip tone of a status; unknown values are neutral. */
export function statusTone(status) {
  return REPORT_STATUS_TONES[statusKey(status)] ?? 'info';
}
