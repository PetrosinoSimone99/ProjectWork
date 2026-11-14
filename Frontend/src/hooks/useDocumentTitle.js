import { useEffect } from 'react';
import { Platform } from 'react-native';
import { titoloDocumento } from '@/navigation/screen-titles';

/**
 * Tiene `document.title` allineato alla rotta in focus.
 *
 * Solo web: da nativo il titolo del documento non esiste, e la schermata si
 * riconosce dalla sua intestazione. La mappa dei nomi sta in
 * `navigation/screen-titles.js`; qui c'è solo la scrittura.
 */
export function useDocumentTitle(pathname) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }
    document.title = titoloDocumento(pathname);
  }, [pathname]);
}
