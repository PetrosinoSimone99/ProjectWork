import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Una riga di pillole selezionabili: la forma comune dei filtri e delle scelte
 * brevi (lo stato delle segnalazioni, il ruolo e lo stato degli utenti, il nuovo
 * valore di un comando).
 *
 * Le scelte sono `{valore, etichetta}` e `valore` può essere `null`: significa
 * «nessun filtro», ed è la scelta di partenza delle barre di filtro. Il confronto
 * è stretto (`===`) proprio per distinguere `null` dai valori veri.
 *
 * È una riga di pillole e non una tendina perché le scelte sono poche e si
 * leggono tutte insieme; la pillola attiva è anche l'unico posto in cui il colore
 * primario dice qualcosa, e l'etichetta accessibile è la stessa parola scritta.
 */
export function BarraPillole({
  scelte,
  valore,
  onChange,
  accessibilityLabel,
  disabled = false,
  style,
}) {
  const t = useTokens();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }, style]}
    >
      {scelte.map((scelta) => {
        const attivo = valore === scelta.valore;
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
