import { apiFetch } from './client';

/** POST login.php — restituisce il token Bearer da riusare nelle chiamate autenticate. */
export function login(username, password) {
  return apiFetch('login.php', {
    method: 'POST',
    body: { username, password },
  });
}

/** POST register.php — crea l'utente e lo autentica subito. */
export function register(input) {
  return apiFetch('register.php', { method: 'POST', body: input });
}

/**
 * Normalizza i risultati di ricerca per la UI, restando fedele al contratto:
 * - ricercaHomepage.php non emette ancora "tipo" (Parte 07): senza valore la card
 *   non saprebbe distinguere servizi da richieste. Tutto ciò che arriva senza tipo
 *   è una richiesta; il default "RICHIESTA" rende i dati coerenti anche quando il
 *   backend verrà aggiornato col campo.
 * - ricerca.php mappa descrizione_servizio sia su "titolo" sia su "descrizione":
 *   la UI mostrerebbe la stessa frase due volte; la descrizione duplicata si svuota.
 * Copia-trasforma-restituisci: non muta mai i dati di risposta.
 */
function normalizzaRisultati(risultati) {
  if (!Array.isArray(risultati)) {
    return risultati;
  }
  return risultati.map((item) => {
    const tipo = item.tipo ?? 'RICHIESTA';
    if (tipo === 'SERVIZIO_PROFILO' && item.descrizione === item.titolo) {
      return { ...item, tipo, descrizione: '' };
    }
    return tipo === item.tipo ? item : { ...item, tipo };
  });
}

function conRisultatiNormalizzati(data) {
  return { ...(data ?? {}), risultati: normalizzaRisultati(data?.risultati) };
}

/** GET ricerca.php?q=... — cerca insieme nei servizi di profilo e nelle richieste. */
export async function ricerca(token, query) {
  const data = await apiFetch(`ricerca.php?q=${encodeURIComponent(query)}`, { token });
  return conRisultatiNormalizzati(data);
}

/** GET ricercaHomepage.php — annunci della home (richieste attive), senza parole chiave. */
export async function ricercaHomepage(token) {
  const data = await apiFetch('ricercaHomepage.php', { token });
  return conRisultatiNormalizzati(data);
}

/** POST Chat/cercaOCreaChat.php — trova o crea una chat 1:1. */
export async function cercaOCreaChat(token, utenteAttuale, membroChat) {
  const data = await apiFetch('Chat/cercaOCreaChat.php', {
    method: 'POST',
    body: { utenteAttuale, membroChat },
    token,
  });
  return Number(data.id_chat);
}

/** GET Chat/ottieniStoricoChat.php?chat=... — restituisce lo storico della chat. */
export function ottieniStoricoChat(token, chatId) {
  return apiFetch(`Chat/ottieniStoricoChat.php?chat=${chatId}`, { token });
}

/** POST Chat/inviaMessaggio.php — invia un messaggio nella chat. */
export function inviaMessaggio(token, chatId, utenteId, messaggio) {
  return apiFetch('Chat/inviaMessaggio.php', {
    method: 'POST',
    body: { chat: chatId, utente: utenteId, messaggio },
    token,
  });
}

/** POST richieste.php — pubblica una nuova richiesta per l'utente autenticato. */
export function creaRichiesta(token, input) {
  return apiFetch('richieste.php', { method: 'POST', body: input, token });
}

/** POST inviti.php azione "genera" — crea (o restituisce) il codice invito del mese. */
export function generaInvito(token) {
  return apiFetch('inviti.php', {
    method: 'POST',
    body: { azione: 'genera' },
    token,
  });
}

/** POST inviti.php azione "riscatta" — usa un codice invito ricevuto. */
export function riscattaInvito(token, codice) {
  return apiFetch('inviti.php', {
    method: 'POST',
    body: { azione: 'riscatta', codice },
    token,
  });
}

// ---------------------------------------------------------------------------
// Accordi 1:1 — API/Accordi1_a_1/
//
// La busta di questa cartella è {success, message, data} e gli id viaggiano nel
// corpo per le azioni e nella query string per le letture. Le risposte vengono
// adattate qui (§4 del piano): le schermate non leggono chiavi del backend.
// ---------------------------------------------------------------------------

/**
 * Aggiunge all'accordo ciò che il backend non manda: chi sono io, chi è l'altro.
 * Copia-trasforma-restituisce: l'accordo di risposta non viene mai mutato.
 */
function normalizzaAccordo(accordo, utenteId) {
  if (!accordo || !Array.isArray(accordo.partecipanti)) {
    return accordo;
  }
  const io =
    accordo.partecipanti.find((p) => Number(p.id_utente) === Number(utenteId)) ?? null;
  const altro =
    accordo.partecipanti.find((p) => Number(p.id_utente) !== Number(utenteId)) ?? null;
  return { ...accordo, io, altro };
}

/** GET Accordi1_a_1/elenco.php — gli accordi dell'utente, normalizzati per la UI. */
export async function ottieniAccordi(token, utenteId) {
  const data = await apiFetch('Accordi1_a_1/elenco.php', { token });
  return (data?.data ?? []).map((accordo) => normalizzaAccordo(accordo, utenteId));
}

/** GET Accordi1_a_1/dettaglio.php?id_accordo= — un accordo, normalizzato per la UI. */
export async function ottieniAccordo(token, idAccordo, utenteId) {
  const data = await apiFetch(
    `Accordi1_a_1/dettaglio.php?id_accordo=${encodeURIComponent(idAccordo)}`,
    { token },
  );
  return normalizzaAccordo(data?.data, utenteId);
}

/**
 * POST Accordi1_a_1/crea.php — propone un accordo 1:1 a un altro utente.
 * Restituisce l'id dell'accordo creato, già come numero: serve alla navigazione
 * verso il dettaglio e un id stringa farebbe fallire i confronti con `===`.
 */
export async function creaAccordo(token, idAltroUtente, durataMia, durataAltro) {
  const data = await apiFetch('Accordi1_a_1/crea.php', {
    method: 'POST',
    token,
    body: {
      id_altro_utente: idAltroUtente,
      durata_mia: durataMia,
      durata_altro: durataAltro,
    },
  });
  return Number(data?.data?.id_accordo);
}

/** Le cinque azioni che condividono corpo `{id_accordo}` e stessa forma di risposta. */
const PERCORSI_AZIONE_ACCORDO = {
  accetta: 'Accordi1_a_1/accetta.php',
  avvia: 'Accordi1_a_1/avvia.php',
  completa: 'Accordi1_a_1/completa.php',
  annulla: 'Accordi1_a_1/annulla.php',
  contesta: 'Accordi1_a_1/contesta.php',
};

/**
 * POST Accordi1_a_1/<azione>.php — un solo corpo per le cinque azioni, un solo
 * esito normalizzato per la schermata:
 * - `messaggio`: il testo del backend (che in questa cartella sta in `message`,
 *   non in `errore`), già pronto da mostrare;
 * - `stato`: lo stato raggiunto, quando il backend lo restituisce;
 * - `creditiAssegnati`: vero solo quando *adesso* sono stati dati i 10 crediti.
 *   `completa.php` è idempotente e risponde 200 con `false` se l'accordo era già
 *   completato: il messaggio dedicato va mostrato solo nel primo caso.
 */
async function eseguiAzioneAccordo(token, azione, idAccordo) {
  const percorso = PERCORSI_AZIONE_ACCORDO[azione];
  if (!percorso) {
    throw new Error(`Azione su accordo sconosciuta: ${azione}`);
  }
  const data = await apiFetch(percorso, {
    method: 'POST',
    token,
    body: { id_accordo: idAccordo },
  });
  return {
    messaggio: typeof data?.message === 'string' ? data.message : '',
    stato: data?.data?.stato ?? null,
    creditiAssegnati: data?.data?.crediti_assegnati_ora === true,
  };
}

/** POST Accordi1_a_1/accetta.php — registra la mia accettazione di una proposta. */
export function accettaAccordo(token, idAccordo) {
  return eseguiAzioneAccordo(token, 'accetta', idAccordo);
}

/** POST Accordi1_a_1/avvia.php — porta in esecuzione un accordo accettato da entrambi. */
export function avviaAccordo(token, idAccordo) {
  return eseguiAzioneAccordo(token, 'avvia', idAccordo);
}

/** POST Accordi1_a_1/completa.php — registra il mio completamento (vedi sopra). */
export function completaAccordo(token, idAccordo) {
  return eseguiAzioneAccordo(token, 'completa', idAccordo);
}

/** POST Accordi1_a_1/annulla.php — chiude un accordo proposto o accettato. */
export function annullaAccordo(token, idAccordo) {
  return eseguiAzioneAccordo(token, 'annulla', idAccordo);
}

/** POST Accordi1_a_1/contesta.php — contesta un accordo in esecuzione. */
export function contestaAccordo(token, idAccordo) {
  return eseguiAzioneAccordo(token, 'contesta', idAccordo);
}

/**
 * Mappa azione -> funzione del layer API, con le stesse chiavi di `AZIONI` in
 * `src/accordi/stati.js`: la schermata del dettaglio esegue quello che la logica
 * pura le dice di mostrare, senza uno `switch` sui nomi delle azioni.
 */
export const AZIONI_ACCORDO_API = {
  accetta: accettaAccordo,
  avvia: avviaAccordo,
  completa: completaAccordo,
  annulla: annullaAccordo,
  contesta: contestaAccordo,
};
