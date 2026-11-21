import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { AppIcon } from '../AppIcon';
import { ServiceCard } from '../ServiceCard';
import { radius } from '@/theme/tokens';

/**
 * La pillola della categoria deve stare **dentro** la sua mezza riga.
 *
 * Il difetto del 19/11 (`frontend-2026-11-19-catalog-chip-overlap`): a 375 e a
 * 412 px la pillola teneva la larghezza del proprio testo — 175 px su
 * «Assistenza computer» — e si dipingeva sopra l'icona della modalità, 36 px e
 * 17 px di sovrapposizione sul catalogo seminato. Il contenimento è
 * un'istruzione di stile, quindi si difende qui: la misura sul browser prova che
 * il numero è zero, questo file prova che la regola che lo rende zero c'è ancora.
 *
 * Le icone si caricano da un font e aggiornano stato fuori da `act`: non sono in
 * prova qui, e la loro vita aggiungerebbe solo un avviso.
 */
jest.mock('../AppIcon', () => ({
  AppIcon: () => null,
}));

const SERVIZIO = {
  id: 7,
  descrizione: 'Ti aiuto a configurare il computer e a recuperare i file.',
  daRemoto: false,
  localita: 'Bologna',
  categorie: [{ id: 4, nome: 'Assistenza computer' }],
  offerente: {
    nome: 'Marco',
    cognome: 'Ricci',
    username: 'marco.ricci',
    localita: 'Milano',
  },
  pubblicatoIl: '2026-11-02T09:00:00+00:00',
};

/** Da RTL 14 `render` è asincrono: il montaggio si aspetta, non si avvolge in `act`. */
async function renderCard(servizio = SERVIZIO) {
  await render(<ServiceCard servizio={servizio} onPress={jest.fn()} />);
}

/** Lo stile risolto di un nodo: le stesse regole che finiscono sul DOM. */
function stile(nodo) {
  return StyleSheet.flatten(nodo.props.style ?? {}) ?? {};
}

/** La pillola: l'unica scatola arrotondata a pillola della card. */
function pillola() {
  const nodo = screen.container
    .queryAll((candidato) => candidato.type === 'View')
    .find((vista) => stile(vista).borderRadius === radius.pill);
  expect(nodo).toBeDefined();
  return nodo;
}

/** Il testo dentro la pillola, cioè l'etichetta della categoria. */
function etichettaDellaPillola() {
  const nodo = pillola().queryAll((candidato) => candidato.type === 'Text').at(0);
  expect(nodo).toBeDefined();
  return nodo;
}

/**
 * Le righe della griglia dei dati: le viste che portano solo la direzione e
 * l'allineamento, senza padding né sfondo. Sono tre per costruzione (categoria
 * e modalità, luogo e data, autore) e la stessa forma in ogni card.
 */
function righeDati() {
  return screen.container.queryAll((candidato) => {
    if (candidato.type !== 'View') {
      return false;
    }
    const regole = stile(candidato);
    return (
      Object.keys(regole).length === 2 &&
      regole.flexDirection === 'row' &&
      regole.alignItems === 'center'
    );
  });
}

/** Ogni stringa disegnata, in ordine di render. */
function testi() {
  return screen.container
    .queryAll((candidato) => candidato.type === 'Text')
    .map((nodo) => nodo.props.children)
    .filter((figlio) => typeof figlio === 'string');
}

/**
 * I nomi delle icone che la card ha disegnato, in ordine di render.
 *
 * RTL 14 disegna solo elementi host, e `AppIcon` qui è sostituito da un
 * componente che non rende nulla: nessuna query lo raggiunge. `unstable_fiber`
 * è l'API interna (instabile, e per questo confinata qui) con cui si scende dai
 * nodi disegnati ai componenti compositi che li hanno prodotti.
 */
function nomiDelleIcone() {
  const nomi = [];
  const raccogli = (fibra) => {
    for (let corrente = fibra; corrente !== null; corrente = corrente.sibling) {
      if (corrente.type === AppIcon) {
        nomi.push(corrente.memoizedProps?.name);
      }
      if (corrente.child !== null) {
        raccogli(corrente.child);
      }
    }
  };

  let cima = screen.container.queryAll(() => true)[0].unstable_fiber;
  while (cima?.return) {
    cima = cima.return;
  }
  raccogli(cima?.child ?? cima);
  return nomi;
}

describe('ServiceCard — la pillola dentro la mezza riga', () => {
  it('si accorcia nella colonna invece di allargarla', async () => {
    await renderCard();
    const regole = stile(pillola());

    // `flexShrink: 0` è il default di RN: senza questo la pillola torna larga
    // quanto il proprio testo e ricomincia a dipingersi sopra l'icona.
    expect(regole.flexShrink).toBe(1);
    expect(regole.minWidth).toBe(0);
  });

  it('lascia al testo l’ellissi, senza perdere l’etichetta intera', async () => {
    await renderCard();
    const etichetta = etichettaDellaPillola();
    const regole = stile(etichetta);

    expect(etichetta.props.children).toBe('Assistenza computer');
    expect(etichetta.props.numberOfLines).toBe(1);
    // Un testo `nowrap` non scende sotto la propria larghezza minima: `0` è
    // quello che permette l'ellissi invece del taglio a metà parola.
    expect(regole.minWidth).toBe(0);
    expect(regole.flexShrink).toBe(1);
  });

  it('tiene tutte le categorie nel nome accessibile anche quando la pillola ne mostra una riga', async () => {
    await renderCard({
      ...SERVIZIO,
      categorie: [
        { id: 4, nome: 'Assistenza computer' },
        { id: 9, nome: 'Cura delle piante' },
      ],
    });

    expect(etichettaDellaPillola().props.children).toBe(
      'Assistenza computer · Cura delle piante',
    );
    const etichettaCard = screen.container
      .queryAll((candidato) => typeof candidato.props.accessibilityLabel === 'string')
      .at(0);
    expect(etichettaCard.props.accessibilityLabel).toContain(
      'Assistenza computer · Cura delle piante',
    );
  });

  it('tiene tre righe di dati, e la modalità resta una parola accanto all’icona', async () => {
    await renderCard();

    expect(righeDati()).toHaveLength(3);
    expect(testi()).toContain('in presenza');
  });
});

describe('ServiceCard — l’icona che la pillola copriva', () => {
  it('distingue la modalità con l’icona e con la parola', async () => {
    await renderCard();
    const inPresenza = nomiDelleIcone();
    await renderCard({ ...SERVIZIO, daRemoto: true });
    const daRemoto = nomiDelleIcone();

    expect(inPresenza).toContain('people-outline');
    expect(daRemoto).toContain('videocam-outline');
  });
});
