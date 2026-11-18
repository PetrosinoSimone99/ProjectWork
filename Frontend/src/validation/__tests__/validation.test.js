import {
  MIN_PASSWORD_LENGTH,
  REPORT_REASON_MAX,
  countCharacters,
  emailError,
  maxLengthError,
  passwordError,
  photoUrlError,
  reasonError,
  requiredError,
} from '..';

describe('requiredError', () => {
  it('returns the message for an empty or blank value', () => {
    expect(requiredError('', 'Campo obbligatorio.')).toBe('Campo obbligatorio.');
    expect(requiredError('   ', 'Campo obbligatorio.')).toBe('Campo obbligatorio.');
  });

  it('returns null when the value has content', () => {
    expect(requiredError(' Mario ', 'Campo obbligatorio.')).toBeNull();
  });
});

describe('emailError', () => {
  it('accepts a well-formed address', () => {
    expect(emailError('mario.rossi@example.it')).toBeNull();
  });

  it('reports a missing address instead of a malformed one', () => {
    expect(emailError('')).toBe("L'email è obbligatoria.");
  });

  it('rejects an address without a domain suffix', () => {
    expect(emailError('mario@example')).toBe("Inserisci un'email valida.");
  });

  it('rejects an address with spaces', () => {
    expect(emailError('mario rossi@example.it')).toBe("Inserisci un'email valida.");
  });
});

describe('passwordError', () => {
  it(`accepts a password of exactly ${MIN_PASSWORD_LENGTH} characters`, () => {
    expect(passwordError('a'.repeat(MIN_PASSWORD_LENGTH))).toBeNull();
  });

  it('rejects a password one character too short', () => {
    expect(passwordError('a'.repeat(MIN_PASSWORD_LENGTH - 1))).toBe(
      `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`,
    );
  });

  it('reports a missing password', () => {
    expect(passwordError('')).toBe('La password è obbligatoria.');
  });
});

describe('photoUrlError', () => {
  const httpsBase = 'https://example.it/';

  it('accepts an https URL without a file extension', () => {
    expect(photoUrlError('https://cdn.example/a')).toBeNull();
    expect(photoUrlError(`${httpsBase}foto.jpg`)).toBeNull();
    expect(photoUrlError(`${httpsBase}foto.png?w=200`)).toBeNull();
  });

  it('refuses an http URL, as the backend does', () => {
    expect(photoUrlError('http://example.it/foto.jpg')).toBe(
      "L'indirizzo dell'immagine deve iniziare con https://.",
    );
  });

  it('refuses another scheme', () => {
    expect(photoUrlError('ftp://example.it/foto.png')).toBe(
      "L'indirizzo dell'immagine deve iniziare con https://.",
    );
  });

  it('refuses an address without a host', () => {
    expect(photoUrlError('https://')).toBe(
      "L'indirizzo dell'immagine non è valido: controlla di averlo copiato per intero.",
    );
  });

  it('refuses an address with a space in it', () => {
    expect(photoUrlError('https://example.it/foto 1.jpg')).toBe(
      "L'indirizzo dell'immagine non è valido: controlla di averlo copiato per intero.",
    );
  });

  it('accepts a URL of exactly 2048 characters', () => {
    expect(photoUrlError(`${httpsBase}${'a'.repeat(2048 - httpsBase.length)}`)).toBeNull();
  });

  it('refuses a URL of 2049 characters', () => {
    expect(photoUrlError(`${httpsBase}${'a'.repeat(2049 - httpsBase.length)}`)).toBe(
      "L'indirizzo dell'immagine può avere al massimo 2048 caratteri.",
    );
  });

  it('treats an empty value as "no photo"', () => {
    expect(photoUrlError('')).toBeNull();
    expect(photoUrlError('   ')).toBeNull();
  });
});

describe('maxLengthError and countCharacters', () => {
  it('counts code points, not UTF-16 units', () => {
    expect(countCharacters('caffè')).toBe(5);
    expect(countCharacters('')).toBe(0);
  });

  it('returns the message only above the limit', () => {
    expect(maxLengthError('abc', 3, 'Troppo lungo.')).toBeNull();
    expect(maxLengthError('abcd', 3, 'Troppo lungo.')).toBe('Troppo lungo.');
  });
});

describe('reasonError', () => {
  it('requires the report text', () => {
    expect(reasonError('  ')).toBe(
      'Racconta il fatto: senza una descrizione la segnalazione non parte.',
    );
  });

  it(`accepts a text of exactly ${REPORT_REASON_MAX} characters`, () => {
    expect(reasonError('a'.repeat(REPORT_REASON_MAX))).toBeNull();
  });

  it('rejects a text above the limit', () => {
    expect(reasonError('a'.repeat(REPORT_REASON_MAX + 1))).toBe(
      `La descrizione può avere al massimo ${REPORT_REASON_MAX} caratteri.`,
    );
  });
});

