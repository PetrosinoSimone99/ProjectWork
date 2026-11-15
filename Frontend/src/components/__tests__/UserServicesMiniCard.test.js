import { altriServizi } from '../UserServicesMiniCard';

/**
 * The card's one pure decision: which rows survive once the detail panel's own
 * service is dropped. Rows are `normalizeCatalogOffer` rows — `{tipo, id}` —
 * and the open service is the same pair the panel holds in `servizio`.
 */
const APERTO = { tipo: 'OFFER', id: 7 };
const OFFERTA_APERTA = { tipo: 'OFFER', id: 7, descrizione: 'Aiuto nei compiti' };
const ALTRA_OFFERTA = { tipo: 'OFFER', id: 9, descrizione: 'Riparazione della bici' };
const RICHIESTA_STESSO_ID = {
  tipo: 'REQUEST',
  id: 7,
  descrizione: 'Cerco qualcuno per il giardinaggio',
};

describe('altriServizi', () => {
  it('drops the open offer and keeps the other rows', () => {
    expect(altriServizi([OFFERTA_APERTA, ALTRA_OFFERTA], APERTO)).toEqual([ALTRA_OFFERTA]);
  });

  it('keeps a request that shares the numeric id of the open offer', () => {
    expect(altriServizi([OFFERTA_APERTA, RICHIESTA_STESSO_ID], APERTO)).toEqual([
      RICHIESTA_STESSO_ID,
    ]);
  });

  it('answers [] for null or absent lists', () => {
    expect(altriServizi(null, APERTO)).toEqual([]);
    expect(altriServizi(undefined, APERTO)).toEqual([]);
    expect(altriServizi(undefined, null)).toEqual([]);
  });

  it('never mutates the input and hands back a new array', () => {
    const lista = [OFFERTA_APERTA, ALTRA_OFFERTA];
    const atteso = lista.map((servizio) => ({ ...servizio }));

    const risultato = altriServizi(lista, APERTO);

    expect(lista).toEqual(atteso);
    expect(risultato).not.toBe(lista);
  });
});
