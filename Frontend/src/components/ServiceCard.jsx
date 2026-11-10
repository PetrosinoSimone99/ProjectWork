import { Pressable, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { formatIsoDate } from '@/services/dates';
import { etichettaModalita, nomePersona } from '@/services/offer-request';
import { localitaPerDisplay } from '@/services/italian-regions';
import { space, useTokens } from '@/theme/tokens';

/**
 * Misura di lettura della card (audit UX F36): a 1440 px la colonna del
 * catalogo è `layout.maxCatalogo` (1024) e la descrizione corre a 95-110
 * caratteri per riga. La card si ferma a questa larghezza, così la colonna di
 * testo interna (larghezza meno i due padding di `space.lg`) resta sui 680 px,
 * dentro l'intervallo 640-720 px; la colonna della schermata resta larga.
 */
const LARGHEZZA_MAX_CARD = 680 + 2 * space.lg;

/**
 * La card di un servizio del catalogo della home: categorie (una o più),
 * descrizione, località del servizio e data di pubblicazione.
 *
 * Il modello è quello di `GET /api/services` (vedi `normalizzaOffertaCatalogo`):
 * la località è dell'**annuncio** (`servizio.localita`, dal 16/10/2026), con
 * ripiego su quella della persona; la descrizione è sempre presente (per
 * contratto), quindi non c'è nessun testo di ripiego da inventare.
 *
 * Non riusa `EntryCard`, che è la card delle **proprie** voci (tipo, stato
 * e le tre azioni di gestione): un componente che fa due mestieri non ne fa bene
 * nessuno. Qui non c'è nessun compenso (il modello non lo prevede) e non
 * c'è nessun caso «è il tuo annuncio», perché nel catalogo arrivano solo i
 * servizi degli altri.
 *
 * Solo dati e callback: nessuno stato proprio, nessuna chiamata di rete.
 */
export function ServiceCard({ servizio, onPress }) {
  const t = useTokens();

  // Senza id la card si disegna ma non apre niente: mai una richiesta con
  // `id: undefined` (lezione di P37). Con `GET /api/services` che restituisce
  // l'id, questo caso è un'anomalia da segnalare.
  const apribile = Number.isInteger(servizio.id);
  const categorie = servizio.categorie?.length ? servizio.categorie : null;
  const autore = nomePersona(servizio.offerente);
  const pubblicatoIl = formatIsoDate(servizio.pubblicatoIl);
  const localita = servizio.localita ?? servizio.offerente?.localita;

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
      <Card style={{ maxWidth: LARGHEZZA_MAX_CARD }}>
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
            <AppIcon name="chevron-forward" size={16} color={t.textSecondary} />
          ) : null}
        </View>

        {/* La card è un bottone: la descrizione dentro non è un titolo di
            pagina, quindi esce dal ruolo `header` della variante (F19). */}
        <AppText variant="heading" accessibilityRole="text" numberOfLines={2}>
          {servizio.descrizione}
        </AppText>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' }}>
          {/* La modalità è sempre nota (il contratto la manda come booleano),
              quindi la riga compare sempre: l'icona distingue da remoto da in
              presenza, e la parola lo dice a chi non vede l'icona. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <AppIcon
              name={servizio.daRemoto ? 'videocam-outline' : 'people-outline'}
              size={14}
              color={t.textSecondary}
            />
            <AppText variant="small" tone="secondary">
              {etichettaModalita(servizio.daRemoto)}
            </AppText>
          </View>
          {/* La località del servizio (ripiego: quella della persona) è
              facoltativa: se manca, la riga non compare (niente trattino,
              niente «N/D»). */}
          {localita ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <AppIcon name="location-outline" size={14} color={t.textSecondary} />
              <AppText variant="small" tone="secondary">
                {localitaPerDisplay(localita)}
              </AppText>
            </View>
          ) : null}
          {pubblicatoIl ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <AppIcon name="calendar-outline" size={14} color={t.textSecondary} />
              <AppText variant="small" tone="secondary">
                Pubblicato il {pubblicatoIl}
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' }}>
          <AppIcon name="person-outline" size={14} color={t.textSecondary} />
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
