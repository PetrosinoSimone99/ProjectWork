import { act, fireEvent, render, screen } from '@testing-library/react-native';

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

/** From RTL 14 `render` is async: the mount is awaited, not wrapped in `act`. */
async function renderCard(queue, extra = {}) {
  await render(<QueueCard coda={queue} {...extra} />);
}

/** The control with this accessibility label, pressed the way a tap would. */
async function press(accessibilityLabel) {
  await fireEvent.press(screen.getByLabelText(accessibilityLabel));
}

/** The controls announcing the open affordance, matched on the label prefix. */
function withOpenLabel() {
  return screen.container.queryAll(
    (node) =>
      typeof node.props?.accessibilityLabel === 'string' &&
      node.props.accessibilityLabel.startsWith(OPEN_LABEL_PREFIX),
  );
}

/** The actionable node of the open affordance: label, button role and a handler. */
async function pressOpen() {
  const node = withOpenLabel().find((nodo) => nodo.props.accessibilityRole === 'button');
  expect(node).toBeDefined();
  await fireEvent.press(node);
}

/** Buttons as they render: the drawn nodes with the button role, so one button counts once. */
function renderedButtons() {
  return screen.container.queryAll((node) => node.props?.accessibilityRole === 'button');
}

/**
 * Whether anything the card draws is wired to this handler.
 *
 * RTL 14 draws host elements only, and the handler of a `Pressable` lives on the
 * component above the node it draws: no query reaches it. `unstable_fiber` is the
 * internal API (unstable, and for that reason confined here) that walks from a
 * drawn node up to the components that gave it its props.
 */
function isWiredTo(handler) {
  for (const node of screen.container.queryAll(() => true)) {
    for (let fiber = node.unstable_fiber; fiber !== null; fiber = fiber.return) {
      if (fiber.memoizedProps?.onPress === handler) {
        return true;
      }
    }
  }
  return false;
}

describe('QueueCard agreement link', () => {
  it('opens the agreement when the queue is linked', async () => {
    const onApri = jest.fn();
    await renderCard({ ...QUEUE, agreementId: 7 }, { onApri });

    // The count is taken over the drawn nodes: the memo and function layers of
    // the one Pressable never reach the query, so they are not three buttons.
    const openable = withOpenLabel().filter(
      (node) => node.props?.accessibilityRole === 'button',
    );
    expect(openable).toHaveLength(1);

    // The name carries the card's own text: a `button` makes its descendants
    // presentational, so a fixed label silences the description, the category,
    // the place and the status on the linked rows (F50).
    expect(openable[0].props.accessibilityLabel).toContain(QUEUE.descrizione);

    await pressOpen();
    expect(onApri).toHaveBeenCalledTimes(1);
  });

  it('stays inert when the queue has no agreement', async () => {
    const onApri = jest.fn();
    await renderCard({ ...QUEUE, agreementId: null }, { onApri });

    expect(withOpenLabel()).toHaveLength(0);

    // The cancel AppButton is always a button, so inertness means it is the
    // only one: no informational block gained the role.
    expect(renderedButtons().map((node) => node.props.accessibilityLabel)).toEqual([
      'Annulla questa coda',
    ]);
    expect(isWiredTo(onApri)).toBe(false);
  });

  it('never opens the agreement from the cancel button', async () => {
    const onApri = jest.fn();
    const onAnnulla = jest.fn();
    await renderCard({ ...QUEUE, agreementId: 7 }, { onApri, onAnnulla });

    // The row's cancel button only opens the confirm panel; the panel's
    // confirm is the one that reaches `onAnnulla`.
    await press('Annulla questa coda');
    expect(onApri).not.toHaveBeenCalled();

    await press('Annulla coda');
    await act(async () => {});

    expect(onAnnulla).toHaveBeenCalledTimes(1);
    expect(onApri).not.toHaveBeenCalled();
  });
});

/** The "Creata il …" lines the row draws, as the user reads them. */
function dateLines() {
  // `screen.container` walks the drawn nodes only: the component layers above
  // repeat the same string, and they are not drawn.
  return screen.container
    .queryAll(
      (node) =>
        typeof node.props?.children === 'string' &&
        node.props.children.startsWith('Creata il'),
    )
    .map((node) => node.props.children);
}

describe('QueueCard creation date', () => {
  it('dates the row with the day and the minute', async () => {
    // No `Z`: the value is read as the device's own time, so the asserted
    // minute is the one the card prints on any machine.
    await renderCard({ ...QUEUE, creataIl: '2026-11-19T10:12:00' });

    expect(dateLines()).toEqual(['Creata il 19 nov, 10:12']);
  });

  it('draws no date line when the timestamp is missing or unusable', async () => {
    // `null` from the normalizer, and a string the backend should never send:
    // the row omits the line instead of printing "Invalid Date".
    await renderCard({ ...QUEUE, creataIl: null });
    expect(dateLines()).toEqual([]);
    await renderCard({ ...QUEUE, creataIl: 'non-una-data' });
    expect(dateLines()).toEqual([]);
  });
});

/** Whether a drawn node of the card prints exactly this string. */
function drawsText(text) {
  return (
    screen.container.queryAll((node) => node.props?.children === text).length > 0
  );
}

describe('QueueCard place line', () => {
  it('says the exchange is remote when the queue has no place', async () => {
    const onApri = jest.fn();
    // Linked, so the card announces its own content through the open label too.
    await renderCard(
      { ...QUEUE, localita: null, daRemoto: true, agreementId: 7 },
      { onApri },
    );

    expect(withOpenLabel()[0].props.accessibilityLabel).toContain('Da remoto');
    expect(drawsText('Da remoto')).toBe(true);
  });

  it('says the place is not indicated when there is neither a place nor a mode', async () => {
    await renderCard({ ...QUEUE, localita: null, daRemoto: false });

    expect(drawsText('Località non indicata')).toBe(true);
  });

  it('prints the place when the queue has one, remote or not', async () => {
    await renderCard({ ...QUEUE, localita: 'Roma', daRemoto: true });

    expect(drawsText('Roma')).toBe(true);
    expect(drawsText('Da remoto')).toBe(false);
  });
});
