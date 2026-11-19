import { StyleSheet, Text, TextInput, View } from 'react-native';
import { act, create } from 'react-test-renderer';

import { ApiError } from '@/api/client';
import { AgreementSheet } from '../AgreementSheet';
import { AppInput } from '../AppInput';
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

/** The style a node resolves to: the same rules that reach the screen. */
function stile(nodo) {
  return StyleSheet.flatten(nodo.props.style ?? {}) ?? {};
}

/** The drawn text whose content is exactly this string. */
function testoCon(renderer, contenuto) {
  const nodo = renderer.root.findAllByType(Text).find((candidato) => candidato.props.children === contenuto);
  expect(nodo).toBeDefined();
  return nodo;
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

  it('names both directions of the trade, and the confirm repeats the trade', () => {
    const direzioni = {
      offre: { chi: 'mario.rossi', cosa: 'Riparazione biciclette' },
      riceve: { chi: 'luca.ferrari', cosa: 'Lezioni di chitarra' },
    };
    const renderer = render({ direzioni, azione: 'conferma', onConferma: jest.fn() });

    expect(testoVisibile(renderer, 'Offre')).toBe(true);
    expect(testoVisibile(renderer, 'Riceve')).toBe(true);

    premi(renderer, 'Conferma la scheda');

    expect(
      testoVisibile(
        renderer,
        'Confermando, mario.rossi dà «Riparazione biciclette» e luca.ferrari dà «Lezioni di chitarra». La conferma è definitiva.',
      ),
    ).toBe(true);
  });

  it('calls the second type of service «Ricerca», never «Richiesta»', () => {
    const renderer = render({
      scheda: { ...SCHEDA, tipoServizio: 'REQUEST', descrizione: 'Lezioni di chitarra' },
    });

    expect(testoVisibile(renderer, 'Ricerca: Lezioni di chitarra')).toBe(true);
    expect(testoVisibile(renderer, 'Richiesta: Lezioni di chitarra')).toBe(false);
  });

  it('draws no field of its own: no text input at all, no form button', () => {
    const renderer = render();

    // The delivery sheet has no form field by design: both timestamps are
    // written by the backend, the description by the sender. Nothing in the
    // tree — the confirmation panel included — may ask for typing.
    expect(renderer.root.findAllByType(AppInput)).toHaveLength(0);
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
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

  it('wraps a long description inside the card, and the fact rows shrink', () => {
    const descrizione =
      'Riparazione di biciclette da città e da corsa, con sostituzione di camere d\'aria, freni, cambio e raggi, a domicilio in tutta la zona';
    const renderer = render({ scheda: { ...SCHEDA, descrizione } });

    // The whole sentence is on screen: wrapping, never a truncation.
    const riga = testoCon(renderer, `Offerta: ${descrizione}`);
    expect(riga.props.numberOfLines).toBeUndefined();
    expect(stile(riga)).toMatchObject({ flexShrink: 1, minWidth: 0 });

    // The row that carries it aligns the icon to the first line and keeps it
    // fixed, so the text is the only thing that gives way.
    const contenitore = renderer.root
      .findAllByType(View)
      .map(stile)
      .find((risolto) => risolto.flexDirection === 'row' && risolto.alignItems === 'flex-start');
    expect(contenitore).toBeDefined();

    // `RigaFatto`: the label keeps its width, the value is the one that wraps.
    for (const valore of [
      formatIsoDateTimeNumeric(SCHEDA.inizio),
      formatIsoDateTimeNumeric(SCHEDA.fine),
    ]) {
      const nodo = testoCon(renderer, valore);
      expect(nodo.props.numberOfLines).toBeUndefined();
      expect(stile(nodo)).toMatchObject({ flexShrink: 1, minWidth: 0 });
    }
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
