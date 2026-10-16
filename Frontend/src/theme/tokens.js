import { useThemeScheme } from './theme-context';

/**
 * Design tokens di Baratto-lo.
 *
 * Palette "forest": verde bosco profondo (fiducia, comunità) + ambra come accento
 * secondario (la riga del token e lo stato «in corso»).
 * Regola di forma unica in tutta l'app:
 * - card e pannelli -> raggio 16
 * - input           -> raggio 12
 * - bottoni/chip    -> pill (raggio pieno)
 *
 * Bordo di controllo e bordo decorativo sono due token diversi (dal 5 ottobre
 * 2026): WCAG 1.4.11 chiede ≥ 3:1 per il confine che identifica un controllo
 * (campi, selettori, caselle di spunta, bottoni con contorno), mentre il bordo
 * delle card è decorativo e resta delicato. `borderInput` vale ≥ 3:1 su
 * `surface` e su `background` in entrambi i temi — gli stati pressed
 * dei controlli usano `token.border` come sfondo e non cambiano.
 */
const light = {
  background: '#F3F5F1',
  surface: '#FDFDFB',
  border: '#E1E5DD',
  // Bordo dei controlli: 3.62:1 su surface, 3.36:1 su background (WCAG 1.4.11).
  borderInput: '#84867F',
  text: '#1C211D',
  textSecondary: '#5D665F',
  primary: '#1F6B4E',
  primaryPressed: '#17553D',
  onPrimary: '#F7FAF8',
  accentBg: '#F6ECDA',
  accentText: '#7E5414',
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
  // Bordo dei controlli: 3.35:1 su surface, 3.77:1 su background (WCAG 1.4.11).
  borderInput: '#6E736C',
  text: '#EBEFEA',
  textSecondary: '#99A49B',
  primary: '#4EA97F',
  primaryPressed: '#3E9169',
  onPrimary: '#0D1F15',
  accentBg: '#37301B',
  accentText: '#E3B366',
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

/**
 * Bersaglio di tocco minimo, in pt: la regola di accessibilità CT06 dice che
 * ogni controllo premibile è alto e largo almeno `target.min`.
 */
export const target = { min: 44 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/**
 * Colore dell'ombra: uguale nei due temi (un'ombra bianca non esiste in
 * natura), quindi sta fuori dalle palette accanto a `radius`/`space` e non
 * dentro `light`/`dark`. L'opacità la decide chi la usa (`shadowOpacity`).
 */
export const ombra = '#000000';

/**
 * Fascia che il pallino del menu **web** (`MenuNavigazioneWeb`) occupa in alto a
 * destra: il lato del pallino (48) più il suo margine dal bordo (`space.lg`), 64.
 * Il pallino è `position: fixed` sopra il contenuto, quindi chi sta in alto a
 * destra — il contenuto di `Screen` e gli avvisi in cima di `app/_layout.jsx` —
 * deve tenersi fuori da questa fascia, altrimenti resta coperto. È la stessa
 * misura di `DIMENSIONE_PALLINO` in `MenuNavigazioneWeb`: se cambia là, cambia
 * anche qui.
 */
export const fasciaPallinoMenuWeb = 48 + space.lg;

/**
 * Larghezze massime del layout su schermi larghi. Solo web le applica:
 * `Screen` centra il contenuto su 560, il catalogo della home sale a 1024.
 * Su mobile la larghezza non supera mai il tetto, quindi il layout non cambia.
 */
export const layout = { maxContent: 560, maxCatalogo: 1024 };

/**
 * Token del tema attivo: segue la preferenza scelta dall'utente (Profilo ->
 * Aspetto), con default "sistema".
 */
export function useTokens() {
  return useThemeScheme() === 'dark' ? dark : light;
}
