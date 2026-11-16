import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';

import { ServiceGroup } from '../ServiceGroup';

/**
 * The group's one decision: how long it is allowed to be.
 *
 * The same component draws the rows twice — capped and counted inside the
 * service detail, whole and uncounted on the public profile — so the cap is a
 * prop and not a constant, and the counter exists only where a cut exists.
 */
const SERVIZI = [1, 2, 3, 4, 5].map((n) => ({
  chiave: `OFFER-${n}`,
  descrizione: `Servizio ${n}`,
}));

function render(props) {
  let renderer;
  act(() => {
    renderer = create(<ServiceGroup titolo="Offre" icona="pricetag-outline" {...props} />);
  });
  return renderer;
}

/** The row lines, recognised by the `- ` the group puts in front of each. */
function righe(renderer) {
  return renderer.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .filter((child) => typeof child === 'string' && child.startsWith('- '));
}

/** The «e N altre» line, if the group drew one. */
function contatore(renderer) {
  return renderer.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .filter((child) => typeof child === 'string' && /^e \d+ altr[ae]$/.test(child));
}

describe('ServiceGroup — the rows it is allowed to draw', () => {
  it('caps at three rows and counts the rest when no limit is given', () => {
    const renderer = render({ servizi: SERVIZI });

    expect(righe(renderer)).toHaveLength(3);
    expect(contatore(renderer)).toEqual(['e 2 altre']);
  });

  it('draws every row and no counter when the limit is null', () => {
    const renderer = render({ servizi: SERVIZI, limite: null });

    expect(righe(renderer)).toHaveLength(5);
    expect(contatore(renderer)).toHaveLength(0);
  });

  it('draws nothing for an empty or absent list', () => {
    expect(render({ servizi: [] }).toJSON()).toBeNull();
    expect(render({ servizi: undefined }).toJSON()).toBeNull();
  });

  it('treats a limit of zero or less as no limit at all', () => {
    // A cap that hides the rows it claims to show is not a cap: the caller
    // either truncates for real or shows everything.
    expect(righe(render({ servizi: SERVIZI, limite: 0 }))).toHaveLength(5);
    expect(contatore(render({ servizi: SERVIZI, limite: -2 }))).toHaveLength(0);
  });

  it('draws one line per row by default and the whole description on request', () => {
    const numeriDiRiga = (renderer) =>
      renderer.root.findAllByType(Text).filter((node) => node.props.numberOfLines !== undefined);

    expect(numeriDiRiga(render({ servizi: SERVIZI }))[0].props.numberOfLines).toBe(1);
    expect(numeriDiRiga(render({ servizi: SERVIZI, righe: null }))).toHaveLength(0);
  });
});
