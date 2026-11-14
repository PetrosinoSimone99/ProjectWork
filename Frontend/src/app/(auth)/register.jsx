import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { getCategories } from '@/api';
import {
  LIMITE_VOCI,
  TIPI_VOCE,
  aggiornaVoce,
  nuovaVoce,
  senzaChiave,
  senzaPrefisso,
  validaVoce,
} from '@/services/offer-request';
import {
  MIN_PASSWORD_LENGTH,
  emailError,
  maxLengthError,
  passwordError,
  requiredError,
} from '@/validation';
import { AuthShell } from '@/components/AuthShell';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { EntriesSection } from '@/components/EntriesSection';
import { ListSelector } from '@/components/ListSelector';
import { TextLink } from '@/components/TextLink';
import { REGIONI, formattaLocalita, provincePerRegione } from '@/services/italian-regions';
import { space } from '@/theme/tokens';

/**
 * Crea il profilo: dati anagrafici, cosa si offre e cosa si cerca.
 *
 * Le voci di offerta e ricerca sono la versione strutturata del vecchio «servizio
 * che offri»: categoria (da una lista che arriva dal backend), mansione in testo
 * libero e casella «da remoto». La località invece è della **persona**, non della
 * voce: si sceglie la regione e poi la provincia, e le due si salvano in un'unica
 * stringa `Provincia (Regione)` nel campo `location` del backend (`users.location`
 * è `varchar(255)` e non ha campi separati).
 *
 * Le regole delle voci stanno in `src/services/offer-request.js`; qui restano
 * solo le regole anagrafiche, la chiamata e i messaggi da disegnare.
 */

/**
 * Limiti anagrafici: **copia dichiarata** del backend Symfony, `AuthController::validateRegistration()`
 * (`mb_strlen` sul valore trimmato), verificati il 24 settembre 2026. La fonte unica non esiste
 * ancora: è la richiesta di `temp/gruppo-2-domande/22-regole-condivise-e-errori-per-campo.md` (piano 12).
 * TODO(backend): farli arrivare dal backend e restituire nei 400 il campo sbagliato.
 */
const LIMITE_NOME = 50; // AuthController.php, validateRegistration()
const LIMITE_COGNOME = 50;
const LIMITE_USERNAME = 30;
const LIMITE_EMAIL = 180;

const FORM_VUOTO = {
  nome: '',
  cognome: '',
  username: '',
  email: '',
  password: '',
  regione: '',
  provincia: '',
};

/** Le due sezioni ripetibili, con i testi che le distinguono. */
const SEZIONI = [
  {
    chiave: 'offerte',
    tipo: TIPI_VOCE.OFFERTA,
    titolo: 'Cosa offri',
    introduzione:
      'Scegli la categoria e spiega in due righe cosa fai. Serve almeno una voce qui e una in «Cosa cerchi».',
    etichettaAggiungi: "Aggiungi un'offerta",
  },
  {
    chiave: 'ricerche',
    tipo: TIPI_VOCE.RICERCA,
    titolo: 'Cosa cerchi',
    introduzione:
      'Scegli la categoria di quello che ti serve e racconta in due righe cosa devi risolvere.',
    etichettaAggiungi: 'Aggiungi una ricerca',
  },
];

/**
 * Account fields, validated with the shared rules of `src/validation/`.
 * Località is mandatory (`AuthController` rejects an empty `location`) and is
 * chosen as region + province: the first missing value gives one error, not two.
 */
function validaAnagrafica(form) {
  const errori = {};
  const nome = form.nome.trim();
  const cognome = form.cognome.trim();
  const username = form.username.trim();

  const nomeErrore =
    requiredError(nome, 'Il nome è obbligatorio.') ??
    maxLengthError(nome, LIMITE_NOME, `Il nome può avere al massimo ${LIMITE_NOME} caratteri.`);
  if (nomeErrore) {
    errori.nome = nomeErrore;
  }
  const cognomeErrore =
    requiredError(cognome, 'Il cognome è obbligatorio.') ??
    maxLengthError(
      cognome,
      LIMITE_COGNOME,
      `Il cognome può avere al massimo ${LIMITE_COGNOME} caratteri.`,
    );
  if (cognomeErrore) {
    errori.cognome = cognomeErrore;
  }
  const usernameErrore =
    requiredError(username, "L'username è obbligatorio.") ??
    maxLengthError(
      username,
      LIMITE_USERNAME,
      `L'username può avere al massimo ${LIMITE_USERNAME} caratteri.`,
    );
  if (usernameErrore) {
    errori.username = usernameErrore;
  }
  const emailErrore =
    emailError(form.email) ??
    maxLengthError(form.email, LIMITE_EMAIL, `L'email può avere al massimo ${LIMITE_EMAIL} caratteri.`);
  if (emailErrore) {
    errori.email = emailErrore;
  }
  const passwordErrore = passwordError(form.password);
  if (passwordErrore) {
    errori.password = passwordErrore;
  }
  if (!form.regione) {
    errori.regione = 'Seleziona la regione.';
  } else if (!form.provincia) {
    errori.provincia = 'Seleziona la provincia.';
  }
  return errori;
}

/** An entry the user has not filled at all: it is skipped, not validated. */
function isBlankEntry(entry) {
  const description = typeof entry?.mansione === 'string' ? entry.mansione.trim() : '';
  return description === '' && (entry?.idCategoria === null || entry?.idCategoria === undefined);
}

/**
 * Errori delle voci, con la chiave che indica la riga (`offerte.0.mansione`):
 * così un errore sulla voce 2 non blocca la voce 1 e il messaggio finisce sotto
 * il campo giusto.
 */
function validaSezione(chiave, voci, categorie) {
  return voci.reduce((errori, voce, indice) => {
    if (isBlankEntry(voce)) {
      return errori;
    }
    const esito = validaVoce(voce, categorie);
    Object.entries(esito).forEach(([campo, messaggio]) => {
      errori[`${chiave}.${indice}.${campo}`] = messaggio;
    });
    return errori;
  }, {});
}

/**
 * The entries of the form in the contract shape of a service: the form holds
 * `idCategoria`/`mansione`/`daRemoto`, the backend wants
 * `categoryIds`/`description`/`isRemote`. The location of the service is the
 * person's, added by the API layer.
 */
function toServiceEntries(entries) {
  return entries.filter((entry) => !isBlankEntry(entry)).map((entry) => ({
    description: entry.mansione.trim(),
    categoryIds:
      entry.idCategoria === null || entry.idCategoria === undefined ? [] : [entry.idCategoria],
    isRemote: entry.daRemoto === true,
  }));
}

/** Il messaggio della Card quando le categorie non sono utilizzabili. */
function messaggioCategorie(stato, dettaglio) {
  if (stato === 'caricamento') {
    return 'Sto caricando le categorie: servono per dirti cosa offri e cosa cerchi.';
  }
  if (stato === 'vuoto') {
    return 'Non ci sono categorie disponibili.';
  }
  return `Non riesco a caricare le categorie: senza, non posso completare la registrazione.${
    dettaglio ? ` ${dettaglio}` : ''
  }`;
}

export default function RegisterScreen() {
  const { signUp, token } = useAuth();
  const [form, setForm] = useState(FORM_VUOTO);
  const [offerte, setOfferte] = useState(() => [nuovaVoce(TIPI_VOCE.OFFERTA)]);
  const [ricerche, setRicerche] = useState(() => [nuovaVoce(TIPI_VOCE.RICERCA)]);
  const [categorie, setCategorie] = useState([]);
  const [statoCategorie, setStatoCategorie] = useState('caricamento');
  const [erroreCategorie, setErroreCategorie] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const caricaCategorie = useCallback(async () => {
    try {
      // In registrazione non c'è ancora una sessione: il token è null, ma
      // `GET /api/categories` è pubblico per le GET (`security.yaml`), quindi
      // la tendina si popola anche prima del login.
      const elenco = await getCategories(token);
      setCategorie(elenco);
      setStatoCategorie(elenco.length > 0 ? 'pronto' : 'vuoto');
      setErroreCategorie(null);
    } catch (err) {
      setCategorie([]);
      setStatoCategorie('errore');
      setErroreCategorie(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    }
  }, [token]);

  // Le categorie si caricano quando la schermata entra in primo piano: alla
  // prima apertura e in ogni ritorno (per esempio dopo essere passati dal login).
  useFocusEffect(
    useCallback(() => {
      void caricaCategorie();
    }, [caricaCategorie]),
  );

  /** Riprova: si torna allo stato di caricamento e si richiede la stessa lista. */
  function riprovaCategorie() {
    setStatoCategorie('caricamento');
    setErroreCategorie(null);
    void caricaCategorie();
  }

  const categoriePronte = statoCategorie === 'pronto';

  function cambiaCampo(campo, valore) {
    setForm((correnti) => ({ ...correnti, [campo]: valore }));
    // L'errore del campo sparisce appena lo si corregge: resterebbe rosso
    // proprio mentre l'utente sta sistemando il dato.
    setFieldErrors((correnti) => senzaChiave(correnti, campo));
  }

  /**
   * Al cambio di regione la provincia scelta prima non vale più: si azzera
   * (copia, mai mutazione) e si tolgono gli errori di entrambi i campi.
   */
  function cambiaRegione(valore) {
    setForm((correnti) => ({ ...correnti, regione: valore, provincia: '' }));
    setFieldErrors((correnti) => senzaChiave(senzaChiave(correnti, 'regione'), 'provincia'));
  }

  function cambiaVoce(chiave, indice, campo, valore) {
    const setVoci = chiave === 'offerte' ? setOfferte : setRicerche;
    setVoci((correnti) =>
      correnti.map((voce, posizione) =>
        posizione === indice ? aggiornaVoce(voce, campo, valore) : voce,
      ),
    );
    setFieldErrors((correnti) => senzaChiave(correnti, `${chiave}.${indice}.${campo}`));
  }

  function aggiungiAllaSezione(chiave) {
    const setVoci = chiave === 'offerte' ? setOfferte : setRicerche;
    const tipo = chiave === 'offerte' ? TIPI_VOCE.OFFERTA : TIPI_VOCE.RICERCA;
    setVoci((correnti) =>
      correnti.length >= LIMITE_VOCI ? correnti : [...correnti, nuovaVoce(tipo)],
    );
  }

  function rimuoviDallaSezione(chiave, indice) {
    const setVoci = chiave === 'offerte' ? setOfferte : setRicerche;
    setVoci((correnti) => correnti.filter((_, posizione) => posizione !== indice));
    // Gli indici delle voci successive si spostano: gli errori di quella sezione
    // si azzerano e la validazione li rimette al posto giusto al prossimo invio.
    setFieldErrors((correnti) => senzaPrefisso(correnti, `${chiave}.`));
  }

  // Le stesse regole del submit, applicate prima: un pulsante attivo su un
  // modulo che non può passare sposta la scoperta dell'errore al tocco (F07).
  const anagraficaValida = Object.keys(validaAnagrafica(form)).length === 0;
  const offertePresenti = offerte.some((voce) => !isBlankEntry(voce));
  const ricerchePresenti = ricerche.some((voce) => !isBlankEntry(voce));
  const puoInviare = categoriePronte && anagraficaValida && offertePresenti && ricerchePresenti;

  function validate() {
    const errori = {
      ...validaAnagrafica(form),
      ...validaSezione('offerte', offerte, categorie),
      ...validaSezione('ricerche', ricerche, categorie),
    };
    setFieldErrors(errori);
    return Object.keys(errori).length === 0;
  }

  async function handleSubmit() {
    setError(null);
    if (!validate()) {
      return;
    }
    // The backend rejects an empty `offers`/`requests` array today
    // (`AuthController::validateServices`), so an account cannot be created
    // without at least one entry per section. Declared here instead of letting
    // the generic 400 explain nothing; see docs/backend-gaps.md.
    const offersEntries = toServiceEntries(offerte);
    const requestEntries = toServiceEntries(ricerche);
    if (offersEntries.length === 0 || requestEntries.length === 0) {
      setError(
        "Per creare l'account serve almeno un'offerta e almeno una ricerca: aggiungine una per sezione. Potrai modificarle o eliminarle dopo la registrazione.",
      );
      return;
    }
    setSubmitting(true);
    try {
      await signUp({
        name: form.nome.trim(),
        surname: form.cognome.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        location: formattaLocalita(form.provincia, form.regione),
        offers: offersEntries,
        requests: requestEntries,
      });
      // A registrazione riuscita la root navigation passa da sola ai tab.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <View style={{ gap: space.xs }}>
        <AppText variant="title">Crea il tuo profilo</AppText>
        <AppText variant="small" tone="secondary">
          Bastano pochi dati per iniziare a scambiare servizi.
        </AppText>
      </View>

      <Card>
        <AppText variant="heading">I tuoi dati</AppText>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Nome"
              value={form.nome}
              onChangeText={(valore) => cambiaCampo('nome', valore)}
              placeholder="Mario"
              autoCapitalize="words"
              maxLength={LIMITE_NOME}
              error={fieldErrors.nome ?? null}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Cognome"
              value={form.cognome}
              onChangeText={(valore) => cambiaCampo('cognome', valore)}
              placeholder="Rossi"
              autoCapitalize="words"
              maxLength={LIMITE_COGNOME}
              error={fieldErrors.cognome ?? null}
            />
          </View>
        </View>
        <AppInput
          label="Username"
          value={form.username}
          onChangeText={(valore) => cambiaCampo('username', valore)}
          placeholder="mario.rossi"
          autoCapitalize="none"
          maxLength={LIMITE_USERNAME}
          error={fieldErrors.username ?? null}
        />
        <AppInput
          label="Email"
          value={form.email}
          onChangeText={(valore) => cambiaCampo('email', valore)}
          placeholder="mario@esempio.it"
          keyboardType="email-address"
          maxLength={LIMITE_EMAIL}
          error={fieldErrors.email ?? null}
        />
        <AppInput
          label="Password"
          value={form.password}
          onChangeText={(valore) => cambiaCampo('password', valore)}
          placeholder={`almeno ${MIN_PASSWORD_LENGTH} caratteri`}
          secureTextEntry
          error={fieldErrors.password ?? null}
        />
        <ListSelector
          label="Regione"
          placeholder="Scegli la regione"
          valore={form.regione}
          opzioni={REGIONI.map((r) => r.nome)}
          onChange={cambiaRegione}
          errore={fieldErrors.regione ?? null}
        />
        <ListSelector
          label="Provincia"
          placeholder={form.regione ? 'Scegli la provincia' : 'Scegli prima la regione'}
          valore={form.provincia}
          opzioni={provincePerRegione(form.regione)}
          onChange={(valore) => cambiaCampo('provincia', valore)}
          disabled={!form.regione}
          errore={fieldErrors.provincia ?? null}
        />
        <AppText variant="small" tone="secondary">
          La vedono le persone che ti contattano.
        </AppText>
      </Card>

      {categoriePronte ? null : (
        <Card>
          <AppText variant="small" tone="secondary">
            {messaggioCategorie(statoCategorie, erroreCategorie)}
          </AppText>
          {statoCategorie === 'caricamento' ? null : (
            <AppButton label="Riprova" variant="secondary" onPress={riprovaCategorie} />
          )}
        </Card>
      )}

      {SEZIONI.map((sezione) => (
        <EntriesSection
          key={sezione.chiave}
          sezione={sezione}
          voci={sezione.chiave === 'offerte' ? offerte : ricerche}
          categorie={categorie}
          statoCategorie={statoCategorie}
          fieldErrors={fieldErrors}
          onCambia={(indice, campo, valore) => cambiaVoce(sezione.chiave, indice, campo, valore)}
          onAggiungi={() => aggiungiAllaSezione(sezione.chiave)}
          onRimuovi={(indice) => rimuoviDallaSezione(sezione.chiave, indice)}
          allowEmpty
        />
      ))}

      {/* L'errore del backend sta qui, subito sopra il pulsante: in un form lungo
          lo sguardo è in fondo, e un banner in cima sarebbe fuori schermo. */}
      {error ? <Banner kind="error" message={error} /> : null}

      <View style={{ gap: space.md }}>
        <AppButton
          label="Crea account"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!puoInviare}
        />
        {puoInviare ? null : (
          <AppText variant="small" tone="secondary">
            {categoriePronte
              ? "Per attivare il pulsante completa i dati obbligatori e aggiungi almeno una voce per sezione."
              : "Aspetto le categorie dal servizio: senza non posso creare l'account."}
          </AppText>
        )}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.xs }}>
        <AppText variant="small" tone="secondary">
          Hai già un account?
        </AppText>
        <TextLink href="/login">Accedi</TextLink>
      </View>
    </AuthShell>
  );
}
