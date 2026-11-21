import { fireEvent, render, screen } from '@testing-library/react-native';

import { ProfileSummary } from '../ProfileSummary';

/**
 * One `utente` as the public profile endpoint normalises it
 * (`normalizeUserServices().utente`): every field the summary reads, with the
 * optional ones overridden per test.
 */
const UTENTE = {
  id: 7,
  username: 'marco.rossi',
  nome: 'Marco',
  cognome: 'Rossi',
  localita: 'Roma',
  bio: 'Riparo biciclette nel fine settimana.',
  immagineProfilo: null,
};

/** Renders the summary; RTL 14 mounts asynchronously, so the mount is awaited. */
async function renderUtente(utente) {
  // Da RTL 14 `render` è asincrono: il montaggio si aspetta, non si avvolge in `act`.
  return await render(<ProfileSummary utente={utente} />);
}

/**
 * The lines the summary draws, one per text node: a matched line is a whole
 * sentence of the component, so `not.toContain` cannot be fooled by a fragment
 * of another line.
 */
function righe() {
  const trovate = [];
  const visita = (node) => {
    if (node === null || node === undefined) {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visita);
      return;
    }
    if (typeof node !== 'object') {
      return;
    }
    const children = node.children ?? [];
    if (children.length > 0 && children.every((child) => typeof child === 'string')) {
      trovate.push(children.join(''));
      return;
    }
    children.forEach(visita);
  };
  visita(screen.toJSON());
  return trovate;
}

/**
 * The image `Avatar` draws, matched on the label it announces and the loader it
 * reports on. RTL 14 draws host elements only, so this is the `expo-image` view
 * itself rather than the component above it: it carries the same label, the
 * same `onError`, and the props it resolved to.
 */
function foto() {
  return screen.container
    .queryAll(
      (node) =>
        node.props?.accessibilityLabel === 'Immagine del profilo' &&
        typeof node.props.onError === 'function',
    )
    .at(0);
}

/**
 * The photo reports the address it could not load through `expo-image`'s own
 * `onError`, which reads the payload the native view sends.
 */
async function segnalaFotoRotta() {
  await fireEvent(foto(), 'error', { nativeEvent: {} });
}

describe('ProfileSummary', () => {
  it('composes the name and the surname into one line', async () => {
    await renderUtente(UTENTE);

    expect(righe()).toContain('Marco Rossi');
  });

  it('shows the @username when the person has one', async () => {
    await renderUtente(UTENTE);

    expect(righe()).toContain('@marco.rossi');
  });

  it('draws no line for each absent field and never a placeholder', async () => {
    // Only the name survives: no username, no location, no bio.
    await renderUtente({
      id: 7,
      username: null,
      nome: 'Marco',
      cognome: 'Rossi',
      localita: null,
      bio: null,
      immagineProfilo: null,
    });

    const testo = righe();
    expect(testo).toContain('Marco Rossi');
    expect(testo).not.toContain('@marco.rossi');
    expect(testo.join('\n')).not.toContain('Roma');
    expect(testo.join('\n')).not.toContain('Riparo biciclette');
    expect(testo.some((riga) => /non indicat/i.test(riga))).toBe(false);
  });

  it('draws nothing but the initials circle when every optional field is missing', async () => {
    await renderUtente({
      id: 7,
      username: null,
      nome: null,
      cognome: null,
      localita: null,
      bio: null,
      immagineProfilo: null,
    });

    const testo = righe();
    expect(testo).toContain('?');
    expect(foto()).toBeUndefined();
    expect(testo.some((riga) => /non indicat/i.test(riga))).toBe(false);
    expect(testo.join('\n')).not.toContain('@');
  });

  it('draws the photo through expo-image, cached and decoded at the box size', async () => {
    await renderUtente({
      ...UTENTE,
      immagineProfilo: 'https://example.invalid/marco.jpg',
    });

    const immagine = foto();
    expect(immagine).toBeDefined();
    expect(immagine.props.cachePolicy).toBe('memory-disk');
    expect(immagine.props.contentFit).toBe('cover');
    // The decode target is the disc (84 px), whatever the upload's own size is.
    expect(immagine.props.style).toMatchObject({ width: 84, height: 84 });
    // The photo fades in over the space it already occupies: `expo-image` turns
    // the declared milliseconds into the animation it runs.
    expect(immagine.props.transition).toMatchObject({ duration: expect.any(Number) });
    // Another person in the same slot is another bitmap, not the recycled one.
    expect(immagine.props.recyclingKey).toBe('https://example.invalid/marco.jpg');
    // The initials are the fallback, not a second identity: with a photo they are gone.
    expect(righe()).not.toContain('MR');
  });

  it('draws the initials disc and no image when the person has no photo', async () => {
    await renderUtente(UTENTE);

    expect(foto()).toBeUndefined();
    expect(righe()).toContain('MR');
  });

  it('treats a blank address as no photo', async () => {
    await renderUtente({ ...UTENTE, immagineProfilo: '   ' });

    expect(foto()).toBeUndefined();
    expect(righe()).toContain('MR');
  });

  it('falls back to the initials and says the image is broken when the photo does not load', async () => {
    await renderUtente({
      ...UTENTE,
      immagineProfilo: 'https://example.invalid/marco.jpg',
    });

    const immagine = foto();
    expect(immagine).toBeDefined();
    // While it loads there is no error line and no initials circle under it:
    // the broken image is a state the summary declares, not something to hide.
    expect(righe()).not.toContain('MR');
    expect(righe().some((riga) => riga.includes('non si carica'))).toBe(false);

    await segnalaFotoRotta();

    const testo = righe();
    expect(testo).toContain('MR');
    expect(testo.some((riga) => riga.includes('non si carica'))).toBe(true);
    expect(foto()).toBeUndefined();
  });

  it('does not repeat the username when it is already the name line', async () => {
    // A person with no name reads `@marco.rossi` once, not twice.
    await renderUtente({ ...UTENTE, nome: null, cognome: null });

    const quante = righe().filter((riga) => riga === '@marco.rossi').length;
    expect(quante).toBe(1);
  });

  it('does not carry a broken photo over to the next person', async () => {
    // `/user/7` and `/user/9` are the same component with other props: the
    // failure belongs to the address that failed, not to the component.
    const { rerender } = await renderUtente({
      ...UTENTE,
      immagineProfilo: 'https://example.invalid/a.jpg',
    });
    await segnalaFotoRotta();

    await rerender(
      <ProfileSummary
        utente={{ ...UTENTE, id: 9, immagineProfilo: 'https://example.invalid/b.jpg' }}
      />,
    );

    expect(foto()).toBeDefined();
    expect(righe().some((riga) => riga.includes('non si carica'))).toBe(false);
  });
});
