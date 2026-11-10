import { Ionicons } from '@expo/vector-icons';

/**
 * Icona dell'app, decorativa per default.
 *
 * Un'icona che accompagna un testo non aggiunge informazione: se resta
 * annunciata, lo screen reader legge un glifo di uso privato prima della frase
 * che conta (WCAG 1.1.1, audit UX F22). Con `label` diventa invece un controllo
 * o un'immagine con un nome, e solo allora viene esposta.
 */
export function AppIcon({ name, size = 20, color, style, label }) {
  const decorativa = !label;
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={style}
      accessible={!decorativa}
      accessibilityLabel={label}
      accessibilityElementsHidden={decorativa}
      importantForAccessibility={decorativa ? 'no-hide-descendants' : 'auto'}
      // `react-native-web` legge gli attributi `aria-*`, il nativo gli
      // `accessibility*`: si passano entrambi, come fa `AppButton`.
      aria-hidden={decorativa}
      focusable={false}
    />
  );
}
