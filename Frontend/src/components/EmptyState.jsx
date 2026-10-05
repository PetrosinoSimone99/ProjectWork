import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { space, useTokens } from '@/theme/tokens';

/**
 * I tre stati «niente da mostrare», con una forma diversa ciascuno (dal 5
 * ottobre 2026 prima erano tutti lo stesso blocco con icona al centro):
 *
 * - `dati` (default): l'utente non ha ancora niente di suo («Non hai accordi»).
 *   Icona in cerchio, titolo, descrizione e una CTA che risolve il vuoto.
 * - `non-disponibile`: la funzione non è attiva («Gli accordi non sono ancora
 *   disponibili»). Solo una riga di testo: niente icona, niente CTA, perché
 *   non c'è nulla che l'utente possa fare da qui.
 * - `mercato`: il mercato oggi non offre nulla («Nessuno in questo momento»).
 *   Come `dati`, ma la CTA di default è «Ricarica»: la situazione può cambiare
 *   senza che l'utente pubblichi nulla.
 *
 * La CTA è sempre passata da chi usa il componente (`etichettaAzione` +
 * `onAzione`): EmptyState non inventa azioni. `variante` decide solo la forma.
 */
export function EmptyState({
  icon,
  title,
  description,
  variante = 'dati',
  etichettaAzione = null,
  onAzione = null,
}) {
  const t = useTokens();

  // `non-disponibile`: una riga sola, allineata come il resto del contenuto.
  if (variante === 'non-disponibile') {
    return (
      <View style={{ gap: space.xs, paddingVertical: space.md }}>
        <AppText variant="body" style={{ fontWeight: '600' }}>
          {title}
        </AppText>
        <AppText variant="small" tone="secondary">
          {description}
        </AppText>
      </View>
    );
  }

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
          borderColor: t.borderInput,
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
      {etichettaAzione && onAzione ? (
        // CTA primaria: è l'azione che risolve (o aggiorna) il vuoto.
        <AppButton
          label={etichettaAzione}
          icon={variante === 'mercato' ? 'refresh-outline' : undefined}
          onPress={onAzione}
          style={{ marginTop: space.xs }}
        />
      ) : null}
    </View>
  );
}
