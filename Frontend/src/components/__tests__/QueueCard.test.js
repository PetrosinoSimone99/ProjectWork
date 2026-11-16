import { act, create } from 'react-test-renderer';

import { QueueCard } from '../QueueCard';

/** The label the linked card announces to assistive technology, before its content. */
const PREFISSO_APRI = 'Apri lo scambio collegato a questa coda';

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

/** The controls announcing the open affordance, matched on the label prefix. */
function conEtichettaApri(renderer, hostOnly = false) {
  return renderer.root.findAll(
    (node) =>
      (!hostOnly || typeof node.type === 'string') &&
      typeof node.props?.accessibilityLabel === 'string' &&
      node.props.accessibilityLabel.startsWith(PREFISSO_APRI),
  );
}

/** The actionable node of the open affordance: label, button role and a handler. */
function premiApri(renderer) {
  const nodo = renderer.root
    .findAll(
      (node) =>
        typeof node.props?.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith(PREFISSO_APRI) &&
        node.props?.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    )
    .at(0);
  expect(nodo).toBeDefined();
  act(() => {
    nodo.props.onPress();
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
    const apribili = conEtichettaApri(renderer, true).filter(
      (node) => node.props?.accessibilityRole === 'button',
    );
    expect(apribili).toHaveLength(1);

    // The name carries the card's own text: a `button` makes its descendants
    // presentational, so a fixed label silences the description, the category,
    // the place and the status on the linked rows (F50).
    expect(apribili[0].props.accessibilityLabel).toContain(CODA.descrizione);

    premiApri(renderer);
    expect(onApri).toHaveBeenCalledTimes(1);
  });

  it('stays inert when the queue has no agreement', () => {
    const onApri = jest.fn();
    const renderer = renderCoda({ ...CODA, agreementId: null }, { onApri });

    expect(conEtichettaApri(renderer)).toHaveLength(0);

    // The cancel AppButton is always a button, so inertness means it is the
    // only one: no informational block gained the role.
    expect(pulsantiRenderati(renderer).map((node) => node.props.accessibilityLabel)).toEqual([
      'Annulla questa coda',
    ]);
    expect(renderer.root.findAll((node) => node.props?.onPress === onApri)).toHaveLength(0);
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
