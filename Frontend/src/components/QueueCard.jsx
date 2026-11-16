import { useState } from 'react';
import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { ConfirmModal } from './ConfirmModal';
import { queueStatusLabel, queueTypeLabel } from '@/services/queues';
import { localitaPerDisplay } from '@/services/italian-locations';
import { space, useTokens } from '@/theme/tokens';

/**
 * Chip colors: one map per wire word, both built from theme tokens so the card
 * follows light and dark without a second palette.
 *
 * A type keeps the same color whatever the state (identity), a status changes
 * with it: green for a live queue, amber for one already in progress, neutral
 * for a closed one. An unknown word falls back to the neutral pair — the
 * label next to it says the rest.
 */
const TYPE_COLORS = {
  OFFER: (t) => ({ background: t.serviceBg, color: t.serviceText }),
  REQUEST: (t) => ({ background: t.accentBg, color: t.accentText }),
};

const STATUS_COLORS = {
  OPEN: (t) => ({ background: t.serviceBg, color: t.serviceText }),
  IN_PROGRESS: (t) => ({ background: t.accentBg, color: t.accentText }),
  CLOSED: (t) => ({ background: t.background, color: t.textSecondary }),
};

/** The pair an unknown word falls back to: neutral, the label says the rest. */
const NEUTRAL_COLORS = (t) => ({ background: t.background, color: t.textSecondary });

/**
 * One row of `GET /get-queues`: type chip, what the queue is about, where it
 * stands, and the cancel action behind a `ConfirmModal`.
 *
 * The confirm message names the real consequence of `POST /cancel-queue/{id}`:
 * when the queue carries an agreement the backend cancels that agreement too
 * (`ServiceQueueManager::cancelServiceQueue`), so a user who only meant to
 * close a queue learns what else disappears before tapping. A `REQUEST` queue
 * with no agreement gets its credit back on the same route, and the message
 * says so: the money moved by the backend is not visible anywhere else
 * (`backend-gaps.md` G15).
 *
 * Data and callbacks only: no network, no mutation of the input. `occupata`
 * is the screen's "an action is in flight" flag: while it is true no queue
 * can be cancelled again. The modal stays open (its confirm button showing
 * `loading`) until `onAnnulla` settles — closing it at tap time would hide the
 * only progress indicator of the action.
 */
/**
 * What the confirm modal says the cancel does.
 *
 * One early return per consequence, because the three cases are different
 * sentences and not three branches of the same one: an agreement goes with the
 * queue, a request queue gives the credit back, an offer queue only leaves the
 * match.
 */
function confermaAnnullamento(coda) {
  if (coda.agreementId !== null) {
    return 'Questa coda è collegata a uno scambio: annullandola annulli anche lo scambio.';
  }
  if (coda.tipo === 'REQUEST') {
    return 'Annullando questa coda non appare più nel match e il credito che ha speso torna disponibile.';
  }
  return 'Annullando questa coda non appare più nel match.';
}

export function QueueCard({ coda, occupata = false, onAnnulla }) {
  const t = useTokens();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const typeColor = (TYPE_COLORS[coda.tipo] ?? NEUTRAL_COLORS)(t);
  const statusColor = (STATUS_COLORS[coda.stato] ?? NEUTRAL_COLORS)(t);

  // Same rule as the service detail: the location when there is one, the mode
  // when the service is remote, and "not indicated" when neither says anything.
  const place = coda.localita
    ? localitaPerDisplay(coda.localita)
    : coda.daRemoto === true
      ? 'Da remoto'
      : 'Località non indicata';

  const confirmMessage = confermaAnnullamento(coda);

  return (
    <Card style={{ gap: space.sm }}>
      <Chip background={typeColor.background}>
        <AppText variant="caption" style={{ color: typeColor.color }}>
          {queueTypeLabel(coda.tipo)}
        </AppText>
      </Chip>

      {coda.descrizione ? (
        <AppText numberOfLines={2}>{coda.descrizione}</AppText>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <AppIcon name="pricetag-outline" size={14} color={t.textSecondary} />
        <AppText variant="small" tone="secondary">
          {coda.categoria ?? 'Categoria non indicata'}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <AppIcon name="location-outline" size={14} color={t.textSecondary} />
        <AppText variant="small" tone="secondary">
          {place}
        </AppText>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: space.sm,
        }}
      >
        <Chip background={statusColor.background}>
          <AppText variant="caption" style={{ color: statusColor.color }}>
            {queueStatusLabel(coda.stato)}
          </AppText>
        </Chip>
        {coda.agreementId !== null ? (
          <AppText variant="small" tone="secondary">
            Collegata a uno scambio
          </AppText>
        ) : null}
      </View>

      <AppButton
        label="Annulla coda"
        variant="dangerGhost"
        onPress={() => setConfirmOpen(true)}
        disabled={occupata}
        accessibilityLabel="Annulla questa coda"
      />
      <ConfirmModal
        visible={confirmOpen}
        titolo="Annullare questa coda?"
        messaggio={confirmMessage}
        etichettaConferma="Annulla coda"
        loading={occupata}
        onConferma={() => {
          void (async () => {
            await onAnnulla(coda);
            setConfirmOpen(false);
          })();
        }}
        onAnnulla={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
