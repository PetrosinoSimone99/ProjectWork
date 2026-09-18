import { Banner } from './Banner';
import { formatOrarioScadenza } from '@/auth/token-store';

/**
 * Avviso informativo: la sessione sta per scadere.
 *
 * Non ha **nessun pulsante**, ed è una decisione, non una dimenticanza: la
 * sessione non si rinnova (il backend non espone un rinnovo e non è nostro),
 * quindi un pulsante non porterebbe da nessuna parte. Meglio un avviso che dice
 * l'ora, che un comando che non fa niente.
 *
 * Chi decide **quando** mostrarlo è `useScadenzaSessione` (soglia di 5 minuti):
 * qui arriva solo la scadenza e si scrive la frase. `Banner` porta già la
 * regione viva (`accessibilityLiveRegion="polite"`), quindi l'avviso viene
 * annunciato quando compare.
 */
export function AvvisoScadenza({ scadenzaMs }) {
  return (
    <Banner
      kind="info"
      message={`La sessione scade alle ${formatOrarioScadenza(scadenzaMs)}. Se scade dovrai accedere di nuovo.`}
    />
  );
}
