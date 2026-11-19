import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { act, create } from 'react-test-renderer';

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

function renderRiga(notifica, extra = {}) {
  let renderer;
  act(() => {
    renderer = create(
      <>
        <NotificationRow notifica={notifica} {...extra} />
        <TokenProbe />
      </>,
    );
  });
  return renderer;
}

/** The control with this accessibility label, pressed the way a tap would. */
function premi(renderer, accessibilityLabel) {
  const pulsante = renderer.root
    .findAll(
      (node) =>
        node.props?.accessibilityLabel === accessibilityLabel &&
        typeof node.props.onPress === 'function',
    )
    .at(0);
  expect(pulsante).toBeDefined();
  act(() => {
    pulsante.props.onPress();
  });
}

describe('NotificationRow rendering', () => {
  it('keeps the surface on an unread row and marks it with the primary border and a leading dot', () => {
    const renderer = renderRiga({ ...NOTIFICA, letta: false });
    const stile = StyleSheet.flatten(renderer.root.findAllByType(View)[0].props.style);

    expect(stile.backgroundColor).toBe(tokens.surface);
    expect(stile.backgroundColor).not.toBe(tokens.serviceBg);
    expect(stile.borderColor).toBe(tokens.primary);

    const pallino = renderer.root
      .findAllByType(View)
      .map((node) => StyleSheet.flatten(node.props.style ?? {}))
      .find((style) => style.width === 8 && style.height === 8);
    expect(pallino).toBeDefined();
    expect(pallino.backgroundColor).toBe(tokens.primary);
    expect(pallino.borderRadius).toBe(radius.pill);

    // A read row keeps the same surface with the decorative border: the state
    // is the border and the dot, never a fill.
    const letta = renderRiga(NOTIFICA);
    const stileLetto = StyleSheet.flatten(letta.root.findAllByType(View)[0].props.style);
    expect(stileLetto.backgroundColor).toBe(tokens.surface);
    expect(stileLetto.borderColor).toBe(tokens.border);
  });

  it('marks an unread row with the words "Non letta", which a read row never shows', () => {
    // The border and the dot are colour: the words are the state a reader who
    // cannot see the colour, or who listens to a row that cannot be opened,
    // still gets (WCAG 1.4.1).
    const nonLetta = renderRiga({ ...NOTIFICA, letta: false });
    expect(
      nonLetta.root.findAll((node) => node.props?.children === 'Non letta').length,
    ).toBeGreaterThan(0);

    const letta = renderRiga(NOTIFICA);
    expect(letta.root.findAll((node) => node.props?.children === 'Non letta')).toHaveLength(0);
  });

  it('fires the delete callback only from the confirm panel', () => {
    const onElimina = jest.fn();
    const renderer = renderRiga(NOTIFICA, { onElimina });

    premi(renderer, 'Elimina questa notifica');
    expect(onElimina).not.toHaveBeenCalled();

    premi(renderer, 'Elimina');
    expect(onElimina).toHaveBeenCalledTimes(1);
  });

  it('leaves the row untouched when the panel is dismissed with "No, torna indietro"', () => {
    const onElimina = jest.fn();
    const renderer = renderRiga({ ...NOTIFICA, messaggio: 'Riga da non perdere.' }, { onElimina });

    premi(renderer, 'Elimina questa notifica');
    premi(renderer, 'No, torna indietro');

    expect(onElimina).not.toHaveBeenCalled();
    const testoDellaRiga = renderer.root.findAll(
      (node) => node.props?.children === 'Riga da non perdere.',
    );
    expect(testoDellaRiga.length).toBeGreaterThan(0);
  });
});

/**
 * The open affordance of the row: the informational block is a button only
 * for an integer `agreementId`, and only the screen's `onApri` can fire it.
 */
const PREFISSO_APRI = 'Apri lo scambio di questa notifica';

/** The one actionable node exposing the open affordance: label, button role and a handler. */
function nodiApri(renderer) {
  return renderer.root.findAll(
    (node) =>
      typeof node.props?.accessibilityLabel === 'string' &&
      node.props.accessibilityLabel.startsWith(PREFISSO_APRI) &&
      node.props?.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function',
  );
}

function premiApri(renderer) {
  const nodo = nodiApri(renderer).at(0);
  expect(nodo).toBeDefined();
  act(() => {
    nodo.props.onPress();
  });
}

describe('NotificationRow opening', () => {
  it('opens the agreement when the notification carries an integer id', () => {
    const onApri = jest.fn();
    const renderer = renderRiga({ ...NOTIFICA, dati: { agreementId: 12 } }, { onApri });

    expect(nodiApri(renderer)).toHaveLength(1);
    // The name carries the row's own text: a `button` makes its descendants
    // presentational, so a fixed label silences the message on the only rows
    // that can be opened (F50, the same fix `ServiceCard` needed).
    expect(nodiApri(renderer)[0].props.accessibilityLabel).toContain(NOTIFICA.messaggio);

    premiApri(renderer);
    expect(onApri).toHaveBeenCalledTimes(1);
  });

  it('carries the unread state in the open label, and leaves a read row without it', () => {
    const onApri = jest.fn();
    const nonLetta = renderRiga(
      { ...NOTIFICA, letta: false, dati: { agreementId: 12 } },
      { onApri },
    );

    expect(nodiApri(nonLetta)).toHaveLength(1);
    // The header row sits inside the `button`, so it is presentational: the
    // words reach the reader only through the open label. The type, the date
    // and the message stay in it, untouched.
    expect(nodiApri(nonLetta)[0].props.accessibilityLabel).toContain('Non letta');
    expect(nodiApri(nonLetta)[0].props.accessibilityLabel).toContain(NOTIFICA.messaggio);

    const letta = renderRiga({ ...NOTIFICA, dati: { agreementId: 12 } }, { onApri });
    expect(nodiApri(letta)).toHaveLength(1);
    expect(nodiApri(letta)[0].props.accessibilityLabel).not.toContain('Non letta');
  });

  it('stays inert when the id is missing, null or a string', () => {
    const onApri = jest.fn();
    const casi = [
      { ...NOTIFICA },
      { ...NOTIFICA, dati: { agreementId: null } },
      { ...NOTIFICA, dati: { agreementId: '12' } },
    ];

    for (const notifica of casi) {
      const renderer = renderRiga(notifica, { onApri });

      const conEtichetta = renderer.root.findAll(
        (node) =>
          typeof node.props?.accessibilityLabel === 'string' &&
          node.props.accessibilityLabel.startsWith(PREFISSO_APRI),
      );
      expect(conEtichetta).toHaveLength(0);
      // The host nodes under `Pressable` re-expose its accessibility props, so
      // the open affordance is asserted on the actionable node: label, button
      // role and handler together — the button role alone also belongs to the
      // action buttons, which must keep rendering untouched.
      expect(nodiApri(renderer)).toHaveLength(0);
      expect(renderer.root.findAll((node) => node.props?.onPress === onApri)).toHaveLength(0);
    }

    expect(onApri).not.toHaveBeenCalled();
  });
});


it('shows a single-line preview from the chat notification payload', () => {
  const renderer = renderRiga({ ...NOTIFICA, tipo: 'CHAT_MESSAGE', dati: { message: 'Ciao\n  a tutti' } });
  expect(renderer.root.findAll((node) => node.props?.children === 'Ciao a tutti').length).toBeGreaterThan(0);
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
function paroleDellaRiga(renderer) {
  return renderer.root
    .findAll(
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
  it('non scrive una sola frase inglese: l’unica inglese è quella del servizio', () => {
    const renderer = renderRiga({
      ...NOTIFICA,
      tipo: 'REPORT_REVIEWED',
      messaggio: MESSAGGIO_DEL_SERVIZIO,
      dati: { agreementId: 12 },
    });

    expect(paroleDellaRiga(renderer).join(' ')).not.toMatch(PAROLE_INGLESI);
  });

  it('dice la sua frase italiana quando il servizio non manda testo', () => {
    const renderer = renderRiga({ ...NOTIFICA, tipo: 'REPORT_REVIEWED', messaggio: null });

    const scritte = paroleDellaRiga(renderer);
    expect(scritte).toContain('Notifica senza testo.');
    expect(scritte.join(' ')).not.toMatch(PAROLE_INGLESI);
  });

  it('chiama «scheda di consegna» la scheda, in ogni suo stato', () => {
    expect(etichettaTipo('AGREEMENT_DETAILS')).toBe('Scheda di consegna');
    expect(etichettaTipo('AGREEMENT_DETAILS_ACCEPTED')).toBe('Scheda di consegna confermata');
  });
});
