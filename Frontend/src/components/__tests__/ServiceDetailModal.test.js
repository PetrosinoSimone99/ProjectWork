import { act, create } from 'react-test-renderer';

import { AppButton } from '../AppButton';
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

async function render(servizio, extra = {}) {
  let renderer;
  await act(async () => {
    renderer = create(
      <ServiceDetailModal servizio={servizio} onClose={() => {}} onReport={() => {}} {...extra} />,
    );
  });
  return renderer;
}

/** Unmount inside `act`: a tree left mounted outlives the test environment. */
function unmount(renderer) {
  act(() => {
    renderer.unmount();
  });
}

/** The action with that label, as the reader meets it: one button, one state. */
function pulsante(renderer, etichetta) {
  return renderer.root
    .findAllByType(AppButton)
    .find((nodo) => nodo.props.label === etichetta);
}

/** Every string the panel renders, so a sentence can be asserted as a whole. */
function testi(renderer) {
  return renderer.root
    .findAll((node) => typeof node.props?.children === 'string')
    .map((node) => node.props.children);
}

describe('ServiceDetailModal — "Segnala"', () => {
  it('is pressable and reports the person when the owner id is an integer', async () => {
    const onReport = jest.fn();
    const renderer = await render(SERVIZIO, { onReport });

    const segnala = pulsante(renderer, 'Segnala');
    expect(segnala.props.disabled).toBeFalsy();

    act(() => {
      segnala.props.onPress();
    });
    expect(onReport).toHaveBeenCalledWith(SERVIZIO);
    unmount(renderer);
  });

  it('is disabled and says why when there is no person to report', async () => {
    const onReport = jest.fn();
    const renderer = await render(
      { ...SERVIZIO, offerente: { ...SERVIZIO.offerente, id: null } },
      { onReport },
    );

    expect(pulsante(renderer, 'Segnala').props.disabled).toBe(true);
    expect(testi(renderer)).toContain(
      'La segnalazione non è disponibile: manca la persona da segnalare.',
    );

    // A disabled button never reaches the handler: the tap cannot look broken.
    expect(onReport).not.toHaveBeenCalled();
    unmount(renderer);
  });

  it('keeps the promise of the copy while the button is enabled', async () => {
    const renderer = await render(SERVIZIO);

    expect(testi(renderer)).toContain(
      'La segnalazione arriva alla staff, che la esamina e decide.',
    );
    unmount(renderer);
  });
});
