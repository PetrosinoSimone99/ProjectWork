import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter, Redirect } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { getProfile, updateProfile } from '@/api';
import { INVALID_PROFILE_MESSAGE } from '@/api/areas/profile';
import { BackButton } from '@/components/BackButton';
import { Avatar } from '@/components/Avatar';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { ListSelector } from '@/components/ListSelector';
import {
  PROVINCE,
  analizzaLocalita,
  comuniPerProvincia,
  formattaLocalita,
} from '@/services/italian-locations';
import { maxLengthError, photoUrlError, requiredError } from '@/validation';
import { space } from '@/theme/tokens';

/** Field limits, copied from `ProfileController::validateField`. */
const LIMITS = {
  nome: 50,
  cognome: 50,
  bio: 1000,
  localita: 255,
};

// A 400 that names the image field can only come from the backend's own shape
// or length rule now: `photoUrlError` already refused anything that is not an
// https URL, so blaming the scheme would be false. Neutral, and true for every
// remaining cause (port out of range, non-ASCII host, a value the server reads
// differently).
const PHOTO_REFUSED_MESSAGE =
  "Il server non ha accettato l'indirizzo dell'immagine: controlla che sia un indirizzo https valido.";

/**
 * La bozza di una modifica interrotta.
 *
 * Quando una richiesta risponde 401 la sessione si chiude e questa schermata,
 * che è protetta, non può più salvare: prima restava aperta con il modulo
 * modificabile e «Salva» ripeteva lo stesso guasto, e l'unico modo per uscire
 * era ricaricare la pagina perdendo il testo (audit UX F26). La bozza vive qui,
 * in memoria, per il tempo di un nuovo accesso: niente disco, niente dati
 * rimasti dopo la chiusura dell'app.
 */
let bozzaInterrotta = null;

/**
 * La bozza appartiene a un utente.
 *
 * Senza il proprietario, la bozza di una persona restava in memoria e chi
 * accedeva dopo, aprendo «Modifica profilo», vedeva i dati del precedente e un
 * salvataggio li riscriveva sul proprio profilo.
 */
function bozzaDi(username) {
  if (bozzaInterrotta && bozzaInterrotta.proprietario === username) {
    return bozzaInterrotta;
  }
  return null;
}

/** I valori di partenza di un modulo vuoto. */
function formVuoto() {
  return {
    nome: '',
    cognome: '',
    provincia: null,
    comune: null,
    bio: '',
    immagineProfilo: '',
  };
}

/**
 * "Modifica profilo": name, surname, location, bio and the photo URL.
 *
 * Nothing is saved that did not change: the form starts from the values of the
 * `GET`, and the `PATCH` body carries only the fields that differ, which also
 * satisfies the backend's "at least one field" rule without special cases.
 *
 * The photo is a pasted URL (`docs/backend-ledger.md` and brief decision 13): no
 * upload, no storage. It is validated twice — shape in `src/validation/`, and
 * "does it actually load" through an `Image` onError — because a URL that
 * points at a 404 is a broken profile even when it looks well formed.
 *
 * Errors stay explicit: shape errors under their field, a failed save in a
 * banner that keeps everything typed, and a failed load in the preview area.
 */
export default function EditProfileScreen() {
  const { token, utente } = useAuth();
  const router = useRouter();

  const [firstLoad, setFirstLoad] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Se c'è una bozza interrotta da un 401, il modulo riparte da lì: è il lavoro
  // che l'utente aveva già scritto.
  const ripresa = bozzaDi(utente?.username ?? null);
  const [form, setForm] = useState(() => ripresa?.form ?? formVuoto());
  const [initial, setInitial] = useState(() => ripresa?.initial ?? {});
  const bozzaRipresa = useRef(Boolean(ripresa));
  // L'ultimo utente visto: quando la sessione cade l'effetto qui sotto lavora
  // con `utente === null`, quindi il proprietario della bozza va ricordato
  // prima, altrimenti è sempre `null` e il lettore non può mai riconoscerla
  // (audit F58, seconda metà di F26).
  const ultimoUtente = useRef(utente);
  useEffect(() => {
    if (utente) {
      ultimoUtente.current = utente;
    }
  }, [utente]);
  const [legacyLocation, setLegacyLocation] = useState(null);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!token) {
      return;
    }
    if (bozzaRipresa.current) {
      // La bozza vale più del profilo letto dal server: non si sovrascrive.
      bozzaRipresa.current = false;
      bozzaInterrotta = null;
      setFirstLoad(false);
      return;
    }
    setLoading(true);
    try {
      const profile = await getProfile(token);
      const location = profile?.localita ?? '';
      const pair = analizzaLocalita(location);
      const values = {
        nome: profile?.nome ?? '',
        cognome: profile?.cognome ?? '',
        bio: profile?.bio ?? '',
        immagineProfilo: profile?.immagineProfilo ?? '',
        localita: location,
      };
      setInitial(values);
      setForm({
        nome: values.nome,
        cognome: values.cognome,
        provincia: pair?.provincia ?? null,
        comune: pair?.comune ?? null,
        bio: values.bio,
        immagineProfilo: values.immagineProfilo,
      });
      setLegacyLocation(pair || !location ? null : location);
      setPhotoLoadFailed(false);
      setFieldErrors({});
      setSaveError(null);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  // Senza sessione questa schermata non può salvare niente: si esce subito,
  // portandosi dietro il testo e la strada per tornare (audit UX F26).
  useEffect(() => {
    if (utente) {
      return;
    }
    bozzaInterrotta = {
      proprietario: (utente ?? ultimoUtente.current)?.username ?? null,
      form,
      initial,
      legacyLocation,
    };
    router.replace({ pathname: '/login', params: { ritorno: '/edit-profile' } });
  }, [utente, form, initial, legacyLocation, router]);

  function update(field, value) {
    setForm((current) => (field === 'provincia'
      ? { ...current, provincia: value, comune: null }
      : { ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: null }));
    if (field === 'immagineProfilo') {
      setPhotoLoadFailed(false);
    }
  }

  // Derived, never stored: what would travel, and whether it differs.
  const composedLocation = formattaLocalita(form.comune, form.provincia);
  const locationChanged =
    form.provincia !== null &&
    form.comune !== null &&
    composedLocation !== null &&
    composedLocation !== (initial.localita ?? '');
  const changes = {};
  if (form.nome.trim() !== (initial.nome ?? '')) {
    changes.nome = form.nome;
  }
  if (form.cognome.trim() !== (initial.cognome ?? '')) {
    changes.cognome = form.cognome;
  }
  if (locationChanged) {
    changes.localita = composedLocation;
  }
  if (form.bio.trim() !== (initial.bio ?? '')) {
    changes.bio = form.bio;
  }
  // F59: while the preview has failed, the image key is dropped, so a broken
  // URL never travels and the profile keeps the image it had. Residual window,
  // accepted in Cycle 2's lock answer 4: a URL typed and saved before the
  // preview's onError has fired can still travel once — the shape check in
  // src/validation is what still runs, not this guard.
  if (
    !photoLoadFailed &&
    form.immagineProfilo.trim() !== (initial.immagineProfilo ?? '')
  ) {
    changes.immagineProfilo = form.immagineProfilo;
  }
  const dirty = Object.keys(changes).length > 0;

  const nameError = fieldErrors.nome;
  const surnameError = fieldErrors.cognome;
  const comuneError =
    form.provincia !== null && form.comune === null ? 'Seleziona il comune.' : null;
  const locationError =
    composedLocation !== null && composedLocation.length > LIMITS.localita
      ? `La località può avere al massimo ${LIMITS.localita} caratteri.`
      : null;
  const bioError = fieldErrors.bio;
  const photoError = fieldErrors.immagineProfilo;
  const valid =
    !nameError &&
    !surnameError &&
    !comuneError &&
    !locationError &&
    !bioError &&
    !photoError;

  function validate() {
    const errors = {
      nome:
        requiredError(form.nome, 'Il nome è obbligatorio.') ??
        maxLengthError(form.nome, LIMITS.nome, `Il nome può avere al massimo ${LIMITS.nome} caratteri.`),
      cognome:
        requiredError(form.cognome, 'Il cognome è obbligatorio.') ??
        maxLengthError(
          form.cognome,
          LIMITS.cognome,
          `Il cognome può avere al massimo ${LIMITS.cognome} caratteri.`,
        ),
      bio: maxLengthError(form.bio, LIMITS.bio, `La bio può avere al massimo ${LIMITS.bio} caratteri.`),
      immagineProfilo: photoUrlError(form.immagineProfilo),
    };
    setFieldErrors(
      Object.fromEntries(Object.entries(errors).filter(([, message]) => message !== null)),
    );
    return Object.values(errors).every((message) => message === null);
  }

  async function save() {
    if (!token || saving || !dirty) {
      return;
    }
    if (!validate()) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await updateProfile(token, changes);
      bozzaInterrotta = null;
      // Una conferma al ritorno, non il silenzio (audit UX F35).
      router.replace({ pathname: '/(tabs)/profile', params: { salvato: '1' } });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 400
            ? 'immagineProfilo' in changes
              ? `${INVALID_PROFILE_MESSAGE} ${PHOTO_REFUSED_MESSAGE}`
              : INVALID_PROFILE_MESSAGE
            : err.message
          : GENERIC_ERROR_MESSAGE;
      setSaveError(message);
      setSaving(false);
    }
  }

  // Senza sessione la rotta non ha niente da modificare: il modulo vuoto si
  // lasciava compilare e il salvataggio moriva su un errore generico (audit UX
  // F1, stesso difetto delle due rotte staff). La rotta è registrata per ogni
  // sessione, quindi il controllo sta qui.
  if (!token) {
    return <Redirect href="/login" />;
  }

  if (firstLoad && loading) {
    return <LoadingScreen label="Carico il tuo profilo…" />;
  }

  const photoUrl = form.immagineProfilo.trim();
  const photoLooksValid = photoUrl !== '' && photoUrlError(photoUrl) === null;
  // F2: the same condition that drops `immagineProfilo` from the payload, kept
  // as a derived flag so the save button can say why it is disabled instead of
  // leaving the reason only in the image card above. No state, no new rule.
  const photoDropped =
    photoLoadFailed && form.immagineProfilo.trim() !== (initial.immagineProfilo ?? '');

  return (
    <Screen scroll withBottomInset={false}>
      <PageHeader
        titolo="Modifica profilo"
        frase="Nome, cognome, località, bio e immagine del profilo."
        indietro={<BackButton />}
      />

      {loadError ? (
        <Banner
          kind="error"
          message={loadError}
          etichettaAzione="Riprova"
          iconaAzione="refresh-outline"
          onAzione={() => void loadProfile()}
          caricamentoAzione={loading}
        />
      ) : null}

      <Card>
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Nome"
                value={form.nome}
                onChangeText={(value) => update('nome', value)}
                autoCapitalize="words"
                maxLength={LIMITS.nome}
                error={nameError ?? null}
                editable={!saving}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Cognome"
                value={form.cognome}
                onChangeText={(value) => update('cognome', value)}
                autoCapitalize="words"
                maxLength={LIMITS.cognome}
                error={surnameError ?? null}
                editable={!saving}
              />
            </View>
          </View>

          <ListSelector
            label="Provincia"
            valore={form.provincia}
            opzioni={PROVINCE}
            onChange={(value) => update('provincia', value)}
            disabled={saving}
          />
          <ListSelector
            label="Comune"
            placeholder={form.provincia ? 'Scegli' : 'Scegli prima la provincia'}
            valore={form.comune}
            opzioni={comuniPerProvincia(form.provincia)}
            onChange={(value) => update('comune', value)}
            disabled={!form.provincia || saving}
            errore={comuneError}
          />
          {legacyLocation ? (
            <AppText variant="small" tone="secondary">
              {`Valore attuale: ${legacyLocation} — scegli provincia e comune per aggiornarlo.`}
            </AppText>
          ) : null}
          {locationError ? (
            <AppText variant="small" tone="danger">
              {locationError}
            </AppText>
          ) : null}

          <AppInput
            label="Bio"
            value={form.bio}
            onChangeText={(value) => update('bio', value)}
            placeholder="Racconta le competenze che offri e cerchi"
            multiline
            maxLength={LIMITS.bio}
            contatore={`${form.bio.length}/${LIMITS.bio}`}
            editable={!saving}
            error={bioError ?? null}
          />
        </View>
      </Card>

      <Card>
        <View style={{ gap: space.md }}>
          <View style={{ gap: space.xs }}>
            <AppText variant="heading">Immagine del profilo</AppText>
            <AppText variant="small" tone="secondary">
              Incolla l&apos;indirizzo di un&apos;immagine .png, .jpg o .jpeg: l&apos;immagine resta
              dove &egrave; ospitata, non ne conserviamo una copia.
            </AppText>
          </View>

          <AppInput
            label="URL dell'immagine"
            value={form.immagineProfilo}
            onChangeText={(value) => update('immagineProfilo', value)}
            placeholder="https://esempio.it/foto.jpg"
            autoCapitalize="none"
            maxLength={2048}
            editable={!saving}
            error={photoError ?? null}
          />

          {photoLooksValid ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Avatar
                uri={photoUrl}
                nome={utente?.nome ?? utente?.username ?? ''}
                misura={64}
                onErrore={() => setPhotoLoadFailed(true)}
              />
              {photoLoadFailed ? (
                <AppText variant="small" tone="danger" style={{ flexShrink: 1 }}>
                  L&apos;immagine non si carica: controlla che l&apos;indirizzo esista e sia
                  raggiungibile. Non salvo un indirizzo rotto.
                </AppText>
              ) : (
                <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
                  Anteprima dell&apos;immagine che gli altri vedranno.
                </AppText>
              )}
            </View>
          ) : null}

          {photoUrl !== '' ? (
            <AppButton
              label="Rimuovi immagine"
              variant="ghost"
              icon="close-outline"
              disabled={saving}
              onPress={() => {
                update('immagineProfilo', '');
                setPhotoLoadFailed(false);
              }}
              style={{ alignSelf: 'flex-start' }}
            />
          ) : null}
        </View>
      </Card>

      {saveError ? <Banner kind="error" message={saveError} /> : null}

      {photoDropped ? (
        <AppText variant="small" tone="danger">
          Non salvo un indirizzo dell&apos;immagine che non si carica. Per uscirne, «Rimuovi
          immagine».
        </AppText>
      ) : null}

      <AppButton
        label={saving ? 'Salvataggio in corso…' : 'Salva modifiche'}
        onPress={() => void save()}
        loading={saving}
        // `photoDropped` blocks the save as a whole, not only the image: the
        // payload drops the key, so a save with other changes would silently
        // keep the old photo while the screen shows the typed one (F2). The
        // line above says why, and "Rimuovi immagine" is the way out.
        disabled={!dirty || !valid || photoDropped}
        icon="checkmark-outline"
      />
    </Screen>
  );
}
