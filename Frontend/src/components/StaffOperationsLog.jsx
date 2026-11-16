import { Pressable } from 'react-native';
import { ApiError, GENERIC_ERROR_MESSAGE, isEndpointUnavailable } from '@/api/client';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { EmptyState } from './EmptyState';
import { formatIsoDate } from '@/services/dates';
import { operationActionLabel, operationTargetLabel } from '@/services/staff';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Il registro delle operazioni: sola lettura, con il suo esito.
 *
 * Un guasto si dice come un guasto e porta la sua via d'uscita; solo un endpoint
 * assente (404/501) è "non disponibile". Prima di F57 le due richieste
 * condividevano un `Promise.all`, quindi un guasto delle segnalazioni faceva
 * scrivere qui che il servizio non restituisce il registro (audit UX F57).
 * L'esito del registro resta suo anche quando vive fuori dalla schermata: le
 * props arrivano già calcolate dalla schermata, che è l'unica a sapere cosa è
 * stato chiesto e cosa è tornato.
 *
 * Ogni riga apre il dettaglio (`GET /staff/operations/{id}`), perché solo quel
 * endpoint porta `before`/`after`: la lista li legge come `null` e li mostra
 * solo chi li ha chiesti.
 */
export function StaffOperationsLog({ operations, error, loading, onRetry, onOpen }) {
  const t = useTokens();

  if (operations === null) {
    if (loading) {
      return (
        <AppText variant="small" tone="secondary">
          Carico il registro…
        </AppText>
      );
    }
    if (isEndpointUnavailable(error)) {
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
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Registro non caricato"
        description={
          error instanceof ApiError
            ? `${error.message} Le segnalazioni qui sopra restano valide.`
            : `${GENERIC_ERROR_MESSAGE} Le segnalazioni qui sopra restano valide.`
        }
        etichettaAzione="Riprova"
        onAzione={() => void onRetry()}
      />
    );
  }

  if (operations.length === 0) {
    return (
      <AppText variant="small" tone="secondary">
        Nessuna operazione registrata.
      </AppText>
    );
  }

  return operations.map((operation) => {
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
  });
}
