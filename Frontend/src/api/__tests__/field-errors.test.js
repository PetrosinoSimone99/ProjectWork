import { erroriDiCampoDaServer } from '../field-errors';

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
