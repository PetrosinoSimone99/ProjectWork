import { useCallback, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { formatOrarioScadenza, tokenExpiresAt } from '@/auth/token-store';
import { getProfile } from '@/api';
import { localitaPerDisplay } from '@/services/italian-locations';
import { puoEntrareNellAreaStaff } from '@/services/staff';
import { useRefresh } from '@/hooks/useRefresh';
import { useStreamEvent } from '@/hooks/useEventStream';
import { affectsProfile } from '@/api/stream';
import { useUnreadCount } from '@/hooks/useNotifications';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { AppIcon } from '@/components/AppIcon';
import { Avatar } from '@/components/Avatar';
import { Banner } from '@/components/Banner';
import { Card, Chip } from '@/components/Card';
import { CreditMark } from '@/components/CreditMark';
import { LoadingScreen } from '@/components/LoadingScreen';
import { NotificationsSheet } from '@/components/NotificationsSheet';
import { PageHeader } from '@/components/PageHeader';
import { ThemeSelector } from '@/components/ThemeSelector';
import { space, target, useTokens } from '@/theme/tokens';

/**
 * «Profilo»: i dati della sessione (nome, username, ruolo) **più** email,
 * località e bio dal server (`GET /api/profile`).
 *
 * I due sorgenti hanno ruoli precisi, perché non danno gli stessi dati:
 * - la **sessione** arriva subito (contenuto iniziale) e porta ruolo e
 *   scadenza; il profilo non restituisce ruoli (decisione del piano);
 * - il **server** porta l'email — l'unico endpoint che ce l'ha — con località,
 *   bio e l'anagrafica completa, che completa o raffina i dati di sessione.
 *
 * L'immagine del profilo **non si mostra**, nemmeno se `profileImageUrl` è
 * valorizzato (decisione del piano: richiederebbe un lavoro a parte sul
 * rendering). La modifica di località e bio (`PATCH /api/profile`) vive nella
 * rotta a sé `edit-profile.jsx`, che questa schermata si limita ad aprire.
 *
 * Gli stati sono tutti espliciti (§7 di `AGENTS.md`):
 * - **primo caricamento**: `LoadingScreen`;
 * - **refresh**: indicatore piccolo del pull-to-refresh, i dati restano;
 * - **errore**: `Banner` + «Riprova» funzionante e disabilitato in volo;
 * - **bio assente**: «Non hai ancora scritto una presentazione.», non il campo che sparisce;
 * - un 401 non si gestisce qui: il meccanismo di `client.js` manda al login.
 */
export default function ProfileScreen() {
  const { utente, token, signOut, ricaricaSessione } = useAuth();  const router = useRouter();
  // «Profilo aggiornato.»: il salvataggio del profilo porta qui il suo esito
  // (audit UX F35), e l'utente lo chiude quando l'ha letto.
  const { salvato } = useLocalSearchParams();
  const t = useTokens();
  const [signingOut, setSigningOut] = useState(false);

  // Il profilo del server: `null` finché la prima risposta non arriva (i
  // dati di sessione restano a schermo come contenuto iniziale).
  const [profilo, setProfilo] = useState(null);
  const [primoCaricamento, setPrimoCaricamento] = useState(true);
  const [richiestaInCorso, setRichiestaInCorso] = useState(false);
  const [errore, setErrore] = useState(null);
  // The pasted photo URL may point at nothing: an explicit state says so
  // instead of leaving a blank circle that looks like a loading bug.
  const [immagineRotta, setImmagineRotta] = useState(false);
  // Le notifiche non sono una rotta: la banda del profilo apre un pannello sopra
  // la schermata, come la campanella delle «Proposte ricevute» negli accordi.
  const [notificheAperte, setNotificheAperte] = useState(false);

  // Le richieste in volo: una risposta si applica solo se nessuna più recente è
  // già partita (il focus non litiga con un «Riprova»), come nella home.
  const richiestaRef = useRef(0);

  const caricaProfilo = useCallback(async () => {
    if (!token) {
      return;
    }
    const seq = ++richiestaRef.current;
    setRichiestaInCorso(true);
    try {
      const dati = await getProfile(token);
      if (seq !== richiestaRef.current) {
        return;
      }
      setProfilo(dati);
      setImmagineRotta(false);
      setErrore(null);
    } catch (err) {
      if (seq !== richiestaRef.current) {
        return;
      }
      // Un 401 è già gestito da `client.js` (logout e ritorno al login):
      // qui restano il 403 (account inattivo), la rete assente e gli altri.
      setErrore(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      if (seq === richiestaRef.current) {
        setRichiestaInCorso(false);
        setPrimoCaricamento(false);
      }
    }
  }, [token]);

  // Si rilegge quando la schermata torna in primo piano: località o bio
  // (modificate nella rotta `modifica-profilo`) non devono restare vecchie.
  useFocusEffect(
    useCallback(() => {
      void caricaProfilo();
      return () => {
        richiestaRef.current += 1;
      };
    }, [caricaProfilo]),
  );

  // Pull-to-refresh: rilegge sessione, profilo e conteggio non lette insieme,
  // senza svuotare nulla. Il badge è nella stessa schermata: lasciarlo vecchio
  // mentre l'utente tira giù è la cosa che fa sembrare rotto il gesto.
  const { nonLette, ricarica: ricaricaNonLette } = useUnreadCount({ token });

  // Un evento che cambia chi sei (promozione, sospensione, servizio ripristinato)
  // non porta il dato nuovo con sé: ruolo e stato dell'account vivono nella
  // sessione salvata, e il profilo in `GET /profile`. Si rilegge tutto e due,
  // invece di applicare il payload: è la stessa regola delle altre schermate.
  useStreamEvent(
    useCallback(
      (notifica) => {
        if (!affectsProfile(notifica)) {
          return;
        }
        void caricaProfilo();
        void ricaricaSessione();
      },
      [caricaProfilo, ricaricaSessione],
    ),
  );

  // Chiudere il pannello non ricarica il conteggio qui: il pannello marca le
  // righe che ha mostrato **alla chiusura**, quindi un `GET` immediato leggerebbe
  // il numero di prima delle `PATCH` in volo. Il pannello chiama `onLette`
  // quando quelle scritture sono arrivate a destinazione, e solo allora si
  // rilegge il badge.
  const chiudiNotifiche = useCallback(() => {
    setNotificheAperte(false);
  }, []);
  const { refreshing, onRefresh } = useRefresh(
    useCallback(async () => {
      await Promise.all([ricaricaSessione(), caricaProfilo(), ricaricaNonLette()]);
    }, [ricaricaSessione, caricaProfilo, ricaricaNonLette]),
  );

  if (!utente) {
    return null;
  }

  // Name and surname come from the profile endpoint when it has answered, and
  // from the session before that: the session is a frozen snapshot of the login
  // response, so editing the name would otherwise show the old one until the
  // next sign-in. Missing values never crash the screen.
  const nome = profilo?.nome ?? utente.nome;
  const cognome = profilo?.cognome ?? utente.cognome;
  const iniziali = `${nome?.charAt(0) ?? ''}${cognome?.charAt(0) ?? ''}`.toUpperCase() || '?';
  const displayName = [nome, cognome].filter(Boolean).join(' ') || utente.username || 'Utente';
  const expiresAt = token ? tokenExpiresAt(token) : null;
  // Il ruolo non arriva dal profilo (P24): continua a venire dalla sessione.
  // La UI nasconde, il backend protegge — e la schermata gestisce il 403.
  // La regola sta in `services/staff.js`: la stessa che apre (o chiude) le due
  // rotte dell'area, così profilo e rotte non possono dire cose diverse (F13).
  const isStaff = puoEntrareNellAreaStaff(utente);

  // I campi nuovi, se il profilo è arrivato: prima del primo esito le righe
  // restano nascoste invece di mostrare segnaposto inventati.
  const email = profilo?.email ?? null;
  const localita = profilo?.localita ?? null;
  const bio = profilo?.bio ?? null;
  const immagine = profilo?.immagineProfilo ?? null;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  // Primo caricamento non ancora concluso: schermata di caricamento intera.
  if (primoCaricamento && errore === null) {
    return <LoadingScreen label="Caricamento del profilo…" />;
  }

  return (
    <Screen scroll withBottomInset={false} refreshing={refreshing} onRefresh={onRefresh}>
      {/* La riga di dati (dottrina di `PageHeader`, audit P3) dice cosa il
          foglio tiene — chi sei e i recapiti che gli altri vedono — e cosa se ne
          fa: si rileggono e si passa alla modifica, che è una banda qui sotto. */}
      <PageHeader
        titolo="Profilo"
        frase="Chi sei e i recapiti che gli altri vedono: da qui li rileggi e passi alla modifica."
      />
      {salvato ? (
        <Banner
          kind="success"
          message="Profilo aggiornato."
          etichettaAzione="Chiudi"
          iconaAzione="close-outline"
          onAzione={() => router.setParams({ salvato: undefined })}
        />
      ) : null}

      {errore !== null ? (
        <Banner
          kind="error"
          message={errore}
          etichettaAzione="Riprova"
          iconaAzione="refresh-outline"
          onAzione={caricaProfilo}
          caricamentoAzione={richiestaInCorso}
        />
      ) : null}

      {/* Un foglio solo, diviso in bande da una riga di 1 px: identità, dati,
          le due voci che portano altrove, l'aspetto e la sessione. Cinque card
          di pari peso erano il segnale più chiaro che la schermata non avesse
          gerarchia (direzione UX, prestito C: F82/F88). */}
      <Card style={{ padding: 0, gap: 0 }}>
        <Banda>
          <View style={{ alignItems: 'center', gap: space.md }}>
            {/* L'immagine la disegna `Avatar`: lo stesso riquadro da 84 px prima e
                dopo il caricamento, quindi niente salto di layout; e le iniziali
                con l'anello (direzione UX, F88) quando l'indirizzo manca o non
                risponde, così l'accento resta all'azione primaria della schermata
                e questa non ne ha una. L'errore torna qui perché la schermata lo
                dice a parole: un'immagine rotta è uno stato, non una cosa da
                nascondere. */}
            <Avatar
              uri={immagine}
              nome={iniziali}
              misura={84}
              onErrore={() => setImmagineRotta(true)}
            />
            {immagine !== null && immagineRotta ? (
              <AppText variant="label" tone="danger" style={{ textAlign: 'center' }}>
                L&apos;immagine del profilo non si carica: controlla l&apos;indirizzo in «Modifica
                profilo».
              </AppText>
            ) : null}
            <View style={{ alignItems: 'center', gap: space.xs }}>
              <AppText variant="heading">
                {displayName}
              </AppText>
              {utente.username ? (
                <AppText variant="small" tone="secondary">
                  @{utente.username}
                </AppText>
              ) : null}
              {/* Il ruolo non è un'etichetta per chiunque: «USER» sotto il proprio
                  nome è un enum interno, non informazione (audit UX F29). Lo staff
                  invece ha bisogno di sapere di esserlo. */}
              {isStaff ? (
                <AppText variant="small" tone="secondary">
                  Staff
                </AppText>
              ) : null}
            </View>
          </View>
        </Banda>

        {/* Anagrafica dal server: l'email è l'unico dato che solo questo
            endpoint dà; la bio assente si dichiara, non si nasconde. */}
        <Banda>
          <AppText variant="heading">I tuoi dati</AppText>
          {/* Lo stesso marchio di `/match`, non una frase: il saldo è un dato che
              si legge. La `Banda` è una sezione separata da un bordo, quindi
              appoggia su `t.background` come la pagina di `/match`, e la coppia
              `t.surface` + `t.border` del marchio si legge allo stesso modo
              (docs/DESIGN.md, «Marchio di dato»). */}
          {profilo?.crediti !== undefined ? (
            <CreditMark saldo={profilo.crediti ?? 0} />
          ) : null}
          <View style={{ gap: space.sm }}>
            {email ? (
              <RigaProfilo icona="mail-outline" etichetta="Email" valore={email} />
            ) : null}
            {localita ? (
              <RigaProfilo
                icona="location-outline"
                etichetta="Località"
                valore={localitaPerDisplay(localita)}
              />
            ) : null}
            <RigaProfilo
              icona="document-text-outline"
              etichetta="Bio"
              valore={bio ?? 'Non hai ancora scritto una presentazione.'}
            />
          </View>
        </Banda>

        {/* Le notifiche non sono una sesta tab né una schermata a sé: la barra
            ne ha cinque e il menu del web le rispecchia, quindi la banda apre un
            pannello sopra il profilo. Il conteggio arriva da una chiamata da una
            riga (`limit: 1`), così la riga dice se c'è qualcosa da leggere senza
            scaricare la lista qui. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            nonLette > 0
              ? `Apri le notifiche, ${nonLette} da leggere`
              : 'Apri le notifiche'
          }
          onPress={() => setNotificheAperte(true)}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Banda riga>
            <AppIcon name="notifications-outline" size={20} color={t.primary} />
            <View style={{ flex: 1, gap: space.xs }}>
              <AppText variant="heading">Notifiche</AppText>
              <AppText variant="small" tone="secondary">
                {nonLette > 0
                  ? `${nonLette} da leggere: proposte, risposte, schede e decisioni della staff.`
                  : 'Proposte, risposte, schede e decisioni della staff che ti riguardano.'}
              </AppText>
            </View>
            {nonLette > 0 ? (
              <Chip background={t.serviceBg}>
                <AppText variant="caption" style={{ color: t.serviceText }}>
                  {String(nonLette)}
                </AppText>
              </Chip>
            ) : null}
            <AppIcon name="chevron-forward" size={18} color={t.textSecondary} />
          </Banda>
        </Pressable>

        {/* La modifica ha una schermata a sé: la banda si limita ad aprirla. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Apri Modifica profilo"
          onPress={() => router.push('/edit-profile')}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Banda riga>
            <AppIcon name="pencil-outline" size={20} color={t.primary} />
            <View style={{ flex: 1, gap: space.xs }}>
              <AppText variant="heading">Modifica profilo</AppText>
              <AppText variant="small" tone="secondary">
                Cambia nome, cognome, località, bio e immagine: sono i dati che gli altri
                vedono quando ti contattano.
              </AppText>
            </View>
            <AppIcon name="chevron-forward" size={18} color={t.textSecondary} />
          </Banda>
        </Pressable>

        {/* L'area staff non è una sesta tab: compare qui **solo** per chi ha il
            ruolo. La UI nasconde, il backend protegge. */}
        {isStaff ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Apri la schermata Area staff"
            onPress={() => router.push('/staff')}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Banda riga>
              <AppIcon name="shield-checkmark-outline" size={20} color={t.primary} />
              <View style={{ flex: 1, gap: space.xs }}>
                <AppText variant="heading">Area staff</AppText>
                <AppText variant="small" tone="secondary">
                  Esamina le segnalazioni e chiudile con un esito.
                </AppText>
              </View>
              <AppIcon name="chevron-forward" size={18} color={t.textSecondary} />
            </Banda>
          </Pressable>
        ) : null}

        <Banda>
          <AppText variant="heading">Aspetto</AppText>
          <AppText variant="small" tone="secondary">
            L'opzione Sistema segue il tema del dispositivo. La scelta resta salvata su questo
            dispositivo.
          </AppText>
          <ThemeSelector />
        </Banda>

        {/* La sessione è l'ultima banda: è un dato di stato, non un comando, e
            chiude il foglio senza competere con niente. */}
        <Banda ultima riga>
          <AppIcon name="time-outline" size={18} color={t.textSecondary} />
          <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
            {expiresAt
              ? `Sessione valida fino alle ${formatOrarioScadenza(expiresAt * 1000)}`
              : 'Scadenza della sessione non disponibile.'}
          </AppText>
        </Banda>
      </Card>


      {/* «Esci» era il controllo più rumoroso del profilo (audit UX F08): è
          un'uscita, non il compito della schermata. Resta riconoscibile
          (icona + parola) ma non compete con «Modifica profilo». */}
      <AppButton
        label="Esci"
        variant="ghost"
        onPress={handleSignOut}
        loading={signingOut}
        icon="log-out-outline"
      />

      {/* Il pannello si monta solo mentre è aperto: `useNotifications` legge la
          lista su focus, e un pannello sempre montato chiederebbe l'inbox a
          ogni ingresso nel profilo per una lista che nessuno ha aperto (solo il
          `limit: 1` del badge serve lì). `onClose` è l'unica uscita — X, tocco
          fuori ed Escape —, `onLette` rilegge il badge quando le marcature in
          volo sono atterrate. */}
      {notificheAperte ? (
        <NotificationsSheet
          visible
          onClose={chiudiNotifiche}
          onLette={ricaricaNonLette}
        />
      ) : null}
    </Screen>
  );
}

/**
 * Una banda del foglio del profilo: il foglio è **uno**, e le sue parti sono
 * separate da una riga di 1 px, non da un'altra card. Cinque card di pari peso
 * dicevano che niente era più importante di qualcos'altro.
 *
 * `riga` è per le bande che sono un comando: tornano orizzontali e prendono
 * l'altezza minima di un bersaglio toccabile. `ultima` spegne la riga di
 * chiusura, così il foglio non finisce con un bordo in più.
 */
function Banda({ children, ultima = false, riga = false }) {
  const t = useTokens();
  return (
    <View
      style={[
        {
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          gap: space.sm,
          borderBottomWidth: ultima ? 0 : 1,
          borderBottomColor: t.border,
        },
        riga
          ? {
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              minHeight: target.min,
            }
          : null,
      ]}
    >
      {children}
    </View>
  );
}

/** Una riga della banda «I tuoi dati»: icona, etichetta, valore. */
function RigaProfilo({ icona, etichetta, valore }) {
  const t = useTokens();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
      <AppIcon name={icona} size={18} color={t.textSecondary} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' }}>
        <AppText variant="small" tone="secondary">
          {etichetta}:
        </AppText>
        <AppText variant="small" style={{ flexShrink: 1 }}>
          {valore}
        </AppText>
      </View>
    </View>
  );
}
