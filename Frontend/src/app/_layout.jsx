import { Platform, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/auth/auth-context';
import { FocusRing } from '@/components/FocusRing';
import { SessionExpiryBanner } from '@/components/SessionExpiryBanner';
import { LoadingScreen } from '@/components/LoadingScreen';
import { WebNavMenu } from '@/components/WebNavMenu';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSessionExpiry } from '@/hooks/useSessionExpiry';
import { useWebColorScheme } from '@/hooks/useWebColorScheme';
import { larghezzaBarraMenuWeb, space } from '@/theme/tokens';
import { ThemeProvider, useThemePreference } from '@/theme/theme-context';

/**
 * La navigazione dipende dallo stato di autenticazione:
 * - nessun utente  -> gruppo (auth) con login e registrazione
 * - utente attivo  -> gruppo (tabs) con le schermate principali
 *
 * Le rotte fuori dalla barra delle tab (modifica profilo, segnalazione, area
 * staff e utenti dell'area staff) sono elencate a mano: senza la riga giusta non
 * sono raggiungibili con una sessione attiva, pur esistendo il file. Comparire
 * qui **non** protegge una rotta: chi arriva senza sessione esce con il proprio
 * redirect (audit UX F1), e chi ha una sessione senza il ruolo trova la sua via
 * d'uscita nella schermata (F13).
 *
 * Il nome della pagina e i colori che il browser dipinge da sé (barra di
 * scorrimento, cursore di testo) non li disegna nessun componente: li tiene
 * allineati alla rotta e al tema la shell, con i due hook qui sotto (F16, F19).
 *
 * Si aspetta anche la preferenza del tema salvata, così il primo render usa già
 * il tema scelto e non c'è un cambio di colore a schermata caricata.
 *
 * L'unico avviso globale è la scadenza della sessione (`SessionExpiryBanner`):
 * è l'unico punto in cui una shell è visibile in tutte le schermate che hanno una
 * sessione attiva. Il banner delle notifiche in-app è stato rimosso: il backend
 * non espone un endpoint per le notifiche (`docs/backend-gaps.md`), quindi non
 * c'è niente di reale da mostrare.
 */
function RootNavigator() {
  const { utente, token, booting } = useAuth();
  const { ready, schema } = useThemePreference();
  const { inScadenza, scadenzaMs } = useSessionExpiry(token);
  const insets = useSafeAreaInsets();
  const percorso = usePathname();
  useDocumentTitle(percorso);
  useWebColorScheme(schema);
  // Solo con una sessione: nel ramo (auth) non c'è nessuna scadenza da dire e
  // nessuna notifica da leggere.
  const mostraAvvisi = Boolean(utente) && inScadenza;

  if (booting || !ready) {
    return <LoadingScreen label="Preparazione di Baratto-lo…" />;
  }

  return (
    <View style={{ flex: 1 }}>
      {/* L'anello di focus da token vive in tutte le schermate: è una regola
          globale su `:focus-visible` (P59) e non disegna nulla. */}
      <FocusRing />
      {/* Il menu di navigazione del web: pallino fisso + tendina, su ogni
          schermata con sessione (anche le rotte secondarie). Da nativo non
          disegna nulla. */}
      {utente ? <WebNavMenu /> : null}
      {/* La safe area la aggiunge il contenitore degli avvisi, non lo `Stack`:
          senza avvisi lo `Stack` resta a filo schermo e ogni schermata mette il
          suo margine. Sul web il bordo destro si tiene fuori dalla barra del
          menu (`larghezzaBarraMenuWeb`): l'avviso è a tutta larghezza e
          altrimenti il suo testo finirebbe sotto la barra. */}
      {mostraAvvisi ? (
        <View
          style={{
            paddingTop: insets.top,
            paddingLeft: space.lg,
            paddingRight: Platform.OS === 'web' ? larghezzaBarraMenuWeb : space.lg,
            paddingBottom: space.sm,
            gap: space.sm,
          }}
        >
          {inScadenza ? <SessionExpiryBanner scadenzaMs={scadenzaMs} /> : null}
        </View>
      ) : null}
      <Stack screenOptions={{ headerShown: false }}>
        {utente ? <Stack.Screen name="(tabs)" /> : <Stack.Screen name="(auth)" />}
        {utente ? <Stack.Screen name="edit-profile" /> : null}
        {utente ? <Stack.Screen name="report" /> : null}
        {utente ? <Stack.Screen name="staff" /> : null}
        {utente ? <Stack.Screen name="staff-users" /> : null}
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
