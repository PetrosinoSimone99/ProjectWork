import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { MessageBubble } from '../MessageBubble';
import { formatIsoDateTime } from '@/services/dates';
import { useTokens } from '@/theme/tokens';

/**
 * The row as `normalizeChatMessage` hands it to the bubble: every field the
 * component reads. The timestamp is a real ISO 8601 value; the tests that need
 * it missing override `inviatoIl`.
 */
const MESSAGGIO = {
  id: 12,
  chatId: 3,
  autore: 'mio',
  testo: 'Ci vediamo domani davanti alla stazione.',
  inviatoIl: '2026-11-16T14:03:22+00:00',
};

const MIO_USERNAME = 'mio';

/**
 * The theme the render actually used, captured the same way
 * `NotificationRow.test.js` does it: the expected colours come back through
 * the hook the bubble uses instead of being hard-coded, so the assertions
 * hold in either theme.
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

async function renderBolla(messaggio, extra = {}) {
  // From RTL 14 `render` is async: the mount is awaited, not wrapped in `act`.
  await render(
    <>
      <MessageBubble messaggio={messaggio} myUsername={MIO_USERNAME} {...extra} />
      <TokenProbe />
    </>,
  );
}

/** Flattened styles of the two views: the row container and the bubble itself. */
function stili() {
  const views = screen.container
    .queryAll((nodo) => nodo.type === 'View')
    .map((nodo) => StyleSheet.flatten(nodo.props.style ?? {}));
  return {
    // The container only aligns; the bubble is the one carrying a fill.
    contenitore: views.find((stile) => stile.alignItems && stile.backgroundColor === undefined),
    bolla: views.find((stile) => stile.backgroundColor !== undefined),
  };
}

/** Every string drawn inside the bubble, in render order: name, text, time. */
function testiRenderati() {
  return screen.container
    .queryAll((nodo) => nodo.type === 'Text')
    .map((nodo) => nodo.props.children)
    .filter((child) => typeof child === 'string');
}

/** The style of the drawn text with this exact content. */
function stileDelTesto(contenuto) {
  const nodo = screen.container
    .queryAll((nodo) => nodo.type === 'Text')
    .find((nodo) => nodo.props.children === contenuto);
  expect(nodo).toBeDefined();
  return StyleSheet.flatten(nodo.props.style ?? {});
}

describe('MessageBubble own vs other', () => {
  it('draws the own message on the right over the service tokens, named Tu', async () => {
    await renderBolla(MESSAGGIO);
    const { contenitore, bolla } = stili();

    expect(contenitore.alignItems).toBe('flex-end');
    expect(bolla.backgroundColor).toBe(tokens.serviceBg);
    // The own bubble carries ink, not an outline.
    expect(bolla.borderWidth).toBe(0);
    expect(stileDelTesto(MESSAGGIO.testo).color).toBe(tokens.serviceText);
    expect(testiRenderati()).toContain('Tu');
    expect(testiRenderati()).not.toContain(`@${MESSAGGIO.autore}`);
  });

  it('draws the other side on the left over surface with the input border, named @autore', async () => {
    await renderBolla({ ...MESSAGGIO, autore: 'altro' });
    const { contenitore, bolla } = stili();

    expect(contenitore.alignItems).toBe('flex-start');
    expect(bolla.backgroundColor).toBe(tokens.surface);
    expect(bolla.borderColor).toBe(tokens.borderInput);
    expect(bolla.borderWidth).toBe(1);
    expect(stileDelTesto(MESSAGGIO.testo).color).toBe(tokens.text);
    expect(testiRenderati()).toContain('@altro');
    expect(testiRenderati()).not.toContain('Tu');
  });

  it('draws no name at all when the author is missing', async () => {
    await renderBolla({ ...MESSAGGIO, autore: null });
    const disegnati = testiRenderati();

    // No invented placeholder: neither a handle nor a "Tu" guess.
    expect(disegnati.some((testo) => testo.startsWith('@'))).toBe(false);
    expect(disegnati).not.toContain('Tu');
    expect(disegnati).toContain(MESSAGGIO.testo);
    // A null author is never the session user, so the row stays on the left.
    expect(stili().contenitore.alignItems).toBe('flex-start');
  });
});

describe('MessageBubble time', () => {
  it('shows the formatted time in the small secondary role when inviatoIl is present', async () => {
    await renderBolla(MESSAGGIO);
    const ora = formatIsoDateTime(MESSAGGIO.inviatoIl);

    // The formatter itself is covered by `src/services/__tests__/dates.test.js`; here it only has to
    // be a formatted local time, not the raw ISO string.
    expect(ora).not.toBeNull();
    expect(ora).toContain(':');
    expect(ora).not.toContain('T');

    const disegnati = testiRenderati();
    expect(disegnati).toContain(ora);
    expect(disegnati).not.toContain(MESSAGGIO.inviatoIl);

    const stileOra = stileDelTesto(ora);
    expect(stileOra.color).toBe(tokens.textSecondary);
    expect(stileOra.fontSize).toBe(13);
  });

  it('draws no time when inviatoIl is missing', async () => {
    await renderBolla({ ...MESSAGGIO, inviatoIl: null });

    // Name and text only: nothing that could read as a clock.
    expect(testiRenderati()).toEqual(['Tu', MESSAGGIO.testo]);
  });
});

describe('MessageBubble long text', () => {
  const LUNGO =
    'Una riga che non sta tutta in una volta e deve tornare a capo dentro la bolla.\n' +
    'Seconda riga, più lunga della prima, che continua a scorrere nella colonna della chat.';

  it('keeps the whole message, newlines included, inside the bubble', async () => {
    await renderBolla({ ...MESSAGGIO, testo: LUNGO });
    const { bolla } = stili();

    // The full string arrives intact: the line breaks are the message's own.
    expect(testiRenderati()).toContain(LUNGO);

    // The bubble caps to the column instead of claiming a fixed width, so the
    // text wraps inside it and never widens past the chat column.
    expect(bolla.maxWidth).toBe('100%');
    expect(bolla.width).toBeUndefined();
  });
});
