import { useId, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { radius, space, target, useTokens } from '@/theme/tokens';

/** Campo con etichetta SOPRA, errore SOTTO, focus visibile e toggle password. */
export function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  maxLength,
  editable,
  optionalHint,
  contatore,
  returnKeyType,
  onSubmitEditing,
}) {
  const t = useTokens();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);
  // L'etichetta visibile è un `AppText` fratello dell'input: senza un nome
  // esplicito il campo veniva annunciato con il suo placeholder (audit UX F14).
  // `accessibilityLabel` copre tutte le piattaforme, `aria-describedby` lega
  // l'errore al campo sul web e `nativeID`/`id` lo rendono unico nella pagina.
  const idCampo = `campo-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const idErrore = `${idCampo}-errore`;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <AppText variant="small" style={{ fontWeight: '600' }}>
          {label}
        </AppText>
        {contatore || optionalHint ? (
          <AppText variant="small" tone="secondary">
            {contatore ?? optionalHint}
          </AppText>
        ) : null}
      </View>
      <View
        style={[
          styles.box,
          {
            backgroundColor: t.surface,
            // Bordo di controllo: `borderInput` garantisce ≥ 3:1 (WCAG 1.4.11).
            borderColor: error ? t.danger : focused ? t.primary : t.borderInput,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: t.text }, multiline && styles.multiline]}
          accessibilityLabel={label}
          nativeID={idCampo}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idErrore : undefined}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.textSecondary}
          secureTextEntry={hidden}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostra password' : 'Nascondi password'}
            onPress={() => setHidden(!hidden)}
            hitSlop={8}
            // Bersaglio di tocco CT06 (P60): l'icona da 20px non basta.
            style={({ pressed }) => ({
              minWidth: target.min,
              minHeight: target.min,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={t.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="small" tone="danger" nativeID={idErrore}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space.xs },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.input,
    paddingHorizontal: space.md,
  },
  input: { flex: 1, minHeight: 48, fontSize: 15, paddingVertical: space.sm },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
});
