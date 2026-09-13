import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { radius, space, useTokens } from '@/theme/tokens';

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
  optionalHint,
}) {
  const t = useTokens();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <AppText variant="small" style={{ fontWeight: '600' }}>
          {label}
        </AppText>
        {optionalHint ? (
          <AppText variant="small" tone="secondary">
            {optionalHint}
          </AppText>
        ) : null}
      </View>
      <View
        style={[
          styles.box,
          {
            backgroundColor: t.surface,
            borderColor: error ? t.danger : focused ? t.primary : t.border,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: t.text }, multiline && styles.multiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.textSecondary}
          secureTextEntry={hidden}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostra password' : 'Nascondi password'}
            onPress={() => setHidden(!hidden)}
            hitSlop={8}
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
        <AppText variant="small" tone="danger">
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
