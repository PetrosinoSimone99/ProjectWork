import { REPORT_STATUS } from './reports';

/**
 * The staff review as pure functions: who may claim, who may review, and what a
 * valid review looks like.
 *
 * The rules mirror the backend (`StaffController`): a claim is possible only on
 * a `PENDING` report, a review only on an `IN_REVIEW` report assigned to the
 * caller, and the note (1–2000 characters) is mandatory because it records what
 * the decision was based on. Hiding a command is not protecting: every `403`
 * and `409` is a normal outcome the screen shows.
 */

/** The two outcomes of a review, as the endpoint spells them. */
export const REVIEW_OUTCOMES = {
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
};

/** Italian labels of the outcomes, for the choice buttons and the confirm sheet. */
export const REVIEW_LABELS = {
  [REVIEW_OUTCOMES.CONFIRMED]: 'Conferma la segnalazione',
  [REVIEW_OUTCOMES.REJECTED]: 'Respingi la segnalazione',
};

/** The review note limit of `StaffController::review`. */
export const REVIEW_NOTE_MAX = 2000;

/** A claim is possible only while nobody has taken the report. */
export function canClaim(report) {
  return report?.stato === REPORT_STATUS.PENDING;
}

/** Only the staff member who claimed the report can close it. */
export function canReview(report, staffId) {
  if (report?.stato !== REPORT_STATUS.IN_REVIEW) {
    return false;
  }
  if (report?.assegnataA?.id === null || report?.assegnataA?.id === undefined) {
    return false;
  }
  return Number(report.assegnataA.id) === Number(staffId);
}

/** A closed report accepts no action at all. */
export function isClosed(report) {
  return (
    report?.stato === REPORT_STATUS.CONFIRMED || report?.stato === REPORT_STATUS.REJECTED
  );
}

/** A review in progress: no outcome, empty note, ready for the sheet. */
export function emptyReview() {
  return { outcome: null, note: '' };
}

/**
 * Errors of the review form, an empty object when it is valid.
 * Shape only: whether this staff member may close *this* report is the backend's
 * answer, and the screen shows it.
 */
export function validateReview({ outcome, note } = {}) {
  const errors = {};
  if (!Object.values(REVIEW_OUTCOMES).includes(outcome)) {
    errors.outcome = "Scegli l'esito della segnalazione.";
  }
  const text = typeof note === 'string' ? note.trim() : '';
  if (text === '') {
    errors.note = 'Scrivi su cosa si basa la decisione.';
  } else if (text.length > REVIEW_NOTE_MAX) {
    errors.note = `La nota può avere al massimo ${REVIEW_NOTE_MAX} caratteri.`;
  }
  return errors;
}
