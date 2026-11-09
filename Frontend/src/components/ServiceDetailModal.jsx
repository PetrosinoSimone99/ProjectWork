import { Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { formatIsoDate } from '@/services/dates';
import { etichettaModalita, nomePersona } from '@/services/offer-request';
import { localitaPerDisplay } from '@/services/italian-regions';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * The service detail panel of the home catalog.
 *
 * Shows what the product decided a person needs to judge an offer before
 * writing anything: who publishes it (name and username), where it happens
 * (the service location, or "da remoto" when the service has none and is
 * remote), and the categories with the full description.
 *
 * Two actions, both honest:
 * - "Segnala" is real: it opens the report route, which calls `POST /reports`;
 * - "Invia proposta" stays visible and disabled with "disponibile a breve",
 *   because proposals have no endpoint yet (`docs/backend-gaps.md` G4) and a
 *   button that pretends to work would be worse than a disabled one.
 *
 * The "what they offer and look for" block is the third declared gap (G3): the
 * public profile of another user does not exist, so the box says it is not
 * available instead of showing the owner's own data as if it were a summary.
 */
export function ServiceDetailModal({ servizio, onClose, onReport }) {
  const t = useTokens();
  const owner = servizio?.offerente ?? {};
  const name = nomePersona(owner);
  const categories = servizio?.categorie?.length ? servizio.categorie : null;
  const description = servizio?.descrizione ?? '';
  const publishedAt = formatIsoDate(servizio?.pubblicatoIl);
  const location = servizio?.localita ?? owner.localita ?? null;
  const remote = servizio?.daRemoto === true;
  // One place line: the location when there is one, otherwise the mode, and
  // "not indicated" when neither says anything.
  const place = location
    ? localitaPerDisplay(location)
    : remote
      ? 'Da remoto'
      : 'Località non indicata';

  return (
    <Modal visible={servizio !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: t.overlay,
          justifyContent: 'center',
          padding: space.lg,
        }}
      >
        {/* Closing background: on web there is no `Alert`, and a tap outside the
            panel is the way to cancel. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chiudi dettaglio"
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 }}
          onPress={onClose}
        />
        {servizio ? (
          <Card style={{ gap: space.md, position: 'relative', zIndex: 1 }}>
            <View
              style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', alignItems: 'center' }}
            >
              {categories ? (
                categories.map((category) => (
                  <Chip key={category.id} background={t.serviceBg}>
                    <AppText variant="caption" style={{ color: t.serviceText }}>
                      {category.nome}
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
            </View>

            <AppText variant="heading">{description}</AppText>

            <View style={{ gap: space.xs }}>
              <AppText variant="small" tone="secondary">
                Pubblicato da
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <Ionicons name="person-circle-outline" size={18} color={t.textSecondary} />
                <AppText>{name}</AppText>
                {owner.username ? (
                  <AppText variant="small" tone="secondary">
                    @{owner.username}
                  </AppText>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <Ionicons
                  name={location ? 'location-outline' : remote ? 'videocam-outline' : 'help-circle-outline'}
                  size={16}
                  color={t.textSecondary}
                />
                <AppText variant="small" tone="secondary">
                  {`Si svolge: ${place}`}
                </AppText>
              </View>
              {location && remote ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <Ionicons name="videocam-outline" size={16} color={t.textSecondary} />
                  <AppText variant="small" tone="secondary">
                    {`Disponibile anche ${etichettaModalita(true)}`}
                  </AppText>
                </View>
              ) : null}
              {publishedAt ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <Ionicons name="calendar-outline" size={16} color={t.textSecondary} />
                  <AppText variant="small" tone="secondary">
                    {`Pubblicato il ${publishedAt}`}
                  </AppText>
                </View>
              ) : null}
            </View>

            {/* Declared gap G3: no public profile endpoint for another user. */}
            <View
              style={{
                gap: space.xs,
                padding: space.md,
                borderRadius: radius.input,
                borderWidth: 1,
                borderColor: t.border,
                backgroundColor: t.background,
              }}
            >
              <AppText variant="small" style={{ fontWeight: '600' }}>
                Cosa offre e cerca
              </AppText>
              <AppText variant="small" tone="secondary">
                Non disponibile: il backend non espone ancora il profilo pubblico di un altro
                utente, quindi qui non si possono mostrare le sue altre offerte e ricerche.
              </AppText>
            </View>

            <View style={{ gap: space.sm }}>
              <AppButton
                label="Invia proposta"
                variant="secondary"
                icon="swap-horizontal-outline"
                disabled
              />
              <AppText variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
                Le proposte saranno disponibili a breve.
              </AppText>
            </View>

            <View style={{ gap: space.xs }}>
              <AppButton
                label="Segnala"
                variant="ghost"
                icon="flag-outline"
                onPress={() => onReport?.(servizio)}
                accessibilityLabel={`Segnala ${name} alla staff`}
              />
              <AppText variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
                La segnalazione arriva alla staff, che la esamina e decide.
              </AppText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chiudi dettaglio servizio"
              onPress={onClose}
              style={({ pressed }) => ({
                alignSelf: 'flex-end',
                backgroundColor: pressed ? t.primaryPressed : t.primary,
                borderRadius: radius.pill,
                paddingHorizontal: space.lg,
                paddingVertical: space.sm,
              })}
            >
              <AppText style={{ color: t.onPrimary, fontWeight: '700' }}>Chiudi</AppText>
            </Pressable>
          </Card>
        ) : null}
      </View>
    </Modal>
  );
}
