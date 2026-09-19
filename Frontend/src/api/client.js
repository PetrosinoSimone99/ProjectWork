import { API_BASE_URL, USA_DATI_FINTI } from './config';

/**
 * Limite di tempo di una singola chiamata, in millisecondi.
 * A un server che non risponde la connessione resta appesa, quindi il `fetch` da
 * solo non basta e serve questo limite. 10 s è più lungo di ogni chiamata reale del
 * progetto (il polling della chat è ogni 4 s, i finti rispondono in 900 ms), quindi
 * non interrompe niente di legittimo: se una chiamata viene tagliata qui è perché
 * il server non risponde davvero. Se il backend nuovo sarà lento, si alza questo
 * valore e basta.
 */
const TIMEOUT_RICHIESTA_MS = 10000;

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
 * l'endpoint con la busta {success, message, data} porta il suo messaggio invece
 * di lasciare l'utente davanti a un testo tecnico.
 */
function messaggioDiErrore(data) {
  const fallback = 'Qualcosa non ha funzionato. Riprova.';
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
  // fin qui è una schermata non ancora coperta — oggi **l'area accordi 1:1**
  // (`accordo.jsx`, `accordi.jsx`, `nuovo-accordo.jsx`), ferma per decisione del
  // titolare. Senza questa guardia quella chiamata partirebbe con il token finto,
  // il backend vero risponderebbe 401 e `client.js` la tratterebbe come **sessione
  // scaduta**, buttando fuori l'utente subito dopo la registrazione (e anche il
  // backend deve essere spento, altrimenti la demo non è usabile). Così invece la
  // schermata dice cosa manca.
  // TODO(demo): sparisce quando i finti coprono anche gli accordi. Il testo resta
  // volutamente corto: la spiegazione tecnica (i dati finti coprono registrazione,
  // «Offro e cerco», home, Loop, Scambi, la chat, i token, la segnalazione alla
  // staff, l'area staff delle segnalazioni e le notifiche in-app) vive in questo
  // commento, non a schermo.
  if (USA_DATI_FINTI) {
    throw new ApiError(501, 'Questa sezione è in arrivo.');
  }

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
