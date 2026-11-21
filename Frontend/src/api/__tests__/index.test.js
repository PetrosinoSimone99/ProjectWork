import { register } from '../index';

/**
 * The registration call is the ring the screen cannot see: `apiFetch` builds the
 * `ApiError`, `withGenericMessage` swaps its message for the endpoint's own, and
 * the two would silently drop the rejected fields if only one of them forgot to
 * carry them. A green `field-errors.test.js` plus a green `client.test.js` says
 * nothing about this join — this case does.
 */
describe('register', () => {
  const fetchOriginale = global.fetch;

  afterEach(() => {
    global.fetch = fetchOriginale;
  });

  it('porta i campi rifiutati fino a chi chiama, non solo il messaggio', async () => {
    const corpo = {
      error: 'Required user and service fields are missing or invalid.',
      fields: ['email'],
    };
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 400,
      text: async () => JSON.stringify(corpo),
    }));

    await expect(
      register({
        name: 'Mario',
        surname: 'Rossi',
        username: 'mario.rossi',
        email: 'non-una-email',
        password: 'password-lunga',
        location: 'Milano - MI',
      }),
    ).rejects.toMatchObject({ status: 400, details: { fields: ['email'] } });
  });
});
