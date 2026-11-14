import { TAB_ROUTES } from '../tab-routes';
import { titoloDocumento } from '../screen-titles';

/**
 * The browser tab's name per route (audit UX F16).
 *
 * The point of these tests is not the formatting: it is that the name comes from
 * the same word the screen shows. The tab titles are read out of `TAB_ROUTES`
 * here, so a renamed tab cannot leave the browser saying the old name.
 */
describe('titoloDocumento', () => {
  it.each(TAB_ROUTES)('names the $path tab with its own title', ({ path, title }) => {
    expect(titoloDocumento(path)).toBe(`${title} · Baratto-lo`);
  });

  it.each([
    ['/login', 'Accedi'],
    ['/register', 'Crea il tuo profilo'],
    ['/edit-profile', 'Modifica profilo'],
    ['/report', 'Segnala alla staff'],
    ['/staff', 'Area staff'],
    ['/staff-users', 'Utenti'],
  ])('names %s after the word in its heading', (path, title) => {
    expect(titoloDocumento(path)).toBe(`${title} · Baratto-lo`);
  });

  it('treats a trailing slash as the same route', () => {
    expect(titoloDocumento('/staff/')).toBe(titoloDocumento('/staff'));
    expect(titoloDocumento('/login//')).toBe(titoloDocumento('/login'));
  });

  it('names the home route from the root, with or without the slash', () => {
    expect(titoloDocumento('/')).toBe('Servizi · Baratto-lo');
    expect(titoloDocumento('')).toBe('Servizi · Baratto-lo');
  });

  it('falls back to the product name on a path no route owns', () => {
    expect(titoloDocumento('/chi-sa-cosa')).toBe('Baratto-lo');
    expect(titoloDocumento(undefined)).toBe('Servizi · Baratto-lo');
  });
});
