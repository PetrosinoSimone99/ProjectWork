/**
 * Finti: la **memoria delle scelte** di «Loop», che legge la coda finta.
 *
 * I finti dello swipe e dei candidati (`ottieniCandidati`, `registraScelta`, le
 * ricerche finte, i like ricevuti) sono **stati rimossi** con il passaggio di
 * «Loop» al contratto reale (`GET|POST /api/swipes` +
 * `POST /api/proposals/{id}/decision`): non esiste più il «like ricambiato»
 * dedotto dal finto, il match nasce solo dal `matched` della decisione del
 * backend.
 *
 * Resta questo deposito perché `finti/coda.js` lo **legge** per contare quanti
 * «Mi interessa» ha registrato l'utente (la sua catena parte dopo N scelte) e
 * il finto della coda è fuori perimetro (nessun endpoint). Da quando lo swipe
 * finto non c'è più **nessuno lo scrive**, quindi il deposito resta vuoto e la
 * catena finta non parte più dagli swipe: degradazione **dichiarata** della
 * demo, non silenziosa. Le scelte vecchie restano solo in `localStorage`, da
 * cui `azzeraScelteFinti` per ripartire da zero.
 *
 * Sul **web** la memoria si appoggia a `localStorage` (chiave
 * `barattolo.finti.scelte`), perché la sessione finta sta lì; su **native**,
 * dove `window` non esiste, degrada a sola memoria — stessa degradazione
 * dichiarata di prima.
 */

const CHIAVE_PERSISTENZA = 'barattolo.finti.scelte';

/** `utenteId -> { [chiaveScelta]: 'INTERESSE' | 'PASSA' }`. */
const depositoScelte = new Map();

let caricato = false;

function localStorageDisponibile() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function leggiPersistito() {
  if (!localStorageDisponibile()) {
    return null;
  }
  try {
    const grezzo = window.localStorage.getItem(CHIAVE_PERSISTENZA);
    return grezzo ? JSON.parse(grezzo) : null;
  } catch (errore) {
    console.warn('Scelte finte illeggibili: la demo riparte da zero.', errore);
    return null;
  }
}

function scriviPersistito() {
  if (!localStorageDisponibile()) {
    return;
  }
  const serializzabile = {};
  depositoScelte.forEach((scelte, utenteId) => {
    serializzabile[utenteId] = scelte;
  });
  try {
    window.localStorage.setItem(CHIAVE_PERSISTENZA, JSON.stringify(serializzabile));
  } catch (errore) {
    console.warn('Impossibile salvare le scelte finte.', errore);
  }
}

function assicuraCaricato() {
  if (caricato) {
    return;
  }
  caricato = true;
  const salvato = leggiPersistito();
  if (!salvato || typeof salvato !== 'object') {
    return;
  }
  Object.entries(salvato).forEach(([utenteId, scelte]) => {
    depositoScelte.set(Number(utenteId), scelte && typeof scelte === 'object' ? scelte : {});
  });
}

function scelteDepositate(utenteId) {
  assicuraCaricato();
  return depositoScelte.get(Number(utenteId)) ?? {};
}

/** Copia delle scelte di un utente: la legge `finti/coda.js` per i suoi conti. */
export function ottieniScelte(utenteId) {
  return { ...scelteDepositate(utenteId) };
}

/** Svuota il deposito delle scelte: comodo per riprovare la demo da zero. */
export function azzeraScelteFinti() {
  depositoScelte.clear();
  caricato = true;
  scriviPersistito();
}
