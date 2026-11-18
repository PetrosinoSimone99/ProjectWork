import { View } from 'react-native';
import { AppIcon } from './AppIcon';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { EmptyState } from './EmptyState';
import { formatIsoDate } from '@/services/dates';
import { localitaPerDisplay } from '@/services/italian-locations';
import { TIPI_VOCE, STATI_PUBBLICAZIONE, nomePersona } from '@/services/offer-request';
import { space, useTokens } from '@/theme/tokens';

/**
 * "Servizi eliminati": le voci cancellate da tutti gli utenti, ciascuna con il
 * suo ripristino.
 *
 * L'eliminazione è soft (`DELETE /offers/{id}`), quindi la riga esiste ancora e
 * `POST /staff/services/{id}/restore` la riporta online per il suo proprietario.
 * L'elenco è di tutta la piattaforma, non della sessione: il proprietario è
 * l'unico dato che distingue due righe identiche e per questo è scritto per
 * esteso su ogni card.
 *
 * Nessuno stato proprio: righe, riga occupata e callback arrivano dalla
 * schermata, che è l'unica a sapere cosa si sta ripristinando. La paginazione è
 * per pagina intera (`limit` massimo 50), quindi «Carica altri 20» compare solo
 * quando la schermata dice che un'altra pagina esiste davvero.
 */
export function StaffDeletedServicesSection({
  services,
  loading = false,
  error = null,
  busyId = null,
  onRetry,
  onRestore,
  onLoadMore = null,
  hasMore = false,
  loadingMore = false,
}) {
  const t = useTokens();
  const rows = services ?? [];

  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.xs }}>
        <AppText variant="heading">Servizi eliminati</AppText>
        <AppText variant="small" tone="secondary">
          Le voci eliminate da tutti gli utenti: ripristinarne una la rimette a disposizione del
          suo proprietario; una voce sospesa resta sospesa.
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
            accessibilityLabel="Riprova a caricare i servizi eliminati"
          />
        </View>
      ) : null}

      {/* Con `services` a `null` e senza errore non si sa ancora niente: dirlo è
          l'unica cosa onesta (lo stesso ramo di `StaffOperationsLog`). */}
      {!error && services === null ? (
        <AppText variant="small" tone="secondary">
          Carico i servizi eliminati…
        </AppText>
      ) : null}

      {!error && services !== null && rows.length === 0 ? (
        <EmptyState
          icon="trash-outline"
          title="Nessun servizio eliminato"
          description="Quando un utente elimina un'offerta o una ricerca, la ritrovi qui e puoi ripristinarla."
        />
      ) : null}

      {rows.map((service) => {
        const isOffer = service.tipo === TIPI_VOCE.OFFERTA;
        const category = service.categoriaNome ?? null;
        const owner = nomePersona(service.proprietario);
        const deletedAt = formatIsoDate(service.eliminataIl);
        const mansione = service.mansione?.trim() || 'Mansione non indicata';
        const place = service.daRemoto
          ? 'da remoto'
          : localitaPerDisplay(service.localita) ?? 'Località non indicata';
        // Una voce sospesa è ripristinata ma resta invisibile nel catalogo: la
        // riga lo dice, altrimenti la promessa del ripristino è più larga del vero.
        const isSuspended = service.stato === STATI_PUBBLICAZIONE.SOSPESA;
        return (
          <Card key={service.chiave}>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Chip background={t.border}>
                <AppText variant="caption" style={{ color: t.text }}>
                  {isOffer ? 'Offerta' : 'Ricerca'}
                </AppText>
              </Chip>
              {isSuspended ? (
                <Chip background={t.dangerBg}>
                  <AppText variant="caption" style={{ color: t.dangerText }}>
                    Sospesa
                  </AppText>
                </Chip>
              ) : null}
              {deletedAt ? (
                <Chip background={t.dangerBg}>
                  <AppText variant="caption" style={{ color: t.dangerText }}>
                    {`Eliminato il ${deletedAt}`}
                  </AppText>
                </Chip>
              ) : null}
            </View>
            <View style={{ gap: space.xs }}>
              <AppText>{mansione}</AppText>
              <AppText variant="small" tone="secondary">
                {category ?? 'Categoria non disponibile'}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <AppIcon name="location-outline" size={14} color={t.textSecondary} />
                <AppText variant="small" tone="secondary">
                  {place}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <AppIcon name="person-outline" size={14} color={t.textSecondary} />
                <AppText variant="small" tone="secondary">
                  {owner}
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
              accessibilityLabel={`Ripristina ${isOffer ? "l'offerta" : 'la ricerca'} di ${owner}: ${mansione}`}
              style={{ alignSelf: 'flex-start' }}
            />
          </Card>
        );
      })}

      {onLoadMore && hasMore ? (
        <AppButton
          label={loadingMore ? 'Carico altri…' : 'Carica altri 20'}
          variant="secondary"
          icon="chevron-down-outline"
          loading={loadingMore}
          onPress={onLoadMore}
          accessibilityLabel="Carica altri venti servizi eliminati"
          style={{ alignSelf: 'center' }}
        />
      ) : null}
    </View>
  );
}
