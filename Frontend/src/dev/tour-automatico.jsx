// ===========================================================================
//  TOUR AUTOMATICO — STRUMENTO DI VERIFICA TEMPORANEO
//  -----------------------------------------------------
//  Non è una feature dell'app: è l'attuatore che fa muovere l'app da sola
//  mentre il PC fotografa lo schermo (specchio AirPlay via `temp/ios-mirror/`).
//
//  Si attiva SOLO con variabili d'ambiente della sessione di verifica:
//    EXPO_PUBLIC_TOUR=1                 attiva il tour (e solo in __DEV__)
//    EXPO_PUBLIC_TOUR_UTENTE=...        credenziali dell'utente di prova
//    EXPO_PUBLIC_TOUR_PASSWORD=...
//    EXPO_PUBLIC_TOUR_STAFF_UTENTE=...  credenziali dell'utente staff
//    EXPO_PUBLIC_TOUR_STAFF_PASSWORD=...
//    EXPO_PUBLIC_TOUR_GIRO=...          app (default) | staff | scuro  [LEGACY]
//  Senza flag non esiste: nessuna rotta, nessun componente, nessun effetto.
//  DA CANCELLARE quando la review UX avrà un canale stabile. Le parti
//  collegate dietro questo stesso flag (gancio in `login.jsx`, gancio di
//  scroll in `components/Screen.jsx`) portano tutte la nota «GANCIO DA
//  RIMUOVERE»: a review finita si tolgono o si commentano in blocco.
//
//  **Come fotografa (handshake, piano B)**: il cavo USB non è praticabile su
//  iOS 26 (lo screenshot chiede la Developer Disk Image montata), quindi la
//  foto passa dallo specchio AirPlay, ma senza scatti alla cieca: ogni tappa,
//  dopo l'attesa di caricamento, CHIEDE la foto a `server-foto.mjs` sul PC
//  (porta 8787) e avanza solo alla risposta. Il server riscatta foto nere e
//  specchio congelato; se il server non risponde il tour prosegue comunque e
//  lo segnala nel taccuino. La chiamata di azzera in partenza svuota `foto/`.
//
//  **Giri**: un solo giro unico, nessun riavvio di Metro:
//    1. utente in tema CHIARO: ingresso → register → banner «login sbagliato»
//       (prodotto dal gancio di `login.jsx`, non più a mano) → login vero →
//       tutte le schermate utente, compresa la finestra «È un match!»
//       (fase MANO: un tocco a «Accetta» sulla proposta preparata);
//    2. utente in tema SCURO: uscita → ingresso → register → banner → login →
//       schermate utente → «È un match!»;
//    3. staff in CHIARO e SCURO: uscita → login staff → profilo e due aree.
//  A fine giro l'utente viene disconnesso e la preferenza del tema torna
//  «Sistema»: lo strumento non lascia tracce sul dispositivo.
//
//  **Scroll a tappe** (Q6): le schermate più alte dello schermo si fotografano
//  anche scorrendo: dopo la foto di testa, `tourScroll` chiede a `Screen` le
//  frazioni seguenti del contenuto (una foto per frazione).
// ===========================================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { expoConfig } from 'expo-constants';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-context';
import { PREFERENZA_TEMA } from '@/theme/theme-store';
import { useThemePreference } from '@/theme/theme-context';
import { useTokens } from '@/theme/tokens';
import { AppText } from '@/components/AppText';

/** Millisecondi di attesa dopo la navigazione, prima di chiedere la foto: il
 * tempo perché le API rispondano (2–4 s osservati) e la schermata si compia.
 * Con EXPO_PUBLIC_TOUR_VELOCE=1 (solo prove della sequenza) si riducono. */
const F = process.env.EXPO_PUBLIC_TOUR_VELOCE === '1' ? 0.25 : 1;
const ATTESA_PASSO = Math.round(9000 * F);
/** Attesa sull'ingresso (login a schermo pieno, nessun dato da aspettare). */
const ATTESA_INGRESSO = Math.round(8000 * F);
/** Attesa della tappa del banner «login sbagliato»: il gancio di `login.jsx`
 * provoca l'invio al mount (l'API risponde in 2–4 s), poi la foto. */
const ATTESA_ERRORE = Math.round(7000 * F);
/** Attesa della finestra «È un match!»: resta l'unica mossa a mano (toccare
 * «Accetta» sulla proposta preparata, poi «Vai al loop»). */
const ATTESA_MANO = Math.round(30000 * F);
/** Attesa del cambio tema: l'interfaccia si ricompone tutta. */
const ATTESA_TEMA = Math.round(2500 * F);
/** Attesa dell'uscita dalla sessione prima di fotografare il login. */
const ATTESA_USCITA = Math.round(3000 * F);
/** Attesa fra lo scorrimento e la foto di scorrimento. */
const ATTESA_SCORRIMENTO = Math.round(900 * F);
/** Millisecondi di timeout della richiesta di foto: oltre, il tour prosegue
 * comunque (non si resta appesi a un server spento). */
const TIMEOUT_FOTO = 30000;
const PORTA_SERVER_FOTO = 8787;

/** Le schermate utente, nell'ordine in cui si aprono dai tab. Le rotte con
 * parametri portano valori plausibili: la schermata mostra lo stato che
 * risponde a quei parametri, anche se è un vuoto o un errore reale. */
const ROTTE_UTENTE = [
  { rotta: '/', etichetta: 'home' },
  { rotta: '/offro-e-cerco', etichetta: 'offro-cerco' },
  { rotta: '/loop', etichetta: 'loop' },
  { rotta: '/accordi', etichetta: 'accordi' },
  { rotta: '/profilo', etichetta: 'profilo' },
  { rotta: '/scambi', etichetta: 'scambi' },
  { rotta: '/token', etichetta: 'token' },
  { rotta: '/modifica-profilo', etichetta: 'modifica-profilo', scroll: [0.5, 1] },
  { rotta: '/nuovo-accordo?id=2&username=brunob&nome=Bruno', etichetta: 'nuovo-accordo' },
  { rotta: '/accordo?id=1', etichetta: 'accordo', scroll: [1] },
  {
    rotta: '/segnala?utente_id=2&nome=Bruno&cognome=Brunetti&username=brunob',
    etichetta: 'segnala',
  },
  { rotta: '/chat?nome=Carla&cognome=Carli&username=carlac', etichetta: 'chat' },
  { rotta: '/rotta-inesistente', etichetta: 'rotta-inesistente' },
];

/** Le schermate dell'area staff (il profilo è già fotografato nel giro utente). */
const ROTTE_STAFF = [
  { rotta: '/staff', etichetta: 'staff' },
  { rotta: '/staff-utenti', etichetta: 'staff-utenti', scroll: [0.5, 1] },
];

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
  '/rotta-inesistente',
]);

/**
 * L'osservatore di scorrimento del tour (Q6): `Screen` si iscrive quando il
 * tour è attivo e qui il tour chiede le posizioni. Oggetto modulo-level,
 * guardato dal flag: senza tour non ci sono iscritti né notifiche.
 * Esportato per `Screen` (gancio con nota «GANCIO DA RIMUOVERE»).
 */
export const tourScroll = {
  iscritti: new Set(),
  iscriviti(funzione) {
    this.iscritti.add(funzione);
    return () => this.iscritti.delete(funzione);
  },
  notifica(frazione) {
    this.iscritti.forEach((funzione) => funzione(frazione));
  },
};

/** L'indirizzo del PC: sul web è l'host che serve la pagina; su native Expo Go
 * lo dà `expoConfig.hostUri` (l'host di Metro, es. «192.168.1.42:8081»), da cui
 * il telefono scarica il bundle — è lo stesso PC. */
function hostDelPc() {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return (expoConfig?.hostUri ?? '').split(':')[0] ?? 'localhost';
}

function attendi(ms) {
  return new Promise((fine) => setTimeout(fine, ms));
}

/**
 * Il giro completo: un ramo per tema+account. La tappa di «match» si apre
 * dopo la schermata `/loop` di ogni ramo utente: la proposta da accettare la
 * prepara la raccolta prima del giro (orchestrazione via API reale, vedi
 * runbook in `temp/ios-mirror/`).
 */
function costruisciTappe() {
  const tappe = [];
  const ramoUtente = (tema) => {
    tappe.push({
      fase: 'ingresso',
      rotta: '/login',
      attesa: ATTESA_INGRESSO,
      tema,
      etichetta: 'login',
    });
    tappe.push({
      fase: 'giro',
      rotta: '/register',
      attesa: ATTESA_PASSO,
      tema,
      etichetta: 'register',
      scroll: [0.5, 1],
    });
    tappe.push({
      fase: 'errore',
      rotta: '/login?tourErrore=1',
      attesa: ATTESA_ERRORE,
      tema,
      etichetta: 'login-errore',
    });
    tappe.push({ fase: 'login', rotta: '/login', attesa: 0, tema, etichetta: 'login' });
    ROTTE_UTENTE.forEach((voce) =>
      tappe.push({
        fase: 'giro',
        rotta: voce.rotta,
        attesa: ATTESA_PASSO,
        tema,
        etichetta: voce.etichetta,
        scroll: voce.scroll,
      }),
    );
    tappe.push({
      fase: 'mano',
      rotta: '/loop',
      attesa: ATTESA_MANO,
      tema,
      etichetta: 'match',
      istruzione: 'MANO: tocca SOLO «Accetta» sulla proposta in attesa, e fermo lì',
    });
  };
  // ── 1. utente, chiaro ────────────────────────────────────────────────────
  tappe.push({ fase: 'tema', tema: 'chiaro' });
  ramoUtente('chiaro');
  // ── 2. utente, scuro: si esce e si riparte dal login ─────────────────────
  tappe.push({ fase: 'tema', tema: 'scuro' });
  tappe.push({ fase: 'uscita', rotta: '/login', attesa: ATTESA_USCITA, tema: 'scuro' });
  ramoUtente('scuro');
  // ── 3. staff, chiaro e scuro ─────────────────────────────────────────────
  tappe.push({ fase: 'tema', tema: 'chiaro' });
  tappe.push({ fase: 'uscita', rotta: '/login', attesa: ATTESA_USCITA, tema: 'chiaro' });
  tappe.push({ fase: 'login-staff', rotta: '/login', attesa: 0, tema: 'chiaro' });
  const ramoStaff = (tema) =>
    ROTTE_STAFF.forEach((voce) =>
      tappe.push({
        fase: 'giro',
        rotta: voce.rotta,
        attesa: ATTESA_PASSO,
        tema,
        etichetta: voce.etichetta,
        scroll: voce.scroll,
      }),
    );
  ramoStaff('chiaro');
  tappe.push({ fase: 'tema', tema: 'scuro' });
  ramoStaff('scuro');
  // ── fine: senza sessione, tema «Sistema» ─────────────────────────────────
  tappe.push({ fase: 'fine', rotta: '/', attesa: ATTESA_PASSO, tema: 'scuro' });
  return tappe;
}

function nomiCredenziali() {
  return {
    utente: process.env.EXPO_PUBLIC_TOUR_UTENTE ?? '',
    password: process.env.EXPO_PUBLIC_TOUR_PASSWORD ?? '',
    staff: process.env.EXPO_PUBLIC_TOUR_STAFF_UTENTE ?? '',
    staffPassword: process.env.EXPO_PUBLIC_TOUR_STAFF_PASSWORD ?? '',
  };
}

/** Soglia per il tema dell'etichetta: colore di fondo chiaro = tema chiaro. */
const SFONDO_CHIARO = '#F3F5F1';

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
  const [tappe] = useState(costruisciTappe);
  const [indice, setIndice] = useState(-1);
  const [margine, setMargine] = useState('');
  const avanzaRif = useRef(() => setIndice((i) => i + 1));

  const vaiAlla = useCallback((rotta) => {
    if (REPLACE_ROTTE.has(rotta)) {
      router.replace(rotta);
      return;
    }
    router.push(rotta);
  }, []);

  // Chiede la foto al PC e ne riporta l'esito nel taccuino. Fallimento non
  // blocca il giro: prosegue e lo segnala (il taccuino resta affidabile).
  const faiFoto = useCallback(async (nome) => {
    const controllo = new AbortController();
    const timer = setTimeout(() => controllo.abort(), TIMEOUT_FOTO);
    try {
      const risposta = await fetch(
        `http://${hostDelPc()}:${PORTA_SERVER_FOTO}/scatta?nome=${encodeURIComponent(nome)}`,
        { signal: controllo.signal },
      );
      const esito = await risposta.json();
      if (!esito?.ok) {
        setMargine(`foto ${nome}: ${esito?.motivo ?? 'fallita'}`);
      }
      return esito;
    } catch {
      setMargine(`foto ${nome}: server non risponde — acceso server-foto?`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }, []);

  // All'avvio: rotta nota, disconnessione (condizione nota di partenza), e
  // azzeramento delle foto del giro precedente (best effort, senza attesa).
  useEffect(() => {
    router.replace('/login');
    fetch(`http://${hostDelPc()}:${PORTA_SERVER_FOTO}/azzera`).catch(() => {});
    const via = utente ? signOut() : Promise.resolve();
    Promise.resolve(via)
      .catch(() => {})
      .finally(() => setIndice(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Il tema si forza appena la preferenza è caricata: prima verrebbe
  // sovrascritta dal ripristino della preferenza salvata. Il primo ramo è
  // chiaro; i cambi di tema successivi sono tappe (fase «tema»).
  useEffect(() => {
    if (!temaPronto) return undefined;
    setPreferenzaTema(PREFERENZA_TEMA.CHIARO);
    return undefined;
  }, [temaPronto, setPreferenzaTema]);

  // Il motore: ogni tappa naviga (se ha rotta), attende, e chiede la foto.
  // Le tappe speciali (login, uscita, tema) fanno la loro cosa e avanzano.
  useEffect(() => {
    const tappa = tappe[indice];
    let vivo = true;
    if (!tappa) {
      if (indice >= tappe.length) {
        setPreferenzaTema(PREFERENZA_TEMA.SISTEMA);
      }
      return undefined;
    }
    if (tappa.rotta) vaiAlla(tappa.rotta);
    const nomi = nomiCredenziali();
    const nomeFoto = (suffisso = '') =>
      `t${String(Math.min(indice, 98)).padStart(2, '0')}-${tappa.etichetta}-${tappa.tema}${suffisso}`;

    const sequenzaGiro = async () => {
      await attendi(tappa.attesa);
      if (!vivo) return;
      await faiFoto(nomeFoto());
      if (tappa.scroll) {
        for (const frazione of tappa.scroll) {
          tourScroll.notifica(frazione);
          await attendi(ATTESA_SCORRIMENTO);
          if (!vivo) return;
          await faiFoto(`${nomeFoto()}-f${Math.round(frazione * 100)}`);
        }
      }
      if (vivo) avanzaRif.current();
    };

    if (tappa.fase === 'tema') {
      setPreferenzaTema(tappa.tema === 'scuro' ? PREFERENZA_TEMA.SCURO : PREFERENZA_TEMA.CHIARO);
      const timer = setTimeout(() => vivo && avanzaRif.current(), ATTESA_TEMA);
      return () => {
        vivo = false;
        clearTimeout(timer);
      };
    }
    if (tappa.fase === 'login') {
      signIn(nomi.utente, nomi.password)
        .catch((errore) => {
          if (vivo) setMargine(`login: ${errore?.message ?? 'errore'}`);
        })
        .finally(() => {
          if (vivo) setTimeout(avanzaRif.current, ATTESA_PASSO);
        });
      return () => {
        vivo = false;
      };
    }
    if (tappa.fase === 'login-staff') {
      signIn(nomi.staff, nomi.staffPassword)
        .catch((errore) => {
          if (vivo) setMargine(`login staff: ${errore?.message ?? 'errore'}`);
        })
        .finally(() => {
          if (vivo) setTimeout(avanzaRif.current, ATTESA_PASSO);
        });
      return () => {
        vivo = false;
      };
    }
    if (tappa.fase === 'uscita') {
      Promise.resolve(signOut())
        .catch(() => {})
        .finally(async () => {
          if (!vivo) return;
          await attendi(tappa.attesa);
          if (!vivo) return;
          await faiFoto(nomeFoto());
          if (vivo) avanzaRif.current();
        });
      return () => {
        vivo = false;
      };
    }
    if (tappa.fase === 'fine') {
      void (async () => {
        await attendi(tappa.attesa);
        if (!vivo) return;
        await faiFoto(nomeFoto());
        Promise.resolve(signOut()).catch(() => {});
        if (vivo) setPreferenzaTema(PREFERENZA_TEMA.SISTEMA);
        if (vivo) avanzaRif.current();
      })();
      return () => {
        vivo = false;
      };
    }
    void sequenzaGiro();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice]);

  const tappa = tappe[indice];
  const chiuso = indice >= tappe.length;
  const istruzione = tappa?.istruzione ?? '';
  const tema = t.background === SFONDO_CHIARO ? 'chiaro' : 'scuro';
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none' }}>
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
            : `TOUR ${tappa?.fase ?? 'attesa'} ${Math.min(indice + 1, tappe.length)}/${tappe.length} ${tappa?.etichetta ?? ''}`}
          {' · '}{tema}{' · '}{utente ? 'attiva' : 'no'}
        </AppText>
      </View>
      {istruzione || margine ? (
        <View style={{ backgroundColor: '#000000CC', paddingHorizontal: 6, paddingVertical: 2 }}>
          {istruzione ? (
            <AppText variant="caption" style={{ color: '#FFD866', fontSize: 12 }}>
              {istruzione}
            </AppText>
          ) : null}
          {margine ? (
            <AppText variant="caption" style={{ color: '#E0716A', fontSize: 12 }}>
              {margine}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
