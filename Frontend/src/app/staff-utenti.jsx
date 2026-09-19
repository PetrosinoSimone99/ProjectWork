import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { AVVISO_DEMO, USA_DATI_FINTI } from '@/api/config';
import { cambiaRuoloUtente, cambiaStatoUtente, ottieniUtentiStaff } from '@/api/barattolo';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { BarraPillole } from '@/components/BarraPillole';
import { Card } from '@/components/Card';
import { CardUtenteStaff } from '@/components/CardUtenteStaff';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ModalConferma } from '@/components/ModalConferma';
import { Screen } from '@/components/Screen';
import {
  AZIONI_UTENTE,
  RUOLI,
  STATI_UTENTE,
  descriviCambioRuolo,
  descriviCambioStato,
  etichettaRuolo,
  etichettaStatoUtente,
  filtraUtenti,
} from '@/servizi/staff-utenti';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * «Area staff → Utenti»: l'elenco degli utenti con ruolo e stato, e i due comandi
 * che li cambiano.
 *
 * È una rotta secondaria, come `/staff`: freccia di ritorno, nessuna tab nuova, e
 * in cima il rimando all'altra sezione dell'area staff (le segnalazioni).
 *
 * Quattro decisioni che stanno qui e non altrove:
 * - **i permessi non si decidono qui e nemmeno nei componenti**: le regole stanno
 *   in `servizi/staff-utenti.js`, che replica `userRoleManager.php` e
 *   `userStatoManager.php`. Questa schermata disegna quello che
 *   `azioniConsentite` ammette e **regge il `403`** come un caso normale: se il
 *   backend rifiuta, si mostra il suo `message` e si ricarica l'elenco, perché lo
 *   stato a schermo può essere vecchio.
 * - **la conferma è obbligatoria**: cambiare ruolo o stato riguarda un'altra
 *   persona, quindi `ModalConferma` dice cosa cambia e per chi prima di chiamare
 *   l'API.
 * - **la ricerca è locale e dichiarata**: nome, cognome e username si filtrano
 *   nell'elenco già caricato; l'endpoint proposto accetterebbe i filtri in query
 *   string, ma la demo non li usa (l'elenco è piccolo).
 * - **il ruolo è finto e dichiarato**: senza il ruolo vero dal backend (P24) la
 *   demo non potrebbe decidere cosa mostrare; il `Banner` in cima e il
 *   `// TODO(backend)` in `api/finti/utenti.js` lo dicono.
 */

/** I filtri per ruolo: `null` è «tutti», e i valori sono quelli del backend. */
const FILTRI_RUOLO = [
  { valore: null, etichetta: 'Tutti' },
  ...RUOLI.map((ruolo) => ({ valore: ruolo, etichetta: etichettaRuolo(ruolo) })),
];

/** I filtri per stato, stessa forma. */
const FILTRI_STATO = [
  { valore: null, etichetta: 'Tutti' },
  ...STATI_UTENTE.map((stato) => ({ valore: stato, etichetta: etichettaStatoUtente(stato) })),
];

/** Quali stati, quando diventano attivi, non vanno mostrati come distruttivi. */
const STATI_NON_DISTRUTTIVI = [STATI_UTENTE[0]];

export default function StaffUtentiScreen() {
  const { token, utente } = useAuth();
  const router = useRouter();
  const t = useTokens();
  const utenteId = utente?.id;
  // Chi guarda: la regola dei permessi vuole id e ruolo, non tutto l'utente.
  const io = useMemo(
    () => ({ id: utenteId ?? null, ruolo: utente?.ruolo ?? null }),
    [utenteId, utente?.ruolo],
  );

  const [utenti, setUtenti] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState(null);
  const [erroreAzione, setErroreAzione] = useState(null);
  const [messaggio, setMessaggio] = useState(null);
  const [azioneInCorso, setAzioneInCorso] = useState(null);
  const [conferma, setConferma] = useState(null);

  const [ricerca, setRicerca] = useState('');
  const [filtroRuolo, setFiltroRuolo] = useState(null);
  const [filtroStato, setFiltroStato] = useState(null);

  // Le richieste in volo: una risposta si applica solo se nessuna più recente è
  // già partita (la ricarica dopo un'azione non litiga con un «Riprova»).
  const richiestaRef = useRef(0);
  const azioneRef = useRef(false);

  const carica = useCallback(async () => {
    if (!token || utenteId === null || utenteId === undefined) {
      return;
    }
    const seq = ++richiestaRef.current;
    setCaricamento(true);
    try {
      const elenco = await ottieniUtentiStaff(token, utenteId);
      if (seq !== richiestaRef.current) {
        return;
      }
      setUtenti(elenco);
      setErrore(null);
    } catch (err) {
      if (seq !== richiestaRef.current) {
        return;
      }
      setErrore(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      if (seq === richiestaRef.current) {
        setCaricamento(false);
      }
    }
  }, [token, utenteId]);

  useFocusEffect(
    useCallback(() => {
      void carica();
      return () => {
        richiestaRef.current += 1;
      };
    }, [carica]),
  );

  const visibili = useMemo(
    () => filtraUtenti(utenti ?? [], ricerca, filtroRuolo, filtroStato),
    [utenti, ricerca, filtroRuolo, filtroStato],
  );

  const filtriAttivi = ricerca.trim() !== '' || filtroRuolo !== null || filtroStato !== null;

  function apriConferma(tipo, bersaglio, valore) {
    // Un'azione alla volta: se una è in volo, il secondo comando non apre niente.
    if (azioneRef.current) {
      return;
    }
    setErroreAzione(null);
    setMessaggio(null);
    setConferma({ tipo, utente: bersaglio, valore });
  }

  async function confermaAzione() {
    if (!conferma || azioneRef.current) {
      return;
    }
    azioneRef.current = true;
    const { tipo, utente: bersaglio, valore } = conferma;
    setAzioneInCorso({ id: bersaglio.id, tipo });
    setErroreAzione(null);
    setMessaggio(null);
    try {
      const esito =
        tipo === AZIONI_UTENTE.RUOLO
          ? await cambiaRuoloUtente(token, utenteId, bersaglio.id, valore)
          : await cambiaStatoUtente(token, utenteId, bersaglio.id, valore);
      setMessaggio(esito.messaggio || 'Fatto.');
      setConferma(null);
    } catch (err) {
      // Il `403` (regola di autorizzazione), il `404` (utente sparito) e il `400`
      // si mostrano così come sono: l'elenco resta, e la ricarica in coda rimette
      // lo stato vero.
      setErroreAzione(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
      setConferma(null);
    } finally {
      await carica();
      azioneRef.current = false;
      setAzioneInCorso(null);
    }
  }

  function azzeraFiltri() {
    setRicerca('');
    setFiltroRuolo(null);
    setFiltroStato(null);
  }

  if (utenti === null && !errore) {
    return <LoadingScreen label="Guardo gli utenti…" />;
  }

  const testoConferma = conferma
    ? `${
        conferma.tipo === AZIONI_UTENTE.RUOLO
          ? descriviCambioRuolo(conferma.utente, conferma.valore)
          : descriviCambioStato(conferma.utente, conferma.valore)
      }\n\nA decidere è il backend: se non è permesso risponde 403 e la schermata lo mostra.`
    : '';
  const etichettaConferma =
    conferma?.tipo === AZIONI_UTENTE.RUOLO ? 'Cambia il ruolo' : 'Cambia lo stato';
  // Reimpostare uno stato «normale» non distrugge niente: il rosso direbbe una
  // cosa che non è, quindi lì la conferma resta `primary`.
  const varianteConferma =
    conferma?.tipo === AZIONI_UTENTE.RUOLO || !STATI_NON_DISTRUTTIVI.includes(conferma?.valore)
      ? 'danger'
      : 'primary';

  return (
    <Screen scroll withBottomInset={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Torna indietro"
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: radius.pill,
            backgroundColor: pressed ? t.border : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Ionicons name="arrow-back" size={22} color={t.text} />
        </Pressable>
        <AppText variant="title">Utenti</AppText>
      </View>

      <AppButton
        label="Segnalazioni"
        variant="ghost"
        icon="shield-checkmark-outline"
        accessibilityLabel="Apri le segnalazioni dell'area staff"
        onPress={() => router.push('/staff')}
        style={{ alignSelf: 'flex-start' }}
      />

      <AppText variant="small" tone="secondary">
        Cambia il ruolo e lo stato degli utenti. Ogni modifica riguarda un'altra persona: la
        conferma dice cosa cambia e per chi, e l'elenco si aggiorna subito dopo.
      </AppText>

      {USA_DATI_FINTI ? <Banner kind="info" message={AVVISO_DEMO} /> : null}

      {/* La regola della UI, dichiarata a chi la prova: nascondere non è proteggere. */}
      <AppText variant="small" tone="secondary">
        Questa schermata nasconde i comandi che il tuo ruolo non consente, ma a decidere è il
        backend: se una chiamata non è permessa risponde 403 e la schermata lo mostra.
      </AppText>

      <Card>
        <AppInput
          label="Cerca"
          value={ricerca}
          onChangeText={setRicerca}
          placeholder="nome, cognome o username"
          autoCapitalize="none"
          optionalHint="filtro locale"
        />
        <View style={{ gap: space.sm }}>
          <AppText variant="small" style={{ fontWeight: '600' }}>
            Ruolo
          </AppText>
          <BarraPillole
            accessibilityLabel="Filtra gli utenti per ruolo"
            scelte={FILTRI_RUOLO}
            valore={filtroRuolo}
            onChange={setFiltroRuolo}
          />
        </View>
        <View style={{ gap: space.sm }}>
          <AppText variant="small" style={{ fontWeight: '600' }}>
            Stato
          </AppText>
          <BarraPillole
            accessibilityLabel="Filtra gli utenti per stato"
            scelte={FILTRI_STATO}
            valore={filtroStato}
            onChange={setFiltroStato}
          />
        </View>
        {filtriAttivi ? (
          <AppButton
            label="Azzera filtri"
            variant="ghost"
            icon="close-outline"
            onPress={azzeraFiltri}
            accessibilityLabel="Azzera i filtri dell'elenco utenti"
            style={{ alignSelf: 'flex-start' }}
          />
        ) : null}
      </Card>

      {errore ? (
        <View style={{ gap: space.sm }}>
          <Banner kind="error" message={errore} />
          <AppButton
            label="Riprova"
            variant="secondary"
            icon="refresh-outline"
            onPress={() => void carica()}
            loading={caricamento}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
      ) : null}

      {messaggio ? <Banner kind="success" message={messaggio} /> : null}
      {erroreAzione ? <Banner kind="error" message={erroreAzione} /> : null}

      {utenti !== null && visibili.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Nessun utente da mostrare"
          description={
            utenti.length === 0
              ? "Non c'è nessun utente nell'elenco."
              : 'Nessun utente corrisponde ai filtri: prova a cercare un altro nome o ad azzerare i filtri.'
          }
        />
      ) : null}

      {visibili.map((riga) => (
        <CardUtenteStaff
          key={riga.id}
          utente={riga}
          io={io}
          azioneInCorso={azioneInCorso}
          onScegli={apriConferma}
        />
      ))}

      <ModalConferma
        visible={conferma !== null}
        titolo={conferma?.tipo === AZIONI_UTENTE.RUOLO ? 'Cambiare il ruolo?' : 'Cambiare lo stato?'}
        messaggio={testoConferma}
        etichettaConferma={etichettaConferma}
        varianteConferma={varianteConferma}
        loading={azioneInCorso !== null}
        onConferma={() => void confermaAzione()}
        onAnnulla={() => setConferma(null)}
      />
    </Screen>
  );
}
