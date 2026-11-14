import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { useChromeWeb } from '@/hooks/web-chrome';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TAB_ROUTES } from '@/navigation/tab-routes';
import { ombra, radius, space, target, useTokens } from '@/theme/tokens';

// Misure della spec (design-spec.md del piano 2026-10-15-navigazione-web-menu)
// e della direzione UX del 2026-11-11: niente numeri magici sparsi nel codice.
// `ALTEZZA_BARRA` è anche la misura che `fasciaPallinoMenuWeb` in `theme/tokens`
// riserva in cima al contenuto: se cambia qui, cambia anche là.
const ALTEZZA_BARRA = 48;
const DIMENSIONE_ICONA_CONTROLLO = 18;
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
const SCALA_CONTROLLO_PREMUTO = 0.94;
const SCALA_VOCE_PREMUTA = 0.98;
const OPACITA_VOCE_PREMUTA = 0.7;

const SPOSTAMENTO_APERTURA = 8;
const SPOSTAMENTO_VOCE = 6;
const SCALA_APERTURA = 0.96;

const EASING_APERTURA = Easing.bezier(0.16, 1, 0.3, 1);
const MOLLA_PANNELLO = { stiffness: 240, damping: 26, mass: 0.8 };
const MOLLA_CONTROLLO = { stiffness: 300, damping: 22 };

// L'ombra della barra resta leggera: la barra ha già un bordo di 1 px che la
// stacca dal contenuto, l'ombra dice solo che le sta sopra. Colore: il token
// `ombra` (uno solo, uguale nei due temi).
const OMBRA_BARRA = {
  shadowColor: ombra,
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
};
const OMBRA_PANNELLO = {
  shadowColor: ombra,
  shadowOpacity: 0.24,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 10 },
  elevation: 8,
};

/**
 * Il menu di navigazione del **web**: una barra neutra fissa in alto a destra
 * — il nome dell'app e il controllo «Menu» — che apre una tendina con le 5
 * schermate.
 *
 * La barra è **neutra** di proposito (direzione UX «A», audit UX F88): l'accento
 * `primary` resta alla sola azione primaria della schermata e alle marche di
 * dato che classificano (pillola di categoria, stato). Prima era un disco pieno
 * d'accento, e sulla stessa schermata c'erano quattro dischi che lo reclamavano
 * — menu, campanella, marchio, avatar — senza che nessuno fosse l'azione
 * principale. Il menu non è un'azione del contenuto: è impalcatura.
 *
 * Una sola fonte per titoli e icone: la lista `TAB_ROUTES` di
 * `src/navigation/tab-routes.js`, la stessa con cui `(tabs)/_layout.jsx`
 * costruisce le `Tabs.Screen` della barra nativa. Il componente **non ha props**:
 * è montato alla radice (in `app/_layout.jsx`, su ogni schermata con sessione)
 * e naviga con `router.navigate(path)` di expo-router. Da nativo **non disegna
 * nulla**: iOS/Android restano con la barra in basso identica a oggi.
 *
 * Rotta attiva: `usePathname()`, con corrispondenza esatta al `path` della
 * rotta. Una rotta fuori dalle 5 (es. `/chat`, `/scambi`) lascia il menu integro
 * e **nessuna** voce evidenziata; in quel caso la barra e la testata del pannello
 * lo dicono invece di tacere. Sulle 5 la sezione attuale compare **nel nome
 * accessibile del controllo** e nella **testata del pannello** (audit UX F40),
 * così la divergenza dalla barra nativa resta leggibile: si vede sempre in che
 * sezione si è senza dover leggere il titolo della schermata.
 *
 * Stati UI espliciti: `chiuso`, `inApertura`/`inChiusura` (la tendina resta
 * montata finché la chiusura non è finita), voce `hover`/`press`/`focus`/`attiva`.
 * **Loading, errore e disabilitato non si applicano**: la navigazione è statica,
 * non c'è nessun dato asincrono da attendere né da poter fallire.
 *
 * Accessibilità: `accessibilityState` + `aria-*` (su web `react-native-web`
 * legge solo `aria-*`), `Esc` chiude e riporta il focus al controllo, click fuori
 * chiude, ↑/↓ scorrono le voci con wrap, l'anello di focus è quello globale di
 * `FocusRing`. Il movimento usa `Animated` (nessuna dipendenza nuova) e con
 * «Riduci movimento» passa alla sola opacità.
 */
export function WebNavMenu() {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const percorso = usePathname();
  const movimentoRidotto = useReducedMotion();
  const isWeb = Platform.OS === 'web';

  // La sezione da dichiarare nel controllo e nella testata del pannello (F40):
  // corrispondenza esatta, come per l'evidenziazione delle voci.
  const rottaAttiva = TAB_ROUTES.find((rotta) => percorso === rotta.path) ?? null;

  // Il chrome pubblicato dalla schermata in focus (`hooks/web-chrome`): il
  // refresh da offrire, se ne ha uno. Senza schermata che pubblichi (le rotte
  // di accesso non lo fanno) la barra resta nome + menu, come prima.
  const chrome = useChromeWeb();
  const { width: larghezzaFinestra } = useWindowDimensions();
  // Sotto i 380 px il nome dell'app, «Aggiorna» e «Menu» non stanno nella
  // stessa pillola: il refresh resta (è un comando) e perde la parola, che torna
  // a essere solo `accessibilityLabel`.
  const etichettaAggiorna = larghezzaFinestra >= 380;

  const [aperto, setAperto] = useState(false);
  const [visibile, setVisibile] = useState(false);
  const [controlloInHover, setControlloInHover] = useState(false);
  const [aggiornaInHover, setAggiornaInHover] = useState(false);
  const [voceInHover, setVoceInHover] = useState(null);

  // `useState` e non `useRef().current`: i valori animati si leggono **durante
  // il render** (stanno nello `style`) e le regole dei hook vietano di leggere
  // un ref nel render. È lo stesso motivo di `NotificationBanner`.
  const [fadePannello] = useState(() => new Animated.Value(0));
  const [progressoPannello] = useState(() => new Animated.Value(0));
  const [scalaControllo] = useState(() => new Animated.Value(1));

  const numeroRotte = TAB_ROUTES.length;
  const valoriVoci = useMemo(
    () => Array.from({ length: numeroRotte }, () => new Animated.Value(0)),
    [numeroRotte],
  );

  const riferimentoContenitore = useRef(null);
  const riferimentoControllo = useRef(null);
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
        // molla il pannello restava a 1 dopo la prima apertura e il «sbuca dalla
        // barra» non si rivedeva (solo il fade). Le voci si azzerano qui e non
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

  const suPressioneControllo = useCallback(() => {
    if (movimentoRidotto) {
      return;
    }
    Animated.timing(scalaControllo, {
      toValue: SCALA_CONTROLLO_PREMUTO,
      duration: DURATA_PRESS,
      useNativeDriver: false,
    }).start();
  }, [movimentoRidotto, scalaControllo]);

  const suRilascioControllo = useCallback(() => {
    if (movimentoRidotto) {
      scalaControllo.setValue(1);
      return;
    }
    Animated.spring(scalaControllo, {
      toValue: 1,
      ...MOLLA_CONTROLLO,
      useNativeDriver: false,
    }).start();
  }, [movimentoRidotto, scalaControllo]);

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
        riferimentoControllo.current?.focus?.();
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
      // `navigation`: la barra è la navigazione del web (audit UX F52). Il nome
      // lo dice anche a chi arriva con la tastiera e sente solo i punti di
      // riferimento.
      role="navigation"
      accessibilityLabel="Navigazione principale"
      style={[styles.contenitore, { top: insets.top + space.lg, right: space.lg }]}
    >
      {/* La barra: il nome dell'app, il refresh della schermata in focus (se
          ne ha uno) e il controllo che apre la tendina. Neutra (superficie +
          bordo), nessun accento: F88. L'altezza è fissa (48) perché
          `fasciaPallinoMenuWeb` riserva esattamente questa misura in cima al
          contenuto: qui non si stringe e non si allarga. */}
      <View
        style={[
          styles.barra,
          OMBRA_BARRA,
          { backgroundColor: t.surface, borderColor: t.border },
        ]}
      >
        <AppText variant="body" style={{ color: t.text, fontWeight: '700' }}>
          Baratto-lo
        </AppText>

        {/* Il refresh della schermata in focus. Stesso mestiere del controllo
            «Menu» accanto: un comando dentro la barra, neutro, alto 40. Prima
            stava in una banda tutta sua sopra il contenuto, che costava 82 pt
            su ogni schermata e finiva con un bordo destro diverso da quello
            della colonna. Mentre la richiesta è in volo è disabilitato e gira,
            così lo stato è esplicito invece di essere un secondo tap. */}
        {chrome?.onRefresh ? (
          <Pressable
            focusable
            accessibilityRole="button"
            accessibilityLabel="Aggiorna i dati della schermata"
            accessibilityState={{ disabled: chrome.refreshing, busy: chrome.refreshing }}
            aria-busy={chrome.refreshing}
            disabled={chrome.refreshing}
            onPress={chrome.onRefresh}
            onHoverIn={() => setAggiornaInHover(true)}
            onHoverOut={() => setAggiornaInHover(false)}
            style={({ pressed }) => [
              styles.controllo,
              {
                backgroundColor: pressed || aggiornaInHover ? t.background : 'transparent',
                cursor: chrome.refreshing ? 'default' : 'pointer',
              },
            ]}
          >
            {chrome.refreshing ? (
              <ActivityIndicator size="small" color={t.textSecondary} />
            ) : (
              <AppIcon name="refresh-outline" size={DIMENSIONE_ICONA_CONTROLLO} color={t.text} />
            )}
            {etichettaAggiorna ? (
              <AppText variant="small" style={{ color: t.text, fontWeight: '600' }}>
                Aggiorna
              </AppText>
            ) : null}
          </Pressable>
        ) : null}

        <Animated.View style={{ transform: [{ scale: scalaControllo }] }}>
          <Pressable
            ref={riferimentoControllo}
            focusable
            accessibilityRole="button"
            accessibilityLabel={
              (aperto ? 'Chiudi il menu di navigazione' : 'Apri il menu di navigazione') +
              (rottaAttiva ? `, sezione attuale: ${rottaAttiva.title}` : '')
            }
            accessibilityState={{ expanded: aperto }}
            aria-expanded={aperto}
            onPress={attivaMenu}
            onPressIn={suPressioneControllo}
            onPressOut={suRilascioControllo}
            onHoverIn={() => setControlloInHover(true)}
            onHoverOut={() => setControlloInHover(false)}
            style={({ pressed }) => [
              styles.controllo,
              { backgroundColor: pressed || controlloInHover ? t.background : 'transparent' },
            ]}
          >
            <AppIcon name="menu" size={DIMENSIONE_ICONA_CONTROLLO} color={t.text} />
            <AppText variant="small" style={{ color: t.text, fontWeight: '600' }}>
              Menu
            </AppText>
            {/* Il verso del chevron dice lo stato di apertura: è la stessa cosa
                che dicono `accessibilityState.expanded` e `aria-expanded`. */}
            <AppIcon
              name={aperto ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={t.textSecondary}
            />
          </Pressable>
        </Animated.View>
      </View>

      {visibile ? (
        <Animated.View
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
          {/* Testata del pannello: la sezione attuale, non solo il titolo
              della schermata (F40). Il ruolo `menu` resta sulle voci. */}
          <AppText
            variant="small"
            tone="secondary"
            style={{ paddingHorizontal: space.md, paddingBottom: space.sm }}
          >
            {rottaAttiva ? `Sezione attuale: ${rottaAttiva.title}` : 'Nessuna sezione attiva'}
          </AppText>
          <View accessibilityRole="menu" accessibilityLabel="Menu di navigazione">
            {TAB_ROUTES.map((rotta, indice) => {
              const titolo = rotta.title;
              const attiva = percorso === rotta.path;
              const inHover = voceInHover === rotta.name;
              const colore = attiva ? t.primary : inHover ? t.text : t.textSecondary;
              const valoreVoce = valoriVoci[indice];
              const icona = (
                <AppIcon name={rotta.icona} size={DIMENSIONE_ICONA_VOCE} color={colore} />
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
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Il chrome resta ancorato **al viewport**: a 320 come a 1920 sta a
  // `space.lg` dal bordo destro della finestra, e su finestre strette il
  // contenuto gli riserva la fascia in cima (`fasciaPallinoMenuWeb`). Il refresh
  // della schermata sta **dentro** questa barra: così c'è un solo bordo di
  // chrome invece di due (la barra al viewport e una banda alla colonna).
  contenitore: {
    position: 'fixed',
    zIndex: 100,
    alignItems: 'flex-end',
  },
  // La barra è alta esattamente `ALTEZZA_BARRA`: è la misura che il contenuto
  // riserva sotto di lei. La forma resta a pillola (raggio pieno) come i bottoni
  // dell'app, il padding a sinistra è quello del contenuto, a destra quello del
  // controllo, così il bordo del controllo e quello della barra non si toccano.
  barra: {
    height: ALTEZZA_BARRA,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  // Il controllo premibile dentro la barra: bersaglio alto `target.min`, cioè
  // 44 — che nella barra da 48 ci sta. Era 40, con la nota «il minimo utile
  // dentro una barra da 48»: la barra è 48, quindi 44 entra, e il comando
  // «Menu» è l'unica navigazione del web, cio
  // è il controllo più premuto dell'app (audit UX F5, `DESIGN.md` § Touch).
  controllo: {
    minHeight: target.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    cursor: 'pointer',
  },
  pannello: {
    width: LARGHEZZA_PANNELLO,
    zIndex: 99,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.sm,
    // La scala d'ingresso (0.96→1) cresce dall'angolo in alto a destra: è
    // l'angolo ancorato sotto la barra, quindi il pannello "sbuca" da lì
    // invece che dal proprio centro. Su web react-native-web lo traduce in
    // `transform-origin`.
    transformOrigin: 'top right',
  },
  voce: {
    // `minHeight` e non `height`: il testo di una voce può crescere (dynamic
    // type, audit UX F23) senza che l'etichetta venga tagliata.
    minHeight: ALTEZZA_VOCE,
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
