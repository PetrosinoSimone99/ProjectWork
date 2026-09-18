import { useEffect, useState } from 'react';
import { Animated, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card } from './Card';
import { descriviNotifica, etichettaTipoNotifica } from '@/servizi/notifiche';
import { space, useTokens } from '@/theme/tokens';

/**
 * L'avviso dell'esito di una segnalazione: una scheda che compare in alto, con il
 * testo della notifica e il pulsante «Ho capito» che la segna letta.
 *
 * Non è un popup modale e non ha un pulsante «più tardi»: la notifica **non** è
 * una pratica, è un avviso, e resta finché non la si chiude (decisione del
 * titolare del 18 settembre 2026). Chiuderla è una sola azione, quindi «Ho capito»
 * basta.
 *
 * Se la notifica porta un **token**, la scheda lo dice e offre la scorciatoia per
 * l'area dei buoni (`/token`), che è dove il buono si vede davvero: il token non
 * si mostra qui, perché qui non ci sono l'origine, la scadenza né le azioni.
 *
 * L'animazione è una comparsa breve (opacità e scivolamento) e usa il driver
 * nativo solo dove esiste: sul web `react-native-web` non lo supporta e
 * altrimenti lascierebbe un avviso in console (parte di P44). Una notifica senza
 * testo — un tipo ignoto senza messaggio del backend — **non si disegna**: meglio
 * niente che una scheda vuota.
 *
 * La scheda è una **regione viva** (`accessibilityLiveRegion="polite"`): compare
 * quando l'app se ne accorge, quindi va annunciata una volta sola. Il pulsante ha
 * `aria-*` accanto ad `accessibilityState`, come gli altri componenti.
 */
export function AvvisoNotifica({ notifica, inChiusura = false, onChiudi, onApriToken }) {
  const t = useTokens();
  const router = useRouter();
  // `useState` e non `useRef(...).current`: il valore animato serve **durante il
  // render** (sta nello `style`), e le regole dei hook di questa versione di
  // eslint vietano di leggere un ref nel render. È lo stesso motivo per cui
  // `SchedaTrascinabile` crea il suo `Animated.ValueXY` così.
  const [comparsa] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(comparsa, {
      toValue: 1,
      duration: 220,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [comparsa]);

  const testo = descriviNotifica(notifica);
  if (!testo) {
    return null;
  }

  const etichetta = etichettaTipoNotifica(notifica?.tipo);
  const portaToken = notifica?.idToken !== null && notifica?.idToken !== undefined;

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        opacity: comparsa,
        transform: [
          {
            translateY: comparsa.interpolate({
              inputRange: [0, 1],
              outputRange: [-8, 0],
            }),
          },
        ],
      }}
    >
      <Card style={{ gap: space.sm, borderColor: t.accentText }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name="notifications-outline" size={18} color={t.accentText} />
          <AppText variant="caption" style={{ color: t.accentText, flex: 1 }}>
            {etichetta ?? 'Notifica'}
          </AppText>
        </View>

        <AppText variant="small">{testo}</AppText>

        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <AppButton
            label="Ho capito"
            variant="secondary"
            icon="checkmark-outline"
            loading={inChiusura}
            onPress={() => void onChiudi(notifica)}
            accessibilityLabel="Ho capito: chiudi l'avviso"
          />
          {portaToken && onApriToken ? (
            <AppButton
              label="Vedi i miei token"
              variant="ghost"
              icon="ticket-outline"
              onPress={() => {
                router.push('/token');
                onApriToken();
              }}
              accessibilityLabel="Apri i tuoi token"
            />
          ) : null}
        </View>
      </Card>
    </Animated.View>
  );
}
