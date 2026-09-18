import { useEffect, useMemo, useState } from 'react';
import { Animated, PanResponder, Platform, View } from 'react-native';
import { AppText } from './AppText';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Il **gesto** della scheda: trascinamento, rotazione, anteprime e rilascio.
 *
 * Non conosce né il candidato né la rete: prende `children` (la card) e due
 * callback, esattamente come farebbe un componente che non sa cosa sta
 * trascinando. Le due azioni fanno la **stessa cosa dei pulsanti**, con lo
 * stesso esito: il gesto è una comodità in più, non l'unico canale (chi usa la
 * tastiera o un lettore di schermo ha i pulsanti in `BarraScelte`).
 *
 * Perché `PanResponder` + `Animated` e non una libreria di gesti:
 * `react-native-gesture-handler` e `react-native-reanimated` sono nel
 * `package.json` dal template ma non li usa nessuna schermata, e `PanResponder`
 * è nel core — e `react-native-web` **lo implementa**, quindi funziona con il
 * mouse nel browser (il target della demo). `useNativeDriver: false` su tutte le
 * piattaforme: `true` non è supportato sul web e non funziona con
 * `Animated.event` su un gesto, quindi il comportamento resta identico ovunque.
 *
 * Le soglie sono **misurate**, non scritte in pixel: la conferma è un terzo
 * della larghezza del contenitore (`onLayout`), perché la stessa distanza in px
 * non vuol dire niente su schermi diversi. Il ritorno sotto soglia è ciò che
 * rende il gesto annullabile: chi ha iniziato per sbaglio non registra niente.
 *
 * Due scelte imposte da React e non dal gesto: il valore animato sta in uno
 * `useState` con inizializzatore pigro (serve un oggetto stabile per tutta la
 * vita del componente, e un `ref` qui è esattamente ciò che le regole di React
 * vietano di leggere durante il render: `pos.x` si legge nel render, per la
 * trasformazione), e il `PanResponder` si ricrea con `useMemo` quando cambiano
 * `disabled` o la larghezza misurata — sempre fra un gesto e l'altro, mai
 * durante.
 */

/** Quanto bisogna muoversi perché il gesto parta: sotto, è un tocco. */
const SOGLIA_AVVIO_PX = 12;

/** La conferma è un terzo della larghezza: la convenzione che perdona il rilascio. */
export const PROPORZIONE_CONFERMA = 1 / 3;

/** Durata del volo oltre soglia. Il ritorno è una molla, quindi non ha durata. */
const DURATA_VOLO_MS = 250;

/** L'inclinazione massima della scheda mentre si trascina: ±8°. */
const ANGOLO_MASSIMO = 8;

/** Larghezza di ripiego prima della misura di `onLayout`, solo per gli stili. */
const LARGHEZZA_RIPIEGO = 320;

/**
 * Il gesto sul browser. Se il trascinamento con il mouse deludesse, questa
 * costante si mette a `false` e sul web restano i pulsanti (che sono comunque
 * sempre presenti e sempre sufficienti): è la contromisura dichiarata, una riga.
 */
const GESTO_SU_WEB = true;

export function SchedaTrascinabile({
  children,
  onInteressa,
  onPassa,
  disabled = false,
  ripristino = 0,
  parolaInteressa = 'Mi interessa',
  parolaPassa = 'Passa',
  style,
}) {
  const t = useTokens();
  const [pos] = useState(() => new Animated.ValueXY());
  const [larghezza, setLarghezza] = useState(0);

  // Una scelta fallita non fa avanzare la pila: questo riporta la scheda al
  // centro. Il cambio di scheda non serve, perché lì il componente viene
  // rimontato (la `key` è la persona).
  useEffect(() => {
    pos.setValue({ x: 0, y: 0 });
  }, [ripristino, pos]);

  const panResponder = useMemo(() => {
    function rientra() {
      Animated.spring(pos, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
        speed: 14,
        bounciness: 6,
      }).start();
    }

    function vola(verso, dy) {
      Animated.timing(pos, {
        toValue: { x: verso * larghezza * 1.5, y: dy },
        duration: DURATA_VOLO_MS,
        useNativeDriver: false,
      }).start(() => {
        // La scelta parte adesso, con la scheda fuori schermo: se il backend
        // rifiuta, `ripristino` la riporta al centro e la scheda resta la stessa.
        if (verso > 0) {
          onInteressa();
        } else {
          onPassa();
        }
      });
    }

    function rilascia(gesto) {
      const soglia = larghezza * PROPORZIONE_CONFERMA;
      if (soglia <= 0 || Math.abs(gesto.dx) < soglia) {
        rientra();
        return;
      }
      vola(Math.sign(gesto.dx), gesto.dy);
    }

    return PanResponder.create({
      // Un tocco semplice non è un gesto: la scheda non si "prende" al primo dito.
      onStartShouldSetPanResponder: () => false,
      // **Capture, non bubble**, e non è un dettaglio: `PanResponder` aggiorna
      // `gestureState.dx` solo nella fase di capture e dentro `onResponderMove`,
      // quindi in `onMoveShouldSetPanResponder` (bubble) `dx` è ancora 0 e la
      // soglia non scatterebbe mai — il gesto non partirebbe affatto. La capture
      // qui non ruba niente a nessuno: dentro la scheda non c'è nessun controllo
      // interattivo, e la barra delle tab è fuori.
      //
      // Il gesto parte solo se il movimento è **più orizzontale che verticale**:
      // così trascinare in su e in giù non porta via lo scorrimento della pagina.
      onMoveShouldSetPanResponderCapture: (_, gesto) =>
        !disabled && Math.abs(gesto.dx) > SOGLIA_AVVIO_PX && Math.abs(gesto.dx) > Math.abs(gesto.dy),
      onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesto) => rilascia(gesto),
      onPanResponderTerminate: () => rientra(),
    });
  }, [disabled, larghezza, onInteressa, onPassa, pos]);

  const riferimentoRotazione = Math.max(larghezza / 2, LARGHEZZA_RIPIEGO / 2);
  const riferimentoAnteprima = Math.max(larghezza * PROPORZIONE_CONFERMA, 60);

  const rotazione = pos.x.interpolate({
    inputRange: [-riferimentoRotazione, 0, riferimentoRotazione],
    outputRange: [`-${ANGOLO_MASSIMO}deg`, '0deg', `${ANGOLO_MASSIMO}deg`],
  });
  const opacitaInteressa = pos.x.interpolate({
    inputRange: [0, riferimentoAnteprima],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const opacitaPassa = pos.x.interpolate({
    inputRange: [-riferimentoAnteprima, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const gestoAttivo = GESTO_SU_WEB || Platform.OS !== 'web';

  return (
    <View style={[{ position: 'relative' }, style]}>
      <Animated.View
        {...(gestoAttivo ? panResponder.panHandlers : {})}
        onLayout={(evento) => setLarghezza(evento.nativeEvent.layout.width)}
        style={{
          transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate: rotazione }],
        }}
      >
        {children}

        {/* Le anteprime: le stesse parole dei pulsanti, e non sono pulsanti. Il
            segnale deve comparire **durante** il gesto, non dopo. Sono nascoste
            alle tecnologie assistive, perché dicono quello che dicono già i
            pulsanti (e la regione viva della barra). */}
        <Animated.View
          aria-hidden={true}
          pointerEvents="none"
          style={[
            stili.anteprima,
            {
              opacity: opacitaInteressa,
              borderColor: t.primary,
              backgroundColor: t.serviceBg,
              top: space.lg,
              left: space.lg,
              transform: [{ rotate: '-12deg' }],
            },
          ]}
        >
          <AppText variant="caption" style={{ color: t.primary }}>
            {parolaInteressa}
          </AppText>
        </Animated.View>

        <Animated.View
          aria-hidden={true}
          pointerEvents="none"
          style={[
            stili.anteprima,
            {
              opacity: opacitaPassa,
              borderColor: t.danger,
              backgroundColor: t.dangerBg,
              top: space.lg,
              right: space.lg,
              transform: [{ rotate: '12deg' }],
            },
          ]}
        >
          <AppText variant="caption" style={{ color: t.danger }}>
            {parolaPassa}
          </AppText>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const stili = {
  anteprima: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: radius.input,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
};
