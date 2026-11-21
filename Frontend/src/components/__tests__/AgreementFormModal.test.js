import { fireEvent, render, screen } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import { consumaBozza, salvaBozza } from '@/auth/auth-context';
import { AgreementFormModal, chiaveBozzaAccordo, NOTE_MAX_LENGTH } from '../AgreementFormModal';
import { formatIsoDateTimeNumeric } from '@/services/dates';

/**
 * The panel that writes the delivery sheet of an accepted exchange.
 *
 * Three things matter and this file measures them: the two timestamps and the
 * service arrive read-only (the person cannot contradict what the backend and
 * their own published service already say), the description is the one input
 * and it is required, and what leaves the panel is exactly
 * `{agreementId, notes}` — the body `send-agreement-details` reads.
 */
const MIA_SCHEDA = {
  username: 'andrea',
  descrizione: 'Riparazione biciclette',
  tipoServizio: 'OFFER',
  beneficiario: 'giulia',
  daRemoto: false,
  inizio: '2026-11-15T10:00:00+00:00',
  fine: null,
  note: null,
  inviataIl: null,
  beneficiarioAccettato: null,
  stato: 'UNCOMPILED',
};

const ALTRA_SCHEDA = {
  ...MIA_SCHEDA,
  username: 'giulia',
  descrizione: 'Lezione di chitarra',
  tipoServizio: 'REQUEST',
  beneficiario: 'andrea',
};

const ACCORDO = {
  id: 3,
  stato: 'ACCEPTED',
  creazione: '2026-11-15T10:00:00+00:00',
  proposte: [
    { username: 'andrea', ruolo: 'Provider', risposta: true },
    { username: 'giulia', ruolo: 'Beneficiary', risposta: true },
  ],
  scheda: MIA_SCHEDA,
  schede: [MIA_SCHEDA, ALTRA_SCHEDA],
};

function renderPanel(props = {}) {
  // Da RTL 14 `render` è asincrono: il montaggio si aspetta, non si avvolge in `act`.
  return render(
    <AgreementFormModal
      visible
      onClose={jest.fn()}
      accordo={ACCORDO}
      myUsername="andrea"
      onInvia={jest.fn().mockResolvedValue(undefined)}
      {...props}
    />,
  );
}

/**
 * The one input of the panel.
 *
 * RTL 14 tiene solo i nodi host: il campo non si cerca più per tipo `AppInput`,
 * ma per l'unico `TextInput` che `AppInput` disegna.
 */
function campoDescrizione() {
  const campi = screen.container.queryAll((nodo) => nodo.type === 'TextInput');
  expect(campi).toHaveLength(1);
  return campi[0];
}

async function scrivi(testo) {
  await fireEvent.changeText(campoDescrizione(), testo);
}

async function premi(accessibilityLabel) {
  const controllo = screen.queryAllByRole('button', { name: accessibilityLabel }).at(0);
  expect(controllo).toBeDefined();
  await fireEvent.press(controllo);
}

function testoVisibile(testo) {
  return screen.queryAllByText(testo).length > 0;
}

describe('AgreementFormModal — what the person reads', () => {
  it('prints the two timestamps the backend wrote, as GG/MM/AAAA HH:MM', async () => {
    await renderPanel();

    expect(testoVisibile('Inizio:')).toBe(true);
    expect(testoVisibile(formatIsoDateTimeNumeric(MIA_SCHEDA.inizio))).toBe(true);
    expect(testoVisibile('Fine:')).toBe(true);
    // The end date exists only after the recipient confirms.
    expect(testoVisibile('—')).toBe(true);
  });

  it('shows the service the sender already published, in the product words', async () => {
    await renderPanel();

    expect(testoVisibile('Offerta: Riparazione biciclette')).toBe(true);
    // The other side's row is not this panel's business.
    expect(testoVisibile('Ricerca: Lezione di chitarra')).toBe(false);
  });

  it('offers one field only: the description, capped at the backend limit', async () => {
    await renderPanel();

    expect(campoDescrizione().props.multiline).toBe(true);
    expect(campoDescrizione().props.maxLength).toBe(NOTE_MAX_LENGTH);
    expect(NOTE_MAX_LENGTH).toBe(500);
  });
});

describe('AgreementFormModal — un nome per una cosa', () => {
  it('chiama scheda di consegna ciò che si scrive, e il comando che chiude lo dice', async () => {
    await renderPanel();

    expect(testoVisibile('Scheda di consegna')).toBe(true);
    expect(
      screen.container.queryAll(
        (nodo) => nodo.props?.accessibilityLabel === 'Chiudi la scheda di consegna',
      ),
    ).not.toHaveLength(0);
  });

  // Lo scambio si chiama «scambio»: nessun testo visibile del pannello nomina
  // «accordo» ciò che la persona sta scrivendo (audit 2026-11-18, copy §3).
  it('non nomina mai «accordo» ciò che si sta scrivendo', async () => {
    await renderPanel();
    const testi = screen.container
      .queryAll((nodo) => typeof nodo.props?.children === 'string')
      .map((nodo) => nodo.props.children);

    expect(testi.length).toBeGreaterThan(0);
    expect(testi.filter((testo) => /accordo/i.test(testo))).toEqual([]);
  });
});

describe('AgreementFormModal — sending the sheet', () => {
  it('refuses an empty description without calling the API', async () => {
    const onInvia = jest.fn().mockResolvedValue(undefined);
    await renderPanel({ onInvia });

    await scrivi('   ');
    await premi('Invia la scheda');

    expect(onInvia).not.toHaveBeenCalled();
    expect(
      testoVisibile('Scrivi la descrizione della scheda: da 1 a 500 caratteri.'),
    ).toBe(true);
  });

  it('sends the agreement id and the trimmed note, then closes', async () => {
    const onInvia = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    await renderPanel({ onInvia, onClose });

    await scrivi('  Ci vediamo in piazza alle 10.  ');
    await premi('Invia la scheda');

    expect(onInvia).toHaveBeenCalledWith({
      agreementId: 3,
      notes: 'Ci vediamo in piazza alle 10.',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the panel open on a failure and shows the Italian message', async () => {
    const onInvia = jest
      .fn()
      .mockRejectedValue(
        new ApiError(
          409,
          'L’altra persona ha già inviato la sua scheda: tocca a te accettarla o rifiutarla.',
        ),
      );
    const onClose = jest.fn();
    await renderPanel({ onInvia, onClose });

    await scrivi('Ci vediamo in piazza alle 10.');
    await premi('Invia la scheda');

    expect(onClose).not.toHaveBeenCalled();
    expect(
      testoVisibile('L’altra persona ha già inviato la sua scheda: tocca a te accettarla o rifiutarla.'),
    ).toBe(true);
    // The typed text is still there: a rejected send does not cost the draft.
    expect(campoDescrizione().props.value).toBe('Ci vediamo in piazza alle 10.');
  });

  it('falls back to its own sentence when the failure carries no API message', async () => {
    await renderPanel({ onInvia: jest.fn().mockRejectedValue(new Error('boom')) });

    await scrivi('Ci vediamo in piazza alle 10.');
    await premi('Invia la scheda');

    expect(testoVisibile('Non è stato possibile inviare la scheda. Riprova.')).toBe(true);
  });

  // Audit 2026-11-18, P1-1: una sessione scaduta a metà testo riporta qui, e la
  // descrizione riparte dalla bozza dell'accordo. Niente lo annuncia: il testo
  // è semplicemente già nel campo.
  it('riapre con il testo scritto prima che la sessione scadesse', async () => {
    const chiave = chiaveBozzaAccordo(ACCORDO.id);
    salvaBozza(chiave, 'Ci vediamo in piazza alle 10.');

    const { unmount } = await renderPanel();

    expect(campoDescrizione().props.value).toBe('Ci vediamo in piazza alle 10.');
    expect(
      screen.container.queryAll(
        (nodo) => typeof nodo.props?.children === 'string' && /bozza/i.test(nodo.props.children),
      ),
    ).toHaveLength(0);

    // Il pannello si smonta come quando la rotta se ne va: nessun timer resta in volo.
    await unmount();
    consumaBozza(chiave);
  });
});
