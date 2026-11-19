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

/**
 * Chip pill colorato per etichette (tipo risultato, stato, ecc.).
 *
 * `style` è l'unica leva che il chiamante ha sulla scatola, e serve dove la
 * pillola deve stare in una colonna invece che sopra un blocco: la larghezza la
 * decide il testo, quindi chi la mette in mezza riga deve poterle dire di
 * accorciarsi (`flexShrink`). La forma resta una sola: il chiamante aggiunge una
 * regola di contenimento, non una seconda pillola.
 */
export function Chip({ background, color, style, children }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.xs,
          backgroundColor: background,
          borderRadius: radius.pill,
          paddingHorizontal: space.md,
          paddingVertical: space.xs,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
