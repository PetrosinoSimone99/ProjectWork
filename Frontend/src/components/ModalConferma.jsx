import { Modal, Pressable, View } from 'react-native';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card } from './Card';
import { space, useTokens } from '@/theme/tokens';

/**
 * Conferma di un'azione distruttiva (annulla, contesta).
 *
 * Non usa `Alert.alert`: su react-native-web quel metodo è vuoto, quindi la
 * conferma non comparirebbe sul target principale dell'app e l'azione
 * partirebbe al primo tocco. Il `Modal` di react-native funziona su web, Android
 * e iOS.
 */
export function ModalConferma({
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
}) {
  const t = useTokens();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onAnnulla}>
      <View
        style={{
          flex: 1,
          backgroundColor: t.overlay,
          justifyContent: 'center',
          padding: space.lg,
        }}
      >
        {/* Sfondo chiudibile: toccare fuori dal pannello annulla, come nel
            dettaglio annuncio. Disattivato mentre la chiamata è in corso. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chiudi la conferma"
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 }}
          disabled={loading}
          onPress={onAnnulla}
        />

        <Card style={{ position: 'relative', zIndex: 1 }}>
          <View style={{ gap: space.xs }}>
            <AppText variant="heading">{titolo}</AppText>
            <AppText tone="secondary">{messaggio}</AppText>
          </View>
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
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
