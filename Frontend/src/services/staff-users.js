import { nomePersona } from './offer-request';

/**
 * The staff → users area: roles, account statuses and what the caller may do.
 *
 * The rules mirror `StaffController::changeUser`:
 * - `POST /users/{id}/promote` adds `ROLE_STAFF`; the client cannot choose a
 *   role, and the target must be `ACTIVE`;
 * - `PATCH /users/{id}/status` changes `accountStatus` between `ACTIVE` and
 *   `INACTIVE`, and is refused on a staff account.
 * Both are refused for the caller's own account (a staff account cannot change
 * its own status; promoting yourself is a no-op). The UI hides the command so
 * nobody hits a wall, and shows the backend's `403`/`409` when it still happens.
 */

/** The two roles of `User::ROLE_*`, in the UI words. */
export const ROLES = { USER: 'ROLE_USER', STAFF: 'ROLE_STAFF' };

/** The two account statuses of `User::STATUS_*`. */
export const ACCOUNT_STATUSES = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' };

export const ROLE_LABELS = { [ROLES.USER]: 'Utente', [ROLES.STAFF]: 'Staff' };

export const ACCOUNT_STATUS_LABELS = {
  [ACCOUNT_STATUSES.ACTIVE]: 'Attivo',
  [ACCOUNT_STATUSES.INACTIVE]: 'Sospeso',
};

/** Chip tones of `ToneChip`; unknown values fall back to neutral. */
const ROLE_TONES = { [ROLES.USER]: 'info', [ROLES.STAFF]: 'service' };
const ACCOUNT_STATUS_TONES = { [ACCOUNT_STATUSES.ACTIVE]: 'success', [ACCOUNT_STATUSES.INACTIVE]: 'danger' };

/** The UI role (`USER`/`STAFF`) of a normalised staff row. */
export function isStaff(user) {
  return user?.ruolo === 'STAFF';
}

/** The raw roles of a row in the UI word, or `null` when unknown. */
export function roleValue(user) {
  if (user?.ruolo === 'STAFF') {
    return ROLES.STAFF;
  }
  return user?.ruolo === 'USER' ? ROLES.USER : null;
}

/** The account status in the single upper-case form the UI compares against. */
export function accountStatusValue(user) {
  const raw = typeof user?.stato === 'string' ? user.stato.trim().toUpperCase() : '';
  return raw === '' ? null : raw;
}

/** `true` when the caller may promote the target to staff. */
export function canPromote(callerId, target) {
  if (!target || target.id === null || target.id === undefined) {
    return false;
  }
  if (Number(target.id) === Number(callerId)) {
    return false;
  }
  return !isStaff(target) && accountStatusValue(target) === ACCOUNT_STATUSES.ACTIVE;
}

/** `true` when the caller may change the target's account status. */
export function canChangeStatus(callerId, target) {
  if (!target || target.id === null || target.id === undefined) {
    return false;
  }
  if (Number(target.id) === Number(callerId)) {
    return false;
  }
  return !isStaff(target);
}

/** The label of a role; unknown values stay raw. */
export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role ?? null;
}

/** The label of an account status; unknown values stay raw. */
export function accountStatusLabel(status) {
  return ACCOUNT_STATUS_LABELS[status] ?? status ?? null;
}

/** The chip tone of a role. */
export function roleTone(role) {
  return ROLE_TONES[role] ?? 'info';
}

/** The chip tone of an account status. */
export function accountStatusTone(status) {
  return ACCOUNT_STATUS_TONES[status] ?? 'info';
}

/** The next status the "activate/deactivate" command would apply. */
export function nextAccountStatus(user) {
  return accountStatusValue(user) === ACCOUNT_STATUSES.ACTIVE
    ? ACCOUNT_STATUSES.INACTIVE
    : ACCOUNT_STATUSES.ACTIVE;
}

/** `Name Surname (@username)`, with what is there. */
export function describeUser(user) {
  const username = typeof user?.username === 'string' ? user.username.trim() : '';
  const name = nomePersona(user);
  return username === '' ? name : `${name} (@${username})`;
}

/** The confirmation sentence of a promotion: says what changes and for whom. */
export function describePromotion(user) {
  return `Rendere ${nomePersona(user)} membro dello staff: potrà esaminare le segnalazioni.`;
}

/** The confirmation sentence of a status change. */
export function describeStatusChange(user, status) {
  const from = accountStatusLabel(accountStatusValue(user)) ?? 'sconosciuto';
  const to = accountStatusLabel(status) ?? status;
  return `Cambiare lo stato di ${nomePersona(user)} da ${from} a ${to}.`;
}

/**
 * The local filter of the list: name, surname and username, case-insensitive,
 * plus role and status when chosen. `null` means "no filter".
 */
export function filterUsers(users, query = '', role = null, status = null) {
  if (!Array.isArray(users)) {
    return [];
  }
  const text = typeof query === 'string' ? query.trim().toLowerCase() : '';
  return users.filter((user) => {
    if (role !== null && roleValue(user) !== role) {
      return false;
    }
    if (status !== null && accountStatusValue(user) !== status) {
      return false;
    }
    if (text === '') {
      return true;
    }
    return [user?.nome, user?.cognome, user?.username].some(
      (field) => typeof field === 'string' && field.toLowerCase().includes(text),
    );
  });
}
