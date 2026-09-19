import { ChipTono } from './ChipTono';
import { ETICHETTE_STATO, tonoStato } from '@/accordi/stati';

/**
 * Chip dello stato di un accordo, con l'etichetta italiana e il tono decisi da
 * `src/accordi/stati.js`: elenco e dettaglio mostrano così lo stesso stato nello
 * stesso modo, senza duplicare la mappa dei colori (che sta in `ChipTono`).
 */
export function ChipStatoAccordo({ stato }) {
  return (
    <ChipTono tono={tonoStato(stato)}>
      {ETICHETTE_STATO[stato] ?? stato ?? 'Stato sconosciuto'}
    </ChipTono>
  );
}
