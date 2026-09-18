import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Casella di spunta con etichetta.
 *
 * Il valore è un booleano e ha sempre un valore: non esiste lo stato "non
 * scelto". Non si aggiungono librerie di checkbox (§7 di `AGENTS.md`), quindi il
 * componente è un `Pressable` con l'aspetto della casella.
 *
 * Il quadratino e l'etichetta sono due figli dello stesso pulsante: toccare il
 * testo è come toccare la casella, ed è quello che si aspetta chi usa il dito o
 * un lettore di schermo.
 *
 * `aria-checked` viaggia accanto ad `accessibilityState` perché su web
 * `react-native-web` ignora `accessibilityState` e legge solo gli attributi
 * `aria-*`: senza, una casella spuntata verrebbe annunciata come vuota. Su
 * native `react-native` accetta entrambi e `aria-checked` ha la precedenza.
 */
export function AppCheckbox({ label, value, onChange, disabled = false, style }) {
  const t = useTokens();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      aria-checked={value}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          paddingVertical: space.xs,
          borderRadius: radius.input,
          backgroundColor: pressed ? t.border : 'transparent',
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.checkbox,
          borderWidth: 1,
          borderColor: value ? t.primary : t.border,
          backgroundColor: value ? t.primary : t.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {value ? <Ionicons name="checkmark" size={15} color={t.onPrimary} /> : null}
      </View>
      <AppText variant="small" style={{ flex: 1 }}>
        {label}
      </AppText>
    </Pressable>
  );
}
