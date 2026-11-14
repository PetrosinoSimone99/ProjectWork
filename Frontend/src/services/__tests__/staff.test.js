import {
  OPERATION_ACTION_LABELS,
  OPERATION_TARGET_LABELS,
  operationActionLabel,
  operationTargetLabel,
  puoEntrareNellAreaStaff,
} from '../staff';

/**
 * The backend's vocabulary, copied by hand from
 * `Backend/src/Entity/StaffOperationLog.php:19-20`.
 *
 * Literals on purpose. A test that parsed that PHP file would fail for reasons
 * that have nothing to do with a label, and the map under test has to be checked
 * against the contract rather than against itself: these two lists are the only
 * place the eight actions and four target types appear in the frontend, so a
 * backend that adds one and a map that is not updated are caught here, in the
 * key-set assertions below.
 */
const BACKEND_ACTIONS = [
  'USER_STATUS_CHANGED',
  'USER_PROMOTED',
  'REPORT_CLAIMED',
  'REPORT_REVIEWED',
  'TOKEN_CREATED',
  'TOKEN_EXPIRATION_CHANGED',
  'TOKEN_DELETED',
  'SERVICE_RESTORED',
];

const BACKEND_TARGET_TYPES = ['USER', 'REPORT', 'TOKEN', 'SERVICE'];

describe('operationActionLabel', () => {
  it('covers exactly the eight actions the backend declares', () => {
    expect(Object.keys(OPERATION_ACTION_LABELS).sort()).toEqual([...BACKEND_ACTIONS].sort());
  });

  it.each(BACKEND_ACTIONS)('prints %s as a sentence instead of the enum', (action) => {
    const label = operationActionLabel(action);
    expect(label).not.toBe(action);
    expect(label).not.toMatch(/_/);
    expect(label).toMatch(/\p{L}/u);
  });

  it('returns an action the backend added later as it is', () => {
    expect(operationActionLabel('CATEGORY_CREATED')).toBe('CATEGORY_CREATED');
  });

  it('does not resolve a prototype key into a function', () => {
    // A bare index on an object literal answers `constructor` with a function,
    // and React refuses to render one: the lookup is `Object.hasOwn` for this.
    expect(operationActionLabel('constructor')).toBe('constructor');
    expect(operationActionLabel('toString')).toBe('toString');
  });

  it('falls back to a neutral word when the action is missing or not a string', () => {
    expect(operationActionLabel('')).toBe('Azione');
    expect(operationActionLabel(undefined)).toBe('Azione');
    expect(operationActionLabel(null)).toBe('Azione');
    expect(operationActionLabel(42)).toBe('Azione');
  });
});

describe('operationTargetLabel', () => {
  it('covers exactly the four target types the backend declares', () => {
    expect(Object.keys(OPERATION_TARGET_LABELS).sort()).toEqual([...BACKEND_TARGET_TYPES].sort());
  });

  it.each(BACKEND_TARGET_TYPES)('prints the target %s in words', (target) => {
    const label = operationTargetLabel(target);
    expect(label).not.toBe(target);
    expect(label).toBe(label.toLowerCase());
  });

  it('returns a target type the backend added later as it is', () => {
    expect(operationTargetLabel('CATEGORY')).toBe('CATEGORY');
  });

  it('does not resolve a prototype key into a function', () => {
    expect(operationTargetLabel('constructor')).toBe('constructor');
  });

  it('stays empty rather than printing a placeholder, so the log line has no gap', () => {
    expect(operationTargetLabel('')).toBe('');
    expect(operationTargetLabel(undefined)).toBe('');
    expect(operationTargetLabel(null)).toBe('');
  });
});

/**
 * The two routes of the staff area (`/staff`, `/staff-users`) are registered for
 * every session, so this predicate is what stands between a logged-in user with
 * no role and a screenful of `403`s (audit UX F13).
 */
describe('puoEntrareNellAreaStaff', () => {
  it.each(['STAFF', 'ADMIN'])('opens the area to the %s role', (ruolo) => {
    expect(puoEntrareNellAreaStaff({ ruolo })).toBe(true);
  });

  it('is not fooled by the case and the padding the wire word may carry', () => {
    expect(puoEntrareNellAreaStaff({ ruolo: ' staff ' })).toBe(true);
    expect(puoEntrareNellAreaStaff({ ruolo: 'Admin' })).toBe(true);
  });

  it('keeps a plain user out', () => {
    expect(puoEntrareNellAreaStaff({ ruolo: 'USER' })).toBe(false);
  });

  it('keeps out a session that carries no role at all', () => {
    expect(puoEntrareNellAreaStaff({ ruolo: null })).toBe(false);
    expect(puoEntrareNellAreaStaff({})).toBe(false);
    expect(puoEntrareNellAreaStaff(null)).toBe(false);
    expect(puoEntrareNellAreaStaff(undefined)).toBe(false);
  });

  it('does not resolve a prototype key into a role', () => {
    expect(puoEntrareNellAreaStaff({ ruolo: 'constructor' })).toBe(false);
  });
});
