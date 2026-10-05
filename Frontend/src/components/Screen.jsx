import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, space, useTokens } from '@/theme/tokens';

/** Il pull-to-refresh è un gesto nativo: sul web la ScrollView lo ignorerebbe. */
const SUPPORTA_AGGIORNAMENTO = Platform.OS !== 'web';
const KEYBOARD_SHOW_EVENT = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const KEYBOARD_HIDE_EVENT = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/**
 * Contenitore di schermata: sfondo tema, safe area, tastiera che non copre i campi.
 *
 * Su schermi larghi (web da desktop) il contenuto resta centrato con una
 * larghezza massima (`layout.maxContent`, 560): le righe di form non si
 * allargano per tutto lo schermo. `larga` alza il tetto a `layout.maxCatalogo`
 * (1024) per la sola schermata con il catalogo dei servizi. `alignSelf: center`
 * centra il blocco — senza, resterebbe attaccato a sinistra.
 *
 * Con `scroll` accetta `refreshing` + `onRefresh` (dalla hook `useAggiornamento`)
 * per il pull-to-refresh, attivo solo su mobile.
 *
 * `bottomSpacing` è lo spazio sotto il contenuto, misurato dentro la safe area:
 * le schermate con una barra ancorata in fondo (chat) lo riducono, altrimenti
 * sopra l'home indicator resta un vuoto troppo alto.
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const aggiornamentoAttivo = SUPPORTA_AGGIORNAMENTO && typeof onRefresh === 'function';
  const safeAreaBottomPadding = withBottomInset && !keyboardVisible ? insets.bottom : 0;
  // Larghezza massima del contenuto: senza, a 1280 la casella di ricerca
  // allarga a tutto lo schermo e «Filtra» scappa al capo opposto. Solo le
  // schermate lunghe (catalogo) la allargano; tutte le altre restano centrate.
  const larghezzaMassima = larga ? layout.maxCatalogo : layout.maxContent;

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
  // fissa con `flex: 1`.
  const riempimento = {
    padding: space.lg,
    paddingBottom: bottomSpacing,
    gap: space.lg,
    maxWidth: larghezzaMassima,
    width: '100%',
    alignSelf: 'center',
  };

  const content = scroll ? (
    <ScrollView
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
    <View style={{ ...riempimento, flex: 1 }}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
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
