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
//           delle rotte inesistenti (`+not-found`); tema chiaro forzato;
//    staff  ingresso → login con utente staff → profilo, staff, staff-utenti;
//           tema chiaro forzato;
//    scuro  ingresso → login → le schermate principali col tema scuro forzato.
//  A fine giro la preferenza del telefono torna «Sistema»: lo strumento non
//  lascia tracce sul dispositivo.
//
//  L'unica mossa che resta a mano è il login sbagliato della finestra «errore»:
//  il banner d'errore è stato locale del form (`login.jsx`), e farlo scattare
//  da fuori vorrebbe dire toccare il codice dell'app per una verifica.
// ===========================================================================
import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-context';
import { PREFERENZA_TEMA } from '@/theme/theme-store';
import { useThemePreference } from '@/theme/theme-context';
import { useTokens } from '@/theme/tokens';
import { AppText } from '@/components/AppText';

/** Millisecondi di attesa tra un passo e l'altro: il tempo per fotografare e
 * per lasciar caricare i dati della schermata (alcune API rispondono in 2-4
 * secondi, e con 6 la foto coglieva il solo stato di caricamento). */
const ATTESA_PASSO = 9000;
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
  '/',
  '/offro-e-cerco',
  '/loop',
  '/accordi',
  '/profilo',
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
const PASSI_STAFF = ['/profilo', '/staff', '/staff-utenti'];

/** Il giro «scuro»: le schermate principali, per la ripresa del tema scuro. */
const PASSI_SCURO = ['/', '/loop', '/accordi', '/scambi', '/profilo'];

/**
 * Le rotte che si aprono con `replace`: i tab e le schermate d'ingresso. Con
 * `push` la stessa rotta aprirebbe copie di sé sopra sé stessa.
 */
const REPLACE_ROTTE = new Set([
  '/',
  '/offro-e-cerco',
  '/loop',
  '/accordi',
  '/profilo',
  '/login',
  '/register',
]);

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
  tappe.push({ fase: 'fine', rotta: '/', attesa: ATTESA_PASSO });
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
  const insets = useSafeAreaInsets();
  const t = useTokens();
  const { ready: temaPronto, setPreferenzaTema } = useThemePreference();
  const [giro] = useState(giroRichiesto);
  const [tappe] = useState(() => costruisciTappe(giroRichiesto()));
  const [indice, setIndice] = useState(-1);
  const [margine, setMargine] = useState('');

  const avanza = useCallback(() => setIndice((i) => i + 1), []);

  const vaiAlla = useCallback((rotta) => {
    if (REPLACE_ROTTE.has(rotta)) {
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

  // Il tema si forza appena la preferenza è caricata: prima verrebbe
  // sovrascritta dal ripristino della preferenza salvata. Il giro «scuro»
  // fotografa le schermate principali in scuro; gli altri due in chiaro (il
  // telefono può essere in tema scuro, e la review chiede entrambi i temi).
  useEffect(() => {
    if (!temaPronto) return undefined;
    setPreferenzaTema(giro === 'scuro' ? PREFERENZA_TEMA.SCURO : PREFERENZA_TEMA.CHIARO);
    return undefined;
  }, [giro, temaPronto, setPreferenzaTema]);

  // Le tappe: ogni tappa apre la rotta e attende il suo tempo. Oltre l'ultima
  // il tour si chiude e ripristina il tema.
  useEffect(() => {
    const tappa = tappe[indice];
    if (!tappa) {
      if (indice >= tappe.length) {
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
    const timer = setTimeout(avanza, tappa.attesa);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice]);

  const tappa = tappe[indice];
  const chiuso = indice >= tappe.length;
  const istruzione = tappa?.fase === 'errore'
    ? 'MANO: password sbagliata + Accedi, poi lascia il banner'
    : '';
  const tema = t.background === '#F3F5F1' ? 'chiaro' : 'scuro';
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
      {/* L'etichetta sta nella fascia della barra di stato: il contenuto
          dell'app comincia sotto la safe area, quindi non copre nulla di ciò
          che la review deve giudicare. */}
      <View
        style={{
          height: insets.top,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#000000CC',
          paddingHorizontal: 4,
        }}
      >
        <AppText variant="caption" style={{ color: '#7DF0A8', fontSize: 11 }} numberOfLines={1}>
          {chiuso
            ? 'TOUR chiuso'
            : `TOUR ${tappa?.fase ?? 'attesa'} ${Math.min(indice + 1, tappe.length)}/${tappe.length} ${tappa?.rotta ?? ''}`}
          {' · '}{tema}{' · '}{utente ? 'attiva' : 'no'}{giro !== 'app' ? ` · ${giro}` : ''}
        </AppText>
      </View>
      {istruzione || margine ? (
        <View style={{ backgroundColor: '#000000CC', paddingHorizontal: 6, paddingVertical: 2 }}>
          {istruzione ? (
            <AppText variant="caption" style={{ color: '#FFD866', fontSize: 12 }}>{istruzione}</AppText>
          ) : null}
          {margine ? (
            <AppText variant="caption" style={{ color: '#E0716A', fontSize: 12 }}>{margine}</AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
