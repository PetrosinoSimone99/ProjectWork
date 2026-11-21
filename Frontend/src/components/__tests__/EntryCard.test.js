import { fireEvent, render, screen } from '@testing-library/react-native';

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

async function renderVoce(extra = {}) {
  // Da RTL 14 `render` è asincrono: il montaggio si aspetta, non si avvolge in `act`.
  await render(
    <EntryCard
      voce={VOCE}
      categorie={CATEGORIE}
      onModifica={jest.fn()}
      {...extra}
    />,
  );
}

/**
 * The action with this label, as a reader meets it: one button, one state.
 *
 * La card disegna un comando solo, quindi il bottone è quello: `Modifica` è la
 * parola che si legge dentro, il nome accessibile viaggia con la voce su cui
 * agisce (`Modifica un'offerta: …`).
 */
function pulsante() {
  return screen.getByRole('button');
}

describe('EntryCard — one action, not three', () => {
  it('draws «Modifica» and none of the controls the product rule removed', async () => {
    await renderVoce();

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByText('Modifica')).toBeTruthy();
    expect(screen.queryByText('Elimina')).toBeNull();
    expect(screen.queryByText('Sospendi')).toBeNull();
    expect(screen.queryByText('Ripubblica')).toBeNull();
  });

  it('hands the entry to «Modifica»', async () => {
    const onModifica = jest.fn();
    await renderVoce({ onModifica });

    await fireEvent.press(pulsante());

    expect(onModifica).toHaveBeenCalledWith(VOCE);
  });
});

describe('EntryCard — one word for the free text of a service', () => {
  it('calls it a description, in the row and in its fallback', async () => {
    await renderVoce();
    const conTesto = JSON.stringify(screen.toJSON());
    expect(conTesto).not.toContain('Mansione');

    await renderVoce({ voce: { ...VOCE, mansione: '   ' } });
    const senzaTesto = JSON.stringify(screen.toJSON());
    expect(senzaTesto).toContain('Descrizione non indicata');
    expect(senzaTesto).not.toContain('Mansione');
  });
});

describe('EntryCard — what the two reasons switch off', () => {
  it('leaves «Modifica» enabled when no reason is given', async () => {
    await renderVoce();
    expect(pulsante()).not.toBeDisabled();
  });

  it('switches «Modifica» off when the categories are missing', async () => {
    await renderVoce({ modificaDisabilitata: true });
    expect(pulsante()).toBeDisabled();
  });

  it('switches «Modifica» off while a write is in flight', async () => {
    await renderVoce({ azioniDisabilitate: true });
    expect(pulsante()).toBeDisabled();
  });

  it('switches «Modifica» off on a row the server has not given an id to', async () => {
    await renderVoce({ voce: { ...VOCE, id: null } });
    expect(pulsante()).toBeDisabled();
  });
});
