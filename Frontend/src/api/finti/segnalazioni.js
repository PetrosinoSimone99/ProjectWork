/**
 * Finti: le **segnalazioni** inviate alla staff.
 *
 * Serve perché `segnalazioni.php` non esiste e senza deposito la schermata
 * «Segnala» non avrebbe niente da registrare: la demo deve poter mostrare che la
 * segnalazione è partita e che il deposito la conserva. È un `Map` per utente con
 * copia su `localStorage` (chiave `barattolo.finti.segnalazioni`): sul web una
 * segnalazione sopravvive al reload, su native degrada a sola memoria —
 * degradazione dichiarata, come per gli altri finti.
 *
 * Restituisce la **forma di rete** dell'endpoint proposto (`segnalazioni.php`): la
 * normalizzazione è una sola e sta in `api/normalizzazioni.js`, usata da
 * `api/barattolo.js`. I finti **non
 * validano**: un finto che rifiuta darebbe l'illusione di un contratto che non
 * esiste (i `400`/`403`/`409` veri arriveranno dal backend). L'unica cosa che il
 * finto fa è assegnare un id e una data.
 *
 * Una cosa dichiaratamente finta, che il backend deciderà: lo **stato iniziale**
 * (`OPEN`, il modello obiettivo) e la data di creazione. Il frontend non deduce
 * nessun esito da qui.
 *
 * `elencoSegnalazioni` esiste per il **piano 11** (il finto della staff): quando
 * chiuderà una segnalazione, scriverà l'esito nella notifica dell'utente
 * (`finti/notifiche.js`). Non è chiamata da nessuna schermata di oggi.
 */

import { adessoBackend } from './coda-dati';

const CHIAVE_PERSISTENZA = 'barattolo.finti.segnalazioni';

/** Attesa dichiarata: rende rappresentabile lo stato «sto inviando». */
const ATTESA_MS = 300;

/** Stato assegnato dal finto a ogni segnalazione: l'endpoint vero decide il suo. */
const STATO_INIZIALE = 'OPEN';

/** Il deposito: `utenteId -> [riga di rete]` (le segnalazioni **inviate** da quell'utente). */
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
    console.warn('Segnalazioni finte illeggibili: la demo riparte da zero.', errore);
    return null;
  }
}

function scriviPersistito() {
  if (!localStorageDisponibile()) {
    return;
  }
  const serializzabile = {};
  deposito.forEach((segnalazioni, utenteId) => {
    serializzabile[utenteId] = segnalazioni;
  });
  try {
    window.localStorage.setItem(CHIAVE_PERSISTENZA, JSON.stringify(serializzabile));
  } catch (errore) {
    console.warn('Impossibile salvare le segnalazioni finte.', errore);
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
  Object.entries(salvato).forEach(([utenteId, segnalazioni]) => {
    if (Array.isArray(segnalazioni)) {
      deposito.set(Number(utenteId), segnalazioni);
    }
  });
}

function segnalazioniDepositate(utenteId) {
  assicuraCaricato();
  return deposito.get(Number(utenteId)) ?? [];
}

/** Tutte le righe del deposito, di tutti gli utenti: serve alla staff (piano 11). */
function tutteLeSegnalazioni() {
  assicuraCaricato();
  const righe = [];
  deposito.forEach((segnalazioni) => righe.push(...segnalazioni));
  return righe;
}

/** L'id continua dalla segnalazione più alta già presente, anche dopo un reload. */
function prossimoId() {
  return (
    tutteLeSegnalazioni().reduce((massimo, riga) => Math.max(massimo, Number(riga.id) || 0), 0) + 1
  );
}

function busta(message, data) {
  return { success: true, message, data };
}

/** Copia della riga: chi la riceve non può modificare quella del deposito. */
function copia(riga) {
  return { ...riga };
}

/**
 * Una riga del deposito nella forma di rete. Il payload arriva da
 * `aPayloadSegnalazione` (chiavi `utente_segnalato_id`, `motivo`, `id_gruppo` o
 * `id_accordo`), quindi qui si completa solo quello che il backend aggiungerebbe:
 * id, stato e data. `descrizione` assente resta `null`, non `""`, come farebbe il
 * backend con una colonna `TEXT NULL`.
 */
function normalizzaRiga(payload, id) {
  return {
    id,
    stato: STATO_INIZIALE,
    motivo: payload?.motivo ?? null,
    descrizione: typeof payload?.descrizione === 'string' ? payload.descrizione : null,
    segnalato_id: payload?.utente_segnalato_id ?? null,
    id_gruppo: payload?.id_gruppo ?? null,
    id_accordo: payload?.id_accordo ?? null,
    creato_il: adessoBackend(),
  };
}

/**
 * TODO(backend): `POST segnalazioni.php` con `{utente_segnalato_id, motivo,
 * descrizione?, id_gruppo?, id_accordo?}`; l'autore viene **dal token di
 * accesso**, mai dal corpo, e il backend verifica che chi segnala partecipi al
 * fatto (`403`), che l'utente segnalato esista (`404`) e che lo stesso fatto non
 * sia già stato segnalato (`409`). La risposta porta la riga creata con il suo
 * `id` e lo stato iniziale.
 *
 * `utenteId` serve perché il finto non decodifica il token di accesso (su native
 * `atob` non è garantito), come già fanno gli altri depositi.
 */
export function creaSegnalazione(utenteId, payload) {
  const attuali = segnalazioniDepositate(utenteId);
  const riga = normalizzaRiga(payload, prossimoId());
  deposito.set(Number(utenteId), [...attuali, riga]);
  scriviPersistito();

  return new Promise((resolve) => {
    setTimeout(
      () => resolve(busta('Segnalazione inviata alla staff.', { segnalazione: copia(riga) })),
      ATTESA_MS,
    );
  });
}

/**
 * TODO(backend): `GET segnalazioni.php` — le **proprie** segnalazioni. Non è
 * consumata da nessuna schermata oggi (l'utente non vede lo stato della propria
 * segnalazione: riceve una notifica quando arriva l'esito), ma il piano 11 la userà
 * per l'elenco della staff insieme a `elencoSegnalazioni`.
 */
export function ottieniSegnalazioni(utenteId) {
  const segnalazioni = segnalazioniDepositate(utenteId).map(copia);
  return new Promise((resolve) => {
    setTimeout(() => resolve(busta('Segnalazioni caricate.', { segnalazioni })), ATTESA_MS);
  });
}

/**
 * L'elenco completo, nella forma di rete della staff (`data.segnalazioni`):
 * è il punto da cui il **piano 11** chiuderà una pratica e scriverà la notifica.
 * Non restituisce una `Promise` perché non è ancora una chiamata di schermata.
 */
export function elencoSegnalazioni() {
  return tutteLeSegnalazioni().map(copia);
}

/** Svuota il deposito: comodo per riprovare la demo da zero. */
export function azzeraFinti() {
  deposito.clear();
  caricato = true;
  scriviPersistito();
}
