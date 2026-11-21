import { erroriDiCampoDaServer, esitoRifiutoRegistrazione } from '../field-errors';

/**
 * I campi rifiutati dal servizio diventano gli errori del modulo di
 * registrazione. Il contratto è in `docs/api.md`: il backend manda i nomi
 * (`["email", "password"]`), l'italiano resta qui. Un nome sconosciuto non deve
 * mai produrre una chiave inventata, e non deve sparire: resta la frase in fondo
 * al modulo.
 */
describe('erroriDiCampoDaServer', () => {
  it('mette ogni nome anagrafico sotto il campo che il modulo ha davvero', () => {
    const errori = erroriDiCampoDaServer([
      'name',
      'surname',
      'username',
      'email',
      'password',
      'location',
    ]);

    expect(Object.keys(errori).sort()).toEqual(
      ['cognome', 'comune', 'email', 'nome', 'password', 'username'].sort(),
    );
    expect(errori.nome).toMatch(/nome/i);
    expect(errori.comune).toMatch(/provincia e comune/i);
  });

  it('porta le due sezioni sulla descrizione della prima voce, dove lo sguardo arriva', () => {
    const errori = erroriDiCampoDaServer(['offers', 'requests']);

    expect(errori['offerte.0.mansione']).toMatch(/offerta/i);
    expect(errori['ricerche.0.mansione']).toMatch(/ricerca/i);
  });

  it('non inventa niente per un nome che non conosce', () => {
    expect(erroriDiCampoDaServer(['birthdate'])).toEqual({});
    expect(erroriDiCampoDaServer(['email', 'birthdate'])).toEqual({
      email: expect.stringMatching(/email/i),
    });
  });

  it('regge un corpo senza elenco, o con spazzatura dentro', () => {
    expect(erroriDiCampoDaServer(undefined)).toEqual({});
    expect(erroriDiCampoDaServer(null)).toEqual({});
    expect(erroriDiCampoDaServer('email')).toEqual({});
    expect(erroriDiCampoDaServer([42, null, 'email'])).toEqual({
      email: expect.stringMatching(/email/i),
    });
  });

  it('dice quanti caratteri servono per la password, non solo che non va', () => {
    expect(erroriDiCampoDaServer(['password']).password).toMatch(/8 caratteri/);
  });
});

/**
 * Il rifiuto diviso in due: ciò che si sistema sotto un campo e ciò che resta
 * una frase in fondo. Un errore che il modulo sa già dove mettere non deve
 * comparire due volte.
 */
describe('esitoRifiutoRegistrazione', () => {
  const MESSAGGIO = 'La richiesta non è valida: controlla i dati e riprova.';

  it('non ripete in fondo il messaggio quando tutti i campi hanno un posto', () => {
    const esito = esitoRifiutoRegistrazione({ fields: ['email', 'password'] }, MESSAGGIO);

    expect(Object.keys(esito.errori).sort()).toEqual(['email', 'password']);
    expect(esito.messaggio).toBeNull();
  });

  it('tiene la frase in fondo per il nome che non sa dove mettere', () => {
    const esito = esitoRifiutoRegistrazione({ fields: ['email', 'birthdate'] }, MESSAGGIO);

    expect(esito.errori.email).toMatch(/email/i);
    expect(Object.keys(esito.errori)).toHaveLength(1);
    expect(esito.messaggio).toBe(MESSAGGIO);
  });

  it('tiene la frase quando l elenco e vuoto: non c e niente da mettere sotto un campo', () => {
    expect(esitoRifiutoRegistrazione({ fields: [] }, MESSAGGIO)).toEqual({
      errori: {},
      messaggio: MESSAGGIO,
    });
  });

  it('lascia tutto com era quando il server non nomina nessun campo', () => {
    expect(esitoRifiutoRegistrazione(null, MESSAGGIO)).toEqual({ errori: {}, messaggio: MESSAGGIO });
    expect(esitoRifiutoRegistrazione({}, MESSAGGIO)).toEqual({ errori: {}, messaggio: MESSAGGIO });
  });
});
