import { Pressable, ScrollView } from 'react-native';
import { AppText } from './AppText';
import { opacity, radius, space, target, useTokens } from '@/theme/tokens';

/**
 * Una riga di pillole selezionabili: la forma comune dei filtri e delle scelte
 * brevi (lo stato delle segnalazioni, il ruolo e lo stato degli utenti, il nuovo
 * valore di un comando).
 *
 * Le scelte sono `{valore, etichetta}` e `valore` può essere `null`: significa
 * «nessun filtro», ed è la scelta di partenza delle barre di filtro. Il confronto
 * è stretto (`===`) proprio per distinguere `null` dai valori veri.
 *
 * Tre decisioni, tutte dell'audit (F55, F85) e della direzione UX «A»:
 *
 * 1. **È un `radiogroup`, non una `tablist`** (F55). Le pillole non cambiano
 *    pannello: scelgono un valore fra alternative mutuamente esclusive, che è
 *    esattamente ciò che `radio` dichiara. La `tablist` prometteva un `tabpanel`
 *    che non esisteva. È lo stesso pattern di `ThemeSelector`.
 * 2. **Scorre in orizzontale invece di andare a capo** (F85): cinque stati che a
 *    390 px si spezzavano 4+1 ora restano una riga sola che si trascina, e a
 *    1280 stanno comunque tutti in fila. Una riga spezzata faceva sembrare due
 *    gruppi quello che è una scelta sola.
 * 3. Lo stato viaggia su due canali con lo stesso valore — `accessibilityState={{ checked }}`
 *    **e** `aria-checked` — perché su web `react-native-web` ignora
 *    `accessibilityState` e legge solo gli attributi `aria-*`.
 *
 * La pillola attiva è anche l'unico posto in cui il colore primario dice
 * qualcosa, e l'etichetta accessibile è la stessa parola scritta.
 */
export function PillBar({
  scelte,
  valore,
  onChange,
  accessibilityLabel,
  disabled = false,
  style,
}) {
  const t = useTokens();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={style}
      contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
    >
      {scelte.map((scelta) => {
        const attivo = valore === scelta.valore;
        return (
          <Pressable
            key={scelta.etichetta}
            accessibilityRole="radio"
            accessibilityLabel={scelta.etichetta}
            accessibilityState={{ checked: attivo, disabled }}
            aria-checked={attivo}
            disabled={disabled}
            onPress={() => onChange(scelta.valore)}
            style={({ pressed }) => ({
              // 44 pt: la pillola era 34 pt (8+18+8), audit UX F17.
              minHeight: target.min,
              justifyContent: 'center',
              paddingVertical: space.sm,
              paddingHorizontal: space.lg,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: attivo ? t.primary : t.borderInput,
              backgroundColor: attivo ? t.primary : pressed ? t.border : 'transparent',
              opacity: disabled ? opacity.disabled : 1,
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
    </ScrollView>
  );
}
