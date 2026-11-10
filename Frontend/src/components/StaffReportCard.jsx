import { View } from 'react-native';
import { AppIcon } from './AppIcon';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card } from './Card';
import { ToneChip } from './ToneChip';
import { formatIsoDate } from '@/services/dates';
import { nomePersona } from '@/services/offer-request';
import { statusLabel, statusTone } from '@/services/reports';
import { canClaim, canReview, isClosed } from '@/services/staff';
import { space, useTokens } from '@/theme/tokens';

/**
 * One report in the staff list.
 *
 * Shows what the decision needs: who reported whom, the reason (the whole text:
 * it is the evidence), when it arrived, who took it and the review outcome when
 * closed. The actions are drawn only when the backend would accept them —
 * "Prendi in carico" on a `PENDING` report, "Esamina e chiudi" on an
 * `IN_REVIEW` report assigned to the caller (the label says the command opens
 * the review, F31) — and the accessibility labels name the reported
 * person so repeated cards stay distinguishable.
 */
export function StaffReportCard({ report, staffId, busy = false, onClaim, onReview }) {
  const t = useTokens();
  const reported = nomePersona(report.segnalato);
  const reporter = nomePersona(report.autore);

  return (
    <Card>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}
      >
        <ToneChip tono={statusTone(report.stato)}>
          {statusLabel(report.stato) ?? 'Stato sconosciuto'}
        </ToneChip>
        <AppText variant="small" tone="secondary">
          {formatIsoDate(report.creataIl) ?? 'Data non disponibile'}
        </AppText>
      </View>

      <View style={{ gap: space.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <AppIcon name="person-outline" size={15} color={t.textSecondary} />
          <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
            {`${reporter} segnala ${reported}`}
          </AppText>
        </View>
        <AppText variant="body">{report.motivo}</AppText>
      </View>

      {report.assegnataA?.id ? (
        <AppText variant="small" tone="secondary">
          {`Presa in carico da ${nomePersona(report.assegnataA)}.`}
        </AppText>
      ) : null}
      {report.nota ? (
        <AppText variant="small" tone="secondary">
          {`Nota della staff: ${report.nota}`}
        </AppText>
      ) : null}

      {isClosed(report) ? (
        <AppText variant="small" tone="secondary">
          Pratica chiusa: non ci sono azioni da fare.
        </AppText>
      ) : (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {canClaim(report) ? (
            <AppButton
              label="Prendi in carico"
              variant="secondary"
              icon="eye-outline"
              loading={busy}
              disabled={busy}
              onPress={onClaim}
              accessibilityLabel={`Prendi in carico la segnalazione su ${reported}`}
              style={{ flex: 1 }}
            />
          ) : null}
          {canReview(report, staffId) ? (
            <AppButton
              label="Esamina e chiudi"
              icon="checkmark-done-outline"
              disabled={busy}
              onPress={onReview}
              accessibilityLabel={`Esamina e chiudi la segnalazione su ${reported}`}
              style={{ flex: 1 }}
            />
          ) : null}
          {!canClaim(report) && !canReview(report, staffId) ? (
            <AppText variant="small" tone="secondary">
              In esame da un altro membro dello staff.
            </AppText>
          ) : null}
        </View>
      )}
    </Card>
  );
}
