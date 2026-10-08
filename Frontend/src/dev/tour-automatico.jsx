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
//    EXPO_PUBLIC_TOUR_GIRO=...     app (default) | staff | scuro
//  Senza flag non esiste: nessuna rotta, nessun componente, nessun effetto.
//  DA CANCELLARE quando le verifiche native avranno un canale stabile.
//
//  I giri:
//    app    ingresso → register → finestra «login sbagliato» (a mano) → login
//           → tutte le schermate dell'app, tab e stack, compreso il recupero
//           delle rotte inesistenti (`+not-found`);
//    staff  ingresso → login con utente staff → profilo, staff, staff-utenti;
//    scuro  ingresso → login → le schermate principali col tema scuro forzato,
//           poi la preferenza del telefono torna «Sistema».
//
//  L'unica mossa che resta a mano è il login sbagliato della finestra «errore»:
//  il banner d'errore è stato locale del form (`login.jsx`), e farlo scattare
//  da fuori vorrebbe dire toccare il codice dell'app per una verifica.
// ===========================================================================
import { useCallback, useEffect, useState } from 'react';
import { router, usePathname } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL, USA_DATI_FINTI } from '@/api/config';
import { useAuth } from '@/auth/auth-context';
import { PREFERENZA_TEMA } from '@/theme/theme-store';
import { useThemePreference } from '@/theme/theme-context';
import { useTokens } from '@/theme/tokens';
import { AppText } from '@/components/AppText';

/** Millisecondi di attesa tra un passo e l'altro: il tempo per fotografare. */
const ATTESA_PASSO = 6000;
/** Millisecondi sull'ingresso: il tempo per fotografare il login a schermo intero. */
const ATTESA_INGRESSO = 8000;
/** Millisecondi della finestra del login sbagliato: il tempo per la mossa a mano. */
const ATTESA_ERRORE = 25000;

/**
 * Il giro «app», in ordine: i tab come li trova una persona, poi le schermate
 * che si aprono sopra, infine una rotta che non esiste per fotografare il
 * recupero (`+not-found.jsx`). Le tre schermate con parametri li ricevono
 * finti ma plausibili: si fotografa lo stato che mostrano, anche se è un vuoto.
 */
const PASSI_APP = [
  '/(tabs)/index',
  '/(tabs)/offro-e-cerco',
  '/(tabs)/loop',
  '/(tabs)/accordi',
  '/(tabs)/profilo',
  '/scambi',
  '/token',
  '/modifica-profilo',
  '/inviti',
  '/nuovo-accordo?id=2&username=brunob&nome=Bruno',
  '/accordo?id=1',
  '/segnala?utente_id=2&nome=Bruno&cognome=Brunetti&username=brunob',
  '/chat',
  '/rotta-inesistente',
];

/** Il giro «staff»: prima il profilo (dove compare l'area staff), poi le due aree. */
const PASSI_STAFF = ['/(tabs)/profilo', '/staff', '/staff-utenti'];

/** Il giro «scuro»: le schermate principali, per la ripresa del tema scuro. */
const PASSI_SCURO = ['/(tabs)/index', '/(tabs)/loop', '/(tabs)/accordi', '/scambi', '/(tabs)/profilo'];

/**
 * Le tappe del tour: ogni tappa apre una rotta e attende, così l'assistente
 * fotografa. La tappa `login` è speciale: chiama `signIn` e poi aspetta.
 */
function costruisciTappe(giro) {
  const tappe = [{ fase: 'ingresso', rotta: '/login', attesa: ATTESA_INGRESSO }];
  if (giro === 'app') {
    tappe.push({ fase: 'register', rotta: '/register', attesa: ATTESA_PASSO });
    tappe.push({ fase: 'errore', rotta: '/login', attesa: ATTESA_ERRORE });
    tappe.push({ fase: 'login', rotta: '/login', attesa: 0 });
    PASSI_APP.forEach((rotta) => tappe.push({ fase: 'giro', rotta, attesa: ATTESA_PASSO }));
  } else {
    tappe.push({ fase: 'login', rotta: '/login', attesa: 0 });
    const passi = giro === 'staff' ? PASSI_STAFF : PASSI_SCURO;
    passi.forEach((rotta) => tappe.push({ fase: 'giro', rotta, attesa: ATTESA_PASSO }));
  }
  tappe.push({ fase: 'fine', rotta: '/(tabs)/index', attesa: ATTESA_PASSO });
  return tappe;
}

/** I giri ammessi: qualcosa di diverso cade su «app», che è il giro intero. */
function giroRichiesto() {
  const giro = process.env.EXPO_PUBLIC_TOUR_GIRO;
  return giro === 'staff' || giro === 'scuro' ? giro : 'app';
}

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
  const { ready: temaPronto, setPreferenzaTema } = useThemePreference();
  const [giro] = useState(giroRichiesto);
  const [tappe] = useState(() => costruisciTappe(giroRichiesto()));
  const [indice, setIndice] = useState(-1);
  const [margine, setMargine] = useState('');

  const avanza = useCallback(() => setIndice((i) => i + 1), []);

  const vaiAlla = useCallback((rotta) => {
    if (rotta.startsWith('/(tabs)/')) {
      router.replace(rotta);
      return;
    }
    router.push(rotta);
  }, []);

  // L'app può partire male: se Expo Go riapre un deep link vecchio, il router
  // atterra su «Unmatched route» senza via d'uscita. Prima mossa: si torna al
  // login e si disconnette, così la verifica parte da una condizione nota.
  useEffect(() => {
    router.replace('/login');
    const via = utente ? signOut() : Promise.resolve();
    Promise.resolve(via)
      .catch(() => {})
      .finally(() => setIndice(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Il giro «scuro» forza il tema appena la preferenza è caricata: prima
  // verrebbe sovrascritta dal ripristino della preferenza salvata. Alla fine
  // del tour la preferenza del telefono torna «Sistema»: lo strumento non
  // lascia tracce sul dispositivo.
  useEffect(() => {
    if (!temaPronto) return undefined;
    if (giro === 'scuro') {
      setPreferenzaTema(PREFERENZA_TEMA.SCURO);
    }
    return undefined;
  }, [giro, temaPronto, setPreferenzaTema]);

  // Le tappe: ogni tappa apre la rotta e attende il suo tempo. Oltre l'ultima
  // il tour si chiude e ripristina il tema.
  useEffect(() => {
    const tappa = tappe[indice];
    if (!tappa) {
      if (indice >= tappe.length && giro === 'scuro') {
        setPreferenzaTema(PREFERENZA_TEMA.SISTEMA);
      }
      return undefined;
    }
    vaiAlla(tappa.rotta);
    if (tappa.fase === 'login') {
      let vivo = true;
      signIn(process.env.EXPO_PUBLIC_TOUR_UTENTE, process.env.EXPO_PUBLIC_TOUR_PASSWORD)
        .catch((error) => {
          if (vivo) setMargine(`login: ${error?.message ?? 'errore'}`);
        })
        .finally(() => {
          if (vivo) setTimeout(avanza, ATTESA_PASSO);
        });
      return () => {
        vivo = false;
      };
    }
    const timer = setTimeout(avanza, tappa.atta);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice]);

  const tappa = tappe[indice];
  const chiuso = indice >= tappe.length;
  const istruzione = tappa?.fase === 'errore'
    ? 'MANO: login sbagliato adesso'
    : '';
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
        TOUR {chiuso ? 'chiuso' : `${tappa?.fase ?? 'attesa'} ${Math.min(indice + 1, tappe.length)}/${tappe.length}`} {tappa?.rotta ?? ''} {pathname}
      </AppText>
      <AppText variant="caption" style={{ color: '#7DF0A8' }}>
        {Platform.OS} · giro {giro} · tema {t.background === '#F3F5F1' ? 'chiaro' : 'scuro'} · {API_BASE_URL} {USA_DATI_FINTI ? '(finti)' : ''} · sessione {utente ? 'attiva' : 'no'}
      </AppText>
      {istruzione ? (
        <AppText variant="caption" style={{ color: '#FFD866' }}>{istruzione}</AppText>
      ) : null}
      {margine ? <AppText variant="caption" style={{ color: '#E0716A' }}>{margine}</AppText> : null}
    </View>
  );
}
