import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { getProfile, updateProfile } from '@/api';
import { INVALID_PROFILE_MESSAGE } from '@/api/areas/profile';
import { BackButton } from '@/components/BackButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ListSelector } from '@/components/ListSelector';
import {
  REGIONI,
  analizzaLocalita,
  formattaLocalita,
  provincePerRegione,
} from '@/services/italian-regions';
import { maxLengthError, photoUrlError, requiredError } from '@/validation';
import { radius, space, useTokens } from '@/theme/tokens';

/** Field limits, copied from `ProfileController::validateField`. */
const LIMITS = {
  nome: 50,
  cognome: 50,
  bio: 1000,
  localita: 255,
};

const PHOTO_HTTPS_MESSAGE =
  "L'indirizzo dell'immagine deve iniziare con https://.";

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
    regione: null,
    provincia: null,
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
 * The photo is a pasted URL (`docs/backend-gaps.md` and brief decision 13): no
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
  const t = useTokens();

  const [firstLoad, setFirstLoad] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Se c'è una bozza interrotta da un 401, il modulo riparte da lì: è il lavoro
  // che l'utente aveva già scritto.
  const ripresa = bozzaDi(utente?.username ?? null);
  const [form, setForm] = useState(() => ripresa?.form ?? formVuoto());
  const [initial, setInitial] = useState(() => ripresa?.initial ?? {});
  const bozzaRipresa = useRef(Boolean(ripresa));
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
        regione: pair?.regione ?? null,
        provincia: pair?.provincia ?? null,
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
    bozzaInterrotta = { proprietario: utente?.username ?? null, form, initial, legacyLocation };
    router.replace({ pathname: '/login', params: { ritorno: '/edit-profile' } });
  }, [utente, form, initial, legacyLocation, router]);

  function update(field, value) {
    setForm((current) => (field === 'regione'
      ? { ...current, regione: value, provincia: null }
      : { ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: null }));
    if (field === 'immagineProfilo') {
      setPhotoLoadFailed(false);
    }
  }

  // Derived, never stored: what would travel, and whether it differs.
  const composedLocation = formattaLocalita(form.provincia, form.regione);
  const locationChanged =
    form.regione !== null &&
    form.provincia !== null &&
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
  if (form.immagineProfilo.trim() !== (initial.immagineProfilo ?? '')) {
    changes.immagineProfilo = form.immagineProfilo;
  }
  const dirty = Object.keys(changes).length > 0;

  const nameError = fieldErrors.nome;
  const surnameError = fieldErrors.cognome;
  const provinceError =
    form.regione !== null && form.provincia === null ? 'Seleziona la provincia.' : null;
  const locationError =
    composedLocation !== null && composedLocation.length > LIMITS.localita
      ? `La località può avere al massimo ${LIMITS.localita} caratteri.`
      : null;
  const bioError = fieldErrors.bio;
  const photoError = fieldErrors.immagineProfilo;
  const valid =
    !nameError &&
    !surnameError &&
    !provinceError &&
    !locationError &&
    !bioError &&
    !photoError &&
    !photoLoadFailed;

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
              ? `${INVALID_PROFILE_MESSAGE} ${PHOTO_HTTPS_MESSAGE}`
              : INVALID_PROFILE_MESSAGE
            : err.message
          : GENERIC_ERROR_MESSAGE;
      setSaveError(message);
      setSaving(false);
    }
  }

  if (firstLoad && loading) {
    return <LoadingScreen label="Carico il tuo profilo…" />;
  }

  const photoUrl = form.immagineProfilo.trim();
  const photoLooksValid = photoUrl !== '' && photoUrlError(photoUrl) === null;

  return (
    <Screen scroll withBottomInset={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <BackButton />
        <AppText variant="title">Modifica profilo</AppText>
      </View>

      <AppText variant="small" tone="secondary">
        Nome, cognome, località, bio e immagine del profilo: gli altri vedono questi dati
        quando ti contattano.
      </AppText>

      {loadError ? (
        <View style={{ gap: space.md }}>
          <Banner kind="error" message={loadError} />
          <AppButton
            label="Riprova"
            variant="secondary"
            icon="refresh-outline"
            onPress={() => void loadProfile()}
            loading={loading}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
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
            label="Regione"
            valore={form.regione}
            opzioni={REGIONI.map((region) => region.nome)}
            onChange={(value) => update('regione', value)}
            disabled={saving}
          />
          <ListSelector
            label="Provincia"
            placeholder={form.regione ? 'Scegli' : 'Scegli prima la regione'}
            valore={form.provincia}
            opzioni={provincePerRegione(form.regione)}
            onChange={(value) => update('provincia', value)}
            disabled={!form.regione || saving}
            errore={provinceError}
          />
          {legacyLocation ? (
            <AppText variant="small" tone="secondary">
              {`Valore attuale: ${legacyLocation} — scegli regione e provincia per aggiornarlo.`}
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
              <Image
                source={{ uri: photoUrl }}
                accessibilityLabel="Anteprima dell'immagine del profilo"
                onError={() => setPhotoLoadFailed(true)}
                onLoad={() => setPhotoLoadFailed(false)}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: radius.card,
                  backgroundColor: t.border,
                }}
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
              label="Togli l'immagine"
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

      <AppButton
        label={saving ? 'Salvataggio in corso…' : 'Salva modifiche'}
        onPress={() => void save()}
        loading={saving}
        disabled={!dirty || !valid}
        icon="checkmark-outline"
      />
    </Screen>
  );
}
