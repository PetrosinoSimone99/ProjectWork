import { classifyAgreements, counterpartOf } from '../agreements';

/** The clock every test pins: mid-2026, between the fixtures' two dates. */
const NOW = new Date('2026-06-15T12:00:00.000Z');
const FUTURE_END = '2026-12-01T00:00:00.000Z';
const PAST_END = '2026-01-01T00:00:00.000Z';

/** The viewer answering (or having answered) the fixture agreements. */
const ME = 'marco';
const OTHER = 'giulia';

function proposal(overrides = {}) {
  return {
    username: OTHER,
    ruolo: 'Provider',
    risposta: true,
    dataRisposta: '2026-06-01T10:05:00',
    ...overrides,
  };
}

function agreement(overrides = {}) {
  return {
    id: 1,
    stato: 'PENDING',
    creazione: '2026-06-01T10:00:00',
    proposte: [proposal(), proposal({ username: ME, ruolo: 'Beneficiary', risposta: null, dataRisposta: null })],
    scheda: null,
    ...overrides,
  };
}

function acceptedAgreement(endDate) {
  return agreement({
    stato: 'ACCEPTED',
    proposte: [proposal(), proposal({ username: ME, ruolo: 'Beneficiary' })],
    scheda: { fine: endDate },
  });
}

/** Freezes a value tree so a mutating implementation fails instead of passing. */
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

describe('classifyAgreements', () => {
  it('puts a pending agreement whose answer is still mine to give in toAnswer', () => {
    const input = [agreement()];

    const result = classifyAgreements(input, ME, NOW);

    expect(result.toAnswer).toEqual(input);
    expect(result.sent).toEqual([]);
    expect(result.inProgress).toEqual([]);
    expect(result.concluded).toEqual([]);
  });

  it('puts a pending agreement I already accepted in sent', () => {
    const input = [agreement()];

    const result = classifyAgreements(input, OTHER, NOW);

    expect(result.sent).toEqual(input);
    expect(result.toAnswer).toEqual([]);
  });

  it('drops a pending agreement that has no proposal of mine', () => {
    const input = [agreement({ proposte: [proposal()] })];

    const result = classifyAgreements(input, ME, NOW);

    expect(result).toEqual({ toAnswer: [], sent: [], inProgress: [], concluded: [] });
  });

  it('keeps an accepted agreement with an end date in the future in progress', () => {
    const input = [acceptedAgreement(FUTURE_END)];

    const result = classifyAgreements(input, ME, NOW);

    expect(result.inProgress).toEqual(input);
    expect(result.concluded).toEqual([]);
  });

  it('keeps an accepted agreement without a sheet in progress', () => {
    const input = [agreement({ stato: 'ACCEPTED', scheda: null })];

    const result = classifyAgreements(input, ME, NOW);

    expect(result.inProgress).toEqual(input);
    expect(result.concluded).toEqual([]);
  });

  it('moves an accepted agreement whose end date has passed to concluded', () => {
    const input = [acceptedAgreement(PAST_END)];

    const result = classifyAgreements(input, ME, NOW);

    expect(result.concluded).toEqual(input);
    expect(result.inProgress).toEqual([]);
  });

  it('moves a refused agreement to concluded', () => {
    const input = [agreement({ stato: 'REFUSED' })];

    const result = classifyAgreements(input, ME, NOW);

    expect(result.concluded).toEqual(input);
  });

  it('moves a void agreement to concluded', () => {
    const input = [agreement({ stato: 'VOID' })];

    const result = classifyAgreements(input, ME, NOW);

    expect(result.concluded).toEqual(input);
  });

  it('moves a contested agreement to concluded instead of dropping it', () => {
    const input = [agreement({ stato: 'CONTESTED' })];

    const result = classifyAgreements(input, ME, NOW);

    expect(result.concluded).toEqual(input);
    expect(result.inProgress).toEqual([]);
  });

  it('honours the injected clock instead of the wall clock', () => {
    const input = [acceptedAgreement(FUTURE_END)];

    const beforeEnd = classifyAgreements(input, ME, new Date('2026-06-01T00:00:00.000Z'));
    const afterEnd = classifyAgreements(input, ME, new Date('2027-01-01T00:00:00.000Z'));

    expect(beforeEnd.inProgress).toEqual(input);
    expect(afterEnd.concluded).toEqual(input);
  });

  it('drops rows it cannot classify, including non-objects and unknown statuses', () => {
    const input = [null, 'not-an-agreement', agreement({ stato: 'SOMETHING_ELSE' })];

    const result = classifyAgreements(input, ME, NOW);

    expect(result).toEqual({ toAnswer: [], sent: [], inProgress: [], concluded: [] });
  });

  it('returns empty buckets for a non-array input', () => {
    expect(classifyAgreements(null, ME, NOW)).toEqual({
      toAnswer: [],
      sent: [],
      inProgress: [],
      concluded: [],
    });
    expect(classifyAgreements(undefined, ME, NOW)).toEqual({
      toAnswer: [],
      sent: [],
      inProgress: [],
      concluded: [],
    });
  });

  it('does not mutate the input and returns fresh arrays', () => {
    const input = deepFreeze([agreement(), acceptedAgreement(PAST_END)]);
    const before = JSON.stringify(input);

    const result = classifyAgreements(input, ME, NOW);

    expect(JSON.stringify(input)).toBe(before);
    expect(result.toAnswer).not.toBe(input);
    expect(result.concluded).not.toBe(input);
  });
});

describe('counterpartOf', () => {
  it('returns the username of the other participant', () => {
    expect(counterpartOf(agreement(), ME)).toBe(OTHER);
    expect(counterpartOf(agreement(), OTHER)).toBe(ME);
  });

  it('returns null when my proposal is the only one there is', () => {
    expect(counterpartOf(agreement({ proposte: [proposal({ username: ME })] }), ME)).toBeNull();
  });

  it('returns null for a missing agreement or a missing viewer username', () => {
    expect(counterpartOf(null, ME)).toBeNull();
    expect(counterpartOf(agreement(), null)).toBeNull();
    expect(counterpartOf(agreement(), '')).toBeNull();
  });
});
