import { View } from 'react-native';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Screen } from './Screen';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Il guscio delle due schermate di autenticazione: un solo masthead, un solo
 * allineamento, un solo posto in cui il marchio è scritto (audit UX F90).
 *
 * Prima esistevano due intestazioni diverse: il login aveva un disco da 64 pt
 * con il marchio e la frase che spiega il progetto, la registrazione partiva
 * direttamente dal titolo del modulo. La differenza non era una scelta, era la
 * copia di una schermata nell'altra: qui il marchio sta in un file solo e le due
 * schermate ricevono lo stesso inizio.
 *
 * `centrata` è per il login, che ha un modulo corto: senza, il modulo restava
 * appeso sotto la safe area con il vuoto sotto, e la schermata sembrava tagliata
 * a metà. La registrazione è lunga e scorre dall'alto, quindi non lo passa.
 *
 * Il guscio non conosce né sessione né errori: il contenuto è dei chiamanti.
 */
export function AuthShell({ children, scroll = true, centrata = false }) {
  const t = useTokens();

  return (
    <Screen scroll={scroll}>
      <View style={{ alignItems: 'center', gap: space.md, paddingTop: space.xl }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.pill,
            backgroundColor: t.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="swap-horizontal" size={30} color={t.onPrimary} />
        </View>
        <AppText variant="title">Baratto-lo</AppText>
        <AppText
          variant="small"
          tone="secondary"
          style={{ textAlign: 'center', maxWidth: 300 }}
        >
          Scambia servizi con la tua comunità: offri ciò che sai fare, trova chi cerca
          quello che offri.
        </AppText>
      </View>

      {/* `flex: 1` cresce dentro il `flexGrow` di `Screen`: è quello che mette il
          modulo corto in mezzo alla finestra invece di lasciarlo in alto. Il
          `gap` resta la battuta fra sezioni (32) quando la schermata non è
          centrata: il guscio cambia l'inizio della schermata, non il suo ritmo. */}
      <View
        style={
          centrata
            ? { flex: 1, justifyContent: 'center', gap: space.lg }
            : { gap: space.xxl }
        }
      >
        {children}
      </View>
    </Screen>
  );
}
