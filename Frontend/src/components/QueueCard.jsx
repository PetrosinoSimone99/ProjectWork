import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { ConfirmModal } from './ConfirmModal';
import { formatIsoDateTime } from '@/services/dates';
import { queueStatusLabel, queueTypeLabel } from '@/services/queues';
import { localitaPerDisplay } from '@/services/italian-locations';
import { space, useTokens } from '@/theme/tokens';

/**
 * Chip colors: one map per wire word, both built from theme tokens so the card
 * follows light and dark without a second palette.
 *
 * A type keeps the same color whatever the state (identity), a status changes
 * with it: green for a live coda, amber for one already in progress, neutral
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
 * One row of `GET /get-queues`: type chip, what the coda is about, where it
 * stands, and the cancel action behind a `ConfirmModal`.
 *
 * The confirm message names the real consequence of `POST /cancel-coda/{id}`:
 * when the coda carries an agreement the backend cancels that agreement too
 * (`ServiceQueueManager::cancelServiceQueue`), so a user who only meant to
 * close a coda learns what else disappears before tapping. A `REQUEST` coda
 * with no agreement gets its credit back on the same route, and the message
 * says so: the money moved by the backend is not visible anywhere else
 * (`backend-ledger.md` G15).
 *
 * When `coda.agreementId` is not null and `onApri` is a function, the
 * informational blocks below (type, description, category, place, status)
 * become one pressable button labelled `Apri lo scambio collegato a questa
 * coda`; the cancel action and its modal stay outside that pressable, so a tap
 * there can only cancel.
 *
 * Data and callbacks only: no network, no mutation of the input. `occupata`
 * is the screen's "an action is in flight" flag: while it is true no coda
 * can be cancelled again. The modal stays open (its confirm button showing
 * `loading`) until `onAnnulla` settles — closing it at tap time would hide the
 * only progress indicator of the action.
 */
/**
 * What the confirm modal says the cancel does.
 *
 * One early return per consequence, because the three cases are different
 * sentences and not three branches of the same one: an agreement goes with the
 * coda, a request coda gives the credit back, an offer coda only leaves the
 * match.
 */
function cancelConfirmMessage(coda) {
  if (coda.agreementId !== null) {
    return 'Questa coda è collegata a uno scambio: annullandola annulli anche lo scambio.';
  }
  if (coda.tipo === 'REQUEST') {
    return 'Annullando questa coda non appare più nel match e il credito che ha speso torna disponibile.';
  }
  return 'Annullando questa coda non appare più nel match.';
}

/**
 * The place line of the row.
 *
 * Same rule as the service detail: the location when there is one, the mode
 * when the service is remote, and "not indicated" when neither says anything.
 * One early return per case, because they are three different sentences and
 * not three branches of the same one.
 */
function descrizioneLuogo(coda) {
  if (coda.localita) {
    return localitaPerDisplay(coda.localita);
  }
  if (coda.daRemoto === true) {
    return 'Da remoto';
  }
  return 'Località non indicata';
}

export function QueueCard({ coda, occupata = false, onAnnulla, onApri = null }) {
  const t = useTokens();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const typeColor = (TYPE_COLORS[coda.tipo] ?? NEUTRAL_COLORS)(t);
  const statusColor = (STATUS_COLORS[coda.stato] ?? NEUTRAL_COLORS)(t);

  const place = descrizioneLuogo(coda);

  const confirmMessage = cancelConfirmMessage(coda);
  // The date goes through `services/dates.js` like every other date in the app:
  // a missing or malformed value comes back `null` and the line is not drawn,
  // instead of printing "Invalid Date" inside an Italian row.
  const createdLabel = formatIsoDateTime(coda.creataIl);

  // One pressable around the informational blocks only when there is somewhere
  // to go: a linked agreement and a caller able to take it there. The cancel
  // action and the modal stay outside it — on react-native-web a press inside a
  // nested pressable bubbles up, so wrapping the whole card would make
  // "Annulla coda" navigate.
  // Integer, like the notification half: a missing key would be `undefined`,
  // which `!== null` would treat as linked.
  const canOpen = Number.isInteger(coda.agreementId) && typeof onApri === 'function';

  // A `button` makes its descendants presentational, so a fixed label would stop
  // the description, the category, the place and the status from being announced
  // on exactly the linked rows: the name is folded out of the visible strings,
  // the same fix F50 needed in `ServiceCard`.
  const openLabel = `Apri lo scambio collegato a questa coda: ${[
    coda.descrizione,
    coda.categoria ?? 'Categoria non indicata',
    place,
    queueStatusLabel(coda.stato),
  ]
    .filter(Boolean)
    .join('. ')}`;

  const infoBlock = (
    <>
      <Chip background={typeColor.background}>
        <AppText variant="caption" style={{ color: typeColor.color }}>
          {queueTypeLabel(coda.tipo)}
        </AppText>
      </Chip>

      {createdLabel ? (
        <AppText variant="small" tone="secondary">{`Creata il ${createdLabel}`}</AppText>
      ) : null}
      {coda.descrizione ? (
        <AppText numberOfLines={2}>{coda.descrizione}</AppText>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <AppIcon name="pricetag-outline" size={14} color={t.textSecondary} />
        <AppText variant="small" tone="secondary" style={{ flexShrink: 1, minWidth: 0 }}>
          {coda.categoria ?? 'Categoria non indicata'}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <AppIcon name="location-outline" size={14} color={t.textSecondary} />
        <AppText variant="small" tone="secondary" style={{ flexShrink: 1, minWidth: 0 }}>
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
    </>
  );

  return (
    <Card style={{ gap: space.sm }}>
      {canOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={openLabel}
          onPress={onApri}
          style={({ pressed }) => ({ gap: space.sm, opacity: pressed ? 0.7 : 1 })}
        >
          {infoBlock}
        </Pressable>
      ) : (
        infoBlock
      )}

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
