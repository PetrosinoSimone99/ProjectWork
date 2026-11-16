import { act, create } from 'react-test-renderer';

import { QueueCard } from '../QueueCard';

/** The label the linked card announces to assistive technology. */
const ETICHETTA_APRI = 'Apri lo scambio collegato a questa coda';

/**
 * One row of `GET /get-queues` as the card receives it: every field the card
 * reads, with no agreement — the linked case overrides `agreementId` per test.
 */
const CODA = {
  id: 42,
  tipo: 'OFFER',
  stato: 'OPEN',
  descrizione: 'Aiuto con i compiti di matematica.',
  categoria: 'Istruzione',
  localita: 'Roma',
  daRemoto: false,
  agreementId: null,
};

function renderCoda(coda, extra = {}) {
  let renderer;
  act(() => {
    renderer = create(<QueueCard coda={coda} {...extra} />);
  });
  return renderer;
}

/** The control with this accessibility label, pressed the way a tap would. */
function premi(renderer, accessibilityLabel) {
  const pulsante = renderer.root
    .findAll(
      (node) =>
        node.props?.accessibilityLabel === accessibilityLabel &&
        typeof node.props.onPress === 'function',
    )
    .at(0);
  expect(pulsante).toBeDefined();
  act(() => {
    pulsante.props.onPress();
  });
}

/** Buttons as they render: host elements only, so one button counts once. */
function pulsantiRenderati(renderer) {
  return renderer.root.findAll(
    (node) => typeof node.type === 'string' && node.props?.accessibilityRole === 'button',
  );
}

describe('QueueCard agreement link', () => {
  it('opens the agreement when the queue is linked', () => {
    const onApri = jest.fn();
    const renderer = renderCoda({ ...CODA, agreementId: 7 }, { onApri });

    // The count is taken over rendered elements: the memo/function layers of
    // the one Pressable repeat the same props, so they are not three buttons.
    const apribili = renderer.root.findAll(
      (node) =>
        typeof node.type === 'string' &&
        node.props?.accessibilityLabel === ETICHETTA_APRI &&
        node.props?.accessibilityRole === 'button',
    );
    expect(apribili).toHaveLength(1);

    premi(renderer, ETICHETTA_APRI);
    expect(onApri).toHaveBeenCalledTimes(1);
  });

  it('stays inert when the queue has no agreement', () => {
    const onApri = jest.fn();
    const renderer = renderCoda({ ...CODA, agreementId: null }, { onApri });

    const conEtichetta = renderer.root.findAll(
      (node) => node.props?.accessibilityLabel === ETICHETTA_APRI,
    );
    expect(conEtichetta).toHaveLength(0);

    const conRuolo = renderer.root.findAll(
      (node) =>
        node.props?.accessibilityLabel === ETICHETTA_APRI &&
        node.props?.accessibilityRole === 'button',
    );
    expect(conRuolo).toHaveLength(0);

    // The cancel AppButton is always a button, so inertness means it is the
    // only one: no informational block gained the role.
    expect(pulsantiRenderati(renderer).map((node) => node.props.accessibilityLabel)).toEqual([
      'Annulla questa coda',
    ]);
  });

  it('never opens the agreement from the cancel button', async () => {
    const onApri = jest.fn();
    const onAnnulla = jest.fn();
    const renderer = renderCoda({ ...CODA, agreementId: 7 }, { onApri, onAnnulla });

    // The row's cancel button only opens the confirm panel; the panel's
    // confirm is the one that reaches `onAnnulla`.
    premi(renderer, 'Annulla questa coda');
    expect(onApri).not.toHaveBeenCalled();

    premi(renderer, 'Annulla coda');
    await act(async () => {});

    expect(onAnnulla).toHaveBeenCalledTimes(1);
    expect(onApri).not.toHaveBeenCalled();
  });
});
