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
  // 4.75:1 su `onPrimary` `#0D1F15` (era `#3E9169`, 4.46:1: sotto 4.5, WCAG 1.4.3).
  // Il pressed si scurisce, non si schiarisce: sul tema scuro è "premuto" il
  // tono più basso, e per alzare il rapporto serve che il fondo si alzi.
  primaryPressed: '#42966C',
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
 * Fascia che la barra del menu **web** (`WebNavMenu`) occupa in alto a destra:
 * l'altezza della barra (48) più il suo margine dal bordo (`space.lg`), 64.
 * La barra è `position: fixed` sopra il contenuto, quindi chi sta in alto a
 * destra — il contenuto di `Screen` e gli avvisi in cima di `app/_layout.jsx` —
 * deve tenersi fuori da questa fascia, altrimenti resta coperto. È la stessa
 * misura di `ALTEZZA_BARRA` in `WebNavMenu`: se cambia là, cambia anche qui.
 *
 * Il nome resta legato alla misura storica del pallino: la direzione UX del
 * 2026-11-11 ha sostituito il disco con una barra, e l'altezza non è cambiata,
 * quindi nemmeno questo valore.
 */
export const fasciaPallinoMenuWeb = 48 + space.lg;

/**
 * Larghezza massima della barra del menu **web** (nome + «Aggiorna» + «Menu»),
 * arrotondata per eccesso: misura la regola con cui `Screen` decide se riservare
 * la fascia in cima.
 *
 * La regola era tarata sull'altezza della barra (64) quando la barra conteneva
 * solo nome e menu. Ora che contiene anche il refresh della schermata è lei a
 * poter finire sopra la colonna: si riserva quando il margine che resta fra il
 * bordo della colonna e quello della finestra è più stretto della barra, perché
 * sotto quella soglia la barra entra nella colonna e sopra non ci arriva mai.
 * Se cambia la barra, cambia anche questo numero, e la soglia si sposta da sola.
 */
export const larghezzaBarraMenuWeb = 320;

/**
 * Larghezze massime del layout su schermi larghi. Solo web le applica:
 * `Screen` centra il contenuto su 560; il catalogo della home sale a 720, che è
 * una misura di lettura (una riga di 19 px sta in ~60 caratteri) e non una
 * scelta di larghezza. Le card riempiono la colonna, quindi il bordo destro di
 * una card e quello della colonna sono lo stesso bordo (audit UX F80).
 * Su mobile la larghezza non supera mai il tetto, quindi il layout non cambia.
 *
 * Il valore del catalogo era 1024: a quella larghezza la card si fermava a 712
 * e lasciava 260 px di colonna vuota, cioè tre bordi destri diversi in una
 * schermata sola.
 */
export const layout = { maxContent: 560, maxCatalogo: 720 };

/**
 * Token del tema attivo: segue la preferenza scelta dall'utente (Profilo ->
 * Aspetto), con default "sistema".
 */
export function useTokens() {
  return useThemeScheme() === 'dark' ? dark : light;
}
