import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { space, useTokens } from '@/theme/tokens';

/** Stato vuoto curato: icona, titolo e suggerimento su come proseguire. */
export function EmptyState({ icon, title, description }) {
  const t = useTokens();
  return (
    <View
      style={{
        alignItems: 'center',
        gap: space.sm,
        paddingVertical: space.xxl,
        paddingHorizontal: space.xl,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          backgroundColor: t.surface,
          borderWidth: 1,
          borderColor: t.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={26} color={t.textSecondary} />
      </View>
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText variant="small" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
        {description}
      </AppText>
    </View>
  );
}
