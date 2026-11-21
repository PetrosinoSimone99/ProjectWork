import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { StaffOperationDetail } from '../StaffDetailPanels';
import { layout } from '@/theme/tokens';

/**
 * Una voce di `GET /staff/operations/{id}` come la produce
 * `normalizeStaffOperation`: la riga di lista più `prima` e `dopo`, che restano
 * `null` quando l'operazione non ne registra.
 */
const OPERAZIONE = {
  id: 12,
  azione: 'REPORT_REVIEWED',
  bersaglio: 'REPORT',
  bersaglioId: 7,
  staff: { id: 3, username: 'staff.anna' },
  creataIl: '2026-11-02T09:30:00+00:00',
  prima: null,
  dopo: null,
};

/**
 * Il valore che in produzione usciva dal pannello: la nota della staff è prosa,
 * quindi è lunga quanto le altre e non ha spazi utili per spezzarsi presto.
 */
const NOTA_LUNGA =
  'Chiusa dopo aver riletto il motivo e lo scambio: i dati personali sono stati rimossi dal profilo, il segnalato è stato avvisato e la segnalazione non ha altri elementi da verificare.';

/**
 * Da RTL 14 `render` è asincrono e il container vede i soli nodi host: un testo
 * si riconosce dal tipo `'Text'`, non dal componente importato. Gli helper qui
 * sotto leggono `screen`, che l'ultimo `render` ha appena riempito.
 */
async function renderPanel(operation) {
  await render(<StaffOperationDetail detail={{ operation, loading: false, error: null }} />);
}

/** Ogni stringa disegnata, in ordine di render. */
function testi() {
  return screen.container
    .queryAll((node) => node.type === 'Text')
    .map((node) => node.props.children)
    .filter((child) => typeof child === 'string');
}

/** Il testo disegnato con questo esatto contenuto: se manca, il test è rosso. */
function nodoTesto(contenuto) {
  const nodo = screen.container
    .queryAll((node) => node.type === 'Text')
    .find((node) => node.props.children === contenuto);
  expect(nodo).toBeDefined();
  return nodo;
}

/** Lo stile del testo disegnato con questo esatto contenuto. */
function stileDelTesto(contenuto) {
  return StyleSheet.flatten(nodoTesto(contenuto).props.style ?? {});
}

describe('StaffOperationDetail — la nota lunga', () => {
  it('disegna il valore intero e lo lascia andare a capo invece di allargare la riga', async () => {
    await renderPanel({ ...OPERAZIONE, prima: { reviewNote: NOTA_LUNGA } });

    // Intero: nessun taglio, nemmeno sul nodo che lo disegna.
    expect(testi()).toContain(NOTA_LUNGA);

    const valore = nodoTesto(NOTA_LUNGA);
    const regole = StyleSheet.flatten(valore.props.style ?? {});
    expect(regole.flex).toBe(1);
    expect(regole.minWidth).toBe(0);
    expect(valore.props.numberOfLines).toBeUndefined();
  });

  it('tiene la chiave su una colonna che non si stringe e non si allarga', async () => {
    await renderPanel({ ...OPERAZIONE, prima: { reviewNote: NOTA_LUNGA } });

    // Una larghezza, non un minimo: con `minWidth` una chiave lunga allargherebbe
    // solo la propria riga, e i valori dello stesso blocco partirebbero da x
    // diverse (review 2026-11-19, P1).
    const regole = stileDelTesto('reviewNote');
    expect(regole.width).toBe(layout.colonnaEtichetta);
    expect(regole.minWidth).toBeUndefined();
    expect(regole.flexShrink).toBe(0);
  });
});

describe('StaffOperationDetail — la voce senza valori', () => {
  it('lo dice invece di disegnare due blocchi vuoti', async () => {
    await renderPanel({ ...OPERAZIONE, prima: null, dopo: null });

    expect(testi()).toContain('Questa voce non registra valori prima e dopo.');
  });
});
