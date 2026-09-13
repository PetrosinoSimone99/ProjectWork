import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { PREFERENZA_TEMA } from '@/theme/theme-store';
import { useThemePreference } from '@/theme/theme-context';
import { radius, space, useTokens } from '@/theme/tokens';

const OPZIONI = [
  { valore: PREFERENZA_TEMA.SISTEMA, etichetta: 'Sistema', icona: 'phone-portrait-outline' },
  { valore: PREFERENZA_TEMA.CHIARO, etichetta: 'Chiaro', icona: 'sunny-outline' },
  { valore: PREFERENZA_TEMA.SCURO, etichetta: 'Scuro', icona: 'moon-outline' },
];

/** Selettore del tema: sistema, chiaro, scuro. */
export function ThemeSelector() {
  const t = useTokens();
  const { preferenza, setPreferenzaTema } = useThemePreference();

  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      {OPZIONI.map((opzione) => {
        const isSelected = preferenza === opzione.valore;
        return (
          <Pressable
            key={opzione.valore}
            accessibilityRole="button"
            accessibilityLabel={`Tema ${opzione.etichetta}`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => setPreferenzaTema(opzione.valore)}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.xs,
              paddingVertical: space.md,
              borderRadius: radius.input,
              borderWidth: 1,
              borderColor: isSelected ? t.primary : t.border,
              backgroundColor: isSelected ? t.serviceBg : pressed ? t.border : 'transparent',
            })}
          >
            <Ionicons
              name={opzione.icona}
              size={18}
              color={isSelected ? t.primary : t.textSecondary}
            />
            <AppText variant="small" tone={isSelected ? 'primary' : 'secondary'}>
              {opzione.etichetta}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
