import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { radius, target, useTokens } from '@/theme/tokens';

/**
 * Il tasto «Torna indietro» delle schermate di dettaglio. È un componente
 * unico perché il bersaglio di tocco (CT06, 44pt) sia corretto ovunque: prima
 * il blocco era copiato dieci volte ed era da 40×40.
 *
 * Il comportamento di default è `router.back()`; dove il ritorno ha una regola
 * propria (accordo e nuovo-accordo) si passa `onPress`.
 */
export function BottoneIndietro({ onPress }) {
  const t = useTokens();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Torna indietro"
      onPress={onPress ?? (() => router.back())}
      hitSlop={8}
      style={({ pressed }) => ({
        width: target.min,
        height: target.min,
        borderRadius: radius.pill,
        backgroundColor: pressed ? t.border : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Ionicons name="arrow-back" size={22} color={t.text} />
    </Pressable>
  );
}
