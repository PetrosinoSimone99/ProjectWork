import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { AppInput } from './AppInput';
import { Banner } from './Banner';
import { PillBar } from './PillBar';
import { REVIEW_LABELS, REVIEW_NOTE_MAX, REVIEW_OUTCOMES } from '@/services/staff';
import { space } from '@/theme/tokens';

/** The two outcomes as the pills of a `PillBar`. */
const OUTCOME_CHOICES = Object.values(REVIEW_OUTCOMES).map((outcome) => ({
  valore: outcome,
  etichetta:
    outcome === REVIEW_OUTCOMES.CONFIRMED ? 'Conferma la segnalazione' : 'Respingi la segnalazione',
}));

/**
 * The review sheet of a claimed report: one outcome, one mandatory note.
 *
 * The note is what the decision was based on, so it is required (1–2000
 * characters). Nothing is written directly: the screen validates, then asks for
 * confirmation with a `ConfirmModal`, because closing a report has consequences
 * for two people.
 */
export function ReportReviewSheet({
  outcome,
  note,
  errors = {},
  busy = false,
  onChangeOutcome,
  onChangeNote,
  onSubmit,
  onCancel,
}) {
  return (
    // La cornice la disegna `ModalShell` (titolo «Esito e nota» e la riga di
    // descrizione): qui c'è solo il contenuto, senza un secondo pannello dentro
    // il pannello (F38, un solo chrome).
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.sm }}>
        <AppText variant="small" style={{ fontWeight: '600' }}>
          Esito
        </AppText>
        <PillBar
          accessibilityLabel="Esito della segnalazione"
          scelte={OUTCOME_CHOICES}
          valore={outcome}
          onChange={onChangeOutcome}
          disabled={busy}
        />
        {errors.outcome ? (
          <AppText variant="small" tone="danger">
            {errors.outcome}
          </AppText>
        ) : null}
      </View>

      <AppInput
        label="Nota"
        value={note}
        onChangeText={onChangeNote}
        placeholder="Cosa hai verificato e perché hai deciso così."
        multiline
        autoCapitalize="sentences"
        maxLength={REVIEW_NOTE_MAX}
        contatore={`${note.length}/${REVIEW_NOTE_MAX}`}
        error={errors.note ?? null}
        editable={!busy}
      />

      {errors.form ? <Banner kind="error" message={errors.form} /> : null}

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {/* Senza un esito scelto il pulsante non parte e non dichiara un'azione
            che non esiste: prima si chiamava «Chiudi la segnalazione» mentre non
            c'era niente da chiudere (audit UX F07). */}
        <AppButton
          label={outcome ? (REVIEW_LABELS[outcome] ?? 'Conferma l’esito') : 'Scegli un esito'}
          onPress={onSubmit}
          disabled={busy || !outcome}
          style={{ flex: 1 }}
        />
        <AppButton label="Annulla" variant="secondary" onPress={onCancel} disabled={busy} />
      </View>
    </View>
  );
}
