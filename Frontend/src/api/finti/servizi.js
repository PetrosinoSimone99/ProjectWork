/**
 * Finti: il deposito in memoria delle offerte e delle ricerche create nella demo.
 *
 * Serve alla schermata 2 (Offro e cerco), che è quella che le elenca e le
 * gestisce: se le voci sparissero alla chiusura del form, quella schermata non
 * si potrebbe provare: la registrazione scrive qui (`salvaVoci`) e la
 * pubblicazione legge e scrive qui (`ottieniServizi`, `creaServizio`,
 * `aggiornaServizio`, `cambiaStatoServizio`, `eliminaServizio`).
 *
 * Due forme di uscita, come i due endpoint che sostituiscono:
 * - `ottieniVoci` è **raggruppata** (`{offerte, ricerche}`) ed è la forma di
 *   `utente.offerte`/`utente.ricerche` in `register.php`/`login.php`;
 * - `ottieniServizi` è **piatta** (`{success, message, data:{servizi:[…]}}`) con
 *   il campo `tipo` su ogni riga: è la forma proposta per `GET servizi.php`.
 *
 * Sul **web** il deposito si appoggia a `localStorage` (la sessione finta sta lì,
 * e mezza demo che si dimentica le voci è peggio di un finto dichiarato); su
 * **native**, dove `window` non esiste, degrada a sola memoria.
 *
 * Nessuna scrittura muta lo stato esistente: si legge, si copia, si sostituisce.
 * I finti **non validano**: accettano e basta. Una riga con un id inesistente è
 * un errore di programmazione, non un dato da accettare in silenzio, quindi
 * `aggiorna`/`cambiaStato`/`elimina` rispondono 404 come farebbe l'endpoint.
 */

import { ApiError } from '../client';

const CHIAVE_PERSISTENZA = 'barattolo.finti.servizi';

/** Stato assegnato dal finto a ogni voce creata: l'endpoint vero decide il suo. */
const STATO_INIZIALE = 'PUBBLICATA';

/** Il deposito: `utenteId -> { offerte: [], ricerche: [] }`. */
const deposito = new Map();

let caricato = false;

/** Su native non c'è `localStorage`: il deposito resta solo in memoria. */
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
    console.warn('Deposito finto illeggibile: la demo riparte da vuoto.', errore);
    return null;
  }
}

function scriviPersistito() {
  if (!localStorageDisponibile()) {
    return;
  }
  const serializzabile = {};
  deposito.forEach((voci, utenteId) => {
    serializzabile[utenteId] = voci;
  });
  try {
    window.localStorage.setItem(CHIAVE_PERSISTENZA, JSON.stringify(serializzabile));
  } catch (errore) {
    console.warn('Impossibile salvare il deposito finto.', errore);
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
  Object.entries(salvato).forEach(([utenteId, voci]) => {
    deposito.set(Number(utenteId), {
      offerte: Array.isArray(voci?.offerte) ? voci.offerte : [],
      ricerche: Array.isArray(voci?.ricerche) ? voci.ricerche : [],
    });
  });
}

/** Il campo del deposito che corrisponde al tipo di voce. */
const CHIAVE_TIPO = { OFFERTA: 'offerte', RICERCA: 'ricerche' };

function chiaveTipo(tipo) {
  const chiave = CHIAVE_TIPO[tipo];
  if (!chiave) {
    throw new Error(`Tipo di voce finto sconosciuto: ${tipo}`);
  }
  return chiave;
}

function vociDepositate(utenteId) {
  assicuraCaricato();
  return deposito.get(Number(utenteId)) ?? { offerte: [], ricerche: [] };
}

/** L'id continua dalla voce più alta già presente, anche dopo un reload. */
function prossimoId(voci) {
  return voci.reduce((massimo, voce) => Math.max(massimo, Number(voce.id) || 0), 0) + 1;
}

/**
 * Una riga del deposito nella forma di rete piatta. Accetta sia il corpo di
 * registrazione (`{id_categoria, mansione, da_remoto}`, senza località né stato)
 * sia quello della pubblicazione, e completa i campi assenti: le voci salvate
 * prima di questa sessione non hanno `localita` né `stato` e non per questo
 * devono sparire dalla demo.
 */
function normalizzaRiga(voce, id) {
  return {
    id,
    id_categoria: voce?.id_categoria ?? null,
    mansione: typeof voce?.mansione === 'string' ? voce.mansione : '',
    da_remoto: voce?.da_remoto === true,
    localita: typeof voce?.localita === 'string' ? voce.localita : '',
    stato: typeof voce?.stato === 'string' && voce.stato ? voce.stato : STATO_INIZIALE,
  };
}

/** Riga + `tipo`: la forma piatta dell'elenco, dove i due depositi convivono. */
function conTipo(riga, tipo) {
  return { ...riga, tipo };
}

function busta(message, data) {
  return { success: true, message, data };
}

/** Copia della riga con i campi cambiati; `id` e `stato` non si toccano mai. */
function conCampi(riga, campi) {
  return normalizzaRiga({ ...riga, ...campi, stato: riga.stato }, riga.id);
}

/** L'indice della riga con quell'id, o un 404 come farebbe l'endpoint vero. */
function indiceDi(righe, id) {
  const indice = righe.findIndex((riga) => Number(riga.id) === Number(id));
  if (indice === -1) {
    throw new ApiError(404, 'Questa pubblicazione non esiste più.');
  }
  return indice;
}

/**
 * Conserva le voci di un tipo per un utente, assegnando gli id progressivi.
 * La usa la registrazione: `localita` e `stato` non arrivano dal suo corpo e
 * vengono completati qui, così la voce è già gestibile dalla schermata 2.
 */
export function salvaVoci(utenteId, tipo, voci) {
  const chiave = chiaveTipo(tipo);

  const attuali = vociDepositate(utenteId);
  let contatore = prossimoId(attuali[chiave]);
  const nuove = voci.map((voce) => {
    const salvata = normalizzaRiga(voce, contatore);
    contatore += 1;
    return salvata;
  });

  deposito.set(Number(utenteId), {
    ...attuali,
    [chiave]: [...attuali[chiave], ...nuove],
  });
  scriviPersistito();
}

/** Copie delle voci depositate, raggruppate: la forma di `utente.offerte`. */
export function ottieniVoci(utenteId) {
  const voci = vociDepositate(utenteId);
  return {
    offerte: voci.offerte.map((voce) => ({ ...voce })),
    ricerche: voci.ricerche.map((voce) => ({ ...voce })),
  };
}

/**
 * TODO(backend): `GET servizi.php` → `{success, message, data:{servizi:[…]}}`,
 * una lista piatta con il campo `tipo` e le sospese comprese. L'ordine è dal più
 * recente: l'endpoint vero dovrà ordinare per data di creazione decrescente.
 */
export function ottieniServizi(utenteId) {
  const { offerte, ricerche } = ottieniVoci(utenteId);
  const servizi = [
    ...offerte.map((voce) => conTipo(voce, 'OFFERTA')),
    ...ricerche.map((voce) => conTipo(voce, 'RICERCA')),
  ];
  return busta('Servizi caricati.', { servizi });
}

/**
 * TODO(backend): `POST servizi.php` con `{tipo, id_categoria, mansione,
 * da_remoto, localita?}`; la risposta deve contenere **la riga creata e il suo
 * `id`** (lezione di P37), altrimenti modifica ed eliminazione sono impossibili.
 */
export function creaServizio(utenteId, voce) {
  const chiave = chiaveTipo(voce?.tipo);
  const attuali = vociDepositate(utenteId);
  const riga = normalizzaRiga(voce, prossimoId(attuali[chiave]));

  // In cima, come farebbe l'endpoint ordinando per data di creazione decrescente.
  deposito.set(Number(utenteId), { ...attuali, [chiave]: [riga, ...attuali[chiave]] });
  scriviPersistito();
  return busta('Pubblicazione salvata.', { servizio: conTipo(riga, voce.tipo) });
}

/** TODO(backend): `POST servizi.php` `{azione:'aggiorna', id, …}`. */
export function aggiornaServizio(utenteId, id, tipo, campi) {
  const chiave = chiaveTipo(tipo);
  const attuali = vociDepositate(utenteId);
  const righe = attuali[chiave];
  const indice = indiceDi(righe, id);
  const aggiornata = conCampi(righe[indice], campi);

  deposito.set(Number(utenteId), {
    ...attuali,
    [chiave]: righe.map((riga, posizione) => (posizione === indice ? aggiornata : riga)),
  });
  scriviPersistito();
  return busta('Modifica salvata.', { servizio: conTipo(aggiornata, tipo) });
}

/** TODO(backend): `POST servizi.php` `{azione:'stato', id, tipo, stato}`. */
export function cambiaStatoServizio(utenteId, id, tipo, stato) {
  const chiave = chiaveTipo(tipo);
  const attuali = vociDepositate(utenteId);
  const righe = attuali[chiave];
  const indice = indiceDi(righe, id);
  const aggiornata = { ...righe[indice], stato };

  deposito.set(Number(utenteId), {
    ...attuali,
    [chiave]: righe.map((riga, posizione) => (posizione === indice ? aggiornata : riga)),
  });
  scriviPersistito();
  return busta('Stato aggiornato.', { servizio: conTipo(aggiornata, tipo) });
}

/**
 * TODO(backend): `POST servizi.php` `{azione:'elimina', id, tipo}`. Cancellazione
 * definitiva o stato «eliminata» lo decidono i colleghi: per la UI il risultato
 * è lo stesso, la voce non c'è più.
 */
export function eliminaServizio(utenteId, id, tipo) {
  const chiave = chiaveTipo(tipo);
  const attuali = vociDepositate(utenteId);
  const righe = attuali[chiave];
  const indice = indiceDi(righe, id);

  deposito.set(Number(utenteId), {
    ...attuali,
    [chiave]: righe.filter((riga, posizione) => posizione !== indice),
  });
  scriviPersistito();
  return busta('Pubblicazione eliminata.');
}

/** Svuota il deposito: comodo per riprovare la demo da zero. */
export function azzeraFinti() {
  deposito.clear();
  caricato = true;
  scriviPersistito();
}
