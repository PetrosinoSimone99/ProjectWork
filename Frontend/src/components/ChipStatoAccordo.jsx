import { AppText } from './AppText';
import { Chip } from './Card';
import { ETICHETTE_STATO, tonoStato } from '@/accordi/stati';
import { useTokens } from '@/theme/tokens';

/**
 * Chip dello stato di un accordo, con l'etichetta italiana e il tono decisi da
 * `src/accordi/stati.js`: elenco e dettaglio mostrano così lo stesso stato nello
 * stesso modo, senza duplicare la mappa dei colori.
 */
export function ChipStatoAccordo({ stato }) {
  const t = useTokens();
  const palette = {
    info: { background: t.background, color: t.textSecondary },
    service: { background: t.serviceBg, color: t.serviceText },
    credit: { background: t.creditBg, color: t.creditText },
    success: { background: t.successBg, color: t.successText },
    danger: { background: t.dangerBg, color: t.dangerText },
  }[tonoStato(stato)];

  return (
    <Chip background={palette.background}>
      <AppText variant="caption" style={{ color: palette.color }}>
        {ETICHETTE_STATO[stato] ?? stato ?? 'Stato sconosciuto'}
      </AppText>
    </Chip>
  );
}
