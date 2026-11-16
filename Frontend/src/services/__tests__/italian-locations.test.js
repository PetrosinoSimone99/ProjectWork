import {
  PROVINCE,
  analizzaLocalita,
  comuniPerProvincia,
  formattaLocalita,
  localitaPerDisplay,
} from '../italian-locations';

/**
 * The one place that decides what a location looks like.
 *
 * The composed string is contract, not display: `service_queues.location` is
 * matched with exact equality by the backend, so `formattaLocalita` and
 * `analizzaLocalita` must be exact inverses for every value the app can
 * produce, and must refuse the format that came before (`Milano (Lombardia)`)
 * instead of guessing it.
 */

describe('PROVINCE', () => {
  it('holds the 110 provinces of the dataset, alphabetically sorted', () => {
    expect(PROVINCE).toHaveLength(110);
    const sorted = [...PROVINCE].sort((a, b) => a.localeCompare(b, 'it'));
    expect(PROVINCE).toEqual(sorted);
    expect(PROVINCE).toContain('Milano');
    expect(PROVINCE).toContain('Monza e della Brianza');
    expect(PROVINCE).toContain('Valle d\'Aosta/Vallée d\'Aoste');
  });

  it('cannot be mutated by a caller', () => {
    expect(Object.isFrozen(PROVINCE)).toBe(true);
  });
});

describe('comuniPerProvincia', () => {
  it('returns the comuni of a known province, capital included', () => {
    const comuni = comuniPerProvincia('Milano');
    expect(comuni.length).toBeGreaterThan(100);
    expect(comuni).toContain('Milano');
    expect(comuni).toContain('Sesto San Giovanni');
  });

  it('matches the province name without case or surrounding spaces', () => {
    expect(comuniPerProvincia('  milano ')).toEqual(comuniPerProvincia('Milano'));
  });

  it('returns a copy, so mutating it cannot corrupt the dataset', () => {
    const first = comuniPerProvincia('Roma');
    first.push('Comune Inventato');
    expect(comuniPerProvincia('Roma')).not.toContain('Comune Inventato');
  });

  it('returns an empty array for a missing or unknown province', () => {
    expect(comuniPerProvincia('')).toEqual([]);
    expect(comuniPerProvincia(null)).toEqual([]);
    expect(comuniPerProvincia('Regione Che Non Esiste')).toEqual([]);
  });

  it('keeps the comune whose own name contains the separator', () => {
    expect(comuniPerProvincia('Messina')).toContain('Tripi - Abakainon');
  });
});

describe('formattaLocalita', () => {
  it('composes Comune - Provincia', () => {
    expect(formattaLocalita('Roma', 'Roma')).toBe('Roma - Roma');
    expect(formattaLocalita('Sesto San Giovanni', 'Milano')).toBe('Sesto San Giovanni - Milano');
  });

  it('normalizes the whitespace of both halves', () => {
    expect(formattaLocalita('  Sesto   San Giovanni ', ' Milano')).toBe(
      'Sesto San Giovanni - Milano',
    );
  });

  it('returns null when a half is missing', () => {
    expect(formattaLocalita('', 'Milano')).toBeNull();
    expect(formattaLocalita('Milano', '')).toBeNull();
    expect(formattaLocalita(null, null)).toBeNull();
    expect(formattaLocalita(undefined, 'Milano')).toBeNull();
  });
});

describe('analizzaLocalita', () => {
  it('is the exact inverse of formattaLocalita for every province capital', () => {
    // Not every province name is also a comune (`Monza e della Brianza` is not;
    // `Monza` is): the pairs that exist must round-trip.
    const capitals = PROVINCE.filter((provincia) => comuniPerProvincia(provincia).includes(provincia));
    expect(capitals.length).toBeGreaterThan(90);
    capitals.forEach((provincia) => {
      const composed = formattaLocalita(provincia, provincia);
      expect(analizzaLocalita(composed)).toEqual({ comune: provincia, provincia });
    });
  });

  it('splits on the last separator, for the comune that contains it', () => {
    expect(analizzaLocalita('Tripi - Abakainon - Messina')).toEqual({
      comune: 'Tripi - Abakainon',
      provincia: 'Messina',
    });
  });

  it('returns the canonical spelling when the text is typed in another case', () => {
    expect(analizzaLocalita('sesto san giovanni - MILANO')).toEqual({
      comune: 'Sesto San Giovanni',
      provincia: 'Milano',
    });
  });

  it('refuses the old Provincia (Regione) format', () => {
    expect(analizzaLocalita('Milano (Lombardia)')).toBeNull();
  });

  it('refuses a bare place name, an empty value and a missing one', () => {
    expect(analizzaLocalita('Roma')).toBeNull();
    expect(analizzaLocalita('')).toBeNull();
    expect(analizzaLocalita(null)).toBeNull();
    expect(analizzaLocalita(undefined)).toBeNull();
  });

  it('refuses a comune that exists but not in that province', () => {
    // `Milano` is a comune of the province of Milano, not of Roma.
    expect(analizzaLocalita('Milano - Roma')).toBeNull();
  });

  it('refuses an unknown province or an unknown comune', () => {
    expect(analizzaLocalita('Roma - Atlantide')).toBeNull();
    expect(analizzaLocalita('Comune Inventato - Roma')).toBeNull();
  });
});

describe('localitaPerDisplay', () => {
  it('shows the composed value in the dataset spelling', () => {
    expect(localitaPerDisplay('roma - roma')).toBe('Roma - Roma');
  });

  it('shows a value written before the new format verbatim', () => {
    expect(localitaPerDisplay('Milano (Lombardia)')).toBe('Milano (Lombardia)');
    expect(localitaPerDisplay('  Roma  ')).toBe('Roma');
  });

  it('shows nothing for a missing value', () => {
    expect(localitaPerDisplay(null)).toBe('');
    expect(localitaPerDisplay(undefined)).toBe('');
    expect(localitaPerDisplay('   ')).toBe('');
  });
});
