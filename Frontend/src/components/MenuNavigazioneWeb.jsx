import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { useMovimentoRidotto } from '@/hooks/useMovimentoRidotto';
import { ROTTE_TAB } from '@/navigazione/rotte-tab';
import { ombra, radius, space, useTokens } from '@/theme/tokens';

// Misure della spec (design-spec.md del piano 2026-10-15-navigazione-web-menu):
// niente numeri magici sparsi nel codice.
const DIMENSIONE_PALLINO = 48;
const DIMENSIONE_ICONA_PALLINO = 24;
const DIMENSIONE_ICONA_VOCE = 22;
const LARGHEZZA_PANNELLO = 224;
const ALTEZZA_VOCE = 48;

const DURATA_APERTURA_FADE = 180;
const DURATA_APERTURA_VOCE = 160;
const RITARDO_VOCE = 30;
const DURATA_CHIUSURA = 120;
const DURATA_APERTURA_RIDOTTA = 100;
const DURATA_CHIUSURA_RIDOTTA = 80;

const DURATA_PRESS = 80;
const SCALA_PALLINO_PREMUTO = 0.94;
const SCALA_VOCE_PREMUTA = 0.98;
const OPACITA_VOCE_PREMUTA = 0.7;

const SPOSTAMENTO_APERTURA = 8;
const SPOSTAMENTO_VOCE = 6;
const SCALA_APERTURA = 0.96;

const EASING_APERTURA = Easing.bezier(0.16, 1, 0.3, 1);
const MOLLA_PANNELLO = { stiffness: 240, damping: 26, mass: 0.8 };
const MOLLA_PALLINO = { stiffness: 300, damping: 22 };

// Ombra leggera del pallino e più ampia del pannello; il colore è il token
// `ombra` (uno solo, uguale nei due temi).
const OMBRA_PALLINO = {
  shadowColor: ombra,
  shadowOpacity: 0.18,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
};
const OMBRA_PANNELLO = {
  shadowColor: ombra,
  shadowOpacity: 0.24,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 10 },
  elevation: 8,
};

/**
 * Il menu di navigazione del **web**: pallino fisso in alto a destra (placeholder
 * del logo futuro, `// TODO(logo)`) che apre una tendina con le 5 schermate.
 *
 * Una sola fonte per titoli e icone: la lista `ROTTE_TAB` di
 * `src/navigazione/rotte-tab.js`, la stessa con cui `(tabs)/_layout.jsx`
 * costruisce le `Tabs.Screen` della barra nativa. Il componente **non ha props**:
 * è montato alla radice (in `app/_layout.jsx`, su ogni schermata con sessione)
 * e naviga con `router.navigate(path)` di expo-router. Da nativo **non disegna
 * nulla**: iOS/Android restano con la barra in basso identica a oggi.
 *
 * Rotta attiva: `usePathname()`, con corrispondenza esatta al `path` della
 * rotta. Una rotta fuori dalle 5 (es. `/chat`, `/scambi`) lascia il menu integro
 * e **nessuna** voce evidenziata.
 *
 * Stati UI espliciti: `chiuso`, `inApertura`/`inChiusura` (la tendina resta
 * montata finché la chiusura non è finita), voce `hover`/`press`/`focus`/`attiva`.
 * **Loading, errore e disabilitato non si applicano**: la navigazione è statica,
 * non c'è nessun dato asincrono da attendere né da poter fallire.
 *
 * Accessibilità: `accessibilityState` + `aria-*` (su web `react-native-web`
 * legge solo `aria-*`), `Esc` chiude e riporta il focus al pallino, click fuori
 * chiude, ↑/↓ scorrono le voci con wrap, l'anello di focus è quello globale di
 * `AnelloFocus`. Il movimento usa `Animated` (nessuna dipendenza nuova) e con
 * «Riduci movimento» passa alla sola opacità.
 */
export function MenuNavigazioneWeb() {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const percorso = usePathname();
  const movimentoRidotto = useMovimentoRidotto();
  const isWeb = Platform.OS === 'web';

  const [aperto, setAperto] = useState(false);
  const [visibile, setVisibile] = useState(false);
  const [pallinoInHover, setPallinoInHover] = useState(false);
  const [voceInHover, setVoceInHover] = useState(null);

  // `useState` e non `useRef().current`: i valori animati si leggono **durante
  // il render** (stanno nello `style`) e le regole dei hook vietano di leggere
  // un ref nel render. È lo stesso motivo di `AvvisoNotifica`.
  const [fadePannello] = useState(() => new Animated.Value(0));
  const [progressoPannello] = useState(() => new Animated.Value(0));
  const [scalaPallino] = useState(() => new Animated.Value(1));

  const numeroRotte = ROTTE_TAB.length;
  const valoriVoci = useMemo(
    () => Array.from({ length: numeroRotte }, () => new Animated.Value(0)),
    [numeroRotte],
  );

  const riferimentoContenitore = useRef(null);
  const riferimentoPallino = useRef(null);
  const riferimentiVoci = useRef([]);
  const montato = useRef(true);
  useEffect(() => () => {
    montato.current = false;
  }, []);

  // Ogni animazione parte dal valore corrente: si fermano quelle in volo, così
  // doppio tap o Esc a metà apertura non incasinano lo stato.
  const fermaAnimazioni = useCallback(() => {
    fadePannello.stopAnimation();
    progressoPannello.stopAnimation();
    valoriVoci.forEach((valore) => valore.stopAnimation());
  }, [fadePannello, progressoPannello, valoriVoci]);

  const apri = useCallback(() => {
    setVisibile(true);
    setAperto(true);
    fermaAnimazioni();

    if (movimentoRidotto) {
      // Solo opacità: niente traslazione, niente scala, niente stagger.
      progressoPannello.setValue(1);
      valoriVoci.forEach((valore) => valore.setValue(1));
      Animated.timing(fadePannello, {
        toValue: 1,
        duration: DURATA_APERTURA_RIDOTTA,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
      return;
    }

    Animated.parallel([
      Animated.timing(fadePannello, {
        toValue: 1,
        duration: DURATA_APERTURA_FADE,
        easing: EASING_APERTURA,
        useNativeDriver: false,
      }),
      Animated.spring(progressoPannello, {
        toValue: 1,
        ...MOLLA_PANNELLO,
        useNativeDriver: false,
      }),
      Animated.stagger(
        RITARDO_VOCE,
        valoriVoci.map((valore) =>
          Animated.timing(valore, {
            toValue: 1,
            duration: DURATA_APERTURA_VOCE,
            easing: EASING_APERTURA,
            useNativeDriver: false,
          }),
        ),
      ),
    ]).start();
  }, [fadePannello, fermaAnimazioni, movimentoRidotto, progressoPannello, valoriVoci]);

  const chiudi = useCallback(() => {
    setAperto(false);
    fermaAnimazioni();
    Animated.timing(fadePannello, {
      toValue: 0,
      duration: movimentoRidotto ? DURATA_CHIUSURA_RIDOTTA : DURATA_CHIUSURA,
      easing: movimentoRidotto ? Easing.linear : Easing.in(Easing.quad),
      useNativeDriver: false,
    }).start(({ finished }) => {
      // Se nel frattempo si è riaperto, `stopAnimation` ha interrotto la
      // chiusura: `finished` è falso e la tendina resta montata.
      if (finished && montato.current) {
        // La tendina sta per smontarsi: si riportano a zero i valori del
        // movimento d'ingresso mentre nessuno li vede. Senza l'azzeramento della
        // molla il pannello restava a 1 dopo la prima apertura e il «sbuca dal
        // pallino» non si rivedeva (solo il fade). Le voci si azzerano qui e non
        // in `apri`, così una riapertura a metà chiusura non fa saltare la lista.
        progressoPannello.setValue(0);
        valoriVoci.forEach((valore) => valore.setValue(0));
        setVisibile(false);
      }
    });
  }, [fadePannello, fermaAnimazioni, movimentoRidotto, progressoPannello, valoriVoci]);

  const attivaMenu = useCallback(() => {
    if (aperto) {
      chiudi();
    } else {
      apri();
    }
  }, [aperto, apri, chiudi]);

  const suPressionePallino = useCallback(() => {
    if (movimentoRidotto) {
      return;
    }
    Animated.timing(scalaPallino, {
      toValue: SCALA_PALLINO_PREMUTO,
      duration: DURATA_PRESS,
      useNativeDriver: false,
    }).start();
  }, [movimentoRidotto, scalaPallino]);

  const suRilascioPallino = useCallback(() => {
    if (movimentoRidotto) {
      scalaPallino.setValue(1);
      return;
    }
    Animated.spring(scalaPallino, {
      toValue: 1,
      ...MOLLA_PALLINO,
      useNativeDriver: false,
    }).start();
  }, [movimentoRidotto, scalaPallino]);

  // Esc e click fuori valgono solo con il menu aperto e solo sul web.
  useEffect(() => {
    if (!aperto || typeof document === 'undefined') {
      return undefined;
    }

    const suPointerDown = (evento) => {
      if (riferimentoContenitore.current?.contains(evento.target)) {
        return;
      }
      chiudi();
    };

    const suTastiera = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        chiudi();
        riferimentoPallino.current?.focus?.();
        return;
      }
      if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') {
        return;
      }
      const voci = riferimentiVoci.current.filter(Boolean);
      if (voci.length === 0) {
        return;
      }
      evento.preventDefault();
      const indice = voci.indexOf(document.activeElement);
      const passo = evento.key === 'ArrowDown' ? 1 : -1;
      const prossimo =
        indice === -1
          ? passo === 1
            ? 0
            : voci.length - 1
          : (indice + passo + voci.length) % voci.length;
      voci[prossimo].focus?.();
    };

    document.addEventListener('pointerdown', suPointerDown);
    document.addEventListener('keydown', suTastiera);
    return () => {
      document.removeEventListener('pointerdown', suPointerDown);
      document.removeEventListener('keydown', suTastiera);
    };
  }, [aperto, chiudi]);

  // Da nativo non si disegna niente (la barra in basso resta quella di sempre).
  if (!isWeb) {
    return null;
  }

  return (
    <View
      ref={riferimentoContenitore}
      style={[styles.contenitore, { top: insets.top + space.lg, right: space.lg }]}
    >
      <Animated.View style={{ transform: [{ scale: scalaPallino }] }}>
        <Pressable
          ref={riferimentoPallino}
          focusable
          accessibilityRole="button"
          accessibilityLabel={
            aperto ? 'Chiudi il menu di navigazione' : 'Apri il menu di navigazione'
          }
          accessibilityState={{ expanded: aperto }}
          aria-expanded={aperto}
          onPress={attivaMenu}
          onPressIn={suPressionePallino}
          onPressOut={suRilascioPallino}
          onHoverIn={() => setPallinoInHover(true)}
          onHoverOut={() => setPallinoInHover(false)}
          style={({ pressed }) => [
            styles.pallino,
            OMBRA_PALLINO,
            { backgroundColor: pressed || pallinoInHover ? t.primaryPressed : t.primary },
          ]}
        >
          {/* TODO(logo): qui arriverà l'immagine del logo; il cerchio 48×48 con
              radius.pill resta, cambia solo il figlio. */}
          <Ionicons name="apps" size={DIMENSIONE_ICONA_PALLINO} color={t.onPrimary} />
        </Pressable>
      </Animated.View>

      {visibile ? (
        <Animated.View
          accessibilityRole="menu"
          accessibilityLabel="Menu di navigazione"
          pointerEvents={aperto ? 'auto' : 'none'}
          style={[
            styles.pannello,
            OMBRA_PANNELLO,
            {
              backgroundColor: t.surface,
              borderColor: t.border,
              marginTop: space.sm,
              opacity: fadePannello,
              transform: [
                {
                  translateY: progressoPannello.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-SPOSTAMENTO_APERTURA, 0],
                  }),
                },
                {
                  scale: progressoPannello.interpolate({
                    inputRange: [0, 1],
                    outputRange: [SCALA_APERTURA, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {ROTTE_TAB.map((rotta, indice) => {
            const titolo = rotta.title;
            const attiva = percorso === rotta.path;
            const inHover = voceInHover === rotta.name;
            const colore = attiva ? t.primary : inHover ? t.text : t.textSecondary;
            const valoreVoce = valoriVoci[indice];
            const icona = (
              <Ionicons name={rotta.icona} size={DIMENSIONE_ICONA_VOCE} color={colore} />
            );

            return (
              <Animated.View
                key={rotta.name}
                style={{
                  opacity: valoreVoce,
                  transform: [
                    {
                      translateY: valoreVoce.interpolate({
                        inputRange: [0, 1],
                        outputRange: [SPOSTAMENTO_VOCE, 0],
                      }),
                    },
                  ],
                }}
              >
                <Pressable
                  ref={(nodo) => {
                    riferimentiVoci.current[indice] = nodo;
                  }}
                  focusable
                  accessibilityRole="menuitem"
                  accessibilityLabel={titolo}
                  accessibilityState={{ selected: attiva }}
                  aria-selected={attiva}
                  onPress={() => {
                    chiudi();
                    if (!attiva) {
                      router.navigate(rotta.path);
                    }
                  }}
                  onHoverIn={() => setVoceInHover(rotta.name)}
                  onHoverOut={() =>
                    setVoceInHover((corrente) => (corrente === rotta.name ? null : corrente))
                  }
                  style={({ pressed }) => [
                    styles.voce,
                    {
                      backgroundColor: attiva || inHover ? t.serviceBg : 'transparent',
                      transform: [
                        { scale: pressed && !movimentoRidotto ? SCALA_VOCE_PREMUTA : 1 },
                      ],
                    },
                  ]}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        styles.voceContenuto,
                        { opacity: pressed ? OPACITA_VOCE_PREMUTA : 1 },
                      ]}
                    >
                      {icona}
                      <AppText
                        variant="body"
                        style={{ color: colore, fontWeight: attiva ? '700' : '500', flex: 1 }}
                      >
                        {titolo}
                      </AppText>
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Ancorato al viewport (non alla colonna del contenuto): a 320 come a 1920 sta
  // a `space.lg` dal bordo destro della finestra.
  contenitore: {
    position: 'fixed',
    zIndex: 100,
    alignItems: 'flex-end',
  },
  pallino: {
    width: DIMENSIONE_PALLINO,
    height: DIMENSIONE_PALLINO,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  pannello: {
    width: LARGHEZZA_PANNELLO,
    zIndex: 99,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.sm,
    // La scala d'ingresso (0.96→1) cresce dall'angolo in alto a destra: è
    // l'angolo ancorato sotto il pallino, quindi il pannello "sbuca" da lì
    // invece che dal proprio centro. Su web react-native-web lo traduce in
    // `transform-origin`.
    transformOrigin: 'top right',
  },
  voce: {
    height: ALTEZZA_VOCE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.input,
    cursor: 'pointer',
  },
  voceContenuto: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
});
