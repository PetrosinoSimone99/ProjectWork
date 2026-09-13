import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const PREFERENZA_KEY = 'barattolo.tema';

/** Le uniche preferenze di tema accettate: qualunque altro valore viene ignorato. */
export const PREFERENZA_TEMA = {
  SISTEMA: 'sistema',
  CHIARO: 'chiaro',
  SCURO: 'scuro',
};

export const PREFERENZE_TEMA = Object.values(PREFERENZA_TEMA);

/**
 * Stesso schema di `auth/token-store.js`: SecureStore su native, localStorage sul
 * web. Non è un segreto, ma evita di aggiungere una dipendenza solo per salvarlo.
 */
const storage =
  Platform.OS === 'web'
    ? {
        getItem: (key) =>
          Promise.resolve(
            typeof window === 'undefined' ? null : window.localStorage.getItem(key),
          ),
        setItem: (key, value) => {
          if (typeof window === 'undefined') {
            return Promise.resolve();
          }
          return Promise.resolve(window.localStorage.setItem(key, value));
        },
      }
    : {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
      };

export function isPreferenzaTemaValida(valore) {
  return PREFERENZE_TEMA.includes(valore);
}

/** Preferenza salvata, oppure `null` se assente o non riconosciuta. */
export async function loadThemePreference() {
  const valore = await storage.getItem(PREFERENZA_KEY);
  return isPreferenzaTemaValida(valore) ? valore : null;
}

export async function saveThemePreference(preferenza) {
  if (!isPreferenzaTemaValida(preferenza)) {
    throw new Error(`Preferenza tema non supportata: ${String(preferenza)}`);
  }
  await storage.setItem(PREFERENZA_KEY, preferenza);
}
