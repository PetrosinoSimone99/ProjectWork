import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';
import {
  PREFERENZA_TEMA,
  isPreferenzaTemaValida,
  loadThemePreference,
  saveThemePreference,
} from './theme-store';

const ThemeContext = createContext(null);

/**
 * Valore da passare ad `Appearance.setColorScheme` per tornare al tema del
 * dispositivo. Da RN 0.86 `null` non è più accettato: il parametro nativo su
 * Android è non-nullable e `null` fa crashare il TurboModule.
 */
const SCHEMA_NATIVO_SISTEMA = 'unspecified';

/** Il tema attivo è "chiaro" o "scuro"; la preferenza può essere anche "sistema". */
function risolviSchema(preferenza, schemaDiSistema) {
  if (preferenza === PREFERENZA_TEMA.SISTEMA) {
    return schemaDiSistema === 'dark' ? 'dark' : 'light';
  }
  return preferenza === PREFERENZA_TEMA.SCURO ? 'dark' : 'light';
}

/**
 * Tema dell'app: chiaro, scuro o come il dispositivo (default).
 *
 * La preferenza vive qui e non nei singoli componenti: `useTokens()` legge da
 * questo provider, quindi cambiarla ridipinge tutta l'app.
 */
export function ThemeProvider({ children }) {
  const schemaDiSistema = useColorScheme();
  const [preferenza, setPreferenza] = useState(PREFERENZA_TEMA.SISTEMA);
  const [ready, setReady] = useState(false);

  // Preferenza salvata: si legge una volta sola, all'avvio.
  useEffect(() => {
    let active = true;
    loadThemePreference()
      .then((salvata) => {
        if (active && salvata) {
          setPreferenza(salvata);
        }
      })
      .catch((error) => {
        // Lo storage non è indispensabile: si resta sul tema di sistema.
        console.warn('Impossibile leggere la preferenza del tema.', error);
      })
      .finally(() => {
        if (active) {
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const schema = risolviSchema(preferenza, schemaDiSistema);

  // Su Android/iOS la preferenza deve valere anche per i componenti nativi
  // (tastiera, modali, barra di stato): `'unspecified'` rimette il tema di
  // sistema. react-native-web non implementa `Appearance.setColorScheme`, ma sul
  // web bastano i token gestiti da questo provider.
  useEffect(() => {
    if (!ready || typeof Appearance.setColorScheme !== 'function') {
      return;
    }
    Appearance.setColorScheme(
      preferenza === PREFERENZA_TEMA.SISTEMA ? SCHEMA_NATIVO_SISTEMA : schema,
    );
  }, [preferenza, ready, schema]);

  const setPreferenzaTema = useCallback((next) => {
    if (!isPreferenzaTemaValida(next)) {
      return;
    }
    setPreferenza(next);
    saveThemePreference(next).catch((error) => {
      console.warn('Impossibile salvare la preferenza del tema.', error);
    });
  }, []);

  const value = useMemo(
    () => ({ preferenza, schema, ready, setPreferenzaTema }),
    [preferenza, schema, ready, setPreferenzaTema],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Preferenza corrente + setter. Lancia se usato fuori da `ThemeProvider`. */
export function useThemePreference() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemePreference deve essere usato dentro <ThemeProvider>.');
  }
  return context;
}

/**
 * Schema attivo ("light" / "dark"). Se il provider non è montato si ricade sul
 * tema di sistema, così i componenti restano utilizzabili anche da soli.
 */
export function useThemeScheme() {
  const context = useContext(ThemeContext);
  const schemaDiSistema = useColorScheme();
  if (context) {
    return context.schema;
  }
  return schemaDiSistema === 'dark' ? 'dark' : 'light';
}
