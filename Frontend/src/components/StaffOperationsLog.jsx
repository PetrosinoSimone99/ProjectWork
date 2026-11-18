import { Pressable, View } from 'react-native';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { EmptyState } from './EmptyState';
import { formatIsoDate } from '@/services/dates';
import { operationActionLabel, operationTargetLabel } from '@/services/staff';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Il registro delle operazioni: sola lettura, con il suo esito e la sua
 * paginazione.
 *
 * Un guasto si dice come un guasto e porta la sua via d'uscita. Prima di F57 le
 * due richieste condividevano un `Promise.all`, quindi un guasto delle
 * segnalazioni faceva scrivere qui che il servizio non restituisce il registro
 * (audit UX F57): righe, esito e paginazione arrivano adesso da un
 * `usePagedList` tutto suo, calcolato dalla schermata, che resta l'unica a
 * sapere cosa è stato chiesto e cosa è tornato.
 *
 * `error` è il messaggio già in italiano che l'hook restituisce, non
 * l'eccezione; `nonDisponibile` dice che quel messaggio viene da un endpoint che
 * non esiste (404/501) e non da un guasto: allora la sezione dichiara il
 * servizio assente, invece di proporre un «Riprova» che non può riuscire.
 * `loadMoreError` è l'esito della pagina appesa, che non cancella
 * le righe già lette. Il registro non si ferma alla prima pagina: `onLoadMore`
 * compare finché `hasMore` dice che un'altra pagina esiste, e la riga «N di M»
 * legge il totale dal payload (`paginazione.elementiTotali`), non dal conteggio
 * locale.
 *
 * Ogni riga apre il dettaglio (`GET /staff/operations/{id}`), perché solo quel
 * endpoint porta `before`/`after`: la lista li legge come `null` e li mostra
 * solo chi li ha chiesti.
 */
export function StaffOperationsLog({
  operations,
  error,
  nonDisponibile = false,
  loadMoreError = null,
  loading = false,
  onRetry,
  onOpen,
  onLoadMore = null,
  hasMore = false,
  loadingMore = false,
  totalCount = null,
}) {
  const t = useTokens();

  if (operations === null) {
    if (nonDisponibile) {
      return (
        <EmptyState
          icon="time-outline"
          title="Registro non disponibile"
          description="Il servizio non restituisce il registro delle operazioni: le segnalazioni e gli utenti qui sopra funzionano lo stesso."
          etichettaAzione="Riprova"
          onAzione={() => void onRetry()}
        />
      );
    }
    if (error !== null && error !== undefined) {
      return (
        <View style={{ gap: space.sm }}>
          <AppText variant="small" tone="danger">
            {`${error} Le segnalazioni qui sopra restano valide.`}
          </AppText>
          <AppButton
            label="Riprova"
            variant="secondary"
            icon="refresh-outline"
            onPress={() => void onRetry()}
            loading={loading}
            style={{ alignSelf: 'flex-start' }}
            accessibilityLabel="Riprova a caricare il registro delle operazioni"
          />
        </View>
      );
    }
    // Senza righe e senza esito non si sa ancora niente: dirlo è l'unica cosa
    // onesta, invece di inventare un guasto che non c'è stato.
    return (
      <AppText variant="small" tone="secondary">
        Carico il registro…
      </AppText>
    );
  }

  if (operations.length === 0) {
    return (
      <AppText variant="small" tone="secondary">
        Nessuna operazione registrata.
      </AppText>
    );
  }

  return (
    <View style={{ gap: space.xs }}>
      {operations.map((operation) => {
        const action = operationActionLabel(operation.azione);
        const target = operationTargetLabel(operation.bersaglio);
        const targetId = operation.bersaglioId ?? '';
        return (
          <Pressable
            key={operation.id}
            accessibilityRole="button"
            accessibilityLabel={`Apri il dettaglio: ${[action, target, targetId]
              .filter((parte) => parte !== '')
              .join(' ')}`}
            onPress={() => onOpen(operation)}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                paddingVertical: space.xs,
                paddingHorizontal: space.sm,
                borderRadius: radius.card,
              },
              // Il tocco deve vedersi: senza sfondo premuto la riga sembra testo e
              // non un comando (stessa leva di AppButton, variante ghost).
              pressed && { backgroundColor: t.border },
            ]}
          >
            <AppIcon name="time-outline" size={15} color={t.textSecondary} />
            <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
              {`${action} · ${target} ${targetId} · ${operation.staff?.username ?? 'staff'} · ${
                formatIsoDate(operation.creataIl) ?? 'data non disponibile'
              }`}
            </AppText>
            <AppIcon name="chevron-forward" size={15} color={t.textSecondary} />
          </Pressable>
        );
      })}

      {totalCount !== null ? (
        <AppText variant="small" tone="secondary">
          {`${operations.length} di ${totalCount} operazioni`}
        </AppText>
      ) : null}

      {loadMoreError ? (
        <AppText variant="small" tone="danger">
          {loadMoreError}
        </AppText>
      ) : null}

      {onLoadMore && hasMore ? (
        <AppButton
          label={loadingMore ? 'Carico altri…' : 'Carica altri 20'}
          variant="secondary"
          icon="chevron-down-outline"
          loading={loadingMore}
          onPress={onLoadMore}
          accessibilityLabel="Carica altre venti operazioni del registro"
          style={{ alignSelf: 'center' }}
        />
      ) : null}
    </View>
  );
}
