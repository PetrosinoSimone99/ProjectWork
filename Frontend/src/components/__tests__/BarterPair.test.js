import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { BarterPair } from '../BarterPair';

/**
 * Lo scambio come arriva dal selettore delle direzioni: due lati, ognuno con la
 * persona e la cosa. `cosa` può mancare, `chi` no.
 */
const DIREZIONI = {
  offre: { chi: 'marta', cosa: 'Riparazione della bicicletta' },
  riceve: { chi: 'luca', cosa: 'Lezione di chitarra' },
};

async function renderCoppia(props = {}) {
  // Da RTL 14 `render` è asincrono: il montaggio si aspetta, non si avvolge in `act`.
  await render(<BarterPair {...props} />);
}

/**
 * Ogni stringa disegnata, in ordine di render.
 *
 * `.*` non è una ricerca: è il modo di chiedere alla libreria tutti i nodi di
 * testo, che è quello che serve qui (`getAllByText` vuole comunque un matcher).
 */
function testi() {
  return screen
    .getAllByText(/.*/)
    .map((nodo) => nodo.props.children)
    .filter((child) => typeof child === 'string');
}

/** Le righe: le due viste che portano il nome accessibile della direzione. */
function righe() {
  return screen.getAllByLabelText(/.+/);
}

/** Lo stile del testo disegnato con questo esatto contenuto. */
function stileDelTesto(contenuto) {
  return StyleSheet.flatten(screen.getByText(contenuto).props.style ?? {});
}

describe('BarterPair — le due direzioni', () => {
  it('disegna due righe, Offre prima di Riceve, con nome e cosa per ognuna', async () => {
    await renderCoppia({ direzioni: DIREZIONI });

    expect(testi()).toEqual([
      'Offre',
      '@marta',
      DIREZIONI.offre.cosa,
      'Riceve',
      '@luca',
      DIREZIONI.riceve.cosa,
    ]);

    // La direzione sta nell'etichetta e arriva allo screen reader con la riga:
    // chi offre e cosa, chi riceve e cosa.
    expect(righe().map((riga) => riga.props.accessibilityLabel)).toEqual([
      `Offre @marta: ${DIREZIONI.offre.cosa}`,
      `Riceve @luca: ${DIREZIONI.riceve.cosa}`,
    ]);
  });

  it('non inventa niente quando cosa manca e non raddoppia la chiocciola', async () => {
    await renderCoppia({
      direzioni: {
        offre: { chi: '@marta', cosa: null },
        riceve: { chi: 'luca', cosa: 'Lezione di chitarra' },
      },
    });

    expect(testi()).toEqual(['Offre', '@marta', 'Riceve', '@luca', 'Lezione di chitarra']);
    expect(righe().map((riga) => riga.props.accessibilityLabel)).toEqual([
      'Offre @marta',
      'Riceve @luca: Lezione di chitarra',
    ]);
  });
});

describe('BarterPair — i lati che non ci sono', () => {
  it('disegna una riga sola quando un lato è null', async () => {
    await renderCoppia({ direzioni: { offre: null, riceve: DIREZIONI.riceve } });
    const senzaOfferta = testi();
    expect(senzaOfferta).toEqual(['Riceve', '@luca', DIREZIONI.riceve.cosa]);
    expect(righe()).toHaveLength(1);

    await renderCoppia({ direzioni: { offre: DIREZIONI.offre, riceve: null } });
    const senzaRicevuta = testi();
    expect(senzaRicevuta).toEqual(['Offre', '@marta', DIREZIONI.offre.cosa]);
    expect(righe()).toHaveLength(1);
  });

  it('non disegna niente quando mancano tutti e due i lati', async () => {
    await renderCoppia({ direzioni: { offre: null, riceve: null } });
    expect(screen.toJSON()).toBeNull();

    await renderCoppia({ direzioni: {} });
    expect(screen.toJSON()).toBeNull();

    await renderCoppia({});
    expect(screen.toJSON()).toBeNull();
  });
});

describe('BarterPair — la variante compatta', () => {
  it('tiene gli stessi due testi e li disegna più piccoli', async () => {
    await renderCoppia({ direzioni: DIREZIONI });
    const testiAmpia = testi();
    const stileNomeAmpia = stileDelTesto('@marta');
    const stileCosaAmpia = stileDelTesto(DIREZIONI.offre.cosa);

    await renderCoppia({ direzioni: DIREZIONI, compatta: true });

    // Nessun testo in meno: la card racconta lo stesso scambio.
    expect(testi()).toEqual(testiAmpia);

    expect(stileDelTesto('@marta').fontSize).toBeLessThan(stileNomeAmpia.fontSize);
    expect(stileDelTesto(DIREZIONI.offre.cosa).fontSize).toBeLessThan(
      stileCosaAmpia.fontSize,
    );
  });
});
