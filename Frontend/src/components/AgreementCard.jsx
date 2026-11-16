import { useState } from 'react';
import { View } from 'react-native';
import { AgreementSheet } from './AgreementSheet';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { ConfirmModal } from './ConfirmModal';
import { formatIsoDate } from '@/services/dates';
import { counterpartOf, isSheetCompiled, sheetsFor } from '@/services/agreements';
import { space, useTokens } from '@/theme/tokens';

/**
 * One agreement of the agreements tab: who the other participant is, the
 * status in Italian, and the two delivery-sheet rows — mine, which I fill, and
 * the other person's, which I confirm — or the single honest line "Scheda non
 * compilata" when the backend has not created them yet (that happens on
 * acceptance). No place or date is ever invented.
 *
 * `sheetsFor` decides which row is which from the usernames the rows carry
 * (`docs/backend-gaps.md` G6): a row is never guessed, and a sheet whose action
 * belongs to the other side or to a later moment renders read-only.
 *
 * "Annulla scambio" (decision 4) appears only for an `ACCEPTED` agreement
 * and only when the screen passed `onCancel`; it opens the reused
 * `ConfirmModal`, and confirming calls `onCancel` — the network call and its
 * error belong to the screen, so the button draws its in-flight state from
 * `azioneInCorso` (`null` when idle, `{id, nome}` while an action flies).
 *
 * Data and callbacks only: no network, no router, no mutation of the input.
 */
export function AgreementCard({
  accordo,
  myUsername = null,
  onCancel = null,
  azioneInCorso = null,
  onInviaScheda = null,
  onConfermaScheda = null,
  onApriChat = null,
}) {
  const t = useTokens();
  const [confermaAperta, setConfermaAperta] = useState(false);
  // A sheet call is local to its row, so the card tracks it too: cancelling the
  // exchange while a sheet is in flight could land the sheet on a cancelled
  // agreement (the route only checks the status when it starts).
  const [schedaInVolo, setSchedaInVolo] = useState(false);

  const STATI = {
    PENDING: { label: 'In attesa', bg: t.serviceBg, color: t.serviceText },
    ACCEPTED: { label: 'Accettato', bg: t.successBg, color: t.successText },
    REFUSED: { label: 'Rifiutato', bg: t.dangerBg, color: t.dangerText },
    CONTESTED: { label: 'Contestato', bg: t.dangerBg, color: t.dangerText },
    // `CANCELLED` is the backend's current spelling for an annulled exchange
    // (it replaced `VOID`, which rows created before the rename still carry);
    // `COMPLETED` is written by the backend's end-date scheduler.
    CANCELLED: { label: 'Annullato', bg: t.background, color: t.textSecondary },
    COMPLETED: { label: 'Completato', bg: t.successBg, color: t.successText },
    VOID: { label: 'Annullato', bg: t.background, color: t.textSecondary },
  };
  const stato = STATI[accordo.stato] ?? {
    label: 'Stato non disponibile',
    bg: t.background,
    color: t.textSecondary,
  };

  const controparte = counterpartOf(accordo, myUsername);
  const creataIl = formatIsoDate(accordo.creazione);
  const { mia, altra } = sheetsFor(accordo, myUsername);

  // Both sheet routes only accept an accepted agreement, so the form and the
  // confirm button appear on `ACCEPTED` alone: on a cancelled or completed row
  // the same facts render read-only.
  const accettato = accordo.stato === 'ACCEPTED';
  const puoCompilare = accettato && mia !== null && !isSheetCompiled(mia) && onInviaScheda !== null;
  const puoConfermare =
    accettato &&
    altra !== null &&
    isSheetCompiled(altra) &&
    altra.beneficiarioAccettato !== true &&
    onConfermaScheda !== null;

  // Only `ACCEPTED`: the chat is the step after acceptance, even though the backend route would create it for any agreement id.
  const puoAprireChat =
    accordo.stato === 'ACCEPTED' && Number.isInteger(accordo.id) && onApriChat !== null;

  // Cancellation: accepted only, id present, the screen opted in, and no sheet
  // call of this card in flight.
  const puoAnnullare =
    accordo.stato === 'ACCEPTED' &&
    Number.isInteger(accordo.id) &&
    onCancel !== null &&
    !schedaInVolo;
  const occupato = azioneInCorso !== null || schedaInVolo;
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
        <AppIcon name="person-outline" size={16} color={t.textSecondary} />
        <AppText>{controparte ? `@${controparte}` : 'Controparte non disponibile'}</AppText>
      </View>

      {mia !== null || altra !== null ? (
        <View style={{ gap: space.sm }}>
          {mia !== null ? (
            <AgreementSheet
              titolo="La tua scheda"
              scheda={mia}
              azione={puoCompilare ? 'compila' : null}
              onInvia={(payload) => onInviaScheda(accordo.id, payload)}
              occupata={azioneInCorso !== null}
              onInVolo={setSchedaInVolo}
            />
          ) : null}
          {altra !== null ? (
            <AgreementSheet
              titolo={
                controparte ? `La scheda di @${controparte}` : "La scheda dell'altra persona"
              }
              scheda={altra}
              azione={puoConfermare ? 'conferma' : null}
              onConferma={() => onConfermaScheda(accordo.id)}
              occupata={azioneInCorso !== null}
              onInVolo={setSchedaInVolo}
            />
          ) : null}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <AppIcon name="help-circle-outline" size={16} color={t.textSecondary} />
          <AppText variant="small" tone="secondary">
            {accettato
              ? "Scheda non ancora disponibile: l'accordo è accettato, il server non ha creato le schede."
              : 'Scheda non compilata'}
          </AppText>
        </View>
      )}

      {puoAprireChat ? (
        <AppButton
          label="Apri chat"
          icon="chatbubble-ellipses-outline"
          variant="secondary"
          accessibilityLabel="Apri la chat di questo scambio"
          onPress={() => onApriChat(accordo.id)}
          disabled={occupato}
        />
      ) : null}

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
