import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Percorso degli endpoint sotto la radice del server PHP (`php -S -t <radice>`). */
const API_PATH = '/API';

/** Radice di XAMPP/Laragon: vale solo quando non è configurato nulla. */
const XAMPP_ORIGIN =
  Platform.OS === 'android' ? 'http://10.0.2.2' : 'http://localhost';

/**
 * Porta del server PHP locale, impostata in `.env.local` con
 * `EXPO_PUBLIC_API_PORT=8000`.
 *
 * Impostandola non si scrive più a mano l'indirizzo: l'host lo ricaviamo dal dev
 * server Expo, cioè lo stesso computer che serve le API e che nell'app è già
 * noto. Così l'indirizzo resta giusto anche quando cambia la rete (Wi-Fi di
 * scuola, hotspot del telefono, emulatore), senza toccare nessun file.
 */
const API_PORT = process.env.EXPO_PUBLIC_API_PORT;

/**
 * Host del dev server Expo: la macchina da cui l'app ha caricato il bundle.
 * `hostUri` ha la forma `192.168.1.12:8081`, quindi qui resta solo l'host.
 * In produzione, o con `npx expo start --tunnel`, non è l'host delle API: in
 * quei due casi serve `EXPO_PUBLIC_API_URL`.
 */
function hostDevServer() {
  const hostUri = Constants.expoConfig?.hostUri;
  return hostUri ? hostUri.split(':')[0] : null;
}

/**
 * Porta del dev server Expo (Metro), ricavata da `hostUri` nella forma `host:porta`.
 * Serve solo a riconoscere un errore di configurazione: le API non possono stare
 * sulla stessa porta del dev server.
 */
function portaDevServer() {
  const hostUri = Constants.expoConfig?.hostUri;
  return hostUri ? (hostUri.split(':')[1] ?? null) : null;
}

/** Host su cui cercare le API locali: sul web quello della pagina, altrove il dev server. */
function hostApiLocale() {
  if (Platform.OS === 'web') {
    return typeof window === 'undefined' ? null : window.location.hostname;
  }

  const host = hostDevServer();
  if (host === null) {
    return null;
  }
  // Sull'emulatore Android "localhost" è l'emulatore stesso: il computer che lo
  // ospita si raggiunge con 10.0.2.2, qualunque sia il suo indirizzo di rete.
  const senzaNome = host === 'localhost' || host === '127.0.0.1';
  return Platform.OS === 'android' && senzaNome ? '10.0.2.2' : host;
}

/**
 * URL base delle API, in ordine di priorità:
 *
 * 1. `EXPO_PUBLIC_API_URL` (`.env.local`) — indirizzo esplicito, vince sempre:
 *    serve per il deploy, per `--tunnel` e per i casi in cui il dev server non
 *    sta sulla stessa macchina delle API.
 * 2. `EXPO_PUBLIC_API_PORT` (`.env.local`) — host ricavato dal dev server e
 *    porta fissa: è la configurazione per lo sviluppo locale.
 * 3. nessuna variabile — il percorso di XAMPP (`ProgettoITS_Web/API`), la
 *    strada dei colleghi, che non richiede `.env.local`.
 */
function baseUrlApi() {
  const urlEsplicita = process.env.EXPO_PUBLIC_API_URL;
  if (urlEsplicita) {
    return urlEsplicita;
  }

  if (API_PORT) {
    // La porta del dev server non può essere quella delle API: se coincide, il
    // valore è sbagliato o (più spesso) è rimasto impostato nel terminale, dove
    // ha la precedenza su .env.local. Meglio dirlo che farlo fallire in silenzio.
    if (String(API_PORT) === portaDevServer()) {
      console.warn(
        `EXPO_PUBLIC_API_PORT è ${API_PORT}, cioè la porta del dev server Expo: ` +
          'le API stanno su un\'altra porta (8000 con `php -S`). Una variabile impostata ' +
          'nel terminale vince su .env.local: toglila da lì o correggila qui.',
      );
    }

    const host = hostApiLocale();
    if (host) {
      return `http://${host}:${API_PORT}${API_PATH}`;
    }
    console.warn(
      'EXPO_PUBLIC_API_PORT è impostata, ma non riesco a ricavare l\'host del dev server: ' +
        'imposta EXPO_PUBLIC_API_URL in .env.local.',
    );
  }

  return `${XAMPP_ORIGIN}/ProgettoITS_Web${API_PATH}`;
}

export const API_BASE_URL = baseUrlApi();
