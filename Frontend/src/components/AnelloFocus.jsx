import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useTokens } from '@/theme/tokens';

/** Id dello `<style>` iniettato: una sola regola, aggiornata al cambio di tema. */
const ID_STILE = 'baratto-anello-focus';

/**
 * L'anello di focus da token: 2px del colore `primary` su `:focus-visible`.
 *
 * L'outline di default del browser era invisibile nel tema scuro (1,17:1 su
 * `rgb(27,34,29)`) e violava WCAG 2.4.7 e 1.4.11 (P59): con la sola tastiera
 * non si vedeva dove si fosse. La regola è **globale e unica**: copre bottoni,
 * campi, tab e qualsiasi altro controllo premibile, senza duplicare lo stile
 * componente per componente.
 *
 * È CSS puro iniettato su web (dove il focus lo disegna il browser); su native
 * non serve e il componente non disegna nulla. Il colore viene dai token: al
 * cambio di tema la regola si riscrive da sola.
 */
export function AnelloFocus() {
  const colore = useTokens().primary;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }
    let stile = document.getElementById(ID_STILE);
    if (stile === null) {
      stile = document.createElement('style');
      stile.id = ID_STILE;
      document.head.appendChild(stile);
    }
    stile.textContent = `:focus-visible { outline: 2px solid ${colore}; outline-offset: 2px; }`;
  }, [colore]);

  return null;
}
