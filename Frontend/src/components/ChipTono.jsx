import { AppText } from './AppText';
import { Chip } from './Card';
import { useTokens } from '@/theme/tokens';

/**
 * Il chip con il tono del tema: una mappa sola (`tono -> colori`) per tutti i
 * chip dell'app, così lo stato di un accordo, di una segnalazione, di un utente o
 * di un'azione non si colorano in tre modi diversi.
 *
 * I toni sono nomi semantici, non colori: `info` (neutro), `service`, `accent`,
 * `success`, `danger`. `tonoStato`/`tonoRuolo` di `src/servizi/*` restituiscono
 * questi nomi, e un tono sconosciuto cade su `info` invece di lasciare il chip
 * senza colore.
 *
 * Il testo, quando è una stringa, prende la variante `caption` (maiuscoletto):
 * è la forma di tutti i chip esistenti. Un figlio già composto passa così com'è.
 */
const PALETTE = {
  info: (t) => ({ background: t.background, color: t.textSecondary }),
  service: (t) => ({ background: t.serviceBg, color: t.serviceText }),
  accent: (t) => ({ background: t.accentBg, color: t.accentText }),
  success: (t) => ({ background: t.successBg, color: t.successText }),
  danger: (t) => ({ background: t.dangerBg, color: t.dangerText }),
};

export function ChipTono({ tono = 'info', children }) {
  const t = useTokens();
  const scelta = PALETTE[tono] ?? PALETTE.info;
  const palette = scelta(t);

  return (
    <Chip background={palette.background}>
      {typeof children === 'string' ? (
        <AppText variant="caption" style={{ color: palette.color }}>
          {children}
        </AppText>
      ) : (
        children
      )}
    </Chip>
  );
}
