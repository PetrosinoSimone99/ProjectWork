import { useState } from 'react';
import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { ConfirmModal } from './ConfirmModal';
import { formatIsoDate } from '@/services/dates';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * One row of the notifications inbox.
 *
 * Data and callbacks only: no network, no mutation of the input. The screen
 * owns the calls and passes `inCorso` back down so the row can show which of
 * its two actions is flying. The one piece of state the row keeps is whether
 * its delete confirmation is open — pure UI, the same as `AgreementCard`:
 * `onElimina` fires only from the confirm panel, never from the row button.
 *
 * `type` is a free-form backend string (the scheduler even writes one in lower
 * case, which the normaliser upper-cases). Unknown types are not an error: they
 * keep the generic label and the bell icon, so a backend that adds an event
 * tomorrow shows up as a readable row instead of a blank one.
 */
const TIPI = {
  AGREEMENT_PROPOSAL: { etichetta: 'Proposta', icona: 'swap-horizontal-outline' },
  AGREEMENT_RESPONSE: { etichetta: 'Risposta', icona: 'swap-horizontal-outline' },
  AGREEMENT_DETAILS: { etichetta: 'Scheda', icona: 'document-text-outline' },
  AGREEMENT_DETAILS_ACCEPTED: { etichetta: 'Scheda confermata', icona: 'checkmark-circle-outline' },
  AGREEMENT_CANCELLED: { etichetta: 'Annullamento', icona: 'close-circle-outline' },
  AGREEMENT_COMPLETED: { etichetta: 'Completato', icona: 'checkmark-done-outline' },
  CHAT_MESSAGE: { etichetta: 'Messaggio', icona: 'chatbubble-outline' },
  MATCH_CREATED: { etichetta: 'Match', icona: 'git-compare-outline' },
  REPORT_CLAIMED: { etichetta: 'Segnalazione', icona: 'shield-checkmark-outline' },
  REPORT_REVIEWED: { etichetta: 'Segnalazione', icona: 'shield-checkmark-outline' },
  SERVICE_RESTORED: { etichetta: 'Servizio', icona: 'refresh-outline' },
  USER_PROMOTED: { etichetta: 'Ruolo', icona: 'person-outline' },
  USER_STATUS_CHANGED: { etichetta: 'Account', icona: 'person-outline' },
};

const TIPO_SCONOSCIUTO = { etichetta: 'Notifica', icona: 'notifications-outline' };

/** The Italian label of a notification type, generic for an unknown one. */
export function etichettaTipo(tipo) {
  return TIPI[typeof tipo === 'string' ? tipo.toUpperCase() : '']?.etichetta ?? TIPO_SCONOSCIUTO.etichetta;
}

/** The icon of a notification type, the bell for an unknown one. */
export function iconaTipo(tipo) {
  return TIPI[typeof tipo === 'string' ? tipo.toUpperCase() : '']?.icona ?? TIPO_SCONOSCIUTO.icona;
}

/**
 * `15 nov 2026, 10:00` — an inbox row needs the time, not only the day: "3
 * hours ago" against a whole day is what makes a notification look old.
 * `null` when the value is missing or unparseable, and the row draws no date.
 */
export function quandoNotifica(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) {
    return null;
  }
  const giorno = formatIsoDate(value);
  const ora = data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return giorno === null ? null : `${giorno}, ${ora}`;
}

export function NotificationRow({ notifica, inCorso = null, onLetta = null, onElimina = null }) {
  const t = useTokens();
  const quando = quandoNotifica(notifica.creataIl);
  const occupata = inCorso !== null;
  const lettaInCorso = inCorso?.nome === 'letta';
  const eliminaInCorso = inCorso?.nome === 'elimina';
  const [confermaAperta, setConfermaAperta] = useState(false);

  return (
    <Card
      style={{
        gap: space.sm,
        // The card keeps the surface in both themes: the unread state is the
        // accent border plus the leading dot below, because `serviceBg` is
        // reserved to data marks (docs/DESIGN.md).
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: notifica.letta ? t.border : t.primary,
        borderRadius: radius.input,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        {/* The unread marker: one dot on the leading edge, in front of the
            type chip, so the state reads without filling the whole card. */}
        {notifica.letta ? null : (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: radius.pill,
              backgroundColor: t.primary,
            }}
          />
        )}
        <AppIcon name={iconaTipo(notifica.tipo)} size={16} color={t.textSecondary} />
        <Chip background={notifica.letta ? t.background : t.serviceBg}>
          <AppText
            variant="caption"
            style={{ color: notifica.letta ? t.textSecondary : t.serviceText }}
          >
            {etichettaTipo(notifica.tipo)}
          </AppText>
        </Chip>
        <View style={{ flex: 1 }} />
        {quando ? (
          <AppText variant="small" tone="secondary">
            {quando}
          </AppText>
        ) : null}
      </View>

      <AppText>{notifica.messaggio ?? 'Notifica senza testo.'}</AppText>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        {notifica.letta ? null : (
          <AppButton
            label="Segna come letta"
            variant="ghost"
            icon="checkmark-outline"
            onPress={onLetta}
            loading={lettaInCorso}
            disabled={occupata && !lettaInCorso}
            accessibilityLabel="Segna questa notifica come letta"
          />
        )}
        <AppButton
          label="Elimina"
          variant="dangerGhost"
          icon="trash-outline"
          onPress={() => setConfermaAperta(true)}
          loading={eliminaInCorso}
          disabled={occupata && !eliminaInCorso}
          accessibilityLabel="Elimina questa notifica"
        />
      </View>
      <ConfirmModal
        visible={confermaAperta}
        titolo="Eliminare questa notifica?"
        messaggio="La notifica sparisce per sempre."
        etichettaConferma="Elimina"
        loading={eliminaInCorso}
        onConferma={() => {
          setConfermaAperta(false);
          onElimina?.();
        }}
        onAnnulla={() => setConfermaAperta(false)}
      />
    </Card>
  );
}
