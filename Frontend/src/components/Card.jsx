import { View } from 'react-native';
import { radius, space, useTokens } from '@/theme/tokens';

/** Card base: superficie tema, bordo sottile, raggio 16, padding e gap interni. */
export function Card({ style, ...props }) {
  const t = useTokens();
  return (
    <View
      style={[
        {
          backgroundColor: t.surface,
          borderColor: t.border,
          borderWidth: 1,
          borderRadius: radius.card,
          padding: space.lg,
          gap: space.md,
        },
        style,
      ]}
      {...props}
    />
  );
}

/** Chip pill colorato per etichette (tipo risultato, stato, ecc.). */
export function Chip({ background, color, children }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
        backgroundColor: background,
        borderRadius: radius.pill,
        paddingHorizontal: space.md,
        paddingVertical: space.xs,
        alignSelf: 'flex-start',
      }}
    >
      {children}
    </View>
  );
}
