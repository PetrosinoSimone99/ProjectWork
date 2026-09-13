import { API_BASE_URL } from './config';

/** Errore delle API Baratto-lo: porta con sé lo status HTTP e il messaggio "errore" del backend. */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
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
 * Chiamata fetch condivisa: aggiunge la base URL, invia/riceve JSON,
 * allega il token e converte le risposte di errore in ApiError.
 */
export async function apiFetch(path, options = {}) {
  const { method = 'GET', body, token } = options;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch rifiuta la connessione o la rete è assente.
    throw new ApiError(0, 'Server non raggiungibile. Controlla che il backend sia attivo.');
  }

  // Le API rispondono sempre JSON, ma ci difendiamo da risposte non valide.
  const text = await response.text();
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
    const backendMessage =
      data !== null &&
      typeof data === 'object' &&
      'errore' in data &&
      typeof data.errore === 'string'
        ? data.errore
        : `Errore imprevisto (${response.status}).`;
    throw new ApiError(response.status, backendMessage);
  }

  return data;
}
