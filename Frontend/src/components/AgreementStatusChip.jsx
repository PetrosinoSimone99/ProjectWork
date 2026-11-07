import { ToneChip } from './ToneChip';
import { ETICHETTE_STATO, tonoStato } from '@/agreements/states';

/**
 * Chip dello stato di un accordo, con l'etichetta italiana e il tono decisi da
 * `src/agreements/states.js`: elenco e dettaglio mostrano così lo stesso stato nello
 * stesso modo, senza duplicare la mappa dei colori (che sta in `ToneChip`).
 */
export function AgreementStatusChip({ stato }) {
  return (
    <ToneChip tono={tonoStato(stato)}>
      {ETICHETTE_STATO[stato] ?? stato ?? 'Stato sconosciuto'}
    </ToneChip>
  );
}
