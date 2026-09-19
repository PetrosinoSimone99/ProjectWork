import { BarraPillole } from './BarraPillole';
import { STATI_SEGNALAZIONE } from '@/servizi/segnalazioni';

/**
 * Il filtro per stato dell'area staff: le tre scelte dello stato più «Tutte».
 *
 * «Tutte» non è un quarto stato: è l'**assenza** di filtro (`null`), ed è il
 * valore di partenza — aprendo la schermata si vede tutto quello che c'è da
 * esaminare. Le tre scelte vere sono gli stati della segnalazione, che restano in
 * `servizi/segnalazioni.js`: qui non si ridichiara nessun valore.
 *
 * Il disegno è quello comune di `BarraPillole`: la riga di pillole è la stessa
 * forma dei filtri degli utenti (`staff-utenti.jsx`).
 */
export const FILTRI_STAFF = [
  { valore: null, etichetta: 'Tutte' },
  { valore: STATI_SEGNALAZIONE.OPEN, etichetta: 'Aperte' },
  { valore: STATI_SEGNALAZIONE.IN_REVIEW, etichetta: 'In esame' },
  { valore: STATI_SEGNALAZIONE.CLOSED, etichetta: 'Chiuse' },
];

export function BarraStatoStaff({ filtro, onChange, disabled = false, style }) {
  return (
    <BarraPillole
      accessibilityLabel="Filtra le segnalazioni per stato"
      scelte={FILTRI_STAFF}
      valore={filtro}
      onChange={onChange}
      disabled={disabled}
      style={style}
    />
  );
}
