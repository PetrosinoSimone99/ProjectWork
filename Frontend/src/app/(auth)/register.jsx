import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { AVVISO_DEMO, USA_DATI_FINTI } from '@/api/config';
import { ottieniCategorie } from '@/api/barattolo';
import {
  LIMITE_VOCI,
  TIPI_VOCE,
  aPayloadApi,
  aggiungiVoce,
  aggiornaVoce,
  nuovaVoce,
  rimuoviVoce,
  senzaChiave,
  senzaPrefisso,
  validaVoce,
} from '@/servizi/offerta-ricerca';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { SezioneVociServizio } from '@/components/SezioneVociServizio';
import { space } from '@/theme/tokens';

/**
 * Crea il profilo: dati anagrafici, cosa si offre e cosa si cerca.
 *
 * Le voci di offerta e ricerca sono la versione strutturata del vecchio «servizio
 * che offri»: categoria (da una lista che arriva dal backend), mansione in testo
 * libero e casella «da remoto». La località invece è della **persona**, non della
 * voce: serve a sapere dove sta chi si contatta.
 *
 * Le regole delle voci stanno in `src/servizi/offerta-ricerca.js`; qui restano
 * solo le regole anagrafiche, la chiamata e i messaggi da disegnare.
 */

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD_LENGTH = 8;

const FORM_VUOTO = {
  nome: '',
  cognome: '',
  username: '',
  email: '',
  password: '',
  localita: '',
};

/** Le due sezioni ripetibili, con i testi che le distinguono. */
const SEZIONI = [
  {
    chiave: 'offerte',
    tipo: TIPI_VOCE.OFFERTA,
    titolo: 'Cosa offri',
    introduzione:
      'Scegli la categoria: è quella che permette di trovarti. Poi spiega in due righe cosa fai.',
    etichettaAggiungi: "Aggiungi un'altra offerta",
    testoLimite: `Hai raggiunto il massimo di ${LIMITE_VOCI} offerte.`,
    motivoObbligo: "Serve almeno un'offerta: senza, non entri nel match.",
  },
  {
    chiave: 'ricerche',
    tipo: TIPI_VOCE.RICERCA,
    titolo: 'Cosa cerchi',
    introduzione:
      'Scegli la categoria di quello che ti serve e racconta in due righe cosa devi risolvere.',
    etichettaAggiungi: "Aggiungi un'altra ricerca",
    testoLimite: `Hai raggiunto il massimo di ${LIMITE_VOCI} ricerche.`,
    motivoObbligo: 'Serve almeno una ricerca: senza, non entri nel match.',
  },
];

/** Errori dei campi anagrafici: oggetto vuoto = form valido. */
function validaAnagrafica(form) {
  const errori = {};
  if (!form.nome.trim()) {
    errori.nome = 'Il nome è obbligatorio.';
  }
  if (!form.cognome.trim()) {
    errori.cognome = 'Il cognome è obbligatorio.';
  }
  if (!form.username.trim()) {
    errori.username = "L'username è obbligatorio.";
  }
  if (!EMAIL_PATTERN.test(form.email.trim())) {
    errori.email = 'Email non valida.';
  }
  if (form.password.length < MIN_PASSWORD_LENGTH) {
    errori.password = `Almeno ${MIN_PASSWORD_LENGTH} caratteri.`;
  }
  if (!form.localita.trim()) {
    errori.localita = 'Indica dove ti trovi.';
  }
  return errori;
}

/**
 * Errori delle voci, con la chiave che indica la riga (`offerte.0.mansione`):
 * così un errore sulla voce 2 non blocca la voce 1 e il messaggio finisce sotto
 * il campo giusto.
 */
function validaSezione(chiave, voci, categorie) {
  return voci.reduce((errori, voce, indice) => {
    const esito = validaVoce(voce, categorie);
    Object.entries(esito).forEach(([campo, messaggio]) => {
      errori[`${chiave}.${indice}.${campo}`] = messaggio;
    });
    return errori;
  }, {});
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
      // In registrazione non c'è ancora una sessione: il token è null e
      // l'endpoint dovrà essere pubblico.
      // TODO(backend): confermare che categorie.php non richiede autenticazione.
      const elenco = await ottieniCategorie(token);
      setCategorie(elenco);
      setStatoCategorie(elenco.length > 0 ? 'pronto' : 'vuoto');
      setErroreCategorie(null);
    } catch (err) {
      setCategorie([]);
      setStatoCategorie('errore');
      setErroreCategorie(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
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
    setVoci((correnti) => (correnti.length >= LIMITE_VOCI ? correnti : aggiungiVoce(correnti)));
  }

  function rimuoviDallaSezione(chiave, indice) {
    const setVoci = chiave === 'offerte' ? setOfferte : setRicerche;
    setVoci((correnti) =>
      correnti.length <= 1 ? correnti : rimuoviVoce(correnti, correnti[indice].chiave),
    );
    // Gli indici delle voci successive si spostano: gli errori di quella sezione
    // si azzerano e la validazione li rimette al posto giusto al prossimo invio.
    setFieldErrors((correnti) => senzaPrefisso(correnti, `${chiave}.`));
  }

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
    setSubmitting(true);
    try {
      await signUp({
        nome: form.nome.trim(),
        cognome: form.cognome.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        // TODO(backend): register.php non conosce ancora localita, offerte e
        // ricerche; con i finti spenti risponde 400 (Parte 19 delle segnalazioni).
        localita: form.localita.trim(),
        offerte: aPayloadApi(offerte),
        ricerche: aPayloadApi(ricerche),
      });
      // A registrazione riuscita la root navigation passa da sola ai tab.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll withBottomInset>
      <View style={{ gap: space.xs }}>
        <AppText variant="title">Crea il tuo profilo</AppText>
        <AppText variant="small" tone="secondary">
          Bastano pochi dati per iniziare a scambiare servizi.
        </AppText>
      </View>

      {USA_DATI_FINTI ? (
        <Banner kind="info" message={AVVISO_DEMO} />
      ) : null}

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
          error={fieldErrors.username ?? null}
        />
        <AppInput
          label="Email"
          value={form.email}
          onChangeText={(valore) => cambiaCampo('email', valore)}
          placeholder="mario@esempio.it"
          keyboardType="email-address"
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
        <AppInput
          label="Località"
          value={form.localita}
          onChangeText={(valore) => cambiaCampo('localita', valore)}
          placeholder="Firenze"
          autoCapitalize="words"
          optionalHint="dove ti trovi"
          error={fieldErrors.localita ?? null}
        />
        <AppText variant="small" tone="secondary">
          Serve a far capire dove ti trovi: lo vedono le persone che ti contattano.
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
        <SezioneVociServizio
          key={sezione.chiave}
          sezione={sezione}
          voci={sezione.chiave === 'offerte' ? offerte : ricerche}
          categorie={categorie}
          statoCategorie={statoCategorie}
          fieldErrors={fieldErrors}
          onCambia={(indice, campo, valore) => cambiaVoce(sezione.chiave, indice, campo, valore)}
          onAggiungi={() => aggiungiAllaSezione(sezione.chiave)}
          onRimuovi={(indice) => rimuoviDallaSezione(sezione.chiave, indice)}
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
          disabled={!categoriePronte}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <AppText variant="small" tone="secondary">
          Hai già un account?
        </AppText>
        <Link href="/login" asChild>
          <AppText variant="small" tone="primary" style={{ fontWeight: '700' }}>
            Accedi
          </AppText>
        </Link>
      </View>
    </Screen>
  );
}
