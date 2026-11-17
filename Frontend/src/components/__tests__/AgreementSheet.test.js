import { act, create } from 'react-test-renderer';

import { ApiError } from '@/api/client';
import { AgreementSheet } from '../AgreementSheet';
import { AppInput } from '../AppInput';
import { DateField } from '../DateField';

/**
 * The sheet row as the reader meets it: the form refuses a period the backend
 * would refuse, and the confirm button asks first.
 *
 * `dataDaInput`/`periodoValido` have their own tests; these are about the
 * component wiring — that nothing leaves the component before the local rule
 * passes, and that the payload is the three fields the route reads.
 */
const SCHEDA = {
  username: 'mario.rossi',
  descrizione: 'Riparazione biciclette',
  beneficiario: 'luca.ferrari',
  daRemoto: false,
  inizio: null,
  fine: null,
  beneficiarioAccettato: null,
  stato: 'UNCOMPILED',
};

const SCHEDA_COMPILATA = {
  ...SCHEDA,
  inizio: '2026-12-01T00:00:00+00:00',
  fine: '2026-12-05T00:00:00+00:00',
  stato: 'COMPILED',
};

function render(azione, extra = {}) {
  let renderer;
  act(() => {
    renderer = create(<AgreementSheet titolo="La tua scheda" scheda={SCHEDA} azione={azione} {...extra} />);
  });
  return renderer;
}

/** The control with this accessible name, pressed the way a tap would. */
function premi(renderer, accessibilityLabel) {
  const controllo = renderer.root
    .findAll(
      (node) =>
        node.props?.accessibilityLabel === accessibilityLabel &&
        typeof node.props.onPress === 'function',
    )
    .at(0);
  expect(controllo).toBeDefined();
  act(() => {
    controllo.props.onPress();
  });
}

/**
 * The same control, the last one carrying that name: the button that opens a
 * panel and the confirm inside the panel can be called the same.
 */
function premiUltimo(renderer, accessibilityLabel) {
  const controllo = renderer.root
    .findAll(
      (node) =>
        node.props?.accessibilityLabel === accessibilityLabel &&
        typeof node.props.onPress === 'function',
    )
    .at(-1);
  expect(controllo).toBeDefined();
  act(() => {
    controllo.props.onPress();
  });
}

/** The two date fields, in the order they appear, set the way a picker would. */
function scriviDate(renderer, inizio, fine) {
  const campi = renderer.root.findAllByType(DateField);
  expect(campi).toHaveLength(2);
  act(() => {
    campi[0].props.onCambia(inizio);
    campi[1].props.onCambia(fine);
  });
}

function testoVisibile(renderer, testo) {
  return renderer.root.findAll((node) => node.props?.children === testo).length > 0;
}

describe('AgreementSheet — the form', () => {
  it('refuses a period the backend would refuse, without calling the API', () => {
    const onInvia = jest.fn();
    const renderer = render('compila', { onInvia });

    scriviDate(renderer, '2026-12-05', '2026-12-01');
    premi(renderer, 'Invia la scheda');

    expect(onInvia).not.toHaveBeenCalled();
    expect(testoVisibile(renderer, "Scegli le due date, con la fine dopo l'inizio.")).toBe(true);
  });

  it('sends the three fields the route reads, as date-only strings', async () => {
    const onInvia = jest.fn().mockResolvedValue(undefined);
    const renderer = render('compila', { onInvia });

    scriviDate(renderer, '2026-12-01', '2026-12-05');
    await act(async () => {
      premi(renderer, 'Invia la scheda');
    });

    expect(onInvia).toHaveBeenCalledWith({
      fromRemote: false,
      startDate: '2026-12-01',
      endDate: '2026-12-05',
    });
  });

  it('shows the Italian message the API area produced for a rejected call', async () => {
    const onInvia = jest
      .fn()
      .mockRejectedValue(new ApiError(404, 'Non trovo più questo accordo o la sua scheda: ricarica e riprova.'));
    const renderer = render('compila', { onInvia });

    scriviDate(renderer, '2026-12-01', '2026-12-05');
    await act(async () => {
      premi(renderer, 'Invia la scheda');
    });

    expect(
      testoVisibile(renderer, 'Non trovo più questo accordo o la sua scheda: ricarica e riprova.'),
    ).toBe(true);
  });

  it('falls back to its own sentence when the failure carries no message from the API layer', async () => {
    const onInvia = jest.fn().mockRejectedValue(new Error('boom'));
    const renderer = render('compila', { onInvia });

    scriviDate(renderer, '2026-12-01', '2026-12-05');
    await act(async () => {
      premi(renderer, 'Invia la scheda');
    });

    expect(
      testoVisibile(renderer, "Non è stato possibile inviare la scheda. Riprova."),
    ).toBe(true);
  });
});

describe('AgreementSheet — read-only and confirmation', () => {
  it('draws no form when the action is not the viewer’s to take', () => {
    const renderer = render(null, { scheda: SCHEDA_COMPILATA });

    expect(renderer.root.findAllByType(AppInput)).toHaveLength(0);
    // Only the end date: the schema resets `start_date` on every update, so the
    // row says the start is unavailable instead of claiming a date nobody chose
    // (backend-gaps.md G20).
    expect(testoVisibile(renderer, 'Fino al 5 dic 2026')).toBe(true);
    expect(
      testoVisibile(renderer, "L'inizio non è disponibile: il server non lo conserva (limite noto)."),
    ).toBe(true);
  });

  it('confirms only after the panel, never on the first tap', async () => {
    const onConferma = jest.fn().mockResolvedValue(undefined);
    const renderer = render('conferma', { scheda: SCHEDA_COMPILATA, onConferma });

    premi(renderer, 'Conferma la scheda');
    expect(onConferma).not.toHaveBeenCalled();

    // Two nodes carry the name of the act: the button that opened the panel and
    // the confirm inside it. The second one is the one that confirms.
    const conQuelNome = (node) =>
      node.props?.accessibilityLabel === 'Conferma la scheda' &&
      typeof node.props.onPress === 'function';
    expect(renderer.root.findAll(conQuelNome)).toHaveLength(2);

    await act(async () => {
      premiUltimo(renderer, 'Conferma la scheda');
    });
    expect(onConferma).toHaveBeenCalledTimes(1);
  });

  it('says when the row is already confirmed and offers nothing else', () => {
    const renderer = render(null, {
      scheda: { ...SCHEDA_COMPILATA, beneficiarioAccettato: true },
    });

    expect(testoVisibile(renderer, 'Scheda confermata.')).toBe(true);
    expect(renderer.root.findAll((node) => node.props?.accessibilityLabel === 'Conferma la scheda')).toHaveLength(
      0,
    );
  });
});
