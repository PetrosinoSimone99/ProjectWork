import { act, create } from 'react-test-renderer';

import { QueueCard } from '../QueueCard';

/** The label the linked card announces to assistive technology, before its content. */
const OPEN_LABEL_PREFIX = 'Apri lo scambio collegato a questa coda';

/**
 * One row of `GET /get-queues` as the card receives it: every field the card
 * reads, with no agreement — the linked case overrides `agreementId` per test.
 */
const QUEUE = {
  id: 42,
  tipo: 'OFFER',
  stato: 'OPEN',
  descrizione: 'Aiuto con i compiti di matematica.',
  categoria: 'Istruzione',
  localita: 'Roma',
  daRemoto: false,
  agreementId: null,
};

function renderCard(queue, extra = {}) {
  let renderer;
  act(() => {
    renderer = create(<QueueCard queue={queue} {...extra} />);
  });
  return renderer;
}

/** The control with this accessibility label, pressed the way a tap would. */
function press(renderer, accessibilityLabel) {
  const button = renderer.root
    .findAll(
      (node) =>
        node.props?.accessibilityLabel === accessibilityLabel &&
        typeof node.props.onPress === 'function',
    )
    .at(0);
  expect(button).toBeDefined();
  act(() => {
    button.props.onPress();
  });
}

/** The controls announcing the open affordance, matched on the label prefix. */
function withOpenLabel(renderer, hostOnly = false) {
  return renderer.root.findAll(
    (node) =>
      (!hostOnly || typeof node.type === 'string') &&
      typeof node.props?.accessibilityLabel === 'string' &&
      node.props.accessibilityLabel.startsWith(OPEN_LABEL_PREFIX),
  );
}

/** The actionable node of the open affordance: label, button role and a handler. */
function pressOpen(renderer) {
  const node = renderer.root
    .findAll(
      (node) =>
        typeof node.props?.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith(OPEN_LABEL_PREFIX) &&
        node.props?.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    )
    .at(0);
  expect(node).toBeDefined();
  act(() => {
    node.props.onPress();
  });
}

/** Buttons as they render: host elements only, so one button counts once. */
function renderedButtons(renderer) {
  return renderer.root.findAll(
    (node) => typeof node.type === 'string' && node.props?.accessibilityRole === 'button',
  );
}

describe('QueueCard agreement link', () => {
  it('opens the agreement when the queue is linked', () => {
    const onOpen = jest.fn();
    const renderer = renderCard({ ...QUEUE, agreementId: 7 }, { onOpen });

    // The count is taken over rendered elements: the memo/function layers of
    // the one Pressable repeat the same props, so they are not three buttons.
    const openable = withOpenLabel(renderer, true).filter(
      (node) => node.props?.accessibilityRole === 'button',
    );
    expect(openable).toHaveLength(1);

    // The name carries the card's own text: a `button` makes its descendants
    // presentational, so a fixed label silences the description, the category,
    // the place and the status on the linked rows (F50).
    expect(openable[0].props.accessibilityLabel).toContain(QUEUE.descrizione);

    pressOpen(renderer);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('stays inert when the queue has no agreement', () => {
    const onOpen = jest.fn();
    const renderer = renderCard({ ...QUEUE, agreementId: null }, { onOpen });

    expect(withOpenLabel(renderer)).toHaveLength(0);

    // The cancel AppButton is always a button, so inertness means it is the
    // only one: no informational block gained the role.
    expect(renderedButtons(renderer).map((node) => node.props.accessibilityLabel)).toEqual([
      'Annulla questa coda',
    ]);
    expect(renderer.root.findAll((node) => node.props?.onPress === onOpen)).toHaveLength(0);
  });

  it('never opens the agreement from the cancel button', async () => {
    const onOpen = jest.fn();
    const onAnnulla = jest.fn();
    const renderer = renderCard({ ...QUEUE, agreementId: 7 }, { onOpen, onAnnulla });

    // The row's cancel button only opens the confirm panel; the panel's
    // confirm is the one that reaches `onAnnulla`.
    press(renderer, 'Annulla questa coda');
    expect(onOpen).not.toHaveBeenCalled();

    press(renderer, 'Annulla coda');
    await act(async () => {});

    expect(onAnnulla).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
