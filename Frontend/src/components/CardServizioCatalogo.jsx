import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { formattaDataIso } from '@/accordi/stati';
import { nomePersona } from '@/servizi/offerta-ricerca';
import { space, useTokens } from '@/theme/tokens';

/**
 * La card di un servizio del catalogo della home: categorie (una o più),
 * descrizione, località della persona che lo offre e data di pubblicazione.
 *
 * Il modello è quello di `GET /api/services` (vedi `normalizzaOffertaCatalogo`):
 * la località è della **persona**, non dell'annuncio — che non esiste più — e la
 * descrizione è sempre presente (per contratto), quindi non c'è nessun testo di
 * ripiego da inventare.
 *
 * Non riusa `CardVoceServizio`, che è la card delle **proprie** voci (tipo, stato
 * e le tre azioni di gestione): un componente che fa due mestieri non ne fa bene
 * nessuno. Qui non c'è nessun compenso (il modello non lo prevede) e non
 * c'è nessun caso «è il tuo annuncio», perché nel catalogo arrivano solo i
 * servizi degli altri.
 *
 * Solo dati e callback: nessuno stato proprio, nessuna chiamata di rete.
 */
export function CardServizioCatalogo({ servizio, onPress }) {
  const t = useTokens();

  // Senza id la card si disegna ma non apre niente: mai una richiesta con
  // `id: undefined` (lezione di P37). Con `GET /api/services` che restituisce
  // l'id, questo caso è un'anomalia da segnalare.
  const apribile = Number.isInteger(servizio.id);
  const categorie = servizio.categorie?.length ? servizio.categorie : null;
  const autore = nomePersona(servizio.offerente);
  const pubblicatoIl = formattaDataIso(servizio.pubblicatoIl);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Apri il servizio: ${servizio.descrizione}`}
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
          {categorie ? (
            categorie.map((categoria) => (
              <Chip key={categoria.id} background={t.serviceBg}>
                <AppText variant="caption" style={{ color: t.serviceText }}>
                  {categoria.nome}
                </AppText>
              </Chip>
            ))
          ) : (
            <Chip background={t.serviceBg}>
              <AppText variant="caption" style={{ color: t.serviceText }}>
                Categoria non disponibile
              </AppText>
            </Chip>
          )}
          <View style={{ flex: 1 }} />
          {apribile ? (
            <Ionicons name="chevron-forward" size={16} color={t.textSecondary} />
          ) : null}
        </View>

        <AppText variant="heading" numberOfLines={2}>
          {servizio.descrizione}
        </AppText>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' }}>
          {/* La località è della persona ed è facoltativa: se manca, la riga non
              compare (niente trattino, niente «N/D»). */}
          {servizio.offerente?.localita ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Ionicons name="location-outline" size={14} color={t.textSecondary} />
              <AppText variant="small" tone="secondary">
                {servizio.offerente.localita}
              </AppText>
            </View>
          ) : null}
          {pubblicatoIl ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Ionicons name="calendar-outline" size={14} color={t.textSecondary} />
              <AppText variant="small" tone="secondary">
                Pubblicato il {pubblicatoIl}
              </AppText>
            </View>
          ) : null}
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
