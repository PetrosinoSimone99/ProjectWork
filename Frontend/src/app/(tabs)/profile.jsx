import { useCallback, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { formatOrarioScadenza, tokenExpiresAt } from '@/auth/token-store';
import { getProfile } from '@/api';
import { localitaPerDisplay } from '@/services/italian-regions';
import { useRefresh } from '@/hooks/useRefresh';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ThemeSelector } from '@/components/ThemeSelector';
import { space, useTokens } from '@/theme/tokens';

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
 * - **bio assente**: «Nessuna bio.», non il campo che sparisce;
 * - un 401 non si gestisce qui: il meccanismo di `client.js` manda al login.
 */
export default function ProfileScreen() {
  const { utente, token, signOut, ricaricaSessione } = useAuth();
  const router = useRouter();
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
      setErrore(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
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

  // Pull-to-refresh: rilegge sessione e profilo insieme, senza svuotare nulla.
  const { refreshing, onRefresh } = useRefresh(
    useCallback(async () => {
      await Promise.all([ricaricaSessione(), caricaProfilo()]);
    }, [ricaricaSessione, caricaProfilo]),
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
  const ruolo = typeof utente.ruolo === 'string' ? utente.ruolo.trim().toUpperCase() : null;
  const isStaff = ruolo === 'STAFF' || ruolo === 'ADMIN';

  // I campi nuovi, se il profilo è arrivato: prima del primo esito le righe
  // restano nascoste invece di mostrare segnaposto inventati.
  const email = profilo?.email ?? null;
  const localita = profilo?.localita ?? null;
  const bio = profilo?.bio ?? null;
  const immagine = profilo?.immagineProfilo ?? null;
  const mostraImmagine = immagine !== null && !immagineRotta;

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
      {errore !== null ? (
        <View style={{ gap: space.md, marginBottom: space.lg }}>
          <Banner kind="error" message={errore} />
          <AppButton
            label="Riprova"
            onPress={caricaProfilo}
            loading={richiestaInCorso}
            icon="refresh-outline"
          />
        </View>
      ) : null}

      <View style={{ alignItems: 'center', gap: space.md, paddingTop: space.md }}>
        {/* The pasted photo URL, when the image loads. When it does not, the
            initials stay and the line below says it explicitly: a broken image
            is a state, not something to hide. */}
        {mostraImmagine ? (
          <Image
            source={{ uri: immagine }}
            accessibilityLabel="Immagine del profilo"
            onError={() => setImmagineRotta(true)}
            style={{ width: 84, height: 84, borderRadius: 999 }}
          />
        ) : (
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 999,
              backgroundColor: t.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText variant="title" tone="onPrimary" style={{ fontSize: 30 }}>
              {iniziali}
            </AppText>
          </View>
        )}
        {immagine !== null && immagineRotta ? (
          <AppText variant="caption" tone="danger" style={{ textAlign: 'center' }}>
            L&apos;immagine del profilo non si carica: controlla l&apos;indirizzo in «Modifica
            profilo».
          </AppText>
        ) : null}
        <View style={{ alignItems: 'center', gap: 2 }}>
          <AppText variant="title" style={{ fontSize: 22 }}>
            {displayName}
          </AppText>
          {utente.username ? (
            <AppText variant="small" tone="secondary">
              @{utente.username}
            </AppText>
          ) : null}
          {ruolo ? (
            <AppText variant="small" tone="secondary">
              {ruolo}
            </AppText>
          ) : null}
        </View>
      </View>

      {/* Anagrafica dal server: l'email è l'unico dato che solo questo
          endpoint dà; la bio assente si dichiara, non si nasconde. */}
      <Card>
        <View style={{ gap: space.sm }}>
          <AppText variant="heading">Il tuo profilo</AppText>
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
            valore={bio ?? 'Nessuna bio.'}
          />
        </View>
      </Card>

      {/* La modifica ha una schermata a sé: la card si limita ad aprirla,
          così come fa la card «I miei token». */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Apri la schermata Modifica profilo"
        onPress={() => router.push('/edit-profile')}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Ionicons name="pencil-outline" size={20} color={t.primary} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading" style={{ fontSize: 16 }}>
              Modifica profilo
            </AppText>
            <AppText variant="small" tone="secondary">
              Cambia nome, cognome, località, bio e immagine: sono i dati che gli altri
              vedono quando ti contattano.
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textSecondary} />
        </Card>
      </Pressable>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name="time-outline" size={18} color={t.textSecondary} />
          <AppText variant="small" tone="secondary">
            {expiresAt
              ? `Sessione valida fino alle ${formatOrarioScadenza(expiresAt * 1000)}`
              : 'Scadenza della sessione non disponibile.'}
          </AppText>
        </View>
      </Card>

      {/* L'area staff non è una sesta tab: compare qui **solo** per chi ha il
          ruolo. La UI nasconde, il backend protegge. */}
      {isStaff ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Apri la schermata Area staff"
          onPress={() => router.push('/staff')}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={t.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="heading" style={{ fontSize: 16 }}>
                Area staff
              </AppText>
              <AppText variant="small" tone="secondary">
                Esamina le segnalazioni e chiudile con un esito.
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textSecondary} />
          </Card>
        </Pressable>
      ) : null}

      <Card>
        <View style={{ gap: space.xs }}>
          <AppText variant="heading">Aspetto</AppText>
          <AppText variant="small" tone="secondary">
            L'opzione Sistema segue il tema del dispositivo. La scelta resta salvata su questo
            dispositivo.
          </AppText>
        </View>
        <ThemeSelector />
      </Card>

      <AppButton
        label="Esci"
        variant="danger"
        onPress={handleSignOut}
        loading={signingOut}
        icon="log-out-outline"
      />
    </Screen>
  );
}

/** Una riga della card «Il tuo profilo»: icona, etichetta, valore. */
function RigaProfilo({ icona, etichetta, valore }) {
  const t = useTokens();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
      <Ionicons name={icona} size={18} color={t.textSecondary} style={{ marginTop: 1 }} />
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
