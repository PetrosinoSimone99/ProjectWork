import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/auth/auth-context';
import { AvvisoNotifica } from '@/components/AvvisoNotifica';
import { AvvisoScadenza } from '@/components/AvvisoScadenza';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useNotifiche } from '@/hooks/useNotifiche';
import { useScadenzaSessione } from '@/hooks/useScadenzaSessione';
import { space } from '@/theme/tokens';
import { ThemeProvider, useThemePreference } from '@/theme/theme-context';

/**
 * La navigazione dipende dallo stato di autenticazione:
 * - nessun utente  -> gruppo (auth) con login e registrazione
 * - utente attivo  -> gruppo (tabs) con le schermate principali
 *
 * Le rotte fuori dalla barra delle tab (chat, accordi, proposta, inviti, token,
 * segnalazione, area staff e utenti dell'area staff) sono elencate a mano: senza
 * la riga giusta non sono raggiungibili con una sessione attiva, pur esistendo il
 * file.
 *
 * Si aspetta anche la preferenza del tema salvata, così il primo render usa già
 * il tema scelto e non c'è un cambio di colore a schermata caricata.
 *
 * Qui stanno anche i **due avvisi in alto**: la scadenza della sessione
 * (`AvvisoScadenza`) e l'esito di una segnalazione (`AvvisoNotifica`). È l'unico
 * punto in cui una shell è visibile in tutte le schermate che hanno una sessione
 * attiva. I due componenti sono distinti e **una sola** `View` li contiene: così
 * condividono la safe area e l'allineamento, e la navigazione non cambia — senza
 * avvisi l'albero dei componenti è quello di prima.
 */
function RootNavigator() {
  const { utente, token, booting } = useAuth();
  const { ready } = useThemePreference();
  const { inScadenza, scadenzaMs } = useScadenzaSessione(token);
  const { notifica, inChiusura, chiudi } = useNotifiche({ token, utenteId: utente?.id });
  const insets = useSafeAreaInsets();
  // Solo con una sessione: nel ramo (auth) non c'è nessuna scadenza da dire e
  // nessuna notifica da leggere.
  const mostraAvvisi = Boolean(utente) && (inScadenza || notifica !== null);

  if (booting || !ready) {
    return <LoadingScreen label="Preparazione di Baratto-lo…" />;
  }

  return (
    <View style={{ flex: 1 }}>
      {/* La safe area la aggiunge il contenitore degli avvisi, non lo `Stack`:
          senza avvisi lo `Stack` resta a filo schermo e ogni schermata mette il
          suo margine. */}
      {mostraAvvisi ? (
        <View
          style={{
            paddingTop: insets.top,
            paddingHorizontal: space.lg,
            paddingBottom: space.sm,
            gap: space.sm,
          }}
        >
          {inScadenza ? <AvvisoScadenza scadenzaMs={scadenzaMs} /> : null}
          {notifica !== null ? (
            <AvvisoNotifica
              notifica={notifica}
              inChiusura={inChiusura}
              onChiudi={chiudi}
              onApriToken={() => void chiudi(notifica)}
            />
          ) : null}
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
        {utente ? <Stack.Screen name="segnala" /> : null}
        {utente ? <Stack.Screen name="staff" /> : null}
        {utente ? <Stack.Screen name="staff-utenti" /> : null}
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
