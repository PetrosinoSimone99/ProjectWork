import { act, create } from 'react-test-renderer';

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

/** Renders the summary with every update inside act. */
function renderUtente(utente) {
  let renderer;
  act(() => {
    renderer = create(<ProfileSummary utente={utente} />);
  });
  return renderer;
}

/**
 * The lines the summary draws, one per text node: a matched line is a whole
 * sentence of the component, so `not.toContain` cannot be fooled by a fragment
 * of another line.
 */
function righe(renderer) {
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
  visita(renderer.toJSON());
  return trovate;
}

/** The image `Avatar` draws, matched on the label it announces and the loader it reports on. */
function foto(renderer) {
  return renderer.root
    .findAll(
      (node) =>
        node.props?.accessibilityLabel === 'Immagine del profilo' &&
        typeof node.props.onError === 'function',
    )
    .at(0);
}

describe('ProfileSummary', () => {
  it('composes the name and the surname into one line', () => {
    const renderer = renderUtente(UTENTE);

    expect(righe(renderer)).toContain('Marco Rossi');
  });

  it('shows the @username when the person has one', () => {
    const renderer = renderUtente(UTENTE);

    expect(righe(renderer)).toContain('@marco.rossi');
  });

  it('draws no line for each absent field and never a placeholder', () => {
    // Only the name survives: no username, no location, no bio.
    const renderer = renderUtente({
      id: 7,
      username: null,
      nome: 'Marco',
      cognome: 'Rossi',
      localita: null,
      bio: null,
      immagineProfilo: null,
    });

    const testo = righe(renderer);
    expect(testo).toContain('Marco Rossi');
    expect(testo).not.toContain('@marco.rossi');
    expect(testo.join('\n')).not.toContain('Roma');
    expect(testo.join('\n')).not.toContain('Riparo biciclette');
    expect(testo.some((riga) => /non indicat/i.test(riga))).toBe(false);
  });

  it('draws nothing but the initials circle when every optional field is missing', () => {
    const renderer = renderUtente({
      id: 7,
      username: null,
      nome: null,
      cognome: null,
      localita: null,
      bio: null,
      immagineProfilo: null,
    });

    const testo = righe(renderer);
    expect(testo).toContain('?');
    expect(foto(renderer)).toBeUndefined();
    expect(testo.some((riga) => /non indicat/i.test(riga))).toBe(false);
    expect(testo.join('\n')).not.toContain('@');
  });

  it('draws the photo through expo-image, cached and decoded at the box size', () => {
    const renderer = renderUtente({
      ...UTENTE,
      immagineProfilo: 'https://example.invalid/marco.jpg',
    });

    const immagine = foto(renderer);
    expect(immagine).toBeDefined();
    expect(immagine.props.cachePolicy).toBe('memory-disk');
    expect(immagine.props.contentFit).toBe('cover');
    // The decode target is the disc (84 px), whatever the upload's own size is.
    expect(immagine.props.style).toMatchObject({ width: 84, height: 84 });
    // The photo fades in over the space it already occupies.
    expect(typeof immagine.props.transition).toBe('number');
    // Another person in the same slot is another bitmap, not the recycled one.
    expect(immagine.props.recyclingKey).toBe('https://example.invalid/marco.jpg');
    // The initials are the fallback, not a second identity: with a photo they are gone.
    expect(righe(renderer)).not.toContain('MR');
  });

  it('draws the initials disc and no image when the person has no photo', () => {
    const renderer = renderUtente(UTENTE);

    expect(foto(renderer)).toBeUndefined();
    expect(righe(renderer)).toContain('MR');
  });

  it('treats a blank address as no photo', () => {
    const renderer = renderUtente({ ...UTENTE, immagineProfilo: '   ' });

    expect(foto(renderer)).toBeUndefined();
    expect(righe(renderer)).toContain('MR');
  });

  it('falls back to the initials and says the image is broken when the photo does not load', () => {
    const renderer = renderUtente({
      ...UTENTE,
      immagineProfilo: 'https://example.invalid/marco.jpg',
    });

    const immagine = foto(renderer);
    expect(immagine).toBeDefined();
    // While it loads there is no error line and no initials circle under it:
    // the broken image is a state the summary declares, not something to hide.
    expect(righe(renderer)).not.toContain('MR');
    expect(righe(renderer).some((riga) => riga.includes('non si carica'))).toBe(false);

    act(() => {
      immagine.props.onError();
    });

    const testo = righe(renderer);
    expect(testo).toContain('MR');
    expect(testo.some((riga) => riga.includes('non si carica'))).toBe(true);
    expect(foto(renderer)).toBeUndefined();
  });

  it('does not repeat the username when it is already the name line', () => {
    // A person with no name reads `@marco.rossi` once, not twice.
    const renderer = renderUtente({ ...UTENTE, nome: null, cognome: null });

    const quante = righe(renderer).filter((riga) => riga === '@marco.rossi').length;
    expect(quante).toBe(1);
  });

  it('does not carry a broken photo over to the next person', () => {
    // `/user/7` and `/user/9` are the same component with other props: the
    // failure belongs to the address that failed, not to the component.
    const renderer = renderUtente({ ...UTENTE, immagineProfilo: 'https://example.invalid/a.jpg' });
    act(() => {
      foto(renderer).props.onError();
    });

    act(() => {
      renderer.update(
        <ProfileSummary
          utente={{ ...UTENTE, id: 9, immagineProfilo: 'https://example.invalid/b.jpg' }}
        />,
      );
    });

    expect(foto(renderer)).toBeDefined();
    expect(righe(renderer).some((riga) => riga.includes('non si carica'))).toBe(false);
  });
});
