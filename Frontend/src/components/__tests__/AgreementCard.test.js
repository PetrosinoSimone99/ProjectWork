import { act, create } from 'react-test-renderer';

import { AgreementCard } from '../AgreementCard';

/**
 * The one rule that gives the chat an entry point: "Apri chat" exists only on an
 * `ACCEPTED` row of the viewer's own agreements (W1 decision 7).
 *
 * The route `/chat/<agreementId>` makes the backend create the chat if it is
 * missing, so an over-eager button would open — and create — a conversation for
 * a pending or cancelled exchange. The gate is therefore the card's, and this is
 * the test that keeps it.
 */
const accordo = (extra = {}) => ({
  id: 3,
  stato: 'ACCEPTED',
  creazione: '2026-11-15T10:00:00+00:00',
  proposte: [
    { username: 'andrea', ruolo: 'PROPONENTE', risposta: 'ACCETTATA' },
    { username: 'giulia', ruolo: 'BENEFICIARIO', risposta: 'ACCETTATA' },
  ],
  schede: [],
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
