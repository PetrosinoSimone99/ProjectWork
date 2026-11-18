import {
  apreLaChat,
  classifyAgreements,
  counterpartOf,
  isSheetCompiled,
  sheetsFor,
  statoScheda,
} from '../agreements';

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

/** One normalised delivery-sheet row (`normalizeAgreementSheet` in the API layer). */
function sheet(overrides = {}) {
  return {
    username: OTHER,
    descrizione: 'Lezione di italiano',
    beneficiario: ME,
    daRemoto: true,
    inizio: '2026-07-01',
    fine: '2026-07-10',
    beneficiarioAccettato: null,
    stato: 'UNCOMPILED',
    ...overrides,
  };
}

/**
 * An accepted agreement with the two rows the backend writes: the first row
 * is filled by ME and confirmed by OTHER, the second is the other way round.
 */
function acceptedWithSheets() {
  const mia = sheet({ username: ME, beneficiario: OTHER });
  const altra = sheet({ username: OTHER, beneficiario: ME });
  return agreement({ stato: 'ACCEPTED', scheda: mia, schede: [mia, altra] });
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

  it('keeps an accepted agreement in progress until the backend completes it', () => {
    const input = [acceptedAgreement(PAST_END)];

    const result = classifyAgreements(input, ME, NOW);

    expect(result.concluded).toEqual([]);
    expect(result.inProgress).toEqual(input);
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

  it('moves a cancelled agreement to concluded instead of dropping it', () => {
    const input = [agreement({ stato: 'CANCELLED' })];

    const result = classifyAgreements(input, ME, NOW);

    expect(result.concluded).toEqual(input);
    expect(result.inProgress).toEqual([]);
  });

  it('moves a completed agreement to concluded instead of dropping it', () => {
    const input = [acceptedAgreement(FUTURE_END), agreement({ stato: 'COMPLETED' })];

    const result = classifyAgreements(input, ME, NOW);

    expect(result.concluded).toEqual([input[1]]);
    expect(result.inProgress).toEqual([input[0]]);
  });

  it('moves a contested agreement to concluded instead of dropping it', () => {
    const input = [agreement({ stato: 'CONTESTED' })];

    const result = classifyAgreements(input, ME, NOW);

    expect(result.concluded).toEqual(input);
    expect(result.inProgress).toEqual([]);
  });

  it('does not infer completion from the client clock', () => {
    const input = [acceptedAgreement(FUTURE_END)];

    const beforeEnd = classifyAgreements(input, ME, new Date('2026-06-01T00:00:00.000Z'));
    const afterEnd = classifyAgreements(input, ME, new Date('2027-01-01T00:00:00.000Z'));

    expect(beforeEnd.inProgress).toEqual(input);
    expect(afterEnd.inProgress).toEqual(input);
    expect(afterEnd.concluded).toEqual([]);
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

describe('classifyAgreements with two sheet rows', () => {
  /**
   * The rule under test: an accepted exchange is over when the **latest** end
   * date has passed, not when the first row's has. Each side fills its own row,
   * so reading only the first one lets the other person's period decide for the
   * viewer.
   */
  function acceptedWithTwoPeriods(firstEnd, secondEnd) {
    return classifyAgreements(
      [
        agreement({
          stato: 'ACCEPTED',
          proposte: [proposal(), proposal({ username: ME, ruolo: 'Beneficiary' })],
          scheda: { fine: firstEnd },
          schede: [{ fine: firstEnd }, { fine: secondEnd }],
        }),
      ],
      ME,
      NOW,
    );
  }

  it('stays in progress while either sheet still ends in the future', () => {
    const classificati = acceptedWithTwoPeriods(PAST_END, FUTURE_END);

    expect(classificati.inProgress).toHaveLength(1);
    expect(classificati.concluded).toHaveLength(0);
  });

  it('keeps expired sheets in progress until the scheduler confirms completion', () => {
    const classificati = acceptedWithTwoPeriods(PAST_END, PAST_END);

    expect(classificati.concluded).toHaveLength(0);
    expect(classificati.inProgress).toHaveLength(1);
  });
});

describe('sheetsFor', () => {
  it('assigns each row to the right side for both participants', () => {
    const input = deepFreeze(acceptedWithSheets());

    const perMe = sheetsFor(input, ME);
    expect(perMe.mia).toBe(input.schede[0]);
    expect(perMe.altra).toBe(input.schede[1]);

    const perOther = sheetsFor(input, OTHER);
    expect(perOther.mia).toBe(input.schede[1]);
    expect(perOther.altra).toBe(input.schede[0]);
  });

  it('returns nulls when the viewer username is missing', () => {
    const input = acceptedWithSheets();

    expect(sheetsFor(input, null)).toEqual({ mia: null, altra: null });
    expect(sheetsFor(input, '')).toEqual({ mia: null, altra: null });
  });

  it('returns nulls when no row belongs to the viewer', () => {
    expect(sheetsFor(acceptedWithSheets(), 'nessuno')).toEqual({ mia: null, altra: null });
  });

  it('returns nulls for an agreement without sheets', () => {
    expect(sheetsFor(agreement(), ME)).toEqual({ mia: null, altra: null });
    expect(sheetsFor(null, ME)).toEqual({ mia: null, altra: null });
    expect(sheetsFor(undefined, ME)).toEqual({ mia: null, altra: null });
  });
});

describe('isSheetCompiled', () => {
  it('counts only a COMPILED sheet as compiled', () => {
    expect(isSheetCompiled(sheet({ stato: 'COMPILED' }))).toBe(true);
    expect(isSheetCompiled(sheet({ stato: 'UNCOMPILED' }))).toBe(false);
    expect(isSheetCompiled(null)).toBe(false);
  });
});

describe('statoScheda', () => {
  /** An accepted agreement whose rows are the ones `sheetsFor` will have to pick. */
  function accepted(mia, altra) {
    return agreement({ stato: 'ACCEPTED', scheda: mia, schede: [mia, altra].filter(Boolean) });
  }

  it('asks the viewer to write the sheet when nobody has sent one', () => {
    const accordo = accepted(sheet({ username: ME, beneficiario: OTHER }), null);

    expect(statoScheda(accordo, ME)).toBe('daCompilare');
  });

  it('offers no sheet when the agreement carries no rows at all', () => {
    // Without a row there is nothing to write: the backend would answer 404.
    expect(statoScheda(agreement({ stato: 'ACCEPTED', schede: [] }), ME)).toBe(null);
  });

  it('offers no sheet to the beneficiary of a queue-born agreement', () => {
    // A queue delivery creates one row, owned by the provider: the beneficiary
    // has no row of their own and waits for the sheet instead of writing one.
    const accordo = agreement({
      stato: 'ACCEPTED',
      schede: [sheet({ username: OTHER, beneficiario: ME })],
    });

    expect(statoScheda(accordo, ME)).toBe(null);
    expect(statoScheda(accordo, OTHER)).toBe('daCompilare');
  });

  it('waits once the viewer has sent their own row', () => {
    const accordo = accepted(
      sheet({ username: ME, beneficiario: OTHER, stato: 'COMPILED' }),
      sheet({ username: OTHER, beneficiario: ME }),
    );

    expect(statoScheda(accordo, ME)).toBe('inAttesaDiConferma');
  });

  it('asks the viewer to confirm the row the other person sent', () => {
    const accordo = accepted(
      sheet({ username: ME, beneficiario: OTHER }),
      sheet({ username: OTHER, beneficiario: ME, stato: 'COMPILED' }),
    );

    expect(statoScheda(accordo, ME)).toBe('daConfermare');
  });

  it('reads the same agreement the other way round for the other participant', () => {
    const accordo = accepted(
      sheet({ username: ME, beneficiario: OTHER, stato: 'COMPILED' }),
      sheet({ username: OTHER, beneficiario: ME }),
    );

    expect(statoScheda(accordo, ME)).toBe('inAttesaDiConferma');
    expect(statoScheda(accordo, OTHER)).toBe('daConfermare');
  });

  it('reports a confirmed row as confermata, before COMPILED can claim it', () => {
    const accordo = accepted(
      sheet({ username: ME, beneficiario: OTHER }),
      sheet({ username: OTHER, beneficiario: ME, stato: 'COMPILED', beneficiarioAccettato: true }),
    );

    expect(statoScheda(accordo, ME)).toBe('confermata');
  });

  it('does not mutate the agreement it reads', () => {
    const accordo = deepFreeze(
      accepted(
        sheet({ username: ME, beneficiario: OTHER }),
        sheet({ username: OTHER, beneficiario: ME, stato: 'COMPILED' }),
      ),
    );
    const prima = JSON.stringify(accordo);

    expect(statoScheda(accordo, ME)).toBe('daConfermare');
    expect(JSON.stringify(accordo)).toBe(prima);
  });

  it('offers no sheet when the viewer cannot be identified', () => {
    const accordo = accepted(
      sheet({ username: ME, beneficiario: OTHER }),
      sheet({ username: OTHER, beneficiario: ME, stato: 'COMPILED' }),
    );

    // Without a username no row is mine: a guessed "write it" would be a lie.
    expect(statoScheda(accordo, null)).toBe(null);
    expect(statoScheda(null, ME)).toBe(null);
  });
});

describe('apreLaChat', () => {
  it.each(['ACCEPTED', 'COMPLETED'])('opens the chat of a %s exchange', (stato) => {
    expect(apreLaChat({ stato })).toBe(true);
  });

  it.each(['PENDING', 'REFUSED', 'CANCELLED', 'CONTESTED', 'VOID', 'UNKNOWN'])(
    'keeps the chat closed on a %s row, which never happened',
    (stato) => {
      expect(apreLaChat({ stato })).toBe(false);
    },
  );

  it('opens nothing without an agreement', () => {
    expect(apreLaChat(null)).toBe(false);
    expect(apreLaChat(undefined)).toBe(false);
  });
});
