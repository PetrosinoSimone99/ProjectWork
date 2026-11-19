import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { MESSAGE_MAX_LENGTH } from '@/api/areas/chat';
import { consumaBozza, salvaBozza } from '@/auth/auth-context';
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
 *
 * Quando il chiamante conosce la rotta della chat passa `chiaveBozza`: ogni
 * cambio finisce in `salvaBozza` e la bozza rimasta è ripresa al montaggio,
 * così un `401` a metà scrittura non porta via il messaggio (audit 2026-11-18,
 * P1-1). Senza la chiave il compositore è quello di prima.
 */

export function MessageComposer({
  onInvia,
  inviando = false,
  disabilitato = false,
  chiaveBozza,
}) {
  // `consumaBozza` si legge al montaggio: chi la legge se la prende una volta sola.
  const [testo, setTesto] = useState(() =>
    typeof chiaveBozza === 'string' ? (consumaBozza(chiaveBozza) ?? '') : '',
  );
  // La guardia vera del doppio invio (audit 2026-11-18, P1-8): due tap nello
  // stesso frame leggono lo stesso render, dove `inviando` è ancora `false`,
  // quindi solo un valore fuori dallo state ferma il secondo `onInvia`.
  // Si azzera nel `finally`: il messaggio successivo deve poter partire.
  const inFlight = useRef(false);

  const pulito = testo.trim();
  // Empty text locks the send only: the field must stay typeable, or a fresh
  // chat could never receive its first message (brief, decision 6).
  const nonParte = pulito === '' || inviando || disabilitato;

  const cambiaTesto = (nuovo) => {
    setTesto(nuovo);
    // Il vuoto cancella la bozza: `salvaBozza` lo tratta come tale.
    salvaBozza(chiaveBozza, nuovo);
  };

  const invia = async () => {
    if (nonParte || inFlight.current) return;
    // Preso prima dell'`await`: il secondo tap arriva prima che `inviando`
    // possa diventare `true`.
    inFlight.current = true;
    try {
      // The draft is cleared only when the send went through: a caller that
      // answers `false` (a failed POST) keeps the text the person typed.
      const esito = await onInvia(pulito);
      if (esito !== false) {
        setTesto('');
        salvaBozza(chiaveBozza, '');
      }
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <View style={styles.riga}>
      <View style={styles.campo}>
        <AppInput
          label="Messaggio"
          value={testo}
          onChangeText={cambiaTesto}
          multiline
          // Due righe invece delle quattro del default: qui il campo è la riga
          // di scrittura di una conversazione, e ogni punto che prende è un
          // punto tolto ai messaggi (brief, decisione 1).
          altezzaMinima={56}
          maxLength={MESSAGE_MAX_LENGTH}
          contatore={`${testo.length}/${MESSAGE_MAX_LENGTH}`}
          editable={!inviando && !disabilitato}
          accessibilityLabel="Scrivi un messaggio"
        />
      </View>
      <AppButton label="Invia" onPress={invia} loading={inviando} disabled={nonParte} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Campo e invio sono una riga sola: l'azione è dell'input, non una scheda in
  // coda, quindi non contraddice la regola della colonna delle azioni. Il
  // bottone resta appoggiato in basso, all'altezza del bordo del campo.
  riga: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  // Il campo prende la larghezza che avanza: senza `minWidth: 0` sul web un
  // flex item tiene la larghezza intrinseca e spinge il bottone fuori.
  campo: { flex: 1, minWidth: 0 },
});
