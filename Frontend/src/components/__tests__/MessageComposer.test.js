import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { MessageComposer } from '../MessageComposer';

/** Il tipo con cui il renderer nomina la `View`. */
const VIEW = 'View';
/** Il tipo con cui il renderer nomina il campo di testo. */
const TEXT_INPUT = 'TextInput';

/**
 * L'handler che il controllo esegue al tocco, preso dal componente che l'ha
 * ricevuto.
 *
 * `fireEvent.press` dispatcha come la piattaforma: su un controllo disabilitato
 * il tocco è rifiutato e non arriva mai a `onPress`, che è esattamente ciò che
 * dichiara `accessibilityState`. I casi qui sotto provano invece la guardia del
 * componente — bozza vuota, invio in corso, composer disabilitato — quindi
 * l'handler va eseguito comunque. RTL 14 disegna solo elementi host e le query
 * `UNSAFE_*ByType` che raggiungevano il componente non esistono più:
 * `unstable_fiber` è l'API interna (instabile, e per questo confinata qui) con
 * cui RTL stesso cerca l'handler.
 */
function azioneDelControllo(nodo) {
  for (let fibra = nodo.unstable_fiber; fibra !== null; fibra = fibra.return) {
    if (typeof fibra.memoizedProps?.onPress === 'function') {
      return fibra.memoizedProps.onPress;
    }
  }
  return null;
}

async function renderComposer(onInvia, extra = {}) {
  // Da RTL 14 `render` è asincrono: il montaggio si aspetta, non si avvolge in `act`.
  await render(<MessageComposer onInvia={onInvia} {...extra} />);
}

/** The one draft field, as the field on screen received it. */
function campo() {
  const campi = screen.getAllByLabelText('Scrivi un messaggio');
  expect(campi).toHaveLength(1);
  return campi[0];
}

/** Types into the draft the way the field reports keystrokes. */
async function scrivi(testo) {
  await fireEvent.changeText(campo(), testo);
}

/**
 * Types into a field that is locked — sending or disabled: the device refuses
 * the keystroke itself, so the handler is called directly.
 */
async function scriviBloccato(testo) {
  await act(async () => {
    campo().props.onChangeText(testo);
  });
}

/**
 * The send control with this accessible name, looked up right now: after a
 * re-render the node carries the fresh handler with the fresh draft.
 */
function pulsanteInvia() {
  const pulsante = screen.queryAllByRole('button', { name: 'Invia' }).at(0);
  expect(pulsante).toBeDefined();
  return pulsante;
}

/** The send control, pressed the way a tap lands on an enabled control. */
async function premiInvia() {
  await fireEvent.press(pulsanteInvia());
}

/**
 * The send control, pressed while it announces `disabled`:
 * the handler runs directly, so the assertions below test the component's own
 * guard — the announced `disabled` state covers the platform refusing the tap.
 */
async function premiInviaBloccato() {
  const onPress = azioneDelControllo(pulsanteInvia());
  // `onPress` is `async` since the draft survives a failed send: awaiting it
  // inside `act` lets the clear (or the keep) land before the assertions.
  await act(async () => {
    await onPress();
  });
}

/** The announced state of the send control: disabled and busy, exactly. */
function statoInvia() {
  const stati = screen
    .queryAllByRole('button', { name: 'Invia' })
    .map((nodo) => nodo.props.accessibilityState)
    .filter(Boolean);
  expect(stati.length).toBeGreaterThan(0);
  return stati[0];
}

/** Visible copy, matched on rendered children as the sibling tests do. */
function testoVisibile(testo) {
  return screen.queryAllByText(testo).length > 0;
}

describe('MessageComposer — the draft field', () => {
  it('wires the field to the contract: label, cap, counter, name', async () => {
    await renderComposer(jest.fn());

    const props = campo().props;
    expect(screen.getByText('Messaggio')).toBeTruthy();
    expect(props.accessibilityLabel).toBe('Scrivi un messaggio');
    expect(props.multiline).toBe(true);
    expect(props.maxLength).toBe(1000);
    expect(screen.getByText('0/1000')).toBeTruthy();
    // An empty field stays typeable: emptiness locks the send, not the input.
    expect(props.editable).toBe(true);
  });

  it('never sends an empty or whitespace-only draft', async () => {
    const onInvia = jest.fn();
    await renderComposer(onInvia);

    expect(statoInvia()).toEqual({ disabled: true, busy: false });
    await premiInviaBloccato();
    expect(onInvia).not.toHaveBeenCalled();

    await scrivi('   ');
    expect(statoInvia()).toEqual({ disabled: true, busy: false });
    await premiInviaBloccato();
    expect(onInvia).not.toHaveBeenCalled();
    expect(campo().props.value).toBe('   ');
  });

  it('sends the trimmed draft and empties the field', async () => {
    const onInvia = jest.fn();
    await renderComposer(onInvia);

    await scrivi('  Ciao baratto  ');
    expect(testoVisibile('16/1000')).toBe(true);
    expect(statoInvia()).toEqual({ disabled: false, busy: false });

    await premiInvia();

    expect(onInvia).toHaveBeenCalledTimes(1);
    expect(onInvia).toHaveBeenCalledWith('Ciao baratto');
    expect(campo().props.value).toBe('');
    expect(testoVisibile('0/1000')).toBe(true);
  });

  it('locks into loading while a send is in flight', async () => {
    const onInvia = jest.fn();
    await renderComposer(onInvia, { inviando: true });

    // Driven directly: the locked field would refuse the keystroke itself.
    await scriviBloccato('Ciao');
    expect(campo().props.editable).toBe(false);
    expect(statoInvia()).toEqual({ disabled: true, busy: true });
    // The pill shows the spinner, not its label.
    expect(testoVisibile('Invia')).toBe(false);

    await premiInviaBloccato();
    expect(onInvia).not.toHaveBeenCalled();
  });

  it('does nothing while the composer is disabled', async () => {
    const onInvia = jest.fn();
    await renderComposer(onInvia, { disabilitato: true });

    // Only the prop can stop a non-empty draft: emptiness and sending are out.
    await scriviBloccato('Ciao');
    expect(campo().props.editable).toBe(false);
    expect(statoInvia()).toEqual({ disabled: true, busy: false });

    await premiInviaBloccato();
    expect(onInvia).not.toHaveBeenCalled();
    expect(campo().props.value).toBe('Ciao');
  });

  it('keeps the draft when the send answers false', async () => {
    const onInvia = jest.fn().mockResolvedValue(false);
    await renderComposer(onInvia);

    await scrivi('Ciao baratto');
    await premiInvia();

    expect(onInvia).toHaveBeenCalledWith('Ciao baratto');
    // Nothing typed is lost: a rejected POST is not a reason to empty the field.
    expect(campo().props.value).toBe('Ciao baratto');
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
    await renderComposer(onInvia);
    await scrivi('Ciao baratto');

    // Un solo render per entrambi i tap: `inviando` è ancora `false` in tutti
    // e due, come sul dispositivo, quindi solo il ref può fermare il secondo.
    const premi = azioneDelControllo(pulsanteInvia());
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
    expect(campo().props.value).toBe('');
  });

  it('sends the next message after the first one resolves', async () => {
    const attese = [];
    const onInvia = jest.fn(
      () =>
        new Promise((resolve) => {
          attese.push(resolve);
        }),
    );
    await renderComposer(onInvia);

    await scrivi('Primo');
    // Non si attende `onPress` qui: la `onInvia` finta resta appesa apposta.
    await act(async () => {
      azioneDelControllo(pulsanteInvia())();
    });
    expect(onInvia).toHaveBeenCalledTimes(1);

    await act(async () => {
      attese[0](true);
    });
    expect(campo().props.value).toBe('');

    // Il `finally` ha azzerato il ref: il secondo messaggio deve partire.
    await scrivi('Secondo');
    await act(async () => {
      azioneDelControllo(pulsanteInvia())();
    });
    expect(onInvia).toHaveBeenCalledTimes(2);
    expect(onInvia).toHaveBeenLastCalledWith('Secondo');

    await act(async () => {
      attese[1](true);
    });
  });
});

/** Lo stile risolto di un nodo: le stesse regole che finiscono sul DOM. */
function stile(nodo) {
  return StyleSheet.flatten(nodo.props.style ?? {}) ?? {};
}

/**
 * La riga del composer: l'unica `View` che dispone in orizzontale e che ha per
 * figli sia il campo sia l'invio.
 */
function rigaDelComposer() {
  const righe = screen.container.queryAll(
    (nodo) =>
      nodo.type === VIEW &&
      stile(nodo).flexDirection === 'row' &&
      nodo.queryAll((figlio) => figlio.type === TEXT_INPUT).length === 1 &&
      nodo.queryAll((figlio) => figlio.props.accessibilityRole === 'button').length > 0,
  );
  expect(righe).toHaveLength(1);
  return righe[0];
}

describe('MessageComposer — la riga di scrittura', () => {
  it('tiene campo e invio sulla stessa riga, col campo a due righe', async () => {
    await renderComposer(jest.fn());
    const riga = rigaDelComposer();

    // Un blocco solo invece di due impilati: il bottone si appoggia in basso,
    // accanto al campo e non sotto.
    expect(riga.queryAll((nodo) => nodo.type === TEXT_INPUT)).toHaveLength(1);
    expect(
      riga.queryAll((nodo) => nodo.props.accessibilityRole === 'button').length,
    ).toBeGreaterThan(0);
    expect(stile(riga).alignItems).toBe('flex-end');

    // Il campo riceve l'altezza minima del composer: con le quattro righe del
    // default l'altezza a riposo non starebbe sotto i 90 pt (brief, passo 5).
    expect(stile(campo()).minHeight).toBe(56);

    // Il campo sta in una scatola che cede la larghezza al bottone: senza
    // `minWidth: 0` sul web la larghezza intrinseca lo spinge fuori.
    const scatole = riga.queryAll((nodo) => {
      const regole = stile(nodo);
      return nodo.type === VIEW && regole.flex === 1 && regole.minWidth === 0;
    });
    expect(scatole).toHaveLength(1);
  });
});
