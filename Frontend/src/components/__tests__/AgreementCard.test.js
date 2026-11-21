import { fireEvent, render, screen } from '@testing-library/react-native';

import { AgreementCard } from '../AgreementCard';

/**
 * The two facts the card keeps: the way into the chat of an exchange that was
 * accepted or has already happened, and the cancellation of a live one.
 *
 * The rule that gives the chat an entry point: "Apri chat" exists on an
 * `ACCEPTED` row and on a `COMPLETED` one, so the history of a closed exchange
 * stays reachable (W1 decision 7 as extended by D030).
 *
 * The route `/chat/<agreementId>` makes the backend create the chat if it is
 * missing, so an over-eager button would open — and create — a conversation for
 * a pending, refused or cancelled exchange. The gate is therefore the card's,
 * and this is the test that keeps it.
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
    { username: 'andrea', ruolo: 'Provider', risposta: 'ACCETTATA', descrizioneServizio: 'Riparazione biciclette' },
    { username: 'giulia', ruolo: 'Beneficiary', risposta: 'ACCETTATA', descrizioneServizio: 'Lezione di chitarra' },
  ],
  schede: [
    {
      username: 'andrea',
      beneficiario: 'giulia',
      descrizione: 'Solo della scheda',
      tipoServizio: 'OFFER',
      inizio: '2026-11-15T10:00:00+00:00',
      fine: null,
      note: null,
      stato: 'UNCOMPILED',
    },
  ],
  ...extra,
});

async function renderCard(props) {
  // Da RTL 14 `render` è asincrono: il montaggio si aspetta, non si avvolge in `act`.
  await render(<AgreementCard accordo={accordo()} myUsername="andrea" {...props} />);
}

/** The pressable rows that announce themselves as this action. */
function apriChat() {
  return screen.queryAllByRole('button', { name: 'Apri la chat di questo scambio' });
}

/** The control with this accessible name, pressed the way a tap would. */
async function premi(accessibilityLabel) {
  const controllo = screen.queryAllByRole('button', { name: accessibilityLabel }).at(0);
  expect(controllo).toBeDefined();
  await fireEvent.press(controllo);
}

/** The last control with this name: the confirm inside the panel it opened. */
async function premiUltimo(accessibilityLabel) {
  const controllo = screen.queryAllByRole('button', { name: accessibilityLabel }).at(-1);
  expect(controllo).toBeDefined();
  await fireEvent.press(controllo);
}

function testoVisibile(testo) {
  return screen.queryAllByText(testo).length > 0;
}

describe('AgreementCard — the chat entry point', () => {
  it('offers the chat on an accepted exchange', async () => {
    const onApriChat = jest.fn();
    await renderCard({ onApriChat });

    expect(apriChat().length).toBeGreaterThan(0);
  });

  it('calls back with the agreement id, not with the row', async () => {
    const onApriChat = jest.fn();
    await renderCard({ onApriChat });

    await fireEvent.press(apriChat().at(0));

    expect(onApriChat).toHaveBeenCalledWith(3);
  });

  it('offers the chat on a completed exchange, so its history stays reachable', async () => {
    const onApriChat = jest.fn();
    await renderCard({ accordo: accordo({ stato: 'COMPLETED' }), onApriChat });

    expect(apriChat().length).toBeGreaterThan(0);
    await fireEvent.press(apriChat().at(0));
    expect(onApriChat).toHaveBeenCalledWith(3);
  });

  it.each(['PENDING', 'REFUSED', 'CANCELLED', 'CONTESTED'])(
    'offers no chat on a %s exchange',
    async (stato) => {
      await renderCard({
        accordo: accordo({ stato }),
        onApriChat: jest.fn(),
      });

      expect(apriChat()).toHaveLength(0);
    },
  );

  it('offers no chat when the screen passed no handler', async () => {
    await renderCard({ onApriChat: null });

    expect(apriChat()).toHaveLength(0);
  });
});

describe('AgreementCard — what it draws', () => {
  it('draws both directions of the trade, and not the delivery sheet', async () => {
    await renderCard({ onApriChat: jest.fn() });

    // Le due direzioni si leggono come tali: chi offre e chi riceve (P1-4).
    expect(testoVisibile('Offre')).toBe(true);
    expect(testoVisibile('Riceve')).toBe(true);
    expect(testoVisibile('Riparazione biciclette')).toBe(true);
    expect(testoVisibile('Lezione di chitarra')).toBe(true);
    // La scheda resta nella chat: la sua descrizione non compare sulla card.
    expect(testoVisibile('Solo della scheda')).toBe(false);
    expect(testoVisibile('Scheda non compilata')).toBe(false);
    expect(
      screen.container.queryAll(
        (nodo) =>
          typeof nodo.props?.accessibilityLabel === 'string' &&
          nodo.props.accessibilityLabel.startsWith('Invia la scheda'),
      ),
    ).toHaveLength(0);
  });

  it('cancels an accepted exchange only after the confirmation panel', async () => {
    const onCancel = jest.fn();
    await renderCard({ onCancel });

    await premi('Annulla questo scambio');
    expect(onCancel).not.toHaveBeenCalled();

    // Two nodes carry the name of the act: the button and the confirm inside
    // the panel. The second one is the one that cancels.
    await premiUltimo('Annulla scambio');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
