import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { formatIsoDate } from '@/services/dates';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * One row of the notifications inbox.
 *
 * Data and callbacks only: no network, no state of its own, no mutation of the
 * input. The screen owns the calls and passes `inCorso` back down so the row can
 * show which of its two actions is flying.
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

  return (
    <Card
      style={{
        gap: space.sm,
        // An unread row is marked by the surface, not by a dot nobody notices,
        // and the accent border makes it legible in both themes.
        backgroundColor: notifica.letta ? t.surface : t.serviceBg,
        borderWidth: 1,
        borderColor: notifica.letta ? t.border : t.primary,
        borderRadius: radius.input,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        <AppIcon name={iconaTipo(notifica.tipo)} size={16} color={t.textSecondary} />
        <Chip background={notifica.letta ? t.background : t.surface}>
          <AppText variant="caption" style={{ color: notifica.letta ? t.textSecondary : t.primary }}>
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
          variant="danger"
          icon="trash-outline"
          onPress={onElimina}
          loading={eliminaInCorso}
          disabled={occupata && !eliminaInCorso}
          accessibilityLabel="Elimina questa notifica"
        />
      </View>
    </Card>
  );
}
