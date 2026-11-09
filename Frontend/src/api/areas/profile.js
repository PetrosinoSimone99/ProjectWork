import { ApiError, apiFetch } from '../client';
import { normalizeProfile } from '../normalizers';

/**
 * Profile area: `GET /profile` and `PATCH /profile`.
 *
 * Editable fields, as the backend allows them
 * (`ProfileController::EDITABLE_FIELDS`): name, surname, location, bio,
 * profileImageUrl. Everything else is rejected by the backend and never sent
 * from here.
 */

/** Generic message for a rejected body (the backend details stay in its log). */
export const INVALID_PROFILE_MESSAGE =
  'Controlla i dati inseriti: manca qualcosa o non è valido.';

/**
 * The UI field to the contract field, with the trimming rule of each:
 * `name`, `surname` and `location` cannot be emptied (the backend answers
 * `400`), while `bio` and `profileImageUrl` can be cleared with `null`.
 */
const PROFILE_FIELDS = {
  nome: { wire: 'name', clears: false },
  cognome: { wire: 'surname', clears: false },
  localita: { wire: 'location', clears: false },
  bio: { wire: 'bio', clears: true },
  immagineProfilo: { wire: 'profileImageUrl', clears: true },
};

/**
 * GET /profile — the only endpoint that returns the viewer's e-mail, plus
 * location, bio and photo URL.
 * A 401 is handled by `client.js` (logout); a 403 (inactive account) and the
 * other errors reach the screen as `ApiError`.
 */
export async function getProfile(token) {
  return normalizeProfile(await apiFetch('profile', { token }));
}

/**
 * PATCH /profile — saves only the fields that actually changed.
 *
 * `changes` carries the UI keys (`nome`, `cognome`, `localita`, `bio`,
 * `immagineProfilo`) and **only the changed ones**: what is not touched does
 * not travel, so the backend's "at least one field" invariant holds without
 * special cases. An empty string clears a clearable field (sent as `null`) and
 * is a validation error on the others — the screen checks that first.
 */
export async function updateProfile(token, changes) {
  const body = {};
  for (const [uiField, rule] of Object.entries(PROFILE_FIELDS)) {
    if (!changes || !(uiField in changes)) {
      continue;
    }
    const raw = changes[uiField];
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (text === '') {
      if (!rule.clears) {
        throw new ApiError(400, INVALID_PROFILE_MESSAGE);
      }
      body[rule.wire] = null;
    } else {
      body[rule.wire] = text;
    }
  }
  if (Object.keys(body).length === 0) {
    throw new ApiError(400, 'Nessuna modifica da salvare.');
  }
  return normalizeProfile(await apiFetch('profile', { token, method: 'PATCH', body }));
}
