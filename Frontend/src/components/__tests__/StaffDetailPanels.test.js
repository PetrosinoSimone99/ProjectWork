import { StyleSheet, Text } from 'react-native';
import { act, create } from 'react-test-renderer';

import { StaffOperationDetail } from '../StaffDetailPanels';

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

function renderPanel(operation) {
  let renderer;
  act(() => {
    renderer = create(<StaffOperationDetail detail={{ operation, loading: false, error: null }} />);
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

/** Il testo disegnato con questo esatto contenuto: se manca, il test è rosso. */
function nodoTesto(renderer, contenuto) {
  const nodo = renderer.root.findAllByType(Text).find((node) => node.props.children === contenuto);
  expect(nodo).toBeDefined();
  return nodo;
}

/** Lo stile del testo disegnato con questo esatto contenuto. */
function stileDelTesto(renderer, contenuto) {
  return StyleSheet.flatten(nodoTesto(renderer, contenuto).props.style ?? {});
}

describe('StaffOperationDetail — la nota lunga', () => {
  it('disegna il valore intero e lo lascia andare a capo invece di allargare la riga', () => {
    const renderer = renderPanel({ ...OPERAZIONE, prima: { reviewNote: NOTA_LUNGA } });

    // Intero: nessun taglio, nemmeno sul nodo che lo disegna.
    expect(testi(renderer)).toContain(NOTA_LUNGA);

    const valore = nodoTesto(renderer, NOTA_LUNGA);
    const regole = StyleSheet.flatten(valore.props.style ?? {});
    expect(regole.flex).toBe(1);
    expect(regole.minWidth).toBe(0);
    expect(valore.props.numberOfLines).toBeUndefined();
  });

  it('tiene la chiave su una colonna da 88 che non si stringe', () => {
    const renderer = renderPanel({ ...OPERAZIONE, prima: { reviewNote: NOTA_LUNGA } });

    const regole = stileDelTesto(renderer, 'reviewNote');
    expect(regole.minWidth).toBe(88);
    expect(regole.flexShrink).toBe(0);
  });
});

describe('StaffOperationDetail — la voce senza valori', () => {
  it('lo dice invece di disegnare due blocchi vuoti', () => {
    const renderer = renderPanel({ ...OPERAZIONE, prima: null, dopo: null });
    expect(testi(renderer)).toContain('Questa voce non registra valori prima e dopo.');
  });
});
