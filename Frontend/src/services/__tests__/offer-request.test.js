import { LIMITE_VOCI, limiteRaggiunto, testoConteggioVoci } from '../offer-request';

/** An entry list of `n` rows, as the editor holds it. */
function voci(n) {
  return Array.from({ length: n }, (_, index) => ({ chiave: `voce-${index}`, mansione: 'x' }));
}

/**
 * The counter and the cap of the entry sections.
 *
 * The screen used to show "7 di 5" for an account that already had seven offers:
 * a number that cannot exist makes every other number on the screen doubtful
 * (audit UX F04).
 */
describe('testoConteggioVoci', () => {
  it('says how many of the cap there are while the cap is not reached', () => {
    expect(testoConteggioVoci(voci(0))).toBe(`0 di ${LIMITE_VOCI}`);
    expect(testoConteggioVoci(voci(3))).toBe(`3 di ${LIMITE_VOCI}`);
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
