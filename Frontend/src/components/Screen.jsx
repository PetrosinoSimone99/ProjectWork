import { useCallback, useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fasciaPallinoMenuWeb,
  larghezzaBarraMenuWeb,
  layout,
  space,
  useTokens,
} from '@/theme/tokens';
import { annunciaChromeWeb } from '@/hooks/web-chrome';

/** Il pull-to-refresh è un gesto nativo: sul web la ScrollView lo ignorerebbe. */
const SUPPORTA_AGGIORNAMENTO = Platform.OS !== 'web';

const KEYBOARD_SHOW_EVENT = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const KEYBOARD_HIDE_EVENT = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/**
 * Contenitore di schermata: sfondo tema, safe area, tastiera che non copre i campi.
 *
 * **Un solo telaio** (direzione UX «A», audit UX F80). Non c'è più una
 * schermata larga e dieci strette con due regole diverse: c'è una colonna sola,
 * centrata, con due misure di lettura — `layout.maxContent` (560) per moduli e
 * testi, `layout.maxCatalogo` (720) per la sola schermata che si scorre a
 * colpo d'occhio, il catalogo. Le card riempiono la colonna: nessun elemento
 * dentro ha una larghezza propria, quindi il bordo destro è uno.
 *
 * **Tre battute** (audit UX F81): 32 fra sezioni di primo livello — è il `gap`
 * qui sotto — 16 fra blocchi dentro una sezione, 12 dentro una card (`Card`).
 * Il 32 esiste già come `space.xxl`: il ritmo non ha bisogno di un token nuovo,
 * solo di essere usato per il mestiere giusto invece del 16 che faceva sia
 * l'uno sia l'altro.
 *
 * Con `scroll` accetta `refreshing` + `onRefresh` (dalla hook `useRefresh`):
 * da nativo resta il gesto di pull-to-refresh; sul web la stessa coppia viene
 * **pubblicata** al chrome (`hooks/web-chrome`) e disegnata dalla barra del
 * menu, accanto al menu, con il bordo destro della colonna. Prima la disegnava
 * qui una banda riga sopra il contenuto: 82 pt su ogni schermata, un secondo
 * bordo destro, e su mobile il primo servizio a metà viewport.
 *
 * `bottomSpacing` è lo spazio sotto il contenuto, misurato dentro la safe area:
 * le schermate con una barra ancorata in fondo (chat) lo riducono, altrimenti
 * sopra l'home indicator resta un vuoto troppo alto.
 *
 * Sul web, quando la finestra è così stretta che la barra di `WebNavMenu`
 * entrerebbe nella colonna del contenuto, quella fascia viene riservata con un
 * padding in più: il titolo non finisce sotto la barra. Da nativo non cambia
 * niente.
 */
export function Screen({
  children,
  scroll = false,
  withBottomInset = true,
  bottomSpacing = space.lg,
  refreshing = false,
  onRefresh = null,
  larga = false,
}) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const { width: larghezzaFinestra } = useWindowDimensions();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const aggiornamentoAttivo = SUPPORTA_AGGIORNAMENTO && typeof onRefresh === 'function';
  // Regola web: controllo esplicito sopra il contenuto, da nativo il gesto.
  const aggiornamentoWeb = Platform.OS === 'web' && typeof onRefresh === 'function';
  const safeAreaBottomPadding = withBottomInset && !keyboardVisible ? insets.bottom : 0;
  // Larghezza massima del contenuto: le due misure di lettura, non due layout.
  // Senza un tetto, a 1280 la casella di ricerca allarga a tutto lo schermo e
  // «Cerca» scappa al capo opposto; il catalogo si ferma a 720 perché è una
  // superficie da scorrere, non perché sia un'altra schermata.
  const larghezzaMassima = larga ? layout.maxCatalogo : layout.maxContent;
  // La colonna è centrata: il suo bordo destro entra nella fascia della barra
  // del menu quando la finestra è più stretta del tetto di colonna aumentato
  // della fascia su entrambi i lati. Allora il contenuto scende sotto la fascia.
  // La colonna è centrata: la fascia della barra del menu va riservata quando il
  // margine che resta fra il bordo della colonna e quello della finestra è più
  // stretto della barra stessa — sotto quella soglia la barra entra nella
  // colonna (e finisce sopra il titolo), sopra non ci arriva mai. La misura è la
  // larghezza della barra, non la sua altezza: da quando la barra contiene anche
  // il refresh della schermata, è lei a decidere dove finisce il contenuto.
  const riservaMenuWeb =
    Platform.OS === 'web' &&
    larghezzaFinestra < larghezzaMassima + 2 * (larghezzaBarraMenuWeb + space.lg);

  // Il chrome del web (la barra del menu) disegna il refresh accanto al menu:
  // la schermata in focus dice cosa offrire. `useFocusEffect` e non `useEffect`:
  // lo stack tiene montate più schermate, e chi perde il focus deve ritirare la
  // propria pubblicazione altrimenti la barra mostra il refresh di una
  // schermata che non è più quella davanti.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'web') {
        return undefined;
      }
      annunciaChromeWeb({
        onRefresh: aggiornamentoWeb ? onRefresh : null,
        refreshing,
      });
      return () => annunciaChromeWeb(null);
    }, [aggiornamentoWeb, onRefresh, refreshing]),
  );

  useEffect(() => {
    const showSubscription = Keyboard.addListener(KEYBOARD_SHOW_EVENT, () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(KEYBOARD_HIDE_EVENT, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Stessi padding, gap e larghezza massima nei due rami; cambiano solo le
  // proprietà di flessibilità: la ScrollView riempie con `flexGrow`, la View
  // fissa con `flex: 1`. Il `gap` è la battuta fra sezioni di primo livello (32):
  // è la sola misura che separa due blocchi che non si appartengono.
  const riempimento = {
    padding: space.lg,
    paddingBottom: bottomSpacing,
    gap: space.xxl,
    maxWidth: larghezzaMassima,
    width: '100%',
    alignSelf: 'center',
  };

  const content = scroll ? (
    <ScrollView
      // `main`: l'area del contenuto della schermata (audit UX F52). Sotto
      // l'intestazione di pagina e prima del piè, è ciò che uno screen reader
      // cerca quando chiede di saltare al contenuto.
      role="main"
      style={{ flex: 1 }}
      contentContainerStyle={{ ...riempimento, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        aggiornamentoAttivo ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.primary}
            colors={[t.primary]}
            progressBackgroundColor={t.surface}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View role="main" style={{ ...riempimento, flex: 1 }}>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + (riservaMenuWeb ? fasciaPallinoMenuWeb : 0),
          // KeyboardAvoidingView gestisce già l'altezza della tastiera: non
          // aggiungere anche la safe area inferiore mentre è aperta.
          paddingBottom: safeAreaBottomPadding,
        }}
      >
        {content}
      </View>
    </KeyboardAvoidingView>
  );
}
