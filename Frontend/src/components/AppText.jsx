import { Text } from 'react-native';
import { useTokens } from '@/theme/tokens';

const VARIANTS = {
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, lineHeight: 34 },
  heading: { fontSize: 19, fontWeight: '700', letterSpacing: -0.2, lineHeight: 25 },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
};

/** Testo con gerarchia e colore del tema già applicati. */
export function AppText({ variant = 'body', tone = 'default', style, ...props }) {
  const t = useTokens();
  const colors = {
    default: t.text,
    secondary: t.textSecondary,
    primary: t.primary,
    danger: t.danger,
    onPrimary: t.onPrimary,
    credit: t.creditText,
  };
  return <Text style={[VARIANTS[variant], { color: colors[tone] }, style]} {...props} />;
}
