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
