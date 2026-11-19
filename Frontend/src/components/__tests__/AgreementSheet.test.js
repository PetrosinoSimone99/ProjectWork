import { act, create } from 'react-test-renderer';

import { ApiError } from '@/api/client';
import { AgreementSheet } from '../AgreementSheet';
import { DateField } from '../DateField';
import { formatIsoDateTimeNumeric } from '@/services/dates';

/**
 * The sheet as the reader meets it after the form: what the backend wrote is
 * printed, what is left to decide is behind a confirmation, and the fields a
 * person used to fill (the two dates, the "si svolge da remoto" checkbox) are
 * gone.
 *
 * `formatIsoDateTimeNumeric` has its own test; what is measured here is the
 * wiring — that both timestamps reach the screen as `GG/MM/AAAA HH:MM`, that a
 * missing end date prints the empty mark instead of an invented one, that
 * confirming and refusing pass through the panel, and that a sheet that does
 * not exist draws nothing at all.
 */
const SCHEDA = {
  username: 'mario.rossi',
  descrizione: 'Riparazione biciclette',
  tipoServizio: 'OFFER',
  beneficiario: 'luca.ferrari',
  daRemoto: false,
  inizio: '2026-12-01T09:00:00+00:00',
  fine: '2026-12-05T18:00:00+00:00',
  note: 'Porto io gli attrezzi, ci vediamo in piazza.',
  inviataIl: '2026-12-01T09:00:00+00:00',
  beneficiarioAccettato: null,
  stato: 'COMPILED',
};

function render(props = {}) {
  let renderer;
  act(() => {
    renderer = create(<AgreementSheet titolo="La scheda di @mario.rossi" scheda={SCHEDA} {...props} />);
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

/** The last control with this name: the confirm inside the panel it opened. */
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

function testoVisibile(renderer, testo) {
  return renderer.root.findAll((node) => node.props?.children === testo).length > 0;
}

function conQuelNome(renderer, accessibilityLabel) {
  return renderer.root.findAll(
    (node) =>
      node.props?.accessibilityLabel === accessibilityLabel &&
      typeof node.props.onPress === 'function',
  );
}

describe('AgreementSheet — the read-only sheet', () => {
  it('prints the two timestamps the backend wrote, as GG/MM/AAAA HH:MM', () => {
    const renderer = render();

    expect(testoVisibile(renderer, 'Inizio:')).toBe(true);
    expect(testoVisibile(renderer, formatIsoDateTimeNumeric(SCHEDA.inizio))).toBe(true);
    expect(testoVisibile(renderer, 'Fine:')).toBe(true);
    expect(testoVisibile(renderer, formatIsoDateTimeNumeric(SCHEDA.fine))).toBe(true);
  });

  it('prints the empty mark while the end date has not been written', () => {
    const renderer = render({ scheda: { ...SCHEDA, fine: null } });

    expect(testoVisibile(renderer, '—')).toBe(true);
  });

  it('shows the sender service and the description that was typed', () => {
    const renderer = render();

    expect(testoVisibile(renderer, 'Offerta: Riparazione biciclette')).toBe(true);
    expect(testoVisibile(renderer, 'Descrizione')).toBe(true);
    expect(testoVisibile(renderer, SCHEDA.note)).toBe(true);
  });

  it('calls the second type of service «Ricerca», never «Richiesta»', () => {
    const renderer = render({
      scheda: { ...SCHEDA, tipoServizio: 'REQUEST', descrizione: 'Lezioni di chitarra' },
    });

    expect(testoVisibile(renderer, 'Ricerca: Lezioni di chitarra')).toBe(true);
    expect(testoVisibile(renderer, 'Richiesta: Lezioni di chitarra')).toBe(false);
  });

  it('draws no field of its own: no date picker, no form button', () => {
    const renderer = render();

    expect(renderer.root.findAllByType(DateField)).toHaveLength(0);
    expect(conQuelNome(renderer, 'Invia la scheda')).toHaveLength(0);
    expect(testoVisibile(renderer, 'Si svolge da remoto')).toBe(false);
  });

  it('says when the other person has not written the sheet yet', () => {
    const renderer = render({ scheda: { ...SCHEDA, stato: 'UNCOMPILED', inizio: null, fine: null, note: null } });

    expect(testoVisibile(renderer, 'Scheda di consegna non ancora compilata.')).toBe(true);
  });

  it('says when the sheet is already confirmed', () => {
    const renderer = render({ scheda: { ...SCHEDA, beneficiarioAccettato: true } });

    expect(testoVisibile(renderer, 'Scheda di consegna confermata.')).toBe(true);
    expect(conQuelNome(renderer, 'Conferma la scheda')).toHaveLength(0);
  });

  it('draws nothing when the sheet does not exist', () => {
    const renderer = render({ scheda: null });

    expect(renderer.toJSON()).toBeNull();
  });
});

describe('AgreementSheet — the two decisions of the recipient', () => {
  it('confirms only after the panel, never on the first tap', async () => {
    const onConferma = jest.fn().mockResolvedValue(undefined);
    const renderer = render({ azione: 'conferma', onConferma });

    premi(renderer, 'Conferma la scheda');
    expect(onConferma).not.toHaveBeenCalled();

    await act(async () => {
      premiUltimo(renderer, 'Conferma la scheda');
    });
    expect(onConferma).toHaveBeenCalledTimes(1);
  });

  it('refuses only after the panel, never on the first tap', async () => {
    const onRifiuta = jest.fn().mockResolvedValue(undefined);
    const renderer = render({ azione: 'conferma', onConferma: jest.fn(), onRifiuta });

    premi(renderer, 'Rifiuta la scheda');
    expect(onRifiuta).not.toHaveBeenCalled();

    await act(async () => {
      premiUltimo(renderer, 'Rifiuta la scheda');
    });
    expect(onRifiuta).toHaveBeenCalledTimes(1);
  });

  it('shows the Italian message the API area produced for a rejected confirmation', async () => {
    const onConferma = jest
      .fn()
      .mockRejectedValue(
        new ApiError(409, 'La scheda non può essere modificata o confermata nello stato attuale.'),
      );
    const renderer = render({ azione: 'conferma', onConferma });

    premi(renderer, 'Conferma la scheda');
    await act(async () => {
      premiUltimo(renderer, 'Conferma la scheda');
    });

    expect(
      testoVisibile(renderer, 'La scheda non può essere modificata o confermata nello stato attuale.'),
    ).toBe(true);
  });

  it('falls back to its own sentence when the failure carries no API message', async () => {
    const onConferma = jest.fn().mockRejectedValue(new Error('boom'));
    const renderer = render({ azione: 'conferma', onConferma });

    premi(renderer, 'Conferma la scheda');
    await act(async () => {
      premiUltimo(renderer, 'Conferma la scheda');
    });

    expect(testoVisibile(renderer, 'Non è stato possibile confermare la scheda. Riprova.')).toBe(true);
  });

  it('offers no decision when the action is not the viewer’s to take', () => {
    const renderer = render();

    expect(conQuelNome(renderer, 'Conferma la scheda')).toHaveLength(0);
    expect(conQuelNome(renderer, 'Rifiuta la scheda')).toHaveLength(0);
  });
});
