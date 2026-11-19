import { act, create } from 'react-test-renderer';

import { AppCheckbox } from '../AppCheckbox';
import { AppInput } from '../AppInput';
import { CategorySelector } from '../CategorySelector';
import { EntryEditor } from '../EntryEditor';

const CATEGORIE = [{ id: 1, nome: 'Riparazioni' }];

const VOCE = {
  tipo: 'OFFERTA',
  idCategoria: null,
  mansione: '',
  daRemoto: false,
};

function render(extra = {}) {
  let renderer;
  act(() => {
    renderer = create(
      <EntryEditor
        voce={VOCE}
        categorie={CATEGORIE}
        statoCategorie="pronto"
        onCambia={() => {}}
        {...extra}
      />,
    );
  });
  return renderer;
}

/** The three controls of one entry, as each child component received them. */
function controlli(renderer) {
  const [categoria] = renderer.root.findAllByType(CategorySelector);
  const [mansione] = renderer.root.findAllByType(AppInput);
  const [remoto] = renderer.root.findAllByType(AppCheckbox);
  expect(categoria).toBeDefined();
  expect(mansione).toBeDefined();
  expect(remoto).toBeDefined();
  return { categoria, mansione, remoto };
}

describe('EntryEditor — one word for the description', () => {
  it('labels the free text «Descrizione», never the job title', () => {
    const { mansione } = controlli(render());

    expect(mansione.props.label).toBe('Descrizione');
    expect(mansione.props.label).not.toContain('Mansione');
  });

  // Two fields on one screen, one visible label: the accessible name is what
  // keeps them apart, so it must stay, worded with the same word as the label.
  it('keeps the offer and the request apart in the accessible name', () => {
    expect(controlli(render()).mansione.props.accessibilityLabel).toBe('Descrizione — cosa offri');
    expect(
      controlli(render({ voce: { ...VOCE, tipo: 'RICERCA' } })).mansione.props.accessibilityLabel,
    ).toBe('Descrizione — cosa cerchi');
  });
});

describe('EntryEditor — the lock arriving from the screen', () => {
  it('locks the category field, the mansione and the remote checkbox', () => {
    const { categoria, mansione, remoto } = controlli(render({ bloccato: true }));

    expect(categoria.props.disabled).toBe(true);
    expect(mansione.props.editable).toBe(false);
    expect(remoto.props.disabled).toBe(true);
  });

  it('leaves every control usable when no lock is passed (registration)', () => {
    const { categoria, mansione, remoto } = controlli(render());

    expect(categoria.props.disabled).toBeFalsy();
    expect(mansione.props.editable).toBe(true);
    expect(remoto.props.disabled).toBeFalsy();
  });
});
