import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { esitoRifiutoRegistrazione } from '@/api/field-errors';
import { getCategories } from '@/api';
import {
  TIPI_VOCE,
  aggiornaVoce,
  nuovaVoce,
  senzaChiave,
  validaVociRegistrazione,
} from '@/services/offer-request';
import {
  MIN_PASSWORD_LENGTH,
  emailError,
  maxLengthError,
  passwordError,
  requiredError,
} from '@/validation';
import { AuthShell } from '@/components/AuthShell';
import { PageHeader } from '@/components/PageHeader';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { EntriesSection } from '@/components/EntriesSection';
import { ListSelector } from '@/components/ListSelector';
import { TextLink } from '@/components/TextLink';
import { PROVINCE, comuniPerProvincia, formattaLocalita } from '@/services/italian-locations';
import { space } from '@/theme/tokens';

/**
 * Registrati: dati anagrafici, cosa si offre e cosa si cerca.
 *
 * Le voci di offerta e ricerca sono la versione strutturata del vecchio «servizio
 * che offri»: categoria (da una lista che arriva dal backend), mansione in testo
 * libero e casella «da remoto». La località invece è della **persona**, non della
 * voce: si sceglie la provincia e poi il comune, e i due si salvano in un'unica
 * stringa `Comune - Provincia` nel campo `location` del backend (`users.location`
 * è `varchar(255)` e non ha campi separati).
 *
 * Le regole delle voci stanno in `src/services/offer-request.js`; qui restano
 * solo le regole anagrafiche, la chiamata e i messaggi da disegnare.
 *
 * **Un'offerta e una ricerca sono obbligatorie** (`validaVociRegistrazione`):
 * ogni account deve poter entrare nel match dal primo istante, e le due voci si
 * potranno poi solo modificare da «Offro e cerco». Una sezione vuota non è più
 * una sezione da saltare.
 */

/**
 * Limiti anagrafici: **copia dichiarata** del backend Symfony, `AuthController::validateRegistration()`
 * (`mb_strlen` sul valore trimmato). Restano qui perché servono a fermare il
 * modulo prima dell'invio, non a sostituire il server: il server li controlla
 * comunque, e quando li rifiuta li nomina (`fields`, contratto in `docs/api.md`,
 * D037) — la copia può invecchiare, la risposta no.
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
  provincia: '',
  comune: '',
};

/** Le due sezioni ripetibili, con i testi che le distinguono. */
const SEZIONI = [
  {
    chiave: 'offerte',
    tipo: TIPI_VOCE.OFFERTA,
    titolo: 'Cosa offri',
    introduzione:
      'Scegli la categoria e spiega in due righe cosa fai. La tua offerta è obbligatoria: potrai modificarla quando vuoi.',
    etichettaAggiungi: "Aggiungi un'offerta",
  },
  {
    chiave: 'ricerche',
    tipo: TIPI_VOCE.RICERCA,
    titolo: 'Cosa cerchi',
    introduzione:
      'Scegli la categoria di quello che ti serve e racconta in due righe cosa devi risolvere. Anche la tua ricerca è obbligatoria.',
    etichettaAggiungi: 'Aggiungi una ricerca',
  },
];

/**
 * Account fields, validated with the shared rules of `src/validation/`.
 * Località is mandatory (`AuthController` rejects an empty `location`) and is
 * chosen as province + comune: the first missing value gives one error, not two.
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
  if (!form.provincia) {
    errori.provincia = 'Seleziona la provincia.';
  } else if (!form.comune) {
    errori.comune = 'Seleziona il comune.';
  }
  return errori;
}

/** An entry the user has not filled at all: it never reaches the payload. */
function isBlankEntry(entry) {
  const description = typeof entry?.mansione === 'string' ? entry.mansione.trim() : '';
  return description === '' && (entry?.idCategoria === null || entry?.idCategoria === undefined);
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
    return 'Sto caricando le categorie: senza, non posso creare l’account, perché un’offerta e una ricerca sono obbligatorie.';
  }
  if (stato === 'vuoto') {
    return 'Non ci sono categorie disponibili: senza, non posso creare l’account.';
  }
  return `Non riesco a caricare le categorie: senza, non posso creare l’account.${
    dettaglio ? ` ${dettaglio}` : ''
  }`;
}

export default function RegisterScreen() {
  const { signUp, token } = useAuth();
  const router = useRouter();
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
   * Al cambio di provincia il comune scelto prima non vale più: si azzera
   * (copia, mai mutazione) e si tolgono gli errori di entrambi i campi.
   */
  function cambiaProvincia(valore) {
    setForm((correnti) => ({ ...correnti, provincia: valore, comune: '' }));
    setFieldErrors((correnti) => senzaChiave(senzaChiave(correnti, 'provincia'), 'comune'));
  }

  function cambiaVoce(chiave, indice, campo, valore) {
    const setVoci = chiave === 'offerte' ? setOfferte : setRicerche;
    setVoci((correnti) =>
      correnti.map((voce, posizione) =>
        posizione === indice ? aggiornaVoce(voce, campo, valore) : voce,
      ),
    );
    // Il rifiuto del server su una voce parla della voce intera (`offers`,
    // `requests`) e il modulo lo disegna sulla descrizione: il primo carattere
    // digitato in qualunque campo della riga lo toglie, altrimenti il rosso
    // resterebbe mentre l'utente sta già correggendo.
    setFieldErrors((correnti) =>
      senzaChiave(
        senzaChiave(correnti, `${chiave}.${indice}.${campo}`),
        `${chiave}.${indice}.mansione`,
      ),
    );
  }

  // Le stesse regole del submit, applicate prima: un pulsante attivo su un
  // modulo che non può passare sposta la scoperta dell'errore al tocco (F07).
  const anagraficaValida = Object.keys(validaAnagrafica(form)).length === 0;
  const vociValide =
    Object.keys(validaVociRegistrazione({ offerte, ricerche }, categorie)).length === 0;
  const puoInviare = anagraficaValida && vociValide;

  function validate() {
    const errori = {
      ...validaAnagrafica(form),
      ...validaVociRegistrazione({ offerte, ricerche }, categorie),
    };
    setFieldErrors(errori);
    return Object.keys(errori).length === 0;
  }

  async function handleSubmit() {
    // Invio da un campo può arrivare due volte (tasto tenuto premuto, focus
    // rimesso a mano): la registrazione è già partita, non se ne manda una
    // seconda che finirebbe in 409 su un account appena creato.
    if (submitting) {
      return;
    }
    setError(null);
    if (!validate()) {
      return;
    }
    // Le voci si scelgono dalle categorie del backend: senza, il modulo non è
    // compilabile e l'errore giusto è quello delle categorie, non quello delle
    // voci mancanti (il pulsante lo dice già, l'Invio no).

    // The backend requires exactly one offer and one request
    // (`AuthController::validateServices`) and the product rule says the same:
    // an account without them could not enter the match. `validaVociRegistrazione`
    // has already refused the empty or half-filled sections, so this is the
    // payload of two complete entries.
    const offersEntries = toServiceEntries(offerte);
    const requestEntries = toServiceEntries(ricerche);

    setSubmitting(true);
    try {
      await signUp({
        name: form.nome.trim(),
        surname: form.cognome.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        location: formattaLocalita(form.comune, form.provincia),
        offers: offersEntries,
        requests: requestEntries,
      });
      // A registrazione riuscita si va alla home, e la navigazione ha **un solo**
      // proprietario: questa riga. Non basta contare sullo `Stack` radice che
      // scambia (auth) con (tabs): da nativo quel cambio porta con sé la
      // schermata, sul web l'URL resta `/register` e chi si è appena registrato
      // resta sul modulo — con il menu della home disegnato sopra, perché la
      // sessione esiste già (segnalato il 2026-11-16). Stessa regola e stessa
      // ragione documentate nel login (`login.jsx`).
      router.replace('/');
    } catch (err) {
      // Il server nomina i campi che ha rifiutato (`fields`): quelli vanno sotto
      // il loro campo, e la frase in fondo resta solo per ciò che non ha un
      // campo — un errore di rete, oppure un nome che non conosciamo. Il 409 non
      // nomina niente, ed è voluto: dire quale fra username ed email è occupato
      // permetterebbe di scoprire quali account esistono (D037).
      const messaggio = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      const esito = esitoRifiutoRegistrazione(
        err instanceof ApiError ? err.details : null,
        messaggio,
      );
      if (Object.keys(esito.errori).length > 0) {
        setFieldErrors(esito.errori);
      }
      setError(esito.messaggio);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <PageHeader
        titolo="Registrati"
        frase="I tuoi dati, la tua offerta e la tua ricerca: con queste entri nel match."
        // Le schermate di accesso sono centrate nella finestra: una testata al
        // telaio sarebbe una seconda composizione nella stessa pagina (F14).
        banda={false}
      />

      <Card>
        <AppText variant="heading">I tuoi dati</AppText>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            {/* Invio invia da qualunque campo, come nel login: la validazione mette il primo errore sotto il suo campo, quindi un Invio precoce spiega invece di rompere. */}
            <AppInput
              label="Nome"
              value={form.nome}
              onChangeText={(valore) => cambiaCampo('nome', valore)}
              placeholder="Mario"
              autoCapitalize="words"
              maxLength={LIMITE_NOME}
              error={fieldErrors.nome ?? null}
              onSubmitEditing={() => void handleSubmit()}
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
              onSubmitEditing={() => void handleSubmit()}
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
          onSubmitEditing={() => void handleSubmit()}
        />
        <AppInput
          label="Email"
          value={form.email}
          onChangeText={(valore) => cambiaCampo('email', valore)}
          placeholder="mario@esempio.it"
          keyboardType="email-address"
          maxLength={LIMITE_EMAIL}
          error={fieldErrors.email ?? null}
          onSubmitEditing={() => void handleSubmit()}
        />
        <AppInput
          label="Password"
          value={form.password}
          onChangeText={(valore) => cambiaCampo('password', valore)}
          placeholder={`almeno ${MIN_PASSWORD_LENGTH} caratteri`}
          secureTextEntry
          error={fieldErrors.password ?? null}
          onSubmitEditing={() => void handleSubmit()}
        />
        <ListSelector
          label="Provincia"
          placeholder="Scegli la provincia"
          valore={form.provincia}
          opzioni={PROVINCE}
          onChange={cambiaProvincia}
          errore={fieldErrors.provincia ?? null}
        />
        <ListSelector
          label="Comune"
          placeholder={form.provincia ? 'Scegli il comune' : 'Scegli prima la provincia'}
          valore={form.comune}
          opzioni={comuniPerProvincia(form.provincia)}
          onChange={(valore) => cambiaCampo('comune', valore)}
          disabled={!form.provincia}
          errore={fieldErrors.comune ?? null}
        />
        <AppText variant="small" tone="secondary">
          La località la vedono le persone che ti contattano.
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
        />
      ))}

      {/* L'errore del backend sta qui, subito sopra il pulsante: in un form lungo
          lo sguardo è in fondo, e un banner in cima sarebbe fuori schermo. */}
      {error ? <Banner kind="error" message={error} /> : null}

      <View style={{ gap: space.md }}>
        <AppButton
          label="Registrati"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!puoInviare}
        />
        {puoInviare ? null : (
          <AppText variant="small" tone="secondary">
            {categoriePronte
              ? 'Per attivare il pulsante completa i dati obbligatori, comprese la tua offerta e la tua ricerca.'
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
