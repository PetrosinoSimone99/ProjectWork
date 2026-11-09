import { PillBar } from './PillBar';
import { REPORT_STATUS, REPORT_STATUS_LABELS } from '@/services/reports';

/**
 * The report-status filter of the staff area: "Tutte" plus the four statuses of
 * `UserReport::STATUS_*`. "Tutte" is not a fifth status: it is the absence of a
 * filter (`null`), and it is where the screen starts.
 */
export const REPORT_STATUS_FILTERS = [
  { valore: null, etichetta: 'Tutte' },
  { valore: REPORT_STATUS.PENDING, etichetta: 'Aperte' },
  { valore: REPORT_STATUS.IN_REVIEW, etichetta: 'In esame' },
  { valore: REPORT_STATUS.CONFIRMED, etichetta: 'Confermate' },
  { valore: REPORT_STATUS.REJECTED, etichetta: 'Respinte' },
];

/** Human sentence for the empty list of a given filter. */
export function emptyTextForFilter(filter) {
  if (filter === null) {
    return 'Non c\u2019è nessuna segnalazione.';
  }
  const label = REPORT_STATUS_LABELS[filter] ?? filter;
  return `Non c\u2019è nessuna segnalazione «${label.toLowerCase()}».`;
}

export function StaffStatusBar({ filter, onChange, disabled = false, style }) {
  return (
    <PillBar
      accessibilityLabel="Filtra le segnalazioni per stato"
      scelte={REPORT_STATUS_FILTERS}
      valore={filter}
      onChange={onChange}
      disabled={disabled}
      style={style}
    />
  );
}
