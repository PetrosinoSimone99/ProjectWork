import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { MESSAGE_MAX_LENGTH } from '@/api/areas/chat';
import { space } from '@/theme/tokens';

/**
 * Chat composer: it owns the draft, the caller owns the send.
 *
 * The cap is ours, not the backend's: `Backend/src/Entity/ChatMessage.php` has
 * no constraint, so an unbounded message would be stored as-is. `maxLength`
 * stops the field at `MESSAGE_MAX_LENGTH` (typing and paste alike, with the
 * counter saying where the end is); the refusal sentence lives next to that
 * constant and is enforced again by `useChat.invia` before the POST, because
 * this field is one caller and not the boundary.
 */

export function MessageComposer({ onInvia, inviando = false, disabilitato = false }) {
  const [testo, setTesto] = useState('');

  const pulito = testo.trim();
  // Empty text locks the send only: the field must stay typeable, or a fresh
  // chat could never receive its first message (brief, decision 6).
  const nonParte = pulito === '' || inviando || disabilitato;

  const cambiaTesto = (nuovo) => {
    setTesto(nuovo);
  };

  const invia = async () => {
    if (nonParte) return;
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
        maxLength={MESSAGE_MAX_LENGTH}
        contatore={`${testo.length}/${MESSAGE_MAX_LENGTH}`}
        editable={!inviando && !disabilitato}
        accessibilityLabel="Scrivi un messaggio"
      />
      <AppButton label="Invia" onPress={invia} loading={inviando} disabled={nonParte} />
    </View>
  );
}

const styles = StyleSheet.create({
  composer: { gap: space.sm },
});
