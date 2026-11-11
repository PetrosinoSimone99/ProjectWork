import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card } from './Card';
import { ToneChip } from './ToneChip';
import { nomePersona } from '@/services/offer-request';
import {
  ACCOUNT_STATUSES,
  accountStatusLabel,
  accountStatusTone,
  accountStatusValue,
  canChangeStatus,
  canPromote,
  nextAccountStatus,
  roleLabel,
  roleTone,
  roleValue,
} from '@/services/staff-users';
import { space } from '@/theme/tokens';

/**
 * One user in the staff list.
 *
 * Shows name, username, role and account status, and draws a command only when
 * the backend would accept it: promoting is possible on an active non-staff
 * account, changing the status on a non-staff account, and neither on your own.
 * The commands open the confirmation of the screen, which names the person and
 * the change.
 *
 * Accessibility labels name the person: in a list of repeated rows a bare
 * "Rendi staff" does not say who.
 */
export function StaffUserCard({ user, callerId, busy = false, onPromote, onStatusChange }) {
  const name = nomePersona(user);
  const promote = canPromote(callerId, user);
  const status = canChangeStatus(callerId, user);
  const currentStatus = accountStatusValue(user);
  const target = nextAccountStatus(user);
  // One verb pair for the state whose chip already reads "Sospeso" (F31).
  const statusLabel =
    target === ACCOUNT_STATUSES.INACTIVE ? 'Sospendi' : 'Riattiva';
  const statusAria =
    target === ACCOUNT_STATUSES.INACTIVE
      ? `Sospendi l'account di ${name}`
      : `Riattiva l'account di ${name}`;
  // Sospendere toglie l'accesso: è l'unica azione distruttiva della card, e per
  // questo ha una riga sua (F83).
  const statusEliminativo = target === ACCOUNT_STATUSES.INACTIVE;

  return (
    <Card>
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm }}
      >
        <View style={{ flexShrink: 1, gap: space.xs }}>
          <AppText variant="heading">{name}</AppText>
          <AppText variant="small" tone="secondary">
            {user.username ? `@${user.username}` : 'Username non disponibile'}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, justifyContent: 'flex-end' }}>
          <ToneChip tono={roleTone(roleValue(user))}>
            {roleLabel(roleValue(user)) ?? 'Ruolo sconosciuto'}
          </ToneChip>
          <ToneChip tono={accountStatusTone(currentStatus)}>
            {accountStatusLabel(currentStatus) ?? 'Stato sconosciuto'}
          </ToneChip>
        </View>
      </View>

      {promote || status ? (
        // Una colonna di azioni, non un flusso che va a capo (audit UX F83):
        // «Rendi staff» e «Riattiva» dividono una riga, «Sospendi» — che toglie
        // l'accesso — ha sempre la sua. A 360 la coppia non si sfilacciava per
        // caso ma per spazio rimasto; ora la regola è la stessa a ogni larghezza.
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {promote ? (
              <AppButton
                label="Rendi staff"
                variant="secondary"
                icon="shield-checkmark-outline"
                disabled={busy}
                loading={busy}
                onPress={onPromote}
                accessibilityLabel={`Rendi staff ${name}`}
                style={{ flex: 1 }}
              />
            ) : null}
            {status && !statusEliminativo ? (
              <AppButton
                label={statusLabel}
                variant="secondary"
                icon="checkmark-circle-outline"
                disabled={busy}
                onPress={onStatusChange}
                accessibilityLabel={statusAria}
                style={{ flex: 1 }}
              />
            ) : null}
          </View>
          {status && statusEliminativo ? (
            <AppButton
              label={statusLabel}
              variant="danger"
              icon="power-outline"
              disabled={busy}
              onPress={onStatusChange}
              accessibilityLabel={statusAria}
              style={{ alignSelf: 'flex-start' }}
            />
          ) : null}
        </View>
      ) : (
        <AppText variant="small" tone="secondary">
          Su questo account non hai azioni: o è il tuo, o il suo ruolo non lo consente.
        </AppText>
      )}
    </Card>
  );
}
