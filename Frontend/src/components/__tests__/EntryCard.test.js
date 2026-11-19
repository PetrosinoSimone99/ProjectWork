import { act, create } from 'react-test-renderer';

import { AppButton } from '../AppButton';
import { EntryCard } from '../EntryCard';

/**
 * One action, and the two reasons that switch it off.
 *
 * Every account holds one offer and one request, both mandatory, so the card
 * cannot offer suspend, reactivate or delete: those controls are gone, not
 * disabled. What remains is «Modifica», which still stops for the missing
 * categories and while a write is in flight.
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
        {...extra}
      />,
    );
  });
  return renderer;
}

/** The actions the card draws, by their visible label. */
function etichette(renderer) {
  return renderer.root.findAllByType(AppButton).map((bottone) => bottone.props.label);
}

/** The action with this label, as a reader meets it: one button, one state. */
function pulsante(renderer, etichetta) {
  const nodo = renderer.root
    .findAllByType(AppButton)
    .find((bottone) => bottone.props.label === etichetta);
  expect(nodo).toBeDefined();
  return nodo;
}

describe('EntryCard — one action, not three', () => {
  it('draws «Modifica» and none of the controls the product rule removed', () => {
    const renderer = render();

    expect(etichette(renderer)).toEqual(['Modifica']);
    expect(etichette(renderer)).not.toContain('Elimina');
    expect(etichette(renderer)).not.toContain('Sospendi');
    expect(etichette(renderer)).not.toContain('Ripubblica');
  });

  it('hands the entry to «Modifica»', () => {
    const onModifica = jest.fn();
    const renderer = render({ onModifica });

    act(() => {
      pulsante(renderer, 'Modifica').props.onPress();
    });

    expect(onModifica).toHaveBeenCalledWith(VOCE);
  });
});

describe('EntryCard — one word for the free text of a service', () => {
  it('calls it a description, in the row and in its fallback', () => {
    const conTesto = JSON.stringify(render().toJSON());
    expect(conTesto).not.toContain('Mansione');

    const senzaTesto = JSON.stringify(render({ voce: { ...VOCE, mansione: '   ' } }).toJSON());
    expect(senzaTesto).toContain('Descrizione non indicata');
    expect(senzaTesto).not.toContain('Mansione');
  });
});

describe('EntryCard — what the two reasons switch off', () => {
  it('leaves «Modifica» enabled when no reason is given', () => {
    expect(pulsante(render(), 'Modifica').props.disabled).toBe(false);
  });

  it('switches «Modifica» off when the categories are missing', () => {
    expect(pulsante(render({ modificaDisabilitata: true }), 'Modifica').props.disabled).toBe(true);
  });

  it('switches «Modifica» off while a write is in flight', () => {
    expect(pulsante(render({ azioniDisabilitate: true }), 'Modifica').props.disabled).toBe(true);
  });

  it('switches «Modifica» off on a row the server has not given an id to', () => {
    const renderer = render({ voce: { ...VOCE, id: null } });

    expect(pulsante(renderer, 'Modifica').props.disabled).toBe(true);
  });
});
