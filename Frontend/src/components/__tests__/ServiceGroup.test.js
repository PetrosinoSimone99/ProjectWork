import { render, screen } from '@testing-library/react-native';

import { ServiceGroup } from '../ServiceGroup';

/**
 * The group's one decision: how long it is allowed to be.
 *
 * The same component draws the rows twice — capped and counted inside the
 * service detail, whole and uncounted on the public profile — so the cap is a
 * prop and not a constant, and the counter exists only where a cut exists.
 */
const SERVIZI = [1, 2, 3, 4, 5].map((n) => ({
  chiave: `OFFER-${n}`,
  descrizione: `Servizio ${n}`,
}));

function renderGruppo(props) {
  // Da RTL 14 `render` è asincrono: il montaggio si aspetta, non si avvolge in `act`.
  return render(<ServiceGroup titolo="Offre" icona="pricetag-outline" {...props} />);
}

/**
 * Le righe di testo disegnate, lette dai nodi host: RTL 14 non raggiunge più il
 * componente `AppText`, ma il `Text` che disegna porta ancora i figli come stringa.
 */
function figliDiTesto() {
  return screen.container
    .queryAll((nodo) => typeof nodo.props?.children === 'string')
    .map((nodo) => nodo.props.children);
}

/** The row lines, recognised by the `- ` the group puts in front of each. */
function righe() {
  return figliDiTesto().filter((child) => child.startsWith('- '));
}

/** The «e N altre» line, if the group drew one. */
function contatore() {
  return figliDiTesto().filter((child) => /^e \d+ altr[ae]$/.test(child));
}

describe('ServiceGroup — the rows it is allowed to draw', () => {
  it('caps at three rows and counts the rest when no limit is given', async () => {
    await renderGruppo({ servizi: SERVIZI });

    expect(righe()).toHaveLength(3);
    expect(contatore()).toEqual(['e 2 altre']);
  });

  it('draws every row and no counter when the limit is null', async () => {
    await renderGruppo({ servizi: SERVIZI, limite: null });

    expect(righe()).toHaveLength(5);
    expect(contatore()).toHaveLength(0);
  });

  it('draws nothing for an empty or absent list', async () => {
    await renderGruppo({ servizi: [] });
    expect(screen.toJSON()).toBeNull();

    await renderGruppo({ servizi: undefined });
    expect(screen.toJSON()).toBeNull();
  });

  it('treats a limit of zero or less as no limit at all', async () => {
    // A cap that hides the rows it claims to show is not a cap: the caller
    // either truncates for real or shows everything.
    await renderGruppo({ servizi: SERVIZI, limite: 0 });
    expect(righe()).toHaveLength(5);
    await renderGruppo({ servizi: SERVIZI, limite: -2 });
    expect(contatore()).toHaveLength(0);
  });

  it('draws one line per row by default and the whole description on request', async () => {
    // Il limite di righe è una prop del `Text` disegnato: si legge da lì.
    const numeriDiRiga = () =>
      screen.container.queryAll(
        (nodo) => nodo.type === 'Text' && nodo.props.numberOfLines !== undefined,
      );

    await renderGruppo({ servizi: SERVIZI });
    expect(numeriDiRiga()[0].props.numberOfLines).toBe(1);

    await renderGruppo({ servizi: SERVIZI, righe: null });
    expect(numeriDiRiga()).toHaveLength(0);
  });
});
