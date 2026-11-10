import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { ModalShell } from './ModalShell';
import { space } from '@/theme/tokens';

/**
 * Conferma di un'azione distruttiva (annulla, contesta).
 *
 * Non usa `Alert.alert`: su react-native-web quel metodo è vuoto, quindi la
 * conferma non comparirebbe sul target principale dell'app e l'azione
 * partirebbe al primo tocco. Il pannello è un `ModalShell` — la stessa
 * finestra degli altri pannelli, con X da 44 pt, Escape sul web e focus
 * dentro (F15, F16, F38) — che funziona su web, Android e iOS.
 */
export function ConfirmModal({
  visible,
  titolo,
  messaggio,
  etichettaConferma = 'Conferma',
  etichettaAnnulla = 'No, torna indietro',
  onConferma,
  onAnnulla,
  loading = false,
  /**
   * Il tono del pulsante di conferma. Il default resta `danger` perché la
   * conferma nasce per le azioni che distruggono qualcosa (annulla, contesta,
   * elimina); un'azione reversibile — come impegnare un buono su un servizio —
   * passa `primary`, altrimenti il colore direbbe una cosa che non è.
   */
  varianteConferma = 'danger',
  /**
   * Slot opzionale **prima dei pulsanti**: un componente figlio — per esempio il
   * campo `motivo` dell'annullamento di una catena — che il chiamante gestisce
   * (valore, errori, lunghezza massima). Retro-compatibile: senza figli la
   * finestra è quella di sempre. Con il figlio ha senso anche
   * `confermaDisabilitata`, per non far partire l'azione con il campo vuoto.
   */
  children = null,
  confermaDisabilitata = false,
}) {
  return (
    <ModalShell
      visible={visible}
      onClose={onAnnulla}
      titolo={titolo}
      // Mentre la chiamata è in corso il pannello non si può lasciare a metà:
      // X, Escape e sfondo spenti, come lo sfondo di prima.
      chiudibile={!loading}
      footer={
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <AppButton
            label={etichettaAnnulla}
            variant="secondary"
            onPress={onAnnulla}
            disabled={loading}
            style={{ flex: 1 }}
          />
          <AppButton
            label={etichettaConferma}
            variant={varianteConferma}
            onPress={onConferma}
            loading={loading}
            disabled={confermaDisabilitata}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <AppText tone="secondary">{messaggio}</AppText>
      {children}
    </ModalShell>
  );
}
