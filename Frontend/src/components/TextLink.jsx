import { Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { AppText } from './AppText';
import { target } from '@/theme/tokens';

/**
 * Il collegamento di testo: la parola in fondo a un modulo che porta alla
 * schermata sorella («Registrati», «Accedi»).
 *
 * Non è un `AppButton` e non deve sembrarlo: vive dentro una frase, quindi
 * niente pillola, niente bordo, niente riempimento. Ma è un controllo come gli
 * altri e prende `target.min`, il pavimento di `DESIGN.md` § Touch. Prima era
 * un `AppText` dentro `Link`: alto 18 pt, cioè una striscia di testo — misurato
 * dal vivo, 59 × 18 su `/login`, dove è l'**unica** via d'uscita da una
 * schermata che chi non ha un account non può superare (audit UX F6).
 *
 * Il `Pressable` è il figlio di `Link asChild` (il modo documentato di Expo
 * Router per un controllo proprio), quindi il collegamento conserva ruolo,
 * destinazione e navigazione client, e ci mette sopra un bersaglio vero. Il
 * peso del testo resta al chiamante: la frase che lo contiene decide cosa
 * mettere in risalto.
 *
 * Lo stile arriva al figlio **appiattito**: `asChild` clona il figlio con le
 * proprie, e uno schieramento di stili (`[a, b]`) lo fa cadere ("You are passing
 * an array of styles to a child of <Slot>"). Un oggetto solo, anche quando il
 * chiamante ne aggiunge uno.
 */
export function TextLink({ href, children, style }) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        style={StyleSheet.flatten([
          {
            minHeight: target.min,
            justifyContent: 'center',
          },
          style,
        ])}
      >
        <AppText variant="small" tone="primary" style={{ fontWeight: '700' }}>
          {children}
        </AppText>
      </Pressable>
    </Link>
  );
}
