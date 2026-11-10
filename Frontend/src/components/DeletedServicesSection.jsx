import { View } from 'react-native';
import { AppIcon } from './AppIcon';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { EmptyState } from './EmptyState';
import { formatIsoDate } from '@/services/dates';
import { TIPI_VOCE, nomeCategoria } from '@/services/offer-request';
import { localitaPerDisplay } from '@/services/italian-regions';
import { space, useTokens } from '@/theme/tokens';

/**
 * "Eliminati": the viewer's soft-deleted services, each with a restore action.
 *
 * Deleting is a soft delete (`DELETE /offers/{id}`), so the entry keeps existing
 * and `POST /offers/{id}/restore` brings it back. The section is loaded with its
 * own request and never mixes with the active list: a restored row leaves this
 * section and appears in "Cosa offro" / "Cosa cerco" on the next reload.
 *
 * No state of its own: rows, the busy row and the callbacks come from the
 * screen, which is the only one that knows what is being restored.
 */
export function DeletedServicesSection({
  services,
  categories = [],
  loading = false,
  error = null,
  busyId = null,
  onRetry,
  onRestore,
}) {
  const t = useTokens();
  const rows = services ?? [];

  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.xs }}>
        <AppText variant="heading">Eliminati</AppText>
        <AppText variant="small" tone="secondary">
          Le voci che hai eliminato restano qui: puoi ripristinarle quando vuoi.
        </AppText>
      </View>

      {error ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="small" tone="danger">
            {error}
          </AppText>
          <AppButton
            label="Riprova"
            variant="secondary"
            icon="refresh-outline"
            onPress={onRetry}
            loading={loading}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
      ) : null}

      {!error && loading && services === null ? (
        <AppText variant="small" tone="secondary">
          Carico le voci eliminate…
        </AppText>
      ) : null}

      {!error && services !== null && rows.length === 0 ? (
        <EmptyState
          icon="trash-outline"
          title="Nessuna voce eliminata"
          description="Quando elimini un'offerta o una ricerca, la ritrovi qui e puoi ripristinarla."
        />
      ) : null}

      {rows.map((service) => {
        const isOffer = service.tipo === TIPI_VOCE.OFFERTA;
        const category = nomeCategoria(categories, service.idCategoria);
        const deletedAt = formatIsoDate(service.eliminataIl);
        return (
          <Card key={service.chiave}>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Chip background={t.border}>
                <AppText variant="caption" style={{ color: t.text }}>
                  {isOffer ? 'Offerta' : 'Ricerca'}
                </AppText>
              </Chip>
              {deletedAt ? (
                <Chip background={t.dangerBg}>
                  <AppText variant="caption" style={{ color: t.dangerText }}>
                    {`Eliminata il ${deletedAt}`}
                  </AppText>
                </Chip>
              ) : null}
            </View>
            <View style={{ gap: space.xs }}>
              <AppText>{service.mansione.trim() || 'Mansione non indicata'}</AppText>
              <AppText variant="small" tone="secondary">
                {category ?? 'Categoria non disponibile'}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                {service.localita ? (
                  <>
                    <AppIcon name="location-outline" size={14} color={t.textSecondary} />
                    <AppText variant="small" tone="secondary">
                      {localitaPerDisplay(service.localita)}
                    </AppText>
                    <AppText variant="small" tone="secondary">
                      ·
                    </AppText>
                  </>
                ) : null}
                <AppText variant="small" tone="secondary">
                  {service.daRemoto ? 'da remoto' : 'in presenza'}
                </AppText>
              </View>
            </View>
            <AppButton
              label="Ripristina"
              variant="secondary"
              icon="refresh-outline"
              loading={Number(busyId) === Number(service.id)}
              disabled={busyId !== null}
              onPress={() => onRestore(service)}
              accessibilityLabel={`Ripristina ${isOffer ? "l'offerta" : 'la ricerca'}: ${
                service.mansione
              }`}
              style={{ alignSelf: 'flex-start' }}
            />
          </Card>
        );
      })}
    </View>
  );
}
