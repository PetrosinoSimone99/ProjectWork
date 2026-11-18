import { act, create } from 'react-test-renderer';

import { AppButton } from '../AppButton';
import { EntryCard } from '../EntryCard';

/**
 * I due motivi dietro i due interruttori (audit C6).
 *
 * `modificaDisabilitata` nasce dalle categorie mancanti: senza di esse non si
 * pubblica né si modifica, ma «Sospendi» ed «Elimina» non le leggono e devono
 * restare disponibili. `azioniDisabilitate` nasce da una scrittura in volo:
 * lì si spengono tutte e tre. Il test pinna la promessa sul controllo
 * renderizzato, non sulla formula che la calcola.
 */
// Le icone caricano il font in modo asincrono e aggiornano stato fuori da ogni
// `act`: qui non sono sotto test, e il loro ciclo di vita sporcherebbe l'output
// con un avviso che non riguarda la card.
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

/** L'azione con questa etichetta, come la incontra chi legge: un bottone, uno stato. */
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
