import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { aggiornaProfilo, ottieniProfilo } from '@/api/barattolo';
import { BottoneIndietro } from '@/components/BottoneIndietro';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { LoadingScreen } from '@/components/LoadingScreen';
import { space } from '@/theme/tokens';

const LIMITI = {
  localita: { max: 255, messaggio: 'La località può avere al massimo 255 caratteri.' },
  bio: { max: 1000, messaggio: 'La bio può avere al massimo 1000 caratteri.' },
};

const ERRORE_GENERICO_400 = 'Controlla i dati inseriti: manca qualcosa o non è valido.';

/**
 * Controlla un campo con i **limiti del backend** (location 1–255, bio ≤1000,
 * entrambi anche svuotabili): la validazione è client-side, per campo, in
 * italiano (§8 di `AGENTS.md`, niente lib di schema). Un campo vuoto è
 * legittimo: si scriverà `null` e il backend lo svuota.
 */
function validaCampo(campo, testo) {
  const { max, messaggio } = LIMITI[campo];
  return testo.length > max ? messaggio : null;
}

/**
 * «Modifica profilo»: la rotta che rende finalmente scrivibili località e bio
 * (`PATCH /api/profile`), aperta dalla schermata Profilo.
 *
 * Suono di fondo del piano: **non si salva nulla di ciò che non è cambiato**.
 * I campi arrivano precompilati dalla GET, e al «Salva» il corpo della PATCH
 * contiene solo i campi diversati — così l'invariante «almeno un campo» del
 * backend è rispettata senza controlli speciali e «Salva» è disabilitato quando
 * non c'è nulla da mandare.
 *
 * Gli stati sono tutti espliciti (§7 di `AGENTS.md`):
 * - **caricamento**: `LoadingScreen` finché la GET non porta i valori attuali
 *   (il form non apre mai vuoto o a metà);
 * - **validazione**: errori italiani sotto il campo, i limiti sono quelli del
 *   backend (`validateField()` del controller);
 * - **errore di salvataggio**: `Banner` il form **conserva tutto ciò che è
 *   stato digitato** e «Salva» torna attivo, per riprovare;
 * - **disabilitato**: «Salva» non reagisce se non è cambiato nulla;
 * - un `401` si gestisce da solo in `client.js` (logout), i messaggi di errore
 *   in inglese del backend `400` si sostituiscono con un messaggio generico
 *   italiano, il resto passa così com'è.
 */
export default function ModificaProfiloScreen() {
  const { token } = useAuth();
  const router = useRouter();

  const [primoCaricamento, setPrimoCaricamento] = useState(true);
  const [caricamentoProfilo, setCaricamentoProfilo] = useState(false);
  const [caricamentoErrore, setCaricamentoErrore] = useState(null);

  const [localita, setLocalita] = useState('');
  const [bio, setBio] = useState('');
  const [erroreLocalita, setErroreLocalita] = useState(null);
  const [erroreBio, setErroreBio] = useState(null);

  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);
  const [erroreSalvataggio, setErroreSalvataggio] = useState(null);

  // I valori attuali del server: servono perché «Salva» calcoli il da-salvare.
  const [valoriIniziali, setValoriIniziali] = useState({ localita: '', bio: '' });

  const caricaProfilo = useCallback(async () => {
    if (!token) {
      return;
    }
    setCaricamentoProfilo(true);
    try {
      const profilo = await ottieniProfilo(token);
      const attuali = { localita: profilo?.localita ?? '', bio: profilo?.bio ?? '' };
      setValoriIniziali(attuali);
      setLocalita(attuali.localita);
      setBio(attuali.bio);
      setErroreLocalita(null);
      setErroreBio(null);
      setErroreSalvataggio(null);
      setCaricamentoErrore(null);
    } catch (err) {
      setCaricamentoErrore(
        err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.',
      );
    } finally {
      setCaricamentoProfilo(false);
      setPrimoCaricamento(false);
    }
  }, [token]);

  // La rotta apre con i valori attuali del server: i campi non si presentano
  // mai vuoti per errore (finché la GET non l'ha detta, c'è `LoadingScreen`).
  // `useFocusEffect` (e non `useEffect`) è il pattern della schermata Profilo:
  // la lettura si lega all'entrata in primo piano, non ai render.
  useFocusEffect(
    useCallback(() => {
      void caricaProfilo();
    }, [caricaProfilo]),
  );

  const aggiornaLocalita = useCallback((testo) => {
    setLocalita(testo);
    setErroreLocalita(validaCampo('localita', testo));
  }, []);

  const aggiornaBio = useCallback((testo) => {
    setBio(testo);
    setErroreBio(validaCampo('bio', testo));
  }, []);

  const localitaCambiata = localita.trim() !== valoriIniziali.localita;
  const bioCambiata = bio.trim() !== valoriIniziali.bio;
  const formNonCambiato = !(localitaCambiata || bioCambiata);
  const validazione = erroreLocalita === null && erroreBio === null;

  async function handleSalva() {
    if (!token || formNonCambiato || !validazione) {
      return;
    }
    setSalvataggioInCorso(true);
    setErroreSalvataggio(null);
    const modifiche = {};
    if (localitaCambiata) {
      modifiche.localita = localita.trim();
    }
    if (bioCambiata) {
      modifiche.bio = bio.trim();
    }
    try {
      await aggiornaProfilo(token, modifiche);
      // La schermata Profilo si rilegge già al focus (passo 01): si torna
      // indietro e lasciamo che sia lei a mostrare i valori nuovi. Nessun
      // banner di successo, nessuna copia locale dei dati. Se la rotta è stata
      // aperta da un link diretto (web) non c'è nulla a cui tornare: si va
      // comunque alla Profilo (stessa regola di `accordo.jsx`).
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/profilo');
      }
    } catch (err) {
      const messaggio =
        err instanceof ApiError
          ? err.status === 400
            ? ERRORE_GENERICO_400
            : err.message
          : 'Errore imprevisto. Riprova.';
      setErroreSalvataggio(messaggio);
      setSalvataggioInCorso(false);
    }
  }

  if (primoCaricamento && caricamentoProfilo) {
    return <LoadingScreen label="Carico il tuo profilo…" />;
  }

  return (
    <Screen scroll withBottomInset={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <BottoneIndietro />
        <AppText variant="title">Modifica profilo</AppText>
      </View>

      <AppText variant="small" tone="secondary">
        Puoi cambiare la località e la bio. Nome e cognome non si cambiano da qui.
      </AppText>

      {caricamentoErrore ? (
        <View style={{ gap: space.md }}>
          <Banner kind="error" message={caricamentoErrore} />
          <AppButton
            label="Riprova"
            variant="secondary"
            icon="refresh-outline"
            onPress={() => void caricaProfilo()}
            loading={caricamentoProfilo}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
      ) : null}

      <Card>
        <View style={{ gap: space.md }}>
          <AppInput
            label="Località"
            value={localita}
            onChangeText={aggiornaLocalita}
            placeholder="Es. Roma"
            optionalHint="Solo te la vedi"
            maxLength={LIMITI.localita.max + 1}
            editable={!caricamentoProfilo && !salvataggioInCorso}
            error={erroreLocalita}
          />
          <AppInput
            label="Bio"
            value={bio}
            onChangeText={aggiornaBio}
            placeholder="Racconta le competenze che offri e cerchi"
            multiline
            maxLength={LIMITI.bio.max}
            contatore={`${bio.length}/${LIMITI.bio.max}`}
            editable={!caricamentoProfilo && !salvataggioInCorso}
            error={erroreBio}
          />
        </View>
      </Card>

      {erroreSalvataggio ? <Banner kind="error" message={erroreSalvataggio} /> : null}

      <AppButton
        label={salvataggioInCorso ? 'Salvataggio in corso…' : 'Salva modifiche'}
        onPress={() => void handleSalva()}
        loading={salvataggioInCorso}
        disabled={formNonCambiato || !validazione}
        icon="checkmark-outline"
      />
    </Screen>
  );
}
