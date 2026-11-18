import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { ConfirmModal } from './ConfirmModal';
import { formatIsoDate } from '@/services/dates';
import { counterpartOf } from '@/services/agreements';
import { space, useTokens } from '@/theme/tokens';

/**
 * One agreement of the agreements tab: who the other participant is, the
 * status in Italian, the services the two proposals were about, and the two
 * actions an accepted exchange has.
 *
 * The delivery sheet is **not** here: it lives in the chat of the agreement
 * (`AgreementFormModal` to write it, `AgreementSheet` to read or confirm it),
 * because it is a step of the conversation and not a datum of the list
 * (`docs/briefs/agreements-workflow/plan.md`, lane C). What stays is what the
 * list is for — recognise the exchange — plus the entries to the chat.
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
  onApriChat = null,
}) {
  const router = useRouter();
  const other = accordo.proposte?.find((proposal) => proposal.username !== myUsername);
  const t = useTokens();
  const [confermaAperta, setConfermaAperta] = useState(false);

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

  // Only `ACCEPTED`: the chat is the step after acceptance, even though the backend route would create it for any agreement id.
  const puoAprireChat =
    accordo.stato === 'ACCEPTED' && Number.isInteger(accordo.id) && onApriChat !== null;

  const puoAnnullare =
    accordo.stato === 'ACCEPTED' && Number.isInteger(accordo.id) && onCancel !== null;
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
        <AppText onPress={other?.idUtente ? () => router.push('/user/' + other.idUtente) : undefined}>{controparte ? `@${controparte}` : 'Controparte non disponibile'}</AppText>
      </View>

      {accordo.proposte?.filter((proposal) => proposal.descrizioneServizio).map((proposal) => (
        <AppText key={proposal.username} variant="small">{'@' + proposal.username + ': ' + proposal.descrizioneServizio}</AppText>
      ))}

      {puoAprireChat ? (
        <AppButton
          label="Apri chat"
          icon="chatbubble-ellipses-outline"
          variant="secondary"
          accessibilityLabel="Apri la chat di questo scambio"
          onPress={() => onApriChat(accordo.id)}
          disabled={azioneInCorso !== null}
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
            disabled={azioneInCorso !== null && !miaAnnulla}
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
