import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/auth/auth-context';
import { AvvisoScadenza } from '@/components/AvvisoScadenza';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useScadenzaSessione } from '@/hooks/useScadenzaSessione';
import { space } from '@/theme/tokens';
import { ThemeProvider, useThemePreference } from '@/theme/theme-context';

/**
 * La navigazione dipende dallo stato di autenticazione:
 * - nessun utente  -> gruppo (auth) con login e registrazione
 * - utente attivo  -> gruppo (tabs) con le schermate principali
 *
 * Le rotte fuori dalla barra delle tab (chat, accordi, proposta, inviti, token)
 * sono elencate a mano: senza la riga giusta non sono raggiungibili con una
 * sessione attiva, pur esistendo il file.
 *
 * Si aspetta anche la preferenza del tema salvata, così il primo render usa già
 * il tema scelto e non c'è un cambio di colore a schermata caricata.
 *
 * Qui sta anche l'**avviso di scadenza della sessione**: è l'unico punto in cui
 * una shell è visibile in tutte le schermate che hanno una sessione attiva. La
 * navigazione non cambia: senza avviso l'albero dei componenti è quello di
 * prima, con il solo contenitore che serve a metterlo sopra lo `Stack`.
 */
function RootNavigator() {
  const { utente, token, booting } = useAuth();
  const { ready } = useThemePreference();
  const { inScadenza, scadenzaMs } = useScadenzaSessione(token);
  const insets = useSafeAreaInsets();
  // Solo con una sessione: nel ramo (auth) non c'è nessuna scadenza da dire.
  const mostraAvviso = Boolean(utente) && inScadenza;

  if (booting || !ready) {
    return <LoadingScreen label="Preparazione di Baratto-lo…" />;
  }

  return (
    <View style={{ flex: 1 }}>
      {/* La safe area la aggiunge l'avviso, non il contenitore: senza avviso lo
          `Stack` resta a filo schermo e ogni schermata mette il suo margine. */}
      {mostraAvviso ? (
        <View
          style={{
            paddingTop: insets.top,
            paddingHorizontal: space.lg,
            paddingBottom: space.sm,
          }}
        >
          <AvvisoScadenza scadenzaMs={scadenzaMs} />
        </View>
      ) : null}
      <Stack screenOptions={{ headerShown: false }}>
        {utente ? <Stack.Screen name="(tabs)" /> : <Stack.Screen name="(auth)" />}
        {utente ? <Stack.Screen name="chat" /> : null}
        {utente ? <Stack.Screen name="scambi" /> : null}
        {utente ? <Stack.Screen name="accordo" /> : null}
        {utente ? <Stack.Screen name="nuovo-accordo" /> : null}
        {utente ? <Stack.Screen name="inviti" /> : null}
        {utente ? <Stack.Screen name="token" /> : null}
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
