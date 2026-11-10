import { Text } from 'react-native';
import { useTokens } from '@/theme/tokens';

/**
 * La scala tipografica, una volta sola.
 *
 * Ogni variante è un **ruolo**, non una misura: se una schermata ha bisogno di
 * un corpo diverso, il corpo manca qui e va aggiunto qui (audit UX F37). Le
 * varianti che aprono una sezione di contenuto sono anche `header`, così la
 * gerarchia disegnata ha un corrispondente programmatico e uno screen reader
 * può saltare da un titolo all'altro (WCAG 1.3.1, audit UX F19).
 */
const VARIANTS = {
  display: { fontSize: 30, fontWeight: '700', letterSpacing: -0.6, lineHeight: 36 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, lineHeight: 34 },
  heading: { fontSize: 19, fontWeight: '700', letterSpacing: -0.2, lineHeight: 25 },
  subheading: { fontSize: 17, fontWeight: '700', letterSpacing: -0.1, lineHeight: 23 },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
};

/** Le varianti che sono un titolo: ruolo `header` di default (WCAG 1.3.1). */
const HEADING_VARIANTS = new Set(['display', 'title', 'heading', 'subheading']);

/**
 * Testo con gerarchia e colore del tema già applicati.
 *
 * `accessibilityRole` si può sempre sovrascrivere dal chiamante: una variante
 * `heading` usata per una riga che non apre niente (`accessibilityRole: 'text'`) non deve diventare un titolo.
 */
export function AppText({ variant = 'body', tone = 'default', style, ...props }) {
  const t = useTokens();
  const colors = {
    default: t.text,
    secondary: t.textSecondary,
    primary: t.primary,
    danger: t.danger,
    onPrimary: t.onPrimary,
    accent: t.accentText,
  };
  return (
    <Text
      accessibilityRole={HEADING_VARIANTS.has(variant) ? 'header' : undefined}
      style={[VARIANTS[variant], { color: colors[tone] }, style]}
      {...props}
    />
  );
}
