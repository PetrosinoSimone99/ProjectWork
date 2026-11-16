import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { space } from '@/theme/tokens';

/**
 * Chat composer: it owns the draft, the caller owns the send.
 *
 * The 1000-character cap is ours, not the backend's:
 * `Backend/src/Entity/ChatMessage.php` has no constraint, so an unbounded
 * message would be stored as-is. `maxLength` stops the field, the guard
 * re-checks the trimmed text before `onInvia` runs, and the refusal is shown
 * as the field's error instead of failing silently.
 */
const LIMITE_TESTO = 1000;
const ERRORE_TESTO_LUNGO = 'Il messaggio è troppo lungo (massimo 1000 caratteri).';

export function MessageComposer({ onInvia, inviando = false, disabilitato = false }) {
  const [testo, setTesto] = useState('');
  const [errore, setErrore] = useState(null);

  const pulito = testo.trim();
  // Empty text locks the send only: the field must stay typeable, or a fresh
  // chat could never receive its first message (brief, decision 6).
  const nonParte = pulito === '' || inviando || disabilitato;

  const cambiaTesto = (nuovo) => {
    setTesto(nuovo);
    setErrore(null);
  };

  const invia = async () => {
    if (nonParte) return;
    if (pulito.length > LIMITE_TESTO) {
      setErrore(ERRORE_TESTO_LUNGO);
      return;
    }
    // The draft is cleared only when the send went through: a caller that
    // answers `false` (a failed POST) keeps the text the person typed.
    const esito = await onInvia(pulito);
    if (esito !== false) {
      setTesto('');
    }
  };

  return (
    <View style={styles.composer}>
      <AppInput
        label="Messaggio"
        value={testo}
        onChangeText={cambiaTesto}
        multiline
        maxLength={LIMITE_TESTO}
        contatore={`${testo.length}/${LIMITE_TESTO}`}
        editable={!inviando && !disabilitato}
        error={errore}
        accessibilityLabel="Scrivi un messaggio"
      />
      <AppButton label="Invia" onPress={invia} loading={inviando} disabled={nonParte} />
    </View>
  );
}

const styles = StyleSheet.create({
  composer: { gap: space.sm },
});
