import {
  LIMITE_VOCI,
  TIPI_VOCE,
  limiteRaggiunto,
  testoConteggioVoci,
  testoLimiteVoci,
} from '../offer-request';

/** An entry list of `n` rows, as the editor holds it. */
function voci(n) {
  return Array.from({ length: n }, (_, index) => ({ chiave: `voce-${index}`, mansione: 'x' }));
}

/**
 * The counter and the cap of the entry sections.
 *
 * The screen used to show "7 di 5" for an account that already had seven offers:
 * a number that cannot exist makes every other number on the screen doubtful
 * (audit UX F04). Every assertion below is derived from `LIMITE_VOCI`, because
 * the cap is a product rule that moves (five per type, then one per type on
 * 2026-11-11) and a test that hardcodes it fails for the wrong reason.
 */
describe('testoConteggioVoci', () => {
  it('says how many of the cap there are while the cap is not reached', () => {
    expect(testoConteggioVoci(voci(0))).toBe(`0 di ${LIMITE_VOCI}`);
  });

  it('still reads as a ratio when the cap is reached', () => {
    expect(testoConteggioVoci(voci(LIMITE_VOCI))).toBe(`${LIMITE_VOCI} di ${LIMITE_VOCI}`);
  });

  it('drops the ratio when the list is already over the cap', () => {
    expect(testoConteggioVoci(voci(LIMITE_VOCI + 2))).toBe(`${LIMITE_VOCI + 2} voci`);
  });

  it('never shows a fraction where the numerator is bigger than the denominator', () => {
    expect(testoConteggioVoci(voci(LIMITE_VOCI + 5))).not.toContain(' di ');
  });
});

describe('limiteRaggiunto', () => {
  it('blocks a new entry at the cap', () => {
    expect(limiteRaggiunto(voci(LIMITE_VOCI))).toBe(true);
  });

  it('blocks a new entry above the cap, where an account can already be', () => {
    expect(limiteRaggiunto(voci(LIMITE_VOCI + 2))).toBe(true);
  });

  it('leaves room below the cap', () => {
    expect(limiteRaggiunto(voci(LIMITE_VOCI - 1))).toBe(false);
  });
});

describe('testoLimiteVoci', () => {
  it('agrees with the number in front of it: one offer is "1 offerta"', () => {
    expect(testoLimiteVoci(voci(LIMITE_VOCI), TIPI_VOCE.OFFERTA)).toBe(
      'Hai raggiunto il massimo di 1 offerta.',
    );
    expect(testoLimiteVoci(voci(LIMITE_VOCI), TIPI_VOCE.RICERCA)).toBe(
      'Hai raggiunto il massimo di 1 ricerca.',
    );
  });

  it('never prints a plural right after one', () => {
    expect(testoLimiteVoci(voci(1), TIPI_VOCE.OFFERTA)).not.toContain('1 offerte');
    expect(testoLimiteVoci(voci(1), TIPI_VOCE.RICERCA)).not.toContain('1 ricerche');
  });

  it('tells an account over the cap how many rows to remove, and names the count', () => {
    expect(testoLimiteVoci(voci(3), TIPI_VOCE.OFFERTA)).toBe(
      "Massimo raggiunto: hai 3 offerte, il massimo è 1. Eliminane 2 per aggiungerne un'altra.",
    );
    expect(testoLimiteVoci(voci(2), TIPI_VOCE.RICERCA)).toBe(
      "Massimo raggiunto: hai 2 ricerche, il massimo è 1. Eliminane 1 per aggiungerne un'altra.",
    );
  });
});
