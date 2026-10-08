import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Screen } from '@/components/Screen';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { space } from '@/theme/tokens';
import { useAuth } from '@/auth/auth-context';

/**
 * Pagina di recupero per le rotte inesistenti (convenzione `+not-found` di
 * Expo Router).
 *
 * Senza questa pagina le rotte non riconosciute mostravano la schermata di
 * errore nera predefinita di Expo Router, che sta **fuori** dal layout dell'app:
 * nessuna barra, nessun bottone, solo «Go back» di Expo Go. Su telefono basta
 * riaprire Expo Go con un deep link vecchio (o arrivare da un link sbagliato)
 * per restare intrappolati lì, con l'app che sembra rotta.
 *
 * Recupero deliberatamente semplice, in due casi:
 * - con sessione attiva si torna tra le tab (la home dei servizi);
 * - senza sessione si torna al login.
 */
export default function RottaInesistente() {
  const { utente } = useAuth();
  const router = useRouter();

  return (
    <Screen>
      <View style={{ gap: space.md, marginTop: space.xl }}>
        <AppText variant="title">Pagina non trovata</AppText>
        <AppText tone="secondary">
          Il collegamento che hai aperto non corrisponde a nessuna schermata
          dell'app. Si può riprendere da dove funziona.
        </AppText>
        <AppButton
          label={utente ? 'Torna alla home' : 'Torna al login'}
          onPress={() => {
            if (utente) {
              router.replace('/(tabs)/index');
              return;
            }
            router.replace('/login');
          }}
        />
      </View>
    </Screen>
  );
}
