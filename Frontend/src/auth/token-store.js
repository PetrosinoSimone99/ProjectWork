import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'barattolo.token';
const USER_KEY = 'barattolo.utente';

/**
 * Su Android/iOS il token vive in SecureStore (keystore cifrata del dispositivo).
 * Sul web SecureStore non esiste: usiamo localStorage; il token dura comunque 1 ora.
 */
const storage =
  Platform.OS === 'web'
    ? {
        getItem: (key) => Promise.resolve(window.localStorage.getItem(key)),
        setItem: (key, value) => Promise.resolve(window.localStorage.setItem(key, value)),
        deleteItem: (key) => Promise.resolve(window.localStorage.removeItem(key)),
      }
    : {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        deleteItem: (key) => SecureStore.deleteItemAsync(key),
      };

/** Recupera la sessione salvata, se esiste ed è leggibile. */
export async function loadSession() {
  const token = await storage.getItem(TOKEN_KEY);
  const rawUser = await storage.getItem(USER_KEY);
  if (!token || !rawUser) {
    return null;
  }
  try {
    const utente = JSON.parse(rawUser);
    return { token, utente };
  } catch {
    return null;
  }
}

export async function saveSession(session) {
  await storage.setItem(TOKEN_KEY, session.token);
  await storage.setItem(USER_KEY, JSON.stringify(session.utente));
}

export async function clearSession() {
  await storage.deleteItem(TOKEN_KEY);
  await storage.deleteItem(USER_KEY);
}

/**
 * Il payload del token e' base64(JSON { id, exp }): la scadenza si puo' verificare
 * lato client senza chiamare il server. Restituisce i secondi UNIX di scadenza.
 */
export function tokenExpiresAt(token) {
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = globalThis.atob(normalized);
    const data = JSON.parse(json);
    return typeof data.exp === 'number' ? data.exp : null;
  } catch {
    return null;
  }
}

/**
 * La scadenza come ora leggibile ("17:20"), da una scadenza in **millisecondi**
 * (la stessa unita' di `scadenzaMs` nel layer API). Sta qui perche' e' l'unico
 * posto in cui si legge `exp`: due copie della stessa formattazione divergono.
 */
export function formatOrarioScadenza(scadenzaMs) {
  return new Date(scadenzaMs).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * True solo se il token non e' scaduto. Un payload assente o illeggibile conta
 * come invalido: meglio un logout pulito all'avvio che una sessione accettata
 * per errore e fatta cadere dalla prima chiamata autenticata (401).
 */
export function isTokenValid(token) {
  const expiresAt = tokenExpiresAt(token);
  if (expiresAt === null) {
    return false;
  }
  return expiresAt * 1000 > Date.now();
}
