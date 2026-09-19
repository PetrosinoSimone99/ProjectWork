import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { STATI_SEGNALAZIONE } from '@/servizi/segnalazioni';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Il filtro per stato dell'area staff: le tre scelte dello stato più «Tutte».
 *
 * «Tutte» non è un quarto stato: è l'**assenza** di filtro (`null`), ed è il
 * valore di partenza — aprendo la schermata si vede tutto quello che c'è da
 * esaminare. Le tre scelte vere sono gli stati della segnalazione, che restano in
 * `servizi/segnalazioni.js`: qui non si ridichiara nessun valore.
 *
 * È una riga di pillole e non una tendina perché le scelte sono poche e si
 * leggono tutte insieme; la pillola attiva è anche l'unico posto in cui il colore
 * primario dice qualcosa, e l'etichetta accessibile è la stessa parola scritta.
 */
export const FILTRI_STAFF = [
  { valore: null, etichetta: 'Tutte' },
  { valore: STATI_SEGNALAZIONE.OPEN, etichetta: 'Aperte' },
  { valore: STATI_SEGNALAZIONE.IN_REVIEW, etichetta: 'In esame' },
  { valore: STATI_SEGNALAZIONE.CLOSED, etichetta: 'Chiuse' },
];

export function BarraStatoStaff({ filtro, onChange, disabled = false, style }) {
  const t = useTokens();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Filtra le segnalazioni per stato"
      style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }, style]}
    >
      {FILTRI_STAFF.map((scelta) => {
        const attivo = filtro === scelta.valore;
        return (
          <Pressable
            key={scelta.etichetta}
            accessibilityRole="tab"
            accessibilityLabel={scelta.etichetta}
            accessibilityState={{ selected: attivo, disabled }}
            aria-selected={attivo}
            disabled={disabled}
            onPress={() => onChange(scelta.valore)}
            style={({ pressed }) => ({
              paddingVertical: space.sm,
              paddingHorizontal: space.lg,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: attivo ? t.primary : t.border,
              backgroundColor: attivo ? t.primary : pressed ? t.border : 'transparent',
              opacity: disabled ? 0.55 : 1,
            })}
          >
            <AppText
              variant="small"
              style={{ color: attivo ? t.onPrimary : t.text, fontWeight: '600' }}
            >
              {scelta.etichetta}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
