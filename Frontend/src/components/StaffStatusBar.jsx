import { PillBar } from './PillBar';
import { STATI_SEGNALAZIONE } from '@/services/reports';

/**
 * Il filtro per stato dell'area staff: le tre scelte dello stato più «Tutte».
 *
 * «Tutte» non è un quarto stato: è l'**assenza** di filtro (`null`), ed è il
 * valore di partenza — aprendo la schermata si vede tutto quello che c'è da
 * esaminare. Le tre scelte vere sono gli stati della segnalazione, che restano in
 * `services/reports.js`: qui non si ridichiara nessun valore.
 *
 * Il disegno è quello comune di `PillBar`: la riga di pillole è la stessa
 * forma dei filtri degli utenti (`staff-users.jsx`).
 */
export const FILTRI_STAFF = [
  { valore: null, etichetta: 'Tutte' },
  { valore: STATI_SEGNALAZIONE.OPEN, etichetta: 'Aperte' },
  { valore: STATI_SEGNALAZIONE.IN_REVIEW, etichetta: 'In esame' },
  { valore: STATI_SEGNALAZIONE.CLOSED, etichetta: 'Chiuse' },
];

export function StaffStatusBar({ filtro, onChange, disabled = false, style }) {
  return (
    <PillBar
      accessibilityLabel="Filtra le segnalazioni per stato"
      scelte={FILTRI_STAFF}
      valore={filtro}
      onChange={onChange}
      disabled={disabled}
      style={style}
    />
  );
}
