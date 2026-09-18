import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        variant === 'secondary' && { borderWidth: 1, borderColor: t.border },
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
            <Ionicons name={icon} size={17} color={palette.text} style={styles.icon} />
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
  disabled: { opacity: 0.55 },
  icon: { marginLeft: -space.xs },
});
