import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fasciaPallinoMenuWeb, layout, space, useTokens } from '@/theme/tokens';

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
 * Con `scroll` accetta `refreshing` + `onRefresh` (dalla hook `useRefresh`)
 * per il pull-to-refresh, attivo solo su mobile.
 *
 * `bottomSpacing` è lo spazio sotto il contenuto, misurato dentro la safe area:
 * le schermate con una barra ancorata in fondo (chat) lo riducono, altrimenti
 * sopra l'home indicator resta un vuoto troppo alto.
 *
 * Sul web, quando la finestra è così stretta che la colonna del contenuto entra
 * nella fascia della barra di `WebNavMenu` (`fasciaPallinoMenuWeb`, in
 * alto a destra), quella fascia viene riservata con un padding in più: il titolo
 * non finisce sotto la barra. Da nativo non cambia niente.
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
  const safeAreaBottomPadding = withBottomInset && !keyboardVisible ? insets.bottom : 0;
  // Larghezza massima del contenuto: le due misure di lettura, non due layout.
  // Senza un tetto, a 1280 la casella di ricerca allarga a tutto lo schermo e
  // «Cerca» scappa al capo opposto; il catalogo si ferma a 720 perché è una
  // superficie da scorrere, non perché sia un'altra schermata.
  const larghezzaMassima = larga ? layout.maxCatalogo : layout.maxContent;
  // La colonna è centrata: il suo bordo destro entra nella fascia della barra
  // del menu quando la finestra è più stretta del tetto di colonna aumentato
  // della fascia su entrambi i lati. Allora il contenuto scende sotto la fascia.
  const riservaMenuWeb =
    Platform.OS === 'web' &&
    larghezzaFinestra < larghezzaMassima + 2 * fasciaPallinoMenuWeb;

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
      // `main`: la terra{\`'}a del contenuto della schermata (audit UX F52). Sotto
      // l'intestazione di pagina e prima del piè, è ci{\`'} che uno screen reader
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
