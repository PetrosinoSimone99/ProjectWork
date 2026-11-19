import { act, create } from 'react-test-renderer';

import { AppInput } from '../AppInput';
import { MessageComposer } from '../MessageComposer';

function render(onInvia, extra = {}) {
  let renderer;
  act(() => {
    renderer = create(<MessageComposer onInvia={onInvia} {...extra} />);
  });
  return renderer;
}

/** The one draft field, as `AppInput` received it. */
function campo(renderer) {
  const campi = renderer.root.findAllByType(AppInput);
  expect(campi).toHaveLength(1);
  return campi[0];
}

/** Types into the draft the way the field reports keystrokes. */
function scrivi(renderer, testo) {
  act(() => {
    campo(renderer).props.onChangeText(testo);
  });
}

/**
 * The send control with this accessible name, looked up right now: after a
 * re-render the node carries the fresh handler with the fresh draft.
 */
function pulsanteInvia(renderer) {
  const pulsante = renderer.root
    .findAll(
      (node) =>
        node.props?.accessibilityLabel === 'Invia' &&
        node.props?.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    )
    .at(0);
  expect(pulsante).toBeDefined();
  return pulsante;
}

/**
 * The send control, pressed the way a tap would:
 * the handler runs directly, so the assertions below test the component's own
 * guard — the announced `disabled` state covers the platform refusing the tap.
 */
async function premiInvia(renderer) {
  const pulsante = pulsanteInvia(renderer);
  // `onPress` is `async` since the draft survives a failed send: awaiting it
  // inside `act` lets the clear (or the keep) land before the assertions.
  await act(async () => {
    await pulsante.props.onPress();
  });
}

/** The announced state of the send control: disabled and busy, exactly. */
function statoInvia(renderer) {
  const nodi = renderer.root.findAll(
    (node) => node.props?.accessibilityLabel === 'Invia' && node.props?.accessibilityState,
  );
  expect(nodi.length).toBeGreaterThan(0);
  return nodi[0].props.accessibilityState;
}

/** Visible copy, matched on rendered children as the sibling tests do. */
function testoVisibile(renderer, testo) {
  return renderer.root.findAll((node) => node.props?.children === testo).length > 0;
}

describe('MessageComposer — the draft field', () => {
  it('wires the field to the contract: label, cap, counter, name', () => {
    const renderer = render(jest.fn());

    const props = campo(renderer).props;
    expect(props.label).toBe('Messaggio');
    expect(props.accessibilityLabel).toBe('Scrivi un messaggio');
    expect(props.multiline).toBe(true);
    expect(props.maxLength).toBe(1000);
    expect(props.contatore).toBe('0/1000');
    expect(testoVisibile(renderer, '0/1000')).toBe(true);
    // An empty field stays typeable: emptiness locks the send, not the input.
    expect(props.editable).toBe(true);
  });

  it('never sends an empty or whitespace-only draft', async () => {
    const onInvia = jest.fn();
    const renderer = render(onInvia);

    expect(statoInvia(renderer)).toEqual({ disabled: true, busy: false });
    await premiInvia(renderer);
    expect(onInvia).not.toHaveBeenCalled();

    scrivi(renderer, '   ');
    expect(statoInvia(renderer)).toEqual({ disabled: true, busy: false });
    await premiInvia(renderer);
    expect(onInvia).not.toHaveBeenCalled();
    expect(campo(renderer).props.value).toBe('   ');
  });

  it('sends the trimmed draft and empties the field', async () => {
    const onInvia = jest.fn();
    const renderer = render(onInvia);

    scrivi(renderer, '  Ciao baratto  ');
    expect(testoVisibile(renderer, '16/1000')).toBe(true);
    expect(statoInvia(renderer)).toEqual({ disabled: false, busy: false });

    await premiInvia(renderer);

    expect(onInvia).toHaveBeenCalledTimes(1);
    expect(onInvia).toHaveBeenCalledWith('Ciao baratto');
    expect(campo(renderer).props.value).toBe('');
    expect(testoVisibile(renderer, '0/1000')).toBe(true);
  });

  it('locks into loading while a send is in flight', async () => {
    const onInvia = jest.fn();
    const renderer = render(onInvia, { inviando: true });

    // Driven directly: the locked field would refuse the keystroke itself.
    scrivi(renderer, 'Ciao');
    expect(campo(renderer).props.editable).toBe(false);
    expect(statoInvia(renderer)).toEqual({ disabled: true, busy: true });
    // The pill shows the spinner, not its label.
    expect(testoVisibile(renderer, 'Invia')).toBe(false);

    await premiInvia(renderer);
    expect(onInvia).not.toHaveBeenCalled();
  });

  it('does nothing while the composer is disabled', async () => {
    const onInvia = jest.fn();
    const renderer = render(onInvia, { disabilitato: true });

    // Only the prop can stop a non-empty draft: emptiness and sending are out.
    scrivi(renderer, 'Ciao');
    expect(campo(renderer).props.editable).toBe(false);
    expect(statoInvia(renderer)).toEqual({ disabled: true, busy: false });

    await premiInvia(renderer);
    expect(onInvia).not.toHaveBeenCalled();
    expect(campo(renderer).props.value).toBe('Ciao');
  });

  it('keeps the draft when the send answers false', async () => {
    const onInvia = jest.fn().mockResolvedValue(false);
    const renderer = render(onInvia);

    scrivi(renderer, 'Ciao baratto');
    await premiInvia(renderer);

    expect(onInvia).toHaveBeenCalledWith('Ciao baratto');
    // Nothing typed is lost: a rejected POST is not a reason to empty the field.
    expect(campo(renderer).props.value).toBe('Ciao baratto');
  });
});

describe('MessageComposer — the send guard', () => {
  it('sends once when two taps land in the same frame', async () => {
    let risolvi;
    const onInvia = jest.fn(
      () =>
        new Promise((resolve) => {
          risolvi = resolve;
        }),
    );
    const renderer = render(onInvia);
    scrivi(renderer, 'Ciao baratto');

    // Un solo render per entrambi i tap: `inviando` è ancora `false` in tutti
    // e due, come sul dispositivo, quindi solo il ref può fermare il secondo.
    const premi = pulsanteInvia(renderer).props.onPress;
    await act(async () => {
      premi();
      premi();
    });

    expect(onInvia).toHaveBeenCalledTimes(1);
    expect(onInvia).toHaveBeenCalledWith('Ciao baratto');

    // Il ref si azzera nel `finally`: la bozza sparisce quando l'invio si chiude.
    await act(async () => {
      risolvi(true);
    });
    expect(campo(renderer).props.value).toBe('');
  });

  it('sends the next message after the first one resolves', async () => {
    const attese = [];
    const onInvia = jest.fn(
      () =>
        new Promise((resolve) => {
          attese.push(resolve);
        }),
    );
    const renderer = render(onInvia);

    scrivi(renderer, 'Primo');
    // Non si attende `onPress` qui: la `onInvia` finta resta appesa apposta.
    await act(async () => {
      pulsanteInvia(renderer).props.onPress();
    });
    expect(onInvia).toHaveBeenCalledTimes(1);

    await act(async () => {
      attese[0](true);
    });
    expect(campo(renderer).props.value).toBe('');

    // Il `finally` ha azzerato il ref: il secondo messaggio deve partire.
    scrivi(renderer, 'Secondo');
    await act(async () => {
      pulsanteInvia(renderer).props.onPress();
    });
    expect(onInvia).toHaveBeenCalledTimes(2);
    expect(onInvia).toHaveBeenLastCalledWith('Secondo');

    await act(async () => {
      attese[1](true);
    });
  });
});
