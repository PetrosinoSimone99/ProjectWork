import {
  ROLES,
  describeEmptyUserList,
  describeRoleFilterScope,
  filterUsers,
} from '../staff-users';

/**
 * La copy onesta del filtro ruolo (F5) e il filtro locale che resta com'era.
 *
 * `GET /staff/users` non ha un parametro `role` (`StaffController::users`
 * accetta `page`, `limit`, `q`, `accountStatus`), quindi la pill del ruolo
 * setaccia le righe già arrivate. Le frasi qui sotto sono il contratto di
 * quella verità: se una riscrittura le facesse promettere «tutto l'elenco», o se
 * l'elenco vuoto tornasse a incolpare la ricerca quando è il ruolo a svuotarlo,
 * questi test cadono.
 */

describe('describeRoleFilterScope', () => {
  it('describes the server-wide role filter', () => {
    const frase = describeRoleFilterScope(40);
    expect(frase).not.toContain('40');
    expect(frase).toContain('tutto');
    expect(frase).toContain('prima della paginazione');
  });

  it('does not depend on how many pages are loaded', () => {
    const frase = describeRoleFilterScope(null);
    expect(frase).toContain('tutto');
    expect(frase).toContain('prima della paginazione');
    expect(frase).not.toMatch(/\d/);
  });
});

describe('describeEmptyUserList', () => {
  const nessunFiltro = describeEmptyUserList({ filtri: false, ruolo: false });
  const soloRuolo = describeEmptyUserList({ filtri: false, ruolo: true });
  const ruoloERicerca = describeEmptyUserList({ filtri: true, ruolo: true });
  const soloRicerca = describeEmptyUserList({ filtri: true, ruolo: false });

  it('says the list is empty when nothing is filtering', () => {
    expect(nessunFiltro).toBe("Non c'è nessun utente nell'elenco.");
  });

  it('gives a different sentence for each of the three causes', () => {
    expect(new Set([nessunFiltro, soloRuolo, ruoloERicerca]).size).toBe(3);
  });

  it('names the selected role when the filtered result is empty', () => {
    expect(soloRuolo).toContain('questo ruolo');
    expect(soloRuolo).not.toBe(ruoloERicerca);
  });

  it('keeps the search sentence honest when the role is not the cause', () => {
    expect(soloRicerca).toBe(
      'Nessun utente corrisponde alla ricerca o allo stato scelto: prova un altro nome o azzera i filtri.',
    );
    expect(soloRicerca).not.toContain('caricati');
  });

  it('reads a missing argument as "no filter at all"', () => {
    expect(describeEmptyUserList()).toBe(nessunFiltro);
  });
});

describe('filterUsers', () => {
  const utenti = [
    { id: 1, nome: 'Anna', cognome: 'Rossi', username: 'anna', ruolo: 'STAFF', stato: 'ACTIVE' },
    { id: 2, nome: 'Bruno', cognome: 'Verdi', username: 'bruno', ruolo: 'USER', stato: 'INACTIVE' },
    { id: 3, nome: null, cognome: undefined, username: 'CARLA', ruolo: 'USER', stato: 'ACTIVE' },
  ];

  it('filters by role, status and text at once', () => {
    expect(filterUsers(utenti, '', ROLES.USER, null).map((u) => u.id)).toEqual([2, 3]);
    expect(filterUsers(utenti, '', null, 'ACTIVE').map((u) => u.id)).toEqual([1, 3]);
    expect(filterUsers(utenti, '  carla ', null, null).map((u) => u.id)).toEqual([3]);
    expect(filterUsers(utenti, 'verdi', ROLES.USER, 'INACTIVE').map((u) => u.id)).toEqual([2]);
  });

  it('skips rows whose text fields are missing instead of throwing', () => {
    expect(filterUsers(utenti, 'rossi', null, null).map((u) => u.id)).toEqual([1]);
    expect(filterUsers([{ id: 9 }], 'anna')).toEqual([]);
  });

  it('returns an empty list when the rows are not loaded yet', () => {
    expect(filterUsers(null, 'anna')).toEqual([]);
  });
});
