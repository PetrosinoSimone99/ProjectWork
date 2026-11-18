/**
 * Form validation: pure functions, one message per rule, Italian copy.
 *
 * Each function returns the first Italian error message for the value, or
 * `null` when the value is acceptable. Business rules (uniqueness, own-service
 * checks, agreement state) stay on the backend, which is the only authority;
 * this module covers shape only: required, length, e-mail format, and a photo
 * URL that is an https address of at most 2048 characters.
 *
 * No schema library (recorded decision 20 in `plan-brief.md`): the rules are
 * few and hand-written, so a dependency would buy nothing.
 */

/** Local part + domain + dot + suffix: enough to catch typing mistakes. */
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

/** The backend requires at least 8 characters (`AuthController`). */
export const MIN_PASSWORD_LENGTH = 8;

/** The backend refuses a longer value (`ProfileController::validateField`). */
const PHOTO_URL_MAX_LENGTH = 2048;

/** The scheme the backend insists on (`ProfileController::validateField`). */
const HTTPS_SCHEME_PATTERN = /^https:\/\//i;

/** Host after the scheme, no whitespace: the shape `FILTER_VALIDATE_URL` asks for. */
const HTTPS_URL_PATTERN = /^https:\/\/[^\s/?#]+\S*$/i;

/** Characters as `mb_strlen` counts them: code points, not UTF-16 units. */
export function countCharacters(text) {
  return typeof text === 'string' ? [...text].length : 0;
}

/** Required short text; the message names the field. */
export function requiredError(value, message) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? message : null;
}

/** Report reason: 1–2000 characters, as `ReportController::create` asks. */
export const REPORT_REASON_MAX = 2000;

export function reasonError(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text === '') {
    return 'Racconta il fatto: senza una descrizione la segnalazione non parte.';
  }
  return countCharacters(text) > REPORT_REASON_MAX
    ? `La descrizione può avere al massimo ${REPORT_REASON_MAX} caratteri.`
    : null;
}

/** Maximum length in characters, with a message that states the limit. */
export function maxLengthError(value, max, message) {
  return countCharacters(typeof value === 'string' ? value.trim() : '') > max ? message : null;
}

/** E-mail format; an empty value is reported as missing, not as malformed. */
export function emailError(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text === '') {
    return "L'email è obbligatoria.";
  }
  return EMAIL_PATTERN.test(text) ? null : "Inserisci un'email valida.";
}

/** Password length; the form never constrains the character set. */
export function passwordError(value) {
  const text = typeof value === 'string' ? value : '';
  if (text === '') {
    return 'La password è obbligatoria.';
  }
  return text.length < MIN_PASSWORD_LENGTH
    ? `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`
    : null;
}

/**
 * Photo URL shape, exactly what the backend enforces: https, a URL, 2048
 * characters at most. No extension requirement, so a CDN address without
 * `.jpg`/`.png` passes. Empty means "no photo", which is allowed: the profile
 * clears the field with `null`.
 */
export function photoUrlError(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text === '') {
    return null;
  }
  if (!HTTPS_SCHEME_PATTERN.test(text)) {
    return "L'indirizzo dell'immagine deve iniziare con https://.";
  }
  if (!HTTPS_URL_PATTERN.test(text)) {
    return "L'indirizzo dell'immagine non è valido: controlla di averlo copiato per intero.";
  }
  if (countCharacters(text) > PHOTO_URL_MAX_LENGTH) {
    return `L'indirizzo dell'immagine può avere al massimo ${PHOTO_URL_MAX_LENGTH} caratteri.`;
  }
  return null;
}
