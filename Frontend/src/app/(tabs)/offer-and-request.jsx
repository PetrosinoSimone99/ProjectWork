import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import {
  createService,
  deleteService,
  getCategories,
  listDeletedServices,
  listMyServices,
  restoreService,
  setServiceSuspended,
  updateService,
} from '@/api';
import {
  STATI_PUBBLICAZIONE,
  TIPI_VOCE,
  aggiornaVoce,
  nuovaVoce,
  senzaChiave,
  validaVoce,
} from '@/services/offer-request';
import { analizzaLocalita } from '@/services/italian-regions';
import { useRefresh } from '@/hooks/useRefresh';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ConfirmModal } from '@/components/ConfirmModal';
import { PublicationsSection, SEZIONI_PUBBLICAZIONI } from '@/components/PublicationsSection';
import { DeletedServicesSection } from '@/components/DeletedServicesSection';
import { space, useTokens } from '@/theme/tokens';

/**
 * Offro e cerco: pubblica le proprie offerte e ricerche.
 *
 * Le voci hanno la **stessa forma della registrazione** (categoria + mansione +
 * «da remoto»), più la località dell'annuncio; la forma del dato e le sue regole
 * vivono in `src/services/offer-request.js` e non si ridichiarano qui. Il form
 * di pubblicazione è uno solo (`EntryForm`) e serve creazione e modifica.
 *
 * Il backend fa **creazione e elenco** delle proprie voci (`POST /api/services`,
 * `GET /api/offers/mine` + `GET /api/requests/mine`): l'elenco mostrato è
 * sempre quello del layer, vero o finto. Quindi:
 *
 * - con i finti spenti la creazione è reale e l'elenco si rilegge dopo ogni
 *   scrittura: la voce appena pubblicata compare subito;
 * - con i finti accesi il comportamento demo resta quello di prima: elenco,
 *   modifica, stato ed eliminazione passano dal deposito finto.
 *
 * Anche la **modifica**, l'**eliminazione** e il **cambio di stato**
 * (pubblica/sospesa) sono reali (PATCH/DELETE su `/api/offers/{id}` e
 * `/api/requests/{id}`; lo stato passa da `isSuspended`, PR #34): tutte le
 * azioni delle card funzionano allo stesso modo con i finti e senza.
 *
 * Con i finti accesi l'elenco non ha una copia locale come verità: dopo ogni
 * scrittura riuscita si richiama `carica()`, così «ho pubblicato e non lo vedo»
 * non esiste per costruzione.
 */

/** La spiegazione sotto il titolo: elenco, correzione, eliminazione e stato. */
const INTRODUZIONE =
  'Le tue offerte e le tue ricerche: qui le pubblichi, le correggi e decidi quando non sono più visibili.';

/** Il testo del Banner di esito, con la parola giusta per il tipo di voce. */
function testoEsito(azione, tipo) {
  const nome = tipo === TIPI_VOCE.OFFERTA ? 'Offerta' : 'Ricerca';
  switch (azione) {
    case 'creata':
      return `${nome} pubblicata.`;
    case 'aggiornata':
      return 'Modifica salvata.';
    case 'sospesa':
      return `${nome} sospesa: non è più visibile agli altri.`;
    case 'ripubblicata':
      return `${nome} di nuovo pubblicata.`;
    case 'eliminata':
      return `${nome} eliminata.`;
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

/** Il testo della conferma di eliminazione, con l'avviso quando è l'ultima voce. */
function messaggioEliminazione(voce, ultimaDelTipo) {
  if (!voce) {
    return '';
  }
  const avviso = ultimaDelTipo
    ? voce.tipo === TIPI_VOCE.OFFERTA
      ? ' Senza offerte non entri nel match: potrai pubblicarne una nuova quando vuoi.'
      : ' Senza ricerche non entri nel match: potrai pubblicarne una nuova quando vuoi.'
    : '';
  return `${voce.mansione.trim() || 'Questa voce'} sparisce dall'elenco: la trovi in «Eliminati» e puoi ripristinarla. Gli accordi già avviati non cambiano.${avviso}`;
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

  const [azioneInCorso, setAzioneInCorso] = useState(null);
  const [eliminazione, setEliminazione] = useState(null);
  const [esito, setEsito] = useState(null);

  // The "Eliminati" section has its own request and its own states: a failure
  // there must not make the active list look broken.
  const [eliminate, setEliminate] = useState(null);
  const [caricamentoEliminate, setCaricamentoEliminate] = useState(false);
  const [erroreEliminate, setErroreEliminate] = useState(null);
  const [ripristinoInCorso, setRipristinoInCorso] = useState(null);

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

  const caricaEliminate = useCallback(async () => {
    if (!token || !utente) {
      return;
    }
    setCaricamentoEliminate(true);
    setErroreEliminate(null);
    try {
      setEliminate(await listDeletedServices(token));
    } catch (err) {
      setErroreEliminate(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setCaricamentoEliminate(false);
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
      void caricaEliminate();
      void caricaCategorie();
    }, [carica, caricaEliminate, caricaCategorie]),
  );

  const ricaricaTutto = useCallback(async () => {
    await Promise.all([carica(), caricaEliminate(), caricaCategorie()]);
  }, [carica, caricaEliminate, caricaCategorie]);

  const { refreshing, onRefresh } = useRefresh(ricaricaTutto);

  const categoriePronte = statoCategorie === 'pronto';
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
    // la coppia provincia/regione dal valore formattato e si precompilano le due
    // tendine: un valore legacy non conforme lascia le tendine vuote.
    const coppia = analizzaLocalita(apertura.voce ? apertura.voce.localita : utente?.localita);
    const voceAperta = {
      ...voce,
      regione: coppia?.regione ?? '',
      provincia: coppia?.provincia ?? '',
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
    setForm((corrente) =>
      corrente ? { ...corrente, voce: aggiornaVoce(corrente.voce, campo, valore) } : corrente,
    );
    // L'errore del campo sparisce appena lo si corregge: resterebbe rosso
    // proprio mentre l'utente sta sistemando il dato.
    setFieldErrors((correnti) => senzaChiave(correnti, campo));
  }

  function annullaForm() {
    setForm(null);
    setFieldErrors({});
    setErroreForm(null);
  }

  async function salva() {
    if (!form || !token || !utente) {
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
      // Ora l'elenco esiste sempre (vero o finto): la conferma di una nuova
      // voce è piena e si rilegge la lista «senza ricaricare la pagina».
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

  /** Una scrittura su una voce esistente: azione, esito, poi si rilegge l'elenco. */
  async function eseguiAzione(voce, nome, azione, messaggio) {
    if (!token || !utente) {
      return;
    }
    setEsito(null);
    setErroreElenco(null);
    setAzioneInCorso({ id: voce.id, nome });
    try {
      await azione();
      setEsito(messaggio);
      // A delete moves the row into "Eliminati" and a restore moves it back:
      // both lists are reloaded after every write so neither can go stale.
      await Promise.all([carica(), caricaEliminate()]);
    } catch (err) {
      // Voce sparita (404: eliminata altrove o sessione successiva): l'elenco si
      // rilegge comunque, così non resta in carta una riga morta. Si rilegge
      // prima di mostrare l'errore, perché `carica()` ripulisce il messaggio a
      // inizio lettura; con un 409 la voce c'è ancora, e il reload non serve.
      if (err instanceof ApiError && err.status === 404) {
        await Promise.all([carica(), caricaEliminate()]);
      }
      setErroreElenco(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setAzioneInCorso(null);
    }
  }

  function cambiaStato(voce) {
    const sospesa = voce.stato === STATI_PUBBLICAZIONE.SOSPESA;
    const nuovoStato = sospesa ? STATI_PUBBLICAZIONE.PUBBLICATA : STATI_PUBBLICAZIONE.SOSPESA;
    void eseguiAzione(
      voce,
      'stato',
      () => setServiceSuspended(token, { ...voce, stato: nuovoStato }),
      testoEsito(sospesa ? 'ripubblicata' : 'sospesa', voce.tipo),
    );
  }

  async function confermaEliminazione() {
    const voce = eliminazione;
    if (!voce) {
      return;
    }
    await eseguiAzione(
      voce,
      'elimina',
      () => deleteService(token, voce),
      testoEsito('eliminata', voce.tipo),
    );
    setEliminazione(null);
  }

  /** "Ripristina" of the deleted section: bring it back, then reload both lists. */
  async function ripristina(voce) {
    if (!token || !utente) {
      return;
    }
    setRipristinoInCorso(voce.id);
    setErroreEliminate(null);
    try {
      await restoreService(token, voce);
      setEsito(
        voce.tipo === TIPI_VOCE.OFFERTA ? 'Offerta ripristinata.' : 'Ricerca ripristinata.',
      );
      await Promise.all([carica(), caricaEliminate()]);
    } catch (err) {
      setErroreEliminate(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setRipristinoInCorso(null);
    }
  }

  // Spinner a schermo pieno solo al primo caricamento: i ricarichi successivi
  // (focus della scheda, pull-to-refresh) lasciano il contenuto a schermo.
  if (loading && pubblicazioni === null) {
    return <LoadingScreen label="Carico le tue pubblicazioni…" />;
  }

  const ricaricoInCorso = loading && pubblicazioni !== null;
  const vociEliminazione = !eliminazione
    ? []
    : eliminazione.tipo === TIPI_VOCE.OFFERTA
      ? offerte
      : ricerche;

  return (
    <Screen scroll withBottomInset={false} refreshing={refreshing} onRefresh={onRefresh}>
      <View style={{ gap: space.xs }}>
        <AppText variant="title">Offro e cerco</AppText>
        <AppText variant="small" tone="secondary">{INTRODUZIONE}</AppText>
      </View>

      {esito ? (
        <Banner
          kind="success"
          message={esito}
          // Il successo si chiude: resta finché non arriva la prossima scrittura
          // altrimenti è arredamento, non una notizia (audit F46).
          etichettaAzione="Ho capito"
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
        <>
          <Banner kind="error" message={erroreElenco} />
          <AppButton
            label="Riprova"
            variant="secondary"
            icon="refresh-outline"
            onPress={() => void carica()}
          />
        </>
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
          azioneInCorso={azioneInCorso}
          onApriNuova={() => apriNuova(sezione.tipo)}
          onCambiaCampo={cambiaCampoForm}
          onSalva={salva}
          onAnnullaForm={annullaForm}
          onModifica={apriModifica}
          onCambiaStato={cambiaStato}
          onElimina={setEliminazione}
        />
      ))}

      {ricaricoInCorso ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm }}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : null}

      <DeletedServicesSection
        services={eliminate}
        categories={categorie}
        loading={caricamentoEliminate}
        error={erroreEliminate}
        busyId={ripristinoInCorso}
        onRetry={() => void caricaEliminate()}
        onRestore={(voce) => void ripristina(voce)}
      />

      <ConfirmModal
        visible={eliminazione !== null}
        titolo={
          eliminazione?.tipo === TIPI_VOCE.RICERCA
            ? 'Eliminare questa ricerca?'
            : "Eliminare quest'offerta?"
        }
        messaggio={messaggioEliminazione(eliminazione, vociEliminazione.length <= 1)}
        etichettaConferma="Elimina"
        onConferma={() => void confermaEliminazione()}
        onAnnulla={() => setEliminazione(null)}
        loading={azioneInCorso?.nome === 'elimina'}
      />

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
