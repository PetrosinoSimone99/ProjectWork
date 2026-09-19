/**
 * Finti: registrazione, accesso e token della demo.
 *
 * Stessa busta piatta del backend vero (`{messaggio, token, utente}`) perché la
 * schermata e `auth-context` non devono sapere che i dati sono finti.
 *
 * `creaTokenFinto` non è un dettaglio: `auth/token-store.js` legge
 * `token.split('.')[1]`, lo decodifica in base64url e pretende un `exp` numerico.
 * Un token qualsiasi farebbe sembrare valida la sessione fino al primo reload e
 * poi disconnetterebbe l'utente. Il token finto ha quindi la stessa forma di
 * quello vero: `<firma>.<payload base64url>`.
 *
 * Gli utenti registrati si conservano sul web in `localStorage` (chiave
 * `barattolo.finti.utenti`): senza, dopo un reload la sessione salvata
 * punterebbe a un utente che il finto `login` non conosce più. Su native il
 * deposito resta in memoria. I finti **non validano** niente: accettano e basta.
 */

import { ApiError } from '../client';
import { ottieniVoci, salvaVoci } from './servizi';

const CHIAVE_PERSISTENZA = 'barattolo.finti.utenti';

/** Un'ora, come il token vero (`login.php`). */
const DURATA_TOKEN_SECONDI = 3600;

/**
 * Il ruolo dell'utente della demo: **finto e dichiarato**.
 *
 * Il backend vero non manda `ruolo` (`login.php`/`register.php`, P24), quindi il
 * frontend non può distinguere un utente da uno `STAFF`: senza questo valore
 * l'area staff (piano 11) non sarebbe raggiungibile nella demo. La UI lo usa
 * **solo per mostrare o nascondere** la voce «Area staff»; la protezione è del
 * backend, e ogni azione della schermata gestisce comunque il `403`.
 * TODO(backend): quando `login.php`/`register.php` manderanno il `ruolo` vero,
 * questa costante sparisce e il campo arriva dalla risposta.
 */
export const RUOLO_FINTO = 'STAFF';

/**
 * La firma non è verificata da nessuno: serve solo a dare al token la forma
 * giusta. **Non può contenere un punto**: `auth/token-store.js` legge il
 * payload con `token.split('.')[1]`, quindi il token deve avere esattamente due
 * segmenti e il secondo deve essere il payload.
 */
const FIRMA_TOKEN_FINTA = 'firmafinta';

/** Utenti registrati nella demo: `[{id, username, nome, cognome, localita}]`. */
let utenti = null;

function localStorageDisponibile() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function leggiPersistito() {
  if (!localStorageDisponibile()) {
    return null;
  }
  try {
    const grezzo = window.localStorage.getItem(CHIAVE_PERSISTENZA);
    const elenco = grezzo ? JSON.parse(grezzo) : null;
    return Array.isArray(elenco) ? elenco : null;
  } catch (errore) {
    console.warn('Utenti finti illeggibili: la demo riparte da vuoto.', errore);
    return null;
  }
}

function scriviPersistito() {
  if (!localStorageDisponibile()) {
    return;
  }
  try {
    window.localStorage.setItem(CHIAVE_PERSISTENZA, JSON.stringify(utenti));
  } catch (errore) {
    console.warn('Impossibile salvare gli utenti finti.', errore);
  }
}

function assicuraCaricato() {
  if (utenti === null) {
    utenti = leggiPersistito() ?? [];
  }
}

function prossimoIdUtente() {
  return utenti.reduce((massimo, utente) => Math.max(massimo, Number(utente.id) || 0), 0) + 1;
}

/**
 * Costruisce un token della forma `<firma>.<payload base64url di {id, exp}>`.
 * `exp` è in secondi UNIX, come nel token vero.
 */
export function creaTokenFinto(utenteId) {
  const payload = {
    id: Number(utenteId),
    exp: Math.floor(Date.now() / 1000) + DURATA_TOKEN_SECONDI,
  };
  const codificato = globalThis
    .btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${FIRMA_TOKEN_FINTA}.${codificato}`;
}

/**
 * POST register.php.
 * TODO(backend): `register.php` con `localita`, `offerte` e `ricerche`
 * (al plurale) e `descrizione_servizio` reso facoltativo — oggi il backend vero
 * rifiuta questo corpo con 400.
 */
export async function register(input) {
  assicuraCaricato();

  const utente = {
    id: prossimoIdUtente(),
    username: input.username,
    nome: input.nome,
    cognome: input.cognome,
    localita: input.localita ?? null,
  };
  utenti = [...utenti, utente];
  scriviPersistito();

  if (Array.isArray(input.offerte) && input.offerte.length > 0) {
    salvaVoci(utente.id, 'OFFERTA', input.offerte);
  }
  if (Array.isArray(input.ricerche) && input.ricerche.length > 0) {
    salvaVoci(utente.id, 'RICERCA', input.ricerche);
  }

  return {
    messaggio: 'Registrazione completata.',
    token: creaTokenFinto(utente.id),
    utente: { ...utente, ...ottieniVoci(utente.id), ruolo: RUOLO_FINTO },
  };
}

/**
 * POST login.php — uno degli utenti registrati in questa demo.
 * La password non viene verificata: i finti accettano, non validano. Serve solo
 * a far vedere l'errore quando lo username non esiste in questa demo.
 * TODO(backend): `login.php` vero (il token finto non serve più).
 */
export async function login(username) {
  assicuraCaricato();

  const trovato = utenti.find((utente) => utente.username === username);
  if (!trovato) {
    throw new ApiError(401, 'Username o password non validi.');
  }

  return {
    messaggio: 'Login effettuato con successo.',
    token: creaTokenFinto(trovato.id),
    utente: { ...trovato, ...ottieniVoci(trovato.id), ruolo: RUOLO_FINTO },
  };
}
