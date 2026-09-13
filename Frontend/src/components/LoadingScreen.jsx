import { ActivityIndicator, View } from 'react-native';
import { AppText } from './AppText';
import { space, useTokens } from '@/theme/tokens';

/** Schermata di caricamento (avvio app, attesa sessione). */
export function LoadingScreen({ label = 'Caricamento…' }) {
  const t = useTokens();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.md,
      }}
    >
      <ActivityIndicator size="large" color={t.primary} />
      <AppText variant="small" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}
