import { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { ConfirmModal } from './ConfirmModal';
import { formatIsoDate } from '@/services/dates';
import { etichettaModalita } from '@/services/offer-request';
import { counterpartOf } from '@/services/agreements';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * One agreement of the agreements tab: who the other participant is, the
 * status in Italian, and the delivery sheet when the backend has one —
 * otherwise the single honest line "Scheda non compilata", with no invented
 * place or dates (the app never fills the sheet: decision 5).
 *
 * "Annulla scambio" (decision 4) appears only for an `ACCEPTED` agreement
 * and only when the screen passed `onCancel`; it opens the reused
 * `ConfirmModal`, and confirming calls `onCancel` — the network call and its
 * error belong to the screen, so the button draws its in-flight state from
 * `azioneInCorso` (`null` when idle, `{id, nome}` while an action flies).
 *
 * Data and callbacks only: no network, no mutation of the input.
 */
export function AgreementCard({ accordo, myUsername = null, onCancel = null, azioneInCorso = null }) {
  const t = useTokens();
  const [confermaAperta, setConfermaAperta] = useState(false);

  const STATI = {
    PENDING: { label: 'In attesa', bg: t.serviceBg, color: t.serviceText },
    ACCEPTED: { label: 'Accettato', bg: t.successBg, color: t.successText },
    REFUSED: { label: 'Rifiutato', bg: t.dangerBg, color: t.dangerText },
    CONTESTED: { label: 'Contestato', bg: t.dangerBg, color: t.dangerText },
    VOID: { label: 'Annullato', bg: t.background, color: t.textSecondary },
  };
  const stato = STATI[accordo.stato] ?? {
    label: 'Stato non disponibile',
    bg: t.background,
    color: t.textSecondary,
  };

  const controparte = counterpartOf(accordo, myUsername);
  const creataIl = formatIsoDate(accordo.creazione);
  const scheda = accordo.scheda;

  // Cancellation: accepted only, id present, and the screen opted in.
  const puoAnnullare = accordo.stato === 'ACCEPTED' && Number.isInteger(accordo.id) && onCancel !== null;
  const occupato = azioneInCorso !== null;
  const miaAnnulla = azioneInCorso?.id === accordo.id && azioneInCorso.nome === 'annulla';

  return (
    <Card style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        <Chip background={stato.bg}>
          <AppText variant="caption" style={{ color: stato.color }}>
            {stato.label}
          </AppText>
        </Chip>
        <View style={{ flex: 1 }} />
        {creataIl ? (
          <AppText variant="small" tone="secondary">
            {`Creata il ${creataIl}`}
          </AppText>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <Ionicons name="person-outline" size={16} color={t.textSecondary} />
        <AppText>{controparte ? `@${controparte}` : 'Controparte non disponibile'}</AppText>
      </View>

      {scheda ? (
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Ionicons name="grid-outline" size={14} color={t.textSecondary} />
            <AppText variant="small">{scheda.descrizione ?? 'Servizio non indicato'}</AppText>
          </View>
          {/* The sheet has no location field: the mode is the only place
              datum it carries, and the row disappears when it is absent. */}
          {scheda.daRemoto !== null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Ionicons
                name={scheda.daRemoto ? 'videocam-outline' : 'people-outline'}
                size={14}
                color={t.textSecondary}
              />
              <AppText variant="small" tone="secondary">
                {`Si svolge ${etichettaModalita(scheda.daRemoto)}`}
              </AppText>
            </View>
          ) : null}
          {formatIsoDate(scheda.inizio) || formatIsoDate(scheda.fine) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Ionicons name="calendar-outline" size={14} color={t.textSecondary} />
              <AppText variant="small" tone="secondary">
                {descriviDate(scheda.inizio, scheda.fine)}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Ionicons name="help-circle-outline" size={16} color={t.textSecondary} />
          <AppText variant="small" tone="secondary">
            Scheda non compilata
          </AppText>
        </View>
      )}

      {puoAnnullare ? (
        <>
          <AppButton
            label="Annulla scambio"
            variant="danger"
            icon="close-circle-outline"
            onPress={() => setConfermaAperta(true)}
            loading={miaAnnulla}
            disabled={occupato && !miaAnnulla}
            accessibilityLabel="Annulla questo scambio"
          />
          <ConfirmModal
            visible={confermaAperta}
            titolo="Annullare questo scambio?"
            messaggio={
              controparte
                ? `Lo scambio con @${controparte} diventa annullato: non potrà più essere completato.`
                : 'Lo scambio diventa annullato: non potrà più essere completato.'
            }
            etichettaConferma="Annulla scambio"
            loading={miaAnnulla}
            onConferma={() => {
              setConfermaAperta(false);
              onCancel();
            }}
            onAnnulla={() => setConfermaAperta(false)}
          />
        </>
      ) : null}
    </Card>
  );
}

/** "Dal X al Y", or whichever half exists; an empty string when neither does. */
function descriviDate(inizio, fine) {
  const da = formatIsoDate(inizio);
  const a = formatIsoDate(fine);
  if (da && a) {
    return `Dal ${da} al ${a}`;
  }
  if (da) {
    return `Dal ${da}`;
  }
  if (a) {
    return `Fino al ${a}`;
  }
  return '';
}
