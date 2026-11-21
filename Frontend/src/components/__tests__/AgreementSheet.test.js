import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import { AgreementSheet } from '../AgreementSheet';
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

/** Mounts the sheet; from RTL 14 the mount is awaited, and the queries live on `screen`. */
async function renderScheda(props = {}) {
  await render(<AgreementSheet titolo="La scheda di @mario.rossi" scheda={SCHEDA} {...props} />);
}

/** The control with this accessible name, pressed the way a tap would. */
async function premi(accessibilityLabel) {
  const controllo = screen.getAllByRole('button', { name: accessibilityLabel }).at(0);
  expect(controllo).toBeDefined();
  await fireEvent.press(controllo);
}

/** The last control with this name: the confirm inside the panel it opened. */
async function premiUltimo(accessibilityLabel) {
  const controllo = screen.getAllByRole('button', { name: accessibilityLabel }).at(-1);
  expect(controllo).toBeDefined();
  await fireEvent.press(controllo);
}

function testoVisibile(testo) {
  return screen.queryAllByText(testo).length > 0;
}

function conQuelNome(accessibilityLabel) {
  return screen.queryAllByRole('button', { name: accessibilityLabel });
}

/** The style a node resolves to: the same rules that reach the screen. */
function stile(nodo) {
  return StyleSheet.flatten(nodo.props.style ?? {}) ?? {};
}

/** The drawn text whose content is exactly this string. */
function testoCon(contenuto) {
  const nodo = screen.getByText(contenuto);
  expect(nodo).toBeDefined();
  return nodo;
}

describe('AgreementSheet — the read-only sheet', () => {
  it('prints the two timestamps the backend wrote, as GG/MM/AAAA HH:MM', async () => {
    await renderScheda();

    expect(testoVisibile('Inizio:')).toBe(true);
    expect(testoVisibile(formatIsoDateTimeNumeric(SCHEDA.inizio))).toBe(true);
    expect(testoVisibile('Fine:')).toBe(true);
    expect(testoVisibile(formatIsoDateTimeNumeric(SCHEDA.fine))).toBe(true);
  });

  it('prints the empty mark while the end date has not been written', async () => {
    await renderScheda({ scheda: { ...SCHEDA, fine: null } });

    expect(testoVisibile('—')).toBe(true);
  });

  it('shows the sender service and the description that was typed', async () => {
    await renderScheda();

    expect(testoVisibile('Offerta: Riparazione biciclette')).toBe(true);
    expect(testoVisibile('Descrizione')).toBe(true);
    expect(testoVisibile(SCHEDA.note)).toBe(true);
  });

  it('names both directions of the trade, and the confirm repeats the trade', async () => {
    const direzioni = {
      offre: { chi: 'mario.rossi', cosa: 'Riparazione biciclette' },
      riceve: { chi: 'luca.ferrari', cosa: 'Lezioni di chitarra' },
    };
    await renderScheda({ direzioni, azione: 'conferma', onConferma: jest.fn() });

    expect(testoVisibile('Offre')).toBe(true);
    expect(testoVisibile('Riceve')).toBe(true);

    await premi('Conferma la scheda');

    expect(
      testoVisibile(
        'Confermando, mario.rossi dà «Riparazione biciclette» e luca.ferrari dà «Lezioni di chitarra». La conferma è definitiva.',
      ),
    ).toBe(true);
  });

  it('calls the second type of service «Ricerca», never «Richiesta»', async () => {
    await renderScheda({
      scheda: { ...SCHEDA, tipoServizio: 'REQUEST', descrizione: 'Lezioni di chitarra' },
    });

    expect(testoVisibile('Ricerca: Lezioni di chitarra')).toBe(true);
    expect(testoVisibile('Richiesta: Lezioni di chitarra')).toBe(false);
  });

  it('draws no field of its own: no text input at all, no form button', async () => {
    await renderScheda();

    // The delivery sheet has no form field by design: both timestamps are
    // written by the backend, the description by the sender. Nothing in the
    // tree — the confirmation panel included — may ask for typing.
    //
    // RTL 14 keeps host nodes only, so `AppInput` is not addressable any more:
    // every field it draws is one `TextInput`, which is what this counts — one
    // `TextInput` here would be one `AppInput` in the tree.
    expect(screen.container.queryAll((nodo) => nodo.type === 'TextInput')).toHaveLength(0);
    expect(conQuelNome('Invia la scheda')).toHaveLength(0);
    expect(testoVisibile('Si svolge da remoto')).toBe(false);
  });

  it('says when the other person has not written the sheet yet', async () => {
    await renderScheda({ scheda: { ...SCHEDA, stato: 'UNCOMPILED', inizio: null, fine: null, note: null } });

    expect(testoVisibile('Scheda di consegna non ancora compilata.')).toBe(true);
  });

  it('says when the sheet is already confirmed', async () => {
    await renderScheda({ scheda: { ...SCHEDA, beneficiarioAccettato: true } });

    expect(testoVisibile('Scheda di consegna confermata.')).toBe(true);
    expect(conQuelNome('Conferma la scheda')).toHaveLength(0);
  });

  it('draws nothing when the sheet does not exist', async () => {
    await renderScheda({ scheda: null });

    expect(screen.toJSON()).toBeNull();
  });

  it('wraps a long description inside the card, and the fact rows shrink', async () => {
    const descrizione =
      'Riparazione di biciclette da città e da corsa, con sostituzione di camere d\'aria, freni, cambio e raggi, a domicilio in tutta la zona';
    await renderScheda({ scheda: { ...SCHEDA, descrizione } });

    // The whole sentence is on screen: wrapping, never a truncation.
    const riga = testoCon(`Offerta: ${descrizione}`);
    expect(riga.props.numberOfLines).toBeUndefined();
    expect(stile(riga)).toMatchObject({ flexShrink: 1, minWidth: 0 });

    // The row that carries it aligns the icon to the first line and keeps it
    // fixed, so the text is the only thing that gives way.
    const contenitore = screen.container
      .queryAll((nodo) => nodo.type === 'View')
      .map(stile)
      .find((risolto) => risolto.flexDirection === 'row' && risolto.alignItems === 'flex-start');
    expect(contenitore).toBeDefined();

    // `RigaFatto`: the label keeps its width, the value is the one that wraps.
    for (const valore of [
      formatIsoDateTimeNumeric(SCHEDA.inizio),
      formatIsoDateTimeNumeric(SCHEDA.fine),
    ]) {
      const nodo = testoCon(valore);
      expect(nodo.props.numberOfLines).toBeUndefined();
      expect(stile(nodo)).toMatchObject({ flexShrink: 1, minWidth: 0 });
    }
  });
});

describe('AgreementSheet — the two decisions of the recipient', () => {
  it('confirms only after the panel, never on the first tap', async () => {
    const onConferma = jest.fn().mockResolvedValue(undefined);
    await renderScheda({ azione: 'conferma', onConferma });

    await premi('Conferma la scheda');
    expect(onConferma).not.toHaveBeenCalled();

    await premiUltimo('Conferma la scheda');
    expect(onConferma).toHaveBeenCalledTimes(1);
  });

  it('refuses only after the panel, never on the first tap', async () => {
    const onRifiuta = jest.fn().mockResolvedValue(undefined);
    await renderScheda({ azione: 'conferma', onConferma: jest.fn(), onRifiuta });

    await premi('Rifiuta la scheda');
    expect(onRifiuta).not.toHaveBeenCalled();

    await premiUltimo('Rifiuta la scheda');
    expect(onRifiuta).toHaveBeenCalledTimes(1);
  });

  it('shows the Italian message the API area produced for a rejected confirmation', async () => {
    const onConferma = jest
      .fn()
      .mockRejectedValue(
        new ApiError(409, 'La scheda non può essere modificata o confermata nello stato attuale.'),
      );
    await renderScheda({ azione: 'conferma', onConferma });

    await premi('Conferma la scheda');
    await premiUltimo('Conferma la scheda');

    expect(
      testoVisibile('La scheda non può essere modificata o confermata nello stato attuale.'),
    ).toBe(true);
  });

  it('falls back to its own sentence when the failure carries no API message', async () => {
    const onConferma = jest.fn().mockRejectedValue(new Error('boom'));
    await renderScheda({ azione: 'conferma', onConferma });

    await premi('Conferma la scheda');
    await premiUltimo('Conferma la scheda');

    expect(testoVisibile('Non è stato possibile confermare la scheda. Riprova.')).toBe(true);
  });

  it('offers no decision when the action is not the viewer’s to take', async () => {
    await renderScheda();

    expect(conQuelNome('Conferma la scheda')).toHaveLength(0);
    expect(conQuelNome('Rifiuta la scheda')).toHaveLength(0);
  });
});
