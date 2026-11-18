import { act, create } from 'react-test-renderer';

import { AppButton } from '../AppButton';
import { EntryCard } from '../EntryCard';

/**
 * The two reasons behind the two switches (audit C6).
 *
 * `modificaDisabilitata` comes from the missing categories: without them nothing
 * is published or modified, but «Sospendi» and «Elimina» do not read them and
 * must stay available. `azioniDisabilitate` comes from a write in flight: there
 * all three go off. The test pins the promise on the rendered control, not on
 * the formula that computes it.
 */
// Icons load their font asynchronously and set state outside any `act`: they are
// not under test here, and their lifecycle would only add a warning that does
// not concern the card.
jest.mock('../AppIcon', () => ({
  AppIcon: () => null,
}));

const VOCE = {
  chiave: 'OFFERTA-1',
  tipo: 'OFFERTA',
  id: 1,
  idCategoria: 3,
  mansione: 'Riparazione biciclette',
  daRemoto: false,
  localita: '',
  stato: 'PUBBLICATA',
};

const CATEGORIE = [{ id: 3, nome: 'Riparazioni' }];

function render(extra = {}) {
  let renderer;
  act(() => {
    renderer = create(
      <EntryCard
        voce={VOCE}
        categorie={CATEGORIE}
        onModifica={jest.fn()}
        onCambiaStato={jest.fn()}
        onElimina={jest.fn()}
        {...extra}
      />,
    );
  });
  return renderer;
}

/** The action with this label, as a reader meets it: one button, one state. */
function pulsante(renderer, etichetta) {
  const nodo = renderer.root
    .findAllByType(AppButton)
    .find((bottone) => bottone.props.label === etichetta);
  expect(nodo).toBeDefined();
  return nodo;
}

describe('EntryCard — what the two reasons switch off', () => {
  it('leaves all three actions enabled when no reason is given', () => {
    const renderer = render();

    expect(pulsante(renderer, 'Modifica').props.disabled).toBe(false);
    expect(pulsante(renderer, 'Sospendi').props.disabled).toBe(false);
    expect(pulsante(renderer, 'Elimina').props.disabled).toBe(false);
  });

  it('keeps suspend and delete enabled when the categories are missing', () => {
    const renderer = render({ modificaDisabilitata: true });

    expect(pulsante(renderer, 'Modifica').props.disabled).toBe(true);
    expect(pulsante(renderer, 'Sospendi').props.disabled).toBe(false);
    expect(pulsante(renderer, 'Elimina').props.disabled).toBe(false);
  });

  it('switches off every action while a write is in flight', () => {
    const renderer = render({ azioniDisabilitate: true });

    expect(pulsante(renderer, 'Modifica').props.disabled).toBe(true);
    expect(pulsante(renderer, 'Sospendi').props.disabled).toBe(true);
    expect(pulsante(renderer, 'Elimina').props.disabled).toBe(true);
  });

  it('switches off suspend and delete while this card has a state change in flight', () => {
    const renderer = render({ azioneInCorso: 'stato' });

    expect(pulsante(renderer, 'Sospendi').props.disabled).toBe(true);
    expect(pulsante(renderer, 'Elimina').props.disabled).toBe(true);
  });
});
