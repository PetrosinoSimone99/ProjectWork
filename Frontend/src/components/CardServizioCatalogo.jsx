import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { nomeCategoria, nomePersona } from '@/servizi/offerta-ricerca';
import { space, useTokens } from '@/theme/tokens';

/**
 * La card di un servizio del catalogo della home: categoria, mansione, modalità
 * (scritta sempre), località dell'annuncio e autore.
 *
 * Non riusa `CardVoceServizio`, che è la card delle **proprie** voci (tipo, stato
 * e le tre azioni di gestione): un componente che fa due mestieri non ne fa bene
 * nessuno. Qui non ci sono tariffe in crediti (il modello non le ha più) e non
 * c'è nessun caso «è il tuo annuncio», perché nel catalogo arrivano solo i
 * servizi degli altri.
 *
 * Solo dati e callback: nessuno stato proprio, nessuna chiamata di rete.
 */
export function CardServizioCatalogo({ servizio, categorie = [], onPress }) {
  const t = useTokens();

  // Senza id la card si disegna ma non apre niente: mai una richiesta con
  // `id: undefined` (lezione di P37). Con `catalogo.php` che restituisce l'id,
  // questo caso è un'anomalia da segnalare.
  const apribile = Number.isInteger(servizio.id);
  const categoria = nomeCategoria(categorie, servizio.idCategoria) ?? 'Categoria non disponibile';
  const mansione = servizio.mansione.trim() || 'Mansione non indicata';
  const autore = nomePersona(servizio.offerente);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Apri il servizio: ${mansione}`}
      accessibilityState={{ disabled: !apribile }}
      aria-disabled={!apribile}
      disabled={!apribile}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card>
        <View
          style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', alignItems: 'center' }}
        >
          <Chip background={t.serviceBg}>
            <AppText variant="caption" style={{ color: t.serviceText }}>
              {categoria}
            </AppText>
          </Chip>
          <View style={{ flex: 1 }} />
          {apribile ? (
            <Ionicons name="chevron-forward" size={16} color={t.textSecondary} />
          ) : null}
        </View>

        <AppText variant="heading" numberOfLines={2}>
          {mansione}
        </AppText>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' }}>
          {/* La località è dell'annuncio ed è facoltativa: se manca, la riga non
              compare (niente trattino, niente «N/D»). */}
          {servizio.localita ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Ionicons name="location-outline" size={14} color={t.textSecondary} />
              <AppText variant="small" tone="secondary">
                {servizio.localita}
              </AppText>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Ionicons
              name={servizio.daRemoto ? 'globe-outline' : 'storefront-outline'}
              size={14}
              color={t.textSecondary}
            />
            <AppText variant="small" tone="secondary">
              {servizio.daRemoto ? 'da remoto' : 'in presenza'}
            </AppText>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' }}>
          <Ionicons name="person-outline" size={14} color={t.textSecondary} />
          <AppText variant="small" tone="secondary">
            {autore}
          </AppText>
          {servizio.offerente?.username ? (
            <AppText variant="small" tone="secondary">
              @{servizio.offerente.username}
            </AppText>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}
