import { renderHook } from '@testing-library/react-native';
import { layout } from '@/theme/tokens';
import { sizeClassForWidth, useBreakpoint } from '../useBreakpoint';

const soglie = layout.sizeClasses;

/**
 * La larghezza della finestra è l'unica cosa che l'hook legge da fuori: il mock
 * la restituisce a ogni render, quindi il test sposta la finestra senza toccare
 * l'hook. Il nome comincia con `mock` perché la factory di `jest.mock` è
 * issata sopra gli import e può vedere solo variabili con quel prefisso.
 *
 * L'involucro è un proxy e non una copia con spread: `react-native` espone le
 * sue voci come getter, e copiarle le valuterebbe tutte all'import (il modulo
 * `DevMenu` non esiste sotto jest). Così si sostituisce una voce e le altre
 * restano quelle vere, lette solo da chi le chiede.
 */
let mockLarghezza = 375;

jest.mock('react-native', () => {
  const vero = jest.requireActual('react-native');
  return new Proxy(vero, {
    get: (bersaglio, chiave) =>
      chiave === 'useWindowDimensions'
        ? () => ({ width: mockLarghezza, height: 800 })
        : Reflect.get(bersaglio, chiave),
  });
});

describe('sizeClassForWidth', () => {
  it('mette ogni soglia nella classe che comincia lì, non in quella sotto', () => {
    expect(sizeClassForWidth(soglie.compact)).toBe('compact');
    expect(sizeClassForWidth(soglie.medium)).toBe('medium');
    expect(sizeClassForWidth(soglie.expanded)).toBe('expanded');
  });

  it('resta nella classe precedente un pixel sotto la soglia', () => {
    expect(sizeClassForWidth(soglie.medium - 1)).toBe('compact');
    expect(sizeClassForWidth(soglie.expanded - 1)).toBe('medium');
    expect(sizeClassForWidth(soglie.expanded + 1)).toBe('expanded');
  });

  it('nomina telefono, tablet verticale e finestra larga con le misure vere', () => {
    expect(sizeClassForWidth(375)).toBe('compact');
    expect(sizeClassForWidth(768)).toBe('medium');
    expect(sizeClassForWidth(1024)).toBe('expanded');
  });
});

describe('useBreakpoint', () => {
  it('restituisce la classe della finestra corrente e la larghezza grezza', async () => {
    mockLarghezza = 768;
    // Da RTL 14 `renderHook` è asincrono: il montaggio si aspetta.
    const { result } = await renderHook(() => useBreakpoint());

    expect(result.current).toEqual({ classe: 'medium', larghezza: 768 });
  });

  it('cambia classe quando la finestra attraversa una soglia', async () => {
    mockLarghezza = soglie.expanded - 1;
    const { letture, aggiorna } = await monta();

    await aggiorna(soglie.expanded);

    expect(letture.map((valore) => valore.classe)).toEqual(['medium', 'expanded']);
    expect(letture[1].larghezza).toBe(soglie.expanded);
  });

  it('tiene lo stesso oggetto finché la larghezza non cambia', async () => {
    mockLarghezza = 768;
    const { letture, aggiorna } = await monta();

    await aggiorna(768);
    expect(letture[1]).toBe(letture[0]);

    await aggiorna(769);
    expect(letture[2]).not.toBe(letture[0]);
  });
});

/** Monta l'hook e conserva ogni valore restituito, in ordine di render. */
async function monta() {
  const { result, rerender } = await renderHook(() => useBreakpoint());
  const letture = [result.current];

  return {
    letture,
    aggiorna: async (larghezza) => {
      mockLarghezza = larghezza;
      await rerender();
      letture.push(result.current);
    },
  };
}
