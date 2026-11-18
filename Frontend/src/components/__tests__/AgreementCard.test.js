import { act, create } from 'react-test-renderer';

import { AgreementCard } from '../AgreementCard';

/**
 * The two facts the card keeps: the way into the chat of an `ACCEPTED`
 * exchange, and the cancellation of it.
 *
 * The one rule that gives the chat an entry point: "Apri chat" exists only on an
 * `ACCEPTED` row of the viewer's own agreements (W1 decision 7).
 *
 * The route `/chat/<agreementId>` makes the backend create the chat if it is
 * missing, so an over-eager button would open — and create — a conversation for
 * a pending or cancelled exchange. The gate is therefore the card's, and this is
 * the test that keeps it.
 *
 * The delivery sheet moved into the chat (`AgreementFormModal`,
 * `AgreementSheet`): the card draws no date field, no confirmation and no
 * "Scheda non compilata" line any more, and the assertions below keep it that
 * way.
 */
const accordo = (extra = {}) => ({
  id: 3,
  stato: 'ACCEPTED',
  creazione: '2026-11-15T10:00:00+00:00',
  proposte: [
    { username: 'andrea', ruolo: 'PROPONENTE', risposta: 'ACCETTATA' },
    { username: 'giulia', ruolo: 'BENEFICIARIO', risposta: 'ACCETTATA', descrizioneServizio: 'Lezione di chitarra' },
  ],
  schede: [
    {
      username: 'andrea',
      beneficiario: 'giulia',
      descrizione: 'Riparazione biciclette',
      tipoServizio: 'OFFER',
      inizio: '2026-11-15T10:00:00+00:00',
      fine: null,
      note: null,
      stato: 'UNCOMPILED',
    },
  ],
  ...extra,
});

function render(props) {
  let renderer;
  act(() => {
    renderer = create(<AgreementCard accordo={accordo()} myUsername="andrea" {...props} />);
  });
  return renderer;
}

/** The pressable rows that announce themselves as this action. */
function apriChat(renderer) {
  return renderer.root.findAll(
    (node) =>
      node.props?.accessibilityLabel === 'Apri la chat di questo scambio' &&
      typeof node.props?.onPress === 'function',
  );
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

describe('AgreementCard — the chat entry point', () => {
  it('offers the chat on an accepted exchange', () => {
    const onApriChat = jest.fn();
    const renderer = render({ onApriChat });

    expect(apriChat(renderer).length).toBeGreaterThan(0);
  });

  it('calls back with the agreement id, not with the row', () => {
    const onApriChat = jest.fn();
    const renderer = render({ onApriChat });

    act(() => {
      apriChat(renderer).at(0).props.onPress();
    });

    expect(onApriChat).toHaveBeenCalledWith(3);
  });

  it.each(['PENDING', 'REFUSED', 'CANCELLED', 'COMPLETED', 'CONTESTED'])(
    'offers no chat on a %s exchange',
    (stato) => {
      const renderer = render({
        accordo: accordo({ stato }),
        onApriChat: jest.fn(),
      });

      expect(apriChat(renderer)).toHaveLength(0);
    },
  );

  it('offers no chat when the screen passed no handler', () => {
    const renderer = render({ onApriChat: null });

    expect(apriChat(renderer)).toHaveLength(0);
  });
});

describe('AgreementCard — what it no longer draws', () => {
  it('keeps the services of the two proposals, without the delivery sheet', () => {
    const renderer = render({ onApriChat: jest.fn() });

    expect(testoVisibile(renderer, '@giulia: Lezione di chitarra')).toBe(true);
    // The sheet rows of the fixture are not part of the card any more.
    expect(testoVisibile(renderer, 'Riparazione biciclette')).toBe(false);
    expect(testoVisibile(renderer, 'Scheda non compilata')).toBe(false);
    expect(
      renderer.root.findAll(
        (node) =>
          typeof node.props?.accessibilityLabel === 'string' &&
          node.props.accessibilityLabel.startsWith('Invia la scheda'),
      ),
    ).toHaveLength(0);
  });

  it('cancels an accepted exchange only after the confirmation panel', () => {
    const onCancel = jest.fn();
    const renderer = render({ onCancel });

    premi(renderer, 'Annulla questo scambio');
    expect(onCancel).not.toHaveBeenCalled();

    // Two nodes carry the name of the act: the button and the confirm inside
    // the panel. The second one is the one that cancels.
    premiUltimo(renderer, 'Annulla scambio');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
