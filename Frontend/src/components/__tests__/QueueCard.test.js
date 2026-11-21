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
    renderer = create(<QueueCard coda={queue} {...extra} />);
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
    const onApri = jest.fn();
    const renderer = renderCard({ ...QUEUE, agreementId: 7 }, { onApri });

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
    expect(onApri).toHaveBeenCalledTimes(1);
  });

  it('stays inert when the queue has no agreement', () => {
    const onApri = jest.fn();
    const renderer = renderCard({ ...QUEUE, agreementId: null }, { onApri });

    expect(withOpenLabel(renderer)).toHaveLength(0);

    // The cancel AppButton is always a button, so inertness means it is the
    // only one: no informational block gained the role.
    expect(renderedButtons(renderer).map((node) => node.props.accessibilityLabel)).toEqual([
      'Annulla questa coda',
    ]);
    expect(renderer.root.findAll((node) => node.props?.onPress === onApri)).toHaveLength(0);
  });

  it('never opens the agreement from the cancel button', async () => {
    const onApri = jest.fn();
    const onAnnulla = jest.fn();
    const renderer = renderCard({ ...QUEUE, agreementId: 7 }, { onApri, onAnnulla });

    // The row's cancel button only opens the confirm panel; the panel's
    // confirm is the one that reaches `onAnnulla`.
    press(renderer, 'Annulla questa coda');
    expect(onApri).not.toHaveBeenCalled();

    press(renderer, 'Annulla coda');
    await act(async () => {});

    expect(onAnnulla).toHaveBeenCalledTimes(1);
    expect(onApri).not.toHaveBeenCalled();
  });
});

/** The "Creata il …" lines the row draws, as the user reads them. */
function dateLines(renderer) {
  // Host elements only: the component layers above repeat the same string.
  return renderer.root
    .findAll(
      (node) =>
        typeof node.type === 'string' &&
        typeof node.props?.children === 'string' &&
        node.props.children.startsWith('Creata il'),
    )
    .map((node) => node.props.children);
}

describe('QueueCard creation date', () => {
  it('dates the row with the day and the minute', () => {
    // No `Z`: the value is read as the device's own time, so the asserted
    // minute is the one the card prints on any machine.
    const renderer = renderCard({ ...QUEUE, creataIl: '2026-11-19T10:12:00' });

    expect(dateLines(renderer)).toEqual(['Creata il 19 nov, 10:12']);
  });

  it('draws no date line when the timestamp is missing or unusable', () => {
    // `null` from the normalizer, and a string the backend should never send:
    // the row omits the line instead of printing "Invalid Date".
    expect(dateLines(renderCard({ ...QUEUE, creataIl: null }))).toEqual([]);
    expect(dateLines(renderCard({ ...QUEUE, creataIl: 'non-una-data' }))).toEqual([]);
  });
});

/** Whether a host text node of the card prints exactly this string. */
function drawsText(renderer, text) {
  return (
    renderer.root.findAll(
      (node) => typeof node.type === 'string' && node.props?.children === text,
    ).length > 0
  );
}

describe('QueueCard place line', () => {
  it('says the exchange is remote when the queue has no place', () => {
    const onApri = jest.fn();
    // Linked, so the card announces its own content through the open label too.
    const renderer = renderCard(
      { ...QUEUE, localita: null, daRemoto: true, agreementId: 7 },
      { onApri },
    );

    expect(withOpenLabel(renderer, true)[0].props.accessibilityLabel).toContain('Da remoto');
    expect(drawsText(renderer, 'Da remoto')).toBe(true);
  });

  it('says the place is not indicated when there is neither a place nor a mode', () => {
    const renderer = renderCard({ ...QUEUE, localita: null, daRemoto: false });

    expect(drawsText(renderer, 'Località non indicata')).toBe(true);
  });
});
