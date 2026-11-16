import {
  TIPI_VOCE,
  aggiornaVoce,
  contaFiltri,
  descriviFiltri,
  filtriDaQuery,
  localitaDaVoce,
  nuovaVoce,
  nuoviFiltri,
} from '../offer-request';

/**
 * The location plumbing of an entry and of the home filters, after the switch
 * from region to comune.
 *
 * The composed string is a contract with the backend (`service_queues.location`
 * is matched with exact equality), so these tests pin the two shapes that reach
 * the wire: an entry always travels as `Comune - Provincia` or as nothing, and
 * the catalogue filter travels as the composed string when a comune is chosen
 * and as the bare province when it is not (the backend matches it with a LIKE,
 * so a province alone finds every comune of that province).
 */

describe('nuovaVoce', () => {
  it('starts with both halves of the location empty and no region field left', () => {
    const voce = nuovaVoce(TIPI_VOCE.OFFERTA);
    expect(voce).toMatchObject({ provincia: '', comune: '' });
    expect(voce).not.toHaveProperty('regione');
  });
});

describe('localitaDaVoce', () => {
  it('composes Comune - Provincia from the two chosen values', () => {
    const voce = aggiornaVoce(aggiornaVoce(nuovaVoce(TIPI_VOCE.OFFERTA), 'comune', 'Milano'), 'provincia', 'Milano');
    expect(localitaDaVoce(voce)).toBe('Milano - Milano');
  });

  it('gives an empty string when a half is missing: a half is not a location', () => {
    expect(localitaDaVoce({ provincia: 'Milano', comune: '' })).toBe('');
    expect(localitaDaVoce({ provincia: '', comune: 'Milano' })).toBe('');
    expect(localitaDaVoce(null)).toBe('');
  });
});

describe('the filter shape', () => {
  it('has no region field and starts with both location halves empty', () => {
    const filtri = nuoviFiltri();
    expect(filtri).toMatchObject({ provincia: '', comune: '' });
    expect(filtri).not.toHaveProperty('regione');
  });

  it('counts province and comune as one condition, never two', () => {
    expect(contaFiltri({ ...nuoviFiltri(), provincia: 'Milano' })).toBe(1);
    expect(contaFiltri({ ...nuoviFiltri(), provincia: 'Milano', comune: 'Milano' })).toBe(1);
    expect(contaFiltri({ ...nuoviFiltri(), comune: 'Milano' })).toBe(1);
    expect(contaFiltri(nuoviFiltri())).toBe(0);
  });
});

describe('filtriDaQuery', () => {
  it('sends the composed string when a comune is chosen', () => {
    const query = filtriDaQuery({ ...nuoviFiltri(), provincia: 'Milano', comune: 'Sesto San Giovanni' });
    expect(query.location).toBe('Sesto San Giovanni - Milano');
  });

  it('anchors a province-only filter to the province half, separator included', () => {
    // The backend LIKE is a substring match, so the bare name found comuni in
    // other provinces: `Torino` matched `Torino di Sangro - Chieti`. The
    // separator in front makes the match land on the province half only.
    expect(filtriDaQuery({ ...nuoviFiltri(), provincia: 'Milano' }).location).toBe(' - Milano');
  });

  it('the anchored filter rejects another province and keeps its own comuni', () => {
    const anchor = filtriDaQuery({ ...nuoviFiltri(), provincia: 'Torino' }).location.toLowerCase();
    expect('Torino di Sangro - Chieti'.toLowerCase().includes(anchor)).toBe(false);
    expect('Torino - Torino'.toLowerCase().includes(anchor)).toBe(true);
    expect('Moncalieri - Torino'.toLowerCase().includes(anchor)).toBe(true);
  });

  it('omits location entirely when nothing is chosen, never an empty parameter', () => {
    expect(filtriDaQuery(nuoviFiltri())).not.toHaveProperty('location');
  });

  it('keeps the other filters independent of the location', () => {
    const query = filtriDaQuery({ ...nuoviFiltri(), testo: ' orto ', provincia: 'Roma' });
    expect(query).toMatchObject({ q: 'orto', location: ' - Roma' });
  });
});

describe('descriviFiltri', () => {
  it('names the composed location when a comune is chosen', () => {
    const testo = descriviFiltri({ ...nuoviFiltri(), provincia: 'Milano', comune: 'Milano' }, []);
    expect(testo).toContain('località Milano - Milano');
  });

  it('names the province alone when no comune is chosen', () => {
    const testo = descriviFiltri({ ...nuoviFiltri(), provincia: 'Milano' }, []);
    expect(testo).toContain('provincia Milano');
  });

  it('says nothing about the location when no half is chosen', () => {
    expect(descriviFiltri(nuoviFiltri(), [])).toBe('');
  });
});
