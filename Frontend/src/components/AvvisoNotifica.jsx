import { useEffect, useState } from 'react';
import { Animated, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card } from './Card';
import { descriviNotifica, etichettaTipoNotifica } from '@/servizi/notifiche';
import { useMovimentoRidotto } from '@/hooks/useMovimentoRidotto';
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
 * Se la notifica riguarda un buono la scheda non promette collegamenti: l'area
 * dei buoni è uscita dal prodotto (brief, decisione 3), quindi il testo resta
 * descrittivo e l'unica azione è «Ho capito».
 *
 * L'animazione è una comparsa breve (opacità e scivolamento) e usa il driver
 * nativo solo dove esiste: sul web `react-native-web` non lo supporta e
 * altrimenti lascierebbe un avviso in console (parte di P44). Con «Riduci
 * movimento» la comparsa **non avviene**: l'avviso è informazione (c'è una
 * notifica), non spettacolo, quindi compare già visibile. Una notifica senza
 * testo — un tipo ignoto senza messaggio del backend — **non si disegna**: meglio
 * niente che una scheda vuota.
 *
 * La scheda è una **regione viva** (`accessibilityLiveRegion="polite"`): compare
 * quando l'app se ne accorge, quindi va annunciata una volta sola. Il pulsante ha
 * `aria-*` accanto ad `accessibilityState`, come gli altri componenti.
 */
export function AvvisoNotifica({ notifica, inChiusura = false, onChiudi }) {
  const t = useTokens();
  // `useState` e non `useRef(...).current`: il valore animato serve **durante il
  // render** (sta nello `style`), e le regole dei hook di questa versione di
  // eslint vietano di leggere un ref nel render. È lo stesso motivo per cui
  // `SchedaTrascinabile` crea il suo `Animated.ValueXY` così.
  const [comparsa] = useState(() => new Animated.Value(0));
  const movimentoRidotto = useMovimentoRidotto();

  useEffect(() => {
    // Con «Riduci movimento» si salta l'animazione e si va subito al valore
    // finale: l'avviso deve restare sempre leggibile, anche senza transizione.
    if (movimentoRidotto) {
      comparsa.setValue(1);
      return undefined;
    }
    const animazione = Animated.timing(comparsa, {
      toValue: 1,
      duration: 220,
      useNativeDriver: Platform.OS !== 'web',
    });
    animazione.start();
    // Se la preferenza cambia mentre l'animazione è in volo, la si ferma: il
    // render successivo passa dal ramo ridotto e porta al valore finale.
    return () => animazione.stop();
  }, [comparsa, movimentoRidotto]);

  const testo = descriviNotifica(notifica);
  if (!testo) {
    return null;
  }

  const etichetta = etichettaTipoNotifica(notifica?.tipo);

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
        </View>
      </Card>
    </Animated.View>
  );
}
