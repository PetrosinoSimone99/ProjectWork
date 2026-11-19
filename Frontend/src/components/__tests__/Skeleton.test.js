import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { act, create } from 'react-test-renderer';

import { Skeleton, SkeletonLista } from '../Skeleton';

/** Renders a tree with every update inside act. */
function render(elemento) {
  let renderer;
  act(() => {
    renderer = create(elemento);
  });
  return renderer;
}

/** Every drawn `View`, with its style flattened: the only nodes that exist. */
function viste(renderer) {
  return renderer.root.findAll((node) => node.type === View).map((node) => ({
    props: node.props,
    stile: StyleSheet.flatten(node.props.style ?? {}),
  }));
}

/** The grey blocks: a childless `View` with its own height and corner radius. */
function blocchi(renderer) {
  return viste(renderer).filter(
    (vista) => vista.stile.height !== undefined && vista.stile.borderRadius !== undefined,
  );
}

/** The list rows: the bordered containers, one per placeholder row. */
function righe(renderer) {
  return viste(renderer).filter((vista) => vista.stile.borderWidth === 1);
}

/** Every string drawn anywhere in the tree, in render order. */
function testi(renderer) {
  const trovate = [];
  const visita = (nodo) => {
    if (typeof nodo === 'string') {
      trovate.push(nodo);
      return;
    }
    if (Array.isArray(nodo)) {
      nodo.forEach(visita);
      return;
    }
    if (nodo && typeof nodo === 'object' && Array.isArray(nodo.children)) {
      nodo.children.forEach(visita);
    }
  };
  visita(renderer.toJSON());
  return trovate;
}

/** The decorative roots: the nodes declaring themselves hidden to assistive tech. */
function decorativi(renderer) {
  return renderer.root.findAll((node) => node.props?.['aria-hidden'] === true);
}

describe('Skeleton — un blocco per riga', () => {
  it('disegna un blocco solo quando non si chiede altro', () => {
    expect(blocchi(render(<Skeleton />))).toHaveLength(1);
  });

  it('disegna un blocco per ogni riga richiesta', () => {
    expect(blocchi(render(<Skeleton righe={4} />))).toHaveLength(4);
  });

  it('porta la larghezza, l’altezza e il raggio richiesti su ogni blocco', () => {
    const disegnati = blocchi(render(<Skeleton righe={2} larghezza={120} altezza={20} raggio={4} />));

    expect(disegnati).toHaveLength(2);
    disegnati.forEach((blocco) => {
      expect(blocco.stile.width).toBe(120);
      expect(blocco.stile.height).toBe(20);
      expect(blocco.stile.borderRadius).toBe(4);
    });
  });

  it('stringe altezza e distanza nella variante compatta', () => {
    const normale = blocchi(render(<Skeleton />))[0];
    const compatta = blocchi(render(<Skeleton compatta />))[0];

    expect(compatta.stile.height).toBeLessThan(normale.stile.height);
  });
});

describe('Skeleton — decorativo e muto', () => {
  it('si nasconde all’albero accessibile sia da nativo sia sul web', () => {
    const [radice] = decorativi(render(<Skeleton righe={2} />));

    expect(radice).toBeDefined();
    expect(radice.props.accessible).toBe(false);
    expect(radice.props.accessibilityElementsHidden).toBe(true);
    expect(radice.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(radice.props['aria-hidden']).toBe(true);
  });

  it('non disegna nessun testo, quindi non ha niente da annunciare', () => {
    expect(testi(render(<Skeleton righe={3} />))).toEqual([]);
    expect(testi(render(<SkeletonLista righe={2} />))).toEqual([]);
  });
});

describe('Skeleton — nessuna animazione', () => {
  it('non porta opacità né valori animati: i blocchi sono fermi', () => {
    const disegnati = viste(render(<SkeletonLista righe={3} />));

    disegnati.forEach((vista) => {
      expect(vista.stile.opacity).toBeUndefined();
      // Un valore animato è un oggetto (un `Animated.Value`): qui ogni
      // proprietà di stile è un numero o una stringa, cioè un disegno fermo.
      Object.values(vista.stile).forEach((valore) => {
        expect(typeof valore === 'object' && valore !== null).toBe(false);
      });
    });
  });

  it('con «Riduci movimento» attivo il disegno resta identico: non c’è movimento da togliere', async () => {
    const lettura = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const iscrizione = jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove: () => {} });

    const fermo = JSON.stringify(render(<SkeletonLista righe={3} />).toJSON());
    let ridotto;
    await act(async () => {
      ridotto = create(<SkeletonLista righe={3} />);
    });

    expect(JSON.stringify(ridotto.toJSON())).toBe(fermo);

    lettura.mockRestore();
    iscrizione.mockRestore();
  });
});

describe('SkeletonLista — la sagoma della lista', () => {
  it('disegna una riga per ogni riga richiesta e tre per default', () => {
    expect(righe(render(<SkeletonLista />))).toHaveLength(3);
    expect(righe(render(<SkeletonLista righe={2} />))).toHaveLength(2);
  });

  it('dà a ogni riga il tondo e due righe di testo, come una riga vera', () => {
    const renderer = render(<SkeletonLista righe={2} />);
    // Due righe: il tondo (40×40 a pillola) e i due blocchi di testo, per ognuna.
    expect(blocchi(renderer)).toHaveLength(2 * 3);
    expect(blocchi(renderer).filter((blocco) => blocco.stile.width === 40)).toHaveLength(2);
  });

  it('è nascosta all’albero accessibile', () => {
    expect(decorativi(render(<SkeletonLista righe={2} />)).length).toBeGreaterThan(0);
  });
});
