import { API_BASE_URL } from './config';

/**
 * Limite di tempo di una singola chiamata, in millisecondi.
 * A un server che non risponde la connessione resta appesa, quindi il `fetch` da
 * solo non basta e serve questo limite. 10 s è più lungo di ogni chiamata reale del
 * progetto, quindi
 * non interrompe niente di legittimo: se una chiamata viene tagliata qui è perché
 * il server non risponde davvero. Se il backend nuovo sarà lento, si alza questo
 * valore e basta.
 */
const TIMEOUT_RICHIESTA_MS = 10000;

/** Errore delle API Baratto-lo: porta con sé lo status HTTP e il messaggio di errore del backend. */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * `true` quando l'endpoint chiamato **non esiste ancora** (404 su una rotta
 * assente): non è
 * un guasto e non è riprovabile. Le schermate in questa condizione mostrano il
 * **vuoto dichiarato** alla maniera di «Offro e cerco» — un EmptyState senza
 * «Riprova» — invece di «errore + Riprova» (P61).
 */
export function isEndpointNonDisponibile(err) {
  return err instanceof ApiError && (err.status === 404 || err.status === 501);
}

/**
 * Gestore chiamato quando una richiesta autenticata riceve 401:
 * la sessione non e' piu' valida (scaduta o revocata) e l'utente va
 * rimandato al login. Registrato dall'AuthProvider all'avvio.
 */
let onSessionExpired = null;

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

/**
 * Messaggio da mostrare all'utente quando la risposta non e' ok.
 * Il backend Symfony manda la busta {"error": "<testo inglese>"}: si legge per
 * prima. Le chiavi vecchie restano per le chiamate non ancora portate al
 * backend vecchio, non perche' il backend vero le mandi.
 * Cosi' ogni endpoint porta il suo messaggio invece di lasciare l'utente
 * davanti a un testo tecnico.
 */
function messaggioDiErrore(data) {
  const fallback = 'Qualcosa non ha funzionato. Riprova.';
  if (data === null || typeof data !== 'object') {
    return fallback;
  }
  if (typeof data.error === 'string' && data.error) {
    return data.error;
  }
  if (typeof data.errore === 'string' && data.errore) {
    return data.errore;
  }
  if (typeof data.message === 'string' && data.message) {
    return data.message;
  }
  return fallback;
}

/**
 * Chiamata fetch condivisa: aggiunge la base URL, invia/riceve JSON,
 * allega il token e converte le risposte di errore in ApiError.
 */
export async function apiFetch(path, options = {}) {
  const { method = 'GET', body, token } = options;

  // Il timer annulla la chiamata se nessuno risponde entro il limite: senza, una
  // connessione che resta appesa non produce né risposta né errore.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_RICHIESTA_MS);

  let response;
  let text;
  try {
    response = await fetch(`${API_BASE_URL}/${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    text = await response.text();
  } catch (errore) {
    // Due casi distinti: la connessione viene rifiutata o la rete è assente
    // (fetch rifiuta subito), oppure il server non risponde e ci pensa il timer.
    throw new ApiError(
      0,
      errore?.name === 'AbortError'
        ? 'Il servizio sta impiegando troppo tempo. Riprova.'
        : 'Qualcosa non ha funzionato. Riprova.',
    );
  } finally {
    // La risposta è arrivata (o l'errore è già in mano al chiamante): il timer non serve più.
    clearTimeout(timer);
  }

  // Le API rispondono sempre JSON, ma ci difendiamo da risposte non valide.
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    // 401 con token allegato = sessione scaduta o revocata: il provider sbroglia.
    if (response.status === 401 && token && onSessionExpired) {
      onSessionExpired();
    }
    throw new ApiError(response.status, messaggioDiErrore(data));
  }

  return data;
}
