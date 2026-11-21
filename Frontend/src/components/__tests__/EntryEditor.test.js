import { render, screen } from '@testing-library/react-native';

import { EntryEditor } from '../EntryEditor';

const CATEGORIE = [{ id: 1, nome: 'Riparazioni' }];

const VOCE = {
  tipo: 'OFFERTA',
  idCategoria: null,
  mansione: '',
  daRemoto: false,
};

async function renderVoce(extra = {}) {
  await render(
    <EntryEditor
      voce={VOCE}
      categorie={CATEGORIE}
      statoCategorie="pronto"
      onCambia={() => {}}
      {...extra}
    />,
  );
}

/** The three controls of one entry, as each child component handed them to the host tree. */
function controlli() {
  const categoria = screen.getByRole('button', { name: 'Categoria: Scegli una categoria' });
  const mansione = screen.getByLabelText(/^Descrizione — /);
  const remoto = screen.getByRole('checkbox', { name: 'Il servizio si può svolgere da remoto' });
  expect(categoria).toBeDefined();
  expect(mansione).toBeDefined();
  expect(remoto).toBeDefined();
  return { categoria, mansione, remoto };
}

describe('EntryEditor — one word for the description', () => {
  it('labels the free text «Descrizione», never the job title', async () => {
    await renderVoce();

    expect(screen.getByText('Descrizione')).toBeTruthy();
    expect(screen.queryByText(/Mansione/i)).toBeNull();
  });

  // Two fields on one screen, one visible label: the accessible name is what
  // keeps them apart, so it must stay, worded with the same word as the label.
  it('keeps the offer and the request apart in the accessible name', async () => {
    await renderVoce();
    expect(controlli().mansione.props.accessibilityLabel).toBe('Descrizione — cosa offri');

    await renderVoce({ voce: { ...VOCE, tipo: 'RICERCA' } });
    expect(controlli().mansione.props.accessibilityLabel).toBe('Descrizione — cosa cerchi');
  });
});

describe('EntryEditor — the lock arriving from the screen', () => {
  it('locks the category field, the mansione and the remote checkbox', async () => {
    await renderVoce({ bloccato: true });
    const { categoria, mansione, remoto } = controlli();

    expect(categoria).toBeDisabled();
    expect(mansione.props.editable).toBe(false);
    expect(remoto).toBeDisabled();
  });

  it('leaves every control usable when no lock is passed (registration)', async () => {
    await renderVoce();
    const { categoria, mansione, remoto } = controlli();

    expect(categoria).toBeEnabled();
    expect(mansione.props.editable).toBe(true);
    expect(remoto).toBeEnabled();
  });
});
