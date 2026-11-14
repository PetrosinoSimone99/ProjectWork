import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Allinea al tema attivo le superfici che disegna il browser e non l'app.
 *
 * `color-scheme` sul documento è l'unica riga che raggiunge tutte insieme: la
 * barra di scorrimento (nel tema scuro restava una pista quasi bianca a fianco
 * di una colonna scura — la barra è chrome del browser, non un componente, e
 * nessun token la toccava: audit UX F19), il cursore di testo, le tendine native
 * e i controlli dei moduli. È la stessa riga che il `DESIGN.md` chiama
 * "superfici del browser".
 *
 * Perché non in `+html.jsx`: lì il tema non è ancora noto (lo decide la
 * preferenza salvata, letta dopo il primo render) e `prefers-color-scheme`
 * segue il sistema, non la scelta dell'utente — chi ha scelto «chiaro» su un
 * sistema scuro si ritroverebbe le barre scure su una pagina chiara.
 *
 * Solo web, e senza toccare il tema: se il browser non espone `style` sul
 * documento non succede niente.
 */
export function useWebColorScheme(schema) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }
    document.documentElement.style.colorScheme = schema === 'dark' ? 'dark' : 'light';
  }, [schema]);
}
