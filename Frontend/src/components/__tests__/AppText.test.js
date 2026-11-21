import { render, screen } from '@testing-library/react-native';

import { AppText } from '../AppText';

/**
 * Ruolo e profondità devono raccontare lo stesso nodo.
 *
 * La variante apre un titolo e `aria-level` ne dichiara la profondità, ma il
 * chiamante può togliere il ruolo (`accessibilityRole="text"` sulle card del
 * catalogo, sulle iniziali dell'avatar): lì un livello che resta è un residuo
 * ARIA, che react-native-web rende senza ruolo e nessuno screen reader legge
 * (audit 2026-11-18 §3.2: 11 attributi orfani).
 */
async function renderTesto(props = {}) {
  // Da RTL 14 `render` è asincrono: il montaggio si aspetta, non si avvolge in `act`.
  await render(<AppText {...props}>Servizi</AppText>);
  return screen.getByText('Servizi');
}

/** Le props dell'unico nodo disegnato: `Text` non ha figli da distinguere. */
function propsDisegnate(testo) {
  return testo.props;
}

describe('AppText heading', () => {
  it('dichiara ruolo header e la profondità della variante quando il chiamante non la sovrascrive', async () => {
    const props = propsDisegnate(await renderTesto({ variant: 'heading' }));

    expect(props.accessibilityRole).toBe('header');
    // `heading` sta un passo sotto la radice della pagina.
    expect(props['aria-level']).toBe(2);
  });

  it('tiene le profondità predefinite delle due varianti di titolo', async () => {
    expect(propsDisegnate(await renderTesto({ variant: 'title' }))['aria-level']).toBe(1);
    expect(propsDisegnate(await renderTesto({ variant: 'heading', level: 3 }))['aria-level']).toBe(3);
  });

  it('lascia le varianti di testo senza ruolo e senza profondità', async () => {
    const props = propsDisegnate(await renderTesto({ variant: 'body' }));

    expect(props.accessibilityRole).toBeUndefined();
    expect(props['aria-level']).toBeUndefined();
  });
});

describe('AppText con ruolo sovrascritto', () => {
  it('non emette aria-level quando il chiamante rende la variante come testo', async () => {
    const props = propsDisegnate(
      await renderTesto({ variant: 'heading', accessibilityRole: 'text' }),
    );

    // Il ruolo esplicito vince sulla variante, e la profondità non lo segue:
    // un `aria-level` con valore (2, il default di `heading`) è l'attributo
    // orfano. Undefined è ciò che react-native-web non rende affatto.
    expect(props.accessibilityRole).toBe('text');
    expect(props['aria-level']).toBeUndefined();
  });

  it('non emette aria-level nemmeno con una profondità dichiarata a mano', async () => {
    const props = propsDisegnate(
      await renderTesto({ variant: 'heading', level: 1, accessibilityRole: 'text' }),
    );

    expect(props.accessibilityRole).toBe('text');
    expect(props['aria-level']).toBeUndefined();
  });
});
