import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/auth/auth-context';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ThemeProvider, useThemePreference } from '@/theme/theme-context';

/**
 * La navigazione dipende dallo stato di autenticazione:
 * - nessun utente  -> gruppo (auth) con login e registrazione
 * - utente attivo  -> gruppo (tabs) con le schermate principali
 *
 * Le rotte fuori dalla barra delle tab (chat, accordi, proposta, inviti) sono
 * elencate a mano: senza la riga giusta non sono raggiungibili con una sessione
 * attiva, pur esistendo il file.
 *
 * Si aspetta anche la preferenza del tema salvata, così il primo render usa già
 * il tema scelto e non c'è un cambio di colore a schermata caricata.
 */
function RootNavigator() {
  const { utente, booting } = useAuth();
  const { ready } = useThemePreference();

  if (booting || !ready) {
    return <LoadingScreen label="Preparazione di Baratto-lo…" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {utente ? <Stack.Screen name="(tabs)" /> : <Stack.Screen name="(auth)" />}
      {utente ? <Stack.Screen name="chat" /> : null}
      {utente ? <Stack.Screen name="accordo" /> : null}
      {utente ? <Stack.Screen name="nuovo-accordo" /> : null}
      {utente ? <Stack.Screen name="inviti" /> : null}
    </Stack>
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
