import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { opacity, radius, space, useTokens } from '@/theme/tokens';

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
    // Same red words and icon, no outline: a destructive action stays
    // recognisable without being the loudest control in a row of calm content
    // (ux-audit-2026-11-15, P1 on NotificationRow).
    dangerGhost: { normal: 'transparent', pressed: t.dangerBg, text: t.danger },
  };
  const palette = palettes[variant] ?? palettes.primary;

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
          {/* L'etichetta può andare a capo. Il clamp a una riga che stava qui
              (audit UX F71/F83) troncava il testo a scala 200%, dove la parola
              non ci sta più larga: la pillola cresce in altezza (`minHeight`,
              non altezza fissa) e il testo resta centrato. Quanto spazio dare a
              ogni comando lo decide chi li dispone, non il bottone. */}
          <AppText style={{ color: palette.text, fontWeight: '600', textAlign: 'center' }}>
            {label}
          </AppText>
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
  // Il valore è in `theme/tokens.js` (`opacity.disabled`): era 0.7 qui e 0.55
  // in quattro altri componenti, cioè lo stesso stato disegnato in due modi
  // (audit UX F15).
  disabled: { opacity: opacity.disabled },
  icon: { marginLeft: -space.xs },
});
