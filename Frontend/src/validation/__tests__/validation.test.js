import {
  MIN_PASSWORD_LENGTH,
  REPORT_REASON_MAX,
  countCharacters,
  emailError,
  isValid,
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
  it('accepts https URLs ending in a supported extension', () => {
    expect(photoUrlError('https://example.it/foto.jpg')).toBeNull();
    expect(photoUrlError('https://example.it/foto.png')).toBeNull();
    expect(photoUrlError('https://example.it/foto.JPEG')).toBeNull();
  });

  it('accepts http URLs, as the brief asks', () => {
    expect(photoUrlError('http://example.it/foto.jpeg')).toBeNull();
  });

  it('ignores a query string after the extension', () => {
    expect(photoUrlError('https://example.it/foto.png?w=200')).toBeNull();
  });

  it('rejects a URL with another scheme', () => {
    expect(photoUrlError('ftp://example.it/foto.png')).toBe(
      "L'indirizzo dell'immagine deve iniziare con http:// o https://.",
    );
  });

  it('rejects a URL without a supported extension', () => {
    expect(photoUrlError('https://example.it/foto.gif')).toBe(
      "L'indirizzo dell'immagine deve terminare con .png, .jpg o .jpeg.",
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

describe('isValid', () => {
  it('is true only for an object without messages', () => {
    expect(isValid({})).toBe(true);
    expect(isValid({ email: "Inserisci un'email valida." })).toBe(false);
  });
});
