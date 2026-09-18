import { API_BASE_URL, USA_DATI_FINTI } from './config';

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
 * Messaggio da mostrare all'utente quando la risposta non e' ok.
 * Le API del progetto usano due chiavi per lo stesso ruolo: "errore" (ricerca,
 * richieste, inviti) e "message" (Accordi1_a_1). Si accettano entrambe, cosi'
 * un endpoint nuovo con la busta {success, message, data} non finisce con un
 * generico "Errore imprevisto (403)" al posto del suo messaggio.
 */
function messaggioDiErrore(data, status) {
  const fallback = `Errore imprevisto (${status}).`;
  if (data === null || typeof data !== 'object') {
    return fallback;
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

  // Con i dati finti attivi la demo **non deve raggiungere il backend vero**: le
  // schermate già portate al modello nuovo non passano di qui (il bivio è in
  // `barattolo.js`, che risponde con `finti/*`), quindi una chiamata che arriva
  // fin qui è una schermata non ancora coperta. Senza questa guardia quella
  // chiamata partirebbe con il token finto, il backend vero risponderebbe 401 e
  // `client.js` la tratterebbe come **sessione scaduta**, buttando fuori
  // l'utente subito dopo la registrazione (e anche il backend deve essere spento,
  // altrimenti la demo non è usabile). Così invece la schermata dice cosa manca.
  // TODO(demo): sparisce quando i finti coprono tutte le schermate (5–7).
  if (USA_DATI_FINTI) {
    throw new ApiError(
      501,
      'Questa parte non è ancora nella demo: i dati finti coprono registrazione, «Offro e cerco», home, Loop e Scambi.',
    );
  }

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
    throw new ApiError(response.status, messaggioDiErrore(data, response.status));
  }

  return data;
}
