import { TIPI_VOCE } from './offerta-ricerca';

/**
 * Il registro locale delle **mie voci** (offerte e ricerche con il loro id):
 * serve a «Scambi» per far scegliere la coppia (`offeredServiceId`,
 * `requestedServiceId`) con cui avviare una ricerca di catena.
 *
 * Esiste perché **non esiste** un endpoint che elenchi le proprie voci
 * (segnalazione in `temp/gruppo-3-mancanti/26`): il registro si alimenta solo
 * da risposte **reali** del backend — la registrazione (`offers`/`requests`),
 * la creazione di una voce (`service`) e le righe del feed Loop
 * (`actorOfferService`/`actorRequestService`) — e **non inventa mai righe**.
 * Quando arriverà `GET /api/services/mine`, il registro si toglie.
 *
 * Degradazione dichiarata, come per i finti: persistenza in `localStorage`
 * **solo su web** (chiave `barattolo.mie-voci`), memoria di processo su native.
 * Un registro perduto non è un dato falso: la sezione «Avvia una ricerca»
 * torna disabilitata col suo stato esplicito, e le voci si re-immettono
 * navigando (registrazione, pubblicazione, Loop).
 */

/** Chiave del registro su web. */
const CHIAVE_STORAGE = 'barattolo.mie-voci';

/**
 * La memoria di processo (native, e anche web come cache di lettura): tiene
 * **tutto** il registro come snapshot, così native non perde le scritture.
 */
const memoria = { dati: {} };

/** `true` su web, dove `localStorage` esiste; `false` su native. */
function storageDisponibile() {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/** Legge il registro (web: storage; native: memoria). Non muta il risultato. */
function leggiRegistro() {
  if (storageDisponibile()) {
    try {
      const grezzo = localStorage.getItem(CHIAVE_STORAGE);
      if (grezzo) {
        const dati = JSON.parse(grezzo);
        if (dati && typeof dati === 'object') {
          memoria.dati = dati;
          return dati;
        }
      }
    } catch {
      // Registro corrotto o inaccessibile: si riparte da vuoto, non è un dato
      // perso che la UI possa mostrare (non è un dato reale).
    }
    return memoria.dati;
  }
  return memoria.dati;
}

/** Scrive il registro (web: storage; native: memoria). Sempre nello snapshot. */
function scriviRegistro(dati) {
  memoria.dati = dati;
  if (storageDisponibile()) {
    try {
      localStorage.setItem(CHIAVE_STORAGE, JSON.stringify(dati));
    } catch {
      // Quota piena o storage bloccato: il registro resta in memoria per questa
      // sessione, la sezione «Avvia una ricerca» lo usa comunque.
    }
  }
  return dati;
}

/**
 * Le sezioni del registro di un utente, pronte per la lettura o la scrittura:
 * copia difensiva, mai i dati originali.
 */
function sezioniDi(dati, utenteId) {
  const chiave = String(utenteId);
  const esistenti = dati[chiave];
  return {
    chiave,
    offerte: Array.isArray(esistenti?.offerte) ? [...esistenti.offerte] : [],
    ricerche: Array.isArray(esistenti?.ricerche) ? [...esistenti.ricerche] : [],
  };
}

/**
 * Una voce del registro nella forma conservata: `{tipo, id, descrizione,
 * idCategoria}`. `null` per una riga inutilizzabile: senza id la coppia per
 * `POST /api/chains` non si può comporre, e la voce non entra.
 */
function voceDaServizio(servizio, tipo) {
  const id = Number(servizio?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  const categorie = Array.isArray(servizio?.categories) ? servizio.categories : [];
  const idCategoria = Number(categorie[0]?.id);
  return {
    tipo,
    id,
    descrizione: typeof servizio?.description === 'string' ? servizio.description : '',
    idCategoria: Number.isInteger(idCategoria) ? idCategoria : null,
  };
}

/** Aggiunge una voce in coda a una sezione, senza duplicati di id. */
function aggiungiVoce(sezione, voce) {
  if (voce === null || sezione.some((esistente) => Number(esistente.id) === Number(voce.id))) {
    return sezione;
  }
  return [...sezione, voce];
}

/**
 * Sostituisce **tutte** le voci dell'utente: lo usa la registrazione, che crea
 * l'account con le sue offerte e ricerche e riceve gli id dal backend.
 * `voci` è `{offerte: [...], ricerche: [...]}` con le voci in forma di servizio
 * (`{id, description, categories}`) o già nella forma del registro.
 * Restituisce il registro aggiornato (copia), senza mutare l'input.
 */
export function registraMieVoci(utenteId, voci) {
  if (utenteId === null || utenteId === undefined) {
    return null;
  }
  const dati = leggiRegistro();
  const sezioni = sezioniDi(dati, utenteId);
  const offerte = (Array.isArray(voci?.offerte) ? voci.offerte : [])
    .map((servizio) => voceDaServizio(servizio, TIPI_VOCE.OFFERTA))
    .filter(Boolean);
  const ricerche = (Array.isArray(voci?.ricerche) ? voci.ricerche : [])
    .map((servizio) => voceDaServizio(servizio, TIPI_VOCE.RICERCA))
    .filter(Boolean);
  const aggiornato = {
    ...dati,
    [sezioni.chiave]: {
      offerte: offerte.length > 0 ? offerte : sezioni.offerte,
      ricerche: ricerche.length > 0 ? ricerche : sezioni.ricerche,
    },
  };
  return scriviRegistro(aggiornato);
}

/**
 * Aggiunge **una** voce alla sezione giusta (`voce.tipo` decide): lo usano la
 * creazione di una voce e le righe del feed Loop. `voce` è nella forma del
 * servizio (`{id, description, categories}`) con il `tipo` interno a parte.
 * Restituisce la voce registrata, o `null` se la riga non era utilizzabile.
 */
export function aggiungiMiaVoce(utenteId, servizio, tipo) {
  if (utenteId === null || utenteId === undefined) {
    return null;
  }
  const voce = voceDaServizio(servizio, tipo);
  if (voce === null) {
    return null;
  }
  const dati = leggiRegistro();
  const sezioni = sezioniDi(dati, utenteId);
  const sezione = voce.tipo === TIPI_VOCE.OFFERTA ? 'offerte' : 'ricerche';
  const aggiornato = {
    ...dati,
    [sezioni.chiave]: { ...sezioni, [sezione]: aggiungiVoce(sezioni[sezione], voce) },
  };
  scriviRegistro(aggiornato);
  return voce;
}

/**
 * Le mie voci nella forma `{offerte: [...], ricerche: [...]}` — **mai** `null`:
 * un utente senza registro ha due liste vuote, e la schermata mostra il suo
 * stato esplicito di sezione disabilitata. Copia, sempre: chi legge non può
 * mutare il registro.
 */
export function ottieniMieVoci(utenteId) {
  if (utenteId === null || utenteId === undefined) {
    return { offerte: [], ricerche: [] };
  }
  return sezioniDi(leggiRegistro(), utenteId);
}
