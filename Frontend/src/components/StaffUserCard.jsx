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
  const statusLabel =
    target === ACCOUNT_STATUSES.INACTIVE ? 'Disattiva' : 'Riattiva';
  const statusAria =
    target === ACCOUNT_STATUSES.INACTIVE
      ? `Disattiva l'account di ${name}`
      : `Riattiva l'account di ${name}`;

  return (
    <Card>
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm }}
      >
        <View style={{ flexShrink: 1, gap: space.xs }}>
          <AppText variant="heading" style={{ fontSize: 17 }}>
            {name}
          </AppText>
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
          {status ? (
            <AppButton
              label={statusLabel}
              variant={target === ACCOUNT_STATUSES.INACTIVE ? 'danger' : 'secondary'}
              icon={target === ACCOUNT_STATUSES.INACTIVE ? 'power-outline' : 'checkmark-circle-outline'}
              disabled={busy}
              onPress={onStatusChange}
              accessibilityLabel={statusAria}
              style={{ flex: 1 }}
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
