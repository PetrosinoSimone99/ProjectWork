/**
 * Finti: **l'elenco utenti dell'area staff**.
 *
 * Serve perché `utenti.php` non esiste: senza deposito l'area staff non avrebbe
 * un elenco da mostrare e `userRoleManager.php`/`userStatoManager.php` — che
 * invece **esistono già** e funzionano — resterebbero senza interfaccia. Il
 * deposito è un `Map` per id con copia su `localStorage` (chiave
 * `barattolo.finti.utenti-staff`): sul web un cambio di ruolo sopravvive al
 * reload, su native degrada a sola memoria — degradazione dichiarata, come per
 * gli altri finti.
 *
 * Restituisce la **forma di rete** dei due endpoint: `ottieniUtentiStaff` la
 * busta `{success, message, data}` dell'elenco proposto, `cambiaRuolo` e
 * `cambiaStato` la busta **piatta** `{messaggio, utente}` che i due manager
 * usano davvero. La normalizzazione è una sola e sta in
 * `api/normalizzazioni.js`, usata da `api/barattolo.js`.
 *
 * Una cosa questo deposito **fa**, ed è la stessa scelta del finto delle
 * segnalazioni (che riproduce il `409`): applica le regole di autorizzazione
 * delle due API vere — le stesse funzioni pure di `servizi/staff-utenti.js`,
 * citate in `API/userRoleManager.php` e `API/userStatoManager.php` — e risponde
 * `403`/`404` come loro. È l'unico modo di provare a schermo il rifiuto del
 * backend quando la UI crede di poter fare qualcosa; i finti non proteggono
 * niente, riproducono una sceneggiatura. I **valori** invece non li valida
 * (nessun controllo sui campi oltre a quelli del backend).
 *
 * Il **seme** è la sceneggiatura della demo: l'utente della demo (che nella
 * demo ha il ruolo finto `STAFF`, vedi `finti/accesso.js`) più un `UTENTE`
 * attivo, uno sospeso, uno bloccato, uno `STAFF` e un `ADMIN`. Senza l'`ADMIN`
 * l'asimmetria dei due manager (ruolo sì, stato no) non sarebbe visibile.
 */

import { ApiError } from '../client';
import {
  motivoRifiutoRuolo,
  motivoRifiutoStato,
  normalizzaRuolo,
  normalizzaStatoUtente,
} from '@/servizi/staff-utenti';
import { adessoBackend } from './coda-dati';

const CHIAVE_PERSISTENZA = 'barattolo.finti.utenti-staff';

/** Attesa dichiarata: rende rappresentabili il caricamento e l'azione in corso. */
const ATTESA_MS = 300;

/** Il deposito: `id -> riga di rete`. Non è per utente: l'elenco è di tutti. */
const deposito = new Map();

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
    console.warn('Utenti della staff illeggibili: la demo riparte dal seme.', errore);
    return null;
  }
}

function scriviPersistito() {
  if (!localStorageDisponibile()) {
    return;
  }
  const serializzabile = {};
  deposito.forEach((riga, id) => {
    serializzabile[id] = riga;
  });
  try {
    window.localStorage.setItem(CHIAVE_PERSISTENZA, JSON.stringify(serializzabile));
  } catch (errore) {
    console.warn('Impossibile salvare gli utenti della staff.', errore);
  }
}

function assicuraCaricato(utenteId) {
  if (caricato) {
    return;
  }
  caricato = true;
  const salvato = leggiPersistito();
  if (salvato && typeof salvato === 'object' && Object.keys(salvato).length > 0) {
    Object.entries(salvato).forEach(([id, riga]) => deposito.set(Number(id), riga));
    return;
  }
  seme(utenteId).forEach((riga) => deposito.set(Number(riga.id), riga));
}

function busta(message, data) {
  return { success: true, message, data };
}

/** Copia della riga: chi la riceve non può modificare quella del deposito. */
function copia(riga) {
  return { ...riga };
}

function utente(id, nome, cognome, username, ruolo, stato) {
  return { id, nome, cognome, username, ruolo, stato, creato_il: adessoBackend() };
}

/**
 * TODO(backend): il seme è la sceneggiatura della demo, non dati reali. `Tu` è
 * l'utente della demo (il ruolo finto lo rende anche staff): è l'operatore di
 * questa schermata, ed è quello che non può modificare se stesso.
 */
function seme(utenteId) {
  const idUtente = Number(utenteId);
  return [
    utente(Number.isInteger(idUtente) ? idUtente : 1, 'Tu', null, 'tu', 'STAFF', 'ATTIVO'),
    utente(201, 'Mario', 'Rossi', 'mario.rossi', 'UTENTE', 'ATTIVO'),
    utente(202, 'Giulia', 'Bianchi', 'giulia.bianchi', 'UTENTE', 'SOSPESO'),
    utente(203, 'Luca', 'Verdi', 'luca.verdi', 'UTENTE', 'BLOCCATO'),
    utente(204, 'Anna', 'Neri', 'anna.neri', 'STAFF', 'ATTIVO'),
    utente(205, 'Paolo', 'Gialli', 'paolo.gialli', 'ADMIN', 'ATTIVO'),
  ];
}

/** L'operatore della scena: la riga del deposito con l'id di chi chiama. */
function operatore(utenteId) {
  const riga = deposito.get(Number(utenteId));
  return riga ? copia(riga) : null;
}

/**
 * TODO(backend): `GET utenti.php?ruolo=&stato=&q=` con l'identità dal token e
 * `403` se chi chiama non è staff. `utenteId` serve perché il finto non
 * decodifica il token, come già fanno gli altri depositi.
 */
export function ottieniUtentiStaff(utenteId) {
  assicuraCaricato(utenteId);
  const utenti = [...deposito.values()]
    .sort((prima, seconda) => Number(prima.id) - Number(seconda.id))
    .map(copia);
  return new Promise((resolve) => {
    setTimeout(() => resolve(busta('Utenti caricati.', { utenti })), ATTESA_MS);
  });
}

/**
 * TODO(backend): `POST userRoleManager.php {utente_id, ruolo}` con l'identità
 * dal token. Il finto riproduce `404` (bersaglio sparito) e i `403` delle
 * regole, perché sono i casi che la schermata deve saper mostrare.
 */
export function cambiaRuolo(utenteId, id, ruolo) {
  assicuraCaricato(utenteId);
  const io = operatore(utenteId);
  const bersaglio = deposito.get(Number(id)) ?? null;
  if (!bersaglio) {
    throw new ApiError(404, 'Utente non trovato.');
  }
  const nuovo = normalizzaRuolo(ruolo);
  const rifiuto = motivoRifiutoRuolo(io, bersaglio, nuovo);
  if (rifiuto !== null) {
    throw new ApiError(rifiuto.startsWith('Ruolo non valido') ? 400 : 403, rifiuto);
  }
  const aggiornata = { ...bersaglio, ruolo: nuovo };
  deposito.set(Number(id), aggiornata);
  scriviPersistito();
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          messaggio: "Ruolo dell'utente aggiornato con successo.",
          utente: copia(aggiornata),
        }),
      ATTESA_MS,
    );
  });
}

/**
 * TODO(backend): `POST userStatoManager.php {utente_id, stato}` con l'identità
 * dal token. Come sopra: il finto riproduce `404` e i `403` delle regole (fra
 * cui il divieto sul bersaglio `ADMIN`, valido anche per un altro `ADMIN`).
 */
export function cambiaStato(utenteId, id, stato) {
  assicuraCaricato(utenteId);
  const io = operatore(utenteId);
  const bersaglio = deposito.get(Number(id)) ?? null;
  if (!bersaglio) {
    throw new ApiError(404, 'Utente non trovato.');
  }
  const nuovo = normalizzaStatoUtente(stato);
  const rifiuto = motivoRifiutoStato(io, bersaglio);
  if (rifiuto !== null) {
    throw new ApiError(403, rifiuto);
  }
  if (nuovo === null) {
    throw new ApiError(400, 'Stato non valido. Usa ATTIVO, SOSPESO o BLOCCATO.');
  }
  const aggiornata = { ...bersaglio, stato: nuovo };
  deposito.set(Number(id), aggiornata);
  scriviPersistito();
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          messaggio: "Stato dell'utente aggiornato con successo.",
          utente: copia(aggiornata),
        }),
      ATTESA_MS,
    );
  });
}

/** Svuota il deposito: comodo per riprovare la demo da zero. */
export function azzeraFinti() {
  deposito.clear();
  caricato = true;
  scriviPersistito();
}
