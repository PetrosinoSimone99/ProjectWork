import { useId, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { radius, space, target, useTokens } from '@/theme/tokens';

/**
 * Altezza minima del campo multilinea quando nessuno la dichiara: 96 pt, quattro
 * righe di corpo. È il valore che il campo ha sempre avuto e resta il default
 * perché sei campi lo usano così (i due form, il profilo, la segnalazione, la
 * revisione staff, l'editor delle voci): un modulo si compila, e lo spazio per
 * una frase intera è la sua misura.
 *
 * Il composer della chat la abbassa (`altezzaMinima`): lì il campo è la riga di
 * scrittura di una conversazione, non un modulo, e ogni punto che prende è un
 * punto tolto ai messaggi.
 */
const ALTEZZA_MINIMA_MULTILINEA = 96;

/** Campo con etichetta SOPRA, errore SOTTO, focus visibile e toggle password. */
export function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  maxLength,
  editable,
  optionalHint,
  contatore,
  returnKeyType,
  onSubmitEditing,
  accessibilityLabel = null,
  // Vale solo con `multiline`: senza, il campo resta una riga sola.
  altezzaMinima = ALTEZZA_MINIMA_MULTILINEA,
  // Il `ref` arriva come prop (React 19): React Native non passa ancora il ref
  // ai componenti funzione. Serve a chi deve portare il focus sul primo campo
  // non valido dopo un invio fallito (audit 2026-11-18, P2) senza cercare il
  // nodo nel DOM.
  ref = null,
}) {
  const t = useTokens();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);
  // L'etichetta visibile è un `AppText` fratello dell'input: senza un nome
  // esplicito il campo veniva annunciato con il suo placeholder (audit UX F14).
  // `accessibilityLabel` copre tutte le piattaforme, `aria-describedby` lega
  // l'errore al campo sul web e `nativeID`/`id` lo rendono unico nella pagina.
  //
  // Il nome accessibile è la prop omonima quando c'è: due campi possono portare
  // la stessa etichetta visibile in due sezioni diverse della stessa schermata
  // (la «Mansione» dell'offerta e quella della richiesta, audit UX F18) e in tal
  // caso chi ascolta deve poterli distinguere. La parola sullo schermo resta
  // quella, perché è il vocabolario del prodotto.
  // Su native `aria-invalid` resta un attributo del DOM e `accessibilityState`
  // non conosce un valore `invalid` (le chiavi sono disabled/selected/checked/
  // busy/expanded): l'errore non arrivava a VoiceOver e TalkBack. Viaggia
  // invece nell'hint del campo, che è il canale che il nativo pronuncia insieme
  // al nome quando il campo prende il focus, e resta un dato onesto: la frase è
  // quella che l'occhio legge sotto il campo.
  const suNativo = Platform.OS !== 'web';
  const idCampo = `campo-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const idErrore = `${idCampo}-errore`;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <AppText variant="small" style={{ fontWeight: '600' }}>
          {label}
        </AppText>
        {contatore || optionalHint ? (
          <AppText variant="small" tone="secondary">
            {contatore ?? optionalHint}
          </AppText>
        ) : null}
      </View>
      <View
        style={[
          styles.box,
          {
            backgroundColor: t.surface,
            // Bordo di controllo: `borderInput` garantisce ≥ 3:1 (WCAG 1.4.11).
            borderColor: error ? t.danger : focused ? t.primary : t.borderInput,
          },
        ]}
      >
        <TextInput
          ref={ref}
          style={[
            styles.input,
            { color: t.text },
            multiline && styles.multiline,
            multiline && { minHeight: altezzaMinima },
          ]}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={suNativo && error ? error : undefined}
          nativeID={idCampo}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idErrore : undefined}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.textSecondary}
          secureTextEntry={hidden}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostra password' : 'Nascondi password'}
            onPress={() => setHidden(!hidden)}
            hitSlop={8}
            // Bersaglio di tocco CT06 (P60): l'icona da 20px non basta.
            style={({ pressed }) => ({
              minWidth: target.min,
              minHeight: target.min,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <AppIcon
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={t.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        // Regione viva (audit 2026-11-18, P2): quando la frase compare, dopo un
        // invio fallito, il nativo la annuncia. Vale solo su native — sul web
        // `accessibilityLiveRegion` diventa un `aria-live` e il comportamento
        // della pagina (errore letto via `aria-describedby`) resta quello di
        // prima.
        <AppText
          variant="small"
          tone="danger"
          nativeID={idErrore}
          accessibilityLiveRegion={suNativo ? 'polite' : undefined}
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space.xs },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.input,
    paddingHorizontal: space.md,
  },
  // On the web a flex item keeps `min-width: auto`, so the field's intrinsic
  // width wins over its container and at 320 px the input crossed the viewport
  // (mobile audit F1). Zero is already what native does by default.
  input: { flex: 1, minWidth: 0, minHeight: 48, fontSize: 15, paddingVertical: space.sm },
  // L'altezza minima arriva dalla prop (`ALTEZZA_MINIMA_MULTILINEA` di default):
  // qui resta solo ciò che è del campo e non dipende da chi lo usa.
  multiline: { textAlignVertical: 'top' },
});
