import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { AVVISO_DEMO, USA_DATI_FINTI } from '@/api/config';
import {
  aggiornaPubblicazione,
  cambiaStatoPubblicazione,
  creaPubblicazione,
  eliminaPubblicazione,
  ottieniCategorie,
  ottieniPubblicazioni,
} from '@/api/barattolo';
import {
  STATI_PUBBLICAZIONE,
  TIPI_VOCE,
  aggiornaVoce,
  nuovaVoce,
  senzaChiave,
  validaVoce,
} from '@/servizi/offerta-ricerca';
import { analizzaLocalita } from '@/servizi/aree-italiane';
import { useAggiornamento } from '@/hooks/useAggiornamento';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ModalConferma } from '@/components/ModalConferma';
import { SezionePubblicazioni, SEZIONI_PUBBLICAZIONI } from '@/components/SezionePubblicazioni';
import { space, useTokens } from '@/theme/tokens';

/**
 * Offro e cerco: pubblica le proprie offerte e ricerche.
 *
 * Le voci hanno la **stessa forma della registrazione** (categoria + mansione +
 * «da remoto»), più la località dell'annuncio; la forma del dato e le sue regole
 * vivono in `src/servizi/offerta-ricerca.js` e non si ridichiarano qui. Il form
 * di pubblicazione è uno solo (`FormVoceServizio`) e serve creazione e modifica.
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
  return `${voce.mansione.trim() || 'Questa voce'} sparisce dall'elenco e non si recupera. Gli accordi già avviati non cambiano.${avviso}`;
}

export default function OffroECercoScreen() {
  const { token, utente } = useAuth();
  const t = useTokens();

  // Il bivio finti/veri dell'elenco sta tutto nel layer (`ottieniPubblicazioni`):
  // la schermata chiede sempre — con i finti il deposito, senza la coppia di
  // rotte reali — e parte in caricamento in entrambi i casi.
  const [pubblicazioni, setPubblicazioni] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erroreElenco, setErroreElenco] = useState(null);

  const [categorie, setCategorie] = useState([]);
  const [statoCategorie, setStatoCategorie] = useState('caricamento');
  const [erroreCategorie, setErroreCategorie] = useState(null);

  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [erroreForm, setErroreForm] = useState(null);
  const [salvataggio, setSalvataggio] = useState(false);

  const [azioneInCorso, setAzioneInCorso] = useState(null);
  const [eliminazione, setEliminazione] = useState(null);
  const [esito, setEsito] = useState(null);

  const carica = useCallback(async () => {
    if (!token || !utente) {
      return;
    }
    setLoading(true);
    setErroreElenco(null);
    try {
      setPubblicazioni(await ottieniPubblicazioni(token, utente.id));
    } catch (err) {
      setErroreElenco(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      setLoading(false);
    }
  }, [token, utente]);

  const caricaCategorie = useCallback(async () => {
    try {
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

  const { refreshing, onRefresh } = useAggiornamento(ricaricaTutto);

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

  function apriNuova(tipo) {
    setEsito(null);
    setErroreForm(null);
    setFieldErrors({});
    // La località nasce da quella della persona, se la sessione la conosce: si
    // rilegge la coppia provincia/regione dal valore formattato e si precompilano
    // le due tendine. Un valore legacy non conforme lascia le tendine vuote.
    const vuota = nuovaVoce(tipo);
    const coppia = analizzaLocalita(utente?.localita);
    setForm({
      tipo,
      voce: { ...vuota, regione: coppia?.regione ?? '', provincia: coppia?.provincia ?? '' },
    });
  }

  function apriModifica(voce) {
    setEsito(null);
    setErroreForm(null);
    setFieldErrors({});
    // Copia: «Annulla» scarta senza lasciare modifiche a metà. La località salvata
    // si rilegge nella coppia provincia/regione per precompilare le tendine.
    const coppia = analizzaLocalita(voce.localita);
    setForm({
      tipo: voce.tipo,
      voce: { ...voce, regione: coppia?.regione ?? '', provincia: coppia?.provincia ?? '' },
    });
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
        await aggiornaPubblicazione(token, utente.id, form.voce);
      } else {
        await creaPubblicazione(token, utente.id, form.voce);
      }
      // Ora l'elenco esiste sempre (vero o finto): la conferma di una nuova
      // voce è piena e si rilegge la lista «senza ricaricare la pagina».
      setEsito(testoEsito(inModifica ? 'aggiornata' : 'creata', tipo));
      setForm(null);
      setFieldErrors({});
      await carica();
    } catch (err) {
      // Il form non si svuota: i dati digitati restano.
      setErroreForm(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
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
      await carica();
    } catch (err) {
      // Voce sparita (404: eliminata altrove o sessione successiva): l'elenco si
      // rilegge comunque, così non resta in carta una riga morta. Si rilegge
      // prima di mostrare l'errore, perché `carica()` ripulisce il messaggio a
      // inizio lettura; con un 409 la voce c'è ancora, e il reload non serve.
      if (err instanceof ApiError && err.status === 404) {
        await carica();
      }
      setErroreElenco(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
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
      () => cambiaStatoPubblicazione(token, utente.id, voce.id, voce.tipo, nuovoStato),
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
      () => eliminaPubblicazione(token, utente.id, voce.id, voce.tipo),
      testoEsito('eliminata', voce.tipo),
    );
    setEliminazione(null);
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

      {USA_DATI_FINTI ? (
        <Banner kind="info" message={AVVISO_DEMO} />
      ) : null}

      {esito ? <Banner kind="success" message={esito} /> : null}

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
        <SezionePubblicazioni
          key={sezione.chiave}
          sezione={sezione}
          voci={sezione.tipo === TIPI_VOCE.OFFERTA ? offerte : ricerche}
          categorie={categorie}
          statoCategorie={statoCategorie}
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

      <ModalConferma
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
    </Screen>
  );
}
