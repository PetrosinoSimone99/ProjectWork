import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { SCELTE_MODALITA } from '@/servizi/offerta-ricerca';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * La modalità di erogazione: tre scelte in fila — «Tutti», «Da remoto»,
 * «In presenza» — come pill in un `radiogroup`.
 *
 * Tre stati e non una casella «solo da remoto»: un servizio può essere offerto
 * in entrambi i modi (le ripetizioni, per esempio), e con una casella il caso
 * simmetrico «solo in presenza» non sarebbe esprimibile. Il valore del filtro è
 * `null | true | false`.
 *
 * Lo stato viaggia su due canali con lo stesso valore — `accessibilityState={{ checked }}`
 * **e** `aria-checked` — perché su web `react-native-web` ignora
 * `accessibilityState` e legge solo gli attributi `aria-*` (la lezione di
 * `AppCheckbox` e `SelettoreCategoria`). Nessuna libreria di segmenti è
 * installata e non se ne aggiungono: tre `Pressable` e i token bastano.
 */
export function SelettoreModalita({ label = 'Modalità', value, onChange, disabled = false, style }) {
  const t = useTokens();

  return (
    <View style={[{ gap: space.xs }, style]}>
      <AppText variant="small" style={{ fontWeight: '600' }}>
        {label}
      </AppText>

      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}
      >
        {SCELTE_MODALITA.map((scelta) => {
          const attiva = scelta.valore === value;
          return (
            <Pressable
              key={scelta.etichetta}
              accessibilityRole="radio"
              accessibilityLabel={scelta.etichetta}
              accessibilityState={{ checked: attiva, disabled }}
              aria-checked={attiva}
              aria-disabled={disabled}
              disabled={disabled}
              onPress={() => onChange(scelta.valore)}
              style={({ pressed }) => ({
                minHeight: 44,
                paddingHorizontal: space.lg,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: attiva ? t.primary : t.border,
                backgroundColor: attiva ? t.primary : pressed ? t.border : t.surface,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: disabled ? 0.55 : 1,
              })}
            >
              <AppText style={{ color: attiva ? t.onPrimary : t.text, fontWeight: '600' }}>
                {scelta.etichetta}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
