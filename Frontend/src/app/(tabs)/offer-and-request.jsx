import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { createService, getCategories, listMyServices, updateService } from '@/api';
import {
  TIPI_VOCE,
  aggiornaVoce,
  localitaDaVoce,
  nuovaVoce,
  senzaChiave,
  validaVoce,
} from '@/services/offer-request';
import { analizzaLocalita } from '@/services/italian-locations';
import { useRefresh } from '@/hooks/useRefresh';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { ConfirmModal } from '@/components/ConfirmModal';
import { PublicationsSection, SEZIONI_PUBBLICAZIONI } from '@/components/PublicationsSection';
import { space, useTokens } from '@/theme/tokens';

/**
 * Offro e cerco: le proprie offerte e ricerche.
 *
 * Ogni account ha **un'offerta e una ricerca**, entrambe obbligatorie: non si
 * sospendono, non si eliminano e non si ripristinano — si modificano. Per
 * questo ogni voce ha un solo comando («Modifica»), e «Aggiungi» compare solo
 * nel caso limite in cui quella voce manchi del tutto (per esempio dopo un
 * errore del server in registrazione): la norma è che ci siano entrambe.
 *
 * Le voci hanno la **stessa forma della registrazione** (categoria + mansione +
 * «da remoto»), più la località dell'annuncio; la forma del dato e le sue regole
 * vivono in `src/services/offer-request.js` e non si ridichiarano qui. Il form
 * di pubblicazione è uno solo (`EntryForm`) e serve creazione e modifica.
 *
 * Il backend fa creazione, elenco e modifica (`POST /api/services`,
 * `GET /api/offers/mine` + `GET /api/requests/mine`, `PATCH` su
 * `/api/offers/{id}` e `/api/requests/{id}`): l'elenco mostrato è sempre quello
 * del layer. Dopo ogni scrittura riuscita si richiama `carica()`, così «ho
 * salvato e non lo vedo» non esiste per costruzione.
 */

/** La spiegazione sotto il titolo: elenco e correzione, senza stato né cestino. */
const INTRODUZIONE =
  'Le tue offerte e le tue ricerche: una per tipo, sempre presenti. Qui le correggi quando cambiano.';

/** Il testo del Banner di esito, con la parola giusta per il tipo di voce. */
function testoEsito(azione, tipo) {
  const nome = tipo === TIPI_VOCE.OFFERTA ? 'Offerta' : 'Ricerca';
  switch (azione) {
    case 'creata':
      return `${nome} pubblicata.`;
    case 'aggiornata':
      return 'Modifica salvata.';
    default:
      return '';
  }
}

/** Il messaggio della Card quando le categorie non sono utilizzabili. */
function messaggioCategorie(stato, dettaglio) {
  if (stato === 'caricamento') {
    return 'Sto caricando le categorie: servono per pubblicare e per modificare.';
  }
  if (stato === 'vuoto') {
    return 'Non ci sono categorie disponibili.';
  }
  return `Non riesco a caricare le categorie: senza, non posso farti pubblicare né modificare.${
    dettaglio ? ` ${dettaglio}` : ''
  }`;
}

export default function OfferAndRequestScreen() {
  const { token, utente } = useAuth();
  const t = useTokens();

  // The list comes from the API layer (`listMyServices`), which joins the two
  // real routes; the screen only knows this list and its states.
  const [pubblicazioni, setPubblicazioni] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erroreElenco, setErroreElenco] = useState(null);

  const [categorie, setCategorie] = useState([]);
  const [statoCategorie, setStatoCategorie] = useState('caricamento');
  const [erroreCategorie, setErroreCategorie] = useState(null);

  const [form, setForm] = useState(null);
  // L'apertura in attesa della conferma: il form aperto ha testo non salvato,
  // quindi sostituirlo richiede il via libera dell'utente (audit UX F03).
  const [sostituzioneForm, setSostituzioneForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [erroreForm, setErroreForm] = useState(null);
  const [salvataggio, setSalvataggio] = useState(false);

  const [esito, setEsito] = useState(null);

  const carica = useCallback(async () => {
    if (!token || !utente) {
      return;
    }
    setLoading(true);
    setErroreElenco(null);
    try {
      setPubblicazioni(await listMyServices(token));
    } catch (err) {
      setErroreElenco(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [token, utente]);

  const caricaCategorie = useCallback(async () => {
    try {
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

  // Si ricarica a ogni ritorno sulla scheda, come le altre schermate-elenco:
  // al ritorno da un'altra parte i dati devono essere quelli veri, non quelli di prima.
  useFocusEffect(
    useCallback(() => {
      void carica();
      void caricaCategorie();
    }, [carica, caricaCategorie]),
  );

  const ricaricaTutto = useCallback(async () => {
    await Promise.all([carica(), caricaCategorie()]);
  }, [carica, caricaCategorie]);

  const { refreshing, onRefresh } = useRefresh(ricaricaTutto);

  const categoriePronte = statoCategorie === 'pronto';
  // Una scrittura alla volta, su tutta la schermata: il form e le card leggono
  // questo unico valore derivato, invece di decidere ognuno per sé quando
  // spegnersi (C3). L'unica scrittura della schermata è il salvataggio del form,
  // perché non ci sono più sospensione, eliminazione né ripristino.
  const scritturaInCorso = salvataggio;
  const lista = pubblicazioni ?? [];
  const offerte = lista.filter((voce) => voce.tipo === TIPI_VOCE.OFFERTA);
  const ricerche = lista.filter((voce) => voce.tipo === TIPI_VOCE.RICERCA);

  /** Riprova delle categorie: si torna allo stato di caricamento e si richiede. */
  function riprovaCategorie() {
    setStatoCategorie('caricamento');
    setErroreCategorie(null);
    void caricaCategorie();
  }

  /**
   * Il form da aprire: una voce nuova nasce vuota, la modifica parte da quella
   * salvata. In entrambi i casi la copia è una copia: «Annulla» (e la
   * sostituzione confermata) scarta senza lasciare modifiche a metà.
   */
  function costruisciForm(apertura) {
    const voce = apertura.voce ?? nuovaVoce(apertura.tipo);
    // La località di una voce nuova nasce da quella della persona, se la
    // sessione la conosce; in modifica si rilegge dalla voce salvata. Si legge
    // la coppia provincia/comune dal valore formattato e si precompilano le due
    // tendine: un valore legacy non conforme lascia le tendine vuote.
    const coppia = analizzaLocalita(apertura.voce ? apertura.voce.localita : utente?.localita);
    const voceAperta = {
      ...voce,
      provincia: coppia?.provincia ?? '',
      comune: coppia?.comune ?? '',
    };
    // La copia iniziale serve a capire se il form è stato toccato: il confronto
    // è sul contenuto, così la sostituzione si chiede solo quando c'è qualcosa
    // da perdere.
    return { tipo: apertura.tipo, voce: voceAperta, iniziale: JSON.stringify(voceAperta) };
  }

  /** Apre il form richiesto e azzera tutto ciò che un nuovo form azzerava. */
  function apriForm(apertura) {
    setEsito(null);
    setErroreForm(null);
    setFieldErrors({});
    setForm(costruisciForm(apertura));
  }

  /** `true` se nel form aperto c'è contenuto diverso da quando è stato aperto. */
  function formModificato() {
    return form !== null && JSON.stringify(form.voce) !== form.iniziale;
  }

  /**
   * Sostituire un form con del testo non salvato lo perderebbe in silenzio:
   * prima si chiede conferma, poi si apre l'altro (audit UX F03). Un form non
   * toccato si sostituisce subito, come prima.
   */
  function richiediApertura(apertura) {
    if (formModificato()) {
      setSostituzioneForm(apertura);
      return;
    }
    apriForm(apertura);
  }

  function apriNuova(tipo) {
    richiediApertura({ tipo });
  }

  function apriModifica(voce) {
    richiediApertura({ tipo: voce.tipo, voce });
  }

  /** Conferma della sostituzione: il testo scritto si scarta e si apre l'altro. */
  function confermaSostituzione() {
    const apertura = sostituzioneForm;
    setSostituzioneForm(null);
    if (apertura) {
      apriForm(apertura);
    }
  }

  function cambiaCampoForm(campo, valore) {
    setForm((corrente) => {
      if (!corrente) {
        return corrente;
      }
      const voce = aggiornaVoce(corrente.voce, campo, valore);
      // `localita` è derivata da provincia/comune — il payload la ricalcola
      // comunque (`entryLocation`) — e lasciarla al valore di apertura era un
      // dato stantio in attesa di un lettore (D7). Ora segue la coppia.
      return { ...corrente, voce: { ...voce, localita: localitaDaVoce(voce) } };
    });
    // L'errore del campo sparisce appena lo si corregge: resterebbe rosso
    // proprio mentre l'utente sta sistemando il dato. La località ha due campi
    // per un solo errore (`validaVoce` lo scrive sotto `localita`), quindi
    // correggere la coppia deve cancellare anche quello.
    setFieldErrors((correnti) => {
      const senzaCampo = senzaChiave(correnti, campo);
      return campo === 'provincia' || campo === 'comune'
        ? senzaChiave(senzaCampo, 'localita')
        : senzaCampo;
    });
  }

  function annullaForm() {
    setForm(null);
    setFieldErrors({});
    setErroreForm(null);
  }

  async function salva() {
    // Il pulsante è già spento durante una scrittura: questa guardia tiene
    // l'invariante nel punto in cui la richiesta parte davvero.
    if (!form || !token || !utente || scritturaInCorso) {
      return;
    }
    const errori = validaVoce(form.voce, categorie);
    setFieldErrors(errori);
    if (Object.keys(errori).length > 0) {
      return;
    }

    setErroreForm(null);
    setSalvataggio(true);
    const inModifica = Number.isInteger(form.voce.id);
    // Il tipo lo si cattura prima dell'attesa: il form sparisce al successo e
    // il testo dell'esito va costruito con il valore che c'era al submit.
    const tipo = form.tipo;
    try {
      if (inModifica) {
        await updateService(token, form.voce);
      } else {
        await createService(token, form.voce);
      }
      // La conferma di una nuova voce è piena e si rilegge la lista «senza
      // ricaricare la pagina».
      setEsito(testoEsito(inModifica ? 'aggiornata' : 'creata', tipo));
      setForm(null);
      setFieldErrors({});
      await carica();
    } catch (err) {
      // Il form non si svuota: i dati digitati restano.
      setErroreForm(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setSalvataggio(false);
    }
  }

  // Spinner a schermo pieno solo al primo caricamento: i ricarichi successivi
  // (focus della scheda, pull-to-refresh) lasciano il contenuto a schermo.
  if (loading && pubblicazioni === null) {
    return <LoadingScreen label="Carico le tue pubblicazioni…" />;
  }

  const ricaricoInCorso = loading && pubblicazioni !== null;

  return (
    <Screen scroll withBottomInset={false} refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader titolo="Offro e cerco" frase={INTRODUZIONE} />

      {esito ? (
        <Banner
          kind="success"
          message={esito}
          // Il successo si chiude: resta finché non arriva la prossima scrittura
          // altrimenti è arredamento, non una notizia (audit F46). Il pulsante
          // non fa altro che chiudere, quindi si chiama «Chiudi».
          etichettaAzione="Chiudi"
          iconaAzione="checkmark-outline"
          onAzione={() => setEsito(null)}
        />
      ) : null}

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

      {erroreElenco ? (
        <Banner
          kind="error"
          message={erroreElenco}
          etichettaAzione="Riprova"
          iconaAzione="refresh-outline"
          onAzione={() => void carica()}
          caricamentoAzione={loading}
        />
      ) : null}

      {SEZIONI_PUBBLICAZIONI.map((sezione) => (
        <PublicationsSection
          key={sezione.chiave}
          sezione={sezione}
          voci={sezione.tipo === TIPI_VOCE.OFFERTA ? offerte : ricerche}
          categorie={categorie}
          statoCategorie={statoCategorie}
          // Con l'elenco non caricato lo stato vuoto direbbe "non hai
          // pubblicato niente": la sezione deve saperlo (audit F56).
          errore={erroreElenco}
          form={form}
          fieldErrors={fieldErrors}
          erroreForm={erroreForm}
          categoriePronte={categoriePronte}
          salvataggio={salvataggio}
          scritturaInCorso={scritturaInCorso}
          onApriNuova={() => apriNuova(sezione.tipo)}
          onCambiaCampo={cambiaCampoForm}
          onSalva={salva}
          onAnnullaForm={annullaForm}
          onModifica={apriModifica}
        />
      ))}

      {ricaricoInCorso ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm }}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : null}

      {/* Sostituire un form con del testo non salvato si chiede prima: il testo
          digitato non si perde mai in silenzio (audit UX F03). */}
      <ConfirmModal
        visible={sostituzioneForm !== null}
        titolo="Cambiare il form di pubblicazione?"
        messaggio="Hai scritto qualcosa che non è ancora salvato: aprendone un altro, quel testo viene perso."
        etichettaConferma="Cambia e scarta"
        etichettaAnnulla="Continua a scrivere"
        onConferma={confermaSostituzione}
        onAnnulla={() => setSostituzioneForm(null)}
      />
    </Screen>
  );
}
