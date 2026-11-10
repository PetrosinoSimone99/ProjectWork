import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { radius, space, useTokens } from '@/theme/tokens';

/** Bottone pill: stati pressed/loading/disabled sempre espliciti. */
export function AppButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  accessibilityLabel,
  style,
}) {
  const t = useTokens();
  const isDisabled = disabled || loading;

  const palettes = {
    primary: { normal: t.primary, pressed: t.primaryPressed, text: t.onPrimary },
    secondary: { normal: 'transparent', pressed: t.border, text: t.text },
    ghost: { normal: 'transparent', pressed: t.border, text: t.primary },
    danger: { normal: 'transparent', pressed: t.dangerBg, text: t.danger },
  };
  const palette = palettes[variant];

  return (
    <Pressable
      accessibilityRole="button"
      // `aria-disabled`/`aria-busy` viaggiano accanto ad `accessibilityState`
      // perché su web `react-native-web` ignora `accessibilityState` e legge
      // solo gli attributi `aria-*` (parte di P44). Su native `aria-*` ha la
      // precedenza, quindi il valore annunciato è lo stesso ovunque.
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      aria-disabled={isDisabled}
      aria-busy={loading}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? palette.pressed : palette.normal },
        variant === 'secondary' && { borderWidth: 1, borderColor: t.borderInput },
        variant === 'danger' && { borderWidth: 1, borderColor: t.danger },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <>
          {icon ? (
            <AppIcon name={icon} size={17} color={palette.text} style={styles.icon} />
          ) : null}
          <AppText style={{ color: palette.text, fontWeight: '600' }}>{label}</AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  // 0.7 e non 0.55: il grigio del pulsante disabilitato smetteva di dire cosa
  // manca. A 0.7 l'etichetta resta a 3.3:1 nel tema chiaro e 3.6:1 nello scuro,
  // sopra la soglia 3:1 del testo grande e leggibile per chiunque (audit UX F24).
  disabled: { opacity: 0.7 },
  icon: { marginLeft: -space.xs },
});
