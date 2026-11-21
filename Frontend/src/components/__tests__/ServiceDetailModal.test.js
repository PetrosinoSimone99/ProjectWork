import { fireEvent, render, screen } from '@testing-library/react-native';

import { ServiceDetailModal } from '../ServiceDetailModal';

/**
 * The two actions of the panel, and the one thing C2 asked for: a command that
 * cannot succeed is not left pressable with nothing to say.
 *
 * "Invia proposta" already had this shape; "Segnala" was guarded only inside the
 * parent's handler, which returned silently, so the tap looked broken. The rule
 * lives on `haPersona` (an integer owner id), the same predicate the proposal
 * uses, and this pins it on the rendered control instead of on the predicate.
 *
 * Two things are mocked because they are not what is under test: the modal shell
 * (it schedules an accessibility focus through a timer that outlives the test)
 * and the owner's other services (the mini card fetches on mount and its own
 * five states have nothing to do with the report button).
 */
jest.mock('../ModalShell', () => ({
  ModalShell: ({ children }) => children,
}));

jest.mock('../UserServicesMiniCard', () => ({
  UserServicesMiniCard: () => null,
}));

const SERVIZIO = {
  id: 7,
  descrizione: 'Riparazione biciclette',
  categorie: [{ id: 1, nome: 'Artigianato' }],
  daRemoto: true,
  localita: null,
  pubblicatoIl: '2026-11-01T00:00:00+00:00',
  offerente: {
    id: 42,
    nome: 'Mario',
    cognome: 'Rossi',
    username: 'mario.rossi',
  },
};

/** Il nome accessibile del comando di segnalazione: il pannello ci mette la persona. */
const ETICHETTA_SEGNALA = 'Segnala Mario Rossi alla staff';

function renderPannello(servizio, extra = {}) {
  // Da RTL 14 `render` è asincrono: il montaggio si aspetta, non si avvolge in `act`.
  return render(
    <ServiceDetailModal servizio={servizio} onClose={() => {}} onReport={() => {}} {...extra} />,
  );
}

/**
 * The action with that label, as the reader meets it: one button, one state.
 *
 * RTL 14 disegna solo i nodi host, quindi il comando si cerca per il nome che
 * annuncia invece che per il componente `AppButton` che lo disegna. La prop
 * `disabled` non arriva al nodo host: lo stato che il nodo porta è quello
 * annunciato (`accessibilityState.disabled`), lo stesso che `fireEvent.press`
 * rispetta rifiutando il tocco.
 */
function pulsante(etichetta) {
  return screen.getByRole('button', { name: etichetta });
}

/** Every string the panel renders, so a sentence can be asserted as a whole. */
function testi() {
  return screen.container
    .queryAll((nodo) => typeof nodo.props?.children === 'string')
    .map((nodo) => nodo.props.children);
}

describe('ServiceDetailModal — "Segnala"', () => {
  it('is pressable and reports the person when the owner id is an integer', async () => {
    const onReport = jest.fn();
    const { unmount } = await renderPannello(SERVIZIO, { onReport });

    const segnala = pulsante(ETICHETTA_SEGNALA);
    expect(segnala.props.accessibilityState.disabled).toBeFalsy();

    await fireEvent.press(segnala);
    expect(onReport).toHaveBeenCalledWith(SERVIZIO);
    await unmount();
  });

  it('is disabled and says why when there is no person to report', async () => {
    const onReport = jest.fn();
    const { unmount } = await renderPannello(
      { ...SERVIZIO, offerente: { ...SERVIZIO.offerente, id: null } },
      { onReport },
    );

    expect(pulsante(ETICHETTA_SEGNALA).props.accessibilityState.disabled).toBe(true);
    expect(testi()).toContain(
      'La segnalazione non è disponibile: manca la persona da segnalare.',
    );

    // A disabled button never reaches the handler: the tap cannot look broken.
    // The press is what makes the assertion mean something — RTL refuses it,
    // and the handler stays uncalled.
    await fireEvent.press(pulsante(ETICHETTA_SEGNALA));
    expect(onReport).not.toHaveBeenCalled();
    await unmount();
  });

  it('keeps the promise of the copy while the button is enabled', async () => {
    const { unmount } = await renderPannello(SERVIZIO);

    expect(testi()).toContain(
      'La segnalazione arriva alla staff, che la esamina e decide.',
    );
    await unmount();
  });
});
