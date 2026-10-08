// ===========================================================================
//  TOUR AUTOMATICO — STRUMENTO DI VERIFICA TEMPORANEO
//  -----------------------------------------------------
//  Non è una feature dell'app: è l'attuatore che fa muovere l'app da sola
//  mentre l'assistente fotografa lo schermo via AirPlay (`temp/ios-mirror/`).
//
//  Si attiva SOLO con variabili d'ambiente della sessione di verifica:
//    EXPO_PUBLIC_TOUR=1            attiva il tour (e solo in __DEV__)
//    EXPO_PUBLIC_TOUR_UTENTE=...   credenziali di un utente di prova (mai nel repo)
//    EXPO_PUBLIC_TOUR_PASSWORD=...
//  Senza flag non esiste: nessuna rotta, nessun componente, nessun effetto.
//  DA CANCELLARE quando le verifiche native avranno un canale stabile.
// ===========================================================================
import { useCallback, useEffect, useState } from 'react';
import { router, usePathname } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL, USA_DATI_FINTI } from '@/api/config';
import { useAuth } from '@/auth/auth-context';
import { useTokens } from '@/theme/tokens';
import { AppText } from '@/components/AppText';

/** Millisecondi di attesa tra un passo e l'altro: il tempo per fotografare. */
const ATTESA_PASSO = 6000;
/** Millisecondi di attesa prima del login: il tempo per fotografare l'ingresso. */
const ATTESA_INGRESSO = 8000;

/** Il giro del tour, in ordine: i tab, poi una schermata fuori dalla barra. */
const PASSI = ['/', '/offro-e-cerco', '/loop', '/scambi', '/accordi', '/token', '/profilo', '/modifica-profilo'];

/** Tab selezionato per ogni rotta del giro: si rispetta la barra delle tab. */
const TAB_DI = {
  '/': '/(tabs)/index',
  '/offro-e-cerco': '/(tabs)/offro-e-cerco',
  '/loop': '/(tabs)/loop',
  '/scambi': '/(tabs)/scambi',
  '/accordi': '/(tabs)/accordi',
  '/token': '/(tabs)/token',
  '/profilo': '/(tabs)/profilo',
};

export function TourAutomatico() {
  const attivo = __DEV__ && process.env.EXPO_PUBLIC_TOUR === '1';
  if (!attivo) return null;
  return <TourVisibile />;
}

function TourVisibile() {
  const { utente, signIn, signOut } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const t = useTokens();
  const [passo, setPasso] = useState(-1);
  const [fase, setFase] = useState('attesa');
  const [margine, setMargine] = useState('');

  const vaiAlPasso = useCallback((n) => {
    const rotta = PASSI[n];
    if (rotta && TAB_DI[rotta]) {
      router.replace(TAB_DI[rotta]);
      if (rotta !== '/') {
        router.push(TAB_DI[rotta]);
      }
    }
    else if (rotta) {
      router.push(rotta);
    }
    setPasso(n);
  }, []);

  // L'app parte da dove era: per una verifica ripetibile si disconnette prima.
  useEffect(() => {
    const timer = setTimeout(() => {
      const via = utente ? signOut() : Promise.resolve();
      Promise.resolve(via)
        .catch(() => {})
        .finally(() => {
          setFase('login');
        });
    }, ATTESA_INGRESSO);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dopo lo stacco: login con le credenziali di prova, poi il giro.
  useEffect(() => {
    if (fase !== 'login') {
      return undefined;
    }
    let vivo = true;
    signIn(process.env.EXPO_PUBLIC_TOUR_UTENTE, process.env.EXPO_PUBLIC_TOUR_PASSWORD)
      .then(() => {
        if (vivo) setFase('giro');
      })
      .catch((error) => {
        if (vivo) {
          setMargine(`login: ${error?.message ?? 'errore'}`);
          setFase('giro');
        }
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  // Il giro: ogni passo apre la rotta e attende, così l'assistente fotografa.
  // L'ultimo passo rimanda alla home e chiude il tour: un timer invece di
  // setState dentro l'effetto, così la render non nasce a catena.
  useEffect(() => {
    if (fase !== 'giro') {
      return undefined;
    }
    if (passo >= PASSI.length) {
      const timer = setTimeout(() => {
        router.replace(TAB_DI['/']);
        setFase('fine');
      }, ATTESA_PASSO);
      return () => clearTimeout(timer);
    }
    const apri = setTimeout(() => vaiAlPasso(passo), 0);
    const prossimo = setTimeout(() => setPasso((p) => p + 1), ATTESA_PASSO);
    return () => {
      clearTimeout(apri);
      clearTimeout(prossimo);
    };
  }, [fase, passo, vaiAlPasso]);

  const inCorso = fase !== 'fine' && passo >= 0;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#00000099',
        paddingTop: insets.top + 2,
        paddingBottom: 4,
        paddingHorizontal: 8,
      }}
    >
      <AppText variant="caption" style={{ color: '#7DF0A8' }}>
        TOUR {fase} {inCorso ? `${passo + 1}/${PASSI.length} ${PASSI[Math.min(passo, PASSI.length - 1)]}` : ''} {pathname}
      </AppText>
      <AppText variant="caption" style={{ color: '#7DF0A8' }}>
        {Platform.OS} · tema {t.background === '#F3F5F1' ? 'chiaro' : 'scuro'} · {API_BASE_URL} {USA_DATI_FINTI ? '(finti)' : ''} · sessione {utente ? 'attiva' : 'no'} · inset t {insets.top} b {insets.bottom}
      </AppText>
      {margine ? <AppText variant="caption" style={{ color: '#E0716A' }}>{margine}</AppText> : null}
    </View>
  );
}
