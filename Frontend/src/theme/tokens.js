import { useThemeScheme } from './theme-context';

/**
 * Design tokens di Baratto-lo.
 *
 * Palette "forest": verde bosco profondo (fiducia, comunità) + ambra per i crediti.
 * Regola di forma unica in tutta l'app:
 * - card e pannelli -> raggio 16
 * - input           -> raggio 12
 * - bottoni/chip    -> pill (raggio pieno)
 */
const light = {
  background: '#F3F5F1',
  surface: '#FDFDFB',
  border: '#E1E5DD',
  text: '#1C211D',
  textSecondary: '#5D665F',
  primary: '#1F6B4E',
  primaryPressed: '#17553D',
  onPrimary: '#F7FAF8',
  creditBg: '#F6ECDA',
  creditText: '#7E5414',
  serviceBg: '#E3EFE7',
  serviceText: '#1C5B41',
  danger: '#B3372F',
  dangerBg: '#FAE9E7',
  dangerText: '#8F2B24',
  successBg: '#E3EFE7',
  successText: '#1C5B41',
  overlay: 'rgba(0, 0, 0, 0.45)',
};

const dark = {
  background: '#111613',
  surface: '#1B221D',
  border: '#2C352E',
  text: '#EBEFEA',
  textSecondary: '#99A49B',
  primary: '#4EA97F',
  primaryPressed: '#3E9169',
  onPrimary: '#0D1F15',
  creditBg: '#37301B',
  creditText: '#E3B366',
  serviceBg: '#20352A',
  serviceText: '#8CCBAA',
  danger: '#E0716A',
  dangerBg: '#3A221F',
  dangerText: '#F0A29C',
  successBg: '#20352A',
  successText: '#8CCBAA',
  overlay: 'rgba(0, 0, 0, 0.45)',
};

/**
 * Raggi, per ruolo: card e pannelli 16, campi 12, caselle di spunta 6 (un
 * quadratino da ~22 px, che con il raggio dei campi diventerebbe un cerchio),
 * bottoni e chip a pillola.
 */
export const radius = { card: 16, input: 12, checkbox: 6, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/**
 * Token del tema attivo: segue la preferenza scelta dall'utente (Profilo ->
 * Aspetto), con default "sistema".
 */
export function useTokens() {
  return useThemeScheme() === 'dark' ? dark : light;
}
