import { StyleSheet, Text, View } from 'react-native';
import { act, create } from 'react-test-renderer';

import { BarterPair } from '../BarterPair';

/**
 * Lo scambio come arriva dal selettore delle direzioni: due lati, ognuno con la
 * persona e la cosa. `cosa` può mancare, `chi` no.
 */
const DIREZIONI = {
  offre: { chi: 'marta', cosa: 'Riparazione della bicicletta' },
  riceve: { chi: 'luca', cosa: 'Lezione di chitarra' },
};

function render(props) {
  let renderer;
  act(() => {
    renderer = create(<BarterPair {...props} />);
  });
  return renderer;
}

/** Ogni stringa disegnata, in ordine di render. */
function testi(renderer) {
  return renderer.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .filter((child) => typeof child === 'string');
}

/** Le righe: le due viste che portano il nome accessibile della direzione. */
function righe(renderer) {
  return renderer.root.findAll(
    (node) => node.type === View && typeof node.props.accessibilityLabel === 'string',
  );
}

/** Lo stile del testo disegnato con questo esatto contenuto. */
function stileDelTesto(renderer, contenuto) {
  const nodo = renderer.root.findAllByType(Text).find((node) => node.props.children === contenuto);
  expect(nodo).toBeDefined();
  return StyleSheet.flatten(nodo.props.style ?? {});
}

describe('BarterPair — le due direzioni', () => {
  it('disegna due righe, Offre prima di Riceve, con nome e cosa per ognuna', () => {
    const renderer = render({ direzioni: DIREZIONI });

    expect(testi(renderer)).toEqual([
      'Offre',
      '@marta',
      DIREZIONI.offre.cosa,
      'Riceve',
      '@luca',
      DIREZIONI.riceve.cosa,
    ]);

    // La direzione sta nell'etichetta e arriva allo screen reader con la riga:
    // chi offre e cosa, chi riceve e cosa.
    expect(righe(renderer).map((riga) => riga.props.accessibilityLabel)).toEqual([
      `Offre @marta: ${DIREZIONI.offre.cosa}`,
      `Riceve @luca: ${DIREZIONI.riceve.cosa}`,
    ]);
  });

  it('non inventa niente quando cosa manca e non raddoppia la chiocciola', () => {
    const renderer = render({
      direzioni: {
        offre: { chi: '@marta', cosa: null },
        riceve: { chi: 'luca', cosa: 'Lezione di chitarra' },
      },
    });

    expect(testi(renderer)).toEqual(['Offre', '@marta', 'Riceve', '@luca', 'Lezione di chitarra']);
    expect(righe(renderer).map((riga) => riga.props.accessibilityLabel)).toEqual([
      'Offre @marta',
      'Riceve @luca: Lezione di chitarra',
    ]);
  });
});

describe('BarterPair — i lati che non ci sono', () => {
  it('disegna una riga sola quando un lato è null', () => {
    const senzaOfferta = render({ direzioni: { offre: null, riceve: DIREZIONI.riceve } });
    expect(testi(senzaOfferta)).toEqual(['Riceve', '@luca', DIREZIONI.riceve.cosa]);
    expect(righe(senzaOfferta)).toHaveLength(1);

    const senzaRicevuta = render({ direzioni: { offre: DIREZIONI.offre, riceve: null } });
    expect(testi(senzaRicevuta)).toEqual(['Offre', '@marta', DIREZIONI.offre.cosa]);
    expect(righe(senzaRicevuta)).toHaveLength(1);
  });

  it('non disegna niente quando mancano tutti e due i lati', () => {
    expect(render({ direzioni: { offre: null, riceve: null } }).toJSON()).toBeNull();
    expect(render({ direzioni: {} }).toJSON()).toBeNull();
    expect(render({}).toJSON()).toBeNull();
  });
});

describe('BarterPair — la variante compatta', () => {
  it('tiene gli stessi due testi e li disegna più piccoli', () => {
    const ampia = render({ direzioni: DIREZIONI });
    const compatta = render({ direzioni: DIREZIONI, compatta: true });

    // Nessun testo in meno: la card racconta lo stesso scambio.
    expect(testi(compatta)).toEqual(testi(ampia));

    expect(stileDelTesto(compatta, '@marta').fontSize).toBeLessThan(
      stileDelTesto(ampia, '@marta').fontSize,
    );
    expect(stileDelTesto(compatta, DIREZIONI.offre.cosa).fontSize).toBeLessThan(
      stileDelTesto(ampia, DIREZIONI.offre.cosa).fontSize,
    );
  });
});
