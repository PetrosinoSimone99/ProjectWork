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
});
