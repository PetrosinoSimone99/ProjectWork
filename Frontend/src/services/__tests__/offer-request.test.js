import {
  LIMITE_VOCI,
  TIPI_VOCE,
  limiteRaggiunto,
  testoConteggioVoci,
  testoLimiteVoci,
  validaVociRegistrazione,
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

  it('tells an account over the cap the count in front of it, without promising a delete', () => {
    expect(testoLimiteVoci(voci(3), TIPI_VOCE.OFFERTA)).toBe(
      'Massimo raggiunto: hai 3 offerte, il massimo è 1. Puoi modificare quelle che hai, non aggiungerne altre.',
    );
    expect(testoLimiteVoci(voci(2), TIPI_VOCE.RICERCA)).toBe(
      'Massimo raggiunto: hai 2 ricerche, il massimo è 1. Puoi modificare quelle che hai, non aggiungerne altre.',
    );
  });

  it('never sends an account over the cap to a control the screen no longer has', () => {
    // Deleting a service is not part of the product any more: the copy cannot
    // count the rows to remove.
    expect(testoLimiteVoci(voci(3), TIPI_VOCE.OFFERTA)).not.toContain('Eliminane');
    expect(testoLimiteVoci(voci(3), TIPI_VOCE.OFFERTA)).not.toContain('elimina');
  });
});

/**
 * The registration rule: one offer **and** one request, both filled.
 *
 * The two sections used to be optional and a blank entry was skipped; now an
 * account without them cannot be created, so "empty" is an error and not a
 * section to ignore.
 */
describe('validaVociRegistrazione', () => {
  const CATEGORIE = [{ id: 3, nome: 'Riparazioni' }];

  /** One entry of the form, valid unless overridden. */
  function voce(tipo, overrides = {}) {
    return {
      chiave: `${tipo}-1`,
      tipo,
      idCategoria: 3,
      mansione: tipo === TIPI_VOCE.RICERCA ? 'Un idraulico' : 'Riparo biciclette',
      provincia: '',
      comune: '',
      ...overrides,
    };
  }

  /** The two lists the registration form holds. */
  function formVoci(offerte = [voce(TIPI_VOCE.OFFERTA)], ricerche = [voce(TIPI_VOCE.RICERCA)]) {
    return { offerte, ricerche };
  }

  it('accepts one complete offer and one complete request', () => {
    expect(validaVociRegistrazione(formVoci(), CATEGORIE)).toEqual({});
  });

  it('refuses an account with no offer and no request, and says it on both rows', () => {
    const errori = validaVociRegistrazione(formVoci([], []), CATEGORIE);

    expect(errori['offerte.0.idCategoria']).toBe('Scegli una categoria.');
    expect(errori['offerte.0.mansione']).toBe('Descrivi la mansione.');
    expect(errori['ricerche.0.idCategoria']).toBe('Scegli una categoria.');
    expect(errori['ricerche.0.mansione']).toBe('Descrivi cosa cerchi.');
  });

  it('treats a blank entry as a missing one instead of skipping it', () => {
    const vuota = { idCategoria: null, mansione: '' };
    const errori = validaVociRegistrazione(
      formVoci([voce(TIPI_VOCE.OFFERTA, vuota)], [voce(TIPI_VOCE.RICERCA, vuota)]),
      CATEGORIE,
    );

    expect(errori['offerte.0.idCategoria']).toBe('Scegli una categoria.');
    expect(errori['offerte.0.mansione']).toBe('Descrivi la mansione.');
    expect(errori['ricerche.0.mansione']).toBe('Descrivi cosa cerchi.');
  });

  it('names the section that is missing even when the other one is complete', () => {
    const errori = validaVociRegistrazione(formVoci([voce(TIPI_VOCE.OFFERTA)], []), CATEGORIE);

    expect(errori['offerte.0.mansione']).toBeUndefined();
    expect(errori['ricerche.0.mansione']).toBe('Descrivi cosa cerchi.');
  });

  it('keeps the category and the length rules of one entry', () => {
    const errori = validaVociRegistrazione(
      formVoci(
        [voce(TIPI_VOCE.OFFERTA, { idCategoria: 99 })],
        [voce(TIPI_VOCE.RICERCA, { mansione: 'x'.repeat(200) })],
      ),
      CATEGORIE,
    );

    expect(errori['offerte.0.idCategoria']).toBe('Scegli una categoria.');
    expect(errori['ricerche.0.mansione']).toBe('Massimo 150 caratteri.');
  });

  it('does not flag a section the caller did not send as if it were filled', () => {
    const errori = validaVociRegistrazione({}, CATEGORIE);

    expect(Object.keys(errori).sort()).toEqual([
      'offerte.0.idCategoria',
      'offerte.0.mansione',
      'ricerche.0.idCategoria',
      'ricerche.0.mansione',
    ]);
  });
});
