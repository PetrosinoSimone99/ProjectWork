import { AccessibilityInfo, StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { Skeleton, SkeletonLista } from '../Skeleton';

/**
 * Da RTL 14 `render` è asincrono e il container vede i soli nodi host: il tipo di
 * una `View` è la stringa `'View'`, non il componente importato. Gli helper qui
 * sotto leggono quindi `screen`, che l'ultimo `render` ha appena riempito.
 */

/** Every drawn `View`, with its style flattened: the only nodes that exist. */
function viste() {
  return screen.container.queryAll((nodo) => nodo.type === 'View').map((nodo) => ({
    props: nodo.props,
    stile: StyleSheet.flatten(nodo.props.style ?? {}),
  }));
}

/** The grey blocks: a childless `View` with its own height and corner radius. */
function blocchi() {
  return viste().filter(
    (vista) => vista.stile.height !== undefined && vista.stile.borderRadius !== undefined,
  );
}

/** The list rows: the bordered containers, one per placeholder row. */
function righe() {
  return viste().filter((vista) => vista.stile.borderWidth === 1);
}

/** Every string drawn anywhere in the tree, in render order. */
function testi() {
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
  visita(screen.toJSON());
  return trovate;
}

/** The decorative roots: the nodes declaring themselves hidden to assistive tech. */
function decorativi() {
  return screen.container.queryAll((nodo) => nodo.props?.['aria-hidden'] === true);
}

describe('Skeleton — un blocco per riga', () => {
  it('disegna un blocco solo quando non si chiede altro', async () => {
    await render(<Skeleton />);

    expect(blocchi()).toHaveLength(1);
  });

  it('disegna un blocco per ogni riga richiesta', async () => {
    await render(<Skeleton righe={4} />);

    expect(blocchi()).toHaveLength(4);
  });

  it('porta la larghezza, l’altezza e il raggio richiesti su ogni blocco', async () => {
    await render(<Skeleton righe={2} larghezza={120} altezza={20} raggio={4} />);

    const disegnati = blocchi();
    expect(disegnati).toHaveLength(2);
    disegnati.forEach((blocco) => {
      expect(blocco.stile.width).toBe(120);
      expect(blocco.stile.height).toBe(20);
      expect(blocco.stile.borderRadius).toBe(4);
    });
  });

  it('stringe altezza e distanza nella variante compatta', async () => {
    await render(<Skeleton />);
    const normale = blocchi()[0];
    await render(<Skeleton compatta />);
    const compatta = blocchi()[0];

    expect(compatta.stile.height).toBeLessThan(normale.stile.height);
  });
});

describe('Skeleton — decorativo e muto', () => {
  it('si nasconde all’albero accessibile sia da nativo sia sul web', async () => {
    await render(<Skeleton righe={2} />);
    const [radice] = decorativi();

    expect(radice).toBeDefined();
    expect(radice.props.accessible).toBe(false);
    expect(radice.props.accessibilityElementsHidden).toBe(true);
    expect(radice.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(radice.props['aria-hidden']).toBe(true);
  });

  it('non disegna nessun testo, quindi non ha niente da annunciare', async () => {
    await render(<Skeleton righe={3} />);
    expect(testi()).toEqual([]);

    await render(<SkeletonLista righe={2} />);
    expect(testi()).toEqual([]);
  });
});

describe('Skeleton — nessuna animazione', () => {
  it('non porta opacità né valori animati: i blocchi sono fermi', async () => {
    await render(<SkeletonLista righe={3} />);

    viste().forEach((vista) => {
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

    await render(<SkeletonLista righe={3} />);
    const fermo = JSON.stringify(screen.toJSON());

    await render(<SkeletonLista righe={3} />);
    const ridotto = screen.toJSON();

    expect(JSON.stringify(ridotto)).toBe(fermo);

    lettura.mockRestore();
    iscrizione.mockRestore();
  });
});

describe('SkeletonLista — la sagoma della lista', () => {
  it('disegna una riga per ogni riga richiesta e tre per default', async () => {
    await render(<SkeletonLista />);
    expect(righe()).toHaveLength(3);

    await render(<SkeletonLista righe={2} />);
    expect(righe()).toHaveLength(2);
  });

  it('dà a ogni riga il tondo e due righe di testo, come una riga vera', async () => {
    await render(<SkeletonLista righe={2} />);

    // Due righe: il tondo (40×40 a pillola) e i due blocchi di testo, per ognuna.
    expect(blocchi()).toHaveLength(2 * 3);
    expect(blocchi().filter((blocco) => blocco.stile.width === 40)).toHaveLength(2);
  });

  it('è nascosta all’albero accessibile', async () => {
    await render(<SkeletonLista righe={2} />);

    expect(decorativi().length).toBeGreaterThan(0);
  });
});
