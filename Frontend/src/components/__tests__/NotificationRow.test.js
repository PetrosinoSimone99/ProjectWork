import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { etichettaTipo, iconaTipo, NotificationRow, quandoNotifica } from '../NotificationRow';
import { radius, useTokens } from '@/theme/tokens';

/**
 * The row's two pure decisions: which label and icon a backend `type` gets, and
 * how its timestamp reads.
 *
 * The literals come from the backend (`Backend/src/**`, `AgreementManager`,
 * `ChatManager`, `StaffController`, `AgreementEndDateChecker`), copied by hand:
 * a test that parsed the PHP would fail for reasons unrelated to a label.
 */
const TIPI_NOTI = [
  'AGREEMENT_PROPOSAL',
  'AGREEMENT_RESPONSE',
  'AGREEMENT_DETAILS',
  'AGREEMENT_DETAILS_ACCEPTED',
  'AGREEMENT_CANCELLED',
  'AGREEMENT_COMPLETED',
  'CHAT_MESSAGE',
  'MATCH_CREATED',
  'REPORT_CLAIMED',
  'REPORT_REVIEWED',
  'SERVICE_RESTORED',
  'USER_PROMOTED',
  'USER_STATUS_CHANGED',
];

describe('etichettaTipo', () => {
  it('gives every backend type a readable label', () => {
    for (const tipo of TIPI_NOTI) {
      const etichetta = etichettaTipo(tipo);
      expect(typeof etichetta).toBe('string');
      expect(etichetta.length).toBeGreaterThan(0);
      expect(etichetta).not.toBe('Notifica');
    }
  });

  it('falls back to the generic label for a type it has never seen', () => {
    expect(etichettaTipo('SOMETHING_NEW')).toBe('Notifica');
    expect(etichettaTipo(null)).toBe('Notifica');
    expect(etichettaTipo(undefined)).toBe('Notifica');
  });

  it('matches the lower-case type the scheduler writes', () => {
    expect(etichettaTipo('agreement_completed')).toBe('Completato');
  });
});

describe('iconaTipo', () => {
  it('gives every backend type an icon and the bell to the unknown ones', () => {
    for (const tipo of TIPI_NOTI) {
      expect(iconaTipo(tipo)).toMatch(/-outline$/);
    }
    expect(iconaTipo('SOMETHING_NEW')).toBe('notifications-outline');
  });
});

describe('quandoNotifica', () => {
  it('reads the date and the time, so two notifications of the same day differ', () => {
    const quando = quandoNotifica('2026-11-15T10:00:00+00:00');

    expect(quando).toContain('2026');
    expect(quando).toContain(':');
  });

  it('answers null for a missing or unparseable value, so the row draws no date', () => {
    expect(quandoNotifica(null)).toBeNull();
    expect(quandoNotifica('')).toBeNull();
    expect(quandoNotifica('non-una-data')).toBeNull();
  });

  it('legge l’orologio in it-IT: la riga non mostra mai AM o PM', () => {
    const quando = quandoNotifica('2026-11-15T10:00:00+00:00');

    // «01:11 AM» dentro una data italiana mescola due lingue: l'ora segue la
    // stessa lingua del giorno, non quella del dispositivo.
    expect(quando).not.toMatch(/\b(AM|PM)\b/);
    expect(quando).toMatch(/\d{1,2}[:.]\d{2}$/);
  });
});

/**
 * The row as a reader meets it: how an unread row is marked, and when the
 * delete starts.
 *
 * The expected colours come back through the same hook the row uses instead of
 * being hard-coded, so these cases hold in either theme.
 */
let tokens;
function TokenProbe() {
  const t = useTokens();
  // Written in an effect, not during render: a render must not touch state
  // outside the component, even in a test harness.
  useEffect(() => {
    tokens = t;
  }, [t]);
  return null;
}

const NOTIFICA = {
  id: 1,
  tipo: 'MATCH_CREATED',
  messaggio: 'Nuovo match con un\'altra persona.',
  creataIl: null,
  letta: true,
};

/** Da RTL 14 `render` è asincrono: il montaggio si aspetta, non si avvolge in `act`. */
async function renderRiga(notifica, extra = {}) {
  await render(
    <>
      <NotificationRow notifica={notifica} {...extra} />
      <TokenProbe />
    </>,
  );
}

/** Le scatole `View` disegnate, dalla più esterna: gli stili si leggono da lì. */
function viste() {
  return screen.container.queryAll((node) => node.type === 'View');
}

/** The control with this accessibility label, pressed the way a tap would. */
async function premi(accessibilityLabel) {
  await fireEvent.press(screen.getByLabelText(accessibilityLabel));
}

describe('NotificationRow rendering', () => {
  it('keeps the surface on an unread row and marks it with the primary border and a leading dot', async () => {
    await renderRiga({ ...NOTIFICA, letta: false });
    const stile = StyleSheet.flatten(screen.root.props.style);

    expect(stile.backgroundColor).toBe(tokens.surface);
    expect(stile.backgroundColor).not.toBe(tokens.serviceBg);
    expect(stile.borderColor).toBe(tokens.primary);

    const pallino = viste()
      .map((node) => StyleSheet.flatten(node.props.style ?? {}))
      .find((style) => style.width === 8 && style.height === 8);
    expect(pallino).toBeDefined();
    expect(pallino.backgroundColor).toBe(tokens.primary);
    expect(pallino.borderRadius).toBe(radius.pill);

    // A read row keeps the same surface with the decorative border: the state
    // is the border and the dot, never a fill.
    await renderRiga(NOTIFICA);
    const stileLetto = StyleSheet.flatten(screen.root.props.style);
    expect(stileLetto.backgroundColor).toBe(tokens.surface);
    expect(stileLetto.borderColor).toBe(tokens.border);
  });

  it('marks an unread row with the words "Non letta", which a read row never shows', async () => {
    // The border and the dot are colour: the words are the state a reader who
    // cannot see the colour, or who listens to a row that cannot be opened,
    // still gets (WCAG 1.4.1).
    await renderRiga({ ...NOTIFICA, letta: false });
    expect(screen.getAllByText('Non letta').length).toBeGreaterThan(0);

    await renderRiga(NOTIFICA);
    expect(screen.queryAllByText('Non letta')).toHaveLength(0);
  });

  it('fires the delete callback only from the confirm panel', async () => {
    const onElimina = jest.fn();
    await renderRiga(NOTIFICA, { onElimina });

    await premi('Elimina questa notifica');
    expect(onElimina).not.toHaveBeenCalled();

    await premi('Elimina');
    expect(onElimina).toHaveBeenCalledTimes(1);
  });

  it('leaves the row untouched when the panel is dismissed with "No, torna indietro"', async () => {
    const onElimina = jest.fn();
    await renderRiga({ ...NOTIFICA, messaggio: 'Riga da non perdere.' }, { onElimina });

    await premi('Elimina questa notifica');
    await premi('No, torna indietro');

    expect(onElimina).not.toHaveBeenCalled();
    expect(screen.getByText('Riga da non perdere.')).toBeTruthy();
  });
});

/**
 * The open affordance of the row: the informational block is a button only
 * for an integer `agreementId`, and only the screen's `onApri` can fire it.
 */
const FILTRO_APRI = /^Apri lo scambio di questa notifica/;

/** The one actionable node exposing the open affordance: label, button role and a handler. */
function nodiApri() {
  return screen.queryAllByRole('button', { name: FILTRO_APRI });
}

async function premiApri() {
  const nodo = nodiApri()[0];
  expect(nodo).toBeDefined();
  await fireEvent.press(nodo);
}

describe('NotificationRow opening', () => {
  it('opens the agreement when the notification carries an integer id', async () => {
    const onApri = jest.fn();
    await renderRiga({ ...NOTIFICA, dati: { agreementId: 12 } }, { onApri });

    expect(nodiApri()).toHaveLength(1);
    // The name carries the row's own text: a `button` makes its descendants
    // presentational, so a fixed label silences the message on the only rows
    // that can be opened (F50, the same fix `ServiceCard` needed).
    expect(nodiApri()[0].props.accessibilityLabel).toContain(NOTIFICA.messaggio);

    await premiApri();
    expect(onApri).toHaveBeenCalledTimes(1);
  });

  it('carries the unread state in the open label, and leaves a read row without it', async () => {
    const onApri = jest.fn();
    await renderRiga(
      { ...NOTIFICA, letta: false, dati: { agreementId: 12 } },
      { onApri },
    );

    expect(nodiApri()).toHaveLength(1);
    // The header row sits inside the `button`, so it is presentational: the
    // words reach the reader only through the open label. The type, the date
    // and the message stay in it, untouched.
    expect(nodiApri()[0].props.accessibilityLabel).toContain('Non letta');
    expect(nodiApri()[0].props.accessibilityLabel).toContain(NOTIFICA.messaggio);

    await renderRiga({ ...NOTIFICA, dati: { agreementId: 12 } }, { onApri });
    expect(nodiApri()).toHaveLength(1);
    expect(nodiApri()[0].props.accessibilityLabel).not.toContain('Non letta');
  });

  it('stays inert when the id is missing, null or a string', async () => {
    const onApri = jest.fn();
    const casi = [
      { ...NOTIFICA },
      { ...NOTIFICA, dati: { agreementId: null } },
      { ...NOTIFICA, dati: { agreementId: '12' } },
    ];

    for (const notifica of casi) {
      await renderRiga(notifica, { onApri });

      const conEtichetta = screen.queryAllByLabelText(FILTRO_APRI);
      expect(conEtichetta).toHaveLength(0);
      // The open affordance is asserted on the actionable node: label, button
      // role and handler together — the button role alone also belongs to the
      // action buttons, which must keep rendering untouched.
      expect(nodiApri()).toHaveLength(0);
      // Con un id non valido la riga non ha nessun gestore dietro il tocco: il
      // tocco sul messaggio non arriva a `onApri` (la riga è tutta contenuto).
      await fireEvent.press(screen.getByText(NOTIFICA.messaggio));
    }

    expect(onApri).not.toHaveBeenCalled();
  });
});


it('shows a single-line preview from the chat notification payload', async () => {
  await renderRiga({ ...NOTIFICA, tipo: 'CHAT_MESSAGE', dati: { message: 'Ciao\n  a tutti' } });
  expect(screen.getByText('Ciao a tutti')).toBeTruthy();
});

/**
 * La voce della riga: le frasi che questo client scrive sono italiane.
 *
 * L'unica frase inglese che una notifica può mostrare è quella del servizio
 * (`StaffController.php`, `REPORT_REVIEWED` → «Your report has been reviewed
 * and confirmed.»): è un dato, arriva in `notifica.messaggio`, e il client non
 * lo traduce — la sua traduzione tocca al backend. Questo test tiene fermo il
 * confine: il messaggio del servizio è escluso dal controllo, tutto il resto
 * deve essere italiano, così una frase inglese scritta qui fa fallire la prova.
 */
const MESSAGGIO_DEL_SERVIZIO = 'Your report has been reviewed and confirmed.';
const PAROLE_INGLESI = /\b(the|your|has|been|and|are|was|were|will|you|with|from)\b/i;

/** Ogni stringa che la riga scrive o annuncia, meno il testo che arriva dal servizio. */
function paroleDellaRiga() {
  return screen.container
    .queryAll(
      (node) =>
        typeof node.props?.children === 'string' ||
        typeof node.props?.accessibilityLabel === 'string',
    )
    .flatMap((node) => [node.props.children, node.props.accessibilityLabel])
    .filter((testo) => typeof testo === 'string')
    .map((testo) => testo.split(MESSAGGIO_DEL_SERVIZIO).join(' '))
    .filter((testo) => testo.trim() !== '');
}

describe('NotificationRow — la voce è italiana', () => {
  it('non scrive una sola frase inglese: l’unica inglese è quella del servizio', async () => {
    await renderRiga({
      ...NOTIFICA,
      tipo: 'REPORT_REVIEWED',
      messaggio: MESSAGGIO_DEL_SERVIZIO,
      dati: { agreementId: 12 },
    });

    expect(paroleDellaRiga().join(' ')).not.toMatch(PAROLE_INGLESI);
  });

  it('dice la sua frase italiana quando il servizio non manda testo', async () => {
    await renderRiga({ ...NOTIFICA, tipo: 'REPORT_REVIEWED', messaggio: null });

    const scritte = paroleDellaRiga();
    expect(scritte).toContain('Notifica senza testo.');
    expect(scritte.join(' ')).not.toMatch(PAROLE_INGLESI);
  });

  it('chiama «scheda di consegna» la scheda, in ogni suo stato', () => {
    expect(etichettaTipo('AGREEMENT_DETAILS')).toBe('Scheda di consegna');
    expect(etichettaTipo('AGREEMENT_DETAILS_ACCEPTED')).toBe('Scheda di consegna confermata');
  });
});
